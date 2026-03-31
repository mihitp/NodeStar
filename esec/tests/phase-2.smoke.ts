import { describe, it, expect, afterAll } from 'vitest';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';
import { getDriver } from '@/lib/neo4j';

afterAll(async () => {
  const driver = getDriver();
  await driver.close();
});

describe('Phase 2: Search & Retrieval', () => {
  it('generates embeddings', async () => {
    const emb = await generateEmbedding('aluminum bracket for PCB mounting');
    expect(emb.length).toBeGreaterThan(100);
    expect(emb.every((v) => typeof v === 'number')).toBe(true);
  });

  it('cosine similarity works correctly', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const c = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
    expect(cosineSimilarity(a, c)).toBeCloseTo(0.0);
  });

  it('parts have stored embeddings', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run(
        'MATCH (p:Part) WHERE p.embedding IS NOT NULL RETURN count(p) AS c'
      );
      expect(result.records[0].get('c').toNumber()).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  it('semantic search returns relevant parts', async () => {
    const session = getDriver().session();
    try {
      // Get all parts with embeddings
      const partsResult = await session.run(
        'MATCH (p:Part) WHERE p.embedding IS NOT NULL RETURN p.partId AS id, p.functionalDescription AS desc, p.category AS cat, p.embedding AS emb LIMIT 60'
      );

      const queryEmb = await generateEmbedding('mount a PCB to aluminum panel');

      const scored = partsResult.records.map((r) => {
        const emb = r.get('emb') as number[];
        return {
          id: r.get('id'),
          cat: r.get('cat'),
          desc: r.get('desc'),
          score: cosineSimilarity(queryEmb, emb),
        };
      });
      scored.sort((a, b) => b.score - a.score);

      // Top result should be related to brackets/PCB mounting
      expect(scored.length).toBeGreaterThan(0);
      const topCategory = scored[0].cat as string;
      expect(topCategory).toMatch(/bracket|pcb-mount|standoff|fastener/);
    } finally {
      await session.close();
    }
  });

  it('neighbor traversal returns connected nodes', async () => {
    const session = getDriver().session();
    try {
      // Get a part that has relationships
      const result = await session.run(
        `MATCH (p:Part)-[r]-(m)
         RETURN p.partId AS id, count(r) AS relCount
         ORDER BY relCount DESC LIMIT 1`
      );
      const partId = result.records[0].get('id') as string;

      // Traverse neighbors
      const neighborsResult = await session.run(
        `MATCH path = (n:Part {partId: $partId})-[*1..2]-(m)
         UNWIND relationships(path) AS rel
         WITH COLLECT(DISTINCT startNode(rel)) + COLLECT(DISTINCT endNode(rel)) AS allNodes,
              COLLECT(DISTINCT rel) AS allRels
         RETURN size(allNodes) AS nodeCount, size(allRels) AS relCount`,
        { partId }
      );

      const nodeCount = neighborsResult.records[0].get('nodeCount').toNumber();
      const relCount = neighborsResult.records[0].get('relCount').toNumber();
      expect(nodeCount).toBeGreaterThan(1);
      expect(relCount).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });
});
