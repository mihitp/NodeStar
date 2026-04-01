import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const driver = getDriver();
  const session = driver.session();

  try {
    if (id) {
      const workflowResult = await session.run(
        'MATCH (w:Workflow {workflowId: $id}) RETURN w',
        { id }
      );

      if (workflowResult.records.length === 0) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      const workflowNode = workflowResult.records[0].get('w').properties;
      const workflow = {
        workflowId: workflowNode.workflowId,
        name: workflowNode.name,
        description: workflowNode.description,
        stepCount: workflowNode.stepCount != null
          ? (typeof workflowNode.stepCount.toNumber === 'function'
            ? workflowNode.stepCount.toNumber()
            : workflowNode.stepCount)
          : null,
        category: workflowNode.category,
      };

      const stepsResult = await session.run(
        'MATCH (w:Workflow {workflowId: $id})-[:CONTAINS]->(s:WorkflowStep) RETURN s ORDER BY s.order',
        { id }
      );

      const steps = stepsResult.records.map((record) => {
        const s = record.get('s').properties;
        return {
          stepId: s.stepId,
          order: s.order != null
            ? (typeof s.order.toNumber === 'function' ? s.order.toNumber() : s.order)
            : null,
          action: s.action,
          description: s.description,
          parameters: s.parameters,
        };
      });

      return NextResponse.json({ workflow, steps });
    } else {
      const result = await session.run(
        'MATCH (w:Workflow) RETURN w ORDER BY w.name'
      );

      const workflows = result.records.map((record) => {
        const w = record.get('w').properties;
        return {
          workflowId: w.workflowId,
          name: w.name,
          description: w.description,
          stepCount: w.stepCount != null
            ? (typeof w.stepCount.toNumber === 'function'
              ? w.stepCount.toNumber()
              : w.stepCount)
            : null,
          category: w.category,
        };
      });

      return NextResponse.json({ workflows });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
