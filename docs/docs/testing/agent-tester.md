---
sidebar_position: 2
---

# Agent Tester (Blueprint)

The Agent Tester is a comprehensive testing and validation framework designed to systematically test the Clear AI v2 agent system through realistic user scenarios.

## Overview

### What is the Agent Tester?

A standalone tool that:
- 🎯 Tests the entire agent pipeline end-to-end via GraphQL
- 📊 Validates results against expected behavior
- 📈 Tracks performance, costs, and quality metrics
- 🐛 Detects regressions before they reach production
- 🤖 Generates realistic test scenarios automatically
- 📝 Produces actionable reports and dashboards

### Why Build This?

Before deploying to production or building client applications, we need confidence that:
1. The system works correctly for diverse queries
2. Performance is acceptable under load
3. Costs are predictable and within budget
4. Edge cases are handled gracefully
5. Regressions are caught automatically

### Status

**Current Phase**: Blueprint Design Complete ✅  
**Next Phase**: Phase 1 Implementation (4-week roadmap)  
**Location**: `research/agent-tester/` (13 blueprint files)

## Key Features

### Comprehensive Testing

- **Simple Queries** - Single-tool functionality
- **Complex Queries** - Multi-tool coordination
- **Edge Cases** - Errors, timeouts, invalid data
- **Performance Tests** - Concurrent requests, load testing
- **Memory Tests** - Context loading, follow-up questions

### Rich Validation

- **Schema Validation** - Structure correctness
- **Data Validation** - Content accuracy
- **Performance Validation** - Latency and token usage
- **Semantic Validation** - Meaning correctness using LLM
- **Business Rule Validation** - Domain logic compliance

### Deep Metrics

- **Performance**: End-to-end latency breakdown, agent timing
- **Cost**: Token usage, LLM costs, total spend
- **Quality**: Tool selection accuracy, analysis relevance
- **Health**: Success rates, error rates, retry counts

### Automated Regression Detection

- Baseline comparison
- Performance degradation alerts
- Accuracy regression detection
- Cost increase warnings
- Automated CI/CD blocking

## Example Test Scenario

```yaml
id: simple-query-001
name: "List recent shipments"
category: simple
description: "Test basic shipment listing with time filter"

query: "Get shipments from last week"

expectedBehavior:
  toolsUsed: ["shipments"]
  minResults: 1
  responseContains: ["shipment", "week"]
  maxLatencyMs: 5000
  maxTokens: 500

validation:
  - type: tool_selection
    expected: ["shipments"]
  
  - type: data_structure
    schema: shipment_list
  
  - type: semantic
    check: "Response mentions timeframe"
  
  - type: performance
    maxLatencyMs: 5000
    maxTokens: 500
```

## Blueprint Documentation

Complete blueprints are available in `research/agent-tester/`:

### Core Documents

1. **[README.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/README.md)** - Quick start and navigation
2. **[00-overview.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/00-overview.md)** - Purpose, goals, success criteria
3. **[01-architecture.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/01-architecture.md)** - System design and components

### Testing Framework

4. **[02-test-scenarios.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/02-test-scenarios.md)** - Scenario structure and format
5. **[03-scenario-generator.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/03-scenario-generator.md)** - Dynamic test generation
6. **[04-graphql-client.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/04-graphql-client.md)** - GraphQL integration
7. **[05-validation-engine.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/05-validation-engine.md)** - Result validation

### Observability

8. **[06-metrics-tracking.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/06-metrics-tracking.md)** - Metrics collection
9. **[07-reporting.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/07-reporting.md)** - Reports and dashboards

### Implementation

10. **[08-data-management.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/08-data-management.md)** - Test data handling
11. **[09-implementation-phases.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/09-implementation-phases.md)** - 4-week roadmap
12. **[10-usage-examples.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/10-usage-examples.md)** - Practical examples

### Future

13. **[11-training-integration.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/11-training-integration.md)** - Model training integration

## Implementation Roadmap

### Phase 1: Core Framework (Week 1)

**Deliverables**:
- Basic GraphQL client
- Scenario runner
- Simple validation
- Console output
- 15 test scenarios

**Success Criteria**: Can run 15 scenarios successfully

### Phase 2: Scenario Library (Week 2)

**Deliverables**:
- 50 comprehensive scenarios
- Advanced validation (schema, semantic, performance)
- Metrics collection (SQLite storage)
- HTML report generation

**Success Criteria**: 50+ scenarios passing with metrics

### Phase 3: Advanced Features (Week 3)

**Deliverables**:
- Dynamic scenario generation (template, combinatorial, LLM-based)
- Performance testing (100+ concurrent requests)
- WebSocket subscription tracking
- Optional dashboard UI

**Success Criteria**: 150+ scenarios, load testing works

### Phase 4: Production Ready (Week 4)

**Deliverables**:
- CI/CD integration (GitHub Actions)
- Regression detection
- Historical tracking
- Complete documentation

**Success Criteria**: Runs in CI/CD, blocks regressions

## Key Capabilities

### Scenario Generation

Generate test scenarios using:
- **Templates** - Fill variable parameters
- **Combinatorial** - Test all tool/filter combinations
- **Fuzz Testing** - Random/invalid inputs
- **LLM-Based** - Generate realistic queries
- **Adversarial** - Intentionally difficult queries
- **Data-Driven** - Based on actual usage patterns

### Validation Strategies

**5 Validation Types**:
1. **Tool Selection** - Correct tools chosen
2. **Data Structure** - Response format correct
3. **Semantic** - Meaning is accurate (LLM-based)
4. **Performance** - Meets latency/token budgets
5. **Business Rules** - Domain logic satisfied

Each validation produces a confidence score (0.0 - 1.0).

### Metrics Tracked

**Performance Metrics**:
- End-to-end latency
- Agent breakdown (planner, executor, analyzer, summarizer)
- Tool execution time
- Memory query time

**Cost Metrics**:
- Token usage (prompt + completion)
- LLM API costs
- Per-query costs
- Total run costs

**Quality Metrics**:
- Tool selection accuracy
- Analysis relevance
- Response helpfulness
- Validation confidence

**Health Metrics**:
- Success rate
- Error rate
- Timeout rate
- Retry count

### Reporting

**Real-Time Console**:
```
Running test suite: comprehensive-v1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45/100 (45%)

✓ simple-001: List shipments (1.2s, $0.01, 95%)
✓ simple-002: Search facilities (0.9s, $0.01, 98%)
✗ complex-001: Contamination analysis (5.2s, $0.05, 45%)
  └─ Tool selection incorrect

Current: 43 passed, 2 failed, 55 pending
```

**Summary Reports**:
- JSON export for automation
- HTML dashboard for visualization
- PDF for sharing with stakeholders
- Comparison with baseline

**Regression Detection**:
- Automatic baseline comparison
- Alert on performance degradation
- Flag cost increases
- Block CI/CD on critical failures

## When to Use

### Use Agent Tester for:

✅ **System Validation** - Verify full pipeline works  
✅ **Performance Benchmarking** - Measure latency and costs  
✅ **Regression Testing** - Catch breaking changes  
✅ **Load Testing** - Test concurrent request handling  
✅ **Pre-Deployment** - Validate before production  
✅ **Demonstrating Capabilities** - Show what system can do

### Don't Use for:

❌ **Unit Testing** - Use Jest unit tests instead  
❌ **Debugging** - Use integration tests or manual testing  
❌ **Development** - Too slow for rapid iteration  
❌ **Component Testing** - Use integration tests

## Comparison with Current Tests

| Aspect | Unit Tests | Integration Tests | Agent Tester |
|--------|------------|-------------------|--------------|
| **Speed** | Fast (< 1s) | Medium (1-10s) | Slower (2-5s per test) |
| **Scope** | Single function | Multiple modules | Full system |
| **Dependencies** | All mocked | Some real | All real (via GraphQL) |
| **Purpose** | Business logic | Module interaction | User experience |
| **Count** | 802 | 160+ | 200+ (future) |
| **When** | Every commit | Pre-commit | Pre-deployment |

## Future: Training Integration

The Agent Tester will eventually support:

- **Training Data Collection** - Gather query/response pairs
- **Performance Tracking** - Monitor model improvement over time
- **A/B Testing** - Compare different models/configurations
- **Fine-Tuning Pipeline** - Prepare data for model fine-tuning
- **Continuous Learning** - Automated model improvement

See [training-integration.md](https://github.com/your-repo/clear-ai-v2/tree/main/research/agent-tester/11-training-integration.md) blueprint for details.

## Getting Started

### Read the Blueprints

1. Start with **README.md** in `research/agent-tester/`
2. Read **00-overview.md** for the big picture
3. Review **01-architecture.md** for technical design
4. Check **09-implementation-phases.md** for the roadmap

### Implementation

Once blueprints are approved:
1. Follow the 4-phase implementation plan
2. Start with Phase 1 (core framework)
3. Iterate based on feedback
4. Deploy to CI/CD in Phase 4

## Success Criteria

The Agent Tester is successful when:

- ✅ 200+ scenarios running in < 10 minutes
- ✅ Catches regressions before production
- ✅ Provides actionable failure reports
- ✅ Integrated into CI/CD pipeline
- ✅ Used daily by development team
- ✅ Blocks broken builds automatically

## Related Documentation

- [Testing Overview](./overview.md) - Testing strategy
- [Test Coverage](./coverage.md) - Complete coverage breakdown
- [Agent Testing](../agents/testing.md) - Agent-specific tests
- [Development Guide](../guides/development.md) - Contributing tests

