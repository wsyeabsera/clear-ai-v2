---
sidebar_position: 1
---

# Workflow Graphs

Workflow Graphs enable you to build complex, multi-step processes with conditional logic using LangGraph-style state machines. Define your workflow as a graph of nodes (steps) and edges (transitions), then execute it with automatic state management.

## What Problem Does This Solve?

**The Problem:** Complex business logic becomes unmanageable:
```typescript
// Nested if/else chains
if (step1Success) {
  if (dataValid) {
    if (confidence > 0.7) {
      // proceed
    } else {
      // ask user
    }
  } else {
    // retry or fail
  }
}
```

**The Solution:** Define logic as a visual graph:
```
Start → Fetch → Validate → Confident? 
                             ↓ No → Ask User → Re-analyze
                             ↓ Yes → Generate Report → End
```

## Basic Usage

```typescript
import { GraphBuilder, WorkflowExecutor } from 'clear-ai-v2/shared';

// Define workflow
const graph = new GraphBuilder()
  .addNode('fetch', async (state) => {
    const data = await fetchData();
    return { ...state, data };
  })
  .addNode('analyze', async (state) => {
    const analysis = analyzeData(state.data);
    return { ...state, analysis };
  })
  .addNode('report', async (state) => {
    return { ...state, report: generateReport(state.analysis) };
  })
  .addEdge('fetch', 'analyze')
  .addEdge('analyze', 'report')
  .setEntryPoint('fetch')
  .build();

// Execute
const executor = new WorkflowExecutor();
const result = await executor.execute(graph, { userId: 'user_123' });

console.log(result.report);
```

## Conditional Branching

Branch based on state:

```typescript
const graph = new GraphBuilder()
  .addNode('analyze', async (state) => {
    const confidence = calculateConfidence(state.data);
    return { ...state, confidence };
  })
  .addNode('auto_proceed', async (state) => {
    return { ...state, approved: true };
  })
  .addNode('ask_user', async (state) => {
    const response = await askUser("Confidence low. Proceed?");
    return { ...state, approved: response === 'yes' };
  })
  .addConditionalEdge('analyze', (state) => {
    return state.confidence > 0.7 ? 'auto_proceed' : 'ask_user';
  })
  .setEntryPoint('analyze')
  .build();
```

## Complete Example

```typescript
// Build analysis workflow
const analysisWorkflow = new GraphBuilder()
  // Step 1: Fetch data
  .addNode('fetch', async (state) => {
    const shipments = await tools.shipments.list({
      date_from: state.dateFrom,
      date_to: state.dateTo
    });
    return { ...state, shipments, step: 'fetch' };
  })
  
  // Step 2: Validate data
  .addNode('validate', async (state) => {
    const valid = state.shipments && state.shipments.length > 0;
    return { ...state, isValid: valid, step: 'validate' };
  })
  
  // Step 3: Analyze
  .addNode('analyze', async (state) => {
    const analysis = performAnalysis(state.shipments);
    const confidence = scoreConfidence(analysis, state.shipments.length);
    return { ...state, analysis, confidence, step: 'analyze' };
  })
  
  // Step 4a: High confidence path
  .addNode('generate_report', async (state) => {
    const report = formatReport(state.analysis);
    return { ...state, report, status: 'complete', step: 'report' };
  })
  
  // Step 4b: Low confidence path
  .addNode('ask_confirmation', async (state) => {
    // In real scenario, this would interact with user
    return { ...state, needsReview: true, step: 'confirm' };
  })
  
  // Define flow
  .addEdge('fetch', 'validate')
  .addConditionalEdge('validate', (state) => {
    return state.isValid ? 'analyze' : END;
  })
  .addConditionalEdge('analyze', (state) => {
    return state.confidence > 0.75 ? 'generate_report' : 'ask_confirmation';
  })
  .setEntryPoint('fetch')
  .build();

// Execute
const executor = new WorkflowExecutor();
const result = await executor.execute(analysisWorkflow, {
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31'
});

console.log(`Status: ${result.status}`);
console.log(`Steps executed: ${result.metadata.stepsExecuted}`);
console.log(`Execution time: ${result.metadata.executionTime}ms`);
```

## Features

### State Management

State flows through the graph automatically:

```typescript
const initial = { userId: 'user_123', query: 'data' };

// Each node receives state and returns new state
.addNode('step1', (state) => ({ ...state, step1Done: true }))
.addNode('step2', (state) => ({ ...state, step2Done: true }))

// Final state has all additions
// { userId: 'user_123', query: 'data', step1Done: true, step2Done: true }
```

### Error Handling

Workflow stops on errors, state preserved:

```typescript
try {
  const result = await executor.execute(graph, initialState);
} catch (error) {
  console.log(error.state);  // State at failure point
  console.log(error.node);   // Which node failed
  // Can resume from checkpoint
}
```

### Metadata Tracking

Execution metadata automatically tracked:

```typescript
const result = await executor.execute(graph, initialState);

console.log(result.metadata);
// {
//   executionTime: 1523,
//   stepsExecuted: 5,
//   startTime: '2024-10-11T12:00:00.000Z',
//   endTime: '2024-10-11T12:00:01.523Z',
//   success: true
// }
```

## Testing

Workflow graphs have 35 comprehensive tests:

```bash
yarn test builder.test.ts    # GraphBuilder tests
yarn test executor.test.ts   # WorkflowExecutor tests

yarn test:integration workflow  # End-to-end tests
```

## Best Practices

### 1. Keep Nodes Small and Focused

```typescript
// ❌ Don't create monolithic nodes
.addNode('do_everything', async (state) => {
  const data = await fetch();
  const analyzed = analyze(data);
  const report = format(analyzed);
  return { ...state, report };
})

// ✅ Break into focused steps
.addNode('fetch', async (state) => {...})
.addNode('analyze', async (state) => {...})
.addNode('format', async (state) => {...})
```

### 2. Use Meaningful Node Names

```typescript
// ❌ Generic names
.addNode('step1', ...)
.addNode('step2', ...)

// ✅ Descriptive names
.addNode('fetch_shipments', ...)
.addNode('analyze_contamination', ...)
```

### 3. Always Set Entry Point

```typescript
// ❌ Forget entry point
const graph = new GraphBuilder()
  .addNode(...)
  .build();  // ERROR: No entry point!

// ✅ Set entry point
const graph = new GraphBuilder()
  .addNode('start', ...)
  .setEntryPoint('start')
  .build();
```

## Related Modules

- [**Checkpointing**](./checkpointing.md) - Save/resume workflow state
- [**Progress Tracking**](../conversational/progress-tracking.md) - Show workflow progress
- [**Context Management**](../context-memory/context-management.md) - Manage conversation in workflows

---

**Next:** [Checkpointing](./checkpointing.md) - Save and resume workflows
