# Agent Tester - Clear AI v2

Comprehensive testing framework for the Clear AI v2 agent system. Tests functionality, performance, and reliability through the GraphQL API.

## Quick Start

### Installation

```bash
cd agent-tester
yarn install
```

### Configuration

Create a `.env` file in the agent-tester directory:

```bash
# GraphQL Endpoint
GRAPHQL_HTTP_ENDPOINT=http://localhost:4001/graphql
GRAPHQL_WS_ENDPOINT=ws://localhost:4001/graphql

# MongoDB
MONGODB_URI=mongodb://localhost:27017/agent-tester

# OpenAI (for semantic validation)
OPENAI_API_KEY=your_api_key_here

# Test Configuration
DEFAULT_TIMEOUT=30000
MAX_RETRIES=3
PARALLEL_LIMIT=5
```

### Build

```bash
yarn build
```

### Run Tests

```bash
# Run all scenarios
yarn test:all

# Run specific scenario
yarn test:scenario simple-shipments-001

# Run by category
yarn test:category simple

# Run with specific tags
node dist/index.js run --tags shipments,basic

# Run with verbose output
node dist/index.js run --all --verbose

# Export results to JSON
node dist/index.js run --all --export results/test-run.json
```

## Project Structure

```
agent-tester/
├── src/
│   ├── client/          # GraphQL client
│   ├── types/           # TypeScript type definitions
│   ├── scenarios/       # Scenario loader
│   ├── runner/          # Test runner
│   ├── validation/      # Validators
│   ├── reporting/       # Reporters
│   └── index.ts         # CLI entry point
├── scenarios/
│   ├── simple/          # Simple single-tool scenarios
│   ├── complex/         # Multi-tool scenarios
│   ├── edge-cases/      # Error and edge case tests
│   ├── performance/     # Load and performance tests
│   └── memory/          # Context and memory tests
├── results/             # Test run outputs
├── baselines/           # Performance baselines
└── data/                # Test database setup
```

## Scenarios

### Simple Scenarios (15)

- **Shipments** (5): list-all, by-date, by-status, by-facility, contaminated
- **Facilities** (3): list-all, by-location, by-type
- **Contaminants** (3): list-all, by-risk-level, by-shipment
- **Inspections** (2): list-all, by-facility
- **Analytics** (2): contamination-rate, facility-performance

### Scenario Format

Each scenario is defined in a YAML file:

```yaml
id: simple-shipments-001
name: "List all shipments"
category: simple
description: "Test basic shipment listing"

tags:
  - shipments
  - basic

priority: critical

query: "Show me all shipments"

expectedBehavior:
  toolsUsed:
    - shipments
  maxLatencyMs: 5000
  responseContains:
    - shipment

validation:
  - type: tool_selection
    expected:
      - shipments
  - type: performance
    maxLatencyMs: 5000
```

## CLI Commands

### run

Run test scenarios with various filters:

```bash
# Run all scenarios
node dist/index.js run --all

# Run specific scenario by ID
node dist/index.js run --scenario simple-shipments-001

# Run by category
node dist/index.js run --category simple

# Run by tags
node dist/index.js run --tags "shipments,basic"

# Run by priority
node dist/index.js run --priority critical

# Verbose output
node dist/index.js run --all --verbose

# Custom timeout
node dist/index.js run --all --timeout 60000

# Export results
node dist/index.js run --all --export results/run.json

# Custom GraphQL endpoint
node dist/index.js run --all --endpoint http://localhost:4001/graphql
```

### list

List available scenarios:

```bash
# List all scenarios
node dist/index.js list

# Filter by category
node dist/index.js list --category simple

# Filter by tags
node dist/index.js list --tags shipments

# Filter by priority
node dist/index.js list --priority critical
```

## Validation Types

### Tool Selection
Validates that the correct tools were used:
```yaml
- type: tool_selection
  expected:
    - shipments
    - contaminants
```

### Performance
Validates latency and resource usage:
```yaml
- type: performance
  maxLatencyMs: 5000
  maxTokens: 1000
```

### Data Structure
Validates response structure:
```yaml
- type: data_structure
  required: true
  requireAnalysis: true
```

### Error Handling
Validates error scenarios:
```yaml
- type: error_handling
  expectError: true
  expectGracefulResponse: true
```

## Development

### Watch Mode

```bash
yarn test:watch
```

### Lint

```bash
yarn lint
```

### Clean

```bash
yarn clean
```

## Output

### Console Output

```
╔════════════════════════════════════════════════════════╗
║        Agent Tester - Clear AI v2 Test Suite          ║
╚════════════════════════════════════════════════════════╝

Running 15 scenarios...

✓ simple-shipments-001: List all shipments - PASSED (1.2s, 95% confidence)
  Tools: shipments

✓ simple-shipments-002: List shipments by date range - PASSED (1.4s, 95% confidence)
  Tools: shipments

✗ simple-shipments-003: List shipments by status - FAILED (2.1s, 45% confidence)
  Tools: shipments
  Errors:
    - Response missing expected content: delivered

============================================================
Test Suite Summary
============================================================

Total: 15
Passed: 14
Failed: 1
Success Rate: 93.3%

Total Duration: 18.5s
Average Duration: 1.2s

Failed Scenarios:
  - simple-shipments-003: List shipments by status
    Response missing expected content: delivered

============================================================
```

### JSON Export

Results can be exported to JSON for further analysis:

```json
{
  "scenarios": [...],
  "summary": {
    "total": 15,
    "passed": 14,
    "failed": 1,
    "successRate": 93.33,
    "totalDuration": 18500,
    "avgDuration": 1233
  },
  "timestamp": "2025-10-12T10:00:00.000Z"
}
```

## Requirements

- Node.js 18+
- TypeScript 5+
- GraphQL server running at http://localhost:4001/graphql
- MongoDB (for metrics storage in Phase 2)

## Phase 1 Status

✅ Core framework implemented:
- GraphQL client with retry logic
- Scenario loader (YAML parsing)
- Test runner (sequential execution)
- Basic validators (tool selection, performance, response content, data structure, error handling)
- Console reporter with colored output
- CLI with multiple commands
- 15 initial test scenarios

## Roadmap

- **Phase 2**: Advanced validation, metrics tracking, 50+ scenarios
- **Phase 3**: WebSocket subscriptions, scenario generation, performance testing
- **Phase 4**: CI/CD integration, regression detection, complete documentation

## Contributing

To add a new scenario:

1. Create a YAML file in the appropriate category directory
2. Follow the scenario format
3. Add appropriate validation rules
4. Test locally: `node dist/index.js run --scenario your-scenario-id`
5. Add to version control

## License

MIT

