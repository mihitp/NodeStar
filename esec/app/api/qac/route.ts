import { NextRequest, NextResponse } from 'next/server';
import { processQuestion } from '@/lib/qac-engine';
import { getDriver } from '@/lib/neo4j';

interface WorkflowStep {
  stepId: string;
  order: number;
  action: string;
  description: string;
}

async function fetchWorkflowContext(workflowId: string): Promise<{
  name: string;
  description: string;
  steps: WorkflowStep[];
} | null> {
  const session = getDriver().session();
  try {
    const wResult = await session.run(
      'MATCH (w:Workflow {workflowId: $id}) RETURN w',
      { id: workflowId }
    );
    if (wResult.records.length === 0) return null;

    const w = wResult.records[0].get('w').properties;

    const sResult = await session.run(
      'MATCH (w:Workflow {workflowId: $id})-[:CONTAINS]->(s:WorkflowStep) RETURN s ORDER BY s.order',
      { id: workflowId }
    );

    const steps: WorkflowStep[] = sResult.records.map((r) => {
      const s = r.get('s').properties;
      return {
        stepId: s.stepId,
        order: typeof s.order?.toNumber === 'function' ? s.order.toNumber() : Number(s.order),
        action: s.action,
        description: s.description ?? '',
      };
    });

    return { name: w.name, description: w.description ?? '', steps };
  } finally {
    await session.close();
  }
}

function buildWorkflowContextMarkdown(name: string, description: string, steps: WorkflowStep[]): string {
  const lines = [
    `## Active Workflow: ${name}`,
    description,
    '',
    'Steps:',
    ...steps.map((s) => `${s.order}. **${s.action}**: ${s.description}`),
  ];
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, engineerId, workflowId } = body as {
      question: unknown;
      engineerId?: string;
      workflowId?: string;
    };

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return NextResponse.json(
        { error: 'question must be a non-empty string' },
        { status: 400 }
      );
    }

    // Load workflow context if workflowId was provided
    let workflowContext: { name: string; description: string; steps: WorkflowStep[] } | null = null;
    if (workflowId) {
      workflowContext = await fetchWorkflowContext(workflowId);
    }

    const contextMarkdown = workflowContext
      ? buildWorkflowContextMarkdown(workflowContext.name, workflowContext.description, workflowContext.steps)
      : undefined;

    const result = await processQuestion(question, contextMarkdown);

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

    return NextResponse.json({
      ...result,
      ...(workflowContext && {
        workflowId,
        workflowName: workflowContext.name,
        workflowSteps: workflowContext.steps,
      }),
    });
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
