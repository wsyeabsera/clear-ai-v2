# Orchestrator Agent Blueprint

## Overview
The Orchestrator is the main entry point and coordinator for the entire Clear AI v2 system. It manages the flow between all agents, handles memory integration, and ensures proper error handling and recovery.

## Responsibilities

1. **Request Management**
   - Receive user queries
   - Generate unique request IDs
   - Track execution time
   - Manage request lifecycle

2. **Agent Coordination**
   - Route requests through agent pipeline
   - Manage data flow between agents
   - Handle agent failures
   - Implement retry logic

3. **Memory Integration**
   - Load relevant context before processing
   - Store episodic events
   - Store semantic embeddings
   - Query historical data

4. **Error Recovery**
   - Catch and handle errors
   - Implement fallback strategies
   - Provide meaningful error messages
   - Log failures for debugging

## Architecture

```typescript
// src/agents/orchestrator.ts
import { PlannerAgent } from './planner.js';
import { ExecutorAgent } from './executor.js';
import { AnalyzerAgent } from './analyzer.js';
import { SummarizerAgent } from './summarizer.js';
import { MemoryManager } from '../memory/manager.js';
import { FinalResponse } from './types.js';

export interface OrchestratorConfig {
  enableMemory: boolean;
  maxRetries: number;
  timeout: number;
  enableContextLoading: boolean;
}

export class OrchestratorAgent {
  private config: OrchestratorConfig;
  
  constructor(
    private planner: PlannerAgent,
    private executor: ExecutorAgent,
    private analyzer: AnalyzerAgent,
    private summarizer: SummarizerAgent,
    private memory: MemoryManager,
    config?: Partial<OrchestratorConfig>
  ) {
    this.config = {
      enableMemory: true,
      maxRetries: 3,
      timeout: 60000,
      enableContextLoading: true,
      ...config
    };
  }
  
  async handleQuery(query: string): Promise<FinalResponse> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    console.log(`[${requestId}] Processing query: ${query}`);
    
    try {
      // 1. Load relevant context from memory (if enabled)
      let context = {};
      if (this.config.enableMemory && this.config.enableContextLoading) {
        context = await this.loadContext(query);
        console.log(`[${requestId}] Loaded context:`, context);
      }
      
      // 2. Generate execution plan
      console.log(`[${requestId}] Planning...`);
      const plan = await this.planner.plan(query, context);
      console.log(`[${requestId}] Plan generated:`, plan);
      
      // 3. Execute plan
      console.log(`[${requestId}] Executing plan...`);
      const results = await this.executor.execute(plan);
      console.log(`[${requestId}] Execution complete. Results: ${results.length}`);
      
      // 4. Analyze results
      console.log(`[${requestId}] Analyzing results...`);
      const analysis = await this.analyzer.analyze(results);
      console.log(`[${requestId}] Analysis complete`);
      
      // 5. Generate summary
      console.log(`[${requestId}] Generating summary...`);
      const toolsUsed = results.map(r => r.tool);
      const response = await this.summarizer.summarize(
        query,
        analysis,
        toolsUsed
      );
      
      // 6. Store in memory (if enabled)
      if (this.config.enableMemory) {
        await this.storeInMemory({
          requestId,
          query,
          plan,
          results,
          analysis,
          response
        });
      }
      
      // 7. Update metadata
      response.metadata = {
        request_id: requestId,
        total_duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[${requestId}] Complete in ${response.metadata.total_duration_ms}ms`);
      
      return response;
      
    } catch (error: any) {
      console.error(`[${requestId}] Error:`, error);
      
      // Store error in memory for learning
      if (this.config.enableMemory) {
        await this.memory.storeEpisodic({
          type: 'error',
          requestId,
          query,
          error: {
            message: error.message,
            stack: error.stack
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Return error response
      return {
        message: `I encountered an error processing your request: ${error.message}`,
        tools_used: [],
        metadata: {
          request_id: requestId,
          total_duration_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }
  
  private async loadContext(query: string): Promise<any> {
    try {
      // Load semantic context (similar past queries)
      const semanticContext = await this.memory.querySemantic(query, 3);
      
      // Extract entities from query
      const entities = this.extractEntities(query);
      
      // Load episodic context (related events)
      const episodicContext = await this.memory.queryEpisodic({
        entity_ids: entities,
        limit: 5
      });
      
      return {
        semantic: semanticContext,
        episodic: episodicContext,
        entities
      };
    } catch (error) {
      console.error('Failed to load context:', error);
      return {};
    }
  }
  
  private async storeInMemory(data: any): Promise<void> {
    try {
      // Store episodic event
      await this.memory.storeEpisodic({
        type: 'request',
        id: data.requestId,
        query: data.query,
        plan: data.plan,
        results: data.results,
        timestamp: new Date().toISOString()
      });
      
      // Store semantic embedding of summary
      await this.memory.storeSemantic(
        data.response.message,
        {
          requestId: data.requestId,
          query: data.query,
          toolsUsed: data.response.tools_used
        }
      );
      
      console.log(`Stored request ${data.requestId} in memory`);
    } catch (error) {
      console.error('Failed to store in memory:', error);
      // Don't fail the request if memory storage fails
    }
  }
  
  private extractEntities(query: string): string[] {
    // Simple entity extraction
    // In production, use NER model
    const entities: string[] = [];
    
    // Extract dates
    if (query.match(/last week|this week|yesterday|today/)) {
      entities.push('temporal:week');
    }
    
    // Extract locations
    const locationMatch = query.match(/in ([A-Z][a-z]+)/);
    if (locationMatch) {
      entities.push(`location:${locationMatch[1]}`);
    }
    
    // Extract domain entities
    if (query.includes('shipment')) entities.push('entity:shipment');
    if (query.includes('facility')) entities.push('entity:facility');
    if (query.includes('inspection')) entities.push('entity:inspection');
    
    return entities;
  }
}
```

## Request Flow Diagram

```
User Query
    ↓
┌─────────────────────────────────────────────────────────┐
│ Orchestrator Agent                                      │
│                                                         │
│  1. Load Context (Memory)                              │
│     ├── Semantic search (similar queries)              │
│     └── Episodic search (related events)               │
│                                                         │
│  2. Plan (Planner Agent)                               │
│     └── Generate execution plan                         │
│                                                         │
│  3. Execute (Executor Agent)                           │
│     └── Run tools, aggregate results                    │
│                                                         │
│  4. Analyze (Analyzer Agent)                           │
│     └── Extract insights, detect anomalies             │
│                                                         │
│  5. Summarize (Summarizer Agent)                       │
│     └── Generate human-friendly response               │
│                                                         │
│  6. Store (Memory)                                     │
│     ├── Store episodic event                           │
│     └── Store semantic embedding                        │
└─────────────────────────────────────────────────────────┘
    ↓
Final Response
```

## Error Handling Strategy

### Types of Errors

1. **Planning Errors**
   - Invalid query
   - LLM failure
   - Schema validation failure

2. **Execution Errors**
   - Tool not found
   - Tool execution failure
   - Network errors

3. **Analysis Errors**
   - Invalid data format
   - Processing failure

4. **Memory Errors**
   - Database connection failure
   - Storage failure

### Error Handling Pattern

```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = this.config.maxRetries
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(
        `[${operationName}] Attempt ${attempt}/${maxRetries} failed:`,
        error.message
      );
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(
    `${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}
```

## Configuration

```typescript
// src/config/orchestrator.config.ts
export const orchestratorConfig = {
  // Memory settings
  enableMemory: process.env.ENABLE_MEMORY !== 'false',
  enableContextLoading: process.env.ENABLE_CONTEXT_LOADING !== 'false',
  maxContextItems: parseInt(process.env.MAX_CONTEXT_ITEMS || '5'),
  
  // Retry settings
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
  
  // Timeout settings
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '60000'),
  plannerTimeout: parseInt(process.env.PLANNER_TIMEOUT || '10000'),
  executorTimeout: parseInt(process.env.EXECUTOR_TIMEOUT || '30000'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
};
```

## Testing Strategy

### Unit Tests

```typescript
// src/tests/agents/orchestrator.test.ts
import { OrchestratorAgent } from '../../agents/orchestrator.js';

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;
  let mockPlanner: any;
  let mockExecutor: any;
  let mockAnalyzer: any;
  let mockSummarizer: any;
  let mockMemory: any;
  
  beforeEach(() => {
    mockPlanner = { plan: jest.fn() };
    mockExecutor = { execute: jest.fn() };
    mockAnalyzer = { analyze: jest.fn() };
    mockSummarizer = { summarize: jest.fn() };
    mockMemory = {
      querySemantic: jest.fn().mockResolvedValue([]),
      queryEpisodic: jest.fn().mockResolvedValue([]),
      storeEpisodic: jest.fn().mockResolvedValue(undefined),
      storeSemantic: jest.fn().mockResolvedValue(undefined)
    };
    
    orchestrator = new OrchestratorAgent(
      mockPlanner,
      mockExecutor,
      mockAnalyzer,
      mockSummarizer,
      mockMemory
    );
  });
  
  it('should process query end-to-end', async () => {
    mockPlanner.plan.mockResolvedValue({ steps: [] });
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: 'Test',
      insights: [],
      entities: [],
      anomalies: []
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: 'Test response',
      tools_used: []
    });
    
    const response = await orchestrator.handleQuery('test query');
    
    expect(response.message).toBe('Test response');
    expect(response.metadata.request_id).toBeDefined();
    expect(mockPlanner.plan).toHaveBeenCalled();
    expect(mockExecutor.execute).toHaveBeenCalled();
    expect(mockAnalyzer.analyze).toHaveBeenCalled();
    expect(mockSummarizer.summarize).toHaveBeenCalled();
  });
  
  it('should load context when enabled', async () => {
    mockPlanner.plan.mockResolvedValue({ steps: [] });
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: '', insights: [], entities: [], anomalies: []
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: '', tools_used: []
    });
    
    await orchestrator.handleQuery('test query');
    
    expect(mockMemory.querySemantic).toHaveBeenCalled();
    expect(mockMemory.queryEpisodic).toHaveBeenCalled();
  });
  
  it('should store results in memory', async () => {
    mockPlanner.plan.mockResolvedValue({ steps: [] });
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: '', insights: [], entities: [], anomalies: []
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: 'test', tools_used: []
    });
    
    await orchestrator.handleQuery('test query');
    
    expect(mockMemory.storeEpisodic).toHaveBeenCalled();
    expect(mockMemory.storeSemantic).toHaveBeenCalledWith(
      'test',
      expect.any(Object)
    );
  });
  
  it('should handle errors gracefully', async () => {
    mockPlanner.plan.mockRejectedValue(new Error('Planning failed'));
    
    const response = await orchestrator.handleQuery('test query');
    
    expect(response.message).toContain('error');
    expect(response.metadata.error).toBe(true);
  });
  
  it('should not fail if memory storage fails', async () => {
    mockPlanner.plan.mockResolvedValue({ steps: [] });
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: '', insights: [], entities: [], anomalies: []
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: 'test', tools_used: []
    });
    mockMemory.storeEpisodic.mockRejectedValue(new Error('Storage failed'));
    
    const response = await orchestrator.handleQuery('test query');
    
    // Should still succeed
    expect(response.message).toBe('test');
    expect(response.metadata.error).toBeUndefined();
  });
});
```

## Performance Monitoring

```typescript
export class OrchestratorAgent {
  private metrics = {
    requestsTotal: 0,
    requestsSuccessful: 0,
    requestsFailed: 0,
    avgDuration: 0,
    totalDuration: 0
  };
  
  async handleQuery(query: string): Promise<FinalResponse> {
    this.metrics.requestsTotal++;
    const startTime = Date.now();
    
    try {
      const response = await this.processQuery(query);
      this.metrics.requestsSuccessful++;
      
      const duration = Date.now() - startTime;
      this.metrics.totalDuration += duration;
      this.metrics.avgDuration = 
        this.metrics.totalDuration / this.metrics.requestsTotal;
      
      return response;
    } catch (error) {
      this.metrics.requestsFailed++;
      throw error;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: 
        this.metrics.requestsSuccessful / this.metrics.requestsTotal
    };
  }
}
```

## Usage Example

```typescript
// src/main.ts
import { OrchestratorAgent } from './agents/orchestrator.js';
import { PlannerAgent } from './agents/planner.js';
import { ExecutorAgent } from './agents/executor.js';
import { AnalyzerAgent } from './agents/analyzer.js';
import { SummarizerAgent } from './agents/summarizer.js';
import { MemoryManager } from './memory/manager.js';
import { LLMProvider } from './llm/provider.js';
import { MCPServer } from './mcp/server.js';
import { registerAllTools } from './tools/index.js';

async function main() {
  // Initialize components
  const llm = new LLMProvider(/* config */);
  const memory = new MemoryManager(/* config */);
  
  const mcpServer = new MCPServer('clear-ai-v2', '1.0.0');
  registerAllTools(mcpServer, process.env.WASTEER_API_URL!);
  
  // Create agents
  const planner = new PlannerAgent(llm);
  const executor = new ExecutorAgent(mcpServer);
  const analyzer = new AnalyzerAgent(llm);
  const summarizer = new SummarizerAgent(llm);
  
  // Create orchestrator
  const orchestrator = new OrchestratorAgent(
    planner,
    executor,
    analyzer,
    summarizer,
    memory
  );
  
  // Process query
  const response = await orchestrator.handleQuery(
    'Get me last week\'s shipments that got contaminants'
  );
  
  console.log(response.message);
}
```

## Next Steps

1. Implement basic orchestrator without memory first
2. Add memory integration
3. Add retry logic and error handling
4. Add performance monitoring
5. Add request queuing for high load
6. Add rate limiting per user

