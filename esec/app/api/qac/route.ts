import { NextRequest, NextResponse } from 'next/server';
import { processQuestion } from '@/lib/qac-engine';
import { getDriver } from '@/lib/neo4j';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, engineerId } = body as { question: unknown; engineerId?: string };

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return NextResponse.json(
        { error: 'question must be a non-empty string' },
        { status: 400 }
      );
    }

    const result = await processQuestion(question);

    if (engineerId) {
      const session = getDriver().session();
      try {
        await session.run(
          `MATCH (e:Engineer {engineerId: $engineerId})
           MATCH (q:QAC {qacId: $qacId})
           CREATE (e)-[:ASKED]->(q)`,
          { engineerId, qacId: result.qacId }
        );
      } finally {
        await session.close();
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('QAC POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process question', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const partId = searchParams.get('partId');
  const tag = searchParams.get('tag');

  if (!partId && !tag) {
    return NextResponse.json(
      { error: 'partId or tag query parameter required' },
      { status: 400 }
    );
  }

  const session = getDriver().session();
  try {
    let records;

    if (partId) {
      const result = await session.run(
        `MATCH (q:QAC)-[:ABOUT]->(p:Part {partId: $partId})
         RETURN q
         ORDER BY q.timestamp DESC
         LIMIT 10`,
        { partId }
      );
      records = result.records;
    } else {
      const result = await session.run(
        `MATCH (q:QAC)
         WHERE $tag IN q.tags
         RETURN q
         ORDER BY q.timestamp DESC
         LIMIT 10`,
        { tag }
      );
      records = result.records;
    }

    const qacs = records.map((record) => {
      const props = record.get('q').properties;
      return { ...props, tags: props.tags ?? [] };
    });

    return NextResponse.json({ qacs });
  } catch (error) {
    console.error('QAC GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve QACs', details: String(error) },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
