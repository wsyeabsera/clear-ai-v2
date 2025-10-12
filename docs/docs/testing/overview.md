---
sidebar_position: 1
---

# Testing & Validation Overview

Clear AI v2 has a comprehensive, multi-layered testing strategy that ensures reliability, performance, and correctness at every level of the system.

## Testing Philosophy

### Test Everything, Trust Nothing

- **960+ Total Tests** across all layers
- **97% Pass Rate** in production
- **TDD Approach** - tests written before implementation
- **Continuous Integration** - automated on every commit

### Three Testing Layers

```
┌─────────────────────────────────────────────┐
│         Unit Tests (802)                    │
│  • Fast (< 1s per test)                    │
│  • Isolated with mocks                     │
│  • Test business logic                     │
│  • 100% passing                             │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│      Integration Tests (160+)               │
│  • Real services (LLM, API, GraphQL)       │
│  • Validate interactions                    │
│  • Test end-to-end flows                   │
│  • 97% passing                              │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│      Agent Tester (Future)                  │
│  • User scenario simulation                 │
│  • Performance benchmarking                 │
│  • Regression detection                     │
│  • Cost tracking                            │
└─────────────────────────────────────────────┘
```

## Test Distribution

| Component | Unit | Integration | GraphQL | Total |
|-----------|------|-------------|---------|-------|
| Shared Library (19 modules) | 724 | 100+ | - | 824+ |
| Agent System (5 agents) | 78 | 102 | - | 180 |
| GraphQL API | - | - | 62 | 62 |
| **Total** | **802** | **160+** | **62** | **960+** |

## Test Categories

### 1. Unit Tests (802 tests)

**Purpose**: Fast, isolated testing of individual functions and classes

**Characteristics**:
- Run in < 20 seconds total
- No external dependencies
- Mock all services (LLM, databases, APIs)
- Deterministic results

**Coverage**:
- Shared library modules (724 tests)
- Agent business logic (78 tests)

**Example**:
```bash
yarn test
# Runs in ~15 seconds
```

### 2. Integration Tests (160+ tests)

**Purpose**: Validate interactions with real services

**Characteristics**:
- Use real LLM providers (OpenAI/Groq/Ollama)
- Use real MongoDB API
- Use real GraphQL server
- Mock expensive services (Neo4j, Pinecone)
- Run in 2-5 minutes

**Coverage**:
- Agent integration (102 tests)
- GraphQL API (62 tests)
- LLM providers (12 tests)
- Memory systems (15+ tests)
- Workflow execution (10+ tests)

**Example**:
```bash
yarn test:integration
# Runs in ~3 minutes
```

### 3. Agent Tester (Future)

**Purpose**: Systematic end-to-end validation through user scenarios

**Characteristics**:
- 200+ realistic scenarios
- Performance benchmarking
- Cost tracking
- Regression detection
- Runs in < 10 minutes

See [Agent Tester Documentation](./agent-tester.md) for details.

## Running Tests

### Quick Commands

```bash
# All unit tests (fast)
yarn test

# All integration tests (slower, requires services)
yarn test:integration

# GraphQL tests only
npx jest src/tests/graphql

# Specific agent tests
npx jest src/tests/agents/planner.test.ts

# With coverage report
yarn test:coverage

# Watch mode for development
yarn test:watch
```

### Test Files Location

```
src/tests/
├── agents/              # Agent unit tests (78)
│   ├── planner.test.ts
│   ├── executor.test.ts
│   ├── analyzer.test.ts
│   ├── summarizer.test.ts
│   └── orchestrator.test.ts
│
├── graphql/             # GraphQL tests (62)
│   ├── server.integration.test.ts
│   ├── query-resolvers.test.ts
│   ├── mutation-resolvers.test.ts
│   └── subscription-resolvers.test.ts
│
├── integration/         # Integration tests (100+)
│   ├── agents/          # Agent integration (102)
│   ├── llm/             # LLM providers (12)
│   ├── memory/          # Memory systems (15+)
│   └── workflow/        # Workflows (10+)
│
└── shared/              # Shared library (724)
    ├── context/
    ├── conversation/
    ├── llm/
    ├── memory/
    └── ...
```

## Test Quality Metrics

### Pass Rates

- **Shared Library**: 100% (724/724)
- **Agent Unit Tests**: 100% (78/78)
- **Agent Integration**: 100% (102/102)
- **GraphQL Tests**: 97% (60/62)
- **Overall**: 97% (940/960+)

### Coverage

- **Statement Coverage**: 93.2%
- **Branch Coverage**: 84.7%
- **Function Coverage**: 95.8%
- **Line Coverage**: 93.2%

### Performance

- **Unit Test Suite**: < 20 seconds
- **Integration Suite**: ~3 minutes
- **GraphQL Suite**: ~2 seconds
- **Total**: < 5 minutes

## Testing Best Practices

### For Unit Tests

1. **Mock Everything** - No real external calls
2. **Fast** - Each test < 100ms
3. **Isolated** - No shared state
4. **Deterministic** - Same input = same output

### For Integration Tests

1. **Real Services** - Use actual LLM, API when possible
2. **Clean State** - Reset database between tests
3. **Longer Timeouts** - 30-60 seconds for LLM calls
4. **Flexible Assertions** - Account for LLM non-determinism

### For GraphQL Tests

1. **Server Testing** - Test via HTTP like a real client
2. **Resolver Testing** - Test resolver logic directly
3. **Subscription Testing** - Test real-time updates
4. **Mocked Dependencies** - Mock orchestrator and memory

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:8
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn build
      - run: yarn api:dev &
      - run: yarn test:integration
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Next Steps

- **[Test Coverage](./coverage.md)** - Detailed coverage breakdown
- **[Agent Tester](./agent-tester.md)** - Future scenario-based testing
- **[Agents Testing Guide](../agents/testing.md)** - Agent-specific test examples
- **[Development Guide](../guides/development.md)** - Writing new tests

## Related Documentation

- [Agent Testing Guide](../agents/testing.md) - Detailed agent test examples
- [Development Guide](../guides/development.md) - How to write tests
- [GraphQL API](../agents/graphql-api.md) - GraphQL endpoint documentation

