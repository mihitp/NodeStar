import { describe, it, expect, afterAll } from 'vitest';
import { buildContext, CONTEXT_BUDGET, estimateTokens } from '@/lib/context-builder';
import { processQuestion } from '@/lib/qac-engine';
import { getDriver } from '@/lib/neo4j';

afterAll(async () => {
  const driver = getDriver();
  await driver.close();
});

describe('Phase 3: QAC Engine', () => {
  it('context builder stays within token budget', () => {
    const fakeParts = Array.from({ length: 20 }, (_, i) => ({
      partId: `PART-${i}`,
      name: `Part ${i}`,
      category: 'bracket',
      material: 'aluminum 6061',
      functionalDescription: 'A test part '.repeat(20),
      relevanceScore: 1 - i * 0.05,
    }));

    const fakeQACs = Array.from({ length: 15 }, (_, i) => ({
      qacId: `QAC-${i}`,
      question: 'How to mount a PCB?',
      answer: 'Use bracket X and change fillet radius. '.repeat(10),
      action: 'Change fillet to 3mm',
      relevanceScore: 1 - i * 0.05,
    }));

    const fakeDocs = Array.from({ length: 8 }, (_, i) => ({
      docId: `DOC-${i}`,
      title: `DFM Note ${i}`,
      docType: 'dfm-note',
      content: 'Vendor X requires minimum 3mm fillet radius on aluminum. '.repeat(10),
    }));

    const fakeConstraints = Array.from({ length: 10 }, (_, i) => ({
      constraintId: `CON-${i}`,
      type: 'process',
      value: '3mm min',
      description: 'Vendor minimum bend radius',
    }));

    const context = buildContext(fakeParts, fakeQACs, fakeDocs, fakeConstraints);

    expect(context.parts.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxParts);
    expect(context.qacs.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxQACs);
    expect(context.docs.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxDocs);
    expect(context.constraints.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxConstraints);
    expect(context.tokenEstimate).toBeLessThanOrEqual(CONTEXT_BUDGET.maxTokensEstimate);

    // QAC answers must be truncated
    context.qacs.forEach((q) => {
      expect(q.answerSummary.length).toBeLessThanOrEqual(203); // 200 chars + "..."
    });
  });

  it('estimateTokens returns reasonable values', () => {
    const small = { a: 'hello' };
    const tokens = estimateTokens(small);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(100);
  });

  it('QAC engine processes a question end-to-end', async () => {
    const result = await processQuestion(
      'I need to mount a 100x80mm PCB to a 2mm aluminum panel'
    );
    expect(result.answer).toBeTruthy();
    expect(Array.isArray(result.suggestedActions)).toBe(true);
    expect(result.qacId).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }, 60000);

  it('QAC is persisted to graph', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run(
        'MATCH (q:QAC) WHERE q.status = "resolved" RETURN count(q) AS c'
      );
      expect(result.records[0].get('c').toNumber()).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });
});
