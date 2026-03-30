import { describe, it, expect, afterAll } from 'vitest';
import { getDriver } from '@/lib/neo4j';
import { PartSchema } from '@/lib/schema';

afterAll(async () => {
  const driver = getDriver();
  await driver.close();
});

describe('Phase 1: Foundation', () => {
  it('connects to Neo4j', async () => {
    const driver = getDriver();
    const info = await driver.getServerInfo();
    expect(info).toBeDefined();
  });

  it('has seeded nodes', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run('MATCH (n) RETURN count(n) as c');
      expect(result.records[0].get('c').toNumber()).toBeGreaterThan(100);
    } finally {
      await session.close();
    }
  });

  it('Part nodes match schema', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run('MATCH (p:Part) RETURN p LIMIT 3');
      for (const record of result.records) {
        const props = record.get('p').properties;
        // Reconstruct the dimensions object from flat properties
        const part = {
          ...props,
          dimensions: props.dimensionsUnit
            ? {
                length: props.dimensionsLength,
                width: props.dimensionsWidth,
                height: props.dimensionsHeight,
                unit: props.dimensionsUnit,
              }
            : undefined,
          weight: props.weight?.toNumber?.() ?? props.weight,
          costEstimate: props.costEstimate?.toNumber?.() ?? props.costEstimate,
        };
        // Remove flat dimension fields
        delete part.dimensionsLength;
        delete part.dimensionsWidth;
        delete part.dimensionsHeight;
        delete part.dimensionsUnit;
        // Convert Neo4j integers to numbers
        if (part.dimensions) {
          part.dimensions.length = part.dimensions.length?.toNumber?.() ?? part.dimensions.length;
          part.dimensions.width = part.dimensions.width?.toNumber?.() ?? part.dimensions.width;
          part.dimensions.height = part.dimensions.height?.toNumber?.() ?? part.dimensions.height;
        }
        expect(() => PartSchema.parse(part)).not.toThrow();
      }
    } finally {
      await session.close();
    }
  });

  it('relationships exist', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run('MATCH ()-[r]->() RETURN count(r) as c');
      expect(result.records[0].get('c').toNumber()).toBeGreaterThan(50);
    } finally {
      await session.close();
    }
  });
});
