import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PartSchema,
  AssemblySchema,
  DesignDocSchema,
  QACSchema,
  WorkflowSchema,
  WorkflowStepSchema,
  EngineerSchema,
  VendorSchema,
  ConstraintSchema,
} from '../lib/schema';

const SEED_DIR = join(__dirname, '..', 'seed-data');

function loadJson<T>(filename: string, schema: { parse: (data: unknown) => T }): T[] {
  const raw = JSON.parse(readFileSync(join(SEED_DIR, filename), 'utf-8'));
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((item, i) => {
    try {
      return schema.parse(item);
    } catch (err) {
      console.error(`Validation failed for ${filename}[${i}]:`, err);
      process.exit(1);
    }
  });
}

async function seed() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    console.error('Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD environment variables.');
    console.error('Create a .env.local file or export them before running this script.');
    process.exit(1);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  try {
    // Validate all seed data first
    console.log('Validating seed data...');
    const parts = loadJson('parts.json', PartSchema);
    const assemblies = loadJson('assemblies.json', AssemblySchema);
    const designDocs = loadJson('design-docs.json', DesignDocSchema);
    const qacs = loadJson('qac-histories.json', QACSchema);
    const engineers = loadJson('engineers.json', EngineerSchema);
    const vendors = loadJson('vendors.json', VendorSchema);
    const constraints = loadJson('constraints.json', ConstraintSchema);

    // Workflows have embedded steps — validate separately
    const rawWorkflows = JSON.parse(readFileSync(join(SEED_DIR, 'workflows.json'), 'utf-8'));
    const workflows = rawWorkflows.map((wf: Record<string, unknown>, i: number) => {
      const { steps, ...workflowData } = wf;
      try {
        WorkflowSchema.parse(workflowData);
      } catch (err) {
        console.error(`Workflow validation failed [${i}]:`, err);
        process.exit(1);
      }
      const validatedSteps = (steps as Record<string, unknown>[]).map((step, j) => {
        try {
          return WorkflowStepSchema.parse(step);
        } catch (err) {
          console.error(`WorkflowStep validation failed [${i}][${j}]:`, err);
          process.exit(1);
        }
      });
      return { ...workflowData, steps: validatedSteps };
    });

    console.log(`Validated: ${parts.length} parts, ${assemblies.length} assemblies, ${designDocs.length} docs, ${qacs.length} QACs, ${workflows.length} workflows, ${engineers.length} engineers, ${vendors.length} vendors, ${constraints.length} constraints`);

    // Clear existing data
    console.log('Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');

    // Create nodes
    console.log('Creating Part nodes...');
    for (const part of parts) {
      await session.run(
        `CREATE (p:Part {
          partId: $partId, name: $name, partNumber: $partNumber,
          category: $category, material: $material,
          functionalDescription: $functionalDescription,
          dimensionsLength: $dimLength, dimensionsWidth: $dimWidth,
          dimensionsHeight: $dimHeight, dimensionsUnit: $dimUnit,
          weight: $weight, costEstimate: $costEstimate
        })`,
        {
          partId: part.partId,
          name: part.name,
          partNumber: part.partNumber,
          category: part.category,
          material: part.material,
          functionalDescription: part.functionalDescription,
          dimLength: part.dimensions?.length ?? null,
          dimWidth: part.dimensions?.width ?? null,
          dimHeight: part.dimensions?.height ?? null,
          dimUnit: part.dimensions?.unit ?? 'mm',
          weight: part.weight ?? null,
          costEstimate: part.costEstimate ?? null,
        }
      );
    }

    console.log('Creating Assembly nodes...');
    for (const asm of assemblies) {
      await session.run(
        `CREATE (a:Assembly {
          assemblyId: $assemblyId, name: $name, version: $version,
          status: $status, description: $description
        })`,
        asm
      );
    }

    console.log('Creating DesignDoc nodes...');
    for (const doc of designDocs) {
      await session.run(
        `CREATE (d:DesignDoc {
          docId: $docId, title: $title, docType: $docType,
          content: $content, source: $source
        })`,
        doc
      );
    }

    console.log('Creating QAC nodes...');
    for (const qac of qacs) {
      await session.run(
        `CREATE (q:QAC {
          qacId: $qacId, question: $question, answer: $answer,
          action: $action, status: $status, timestamp: $timestamp,
          tags: $tags
        })`,
        { ...qac, tags: qac.tags ?? [] }
      );
    }

    console.log('Creating Workflow and WorkflowStep nodes...');
    for (const wf of workflows) {
      await session.run(
        `CREATE (w:Workflow {
          workflowId: $workflowId, name: $name, description: $description,
          stepCount: $stepCount, category: $category
        })`,
        {
          workflowId: wf.workflowId,
          name: wf.name,
          description: wf.description,
          stepCount: wf.stepCount,
          category: wf.category,
        }
      );

      for (const step of wf.steps) {
        await session.run(
          `CREATE (s:WorkflowStep {
            stepId: $stepId, order: $order, action: $action,
            description: $description, parameters: $parameters
          })`,
          {
            stepId: step.stepId,
            order: step.order,
            action: step.action,
            description: step.description,
            parameters: JSON.stringify(step.parameters ?? {}),
          }
        );

        // CONTAINS relationship: Workflow -> WorkflowStep
        await session.run(
          `MATCH (w:Workflow {workflowId: $wfId}), (s:WorkflowStep {stepId: $stepId})
           CREATE (w)-[:CONTAINS]->(s)`,
          { wfId: wf.workflowId, stepId: step.stepId }
        );
      }
    }

    console.log('Creating Engineer nodes...');
    for (const eng of engineers) {
      await session.run(
        `CREATE (e:Engineer {
          engineerId: $engineerId, name: $name, role: $role,
          expertise: $expertise
        })`,
        eng
      );
    }

    console.log('Creating Vendor nodes...');
    for (const vendor of vendors) {
      await session.run(
        `CREATE (v:Vendor {
          vendorId: $vendorId, name: $name, capabilities: $capabilities,
          leadTimeDays: $leadTimeDays, location: $location
        })`,
        vendor
      );
    }

    console.log('Creating Constraint nodes...');
    for (const constraint of constraints) {
      await session.run(
        `CREATE (c:Constraint {
          constraintId: $constraintId, type: $type, value: $value,
          description: $description
        })`,
        constraint
      );
    }

    // Create relationships
    console.log('Creating relationships...');

    // Parts -> Assemblies (USED_IN): distribute parts across assemblies
    for (let i = 0; i < parts.length; i++) {
      const asmIndex = i % assemblies.length;
      await session.run(
        `MATCH (p:Part {partId: $partId}), (a:Assembly {assemblyId: $asmId})
         CREATE (p)-[:USED_IN]->(a)`,
        { partId: parts[i].partId, asmId: assemblies[asmIndex].assemblyId }
      );
    }

    // Parts -> Constraints (HAS_CONSTRAINT): assign constraints to parts
    for (let i = 0; i < parts.length; i++) {
      // Each part gets 1-2 constraints
      const constraintIndex = i % constraints.length;
      await session.run(
        `MATCH (p:Part {partId: $partId}), (c:Constraint {constraintId: $conId})
         CREATE (p)-[:HAS_CONSTRAINT]->(c)`,
        { partId: parts[i].partId, conId: constraints[constraintIndex].constraintId }
      );
      if (i % 3 === 0 && constraintIndex + 1 < constraints.length) {
        await session.run(
          `MATCH (p:Part {partId: $partId}), (c:Constraint {constraintId: $conId})
           CREATE (p)-[:HAS_CONSTRAINT]->(c)`,
          { partId: parts[i].partId, conId: constraints[constraintIndex + 1].constraintId }
        );
      }
    }

    // Parts -> Vendors (SOURCED_FROM): assign vendors to parts
    for (let i = 0; i < parts.length; i++) {
      const vendorIndex = i % vendors.length;
      await session.run(
        `MATCH (p:Part {partId: $partId}), (v:Vendor {vendorId: $vndId})
         CREATE (p)-[:SOURCED_FROM]->(v)`,
        { partId: parts[i].partId, vndId: vendors[vendorIndex].vendorId }
      );
    }

    // Parts -> Parts (VARIANT_OF): create variant pairs for similar category parts
    const partsByCategory: Record<string, typeof parts> = {};
    for (const part of parts) {
      const cat = part.category;
      if (!partsByCategory[cat]) partsByCategory[cat] = [];
      partsByCategory[cat].push(part);
    }
    for (const catParts of Object.values(partsByCategory)) {
      for (let i = 0; i < catParts.length - 1; i += 2) {
        await session.run(
          `MATCH (p1:Part {partId: $id1}), (p2:Part {partId: $id2})
           CREATE (p1)-[:VARIANT_OF]->(p2)`,
          { id1: catParts[i].partId, id2: catParts[i + 1].partId }
        );
      }
    }

    // Assemblies -> DesignDocs (DOCUMENTED_BY)
    for (let i = 0; i < assemblies.length; i++) {
      const docIndex1 = i % designDocs.length;
      const docIndex2 = (i + assemblies.length) % designDocs.length;
      await session.run(
        `MATCH (a:Assembly {assemblyId: $asmId}), (d:DesignDoc {docId: $docId})
         CREATE (a)-[:DOCUMENTED_BY]->(d)`,
        { asmId: assemblies[i].assemblyId, docId: designDocs[docIndex1].docId }
      );
      await session.run(
        `MATCH (a:Assembly {assemblyId: $asmId}), (d:DesignDoc {docId: $docId})
         CREATE (a)-[:DOCUMENTED_BY]->(d)`,
        { asmId: assemblies[i].assemblyId, docId: designDocs[docIndex2].docId }
      );
    }

    // QACs -> Parts (ABOUT): link QACs to parts they reference
    for (let i = 0; i < qacs.length; i++) {
      const partIndex = i % parts.length;
      await session.run(
        `MATCH (q:QAC {qacId: $qacId}), (p:Part {partId: $partId})
         CREATE (q)-[:ABOUT]->(p)`,
        { qacId: qacs[i].qacId, partId: parts[partIndex].partId }
      );
      // Also link to a second part for diversity
      const partIndex2 = (i + 5) % parts.length;
      await session.run(
        `MATCH (q:QAC {qacId: $qacId}), (p:Part {partId: $partId})
         CREATE (q)-[:ABOUT]->(p)`,
        { qacId: qacs[i].qacId, partId: parts[partIndex2].partId }
      );
    }

    // QACs -> Engineers (RESOLVED_BY)
    for (let i = 0; i < qacs.length; i++) {
      const engIndex = i % engineers.length;
      await session.run(
        `MATCH (q:QAC {qacId: $qacId}), (e:Engineer {engineerId: $engId})
         CREATE (q)-[:RESOLVED_BY]->(e)`,
        { qacId: qacs[i].qacId, engId: engineers[engIndex].engineerId }
      );
    }

    // QACs -> QACs (LED_TO): create chains
    for (let i = 0; i < qacs.length - 1; i += 3) {
      if (i + 1 < qacs.length) {
        await session.run(
          `MATCH (q1:QAC {qacId: $id1}), (q2:QAC {qacId: $id2})
           CREATE (q1)-[:LED_TO]->(q2)`,
          { id1: qacs[i].qacId, id2: qacs[i + 1].qacId }
        );
      }
    }

    // Print summary
    console.log('\n--- Seed Summary ---');
    const nodeCount = await session.run('MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label');
    for (const record of nodeCount.records) {
      console.log(`  ${record.get('label')}: ${record.get('count').toNumber()}`);
    }

    const relCount = await session.run('MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY type');
    for (const record of relCount.records) {
      console.log(`  -[${record.get('type')}]->: ${record.get('count').toNumber()}`);
    }

    const totalNodes = await session.run('MATCH (n) RETURN count(n) AS c');
    const totalRels = await session.run('MATCH ()-[r]->() RETURN count(r) AS c');
    console.log(`\nTotal: ${totalNodes.records[0].get('c').toNumber()} nodes, ${totalRels.records[0].get('c').toNumber()} relationships`);

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().then(() => {
  console.log('\nSeed complete!');
  process.exit(0);
});
