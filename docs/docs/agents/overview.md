---
sidebar_position: 1
---

# Agent System Overview

The Agent System is a sophisticated 5-agent orchestration framework that transforms natural language queries into actionable insights through intelligent planning, parallel execution, deep analysis, and natural language summarization.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Query                                    │
│              "Get contaminated shipments from last week"             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                                │
│  - Coordinates the entire agent pipeline                             │
│  - Manages memory context loading and storage                        │
│  - Tracks request lifecycle and metrics                              │
└───┬──────────────────────────────────────────────────────────────┬───┘
    │                                                              │
    ▼                                                              ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  PLANNER AGENT  │  │ EXECUTOR AGENT  │  │ ANALYZER AGENT  │  │ SUMMARIZER AGENT │
│                 │  │                 │  │                 │  │                  │
│  Query → Plan   │→│ Plan → Results  │→│ Results → Insights│→│ Insights → Message│
│                 │  │                 │  │                 │  │                  │
│  - LLM-based    │  │ - Parallel exec │  │ - Pattern detect│  │ - Natural summary│
│  - Tool select  │  │ - Dependencies  │  │ - LLM analysis  │  │ - Tone control   │
│  - Dependencies │  │ - Retry logic   │  │ - Anomalies     │  │ - Format options │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────────┘
         │                     │                    │                     │
         └─────────────────────┴────────────────────┴─────────────────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │   MEMORY SYSTEM     │
                            │  - Episodic (Neo4j) │
                            │  - Semantic (Pinecone)│
                            └─────────────────────┘
```

## Agent Pipeline Flow

1. **User Query** → Orchestrator receives natural language query
2. **Context Loading** → Orchestrator loads relevant memory context
3. **Planning** → Planner converts query to structured execution plan
4. **Execution** → Executor runs plan with parallel/sequential optimization
5. **Analysis** → Analyzer extracts insights, patterns, and anomalies
6. **Summarization** → Summarizer generates natural language response
7. **Memory Storage** → Orchestrator stores results for future context
8. **Response** → User receives final answer with insights

## Quick Start

### Prerequisites

- **Node.js**: 18+ required
- **OpenAI API Key**: Required for LLM-based agents
- **MongoDB**: Required for waste management API
- **Optional Services**:
  - Neo4j (episodic memory)
  - Pinecone (semantic memory)
  - Groq/Ollama (alternative LLM providers)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd clear-ai-v2

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Build the project
yarn build

# Start the API server
yarn api:start

# Seed the database with test data
yarn seed
```

### First Query Example

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

// Initialize LLM
const llmConfigs = getLLMConfigs();
const llm = new LLMProvider(llmConfigs);

// Initialize Memory (with mock for quick start)
const mockNeo4j = { /* ... */ } as any;
const mockPinecone = { /* ... */ } as any;
const memory = new MemoryManager(config, mockNeo4j, mockPinecone);
await memory.connect();

// Initialize MCP Server with tools
const mcpServer = new MCPServer('my-app', '1.0.0');
registerAllTools(mcpServer, 'http://localhost:4000/api');

// Create agents
const planner = new PlannerAgent(llm, mcpServer);
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

// Execute query
const response = await orchestrator.handleQuery(
  'Get contaminated shipments from last week'
);

console.log(response.message);
// Output: "Found 3 contaminated shipments from last week. 
//          High contamination rate: 60% of shipments have contaminants.
//          Most common contaminant: Lead (2 occurrences)."
```

### Response Structure

```typescript
interface AgentResponse {
  message: string;                  // Natural language summary
  tools_used: string[];            // Tools executed
  data?: any;                      // Raw execution results
  analysis?: Analysis;             // Detailed analysis
  metadata: {
    request_id: string;            // UUID for tracking
    total_duration_ms: number;     // Execution time
    timestamp: string;             // ISO timestamp
    error: boolean;                // Error flag
  };
}
```

## Feature Highlights

### 🧠 Intelligent Planning

The Planner Agent uses LLM to:
- Convert natural language to structured plans
- Select optimal tools for each query
- Resolve temporal references ("last week", "today")
- Create dependency chains for multi-step queries
- Validate tool availability

**Example**:
```
Query: "Get contaminated shipments from Berlin facilities"

Plan:
  Step 1: facilities_list (location=Berlin)
  Step 2: shipments_list (facility_id=${step[0].data.*.id}, has_contaminants=true)
            ↑ depends on Step 1
```

### ⚡ Parallel Execution

The Executor Agent optimizes performance through:
- **Parallel execution** of independent steps
- **Dependency resolution** for sequential requirements
- **Template parameters** for data flow between steps
- **Retry logic** with exponential backoff
- **Timeout protection** for slow operations

**Performance**: Parallel execution is 2-3x faster than sequential

### 🔍 Deep Analysis

The Analyzer Agent provides:
- **Rule-based analysis** for fast pattern detection
- **LLM-based insights** for complex interpretations
- **Anomaly detection** using statistical methods
- **Entity extraction** from query results
- **Confidence scoring** for insight reliability

**Capabilities**:
- Contamination rate analysis
- Facility capacity monitoring
- Risk level assessment
- Trend detection
- Outlier identification

### 📝 Natural Summarization

The Summarizer Agent generates:
- **Human-readable summaries** from complex data
- **Multiple formats**: plain text, markdown, JSON
- **Tone control**: professional, technical, casual
- **LLM-enhanced** for contextual understanding
- **Template-based** for fast generation

### 🔄 Orchestration & Memory

The Orchestrator coordinates:
- **Pipeline management** across all agents
- **Memory integration** for context-aware queries
- **Error handling** with graceful degradation
- **Request tracking** with unique IDs
- **Metrics collection** for monitoring

**Memory Features**:
- Episodic memory (Neo4j) for query history
- Semantic memory (Pinecone) for context retrieval
- Automatic storage of queries and results
- Context-aware follow-up questions

## Supported Queries

### Data Retrieval

```typescript
// Simple queries
"Get shipments"
"Show me facilities in Berlin"
"List today's contaminants"

// Filtered queries
"Get contaminated shipments from last week"
"Show me high-risk contaminants"
"Which facilities are near capacity?"

// Complex multi-step queries
"Get Berlin facilities and their shipments"
"Show me contaminated shipments and their contaminant details"
"Analyse today's contaminants in Hannover facilities"
```

### Analysis Queries

```typescript
// Statistical analysis
"What is the acceptance rate for each facility?"
"Which carriers have the highest contamination rates?"
"Show me contaminant trends over the past 30 days"

// Pattern detection
"What are the most common contaminants this month?"
"Show me inspection failures by waste type"
"Which facilities received the most rejected shipments?"
```

### Complex Scenarios

```typescript
// Multi-step with dependencies
"Get facilities in Berlin, then their shipments, then check for contaminants"

// Aggregation across multiple dimensions
"Analyze contamination patterns by carrier and facility type"

// Follow-up questions (with memory)
User: "Get facilities in Berlin"
Bot:  "Found 3 facilities in Berlin: Processing Plant, Sorting Center, ..."
User: "Show me their shipments"
Bot:  "Found 15 shipments from those 3 facilities..."
```

## Architecture Patterns

### 1. Agent Orchestration Pattern

```typescript
// Orchestrator coordinates independent agents
// Each agent has a single responsibility
// Agents communicate through typed interfaces
// Error handling at orchestrator level

Orchestrator → Planner → Plan
            → Executor(Plan) → ToolResults
            → Analyzer(ToolResults) → Analysis
            → Summarizer(Analysis) → Response
```

### 2. Dependency Resolution Pattern

```typescript
// Executor builds execution graph from plan
// Topologically sorts dependencies
// Executes independent steps in parallel
// Resolves template parameters from previous results

Step 1: facilities_list                    } Parallel
Step 2: shipments_list                     }
Step 3: contaminants_list (depends on 2)   } Sequential
```

### 3. Memory Context Pattern

```typescript
// Load context before planning
context = memory.load(query)

// Use context in planning
plan = planner.plan(query, context)

// Store results after completion
memory.store(query, response)

// Future queries benefit from history
```

## Configuration

### Basic Configuration

```typescript
// Planner configuration
const planner = new PlannerAgent(llm, mcpServer, {
  temperature: 0.1,           // Low for deterministic planning
  maxRetries: 3,              // Retry on failures
  validateToolAvailability: true
});

// Executor configuration
const executor = new ExecutorAgent(mcpServer, {
  maxParallelExecutions: 5,   // Max concurrent operations
  toolTimeout: 30000,         // 30s timeout
  maxRetries: 3,              // Retry failed operations
  failFast: false             // Continue on errors
});

// Analyzer configuration
const analyzer = new AnalyzerAgent(llm, {
  anomalyThreshold: 2.0,      // 2 std deviations
  minConfidence: 0.7,         // Min confidence for insights
  useLLM: true,               // Use LLM for analysis
  enableStatisticalAnalysis: true
});

// Summarizer configuration
const summarizer = new SummarizerAgent(llm, {
  format: 'plain',            // plain | markdown | json
  tone: 'professional',       // professional | technical | casual
  maxLength: 500,             // Max response length
  includeSupportingData: true
});
```

### Advanced Configuration

```typescript
// Orchestrator with full configuration
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
    enableProgressTracking: true
  }
);
```

## Testing

The system includes comprehensive test coverage:

- **78 Agent Unit Tests**: All agents thoroughly tested with mocks
- **62 GraphQL Integration Tests**: API layer validated (60 passing)
- **102 Agent Integration Tests**: Real LLM, API, and service integration
- **20 E2E Tests**: Complete pipeline validation
- **Total: 260+ Agent & GraphQL Tests** with 97% pass rate
- **Grand Total: 960+ Tests** across entire codebase

### Running Tests

```bash
# Run all tests
yarn test

# Run only integration tests
yarn test:integration

# Run specific agent tests
yarn jest src/tests/integration/agents/planner

# Run with coverage
yarn test:coverage
```

See [Testing Guide](./testing.md) for detailed test documentation with actual outputs.

## Performance

### Benchmarks

| Operation | Duration | Details |
|-----------|----------|---------|
| Simple Query | 1-2s | Single tool execution |
| Complex Query | 3-6s | Multi-step with LLM |
| Parallel Execution | 40% faster | vs sequential |
| Planning | 800-1500ms | LLM call |
| Execution | 10-100ms | Per API call |
| Analysis | 200-500ms | Rule-based |
| Analysis (LLM) | 1-3s | With LLM |
| Summarization | 1-2s | LLM call |

### Optimization Tips

1. **Use rule-based analysis** for faster responses (set `useLLM: false`)
2. **Enable parallel execution** for independent queries
3. **Cache LLM responses** for repeated queries
4. **Use lower temperature** for planner (more deterministic)
5. **Increase timeout** for slow APIs

## Use Cases

### 1. Waste Management Analysis

```typescript
// Real-time contamination monitoring
const response = await orchestrator.handleQuery(
  "Show me high-risk contaminants detected today"
);

// Facility performance tracking
const response = await orchestrator.handleQuery(
  "What is the acceptance rate for each facility this month?"
);

// Carrier quality analysis
const response = await orchestrator.handleQuery(
  "Which carriers have the highest contamination rates?"
);
```

### 2. Operational Intelligence

```typescript
// Capacity planning
const response = await orchestrator.handleQuery(
  "Which facilities are near capacity and need attention?"
);

// Trend analysis
const response = await orchestrator.handleQuery(
  "Show me contaminant trends over the past 30 days"
);

// Root cause analysis
const response = await orchestrator.handleQuery(
  "Why are Berlin facilities rejecting more shipments?"
);
```

### 3. Compliance & Reporting

```typescript
// Inspection summaries
const response = await orchestrator.handleQuery(
  "Summarize this week's inspection results by status"
);

// Risk reporting
const response = await orchestrator.handleQuery(
  "Generate a report of all critical contamination incidents"
);

// Compliance checking
const response = await orchestrator.handleQuery(
  "Are there any shipments with HCl levels above acceptable thresholds?"
);
```

## Key Concepts

### Plans

A **Plan** is a structured set of steps generated by the Planner:

```typescript
interface Plan {
  steps: PlanStep[];
  metadata?: {
    query: string;
    timestamp: string;
    estimated_duration_ms?: number;
  };
}

interface PlanStep {
  tool: string;                  // Tool name (e.g., "shipments_list")
  params: Record<string, any>;   // Tool parameters
  depends_on?: number[];         // Step dependencies
  parallel?: boolean;            // Can run in parallel
}
```

### Tool Results

The Executor produces **ToolResult** objects:

```typescript
interface ToolResult {
  success: boolean;
  tool: string;
  data?: any;                    // Result data (if successful)
  error?: {                      // Error details (if failed)
    code: string;
    message: string;
  };
  metadata: {
    executionTime: number;
    timestamp: string;
    retries?: number;
  };
}
```

### Analysis

The Analyzer generates **Analysis** objects:

```typescript
interface Analysis {
  summary: string;
  insights: Insight[];           // Detected patterns
  entities: Entity[];            // Extracted entities
  anomalies: Anomaly[];          // Detected anomalies
  metadata: {
    tool_results_count: number;
    successful_results: number;
    failed_results: number;
    analysis_time_ms: number;
  };
}
```

### Template Parameters

The Executor supports powerful template syntax for data flow:

```typescript
// Access single field
"${step[0].data.id}"                    // → "F1"

// Access nested field
"${step[0].data[0].facility.name}"      // → "Berlin Plant"

// Map over array
"${step[0].data.*.id}"                  // → ["S1", "S2", "S3"]

// Combine with dependencies
{
  tool: "contaminants_list",
  params: { 
    shipment_ids: "${step[0].data.*.id}"  // Use results from step 0
  },
  depends_on: [0]
}
```

## Error Handling

The system includes comprehensive error handling:

### Planner Errors

- **Invalid query**: Returns best-effort plan
- **LLM failure**: Retries up to 3 times
- **Tool not available**: Validation before execution

### Executor Errors

- **Tool execution failure**: Retries with backoff
- **Timeout**: Configurable per-tool timeout
- **Dependency failure**: Continues with partial results (unless failFast)
- **Template resolution error**: Clear error message

### Analyzer Errors

- **No successful results**: Returns empty analysis
- **LLM failure**: Falls back to rule-based analysis
- **Statistical errors**: Handles edge cases gracefully

### Summarizer Errors

- **LLM failure**: Falls back to template-based summary
- **Empty analysis**: Generates informative "no data" message
- **Format errors**: Uses plain text fallback

### Orchestrator Errors

- **Agent failure**: Graceful degradation
- **Memory failure**: Continues without context
- **Complete failure**: Returns error response with request ID

## Next Steps

- [Planner Agent](./planner.md) - Learn about query planning
- [Executor Agent](./executor.md) - Understand execution strategies
- [Analyzer Agent](./analyzer.md) - Explore analysis methods
- [Summarizer Agent](./summarizer.md) - Discover summarization options
- [Orchestrator Agent](./orchestrator.md) - Master pipeline coordination
- [GraphQL API](./graphql-api.md) - Use via GraphQL
- [Integration Guide](./integration.md) - Integrate into your app
- [Testing Guide](./testing.md) - Write tests and see examples

## Support

For issues, questions, or contributions:
- Check the [Integration Guide](./integration.md) for troubleshooting
- Review the [Testing Guide](./testing.md) for test examples
- See individual agent documentation for detailed API reference

## Version Information

- **Current Version**: 1.0.0
- **Agents**: 5 (Planner, Executor, Analyzer, Summarizer, Orchestrator)
- **Tools**: 30+ waste management tools
- **Test Coverage**: 99%+ integration test pass rate
- **LLM Providers**: OpenAI, Groq, Ollama (fallback chain)

