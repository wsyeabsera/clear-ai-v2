# LangGraph Integration Blueprint

## Overview
LangGraph provides the orchestration layer for the agent pipeline, managing state and flow between agents.

## State Definition

```typescript
// src/graph/state.ts
export interface AgentState {
  // Input
  query: string;
  context?: any;
  
  // Intermediate results
  plan?: Plan;
  tool_results?: ToolResult[];
  analysis?: Analysis;
  
  // Output
  response?: FinalResponse;
  
  // Metadata
  request_id?: string;
  errors?: Error[];
}
```

## Graph Implementation

```typescript
// src/graph/index.ts
import { StateGraph } from '@langchain/langgraph';
import { AgentState } from './state.js';
import { PlannerAgent } from '../agents/planner.js';
import { ExecutorAgent } from '../agents/executor.js';
import { AnalyzerAgent } from '../agents/analyzer.js';
import { SummarizerAgent } from '../agents/summarizer.js';

export function createClearAIGraph(
  planner: PlannerAgent,
  executor: ExecutorAgent,
  analyzer: AnalyzerAgent,
  summarizer: SummarizerAgent
) {
  // Create workflow
  const workflow = new StateGraph<AgentState>({
    channels: {
      query: { value: null },
      context: { value: null },
      plan: { value: null },
      tool_results: { value: null },
      analysis: { value: null },
      response: { value: null },
      request_id: { value: null },
      errors: { value: [] }
    }
  });
  
  // Add nodes
  workflow.addNode('planner', async (state) => {
    console.log('Graph: Planning...');
    const plan = await planner.plan(state.query, state.context);
    return { ...state, plan };
  });
  
  workflow.addNode('executor', async (state) => {
    console.log('Graph: Executing...');
    if (!state.plan) throw new Error('No plan available');
    const tool_results = await executor.execute(state.plan);
    return { ...state, tool_results };
  });
  
  workflow.addNode('analyzer', async (state) => {
    console.log('Graph: Analyzing...');
    if (!state.tool_results) throw new Error('No tool results');
    const analysis = await analyzer.analyze(state.tool_results);
    return { ...state, analysis };
  });
  
  workflow.addNode('summarizer', async (state) => {
    console.log('Graph: Summarizing...');
    if (!state.analysis) throw new Error('No analysis');
    const toolsUsed = state.tool_results?.map(r => r.tool) || [];
    const response = await summarizer.summarize(
      state.query,
      state.analysis,
      toolsUsed
    );
    return { ...state, response };
  });
  
  // Add edges
  workflow.addEdge('planner', 'executor');
  workflow.addEdge('executor', 'analyzer');
  workflow.addEdge('analyzer', 'summarizer');
  
  // Set entry and finish points
  workflow.setEntryPoint('planner');
  workflow.setFinishPoint('summarizer');
  
  return workflow.compile();
}
```

## Usage

```typescript
// src/main.ts
import { createClearAIGraph } from './graph/index.js';
import { PlannerAgent } from './agents/planner.js';
import { ExecutorAgent } from './agents/executor.js';
import { AnalyzerAgent } from './agents/analyzer.js';
import { SummarizerAgent } from './agents/summarizer.js';
import { LLMProvider } from './llm/provider.js';
import { MCPServer } from './mcp/server.js';

async function main() {
  // Initialize components
  const llm = new LLMProvider(/* config */);
  const mcpServer = new MCPServer('clear-ai-v2', '1.0.0');
  
  // Create agents
  const planner = new PlannerAgent(llm, mcpServer);
  const executor = new ExecutorAgent(mcpServer);
  const analyzer = new AnalyzerAgent(llm);
  const summarizer = new SummarizerAgent(llm);
  
  // Create graph
  const graph = createClearAIGraph(planner, executor, analyzer, summarizer);
  
  // Execute
  const result = await graph.invoke({
    query: 'Get contaminated shipments from last week',
    request_id: crypto.randomUUID()
  });
  
  console.log(result.response?.message);
}
```

## Conditional Routing

```typescript
// Add conditional routing based on errors
workflow.addConditionalEdges(
  'executor',
  (state) => {
    // If all tools failed, skip analysis
    const allFailed = state.tool_results?.every(r => !r.success);
    return allFailed ? 'error_handler' : 'analyzer';
  }
);

workflow.addNode('error_handler', async (state) => {
  return {
    ...state,
    response: {
      message: 'All tools failed. Please try again.',
      tools_used: [],
      metadata: {
        request_id: state.request_id || '',
        total_duration_ms: 0,
        timestamp: new Date().toISOString(),
        error: true
      }
    }
  };
});
```

