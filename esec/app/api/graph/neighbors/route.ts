import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, nodeLabel, depth = 2 } = body as {
      nodeId: string;
      nodeLabel: string;
      depth?: number;
    };

    if (!nodeId || !nodeLabel) {
      return NextResponse.json(
        { error: 'nodeId and nodeLabel are required' },
        { status: 400 }
      );
    }

    // Map label to its ID property
    const idPropMap: Record<string, string> = {
      Part: 'partId',
      Assembly: 'assemblyId',
      DesignDoc: 'docId',
      QAC: 'qacId',
      Workflow: 'workflowId',
      WorkflowStep: 'stepId',
      Engineer: 'engineerId',
      Vendor: 'vendorId',
      Constraint: 'constraintId',
    };

    const idProp = idPropMap[nodeLabel];
    if (!idProp) {
      return NextResponse.json(
        { error: `Unknown node label: ${nodeLabel}` },
        { status: 400 }
      );
    }

    const clampedDepth = Math.min(Math.max(1, depth), 3);

    const session = getDriver().session();
    try {
      const result = await session.run(
        `MATCH path = (n:\`${nodeLabel}\` {${idProp}: $nodeId})-[*1..${clampedDepth}]-(m)
         UNWIND relationships(path) AS rel
         WITH COLLECT(DISTINCT startNode(rel)) + COLLECT(DISTINCT endNode(rel)) AS allNodes,
              COLLECT(DISTINCT rel) AS allRels
         UNWIND allNodes AS node
         WITH COLLECT(DISTINCT node) AS nodes, allRels
         RETURN nodes, allRels`,
        { nodeId }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ nodes: [], links: [] });
      }

      const record = result.records[0];
      const rawNodes = record.get('nodes') as Array<{ properties: Record<string, unknown>; labels: string[] }>;
      const rawRels = record.get('allRels') as Array<{
        type: string;
        start: { toNumber?: () => number };
        end: { toNumber?: () => number };
        startNodeElementId: string;
        endNodeElementId: string;
      }>;

      // Build a map from elementId to our domain ID
      const elementIdToId = new Map<string, string>();
      const nodes = rawNodes.map((node) => {
        const label = node.labels[0];
        const props = node.properties;
        const idKey = idPropMap[label] ?? 'id';
        const id = String(props[idKey] ?? props.partId ?? props.assemblyId ?? '');
        const name = String(props.name ?? props.title ?? props.question ?? id);
        // Use elementId from the node object
        const elementId = (node as unknown as { elementId: string }).elementId;
        elementIdToId.set(elementId, id);
        return { id, label, name, group: label };
      });

      const links = rawRels.map((rel) => {
        const sourceElementId = rel.startNodeElementId;
        const targetElementId = rel.endNodeElementId;
        return {
          source: elementIdToId.get(sourceElementId) ?? sourceElementId,
          target: elementIdToId.get(targetElementId) ?? targetElementId,
          type: rel.type,
        };
      });

      return NextResponse.json({ nodes, links });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Neighbors error:', error);
    return NextResponse.json(
      { error: 'Traversal failed', details: String(error) },
      { status: 500 }
    );
  }
}
