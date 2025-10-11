# Next Steps - Building the AI Agents

Now that the MCP server and tools are complete, here's your roadmap for building the AI agent system.

---

## Phase 2: Implement the 5 Core Agents

### 1. Planner Agent (`src/agents/planner.ts`)

**Purpose:** Convert natural language queries into structured execution plans

**Implementation Steps:**

```typescript
// src/agents/planner.ts
import { LLMProvider } from '../llm/provider.js';
import { Plan, PlanStep } from './types.js';

export class PlannerAgent {
  constructor(private llm: LLMProvider) {}
  
  async plan(query: string): Promise<Plan> {
    const systemPrompt = `
      You are a planning agent. Given a user query, generate a structured plan
      using available tools: shipments, facilities, contaminants-detected, inspections.
      
      Return JSON in this format:
      {
        "steps": [
          {
            "tool": "tool_name",
            "params": { "param1": "value1" },
            "parallel": false,
            "depends_on": [0]
          }
        ]
      }
    `;
    
    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    });
    
    // Parse and validate with Zod schema
    const plan = JSON.parse(response.content);
    return PlanSchema.parse(plan);
  }
}
```

**Tests to Write:**
- ✅ Parse "contaminated shipments last week" query
- ✅ Parse "contaminants in Hannover" query
- ✅ Parse "rejected inspections this month" query
- ✅ Handle invalid queries gracefully
- ✅ Validate plan schema

---

### 2. Executor Agent (`src/agents/executor.ts`)

**Purpose:** Execute plan steps, handle dependencies, run tools in parallel

**Implementation Steps:**

```typescript
// src/agents/executor.ts
import { Plan, ToolResult } from './types.js';
import { MCPServer } from '../mcp/server.js';

export class ExecutorAgent {
  constructor(private server: MCPServer) {}
  
  async execute(plan: Plan): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    const completed = new Set<number>();
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      // Wait for dependencies
      if (step.depends_on) {
        for (const depIndex of step.depends_on) {
          if (!completed.has(depIndex)) {
            throw new Error(`Dependency ${depIndex} not completed`);
          }
        }
      }
      
      // Execute tool
      const tool = this.server.getTool(step.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${step.tool}`);
      }
      
      // Resolve params (may reference previous results)
      const resolvedParams = this.resolveParams(step.params, results);
      const result = await tool.execute(resolvedParams);
      
      results.push(result);
      completed.add(i);
    }
    
    return results;
  }
  
  private resolveParams(params: any, results: ToolResult[]): any {
    // Handle template strings like "${step[0].data.id}"
    // ...implementation
    return params;
  }
}
```

**Tests to Write:**
- ✅ Execute simple plan (single tool)
- ✅ Execute plan with dependencies
- ✅ Execute parallel steps
- ✅ Handle tool execution errors
- ✅ Resolve parameters from previous results

---

### 3. Analyzer Agent (`src/agents/analyzer.ts`)

**Purpose:** Analyze tool results, detect patterns, extract entities

**Implementation Steps:**

```typescript
// src/agents/analyzer.ts
import { ToolResult, Analysis, Insight, Anomaly } from './types.js';
import { LLMProvider } from '../llm/provider.js';

export class AnalyzerAgent {
  constructor(private llm: LLMProvider) {}
  
  async analyze(results: ToolResult[]): Promise<Analysis> {
    const systemPrompt = `
      You are an analysis agent. Analyze the tool execution results and:
      1. Extract key insights
      2. Identify anomalies
      3. Detect patterns
      4. Extract entities and relationships
      
      Return structured JSON analysis.
    `;
    
    const dataStr = JSON.stringify(results, null, 2);
    
    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this data:\n${dataStr}` }
      ]
    });
    
    return JSON.parse(response.content);
  }
  
  // Helper methods
  private detectAnomalies(data: any[]): Anomaly[] {
    // Statistical analysis, threshold checks, etc.
    return [];
  }
  
  private extractEntities(data: any[]): Entity[] {
    // NER, relationship extraction
    return [];
  }
}
```

**Tests to Write:**
- ✅ Analyze shipment data
- ✅ Detect high-risk contaminants
- ✅ Identify patterns in rejections
- ✅ Extract entity relationships
- ✅ Handle empty results

---

### 4. Summarizer Agent (`src/agents/summarizer.ts`)

**Purpose:** Generate human-friendly summaries of analysis

**Implementation Steps:**

```typescript
// src/agents/summarizer.ts
import { Analysis, FinalResponse } from './types.js';
import { LLMProvider } from '../llm/provider.js';

export class SummarizerAgent {
  constructor(private llm: LLMProvider) {}
  
  async summarize(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<FinalResponse> {
    const systemPrompt = `
      You are a summarization agent. Create a clear, concise summary
      of the analysis results for the user. Include:
      - Direct answer to the query
      - Key findings
      - Important details
      - Any warnings or recommendations
    `;
    
    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `
          Query: ${query}
          Analysis: ${JSON.stringify(analysis, null, 2)}
        `}
      ]
    });
    
    return {
      message: response.content,
      tools_used: toolsUsed,
      analysis,
      metadata: {
        request_id: crypto.randomUUID(),
        total_duration_ms: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

**Tests to Write:**
- ✅ Generate summary for shipment query
- ✅ Generate summary for contaminant analysis
- ✅ Generate summary for inspection report
- ✅ Handle multiple insights
- ✅ Include recommendations

---

### 5. Orchestrator Agent (`src/agents/orchestrator.ts`)

**Purpose:** Coordinate all agents, manage memory, handle requests

**Implementation Steps:**

```typescript
// src/agents/orchestrator.ts
import { PlannerAgent } from './planner.js';
import { ExecutorAgent } from './executor.js';
import { AnalyzerAgent } from './analyzer.js';
import { SummarizerAgent } from './summarizer.js';
import { MemoryManager } from '../memory/manager.js';

export class OrchestratorAgent {
  constructor(
    private planner: PlannerAgent,
    private executor: ExecutorAgent,
    private analyzer: AnalyzerAgent,
    private summarizer: SummarizerAgent,
    private memory: MemoryManager
  ) {}
  
  async handleQuery(query: string): Promise<FinalResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Load relevant context from memory
      const context = await this.memory.loadContext(query);
      
      // 2. Generate plan
      const plan = await this.planner.plan(query);
      
      // 3. Execute plan
      const results = await this.executor.execute(plan);
      
      // 4. Analyze results
      const analysis = await this.analyzer.analyze(results);
      
      // 5. Generate summary
      const toolsUsed = results.map(r => r.tool);
      const response = await this.summarizer.summarize(
        query,
        analysis,
        toolsUsed
      );
      
      // 6. Store in memory
      await this.memory.storeEpisodic({
        query,
        plan,
        results,
        analysis,
        response
      });
      
      await this.memory.storeSemantic(response.message);
      
      // Update metadata
      response.metadata.total_duration_ms = Date.now() - startTime;
      
      return response;
      
    } catch (error) {
      // Error handling
      throw error;
    }
  }
}
```

**Tests to Write:**
- ✅ Handle end-to-end query
- ✅ Handle errors gracefully
- ✅ Store results in memory
- ✅ Use context from memory
- ✅ Track execution time

---

## Phase 3: Implement Memory Systems

### Neo4j Integration (`src/memory/neo4j.ts`)

```typescript
import neo4j from 'neo4j-driver';

export class Neo4jMemory {
  private driver: any;
  
  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  
  async storeRequest(requestData: any): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        CREATE (r:Request {
          id: $id,
          query: $query,
          timestamp: $timestamp
        })
      `, requestData);
    } finally {
      await session.close();
    }
  }
  
  async queryRelated(entityId: string): Promise<any[]> {
    // Query related events, entities, etc.
    return [];
  }
}
```

### Pinecone Integration (`src/memory/pinecone.ts`)

```typescript
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export class PineconeMemory {
  private pinecone: Pinecone;
  private openai: OpenAI;
  
  constructor(apiKey: string, environment: string) {
    this.pinecone = new Pinecone({ apiKey, environment });
    this.openai = new OpenAI();
  }
  
  async store(text: string, metadata: any): Promise<void> {
    // Generate embedding
    const embedding = await this.generateEmbedding(text);
    
    // Store in Pinecone
    const index = this.pinecone.index('clear-ai-v2');
    await index.upsert([{
      id: crypto.randomUUID(),
      values: embedding,
      metadata
    }]);
  }
  
  async search(query: string, topK: number = 5): Promise<any[]> {
    const embedding = await this.generateEmbedding(query);
    const index = this.pinecone.index('clear-ai-v2');
    const results = await index.query({
      vector: embedding,
      topK
    });
    return results.matches || [];
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  }
}
```

---

## Phase 4: Implement LLM Provider Layer

### Multi-Provider Support (`src/llm/provider.ts`)

```typescript
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse, LLMProviderAdapter } from './types.js';

export class LLMProvider {
  private providers: LLMProviderAdapter[];
  
  constructor(configs: LLMConfig[]) {
    this.providers = configs.map(config => {
      switch (config.provider) {
        case 'openai':
          return new OpenAIAdapter(config);
        case 'anthropic':
          return new AnthropicAdapter(config);
        case 'ollama':
          return new OllamaAdapter(config);
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }
    });
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Try each provider in order (fallback chain)
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          return await provider.generate(request);
        }
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
        // Continue to next provider
      }
    }
    throw new Error('All LLM providers failed');
  }
}
```

---

## Phase 5: Wire Everything with LangGraph

### Create the Graph (`src/graph/index.ts`)

```typescript
import { StateGraph } from '@langchain/langgraph';
import { PlannerAgent } from '../agents/planner.js';
import { ExecutorAgent } from '../agents/executor.js';
// ... other imports

// Define state
interface AgentState {
  query: string;
  plan?: Plan;
  results?: ToolResult[];
  analysis?: Analysis;
  response?: FinalResponse;
}

// Create graph
const workflow = new StateGraph<AgentState>({
  channels: {
    query: { value: null },
    plan: { value: null },
    results: { value: null },
    analysis: { value: null },
    response: { value: null }
  }
});

// Add nodes
workflow.addNode('planner', async (state) => {
  const plan = await plannerAgent.plan(state.query);
  return { ...state, plan };
});

workflow.addNode('executor', async (state) => {
  const results = await executorAgent.execute(state.plan!);
  return { ...state, results };
});

workflow.addNode('analyzer', async (state) => {
  const analysis = await analyzerAgent.analyze(state.results!);
  return { ...state, analysis };
});

workflow.addNode('summarizer', async (state) => {
  const response = await summarizerAgent.summarize(
    state.query,
    state.analysis!,
    state.results!.map(r => r.tool)
  );
  return { ...state, response };
});

// Add edges
workflow.addEdge('planner', 'executor');
workflow.addEdge('executor', 'analyzer');
workflow.addEdge('analyzer', 'summarizer');

// Set entry and finish
workflow.setEntryPoint('planner');
workflow.setFinishPoint('summarizer');

export const clearAIGraph = workflow.compile();
```

---

## Testing Strategy for Agents

### 1. Unit Tests for Each Agent

```typescript
// src/tests/agents/planner.test.ts
describe('PlannerAgent', () => {
  it('should generate valid plan for shipment query', async () => {
    const mockLLM = {
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          steps: [{ tool: 'shipments', params: {} }]
        })
      })
    };
    
    const planner = new PlannerAgent(mockLLM);
    const plan = await planner.plan('Get last week shipments');
    
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].tool).toBe('shipments');
  });
});
```

### 2. Integration Tests

```typescript
// src/tests/integration/pipeline.test.ts
describe('Full Pipeline', () => {
  it('should handle complete query', async () => {
    const orchestrator = new OrchestratorAgent(/* ... */);
    const response = await orchestrator.handleQuery(
      'Get contaminated shipments from last week'
    );
    
    expect(response.message).toBeDefined();
    expect(response.tools_used).toContain('shipments');
    expect(response.tools_used).toContain('contaminants-detected');
  });
});
```

---

## Development Order

1. **Start with Types** (`src/agents/types.ts`)
   - Define all interfaces first
   - Create Zod schemas

2. **Implement Planner** (simplest, no dependencies)
   - Mock LLM responses initially
   - Test with hardcoded plans

3. **Implement Executor** (uses existing MCP server)
   - Already has tools to work with
   - Test with manual plans

4. **Implement Analyzer** (processes executor output)
   - Start with simple rule-based analysis
   - Add LLM later

5. **Implement Summarizer** (straightforward)
   - Template-based initially
   - Enhance with LLM

6. **Implement Orchestrator** (ties everything together)
   - Start without memory
   - Add memory integration later

7. **Add Memory Systems**
   - Neo4j for episodic
   - Pinecone for semantic

8. **Add LLM Providers**
   - OpenAI first
   - Add fallbacks

9. **Wire with LangGraph**
   - Create state machine
   - Test end-to-end

---

## Recommended Timeline

| Phase | Component | Est. Time |
|-------|-----------|-----------|
| 2.1 | Planner Agent | 2-3 days |
| 2.2 | Executor Agent | 2-3 days |
| 2.3 | Analyzer Agent | 3-4 days |
| 2.4 | Summarizer Agent | 2-3 days |
| 2.5 | Orchestrator Agent | 2-3 days |
| 3.1 | Neo4j Integration | 2-3 days |
| 3.2 | Pinecone Integration | 2-3 days |
| 4.1 | LLM Provider Layer | 3-4 days |
| 5.1 | LangGraph Wiring | 2-3 days |
| 5.2 | Integration Testing | 2-3 days |

**Total:** ~4-6 weeks for full implementation

---

## Quick Win: Simple Planner (No LLM)

To get started quickly, implement a rule-based planner:

```typescript
export class SimplePlanner {
  plan(query: string): Plan {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('contaminated') && lowerQuery.includes('shipment')) {
      return {
        steps: [
          {
            tool: 'shipments',
            params: {
              has_contaminants: true,
              date_from: this.getLastWeekDate()
            }
          }
        ]
      };
    }
    
    // Add more rules...
  }
}
```

This lets you test the full pipeline before implementing LLM integration!

---

## Resources

- **LangGraph Docs**: https://js.langchain.com/docs/langgraph
- **MCP Protocol**: https://modelcontextprotocol.io
- **Neo4j TypeScript**: https://neo4j.com/docs/javascript-manual/current/
- **Pinecone Docs**: https://docs.pinecone.io/

---

## Summary

You have a **solid foundation** with the MCP server and tools. The next phase is building the agents that orchestrate these tools intelligently. Start with the Planner and Executor, as they provide immediate value and can work with the existing tools.

Good luck! 🚀

