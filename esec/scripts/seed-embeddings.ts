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

  try {
    // Embed Part functionalDescriptions
    console.log('Fetching Parts...');
    const partsResult = await session.run(
      'MATCH (p:Part) RETURN p.partId AS id, p.functionalDescription AS text'
    );

    const partTexts = partsResult.records.map((r) => ({
      id: r.get('id') as string,
      text: r.get('text') as string,
    }));

    console.log(`Generating embeddings for ${partTexts.length} parts...`);
    // Batch embed (OpenAI supports up to 2048 inputs)
    const partEmbResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: partTexts.map((p) => p.text),
    });

    for (let i = 0; i < partTexts.length; i++) {
      const embedding = partEmbResponse.data[i].embedding;
      await session.run(
        'MATCH (p:Part {partId: $id}) SET p.embedding = $embedding',
        { id: partTexts[i].id, embedding }
      );
    }
    console.log(`  Stored embeddings for ${partTexts.length} parts`);

    // Embed QAC questions
    console.log('Fetching QACs...');
    const qacsResult = await session.run(
      'MATCH (q:QAC) RETURN q.qacId AS id, q.question AS text'
    );

    const qacTexts = qacsResult.records.map((r) => ({
      id: r.get('id') as string,
      text: r.get('text') as string,
    }));

    console.log(`Generating embeddings for ${qacTexts.length} QACs...`);
    const qacEmbResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: qacTexts.map((q) => q.text),
    });

    for (let i = 0; i < qacTexts.length; i++) {
      const embedding = qacEmbResponse.data[i].embedding;
      await session.run(
        'MATCH (q:QAC {qacId: $id}) SET q.embedding = $embedding',
        { id: qacTexts[i].id, embedding }
      );
    }
    console.log(`  Stored embeddings for ${qacTexts.length} QACs`);

    // Verify
    const verifyParts = await session.run(
      'MATCH (p:Part) WHERE p.embedding IS NOT NULL RETURN count(p) AS c'
    );
    const verifyQacs = await session.run(
      'MATCH (q:QAC) WHERE q.embedding IS NOT NULL RETURN count(q) AS c'
    );
    console.log(`\nVerification: ${verifyParts.records[0].get('c').toNumber()} parts with embeddings, ${verifyQacs.records[0].get('c').toNumber()} QACs with embeddings`);

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
