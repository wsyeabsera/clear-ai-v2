---
sidebar_position: 4
---

# Progress Tracking

Progress Tracking enables transparent, real-time updates for multi-step tasks. Instead of leaving users wondering what's happening, show them exactly which step is running and how much longer it might take.

## What Problem Does This Solve?

**The Problem:** Long-running tasks leave users in the dark:
```typescript
// User sees nothing for 30 seconds...
const result = await complexAnalysis();
// Finally: "Done!"
```

**The Solution:** Show progress at each step:
```
Step 1/5: Fetching shipments...
Step 2/5: Analyzing patterns... (40%)
Step 3/5: Calculating metrics... (60%)
Step 4/5: Generating insights... (80%)
Step 5/5: Formatting results... (100%)
Done!
```

## Basic Usage

```typescript
import { ProgressTracker } from 'clear-ai-v2/shared';

const tracker = new ProgressTracker();

// Start tracking a task
tracker.startTask('analysis_1', 5);  // 5 total steps

// Update progress
tracker.updateStep('analysis_1', 1, 'Fetching data');
// ... do work

tracker.updateStep('analysis_1', 2, 'Analyzing');
// ... do work

tracker.updateStep('analysis_1', 3, 'Calculating');
// ... do work

// Complete
tracker.complete('analysis_1');

// Get progress at any time
const progress = tracker.getProgress('analysis_1');
// {
//   taskId: 'analysis_1',
//   currentStep: 5,
//   totalSteps: 5,
//   stepName: 'Formatting results',
//   percentComplete: 100,
//   status: 'completed',
//   startTime: '2024-10-11T12:00:00.000Z',
//   completedAt: '2024-10-11T12:00:15.523Z'
// }
```

## Task Statuses

Tasks can be in one of three states:

### 1. `in_progress`

Task is currently running.

```typescript
tracker.startTask('task_1', 3);
const progress = tracker.getProgress('task_1');
// status: 'in_progress'
```

### 2. `completed`

Task finished successfully.

```typescript
tracker.complete('task_1');
const progress = tracker.getProgress('task_1');
// status: 'completed'
// completedAt: '2024-10-11T12:00:15.523Z'
```

### 3. `failed`

Task encountered an error.

```typescript
try {
  // ... some work
} catch (error) {
  tracker.fail('task_1', error.message);
}

const progress = tracker.getProgress('task_1');
// status: 'failed'
// error: 'Connection timeout'
```

## Time Estimation

Estimate how much longer a task will take:

```typescript
// Start task
tracker.startTask('analysis_1', 10);

// After a few steps
tracker.updateStep('analysis_1', 3, 'Processing');
// ... wait some time
tracker.updateStep('analysis_1', 5, 'Analyzing');

// Estimate remaining time
const remainingMs = tracker.estimateTimeRemaining('analysis_1');
// Returns: ~6000 (6 seconds)
// Based on: average time per step × remaining steps
```

**How it works:**
1. Tracks when each step starts
2. Calculates average time per step
3. Multiplies by remaining steps

**Accuracy:** Improves as more steps complete.

## Managing Multiple Tasks

Track multiple concurrent tasks:

```typescript
// Start multiple tasks
tracker.startTask('user_123_query', 3);
tracker.startTask('user_456_query', 5);
tracker.startTask('background_job', 10);

// Get all tasks
const allTasks = tracker.getAllTasks();
// Returns array of all task progress objects

// Check specific task
const userTask = tracker.getProgress('user_123_query');
```

## Clearing Tasks

Remove completed tasks from tracking:

```typescript
// Clear specific task
tracker.clearTask('analysis_1');

// Clear all completed tasks
tracker.clearCompleted();
```

## Integration with Response System

Combine with `ResponseBuilder` for user-facing progress:

```typescript
import { ResponseBuilder, ProgressTracker } from 'clear-ai-v2/shared';

async function* analyzeData(query: string) {
  const tracker = new ProgressTracker();
  tracker.startTask('analysis_1', 4);
  
  // Step 1
  tracker.updateStep('analysis_1', 1, 'Fetching data');
  yield ResponseBuilder.progress(1, 4, 'Fetching data');
  
  const data = await fetchData(query);
  
  // Step 2
  tracker.updateStep('analysis_1', 2, 'Analyzing patterns');
  yield ResponseBuilder.progress(2, 4, 'Analyzing patterns');
  
  const patterns = await analyzePatterns(data);
  
  // Step 3
  tracker.updateStep('analysis_1', 3, 'Calculating metrics');
  yield ResponseBuilder.progress(3, 4, 'Calculating metrics');
  
  const metrics = calculateMetrics(patterns);
  
  // Step 4
  tracker.updateStep('analysis_1', 4, 'Formatting results');
  yield ResponseBuilder.progress(4, 4, 'Formatting results');
  
  const report = formatReport(metrics);
  
  tracker.complete('analysis_1');
  
  // Final result
  yield ResponseBuilder.answer('Analysis complete', report);
}

// Usage
for await (const update of analyzeData('contaminated shipments')) {
  console.log(update.content);
  // Output:
  // "Progress: 1/4 (25%) - Fetching data"
  // "Progress: 2/4 (50%) - Analyzing patterns"
  // "Progress: 3/4 (75%) - Calculating metrics"
  // "Progress: 4/4 (100%) - Formatting results"
  // "Analysis complete"
}
```

## Real-World Example

Complete multi-step workflow with error handling:

```typescript
async function* processShipments(filters: any) {
  const tracker = new ProgressTracker();
  const taskId = `process_${Date.now()}`;
  
  try {
    tracker.startTask(taskId, 5);
    
    // Step 1: Validate
    tracker.updateStep(taskId, 1, 'Validating filters');
    yield ResponseBuilder.progress(1, 5, 'Validating filters');
    
    if (!isValid(filters)) {
      throw new Error('Invalid filters');
    }
    
    // Step 2: Fetch
    tracker.updateStep(taskId, 2, 'Fetching shipments');
    yield ResponseBuilder.progress(2, 5, 'Fetching shipments');
    
    const shipments = await fetchShipments(filters);
    
    // Step 3: Enrich
    tracker.updateStep(taskId, 3, 'Enriching data');
    yield ResponseBuilder.progress(3, 5, 'Enriching data');
    
    const enriched = await enrichData(shipments);
    
    // Step 4: Analyze
    tracker.updateStep(taskId, 4, 'Analyzing');
    yield ResponseBuilder.progress(4, 5, 'Analyzing');
    
    const analysis = analyzeShipments(enriched);
    
    // Step 5: Generate report
    tracker.updateStep(taskId, 5, 'Generating report');
    yield ResponseBuilder.progress(5, 5, 'Generating report');
    
    const report = generateReport(analysis);
    
    tracker.complete(taskId);
    
    yield ResponseBuilder.answer(
      `Processed ${shipments.length} shipments`,
      report
    );
    
  } catch (error) {
    tracker.fail(taskId, error.message);
    
    yield ResponseBuilder.answer(
      `Processing failed: ${error.message}`,
      { error: true, taskId }
    );
  } finally {
    // Clean up after 1 minute
    setTimeout(() => tracker.clearTask(taskId), 60000);
  }
}
```

## Testing

The Progress Tracker has 16 unit tests covering:
- Task lifecycle (start, update, complete, fail)
- Time estimation
- Multiple concurrent tasks
- Task clearing
- Edge cases

```bash
yarn test --testNamePattern="ProgressTracker"
```

## Best Practices

### 1. Provide Meaningful Step Names

```typescript
// ❌ Don't use generic names
tracker.updateStep('task_1', 1, 'Step 1');

// ✅ Use descriptive names
tracker.updateStep('task_1', 1, 'Fetching shipments from database');
```

### 2. Show Progress for Long Tasks

```typescript
// ❌ Don't hide long-running operations
const result = await longOperation();

// ✅ Show progress
tracker.startTask('task_1', 3);

tracker.updateStep('task_1', 1, 'Starting...');
yield ResponseBuilder.progress(1, 3, 'Starting...');

await step1();

tracker.updateStep('task_1', 2, 'Processing...');
yield ResponseBuilder.progress(2, 3, 'Processing...');
```

### 3. Handle Errors Properly

```typescript
try {
  // ... work
  tracker.complete('task_1');
} catch (error) {
  tracker.fail('task_1', error.message);
  // Return error response
}
```

### 4. Clean Up Old Tasks

```typescript
// After task completes, clean up
tracker.complete('task_1');

// Clear after delay
setTimeout(() => {
  tracker.clearTask('task_1');
}, 60000);  // 1 minute
```

## Type Definitions

```typescript
type TaskStatus = 
  | 'in_progress'
  | 'completed'
  | 'failed';

interface TaskProgress {
  taskId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  percentComplete: number;
  status: TaskStatus;
  startTime: string;          // ISO timestamp
  completedAt?: string;       // ISO timestamp
  error?: string;             // Error message if failed
  stepTimestamps: string[];   // Timestamp for each step
}
```

## API Reference

### `tracker.startTask(taskId, totalSteps)`

Begin tracking a new task.

**Parameters:**
- `taskId` (string): Unique identifier for the task
- `totalSteps` (number): Total number of steps

**Returns:** `void`

### `tracker.updateStep(taskId, stepIndex, stepName)`

Update current step.

**Parameters:**
- `taskId` (string): Task identifier
- `stepIndex` (number): Current step number (1-based)
- `stepName` (string): Name/description of step

**Returns:** `void`

**Throws:** Error if task not found

### `tracker.complete(taskId)`

Mark task as completed.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** `void`

### `tracker.fail(taskId, error)`

Mark task as failed.

**Parameters:**
- `taskId` (string): Task identifier
- `error` (string): Error message

**Returns:** `void`

### `tracker.getProgress(taskId)`

Get current progress for a task.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** `TaskProgress | null`

### `tracker.estimateTimeRemaining(taskId)`

Estimate remaining time in milliseconds.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** `number` (milliseconds)

**Note:** Returns 0 if task not started, completed, or failed

### `tracker.getAllTasks()`

Get all tracked tasks.

**Returns:** `TaskProgress[]`

### `tracker.clearTask(taskId)`

Remove task from tracking.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** `void`

### `tracker.clearCompleted()`

Remove all completed tasks.

**Returns:** `void`

---

**Next:** [Conversation Utilities](./conversation-utilities.md) - Entity extraction and helpers

