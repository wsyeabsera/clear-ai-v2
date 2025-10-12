---
sidebar_position: 6
---

# Orchestrator Agent

The Orchestrator Agent coordinates the entire agent pipeline, managing memory context, error handling, request tracking, and metrics collection while orchestrating the Planner, Executor, Analyzer, and Summarizer agents.

## What It Does

The Orchestrator Agent is the top-level coordinator:

```
User Query → ORCHESTRATOR → Complete Response
              ↓
         ┌────┴────┐
         ▼         ▼
    Memory   ┌──────────┐
    Context  │ Pipeline │
         ↑   └──────────┘
         │        ↓
         └────────┘
      Store Results
```

**Input**: Natural language query  
**Output**: Complete AgentResponse with insights and summary

## Pipeline Coordination

### Request Lifecycle

```
1. Receive Query
   ↓
2. Generate Request ID (UUID)
   ↓
3. Load Memory Context
   ↓
4. PLAN (Planner Agent)
   - Convert query to structured plan
   - With loaded context
   ↓
5. EXECUTE (Executor Agent)
   - Execute plan against APIs
   - Parallel + dependency resolution
   ↓
6. ANALYZE (Analyzer Agent)
   - Extract insights from results
   - Detect anomalies
   - Identify entities
   ↓
7. SUMMARIZE (Summarizer Agent)
   - Generate natural language response
   - With query context
   ↓
8. Store in Memory
   - Save query, response, analysis
   - For future context
   ↓
9. Return Response
   - With metadata, metrics
```

### Execution Flow Diagram

```typescript
orchestrator.handleQuery("Get contaminated shipments")
    │
    ├─→ requestId = generateUUID()
    │    → "550e8400-e29b-41d4-a716-446655440000"
    │
    ├─→ context = memory.loadContext(query)
    │    → { semantic: [...], episodic: [...], entities: [...] }
    │
    ├─→ plan = planner.plan(query, context)
    │    → { steps: [{ tool: "shipments_list", params: {...} }] }
    │
    ├─→ results = executor.execute(plan)
    │    → [{ success: true, data: [...], ... }]
    │
    ├─→ analysis = analyzer.analyze(results)
    │    → { insights: [...], entities: [...], anomalies: [...] }
    │
    ├─→ response = summarizer.summarize(query, analysis, tools)
    │    → { message: "Found 3 contaminated...", ... }
    │
    ├─→ memory.store(query, response, analysis)
    │    → Stored for future context
    │
    └─→ return response
         → Complete AgentResponse object
```

## Memory Integration

### Context Loading

```typescript
// Load context before planning
async handleQuery(query: string) {
  const context = await this.loadContext(query);
  
  // context contains:
  // - semantic: Similar past queries (from Pinecone)
  // - episodic: Recent query history (from Neo4j)
  // - entities: Extracted entities from query
  
  const plan = await this.planner.plan(query, context);
  // Planner uses context for better planning
}
```

### Context Structure

```typescript
interface MemoryContext {
  semantic: SemanticResult[];    // Similar queries
  episodic: EpisodicEvent[];    // Query history
  entities: string[];           // Extracted entities
}

interface SemanticResult {
  text: string;                 // Previous query
  score: number;                // Similarity score (0-1)
  metadata: any;                // Additional context
}

interface EpisodicEvent {
  id: string;
  type: string;                 // Event type
  data: any;                    // Event data
  timestamp: string;
}
```

### Memory Storage

```typescript
// Store after completion
async storeInMemory(query, response, analysis) {
  // Store in episodic memory (Neo4j)
  await this.memory.storeEpisodic({
    type: 'query',
    query,
    response: response.message,
    tools: response.tools_used,
    timestamp: new Date().toISOString()
  });
  
  // Store in semantic memory (Pinecone)
  await this.memory.storeSemantic({
    text: `${query} → ${response.message}`,
    metadata: {
      request_id: response.metadata.request_id,
      tools: response.tools_used,
      insights: analysis.insights.length
    }
  });
}
```

## Error Handling

### Pipeline Error Handling

```typescript
async handleQuery(query: string): Promise<AgentResponse> {
  const requestId = generateUUID();
  
  try {
    // Each stage wrapped in error handling
    const context = await this.safeLoadContext(query);
    const plan = await this.safePlan(query, context);
    const results = await this.safeExecute(plan);
    const analysis = await this.safeAnalyze(results);
    const response = await this.safeSummarize(query, analysis);
    
    await this.safeStoreMemory(query, response);
    
    return response;
    
  } catch (error) {
    // Generate error response
    return this.createErrorResponse(error, requestId);
  }
}
```

### Graceful Degradation

```typescript
// If Planner fails → Use default plan
try {
  plan = await planner.plan(query, context);
} catch (error) {
  console.warn('Planning failed, using default plan');
  plan = this.createDefaultPlan(query);
}

// If Memory fails → Continue without context
try {
  context = await memory.loadContext(query);
} catch (error) {
  console.warn('Memory unavailable, continuing without context');
  context = { semantic: [], episodic: [], entities: [] };
}

// If Analyzer fails → Use basic analysis
try {
  analysis = await analyzer.analyze(results);
} catch (error) {
  console.warn('Analysis failed, using basic summary');
  analysis = this.createBasicAnalysis(results);
}
```

### Error Response Format

```typescript
{
  message: "An error occurred while processing your query: Failed to generate valid plan",
  tools_used: [],
  data: undefined,
  analysis: undefined,
  metadata: {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    total_duration_ms: 1234,
    timestamp: "2025-10-12T06:00:00.000Z",
    error: true  // ← Error flag set
  }
}
```

## Request Tracking

### UUID Generation

```typescript
import { randomUUID } from 'crypto';

function generateRequestId(): string {
  return randomUUID();
  // → "550e8400-e29b-41d4-a716-446655440000"
}

// Each request gets unique ID for:
// - Tracing through logs
// - Memory storage/retrieval
// - Performance monitoring
// - Debugging
```

### Request Metadata

```typescript
interface RequestMetadata {
  request_id: string;              // UUID
  total_duration_ms: number;       // End-to-end time
  timestamp: string;               // ISO 8601
  error: boolean;                  // Success/failure
  
  // Additional tracking (optional)
  plan_duration_ms?: number;
  execution_duration_ms?: number;
  analysis_duration_ms?: number;
  summarization_duration_ms?: number;
  memory_duration_ms?: number;
}
```

### Tracking Example

```typescript
const startTime = Date.now();

// Track each stage
const planStart = Date.now();
const plan = await planner.plan(query);
const planDuration = Date.now() - planStart;

const execStart = Date.now();
const results = await executor.execute(plan);
const execDuration = Date.now() - execStart;

// ... similar for analysis and summarization

const totalDuration = Date.now() - startTime;

console.log('Performance breakdown:');
console.log('Planning:', planDuration, 'ms');
console.log('Execution:', execDuration, 'ms');
console.log('Analysis:', analysisDuration, 'ms');
console.log('Summarization:', summaryDuration, 'ms');
console.log('Total:', totalDuration, 'ms');
```

## Metrics Collection

```typescript
// Metrics tracked per request
interface RequestMetrics {
  request_id: string;
  query: string;
  tools_used: string[];
  
  // Timing
  total_duration_ms: number;
  plan_duration_ms: number;
  execution_duration_ms: number;
  analysis_duration_ms: number;
  summarization_duration_ms: number;
  
  // Results
  insights_count: number;
  anomalies_count: number;
  entities_count: number;
  
  // Success
  success: boolean;
  error_message?: string;
  
  // Timestamp
  timestamp: string;
}

// Aggregate metrics
interface SystemMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_duration_ms: number;
  total_insights_generated: number;
  total_anomalies_detected: number;
}
```

## Configuration

```typescript
interface OrchestratorConfig {
  enableMemory: boolean;          // Use memory system
  storeAllQueries: boolean;       // Store every query
  loadContextByDefault: boolean;  // Load context automatically
  maxContextItems: number;        // Max context items to load
  enableProgressTracking: boolean; // Track progress updates
}

// Create with configuration
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memory,
  {
    enableMemory: true,
    storeAllQueries: true,
    loadContextByDefault: true,
    maxContextItems: 5,
    enableProgressTracking: false
  }
);
```

## Complete Usage Examples

### Example 1: Basic Query

```typescript
const response = await orchestrator.handleQuery("Get shipments");

console.log(response.message);
// "Found 12 shipments in the system..."

console.log(response.tools_used);
// ["shipments_list"]

console.log(response.metadata.request_id);
// "550e8400-e29b-41d4-a716-446655440000"

console.log(response.metadata.total_duration_ms);
// 2340
```

### Example 2: Complex Query with Full Response

```typescript
const response = await orchestrator.handleQuery(
  "Analyze contamination patterns in Berlin facilities from last week"
);

// Complete response object:
{
  message: "Analysis of Berlin facilities from last week revealed significant contamination patterns. Found 5 facilities with 3 showing elevated contamination rates above 40%. Lead contamination is the primary concern, detected in 60% of cases. Facility F1 (Berlin Processing Plant) shows critical levels requiring immediate attention.",
  
  tools_used: [
    "facilities_list",
    "shipments_list",
    "contaminants_list"
  ],
  
  data: [
    [/* facilities */],
    [/* shipments */],
    [/* contaminants */]
  ],
  
  analysis: {
    summary: "Analyzed 3 tool executions. Found 5 insights. Extracted 13 entities. Detected 2 anomalies.",
    insights: [
      { type: "pattern", description: "3 facilities above 40% contamination rate", confidence: 0.91 },
      { type: "trend", description: "Lead primary contaminant: 60% of cases", confidence: 0.88 },
      { type: "correlation", description: "F1 contamination correlates with CarrierA deliveries", confidence: 0.85 },
      // ... more insights
    ],
    entities: [
      { id: "F1", type: "facility", name: "Berlin Processing Plant", ... },
      { id: "S1", type: "shipment", ... },
      { id: "C1", type: "contaminant", ... },
      // ... 10 more entities
    ],
    anomalies: [
      { 
        type: "threshold_exceeded", 
        description: "F1 at 95% contamination rate",
        severity: "critical",
        affected_entities: ["F1"]
      },
      { 
        type: "outlier", 
        description: "C3 concentration 3.2σ above mean",
        severity: "high",
        affected_entities: ["C3"]
      }
    ],
    metadata: {
      tool_results_count: 3,
      successful_results: 3,
      failed_results: 0,
      analysis_time_ms: 456
    }
  },
  
  metadata: {
    request_id: "7a3c9f1d-2e4b-4a6c-8d9e-1f2a3b4c5d6e",
    total_duration_ms: 5234,
    timestamp: "2025-10-12T06:00:00.000Z",
    error: false
  }
}
```

### Example 3: Error Scenario

```typescript
const response = await orchestrator.handleQuery("Get data from invalid source");

// Error response:
{
  message: "Unable to process query: Tool not available for the requested operation. Please verify your query and try again.",
  tools_used: [],
  metadata: {
    request_id: "8b4d0e2f-3f5c-4b7d-9e0f-2a3b4c5d6e7f",
    total_duration_ms: 1890,
    timestamp: "2025-10-12T06:01:00.000Z",
    error: true  // Error flag
  }
}
```

### Example 4: Follow-Up Query with Memory

```typescript
// First query
const response1 = await orchestrator.handleQuery(
  "Get facilities in Berlin"
);
// Memory stores: "Berlin facilities: F1, F2, F3"

// Follow-up query
const response2 = await orchestrator.handleQuery(
  "Show me their shipments"
);
// "their" refers to F1, F2, F3 from memory context

console.log(response2.message);
// "Found 15 shipments from the 3 Berlin facilities..."
```

### Example 5: Concurrent Queries

```typescript
// Execute multiple queries simultaneously
const [response1, response2, response3] = await Promise.all([
  orchestrator.handleQuery("Get shipments"),
  orchestrator.handleQuery("Get facilities"),
  orchestrator.handleQuery("Get inspections")
]);

// Each has unique request ID
console.log(response1.metadata.request_id);  // Different
console.log(response2.metadata.request_id);  // Different
console.log(response3.metadata.request_id);  // Different

// All execute independently
```

## Configuration Options

### Basic Configuration

```typescript
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memory
);

// Uses default configuration:
// - enableMemory: true
// - storeAllQueries: true
// - loadContextByDefault: true
// - maxContextItems: 5
```

### Custom Configuration

```typescript
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memory,
  {
    enableMemory: true,              // Use memory system
    storeAllQueries: true,           // Store every query
    loadContextByDefault: true,      // Auto-load context
    maxContextItems: 10,             // Load up to 10 context items
    enableProgressTracking: true     // Emit progress events
  }
);
```

### Without Memory

```typescript
// For stateless operation (no context between queries)
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  null,  // No memory
  {
    enableMemory: false
  }
);

// Each query is independent, no context loaded/stored
```

### Agent-Specific Configuration

```typescript
// Configure individual agents
const planner = new PlannerAgent(llm, mcpServer, {
  temperature: 0.1
});

const executor = new ExecutorAgent(mcpServer, {
  maxParallelExecutions: 10,
  toolTimeout: 60000
});

const analyzer = new AnalyzerAgent(llm, {
  useLLM: true,
  anomalyThreshold: 1.5
});

const summarizer = new SummarizerAgent(llm, {
  format: "markdown",
  tone: "professional"
});

// Orchestrator uses these configured agents
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memory
);
```

## Complete Setup Example

```typescript
import { OrchestratorAgent } from './agents/orchestrator.js';
import { PlannerAgent } from './agents/planner.js';
import { ExecutorAgent } from './agents/executor.js';
import { AnalyzerAgent } from './agents/analyzer.js';
import { SummarizerAgent } from './agents/summarizer.js';
import { MemoryManager } from './shared/memory/manager.js';
import { LLMProvider } from './shared/llm/provider.js';
import { MCPServer } from './mcp/server.js';
import { getLLMConfigs } from './shared/llm/config.js';
import { registerAllTools } from './tools/index.js';

// 1. Initialize LLM
const llmConfigs = getLLMConfigs();
const llm = new LLMProvider(llmConfigs);

// 2. Initialize Memory (optional - can use mocks)
const memory = new MemoryManager({
  neo4j: {
    uri: process.env.NEO4J_URI,
    user: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD
  },
  pinecone: {
    api_key: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    index_name: process.env.PINECONE_INDEX
  }
});
await memory.connect();

// 3. Initialize MCP Server with tools
const mcpServer = new MCPServer('my-app', '1.0.0');
const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:4000/api';
registerAllTools(mcpServer, apiUrl);

// 4. Create agents
const planner = new PlannerAgent(llm, mcpServer);
const executor = new ExecutorAgent(mcpServer);
const analyzer = new AnalyzerAgent(llm);
const summarizer = new SummarizerAgent(llm);

// 5. Create orchestrator
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memory
);

// 6. Execute queries
const response = await orchestrator.handleQuery("Your query here");
console.log(response.message);
```

## Advanced Features

### Progress Tracking

```typescript
// Enable progress tracking
const orchestrator = new OrchestratorAgent(
  planner, executor, analyzer, summarizer, memory,
  { enableProgressTracking: true }
);

// Listen for progress events
orchestrator.on('progress', (update) => {
  console.log(`${update.phase}: ${update.progress}%`);
  // "planning: 20%"
  // "execution: 50%"
  // "analysis: 75%"
  // "summarization: 100%"
});

const response = await orchestrator.handleQuery(query);
```

### Custom Error Handling

```typescript
class CustomOrchestrator extends OrchestratorAgent {
  protected async handleError(error: Error, requestId: string): Promise<AgentResponse> {
    // Custom error handling logic
    console.error(`[${requestId}] Error:`, error);
    
    // Send to monitoring service
    await sendToMonitoring(error, requestId);
    
    // Return custom error response
    return {
      message: "We encountered an issue. Our team has been notified.",
      tools_used: [],
      metadata: {
        request_id: requestId,
        total_duration_ms: 0,
        timestamp: new Date().toISOString(),
        error: true
      }
    };
  }
}
```

### Query Queuing

```typescript
class QueuedOrchestrator extends OrchestratorAgent {
  private queue: Array<{ query: string; resolve: Function }> = [];
  private processing = false;

  async handleQuery(query: string): Promise<AgentResponse> {
    return new Promise((resolve) => {
      this.queue.push({ query, resolve });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const { query, resolve } = this.queue.shift()!;
      const response = await super.handleQuery(query);
      resolve(response);
    }
    this.processing = false;
  }
}
```

## API Reference

### OrchestratorAgent Class

```typescript
class OrchestratorAgent {
  constructor(
    planner: PlannerAgent,
    executor: ExecutorAgent,
    analyzer: AnalyzerAgent,
    summarizer: SummarizerAgent,
    memory: MemoryManager | null,
    config?: Partial<OrchestratorConfig>
  );

  async handleQuery(query: string): Promise<AgentResponse>;
}
```

### Methods

#### `handleQuery(query)`

Processes a natural language query through the complete agent pipeline.

**Parameters**:
- `query` (string): Natural language query

**Returns**: `Promise<AgentResponse>`

**Example**:
```typescript
const response = await orchestrator.handleQuery(
  "Get contaminated shipments from last week"
);
```

## Testing

See comprehensive test outputs in [Testing Guide](./testing.md#orchestrator-integration-tests).

**Test Coverage**:
- ✅ Complete pipeline execution
- ✅ Complex nested queries
- ✅ Memory integration
- ✅ Error recovery
- ✅ Context loading
- ✅ Error propagation
- ✅ Memory configurations
- ✅ Request ID generation
- ✅ Metrics collection
- ✅ Concurrent handling
- ✅ Configuration variations
- ✅ Multi-agent coordination

## Performance Optimization

### 1. Disable Memory for Speed

```typescript
// Memory adds 100-300ms overhead
const fastOrchestrator = new OrchestratorAgent(
  planner, executor, analyzer, summarizer,
  null,  // No memory
  { enableMemory: false }
);

// Typical speedup: 200-300ms per query
```

### 2. Use Rule-Based Analysis

```typescript
// LLM analysis adds 1-3s
const analyzer = new AnalyzerAgent(llm, {
  useLLM: false  // Rule-based only
});

// Typical speedup: 1-2s per query
```

### 3. Parallel Agent Operations

```typescript
// Some operations can run in parallel
const [plan, context] = await Promise.all([
  planner.plan(query),
  memory.loadContext(query)
]);

// Saves time when operations are independent
```

### 4. Cache Common Queries

```typescript
const cache = new Map<string, AgentResponse>();

async handleQuery(query: string): Promise<AgentResponse> {
  // Check cache first
  if (cache.has(query)) {
    return cache.get(query)!;
  }
  
  // Execute pipeline
  const response = await super.handleQuery(query);
  
  // Cache result
  cache.set(query, response);
  
  return response;
}
```

## Troubleshooting

### Slow Query Performance

**Issue**: Queries taking >10 seconds

**Solutions**:
1. Disable memory (`enableMemory: false`)
2. Use rule-based analyzer (`useLLM: false`)
3. Reduce `maxContextItems`
4. Check API server performance
5. Monitor LLM response times

### Memory Errors

**Issue**: Memory storage/loading fails

**Solutions**:
1. Check Neo4j connection: `memory.neo4j.isConnected()`
2. Check Pinecone connection: `memory.pinecone.isConnected()`
3. Use mocks for development
4. Disable memory as fallback: `enableMemory: false`

### Incomplete Responses

**Issue**: Responses missing expected information

**Solutions**:
1. Check all agents initialized correctly
2. Verify tool execution succeeded
3. Check analyzer generated insights
4. Review summarizer configuration
5. Check error in `response.metadata.error`

## Related Documentation

- [Planner Agent](./planner.md) - First stage of pipeline
- [Executor Agent](./executor.md) - Second stage of pipeline
- [Analyzer Agent](./analyzer.md) - Third stage of pipeline
- [Summarizer Agent](./summarizer.md) - Fourth stage of pipeline
- [GraphQL API](./graphql-api.md) - Use Orchestrator via GraphQL
- [Integration Guide](./integration.md) - Set up complete system
- [Testing Guide](./testing.md) - See Orchestrator integration test outputs

