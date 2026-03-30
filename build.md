# ESEC Prototype — Claude Code Build Prompt

> **What this is:** A single prompt you paste into Claude Code to scaffold and build the ESEC prototype end-to-end. It uses phased, non-colliding sub-agent orchestration with lightweight verification at each phase gate.

---

## Project Overview

Build a Next.js (App Router) web application called **ESEC** — an "NPM for mechanical design" prototype. The app connects to a Neo4j Aura graph database and lets an engineer ask natural-language questions about parts, assemblies, and design decisions. The system retrieves context from a knowledge graph, generates answers via Claude API, and stores the interaction as a reusable QAC (Question → Answer → Call-for-action) chain.

**Stack:**
- Next.js 15 (App Router) deployed to Vercel
- Neo4j Aura Free (cloud-hosted graph DB)
- neo4j-driver (JavaScript)
- Claude API (anthropic SDK) for LLM reasoning
- Voyage AI or OpenAI for embeddings (store on graph nodes)
- react-force-graph-2d for graph visualization
- Tailwind CSS for styling
- Vitest for lightweight verification (NOT full TDD — see Verification Strategy)
- Zod for runtime schema validation

**Environment Variables (user will provide):**
```
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
EMBEDDING_API_KEY=xxxxx
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Vercel                         │
│  ┌───────────────────────────────────────────┐  │
│  │           Next.js App Router               │  │
│  │                                            │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ QAC     │  │ Graph    │  │ Workflow │  │  │
│  │  │ Console │  │ Explorer │  │ Browser  │  │  │
│  │  │ (page)  │  │ (page)   │  │ (page)   │  │  │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘ │  │
│  │       │             │              │       │  │
│  │  ┌────▼─────────────▼──────────────▼────┐ │  │
│  │  │         API Routes (/api/)            │ │  │
│  │  │  /api/qac    /api/graph   /api/wf    │ │  │
│  │  └────────────────┬─────────────────────┘ │  │
│  │                   │                        │  │
│  │  ┌────────────────▼─────────────────────┐ │  │
│  │  │         lib/ (shared)                 │ │  │
│  │  │  neo4j.ts  llm.ts  embeddings.ts     │ │  │
│  │  │  schema.ts  seed.ts                  │ │  │
│  │  └──────────┬───────────────────────────┘ │  │
│  └─────────────┼─────────────────────────────┘  │
│                │                                 │
└────────────────┼─────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │  Neo4j Aura     │
        │  (cloud graph)  │
        └─────────────────┘
```

---

## Verification Strategy (Lightweight — NOT Full TDD)

**Do NOT write exhaustive unit tests for every function.** Instead, each phase ends with a small set of **smoke checks** that prove the phase works before the next one starts. Think of these as "gate checks" — if they pass, move on.

For each phase, create a single file: `tests/phase-{N}.smoke.ts`

Each smoke file should contain 3–6 tests max that verify:
1. **Connectivity** — can we reach the service (Neo4j, Claude API)?
2. **Schema shape** — does the response match the Zod schema?
3. **Happy path** — does the core operation succeed with known inputs?

Use **Vitest** (`npx vitest run tests/phase-{N}.smoke.ts`).

**After each phase, run ONLY that phase's smoke tests. Do not run all tests — only the current phase.** This keeps iteration fast.

---

## File Structure

```
esec/
├── app/
│   ├── layout.tsx                  # Root layout with nav
│   ├── page.tsx                    # Landing / redirect to /qac
│   ├── qac/
│   │   └── page.tsx                # QAC Console (Phase 3)
│   ├── explore/
│   │   └── page.tsx                # Graph Explorer (Phase 4)
│   └── workflows/
│       └── page.tsx                # Workflow Browser (Phase 4)
├── app/api/
│   ├── health/route.ts             # Health check endpoint (Phase 1)
│   ├── qac/route.ts                # QAC CRUD + agent loop (Phase 3)
│   ├── graph/
│   │   ├── search/route.ts         # Semantic + graph search (Phase 2)
│   │   └── neighbors/route.ts      # Neighborhood traversal (Phase 2)
│   └── workflows/route.ts          # Workflow templates CRUD (Phase 4)
├── lib/
│   ├── neo4j.ts                    # Driver singleton (Phase 1)
│   ├── schema.ts                   # Zod schemas for all node types (Phase 1)
│   ├── seed.ts                     # Seed data loader script (Phase 1)
│   ├── embeddings.ts               # Embedding generation + similarity (Phase 2)
│   ├── context-builder.ts          # Context budget + slim context builder (Phase 3)
│   ├── llm.ts                      # Claude API wrapper (Phase 3)
│   └── qac-engine.ts               # QAC loop orchestrator (Phase 3)
├── components/
│   ├── QACChat.tsx                  # Chat UI component (Phase 3)
│   ├── GraphViz.tsx                 # Force graph wrapper (Phase 4)
│   ├── WorkflowCard.tsx             # Workflow template card (Phase 4)
│   └── PartCard.tsx                 # Part detail card (Phase 3)
├── seed-data/
│   ├── parts.json                  # 50-100 synthetic parts (Phase 1)
│   ├── assemblies.json             # 10-15 assemblies (Phase 1)
│   ├── design-docs.json            # 20-30 mock DFM notes, specs (Phase 1)
│   ├── qac-histories.json          # 25-30 sample QAC chains (Phase 1)
│   ├── workflows.json              # 8-10 reusable workflow templates (Phase 1)
│   ├── engineers.json              # 5-8 engineer personas (Phase 1)
│   ├── vendors.json                # 5 vendor profiles (Phase 1)
│   └── constraints.json            # 15-20 common constraints (Phase 1)
├── tests/
│   ├── phase-1.smoke.ts            # DB connection + seed verification
│   ├── phase-2.smoke.ts            # Search + embedding verification
│   ├── phase-3.smoke.ts            # QAC loop end-to-end
│   └── phase-4.smoke.ts            # UI rendering + graph viz
├── scripts/
│   └── seed-neo4j.ts               # CLI script to load seed data
├── .env.local                      # Environment variables (user fills in)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── next.config.js
└── vercel.json
```

---

## Phase 1: Foundation — Graph DB + Seed Data

**Goal:** Stand up Neo4j connection, define schemas, generate and load realistic seed data.

**IMPORTANT: Complete ALL of Phase 1 before starting Phase 2. Do not parallelize across phases.**

### Step 1.1: Project Scaffold
```bash
npx create-next-app@latest esec --typescript --tailwind --app --src-dir=false
cd esec
npm install neo4j-driver zod
npm install -D vitest @types/node
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.smoke.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
```

Create `vercel.json`:
```json
{
  "functions": {
    "app/api/**": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### Step 1.2: Neo4j Driver Singleton

Create `lib/neo4j.ts`:
```typescript
import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME!,
        process.env.NEO4J_PASSWORD!
      ),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 20000,
      }
    );
  }
  return driver;
}

export async function runQuery<T>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}
```

### Step 1.3: Zod Schemas

Create `lib/schema.ts` with Zod schemas for every node type. These are the source of truth for the graph and API:

```typescript
import { z } from 'zod';

export const PartSchema = z.object({
  partId: z.string(),
  name: z.string(),
  partNumber: z.string(),
  category: z.enum([
    'bracket', 'standoff', 'enclosure', 'heat-sink',
    'pcb-mount', 'fastener', 'sheet-metal', 'connector',
    'spacer', 'clip'
  ]),
  material: z.string(),
  functionalDescription: z.string(), // natural language: what it DOES, not what it IS
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    unit: z.enum(['mm', 'in']),
  }).optional(),
  weight: z.number().optional(),
  costEstimate: z.number().optional(),
});

export const AssemblySchema = z.object({
  assemblyId: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(['draft', 'review', 'released', 'deprecated']),
  description: z.string(),
});

export const DesignDocSchema = z.object({
  docId: z.string(),
  title: z.string(),
  docType: z.enum(['dfm-note', 'spec', 'rfq', 'eco', 'tolerance-report', 'vendor-feedback']),
  content: z.string(), // abbreviated text content
  source: z.string(),
});

export const QACSchema = z.object({
  qacId: z.string(),
  question: z.string(),
  answer: z.string(),
  action: z.string(), // the "call for action"
  status: z.enum(['open', 'answered', 'resolved', 'reused']),
  timestamp: z.string(),
  tags: z.array(z.string()).optional(),
});

export const WorkflowSchema = z.object({
  workflowId: z.string(),
  name: z.string(),
  description: z.string(),
  stepCount: z.number(),
  category: z.string(),
});

export const WorkflowStepSchema = z.object({
  stepId: z.string(),
  order: z.number(),
  action: z.string(),
  parameters: z.record(z.unknown()).optional(),
  description: z.string(),
});

export const EngineerSchema = z.object({
  engineerId: z.string(),
  name: z.string(),
  role: z.enum(['senior-me', 'junior-me', 'cad-designer', 'manufacturing-eng', 'student']),
  expertise: z.array(z.string()),
});

export const VendorSchema = z.object({
  vendorId: z.string(),
  name: z.string(),
  capabilities: z.array(z.string()),
  leadTimeDays: z.number(),
  location: z.string(),
});

export const ConstraintSchema = z.object({
  constraintId: z.string(),
  type: z.enum(['tolerance', 'material', 'process', 'cost', 'thermal', 'weight']),
  value: z.string(),
  description: z.string(),
});

export const SkillSchema = z.object({
  skillId: z.string(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.string(), // JSON string describing expected input
  outputSchema: z.string(), // JSON string describing expected output
});
```

### Step 1.4: Generate Seed Data

Create seed data JSON files in `seed-data/`. Generate **realistic contract-manufacturing data**:

**parts.json** — 60 parts across categories. Examples:
- "L-bracket, aluminum 6061, mounts PCB to 2mm panel with M3 screws, supports up to 50g board weight"
- "Sheet metal enclosure, steel 1018, houses power supply unit, IP54 rated, snap-fit lid"
- "Standoff, brass, M3 thread, 10mm height, provides board-to-chassis clearance for thermal management"

Every part MUST have a `functionalDescription` that describes what the part DOES (function), not just what it IS (geometry). This is critical — the whole demo is about finding parts by function.

**qac-histories.json** — 25 QAC chains. Each has:
- A realistic question an engineer would ask ("I need to mount a 100x80mm PCB to a 2mm aluminum panel, what bracket should I use?")
- An answer referencing specific parts, constraints, and docs from the seed data
- A call-for-action ("Use part BRK-007, change fillet radius from 2mm to 3mm per vendor DFM feedback, add M3 counterbore holes at 4 corners")

**workflows.json** — 8 workflow templates:
1. "PCB Mounting Bracket Selection" (5 steps)
2. "Sheet Metal Enclosure Sizing" (6 steps)
3. "Fastener Selection for Vibration Environment" (4 steps)
4. "Thermal Management Layout" (5 steps)
5. "DFM Review Checklist" (7 steps)
6. "Vendor RFQ Preparation" (4 steps)
7. "Tolerance Stack-Up Analysis" (5 steps)
8. "Material Substitution Evaluation" (4 steps)

### Step 1.5: Seed Script

Create `scripts/seed-neo4j.ts` that:
1. Reads all JSON files from `seed-data/`
2. Validates each record against the Zod schemas (fail fast if invalid)
3. Clears existing data (`MATCH (n) DETACH DELETE n`)
4. Creates nodes with appropriate labels
5. Creates relationships between nodes based on logical connections:
   - Parts → Assemblies (USED_IN)
   - Parts → Constraints (HAS_CONSTRAINT)
   - Parts → Parts (VARIANT_OF) — for similar parts
   - Parts → Vendors (SOURCED_FROM)
   - Assemblies → DesignDocs (DOCUMENTED_BY)
   - QACs → Parts/Assemblies (ABOUT)
   - QACs → Engineers (RESOLVED_BY)
   - QACs → QACs (LED_TO) — for chains
   - Workflows → WorkflowSteps (CONTAINS)
   - WorkflowSteps → Skills (REQUIRES)
6. Prints summary: node counts by label, relationship counts by type

Run with: `npx tsx scripts/seed-neo4j.ts`

### Step 1.6: Health Check Endpoint

Create `app/api/health/route.ts` that returns:
```json
{
  "status": "ok",
  "neo4j": true,
  "nodeCount": 234,
  "relationshipCount": 567,
  "timestamp": "2026-03-30T..."
}
```

### Phase 1 Gate Check

Create `tests/phase-1.smoke.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getDriver } from '@/lib/neo4j';
import { PartSchema } from '@/lib/schema';

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
        const part = record.get('p').properties;
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
```

**Run:** `npx vitest run tests/phase-1.smoke.ts`
**Pass criteria:** All 4 tests green. Only then proceed to Phase 2.

---

## Phase 2: Search & Retrieval Layer

**Goal:** Build the graph query + embedding search that powers the QAC engine.

**Depends on:** Phase 1 complete (seeded graph).

### Step 2.1: Embeddings Module

Create `lib/embeddings.ts`:
- Function `generateEmbedding(text: string): Promise<number[]>` — calls Voyage AI or OpenAI embeddings API
- Function `cosineSimilarity(a: number[], b: number[]): number`
- On seed: generate embeddings for every Part's `functionalDescription` and every QAC's `question`, store as a property on the node (`embedding: [...]`)

### Step 2.2: Graph Search Endpoint

Create `app/api/graph/search/route.ts`:
- Accepts POST with `{ query: string, limit?: number }`
- Generates embedding of query
- Runs a Cypher query that:
  1. Fetches all Part nodes with embeddings
  2. Computes cosine similarity in-memory (Neo4j Aura Free doesn't have GDS)
  3. Returns top-K parts sorted by similarity
- Also does keyword matching on `functionalDescription` as a fallback
- Returns: `{ parts: Part[], qacs: QAC[], relevanceScores: number[] }`

### Step 2.3: Neighborhood Traversal Endpoint

Create `app/api/graph/neighbors/route.ts`:
- Accepts POST with `{ nodeId: string, nodeLabel: string, depth?: number }`
- Runs: `MATCH (n {partId: $nodeId})-[r*1..{depth}]-(m) RETURN n, r, m`
- Returns nodes and relationships in a format consumable by react-force-graph:
  ```json
  {
    "nodes": [{ "id": "...", "label": "...", "group": "Part" }],
    "links": [{ "source": "...", "target": "...", "type": "USED_IN" }]
  }
  ```

### Phase 2 Gate Check

Create `tests/phase-2.smoke.ts`:
```typescript
describe('Phase 2: Search & Retrieval', () => {
  it('generates embeddings', async () => {
    const emb = await generateEmbedding('aluminum bracket for PCB mounting');
    expect(emb.length).toBeGreaterThan(100);
    expect(emb.every(v => typeof v === 'number')).toBe(true);
  });

  it('search returns relevant parts', async () => {
    const res = await fetch(`${BASE}/api/graph/search`, {
      method: 'POST',
      body: JSON.stringify({ query: 'mount a PCB to aluminum panel' }),
    });
    const data = await res.json();
    expect(data.parts.length).toBeGreaterThan(0);
    expect(data.parts[0].category).toMatch(/bracket|pcb-mount|standoff/);
  });

  it('neighbor traversal returns graph data', async () => {
    const res = await fetch(`${BASE}/api/graph/neighbors`, {
      method: 'POST',
      body: JSON.stringify({ nodeId: 'PART-001', nodeLabel: 'Part', depth: 2 }),
    });
    const data = await res.json();
    expect(data.nodes.length).toBeGreaterThan(1);
    expect(data.links.length).toBeGreaterThan(0);
  });
});
```

**Run:** `npx vitest run tests/phase-2.smoke.ts`
**Pass criteria:** All 3 tests green. Only then proceed to Phase 3.

---

## Phase 3: QAC Engine + Console UI

**Goal:** Build the core QAC loop (the brain of the app) and a chat-style UI to interact with it.

**Depends on:** Phase 2 complete (working search).

### Step 3.0: Context Management Strategy (CRITICAL — Read Before Building Steps 3.1–3.2)

Every LLM call costs tokens and latency. The knowledge graph could return hundreds of nodes for a broad query, but the Claude API call should receive only the **minimum context needed to answer the question well.** This step defines the context budget and ranking strategy that Steps 3.1 and 3.2 must follow.

Create `lib/context-builder.ts`:

```typescript
import { z } from 'zod';

// --- CONTEXT BUDGET ---
// Claude Sonnet has a 200K context window, but we want fast, cheap responses.
// Target: 2,000–4,000 tokens of graph context per LLM call.
// That's roughly 1,500–3,000 words — enough for 5 parts + 3 QACs + 2 docs + constraints.

export const CONTEXT_BUDGET = {
  maxParts: 5,           // Top 5 parts by relevance score
  maxQACs: 3,            // Top 3 similar past QAC chains
  maxDocs: 2,            // Top 2 design docs (DFM notes, specs)
  maxConstraints: 5,     // Up to 5 constraints linked to matched parts
  maxVendorNotes: 2,     // Up to 2 vendor-specific notes
  maxTokensEstimate: 4000, // Hard ceiling — truncate if exceeded
};

// --- WHAT GETS SENT (slim representations, not full nodes) ---

export const PartContextSchema = z.object({
  partId: z.string(),
  name: z.string(),
  category: z.string(),
  material: z.string(),
  functionalDescription: z.string(),
  relevanceScore: z.number(),
  // EXCLUDED from context: dimensions, weight, costEstimate, embedding vector
  // These are available on the node but waste tokens if the LLM doesn't need them.
  // The LLM can reference the partId and the UI will hydrate full details.
});

export const QACContextSchema = z.object({
  qacId: z.string(),
  question: z.string(),          // full question (usually 1-2 sentences)
  answerSummary: z.string(),     // FIRST 200 CHARS of the answer, not the full answer
  action: z.string(),            // the call-for-action (usually 1-2 sentences)
  relevanceScore: z.number(),
  // EXCLUDED: full answer text, timestamps, tags, embedding vector
});

export const DocContextSchema = z.object({
  docId: z.string(),
  title: z.string(),
  docType: z.string(),
  contentSnippet: z.string(),    // FIRST 300 CHARS of content, not the full doc
  // EXCLUDED: full content, source
});

export const ConstraintContextSchema = z.object({
  constraintId: z.string(),
  type: z.string(),
  value: z.string(),
  description: z.string(),       // constraints are short, send full description
});

// --- CONTEXT BUILDING PIPELINE ---

export interface GraphContext {
  parts: z.infer<typeof PartContextSchema>[];
  qacs: z.infer<typeof QACContextSchema>[];
  docs: z.infer<typeof DocContextSchema>[];
  constraints: z.infer<typeof ConstraintContextSchema>[];
  tokenEstimate: number;
}

export function buildContext(
  rankedParts: any[],
  rankedQACs: any[],
  rankedDocs: any[],
  linkedConstraints: any[]
): GraphContext {
  // 1. RANK: Items arrive pre-sorted by relevance score from Phase 2 search.
  //    Take top-K from each category per CONTEXT_BUDGET.

  // 2. SLIM: For each item, extract only the fields defined in the context schemas above.
  //    Truncate answer/content fields to the specified char limits.
  //    DO NOT send embedding vectors, timestamps, or metadata the LLM doesn't need.

  // 3. ESTIMATE TOKENS: Rough estimate = JSON.stringify(context).length / 4.
  //    If over maxTokensEstimate, drop the lowest-relevance items one at a time
  //    (starting with docs, then QACs, then parts — parts are most important).

  // 4. RETURN the slim context object + token estimate.
  //    Log the token estimate for monitoring.

  // Implementation: straightforward slice + map + truncate. No external dependencies.
}

// --- TOKEN ESTIMATION UTILITY ---
export function estimateTokens(obj: unknown): number {
  // Rough heuristic: 1 token ≈ 4 characters of JSON
  return Math.ceil(JSON.stringify(obj).length / 4);
}
```

**Key rules for context management:**

1. **Parts are the highest-priority context.** If budget is tight, keep all 5 parts and cut docs/QACs first. Parts are what the engineer is looking for — everything else is supporting evidence.

2. **Never send embedding vectors to the LLM.** They're arrays of 1,536 floats that burn thousands of tokens and provide zero value in the prompt. Embeddings are for search only — they live in Phase 2, not Phase 3.

3. **Truncate, don't summarize.** For doc content and QAC answers, send the first N characters with a "..." suffix. Don't call the LLM to summarize before calling the LLM to answer — that's two API calls for one question. Truncation is good enough for the prototype.

4. **The LLM references IDs, the UI hydrates details.** The LLM response will say "Use part BRK-007" — the frontend then fetches full part details from the graph to display in the PartCard. This keeps the LLM prompt lean and the UI rich.

5. **Log token estimates.** Every LLM call should log `{ questionLength, contextTokenEstimate, responseTokens, latencyMs }` to console. This lets you spot context bloat during development.

### Step 3.1: LLM Wrapper

Create `lib/llm.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { GraphContext, estimateTokens } from './context-builder';

const client = new Anthropic();

export async function generateQACResponse(
  question: string,
  context: GraphContext  // ALREADY SLIM — built by context-builder.ts
): Promise<{ answer: string; suggestedActions: string[]; confidence: number; referencedPartIds: string[] }> {

  // Format context into a structured prompt section.
  // Use a compact format — NOT verbose JSON. Example:
  //
  // ## Relevant Parts (ranked by relevance)
  // 1. [BRK-007] L-bracket, aluminum 6061 — mounts PCB to 2mm panel with M3 screws (relevance: 0.92)
  // 2. [BRK-012] U-bracket, steel 1018 — mounts transformer to chassis (relevance: 0.78)
  //
  // ## Similar Past Questions
  // 1. [QAC-045] "How to mount a 80x60mm PCB to aluminum?" → Used BRK-007, changed fillet to 3mm...
  //
  // ## Design Notes
  // 1. [DOC-023] DFM Note: "Vendor X minimum fillet radius is 3mm for aluminum bends..."
  //
  // ## Active Constraints
  // 1. [CON-005] Process: Vendor X min bend radius 3mm

  const systemPrompt = `You are a mechanical engineering assistant with access to a company knowledge graph.
You help engineers find parts, understand past design decisions, and take action.

RULES:
- Reference specific part IDs (e.g., BRK-007), doc IDs, and constraint IDs in your answer.
- Suggest 1-3 concrete actions the engineer should take (the "Call for action").
- Rate your confidence 0.0-1.0 based on how well the provided context covers the question.
  - 0.8-1.0: Strong match, multiple supporting sources
  - 0.5-0.7: Partial match, some inference required
  - 0.0-0.4: Weak match, mostly guessing
- If past QACs are relevant, explain how they relate and whether the same approach applies.
- Keep your answer concise — under 300 words. Engineers want specifics, not essays.
- Return ONLY a JSON object with this exact shape:
  {
    "answer": "string",
    "suggestedActions": ["string", ...],
    "confidence": number,
    "referencedPartIds": ["BRK-007", ...]
  }`;

  const start = Date.now();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,           // Cap response size — 300 words ≈ 400 tokens, 1024 gives headroom
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: formatContextForPrompt(question, context) // see helper below
    }],
  });

  const latencyMs = Date.now() - start;
  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log({
    questionLength: question.length,
    contextTokenEstimate: context.tokenEstimate,
    responseTokens: response.usage.output_tokens,
    inputTokens: response.usage.input_tokens,
    latencyMs,
  });

  // Parse the JSON response. If parsing fails, return a fallback.
  try {
    return JSON.parse(responseText);
  } catch {
    return {
      answer: responseText,
      suggestedActions: [],
      confidence: 0.3,
      referencedPartIds: [],
    };
  }
}

function formatContextForPrompt(question: string, context: GraphContext): string {
  // Format the slim context into the compact text format shown above.
  // This is a string builder, not a JSON dump.
  // Each section is a markdown-style header + numbered list.
  // Total output should be under ~3,000 words.
  let prompt = `## Engineer's Question\n${question}\n\n`;

  if (context.parts.length > 0) {
    prompt += `## Relevant Parts (ranked by match)\n`;
    context.parts.forEach((p, i) => {
      prompt += `${i + 1}. [${p.partId}] ${p.name}, ${p.material} — ${p.functionalDescription} (match: ${p.relevanceScore.toFixed(2)})\n`;
    });
    prompt += '\n';
  }

  if (context.qacs.length > 0) {
    prompt += `## Similar Past Questions & Answers\n`;
    context.qacs.forEach((q, i) => {
      prompt += `${i + 1}. [${q.qacId}] "${q.question}" → ${q.answerSummary}... Action: ${q.action}\n`;
    });
    prompt += '\n';
  }

  if (context.docs.length > 0) {
    prompt += `## Relevant Design Documents\n`;
    context.docs.forEach((d, i) => {
      prompt += `${i + 1}. [${d.docId}] (${d.docType}) ${d.title}: "${d.contentSnippet}..."\n`;
    });
    prompt += '\n';
  }

  if (context.constraints.length > 0) {
    prompt += `## Active Constraints\n`;
    context.constraints.forEach((c, i) => {
      prompt += `${i + 1}. [${c.constraintId}] (${c.type}) ${c.value} — ${c.description}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}
```

**System prompt for the QAC agent must include:**
- "You are a mechanical engineering assistant with access to a company knowledge graph."
- "Always reference specific part IDs, document IDs, and constraint IDs in your answers."
- "For each answer, suggest 1-3 concrete actions the engineer should take."
- "Rate your confidence 0-1 based on how well the available data covers the question."
- "If you find similar past QACs, reference them and explain how they relate."
- "Keep your answer concise — under 300 words."
- "Return ONLY valid JSON."

### Step 3.2: QAC Engine

Create `lib/qac-engine.ts`:
```typescript
import { buildContext, CONTEXT_BUDGET } from './context-builder';
import { generateQACResponse } from './llm';
import { generateEmbedding } from './embeddings';
import { runQuery } from './neo4j';

export async function processQuestion(question: string): Promise<QACResult> {
  // 1. Generate embedding of question
  const embedding = await generateEmbedding(question);

  // 2. Search graph — retrieve MORE than the budget, then let buildContext rank and trim.
  //    Fetch top 15 parts, top 10 QACs, top 5 docs — context-builder will cut to budget.
  const [rawParts, rawQACs, rawDocs, rawConstraints] = await Promise.all([
    searchPartsByEmbedding(embedding, 15),       // returns with relevanceScore
    searchQACsByEmbedding(embedding, 10),         // returns with relevanceScore
    searchDocsByPartIds(/* partIds from above */), // linked docs, not embedding search
    getConstraintsForParts(/* partIds */),         // constraints linked to matched parts
  ]);

  // 3. BUILD SLIM CONTEXT — this is where the budget is enforced.
  //    buildContext() takes the raw results, slices to top-K, truncates fields,
  //    estimates tokens, and drops lowest-relevance items if over budget.
  const context = buildContext(rawParts, rawQACs, rawDocs, rawConstraints);

  // 4. Call LLM with the SLIM context — not the raw graph dump.
  const llmResponse = await generateQACResponse(question, context);

  // 5. Parse LLM response into structured QAC
  const qacId = `QAC-${Date.now()}`;

  // 6. Write new QAC node to graph with relationships:
  //    - (qac)-[:ABOUT]->(matched parts) — use llmResponse.referencedPartIds
  //    - (qac)-[:REFERENCES]->(matched docs)
  //    - (qac)-[:SIMILAR_TO]->(similar past qacs)
  await writeQACToGraph(qacId, question, llmResponse, context);

  // 7. Return the QAC result to the caller
  return {
    qacId,
    question,
    answer: llmResponse.answer,
    suggestedActions: llmResponse.suggestedActions,
    confidence: llmResponse.confidence,
    referencedParts: context.parts.filter(p =>
      llmResponse.referencedPartIds.includes(p.partId)
    ),
    similarQACs: context.qacs,
    relatedDocs: context.docs,
  };
}
```

### Step 3.3: QAC API Route

Create `app/api/qac/route.ts`:
- POST: accepts `{ question: string, engineerId?: string }`, runs `processQuestion()`, returns the QAC result
- GET: accepts `?partId=xxx` or `?tag=xxx`, returns relevant QAC history from the graph

### Step 3.4: QAC Console UI

Create `app/qac/page.tsx` and `components/QACChat.tsx`:
- Chat-style interface: user types a question, system responds with answer + suggested actions
- Below each answer, show:
  - Referenced parts as clickable cards (PartCard component)
  - Confidence score
  - "Similar past questions" section showing related QACs from the graph
  - Suggested actions as a numbered list with a "Save as Workflow" button
- Use streaming if possible (Claude API streaming), otherwise show a loading state

### Step 3.5: Part Card Component

Create `components/PartCard.tsx`:
- Displays: name, part number, category, material, functional description
- Click expands to show constraints, vendor info, related docs
- Small "Explore in Graph" link that navigates to `/explore?nodeId={partId}`

### Phase 3 Gate Check

Create `tests/phase-3.smoke.ts`:
```typescript
import { buildContext, CONTEXT_BUDGET, estimateTokens } from '@/lib/context-builder';

describe('Phase 3: QAC Engine', () => {
  it('context builder stays within token budget', async () => {
    // Simulate worst case: many results from search
    const fakeParts = Array.from({ length: 20 }, (_, i) => ({
      partId: `PART-${i}`, name: `Part ${i}`, category: 'bracket',
      material: 'aluminum 6061', functionalDescription: 'A test part '.repeat(20),
      relevanceScore: 1 - i * 0.05,
    }));
    const fakeQACs = Array.from({ length: 15 }, (_, i) => ({
      qacId: `QAC-${i}`, question: 'How to mount a PCB?',
      answer: 'Use bracket X and change fillet radius. '.repeat(10),
      action: 'Change fillet to 3mm', relevanceScore: 1 - i * 0.05,
    }));
    const fakeDocs = Array.from({ length: 8 }, (_, i) => ({
      docId: `DOC-${i}`, title: `DFM Note ${i}`, docType: 'dfm-note',
      content: 'Vendor X requires minimum 3mm fillet radius on aluminum. '.repeat(10),
    }));
    const fakeConstraints = Array.from({ length: 10 }, (_, i) => ({
      constraintId: `CON-${i}`, type: 'process',
      value: '3mm min', description: 'Vendor minimum bend radius',
    }));

    const context = buildContext(fakeParts, fakeQACs, fakeDocs, fakeConstraints);

    // Must respect budget limits
    expect(context.parts.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxParts);
    expect(context.qacs.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxQACs);
    expect(context.docs.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxDocs);
    expect(context.constraints.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxConstraints);

    // Must stay under token ceiling
    expect(context.tokenEstimate).toBeLessThanOrEqual(CONTEXT_BUDGET.maxTokensEstimate);

    // QAC answers must be truncated, not full-length
    context.qacs.forEach(q => {
      expect(q.answerSummary.length).toBeLessThanOrEqual(203); // 200 chars + "..."
    });
  });

  it('QAC engine processes a question end-to-end', async () => {
    const result = await processQuestion(
      'I need to mount a 100x80mm PCB to a 2mm aluminum panel'
    );
    expect(result.answer).toBeTruthy();
    expect(result.suggestedActions.length).toBeGreaterThan(0);
    expect(result.qacId).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('QAC is persisted to graph', async () => {
    const session = getDriver().session();
    try {
      const result = await session.run(
        'MATCH (q:QAC) WHERE q.status = "resolved" RETURN count(q) as c'
      );
      expect(result.records[0].get('c').toNumber()).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  it('QAC API returns valid response', async () => {
    const res = await fetch(`${BASE}/api/qac`, {
      method: 'POST',
      body: JSON.stringify({ question: 'best fastener for vibration environment' }),
    });
    const data = await res.json();
    expect(QACSchema.partial().parse(data)).toBeTruthy();
  });
});
```

**Run:** `npx vitest run tests/phase-3.smoke.ts`

---

## Phase 4: Visualization + Workflow Browser

**Goal:** Add the graph explorer and workflow browser views. These are supporting features that make the demo visually compelling.

**Depends on:** Phase 3 complete (working QAC loop).

### Step 4.1: Graph Explorer

Create `app/explore/page.tsx` and `components/GraphViz.tsx`:
- Uses `react-force-graph-2d` (import dynamically with `ssr: false`)
- On load, fetches neighborhood of a selected node via `/api/graph/neighbors`
- Nodes colored by label (Parts = blue, QACs = green, Workflows = orange, etc.)
- Click a node to see its properties in a sidebar panel
- Search bar at top to find a starting node

```bash
npm install react-force-graph-2d
```

### Step 4.2: Workflow Browser

Create `app/workflows/page.tsx` and `components/WorkflowCard.tsx`:
- Lists all Workflow nodes from the graph
- Each card shows: name, description, step count, category
- Click to expand and see all WorkflowSteps in order
- "Run this workflow" button creates a new QAC chain pre-populated with the workflow's steps
- Workflow API: `app/api/workflows/route.ts` — GET lists all workflows, GET with `?id=` returns steps

### Step 4.3: Navigation Layout

Update `app/layout.tsx`:
- Top nav bar with links: QAC Console | Graph Explorer | Workflows
- ESEC logo/name on left
- Simple, clean — Tailwind defaults are fine

### Phase 4 Gate Check

Create `tests/phase-4.smoke.ts`:
```typescript
describe('Phase 4: Visualization + Workflows', () => {
  it('graph neighbors endpoint returns viz-compatible data', async () => {
    const res = await fetch(`${BASE}/api/graph/neighbors`, {
      method: 'POST',
      body: JSON.stringify({ nodeId: 'PART-001', nodeLabel: 'Part', depth: 2 }),
    });
    const data = await res.json();
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('links');
    expect(data.nodes[0]).toHaveProperty('id');
    expect(data.nodes[0]).toHaveProperty('group');
  });

  it('workflows endpoint returns valid workflows', async () => {
    const res = await fetch(`${BASE}/api/workflows`);
    const data = await res.json();
    expect(data.workflows.length).toBeGreaterThan(5);
    expect(WorkflowSchema.parse(data.workflows[0])).toBeTruthy();
  });

  it('workflow detail includes steps', async () => {
    const res = await fetch(`${BASE}/api/workflows?id=WF-001`);
    const data = await res.json();
    expect(data.steps.length).toBeGreaterThan(2);
    expect(data.steps[0]).toHaveProperty('order');
    expect(data.steps[0]).toHaveProperty('action');
  });
});
```

**Run:** `npx vitest run tests/phase-4.smoke.ts`

---

## Sub-Agent Collision Prevention Rules

When building this project with multiple agents or parallel tasks, follow these rules strictly:

1. **Phases are sequential.** Never start Phase N+1 until Phase N's smoke tests pass. Each phase depends on the outputs of the previous one.

2. **Within a phase, files are partitioned.** No two tasks within a phase should edit the same file. The file structure above makes this explicit — each component/route/lib file is owned by exactly one step.

3. **Shared files are written once, early.** The files that multiple phases depend on (`lib/neo4j.ts`, `lib/schema.ts`) are created in Phase 1 and should NOT be modified in later phases unless a smoke test reveals a bug. If a later phase needs to extend a schema, add a new schema in `lib/schema.ts` — do not modify existing ones.

4. **API routes are independent.** `/api/qac`, `/api/graph/*`, and `/api/workflows` never import from each other. They all import from `lib/` only. This means agents working on different API routes cannot collide.

5. **UI components are leaf nodes.** Components import from `lib/` and call API routes. They never import from each other except through the page that composes them. `QACChat` does not import `GraphViz`.

6. **Seed data is write-once.** The `seed-data/` JSON files and `scripts/seed-neo4j.ts` are created in Phase 1 and never modified. If you need more data later, create a NEW seed file (e.g., `seed-data/additional-qacs.json`) and a supplementary script.

---

## Final Deployment Checklist

After all 4 phases pass their smoke tests:

1. Run all smoke tests together: `npx vitest run`
2. Build: `npm run build` — must succeed with no errors
3. Test locally: `npm run dev` — manually verify:
   - QAC Console: ask a question, get an answer with part references
   - Graph Explorer: click a part, see its neighborhood
   - Workflow Browser: browse workflows, see steps
4. Deploy: `vercel --prod`
5. Verify health endpoint: `curl https://your-app.vercel.app/api/health`

---

## What NOT to Build (Scope Guardrails)

Do NOT implement any of the following in this prototype:
- User authentication or role-based access (explain it in the pitch, don't build it)
- Real CAD file manipulation or 3D viewers
- File upload or document ingestion pipeline
- Real-time collaboration or multi-user features
- Payment, billing, or SaaS infrastructure
- Mobile-responsive design (desktop-first is fine)
- CI/CD pipelines or deployment automation
- Full test suites or TDD — only the phase smoke tests described above
