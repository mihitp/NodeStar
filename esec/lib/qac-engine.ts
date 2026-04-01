import { buildContext, GraphContext } from './context-builder';
import { generateQACResponse } from './llm';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { getDriver } from './neo4j';

// ─── Public Result Type ───────────────────────────────────────────────────────

export interface QACResult {
  qacId: string;
  question: string;
  answer: string;
  suggestedActions: string[];
  confidence: number;
  referencedParts: Array<{
    partId: string;
    name: string;
    category: string;
    material: string;
    functionalDescription: string;
    relevanceScore: number;
  }>;
  similarQACs: Array<{
    qacId: string;
    question: string;
    answerSummary: string;
    action: string;
    relevanceScore: number;
  }>;
  relatedDocs: Array<{
    docId: string;
    title: string;
    docType: string;
    contentSnippet: string;
  }>;
}

// ─── Internal Raw Node Types ──────────────────────────────────────────────────

interface RawPartNode {
  partId: string;
  name: string;
  category: string;
  material: string;
  functionalDescription: string;
  dimensionsLength?: number | { toNumber(): number } | null;
  dimensionsWidth?: number | { toNumber(): number } | null;
  dimensionsHeight?: number | { toNumber(): number } | null;
  dimensionsUnit?: string | null;
  weight?: number | { toNumber(): number } | null;
  costEstimate?: number | { toNumber(): number } | null;
  embedding?: number[] | null;
  [key: string]: unknown;
}

interface RawQACNode {
  qacId: string;
  question: string;
  answer: string;
  action: string;
  status: string;
  timestamp: string;
  tags?: string[] | null;
  embedding?: number[] | null;
  [key: string]: unknown;
}

interface RawDocNode {
  docId: string;
  title: string;
  docType: string;
  content: string;
  [key: string]: unknown;
}

interface RawConstraintNode {
  constraintId: string;
  type: string;
  value: string;
  description: string;
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof (v as { toNumber(): number }).toNumber === 'function') {
    return (v as { toNumber(): number }).toNumber();
  }
  return Number(v);
}

function extractEmbedding(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  return (raw as unknown[]).map((v) => toNumber(v));
}

// ─── Graph Search Helpers ─────────────────────────────────────────────────────

async function searchParts(
  queryEmbedding: number[],
  topK: number,
): Promise<Array<RawPartNode & { relevanceScore: number }>> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      'MATCH (p:Part) WHERE p.embedding IS NOT NULL RETURN p',
    );

    const scored = result.records
      .map((record) => {
        const p = record.get('p').properties as RawPartNode;
        const emb = extractEmbedding(p.embedding);
        const score = emb ? cosineSimilarity(queryEmbedding, emb) : 0;
        return { ...p, relevanceScore: score };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);

    return scored;
  } finally {
    await session.close();
  }
}

async function searchQACs(
  queryEmbedding: number[],
  topK: number,
): Promise<Array<RawQACNode & { relevanceScore: number }>> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      'MATCH (q:QAC) WHERE q.embedding IS NOT NULL RETURN q',
    );

    const scored = result.records
      .map((record) => {
        const q = record.get('q').properties as RawQACNode;
        const emb = extractEmbedding(q.embedding);
        const score = emb ? cosineSimilarity(queryEmbedding, emb) : 0;
        return { ...q, relevanceScore: score };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);

    return scored;
  } finally {
    await session.close();
  }
}

async function fetchDocsForParts(partIds: string[]): Promise<RawDocNode[]> {
  if (partIds.length === 0) return [];
  const session = getDriver().session();
  try {
    const result = await session.run(
      'MATCH (p:Part)-[:DOCUMENTED_IN]->(d:DesignDoc) WHERE p.partId IN $partIds RETURN d',
      { partIds },
    );
    return result.records.map((r) => r.get('d').properties as RawDocNode);
  } finally {
    await session.close();
  }
}

async function fetchConstraintsForParts(partIds: string[]): Promise<RawConstraintNode[]> {
  if (partIds.length === 0) return [];
  const session = getDriver().session();
  try {
    const result = await session.run(
      'MATCH (p:Part)-[:CONSTRAINED_BY]->(c:Constraint) WHERE p.partId IN $partIds RETURN c',
      { partIds },
    );
    return result.records.map((r) => r.get('c').properties as RawConstraintNode);
  } finally {
    await session.close();
  }
}

// ─── Write QAC Node to Graph ──────────────────────────────────────────────────

async function writeQACNode(
  qacId: string,
  question: string,
  answer: string,
  action: string,
  referencedPartIds: string[],
): Promise<void> {
  const session = getDriver().session();
  try {
    const timestamp = new Date().toISOString();

    // Create the QAC node
    await session.run(
      `CREATE (q:QAC {
        qacId: $qacId,
        question: $question,
        answer: $answer,
        action: $action,
        status: 'resolved',
        timestamp: $timestamp,
        tags: []
      })`,
      { qacId, question, answer, action, timestamp },
    );

    // Create ABOUT relationships for each referenced part
    if (referencedPartIds.length > 0) {
      await session.run(
        `MATCH (q:QAC {qacId: $qacId})
         UNWIND $partIds AS pid
         MATCH (p:Part {partId: pid})
         CREATE (q)-[:ABOUT]->(p)`,
        { qacId, partIds: referencedPartIds },
      );
    }
  } finally {
    await session.close();
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function processQuestion(question: string, skillContext?: string): Promise<QACResult> {
  // Step 1: Generate embedding for the question
  const queryEmbedding = await generateEmbedding(question);

  // Step 2a: Search parts and QACs in parallel (both need query embedding only)
  const [rankedParts, rankedQACs] = await Promise.all([
    searchParts(queryEmbedding, 15),
    searchQACs(queryEmbedding, 10),
  ]);

  // Step 2b: Extract top part IDs, then fetch docs and constraints in parallel
  const topPartIds = rankedParts.slice(0, 15).map((p) => p.partId);

  const [rawDocs, rawConstraints] = await Promise.all([
    fetchDocsForParts(topPartIds),
    fetchConstraintsForParts(topPartIds),
  ]);

  // Step 3: Build slim context within token budget
  const context: GraphContext = buildContext(rankedParts, rankedQACs, rawDocs, rawConstraints);

  // Step 4: Call LLM with question, slim context, and optional skill context
  const llmResponse = await generateQACResponse(question, context, skillContext);

  // Step 5: Generate QAC ID
  const qacId = `QAC-${Date.now()}`;

  // Step 6: Write QAC node to graph
  const firstAction = llmResponse.suggestedActions[0] ?? '';
  await writeQACNode(
    qacId,
    question,
    llmResponse.answer,
    firstAction,
    llmResponse.referencedPartIds,
  );

  // Step 7: Assemble referencedParts from ranked parts filtered to LLM-cited IDs
  const partLookup = new Map(rankedParts.map((p) => [p.partId, p]));

  const referencedParts = llmResponse.referencedPartIds
    .map((id) => {
      const p = partLookup.get(id);
      if (!p) return null;
      return {
        partId: p.partId,
        name: p.name,
        category: p.category,
        material: p.material,
        functionalDescription: p.functionalDescription,
        relevanceScore: p.relevanceScore,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Step 8: Assemble similarQACs from context (already slimmed)
  const similarQACs = context.qacs.map((q) => ({
    qacId: q.qacId,
    question: q.question,
    answerSummary: q.answerSummary,
    action: q.action,
    relevanceScore: q.relevanceScore,
  }));

  // Step 9: Assemble relatedDocs from context
  const relatedDocs = context.docs.map((d) => ({
    docId: d.docId,
    title: d.title,
    docType: d.docType,
    contentSnippet: d.contentSnippet,
  }));

  return {
    qacId,
    question,
    answer: llmResponse.answer,
    suggestedActions: llmResponse.suggestedActions,
    confidence: llmResponse.confidence,
    referencedParts,
    similarQACs,
    relatedDocs,
  };
}
