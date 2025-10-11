01-OVERVIEW.md

clear-ai-v2 — Research notes

This document set is a quick-start research bundle for bootstrapping clear-ai v2 (modular, LangGraph-based, local agent runtime that uses MCP tools). Paste the following files into your new project’s research/ folder and give them to Cursor.

⸻

02-PROJECT-INIT.md

Project quick init (copy/paste)

mkdir clear-ai-v2
cd clear-ai-v2
yarn init -y
yarn add typescript ts-node @langchain/langgraph @modelcontextprotocol/sdk neo4j-driver @pinecone-database/pinecone openai
yarn add -D @types/node jest ts-jest @types/jest nock supertest
npx tsc --init

Set moduleResolution: "nodeNext" and module: "ESNext" in tsconfig.json.

⸻

03-FOLDER-STRUCTURE.md

clear-ai-v2/
├── src/
│   ├── agents/
│   │   ├── orchestrator.ts
│   │   ├── planner.ts
│   │   ├── executor.ts
│   │   ├── analyzer.ts
│   │   └── summarizer.ts
│   ├── tools/
│   │   ├── facilities.ts
│   │   ├── shipments.ts
│   │   ├── contaminants.ts
│   │   └── index.ts
│   ├── memory/
│   │   ├── neo4j.ts
│   │   ├── pinecone.ts
│   │   └── memoryManager.ts
│   ├── graph/
│   │   └── index.ts
│   ├── tests/
│   │   ├── agents/
│   │   │   ├── planner.test.ts
│   │   │   └── executor.test.ts
│   │   └── tools/
│   │       └── shipments.test.ts
│   └── main.ts
├── jest.config.js
├── tsconfig.json
└── package.json

Notes:
	•	Keep tests colocated under src/tests/ to make it easy for Cursor to run them and to keep source + tests in the same TypeScript ecosystem.

⸻

04-AGENTS-SPEC.md

Agent contracts (small, typed interfaces)

// src/agents/types.ts
export type Plan = { steps: Array<{ tool: string; params: Record<string, any> }>; };
export type ToolResult = { tool: string; data: any };

Planner Agent
	•	Input: string (user query) + optional context
	•	Output: Plan
	•	Behavior: produce deterministic JSON plan (avoid freeform prose in machine outputs)

Executor Agent
	•	Input: Plan
	•	Output: ToolResult[] (structured outputs)
	•	Behavior: parallelize tool calls, attach tool metadata (status, latency, errors)

Analyzer Agent
	•	Input: ToolResult[]
	•	Output: analysis JSON (anomalies, summaries, entities)

Summarizer Agent
	•	Input: analysis JSON
	•	Output: human-friendly string

⸻

05-TOOLS-SPEC.md

Tools (MCP wrappers)

Each tool should expose a minimal interface for the Executor to call.

// src/tools/types.ts
export interface MCPTool {
  name: string;
  description?: string;
  execute(params: Record<string, any>): Promise<any>;
}

Example: src/tools/shipments.ts should export a shipmentsTool: MCPTool with a test-friendly execute method.

⸻

06-MEMORY-SPEC.md

Memory responsibilities
	•	Neo4j (episodic): store request nodes, tool calls, and relations; useful for queries like “which facilities had repeated contamination?”
	•	Pinecone (semantic): store embeddings of summaries and findings for retrieval and similarity search

Keep memory adapters small and mockable for tests.

// src/memory/memoryManager.ts (interface sketch)
export const memoryManager = {
  async storeEpisodic(event: any) {},
  async queryEpisodic(query: any) {},
  async storeSemantic(text: string) {},
  async querySemantic(query: string) {},
};


⸻

07-LANGGRAPH-INTEGRATION.md

Minimal LangGraph wiring (concept)

// src/graph/index.ts
import { Graph } from "@langchain/langgraph";
import { plannerAgent } from "../agents/planner";
import { executorAgent } from "../agents/executor";
import { analyzerAgent } from "../agents/analyzer";
import { summarizerAgent } from "../agents/summarizer";

export const clearGraph = new Graph({
  name: "clear-ai",
  nodes: {
    planner: plannerAgent,
    executor: executorAgent,
    analyzer: analyzerAgent,
    summarizer: summarizerAgent,
  },
  edges: [["planner","executor"],["executor","analyzer"],["analyzer","summarizer"]],
  entry: "planner",
});

Design note: implement each agent as a node function that returns a typed payload. Start with stubs returning deterministic results for tests.

⸻

08-PLAN-FUNCTION.md

Cursor-like plan() behavior

Planner should return pure JSON following a schema. Use a schema validator (zod) in tests to ensure the planner returns valid plans.

Example plan schema (zod):

import { z } from "zod";
export const PlanSchema = z.object({
  steps: z.array(z.object({ tool: z.string(), params: z.record(z.any()) })),
});

Validate the LLM response before passing to the Executor.

⸻

09-TESTING-STRATEGY.md

Goals
	•	Fast unit tests — mock all external APIs (MCP calls, Neo4j, Pinecone, OpenAI). Use nock for HTTP mocks.
	•	Deterministic planner tests — use ts-jest and snapshot or JSON schema validation.
	•	Integration tests for the graph pipeline using local fakes (no network).

Tools
	•	jest + ts-jest
	•	nock – intercept HTTP for tool execution
	•	sinon or Jest mocks – to stub memory adapters
	•	supertest – if you expose an HTTP interface for orchestrator

⸻

10-SAMPLE-TESTS.md

jest.config.js (example)

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  moduleFileExtensions: ['ts','js','json'],
};

Sample unit test — planner

// src/tests/agents/planner.test.ts
import { plannerAgent } from '../../agents/planner';
import { PlanSchema } from '../../graph/plan-schema';

describe('plannerAgent', () => {
  it('returns a valid plan for contaminated shipments', async () => {
    const plan = await plannerAgent('Show me contaminated shipments last week');
    const parsed = PlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
    expect(plan.steps[0].tool).toBeDefined();
  });
});

Sample integration test — executor with mocked tools

// src/tests/agents/executor.test.ts
import nock from 'nock';
import { executorAgent } from '../../agents/executor';

describe('executorAgent', () => {
  beforeAll(() => {
    nock('http://localhost:4000')
      .get('/shipments')
      .query(true)
      .reply(200, [{ id: 'S1' }]);

    nock('http://localhost:4000')
      .get('/contaminants-detected')
      .query(true)
      .reply(200, [{ shipmentId: 'S1', contaminant: 'Lead' }]);
  });

  afterAll(() => nock.cleanAll());

  it('executes plan steps and returns results', async () => {
    const plan = { steps: [ { tool: 'shipments', params: { q: 'last_week' } }, { tool: 'contaminants-detected', params: { shipment_ids: ['S1'] } } ] };
    const results = await executorAgent(plan);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.tool === 'shipments')).toBe(true);
  });
});

Mocking memory adapters

Use Jest spies to assert that memoryManager.storeEpisodic or storeSemantic is called.

// Example in a test
const spy = jest.spyOn(memoryManager, 'storeEpisodic').mockResolvedValue(undefined);
// run pipeline
expect(spy).toHaveBeenCalled();


⸻

11-CI-AND-GIT.md

Quick CI (GitHub Actions)

Add a simple workflow .github/workflows/node-ci.yml that runs yarn install and yarn test on Node 18.

name: Node CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: yarn install
      - run: yarn test


⸻

12-HOW-TO-USE-WITH-CURSOR.md
	1.	Paste these files into your new project research/ folder.
	2.	Point Cursor at your project root and run its planning function to scaffold code from these notes.
	3.	Start with the stub agents and test suite; get yarn test passing with mocks before connecting real APIs.

⸻

13-QUICK-TODO.md
	1.	scaffold project
	2.	add stub agents
	3.	wire LangGraph with stubs
	4.	add jest + tests
	5.	mock MCP APIs with nock
	6.	implement memory adapters
	7.	replace mocks with real infra
	8.	iterate on multi-agent behavior

⸻

14-CONTACT-AND-REFERENCES.md
	•	Keep credentials out of repo; use .env and dotenv.
	•	Useful libs: zod for schemas, p-retry for retries, p-map for controlled parallelism.
	•	Remember: tests should be fast & deterministic.

⸻

End of research bundle.