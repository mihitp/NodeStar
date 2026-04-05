import neo4j from 'neo4j-driver';
import OpenAI from 'openai';

async function seedEmbeddings() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const embeddingKey = process.env.EMBEDDING_API_KEY;

  if (!uri || !username || !password) {
    console.error('Missing NEO4J env vars');
    process.exit(1);
  }
  if (!embeddingKey) {
    console.error('Missing EMBEDDING_API_KEY');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: embeddingKey });
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  async function embedAndStore(
    label: string,
    idField: string,
    records: Array<{ id: string; text: string }>,
    cypher: string,
  ) {
    if (records.length === 0) { console.log(`  No ${label} nodes found, skipping.`); return; }
    console.log(`Generating embeddings for ${records.length} ${label} nodes...`);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: records.map((r) => r.text),
    });
    for (let i = 0; i < records.length; i++) {
      const embedding = response.data[i].embedding;
      await session.run(cypher, { id: records[i].id, embedding });
    }
    console.log(`  Stored embeddings for ${records.length} ${label} nodes`);
  }

  try {
    // ── Parts ──────────────────────────────────────────────────────────────────
    console.log('\nFetching Parts...');
    const partsResult = await session.run(
      'MATCH (p:Part) RETURN p.partId AS id, p.functionalDescription AS text'
    );
    await embedAndStore(
      'Part',
      'partId',
      partsResult.records.map((r) => ({ id: r.get('id') as string, text: r.get('text') as string })),
      'MATCH (p:Part {partId: $id}) SET p.embedding = $embedding',
    );

    // ── QACs ───────────────────────────────────────────────────────────────────
    console.log('\nFetching QACs...');
    const qacsResult = await session.run(
      'MATCH (q:QAC) RETURN q.qacId AS id, q.question AS text'
    );
    await embedAndStore(
      'QAC',
      'qacId',
      qacsResult.records.map((r) => ({ id: r.get('id') as string, text: r.get('text') as string })),
      'MATCH (q:QAC {qacId: $id}) SET q.embedding = $embedding',
    );

    // ── DesignDocs ─────────────────────────────────────────────────────────────
    console.log('\nFetching DesignDocs...');
    const docsResult = await session.run(
      'MATCH (d:DesignDoc) RETURN d.docId AS id, (d.title + " " + coalesce(d.content, "")) AS text'
    );
    await embedAndStore(
      'DesignDoc',
      'docId',
      docsResult.records.map((r) => ({ id: r.get('id') as string, text: r.get('text') as string })),
      'MATCH (d:DesignDoc {docId: $id}) SET d.embedding = $embedding',
    );

    // ── Workflows (embed name + description + all step actions/descriptions) ───
    console.log('\nFetching Workflows with steps...');
    const workflowsResult = await session.run(
      `MATCH (w:Workflow)
       OPTIONAL MATCH (w)-[:CONTAINS]->(s:WorkflowStep)
       WITH w, collect(coalesce(s.action, '') + ' ' + coalesce(s.description, '')) AS stepTexts
       RETURN w.workflowId AS id,
              (w.name + ' ' + coalesce(w.description, '') + ' ' + reduce(t = '', st IN stepTexts | t + ' ' + st)) AS text`
    );
    await embedAndStore(
      'Workflow',
      'workflowId',
      workflowsResult.records.map((r) => ({ id: r.get('id') as string, text: (r.get('text') as string).trim() })),
      'MATCH (w:Workflow {workflowId: $id}) SET w.embedding = $embedding',
    );

    // ── Verify ─────────────────────────────────────────────────────────────────
    console.log('\n── Verification ──────────────────────────────────────');
    for (const [label, field] of [['Part', 'partId'], ['QAC', 'qacId'], ['DesignDoc', 'docId'], ['Workflow', 'workflowId']]) {
      const r = await session.run(
        `MATCH (n:${label}) WHERE n.embedding IS NOT NULL RETURN count(n) AS c`
      );
      console.log(`  ${label}: ${r.records[0].get('c').toNumber()} nodes with embeddings`);
    }

  } catch (error) {
    console.error('Embedding seed failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seedEmbeddings().then(() => {
  console.log('\nEmbedding seed complete!');
  process.exit(0);
});
