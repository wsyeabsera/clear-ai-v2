# Agent Tester - Test Scenarios

## Overview

Test scenarios are the heart of the Agent Tester. Each scenario defines a specific test case: a query to execute, expected behavior, and validation rules. This document defines the scenario structure, categories, and format.

## Scenario Structure

### Complete Scenario Format

```yaml
# Unique identifier
id: simple-query-001

# Human-readable name
name: "List recent shipments"

# Category for organization
category: simple

# Detailed description
description: |
  Tests basic shipment listing with a time-based filter.
  Verifies that the system can understand relative time expressions
  and correctly invoke the shipments tool.

# Tags for filtering
tags:
  - shipments
  - time-filter
  - basic

# Priority level
priority: critical  # critical, high, medium, low

# Test input
query: "Get shipments from last week"
userId: "test-user-001"  # Optional
context: {}  # Optional pre-loaded context

# Expected behavior
expectedBehavior:
  toolsUsed:
    - shipments
  minResults: 1
  maxResults: 100
  responseContains:
    - shipment
    - week
  responseNotContains:
    - error
    - failed
  maxLatencyMs: 5000
  maxTokens: 500
  analysisRequired: true
  entitiesExpected:
    - type: shipment
      minCount: 1

# Validation rules
validation:
  - type: tool_selection
    expected: [shipments]
    confidence: 1.0

  - type: data_structure
    schema: shipment_list
    required: true

  - type: semantic
    check: "Response mentions timeframe"
    method: llm

  - type: performance
    maxLatencyMs: 5000
    maxTokens: 500

  - type: business_rule
    rule: all_shipments_have_dates
    critical: true

# Test configuration
timeout: 30000  # ms
retries: 2
skipIf:
  - env: production
  - feature: shipments_disabled
```

### Minimum Required Fields

```yaml
id: simple-query-001
name: "List recent shipments"
category: simple
query: "Get shipments from last week"
expectedBehavior:
  toolsUsed: [shipments]
  maxLatencyMs: 5000
validation:
  - type: tool_selection
    expected: [shipments]
```

## Scenario Categories

### 1. Simple Queries

**Purpose:** Test basic, single-tool functionality

**Characteristics:**
- One tool execution
- Straightforward query
- Clear expected outcome
- Fast execution (< 3s)

**Examples:**

```yaml
# shipments-list.yml
id: simple-001
name: "List all shipments"
category: simple
query: "Show me all shipments"
expectedBehavior:
  toolsUsed: [shipments]
  minResults: 0
  maxLatencyMs: 3000
validation:
  - type: tool_selection
    expected: [shipments]
```

```yaml
# facilities-by-location.yml
id: simple-002
name: "Find facilities in Berlin"
category: simple
query: "What facilities are in Berlin?"
expectedBehavior:
  toolsUsed: [facilities]
  responseContains: [Berlin]
  maxLatencyMs: 3000
validation:
  - type: data_filter
    field: location
    contains: Berlin
```

**Coverage:**
- Each tool individually
- Basic filters
- Simple time expressions
- Location queries
- Status queries

### 2. Complex Queries

**Purpose:** Test multi-tool coordination and dependencies

**Characteristics:**
- Multiple tools
- Dependencies between steps
- Complex logic
- Longer execution (< 10s)

**Examples:**

```yaml
# contamination-analysis.yml
id: complex-001
name: "Analyze contamination patterns"
category: complex
query: "Get contaminated shipments from last month and analyze the contaminants"
expectedBehavior:
  toolsUsed: [shipments, contaminants]
  toolSequence: sequential
  minResults: 1
  maxLatencyMs: 10000
  analysisRequired: true
validation:
  - type: tool_selection
    expected: [shipments, contaminants]
  
  - type: tool_dependencies
    dependencies:
      - tool: contaminants
        dependsOn: shipments
        field: shipment_ids

  - type: analysis_quality
    minInsights: 2
    minEntities: 3
```

```yaml
# facility-capacity-check.yml
id: complex-002
name: "Check facility capacity and shipments"
category: complex
query: "Which facilities are near capacity and what shipments are they receiving?"
expectedBehavior:
  toolsUsed: [facilities, shipments]
  toolSequence: parallel
  maxLatencyMs: 8000
validation:
  - type: business_rule
    rule: capacity_calculation_correct
  
  - type: data_correlation
    correlate:
      - facilities.id
      - shipments.facility_id
```

**Coverage:**
- Multi-tool queries
- Dependent steps
- Parallel execution
- Cross-entity analysis
- Aggregations

### 3. Edge Cases

**Purpose:** Test error handling and boundary conditions

**Characteristics:**
- Invalid input
- Error conditions
- Timeout scenarios
- Missing data
- Unexpected input

**Examples:**

```yaml
# invalid-tool-request.yml
id: edge-001
name: "Request non-existent tool"
category: edge-case
query: "Get me the weather forecast"
expectedBehavior:
  toolsUsed: []
  responseContains: [cannot, help, available tools]
  maxLatencyMs: 5000
validation:
  - type: error_handling
    expectError: false
    expectGracefulResponse: true
  
  - type: semantic
    check: "Response politely declines and suggests alternatives"
```

```yaml
# timeout-handling.yml
id: edge-002
name: "Handle slow query gracefully"
category: edge-case
query: "Analyze all shipments from the past 10 years"
timeout: 60000
expectedBehavior:
  maxLatencyMs: 60000
  responseContains: [analyzing, please wait]
validation:
  - type: timeout_handling
    maxTimeout: 60000
    expectPartialResults: true
```

```yaml
# malformed-query.yml
id: edge-003
name: "Handle ambiguous query"
category: edge-case
query: "get stuff"
expectedBehavior:
  responseContains: [clarify, specify, which]
validation:
  - type: clarification_request
    expected: true
```

**Coverage:**
- Invalid queries
- Missing data
- Timeouts
- Rate limits
- Malformed input
- Ambiguous requests
- Out-of-domain queries

### 4. Performance Tests

**Purpose:** Test system under load and stress

**Characteristics:**
- Multiple concurrent requests
- Large datasets
- Resource limits
- Scalability validation

**Examples:**

```yaml
# concurrent-requests.yml
id: perf-001
name: "100 concurrent simple queries"
category: performance
concurrency: 100
query: "Get shipments"
expectedBehavior:
  maxLatencyMs: 10000  # per request
  successRate: 0.95  # 95% success rate
validation:
  - type: performance
    maxP50: 3000
    maxP95: 8000
    maxP99: 10000
  
  - type: resource_usage
    maxMemoryMB: 1000
    maxCPUPercent: 80
```

```yaml
# large-dataset-query.yml
id: perf-002
name: "Query returning large dataset"
category: performance
query: "Get all shipments and contaminants from this year"
expectedBehavior:
  minResults: 1000
  maxLatencyMs: 15000
  maxTokens: 10000
validation:
  - type: memory_efficiency
    maxMemoryPerResult: 1024  # bytes
  
  - type: streaming_support
    expectStreaming: true
```

**Coverage:**
- Concurrent execution
- Large result sets
- Complex aggregations
- Long-running queries
- Resource constraints

### 5. Memory Tests

**Purpose:** Test context loading and memory integration

**Characteristics:**
- Context-dependent queries
- Follow-up questions
- Memory retrieval
- Long conversations

**Examples:**

```yaml
# context-loading.yml
id: memory-001
name: "Load relevant context"
category: memory
query: "Analyze recent contamination trends"
context:
  previousQueries:
    - "Get contaminated shipments from last week"
    - "Which facilities received these shipments?"
expectedBehavior:
  toolsUsed: [contaminants]
  contextUsed: true
  maxLatencyMs: 8000
validation:
  - type: context_usage
    expectContextLoading: true
    contextRelevance: high
  
  - type: memory_query
    maxMemoryQueryMs: 2000
```

```yaml
# follow-up-question.yml
id: memory-002
name: "Answer follow-up with implicit context"
category: memory
conversationHistory:
  - user: "Get shipments from Berlin"
    assistant: "Found 15 shipments from Berlin..."
query: "How many were contaminated?"
expectedBehavior:
  toolsUsed: [contaminants]
  contextUsed: true
  implicitEntityResolution: true
validation:
  - type: coreference_resolution
    expect: shipments_from_berlin
```

**Coverage:**
- Context loading
- Follow-up questions
- Implicit references
- Memory retrieval
- Long conversations
- Entity tracking

## Validation Rule Types

### Tool Selection

```yaml
validation:
  - type: tool_selection
    expected: [shipments, contaminants]
    order: any  # or: sequential, parallel
    confidence: 0.9
```

### Data Structure

```yaml
validation:
  - type: data_structure
    schema: shipment_list
    required: true
    allowAdditional: false
```

### Semantic Validation

```yaml
validation:
  - type: semantic
    check: "Response accurately answers the question"
    method: llm
    model: gpt-4
    confidence: 0.8
```

### Performance

```yaml
validation:
  - type: performance
    maxLatencyMs: 5000
    maxTokens: 500
    maxMemoryQueryMs: 1000
```

### Business Rules

```yaml
validation:
  - type: business_rule
    rule: all_contaminated_shipments_flagged
    critical: true
    customValidator: validateContaminationFlag
```

### Analysis Quality

```yaml
validation:
  - type: analysis_quality
    minInsights: 2
    minEntities: 3
    minAnomalies: 0
    insightRelevance: high
```

### Error Handling

```yaml
validation:
  - type: error_handling
    expectError: false
    expectGracefulResponse: true
    errorMessage: null
```

## Scenario Organization

### Directory Structure

```
scenarios/
├── simple/
│   ├── shipments/
│   │   ├── list-all.yml
│   │   ├── by-date.yml
│   │   └── by-status.yml
│   ├── facilities/
│   │   ├── list-all.yml
│   │   ├── by-location.yml
│   │   └── by-type.yml
│   ├── contaminants/
│   └── inspections/
│
├── complex/
│   ├── contamination-analysis.yml
│   ├── facility-capacity.yml
│   └── cross-entity-queries.yml
│
├── edge-cases/
│   ├── invalid-input.yml
│   ├── missing-data.yml
│   └── timeouts.yml
│
├── performance/
│   ├── concurrent-100.yml
│   ├── concurrent-1000.yml
│   └── large-dataset.yml
│
└── memory/
    ├── context-loading.yml
    ├── follow-ups.yml
    └── long-conversation.yml
```

### Naming Conventions

**File Names:**
- Lowercase with hyphens
- Descriptive of test case
- Category-specific prefix (optional)

Examples:
- `simple-shipments-list.yml`
- `complex-contamination-analysis.yml`
- `edge-invalid-date-format.yml`

**Scenario IDs:**
- Format: `{category}-{number}`
- Sequential numbering within category
- Unique across all scenarios

Examples:
- `simple-001`, `simple-002`, ...
- `complex-001`, `complex-002`, ...
- `edge-001`, `edge-002`, ...

## Scenario Metadata

### Tags

Used for filtering and organization:

```yaml
tags:
  - shipments       # Domain entity
  - time-filter     # Feature
  - basic           # Complexity
  - smoke           # Test type
  - regression      # Purpose
```

Common tags:
- **Entities:** shipments, facilities, contaminants, inspections
- **Features:** filtering, sorting, aggregation, analysis
- **Complexity:** basic, intermediate, advanced
- **Type:** smoke, regression, integration
- **Priority:** critical, high, medium, low

### Priority Levels

```yaml
priority: critical
```

**Critical:** Must pass for system to be functional
- Core functionality
- Essential user journeys
- Safety-critical features

**High:** Important functionality
- Common use cases
- Key features
- Important integrations

**Medium:** Standard functionality
- Less common scenarios
- Nice-to-have features
- Optimization tests

**Low:** Edge cases and extras
- Rare scenarios
- Performance optimizations
- Future features

## Built-in Scenario Library

### Initial Set (Phase 1)

**Simple Queries: 20 scenarios**
- 5 per tool (shipments, facilities, contaminants, inspections)
- Basic CRUD operations
- Simple filters

**Complex Queries: 15 scenarios**
- Multi-tool coordination
- Dependent queries
- Cross-entity analysis

**Edge Cases: 10 scenarios**
- Error handling
- Invalid input
- Boundary conditions

**Performance: 5 scenarios**
- Concurrent requests (10, 50, 100)
- Large datasets
- Long-running queries

**Memory: 5 scenarios**
- Context loading
- Follow-up questions
- Entity tracking

**Total: 55 scenarios**

### Growth Strategy

- Add 10-20 scenarios per week
- Community contributions
- Real usage pattern mining
- Automated generation
- Target: 200+ scenarios in 3 months

## Custom Scenario Creation

### Writing a New Scenario

1. **Identify Test Case**
   - What are you testing?
   - What's the expected behavior?
   - What could go wrong?

2. **Choose Category**
   - Simple, complex, edge-case, performance, or memory?

3. **Write Scenario File**
   - Use template
   - Fill in all required fields
   - Add validation rules

4. **Test Scenario**
   - Run locally
   - Verify validations work
   - Check timing

5. **Document**
   - Add clear description
   - Use appropriate tags
   - Set correct priority

### Scenario Template

```yaml
id: {category}-{number}
name: "{Short descriptive name}"
category: {simple|complex|edge-case|performance|memory}
description: |
  Detailed description of what this test validates.
tags: [tag1, tag2, tag3]
priority: {critical|high|medium|low}

query: "{The actual query to test}"

expectedBehavior:
  toolsUsed: [tool1, tool2]
  maxLatencyMs: 5000

validation:
  - type: tool_selection
    expected: [tool1]
```

### Best Practices

1. **Be Specific**
   - Clear, unambiguous queries
   - Precise validation rules
   - Explicit expectations

2. **Be Realistic**
   - Real-world queries
   - Actual user language
   - Common patterns

3. **Be Comprehensive**
   - Cover happy path
   - Include edge cases
   - Test error handling

4. **Be Maintainable**
   - Clear descriptions
   - Good naming
   - Proper documentation

5. **Be Independent**
   - No scenario dependencies
   - Clean state per test
   - Isolated execution

---

**Next Document:** [03-scenario-generator.md](./03-scenario-generator.md) - Dynamic scenario generation

