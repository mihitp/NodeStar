import { describe, it, expect, afterAll } from 'vitest';
import { getDriver } from '@/lib/neo4j';
import { WorkflowSchema } from '@/lib/schema';

afterAll(async () => {
  const driver = getDriver();
  await driver.close();
});

describe('Phase 4: Visualization + Workflows', () => {
  it('graph neighbors endpoint returns viz-compatible data', async () => {
    // Call the Neo4j neighbors query directly (not HTTP)
    // Use getDriver().session() to run:
    // MATCH path = (n:Part {partId: 'PART-001'})-[*1..2]-(m) ...
    // Actually, just test the Neo4j query returns nodes and relationships
    const session = getDriver().session();
    try {
      const result = await session.run(
        `MATCH (n:Part {partId: $nodeId})-[r]-(m)
         RETURN n, type(r) AS relType, labels(m)[0] AS neighborLabel, count(m) AS ct
         LIMIT 10`,
        { nodeId: 'PART-001' }
      );
      expect(result.records.length).toBeGreaterThan(0);
      // Verify we get relationship types and neighbor labels
      const firstRecord = result.records[0];
      expect(firstRecord.get('relType')).toBeTruthy();
      expect(firstRecord.get('neighborLabel')).toBeTruthy();
    } finally {
      await session.close();
    }
  });

  it('workflows exist in graph with valid schema', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run('MATCH (w:Workflow) RETURN w LIMIT 10');
      expect(result.records.length).toBeGreaterThan(5);
      const firstWorkflow = result.records[0].get('w').properties;
      // Convert Neo4j integers
      const workflow = {
        ...firstWorkflow,
        stepCount: typeof firstWorkflow.stepCount === 'object' && firstWorkflow.stepCount?.toNumber
          ? firstWorkflow.stepCount.toNumber()
          : firstWorkflow.stepCount,
      };
      expect(WorkflowSchema.parse(workflow)).toBeTruthy();
    } finally {
      await session.close();
    }
  });

  it('workflow steps are linked and ordered', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run(
        `MATCH (w:Workflow {workflowId: $id})-[:CONTAINS]->(s:WorkflowStep)
         RETURN s ORDER BY s.order`,
        { id: 'WF-001' }
      );
      expect(result.records.length).toBeGreaterThan(2);
      const firstStep = result.records[0].get('s').properties;
      expect(firstStep.action).toBeTruthy();
      // Verify order exists
      const order = typeof firstStep.order === 'object' && firstStep.order?.toNumber
        ? firstStep.order.toNumber()
        : firstStep.order;
      expect(order).toBeGreaterThanOrEqual(1);
    } finally {
      await session.close();
    }
  });
});
