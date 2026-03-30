import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';

export async function GET() {
  try {
    const driver = getDriver();
    const session = driver.session();
    try {
      const nodeResult = await session.run('MATCH (n) RETURN count(n) as nodeCount');
      const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as relCount');
      const nodeCount = nodeResult.records[0].get('nodeCount').toNumber();
      const relationshipCount = relResult.records[0].get('relCount').toNumber();

      return NextResponse.json({
        status: 'ok',
        neo4j: true,
        nodeCount,
        relationshipCount,
        timestamp: new Date().toISOString(),
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        neo4j: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
