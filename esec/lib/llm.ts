import Anthropic from '@anthropic-ai/sdk';
import { GraphContext, estimateTokens } from './context-builder';

// ─── Lazy Client Initialization ──────────────────────────────────────────────

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are a mechanical engineering assistant with access to a company knowledge graph.
You help engineers find parts, understand past design decisions, and take action.

RULES:
- Reference specific part IDs (e.g., BRK-007), doc IDs, and constraint IDs in your answer.
- Suggest 1-3 concrete actions the engineer should take (the "Call for action").
- Rate your confidence 0.0-1.0 based on how well the provided context covers the question.
  - 0.8-1.0: Strong match, multiple supporting sources
  - 0.5-0.7: Partial match, some inference required
  - 0.0-0.4: Weak match, mostly guessing
- If past QACs are relevant, explain how they relate and whether the same approach applies.
- Keep your answer concise — under 300 words. Engineers want specifics, not essays.
- Return ONLY a JSON object with this exact shape:
  {
    "answer": "string",
    "suggestedActions": ["string", ...],
    "confidence": number,
    "referencedPartIds": ["BRK-007", ...]
  }`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QACResponse {
  answer: string;
  suggestedActions: string[];
  confidence: number;
  referencedPartIds: string[];
}

// ─── Format Context for Prompt ───────────────────────────────────────────────

export function formatContextForPrompt(question: string, context: GraphContext): string {
  const sections: string[] = [];

  sections.push('## Engineer\'s Question');
  sections.push(question);

  if (context.parts.length > 0) {
    sections.push('## Relevant Parts (ranked by match)');
    const partLines = context.parts.map(
      (p, i) =>
        `${i + 1}. [${p.partId}] ${p.name}, ${p.material} — ${p.functionalDescription} (match: ${p.relevanceScore.toFixed(2)})`,
    );
    sections.push(partLines.join('\n'));
  }

  if (context.qacs.length > 0) {
    sections.push('## Similar Past Questions & Answers');
    const qacLines = context.qacs.map(
      (q) =>
        `[${q.qacId}] "${q.question}" → ${q.answerSummary} Action: ${q.action}`,
    );
    sections.push(qacLines.join('\n'));
  }

  if (context.docs.length > 0) {
    sections.push('## Relevant Design Documents');
    const docLines = context.docs.map(
      (d) => `[${d.docId}] (${d.docType}) ${d.title}: "${d.contentSnippet}"`,
    );
    sections.push(docLines.join('\n'));
  }

  if (context.constraints.length > 0) {
    sections.push('## Active Constraints');
    const constraintLines = context.constraints.map(
      (c) => `[${c.constraintId}] (${c.type}) ${c.value} — ${c.description}`,
    );
    sections.push(constraintLines.join('\n'));
  }

  return sections.join('\n\n');
}

// ─── Main QAC Response Generator ─────────────────────────────────────────────

export async function generateQACResponse(
  question: string,
  context: GraphContext,
  skillContext?: string,
): Promise<QACResponse> {
  const userContent = formatContextForPrompt(question, context);
  const contextTokenEstimate = estimateTokens(context);

  const systemPrompt = skillContext
    ? `${SYSTEM_PROMPT}\n\n## Active Skill Context\n${skillContext}`
    : SYSTEM_PROMPT;

  const startMs = Date.now();

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const latencyMs = Date.now() - startMs;

  const rawContent = message.content[0];
  const rawText = rawContent.type === 'text' ? rawContent.text : '';

  const responseTokens = message.usage.output_tokens;
  const inputTokens = message.usage.input_tokens;

  console.log({
    questionLength: question.length,
    contextTokenEstimate,
    responseTokens,
    inputTokens,
    latencyMs,
  });

  // Strip markdown code fences if the LLM wraps its JSON response
  const cleaned = rawText
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as QACResponse;
    return {
      answer: parsed.answer ?? '',
      suggestedActions: parsed.suggestedActions ?? [],
      confidence: parsed.confidence ?? 0.5,
      referencedPartIds: parsed.referencedPartIds ?? [],
    };
  } catch (parseError) {
    console.error('Failed to parse LLM JSON response:', parseError);
    console.error('Raw text was:', rawText);
    return {
      answer: rawText,
      suggestedActions: [],
      confidence: 0.3,
      referencedPartIds: [],
    };
  }
}
