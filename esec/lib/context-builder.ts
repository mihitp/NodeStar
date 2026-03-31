import { z } from 'zod';

// ─── Budget Constants ────────────────────────────────────────────────────────

export const CONTEXT_BUDGET = {
  maxParts: 5,
  maxQACs: 3,
  maxDocs: 2,
  maxConstraints: 5,
  maxVendorNotes: 2,
  maxTokensEstimate: 4000,
} as const;

// ─── Slim Context Schemas ────────────────────────────────────────────────────

export const PartContextSchema = z.object({
  partId: z.string(),
  name: z.string(),
  category: z.string(),
  material: z.string(),
  functionalDescription: z.string(),
  relevanceScore: z.number(),
});

export const QACContextSchema = z.object({
  qacId: z.string(),
  question: z.string(),
  answerSummary: z.string(),
  action: z.string(),
  relevanceScore: z.number(),
});

export const DocContextSchema = z.object({
  docId: z.string(),
  title: z.string(),
  docType: z.string(),
  contentSnippet: z.string(),
});

export const ConstraintContextSchema = z.object({
  constraintId: z.string(),
  type: z.string(),
  value: z.string(),
  description: z.string(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type PartContext = z.infer<typeof PartContextSchema>;
export type QACContext = z.infer<typeof QACContextSchema>;
export type DocContext = z.infer<typeof DocContextSchema>;
export type ConstraintContext = z.infer<typeof ConstraintContextSchema>;

// ─── GraphContext Interface ──────────────────────────────────────────────────

export interface GraphContext {
  parts: PartContext[];
  qacs: QACContext[];
  docs: DocContext[];
  constraints: ConstraintContext[];
  tokenEstimate: number;
}

// ─── Input Types (raw ranked items from graph queries) ───────────────────────

interface RankedPart {
  partId: string;
  name: string;
  category: string;
  material: string;
  functionalDescription: string;
  relevanceScore: number;
  [key: string]: unknown;
}

interface RankedQAC {
  qacId: string;
  question: string;
  answer: string;
  action: string;
  relevanceScore: number;
  [key: string]: unknown;
}

interface RankedDoc {
  docId: string;
  title: string;
  docType: string;
  content: string;
  [key: string]: unknown;
}

interface LinkedConstraint {
  constraintId: string;
  type: string;
  value: string;
  description: string;
  [key: string]: unknown;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function estimateTokens(obj: unknown): number {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

// ─── Build Context ───────────────────────────────────────────────────────────

export function buildContext(
  rankedParts: RankedPart[],
  rankedQACs: RankedQAC[],
  rankedDocs: RankedDoc[],
  linkedConstraints: LinkedConstraint[],
): GraphContext {
  // Step 1: Slice to top-K per budget
  const topParts = rankedParts.slice(0, CONTEXT_BUDGET.maxParts);
  const topQACs = rankedQACs.slice(0, CONTEXT_BUDGET.maxQACs);
  const topDocs = rankedDocs.slice(0, CONTEXT_BUDGET.maxDocs);
  const topConstraints = linkedConstraints.slice(0, CONTEXT_BUDGET.maxConstraints);

  // Step 2: Slim each item to schema fields with truncation
  const slimParts: PartContext[] = topParts.map((p) => ({
    partId: p.partId,
    name: p.name,
    category: p.category,
    material: p.material,
    functionalDescription: p.functionalDescription,
    relevanceScore: p.relevanceScore,
  }));

  const slimQACs: QACContext[] = topQACs.map((q) => ({
    qacId: q.qacId,
    question: q.question,
    answerSummary:
      q.answer.length > 200 ? q.answer.slice(0, 200) + '...' : q.answer,
    action: q.action,
    relevanceScore: q.relevanceScore,
  }));

  const slimDocs: DocContext[] = topDocs.map((d) => ({
    docId: d.docId,
    title: d.title,
    docType: d.docType,
    contentSnippet:
      d.content.length > 300 ? d.content.slice(0, 300) + '...' : d.content,
  }));

  const slimConstraints: ConstraintContext[] = topConstraints.map((c) => ({
    constraintId: c.constraintId,
    type: c.type,
    value: c.value,
    description: c.description,
  }));

  // Step 3: Estimate tokens
  let context: Omit<GraphContext, 'tokenEstimate'> = {
    parts: slimParts,
    qacs: slimQACs,
    docs: slimDocs,
    constraints: slimConstraints,
  };

  let tokenEstimate = estimateTokens(context);

  // Step 4: If over budget, drop lowest-relevance items: docs first, then QACs, then parts
  if (tokenEstimate > CONTEXT_BUDGET.maxTokensEstimate) {
    // Drop docs one at a time (lowest relevance is last since input is ranked)
    while (
      tokenEstimate > CONTEXT_BUDGET.maxTokensEstimate &&
      context.docs.length > 0
    ) {
      const newDocs = context.docs.slice(0, context.docs.length - 1);
      const candidate = { ...context, docs: newDocs };
      tokenEstimate = estimateTokens(candidate);
      context = candidate;
    }
  }

  if (tokenEstimate > CONTEXT_BUDGET.maxTokensEstimate) {
    // Drop QACs one at a time
    while (
      tokenEstimate > CONTEXT_BUDGET.maxTokensEstimate &&
      context.qacs.length > 0
    ) {
      const newQACs = context.qacs.slice(0, context.qacs.length - 1);
      const candidate = { ...context, qacs: newQACs };
      tokenEstimate = estimateTokens(candidate);
      context = candidate;
    }
  }

  if (tokenEstimate > CONTEXT_BUDGET.maxTokensEstimate) {
    // Drop parts one at a time
    while (
      tokenEstimate > CONTEXT_BUDGET.maxTokensEstimate &&
      context.parts.length > 0
    ) {
      const newParts = context.parts.slice(0, context.parts.length - 1);
      const candidate = { ...context, parts: newParts };
      tokenEstimate = estimateTokens(candidate);
      context = candidate;
    }
  }

  return {
    ...context,
    tokenEstimate,
  };
}
