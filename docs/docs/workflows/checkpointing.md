---
sidebar_position: 2
---

# Checkpointing

Checkpointing enables workflows to save their state and resume after interruptions. Critical for long-running processes, system restarts, or user confirmations that require waiting.

## What Problem Does This Solve?

**The Problem:** Long workflows lose progress on interruption:
- System crashes → start over
- User goes offline → lost state
- Confirmation needed → can't pause

**The Solution:** Save workflow state at any point:
- Resume exactly where you left off
- Handle system restarts gracefully
- Wait for user input without blocking

## Basic Usage

```typescript
import { CheckpointManager } from 'clear-ai-v2/shared';

const manager = new CheckpointManager();

// During workflow execution
const checkpoint = await manager.create('workflow_1', currentState);

// Later... system restarts
const savedState = await manager.load('workflow_1');

// Resume from checkpoint
const result = await executor.execute(graph, savedState);
```

## Complete Example

```typescript
import {
  GraphBuilder,
  WorkflowExecutor,
  CheckpointManager
} from 'clear-ai-v2/shared';

async function resumableWorkflow(workflowId: string) {
  const checkpoints = new CheckpointManager();
  const executor = new WorkflowExecutor();
  
  // Try to load existing checkpoint
  let state = await checkpoints.getMostRecent(workflowId);
  
  if (state) {
    console.log('Resuming from checkpoint...');
  } else {
    console.log('Starting new workflow...');
    state = { workflowId, userId: 'user_123', step: 0 };
  }
  
  const graph = new GraphBuilder()
    .addNode('fetch', async (s) => {
      const data = await fetchData(s.userId);
      // Save checkpoint after fetch
      await checkpoints.create(workflowId, { ...s, data, step: 1 });
      return { ...s, data, step: 1 };
    })
    .addNode('analyze', async (s) => {
      const analysis = analyzeData(s.data);
      // Save checkpoint after analysis
      await checkpoints.create(workflowId, { ...s, analysis, step: 2 });
      return { ...s, analysis, step: 2 };
    })
    .addNode('report', async (s) => {
      const report = generateReport(s.analysis);
      return { ...s, report, step: 3 };
    })
    .addEdge('fetch', 'analyze')
    .addEdge('analyze', 'report')
    .setEntryPoint(state.step === 0 ? 'fetch' : 
                   state.step === 1 ? 'analyze' : 'report')
    .build();
  
  try {
    const result = await executor.execute(graph, state);
    
    // Clear checkpoint on success
    await checkpoints.delete(workflowId);
    
    return result;
  } catch (error) {
    console.error('Workflow failed, checkpoint preserved');
    throw error;
  }
}
```

## Managing Checkpoints

### List Checkpoints

```typescript
const checkpoints = await manager.list('workflow_1');

checkpoints.forEach(cp => {
  console.log(`ID: ${cp.id}`);
  console.log(`Created: ${cp.createdAt}`);
  console.log(`Step: ${cp.state.step}`);
});
```

### Get Most Recent

```typescript
const latest = await manager.getMostRecent('workflow_1');

if (latest) {
  console.log('Can resume from step:', latest.state.step);
}
```

### Delete Old Checkpoints

```typescript
// Delete specific
await manager.delete('checkpoint_123');

// Cleanup old checkpoints (implement in your code)
const old = await manager.list('workflow_1');
for (const cp of old) {
  const age = Date.now() - new Date(cp.createdAt).getTime();
  if (age > 24 * 60 * 60 * 1000) {  // Older than 1 day
    await manager.delete(cp.id);
  }
}
```

## Testing

```bash
yarn test checkpoint/manager.test.ts
yarn test:integration workflow/execution
```

## Best Practices

### 1. Checkpoint After Expensive Operations

```typescript
.addNode('expensive_api_call', async (state) => {
  const result = await callExpensiveAPI();
  
  // Save immediately after
  await checkpoints.create(workflowId, { ...state, result });
  
  return { ...state, result };
})
```

### 2. Clean Up Completed Workflows

```typescript
// After success
await manager.delete(workflowId);

// Periodic cleanup
setInterval(async () => {
  const all = await manager.listAll();
  // Delete old/completed checkpoints
}, 3600000);  // Hourly
```

### 3. Handle Checkpoint Failures Gracefully

```typescript
try {
  await checkpoints.create(workflowId, state);
} catch (error) {
  console.warn('Checkpoint failed, continuing without');
  // Workflow continues, just without resume capability
}
```

## Related Modules

- [**Workflow Graphs**](./workflow-graphs.md) - Define workflows to checkpoint
- [**Progress Tracking**](../conversational/progress-tracking.md) - Track execution progress

---

**Next:** [Token Management](../infrastructure/token-management.md) - Control AI costs
