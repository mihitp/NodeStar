import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 5 } = body as { query: string; limit?: number };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const queryEmbedding = await generateEmbedding(query);

    const session = getDriver().session();
    try {
      // Fetch parts with embeddings for semantic search
      const partsResult = await session.run(
        'MATCH (p:Part) WHERE p.embedding IS NOT NULL RETURN p'
      );

      const scoredParts = partsResult.records.map((record) => {
        const props = record.get('p').properties;
        const embedding = props.embedding as number[];
        const score = cosineSimilarity(queryEmbedding, embedding);
        return { props, score };
      });

      // Sort by similarity descending
      scoredParts.sort((a, b) => b.score - a.score);

      // Take top-K
      const topParts = scoredParts.slice(0, limit);

      // Keyword fallback: if no embeddings found or scores are very low
      let keywordParts: typeof topParts = [];
      if (topParts.length === 0 || (topParts[0]?.score ?? 0) < 0.3) {
        const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const keywordResult = await session.run(
          `MATCH (p:Part)
           WHERE ANY(kw IN $keywords WHERE toLower(p.functionalDescription) CONTAINS kw OR toLower(p.name) CONTAINS kw OR toLower(p.category) CONTAINS kw)
           RETURN p LIMIT $limit`,
          { keywords, limit: Math.round(limit) }
        );
        keywordParts = keywordResult.records.map((record) => {
          const props = record.get('p').properties;
          return { props, score: 0.1 };
        });
      }

      // Merge: prefer semantic results, fill with keyword
      const allParts = topParts.length > 0 ? topParts : keywordParts;

      // Format parts (reconstruct dimensions, convert Neo4j integers)
      const parts = allParts.map(({ props, score }) => {
        const part: Record<string, unknown> = { ...props };
        // Reconstruct dimensions
        if (part.dimensionsUnit) {
          part.dimensions = {
            length: toNumber(part.dimensionsLength),
            width: toNumber(part.dimensionsWidth),
            height: toNumber(part.dimensionsHeight),
            unit: part.dimensionsUnit,
          };
        }
        delete part.dimensionsLength;
        delete part.dimensionsWidth;
        delete part.dimensionsHeight;
        delete part.dimensionsUnit;
        delete part.embedding;
        part.weight = toNumber(part.weight);
        part.costEstimate = toNumber(part.costEstimate);
        return { ...part, _score: score } as Record<string, unknown>;
      });

      // Find related QACs for the top parts
      const partIds = parts.map((p) => p.partId as string);
      const qacResult = await session.run(
        `MATCH (q:QAC)-[:ABOUT]->(p:Part)
         WHERE p.partId IN $partIds
         RETURN DISTINCT q LIMIT 5`,
        { partIds }
      );
      const qacs = qacResult.records.map((r) => {
        const props = r.get('q').properties;
        return { ...props, tags: props.tags ?? [] };
      });

      const relevanceScores = parts.map((p) => {
        const score = p._score as number;
        delete p._score;
        return score;
      });

      return NextResponse.json({ parts, qacs, relevanceScores });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 }
    );
  }
}

function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return undefined;
}
