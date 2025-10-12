# Agent Tester - System Architecture

## Overview

The Agent Tester is designed as a standalone Node.js/TypeScript application that communicates with the Clear AI v2 system exclusively through its GraphQL API. This document details the architecture, components, data flow, and technical decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Tester                             │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                  Test Runner (Core)                     │   │
│  │  - Scenario orchestration                               │   │
│  │  - Parallel execution                                    │   │
│  │  - State management                                      │   │
│  └────────────────────────────────────────────────────────┘   │
│         │              │              │              │          │
│         ▼              ▼              ▼              ▼          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Scenario │  │ GraphQL  │  │Validation│  │ Metrics  │     │
│  │ Library  │  │  Client  │  │  Engine  │  │ Tracker  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│       │              │              │              │           │
│       ▼              ▼              ▼              ▼           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Generator │  │Subscriber│  │  Rules   │  │ Database │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                      │                             │           │
│                      ▼                             ▼           │
│              ┌──────────────┐          ┌──────────────┐       │
│              │  Reporting   │          │ Dashboard UI │       │
│              │   Engine     │          │   (Optional) │       │
│              └──────────────┘          └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ GraphQL HTTP/WebSocket
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Clear AI v2 System                             │
│                   (GraphQL Endpoint)                            │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Test Runner

**Responsibility:** Orchestrates test execution

**Capabilities:**
- Load and parse scenarios from files
- Execute scenarios sequentially or in parallel
- Manage test lifecycle (setup, run, teardown)
- Handle errors and retries
- Coordinate between components
- Track overall progress

**Key Classes:**
```typescript
class TestRunner {
  async loadScenarios(path: string): Promise<Scenario[]>
  async runSuite(scenarios: Scenario[], options: RunOptions): Promise<TestResults>
  async runScenario(scenario: Scenario): Promise<ScenarioResult>
  async cleanup(): Promise<void>
}
```

**Configuration:**
- Parallel execution limit
- Timeout settings
- Retry policies
- Output verbosity

### 2. Scenario Library

**Responsibility:** Store and manage test scenarios

**Structure:**
```
scenarios/
├── simple/          # Single-tool queries
│   ├── shipments-list.yml
│   ├── facilities-search.yml
│   └── ...
├── complex/         # Multi-tool queries
│   ├── contamination-analysis.yml
│   ├── facility-capacity.yml
│   └── ...
├── edge-cases/      # Error and boundary conditions
│   ├── invalid-input.yml
│   ├── timeout-handling.yml
│   └── ...
├── performance/     # Load and stress tests
│   ├── concurrent-100.yml
│   ├── large-dataset.yml
│   └── ...
└── memory/          # Context and memory tests
    ├── context-loading.yml
    ├── long-conversation.yml
    └── ...
```

**Scenario Format:**
```typescript
interface Scenario {
  id: string;
  name: string;
  category: 'simple' | 'complex' | 'edge-case' | 'performance' | 'memory';
  description: string;
  tags: string[];
  
  // Test input
  query: string;
  userId?: string;
  context?: Record<string, any>;
  
  // Expected behavior
  expectedBehavior: {
    toolsUsed: string[];
    minResults?: number;
    maxResults?: number;
    responseContains?: string[];
    responseNotContains?: string[];
    maxLatencyMs: number;
    maxTokens?: number;
  };
  
  // Validation rules
  validation: ValidationRule[];
  
  // Metadata
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeout?: number;
  retries?: number;
}
```

### 3. GraphQL Client

**Responsibility:** Communication with the agent system

**Capabilities:**
- Execute queries via HTTP POST
- Execute mutations (executeQuery)
- Subscribe to progress updates via WebSocket
- Handle authentication tokens
- Retry on network errors
- Track request/response timing
- Correlate requests with correlation IDs

**Key Classes:**
```typescript
class GraphQLClient {
  async query<T>(query: string, variables?: any): Promise<T>
  async mutate<T>(mutation: string, variables?: any): Promise<T>
  subscribe(subscription: string, variables?: any): AsyncIterator<any>
  async executeQuery(query: string, userId?: string): Promise<ExecutionResult>
}
```

**Features:**
- Connection pooling
- Request queueing
- Rate limiting
- Error handling
- Timeout management
- Metrics collection

### 4. Validation Engine

**Responsibility:** Validate test results

**Validation Types:**

**a) Schema Validation**
```typescript
interface SchemaValidator {
  validate(result: any, schema: JSONSchema): ValidationResult;
}
```
- Check response structure
- Verify required fields
- Type checking
- Format validation

**b) Data Validation**
```typescript
interface DataValidator {
  validate(result: any, rules: DataRule[]): ValidationResult;
}
```
- Content accuracy
- Value ranges
- Business rules
- Cross-field validation

**c) Performance Validation**
```typescript
interface PerformanceValidator {
  validate(metrics: Metrics, thresholds: Thresholds): ValidationResult;
}
```
- Latency limits
- Token usage limits
- Memory usage limits
- Resource consumption

**d) Semantic Validation**
```typescript
interface SemanticValidator {
  validate(query: string, response: string): Promise<ValidationResult>;
}
```
- Meaning correctness using LLM
- Relevance checking
- Completeness assessment
- Hallucination detection

**e) Business Rule Validation**
```typescript
interface BusinessRuleValidator {
  validate(result: any, rules: Rule[]): ValidationResult;
}
```
- Domain-specific logic
- Data consistency
- Relationship validation
- State validation

**Validation Result:**
```typescript
interface ValidationResult {
  passed: boolean;
  confidence: number; // 0.0 - 1.0
  details: {
    type: string;
    passed: boolean;
    message: string;
    expected?: any;
    actual?: any;
  }[];
  errors: string[];
  warnings: string[];
}
```

### 5. Scenario Generator

**Responsibility:** Create test scenarios dynamically

**Generation Strategies:**

**a) Template-Based**
```typescript
interface TemplateGenerator {
  generate(template: Template, variations: Variation[]): Scenario[];
}
```
Example:
```yaml
template:
  query: "Get {{entity}} from {{timeframe}}"
  variations:
    entity: [shipments, facilities, contaminants]
    timeframe: [last week, last month, today]
```

**b) Combinatorial**
```typescript
interface CombinatorialGenerator {
  generate(tools: Tool[], filters: Filter[]): Scenario[];
}
```
- All tool combinations
- All filter combinations
- All parameter values

**c) LLM-Based**
```typescript
interface LLMGenerator {
  generate(count: number, characteristics: string): Promise<Scenario[]>;
}
```
- Generate realistic queries
- Create edge cases
- Produce adversarial examples

**d) Data-Driven**
```typescript
interface DataDrivenGenerator {
  generate(usageData: UsageLog[]): Scenario[];
}
```
- Based on actual usage
- Real user queries
- Common patterns

### 6. Metrics Tracker

**Responsibility:** Collect and store metrics

**Metrics Categories:**

**Performance:**
```typescript
interface PerformanceMetrics {
  totalLatencyMs: number;
  plannerLatencyMs: number;
  executorLatencyMs: number;
  analyzerLatencyMs: number;
  summarizerLatencyMs: number;
  toolExecutionMs: Record<string, number>;
  memoryQueryMs: number;
}
```

**Cost:**
```typescript
interface CostMetrics {
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  llmCost: number;
  memoryCost: number;
  totalCost: number;
}
```

**Quality:**
```typescript
interface QualityMetrics {
  toolSelectionAccuracy: number;
  analysisRelevance: number;
  responseHelpfulness: number;
  validationConfidence: number;
}
```

**Health:**
```typescript
interface HealthMetrics {
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  retryCount: number;
}
```

**Storage:**
- In-memory during execution
- SQLite database for persistence
- Time-series data structure
- Aggregation for trends

### 7. Reporting Engine

**Responsibility:** Generate reports and visualizations

**Report Types:**

**a) Real-Time Console**
```
Running test suite: comprehensive-v1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45/100 (45%)

✓ simple-query-001: List shipments (1.2s, $0.01)
✓ simple-query-002: Search facilities (0.9s, $0.01)
✗ complex-query-001: Contamination analysis (5.2s, $0.05)
  └─ Tool selection incorrect: expected [shipments, contaminants], got [shipments]

Current: 43 passed, 2 failed, 55 pending
```

**b) Summary Report**
```json
{
  "testRun": {
    "id": "run-12345",
    "timestamp": "2025-10-12T10:00:00Z",
    "duration": "8m 32s",
    "scenarios": {
      "total": 100,
      "passed": 92,
      "failed": 6,
      "skipped": 2
    },
    "performance": {
      "avgLatency": "2.1s",
      "p50": "1.8s",
      "p95": "4.2s",
      "p99": "6.1s"
    },
    "costs": {
      "totalTokens": 125000,
      "totalCost": "$2.50"
    }
  }
}
```

**c) Comparison Report**
```
Performance Comparison: baseline vs current
═══════════════════════════════════════════

Latency:
  Baseline: 2.3s avg  →  Current: 2.1s avg  ✓ 8.7% faster

Cost:
  Baseline: $2.80     →  Current: $2.50     ✓ 10.7% cheaper

Success Rate:
  Baseline: 94%       →  Current: 92%       ✗ 2% worse

Regressions Detected: 3
  - complex-query-001: Tool selection accuracy dropped
  - performance-test-5: Latency increased by 15%
  - edge-case-007: New timeout error
```

**d) HTML Dashboard**
- Interactive charts
- Filterable tables
- Drill-down details
- Export capabilities

## Data Flow

### Test Execution Flow

```
1. Load Scenarios
   ├─ Parse YAML/JSON files
   ├─ Validate scenario format
   └─ Build execution queue

2. Setup Environment
   ├─ Reset test database
   ├─ Seed test data
   └─ Initialize connections

3. Execute Scenarios (Parallel)
   ├─ For each scenario:
   │  ├─ Send GraphQL mutation (executeQuery)
   │  ├─ Subscribe to progress updates
   │  ├─ Collect metrics
   │  ├─ Wait for completion
   │  ├─ Validate results
   │  └─ Store results
   └─ Respect parallel limit

4. Aggregate Results
   ├─ Calculate summary statistics
   ├─ Detect regressions
   ├─ Generate reports
   └─ Update baselines

5. Cleanup
   ├─ Close connections
   ├─ Save metrics
   └─ Exit with status code
```

### Subscription Flow

```
Test Runner                 GraphQL Client                Agent System
    │                            │                             │
    ├─ executeQuery mutation ───>│                             │
    │                            ├─ HTTP POST /graphql ───────>│
    │                            │                             ├─ Process query
    │<── Subscribe to progress ──┤                             │
    │                            ├─ WS /graphql (subscribe) ──>│
    │                            │                             │
    │<── Progress: planning ─────┼───────────────────────────<─┤
    │<── Progress: executing ────┼───────────────────────────<─┤
    │<── Progress: analyzing ────┼───────────────────────────<─┤
    │<── Progress: complete ─────┼───────────────────────────<─┤
    │                            │                             │
    │<── Final result ───────────┤                             │
    │                            │                             │
    ├─ Validate result ─────────>│                             │
    ├─ Store metrics ───────────>│                             │
    └─ Continue to next test     │                             │
```

## Technology Stack

### Core

- **Runtime:** Node.js 18+
- **Language:** TypeScript 5+
- **Build Tool:** esbuild / tsc
- **Package Manager:** yarn

### GraphQL

- **Client:** graphql-request or Apollo Client
- **WebSocket:** graphql-ws
- **Schema:** GraphQL Code Generator (optional)

### Testing

- **Test Framework:** Jest (for unit testing the tester itself)
- **Assertions:** Chai / Jest expect
- **Mocking:** nock (for testing without live server)

### Data

- **Persistence:** SQLite (for metrics history)
- **Query Builder:** better-sqlite3
- **Migrations:** Custom SQL scripts

### Validation

- **Schema:** AJV (JSON Schema validator)
- **LLM:** OpenAI API (for semantic validation)
- **Business Rules:** Custom rule engine

### Reporting

- **CLI:** chalk, ora, cli-table3
- **Charts:** terminal-kit (ASCII charts)
- **HTML:** Handlebars templates
- **Dashboard:** Optional: React + Recharts

### Utilities

- **YAML:** js-yaml
- **Config:** dotenv
- **Logging:** winston or pino
- **Time:** date-fns

## Deployment Strategy

### Development

```bash
# Run locally
cd agent-tester
yarn install
yarn test:run scenarios/simple/

# Watch mode
yarn test:watch

# Generate scenarios
yarn generate:scenarios --count 50
```

### CI/CD

```yaml
# .github/workflows/test.yml
name: Agent Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      # Start dependencies
      - name: Start MongoDB
        run: docker-compose up -d mongo
      
      - name: Start Agent System
        run: |
          yarn install
          yarn build
          yarn api:dev &
          yarn graphql:dev &
          sleep 10
      
      # Run tests
      - name: Run Agent Tester
        run: |
          cd agent-tester
          yarn install
          yarn test:ci
      
      # Upload results
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: agent-tester/results/
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

CMD ["yarn", "test:run"]
```

## Performance Considerations

### Parallel Execution

- Default: 5 concurrent scenarios
- Configurable based on resources
- GraphQL connection pooling
- Rate limiting to avoid overwhelming system

### Resource Usage

- Memory: ~100MB baseline + ~10MB per concurrent test
- CPU: Mostly I/O bound (waiting for responses)
- Network: ~1MB per scenario (including subscriptions)
- Disk: Metrics storage ~1GB per 100K tests

### Optimization

- Reuse GraphQL connections
- Batch metric writes
- Lazy load scenarios
- Stream large reports
- Cache validation rules

## Security Considerations

### Credentials

- GraphQL endpoint in `.env`
- API keys in environment variables
- Never commit credentials
- Support for CI/CD secrets

### Test Data

- Isolated test database
- No production data access
- Generated/seeded data only
- Automatic cleanup

### Network

- HTTPS for production endpoints
- WebSocket encryption
- Request signing (if required)
- Rate limit compliance

## Scalability

### Horizontal Scaling

- Each test runner is independent
- Can run multiple instances
- Aggregate results afterward
- No shared state required

### Test Suite Growth

- Organize scenarios hierarchically
- Tag-based filtering
- Selective execution
- Incremental runs (changed files only)

### Data Volume

- Rotate old metrics
- Aggregate historical data
- Compress archived results
- Prune low-value tests

---

**Next Document:** [02-test-scenarios.md](./02-test-scenarios.md) - Scenario structure and categories

