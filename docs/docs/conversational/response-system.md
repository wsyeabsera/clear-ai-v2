---
sidebar_position: 1
---

# Response System

The Response System provides structured, type-safe responses for different conversational scenarios. Instead of plain text, your AI returns rich response objects that tell the user what kind of message it is and how to handle it.

## What Problem Does This Solve?

**Traditional approach** - Everything is just text:
```typescript
return "Found 10 shipments";  // Is this final? Need more info? In progress?
```

**Clear AI v2 approach** - Structured responses:
```typescript
return ResponseBuilder.answer("Found 10 shipments", data);
// Type: 'answer', has data, doesn't need user input
```

## Response Types

### 1. Answer

Direct response with optional data.

```typescript
const response = ResponseBuilder.answer(
  "Found 23 contaminated shipments from this week",
  { 
    shipments: [...], 
    total: 23,
    timeframe: 'this week'
  }
);

// Result:
{
  type: 'answer',
  content: "Found 23 contaminated shipments from this week",
  data: { shipments: [...], total: 23, timeframe: 'this week' },
  requiresInput: false
}
```

**When to use**: When you have a definitive answer to give.

### 2. Question

Ask the user for clarification.

```typescript
const response = ResponseBuilder.question(
  "Which time period would you like to see?",
  ["today", "this week", "this month", "all time"]
);

// Result:
{
  type: 'question',
  content: "Which time period would you like to see?",
  options: ["today", "this week", "this month", "all time"],
  requiresInput: true
}
```

**When to use**: When the user's request is ambiguous or missing information.

### 3. Progress

Show progress through a multi-step task.

```typescript
const response = ResponseBuilder.progress(3, 5, "Analyzing contamination patterns");

// Result:
{
  type: 'progress',
  content: "Progress: 3/5 (60%) - Analyzing contamination patterns",
  progress: {
    currentStep: 3,
    totalSteps: 5,
    stepName: "Analyzing contamination patterns",
    percentComplete: 60
  },
  requiresInput: false
}
```

**When to use**: For tasks that take more than a few seconds.

### 4. Acknowledgment

Simple confirmation that you've received the user's message.

```typescript
const response = ResponseBuilder.acknowledge("Got it, analyzing now...");

// Result:
{
  type: 'acknowledgment',
  content: "Got it, analyzing now...",
  requiresInput: false
}
```

**When to use**: To acknowledge a command before starting work.

## Adding Confidence

Express uncertainty when confidence is low:

```typescript
const response = ResponseBuilder.answer(
  "Upward trend detected in contamination rates",
  { trend: 'up', confidence: 0.65 }
);

const withConfidence = ResponseBuilder.withConfidence(response, 0.65);

// Result adds disclaimer:
{
  type: 'answer',
  content: "Upward trend detected in contamination rates\n\n⚠️ Note: I'm not completely certain about this result (confidence: 65%).",
  confidence: 0.65,
  data: { trend: 'up', confidence: 0.65 },
  requiresInput: false
}
```

**Threshold**: Disclaimers are added when confidence < 0.7 (70%).

## Helper Methods

### Format with Data Summary

```typescript
const response = ResponseBuilder.answer(
  "Found shipments",
  { shipments: Array(15).fill({}), total: 15 }
);

const formatted = ResponseBuilder.formatWithData(response);

// Returns:
// "Found shipments
//
// Results: 15 items"
```

### Check if Awaiting Input

```typescript
const question = ResponseBuilder.question("Choose one", ["A", "B"]);
const answer = ResponseBuilder.answer("Here's your answer");

ResponseBuilder.isAwaitingUserInput(question);  // true
ResponseBuilder.isAwaitingUserInput(answer);    // false
```

## Real-World Example

Here's a complete conversational flow:

```typescript
async function handleUserQuery(message: string, context: any) {
  // Check if ambiguous
  const timeframe = extractTimeframe(message);
  
  if (!timeframe) {
    // Ask for clarification
    return ResponseBuilder.question(
      "Which time period?",
      ["today", "this week", "this month"]
    );
  }
  
  // Start multi-step process
  const tracker = new ProgressTracker();
  tracker.startTask('query_1', 3);
  
  // Step 1
  tracker.updateStep('query_1', 1, 'Fetching data');
  yield ResponseBuilder.progress(1, 3, 'Fetching data');
  
  const data = await fetchData(timeframe);
  
  // Step 2
  tracker.updateStep('query_1', 2, 'Analyzing');
  yield ResponseBuilder.progress(2, 3, 'Analyzing');
  
  const analysis = analyzeData(data);
  
  // Step 3
  tracker.updateStep('query_1', 3, 'Formatting results');
  yield ResponseBuilder.progress(3, 3, 'Formatting results');
  
  tracker.complete('query_1');
  
  // Calculate confidence
  const scorer = new ConfidenceScorer();
  const confidence = scorer.scoreFromDataCount(data.length, 100);
  
  // Return final answer with confidence
  return ResponseBuilder.withConfidence(
    ResponseBuilder.answer(
      `Found ${data.length} records`,
      { records: data, timeframe }
    ),
    confidence
  );
}
```

## Type Definitions

```typescript
type ResponseType =
  | 'answer'          // Direct answer with data
  | 'question'        // Need clarification
  | 'progress'        // Multi-step progress
  | 'acknowledgment'; // Simple acknowledgment

interface ProgressInfo {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  percentComplete: number;
}

interface AgentResponse {
  type: ResponseType;
  content: string;
  data?: any;
  confidence?: number;
  options?: string[];
  progress?: ProgressInfo;
  requiresInput?: boolean;
  metadata?: Record<string, any>;
}
```

## Best Practices

### 1. Use the Right Response Type

```typescript
// ❌ Don't use answer for everything
ResponseBuilder.answer("I need more information");

// ✅ Use question when you need input
ResponseBuilder.question("Which facility?", ["A", "B", "C"]);
```

### 2. Show Progress for Slow Operations

```typescript
// ❌ Don't leave users waiting
const result = await longRunningTask();

// ✅ Show progress
yield ResponseBuilder.progress(1, 3, "Starting...");
const result = await longRunningTask();
yield ResponseBuilder.progress(2, 3, "Almost done...");
```

### 3. Express Uncertainty When Appropriate

```typescript
// ❌ Don't be overconfident with limited data
ResponseBuilder.answer("Trend is definitely upward");

// ✅ Express uncertainty
ResponseBuilder.withConfidence(
  ResponseBuilder.answer("Trend appears upward"),
  0.60  // Low confidence adds disclaimer
);
```

### 4. Include Relevant Data

```typescript
// ❌ Don't just return text
ResponseBuilder.answer("Found 10 shipments");

// ✅ Include the actual data
ResponseBuilder.answer(
  "Found 10 shipments",
  { shipments, total: 10, filters: appliedFilters }
);
```

## Testing

The Response System has 14 unit tests covering:
- All response type creation
- Confidence disclaimers
- Data formatting
- Input detection
- Edge cases

```bash
yarn test --testNamePattern="ResponseBuilder"
```

## Related Modules

- [**Intent Classification**](./intent-classification.md) - Understand what response type is needed
- [**Confidence Scoring**](./confidence-scoring.md) - Calculate confidence values
- [**Progress Tracking**](./progress-tracking.md) - Track multi-step tasks
- [**Conversation Utilities**](./conversation-utilities.md) - Extract entities for responses

## API Reference

### `ResponseBuilder.answer(content, data?, confidence?)`

Create an answer response.

**Parameters:**
- `content` (string): The answer text
- `data?` (any): Optional data to include
- `confidence?` (number): Optional confidence score (0-1)

**Returns:** `AgentResponse`

### `ResponseBuilder.question(content, options?)`

Create a question response.

**Parameters:**
- `content` (string): The question text
- `options?` (string[]): Optional list of choices

**Returns:** `AgentResponse`

### `ResponseBuilder.progress(current, total, stepName)`

Create a progress response.

**Parameters:**
- `current` (number): Current step number
- `total` (number): Total number of steps
- `stepName` (string): Name of current step

**Returns:** `AgentResponse`

### `ResponseBuilder.acknowledge(message?)`

Create an acknowledgment response.

**Parameters:**
- `message?` (string): Optional custom message (default: "✓ Understood, working on it")

**Returns:** `AgentResponse`

### `ResponseBuilder.withConfidence(response, confidence)`

Add confidence score to any response.

**Parameters:**
- `response` (AgentResponse): The response to enhance
- `confidence` (number): Confidence score 0-1

**Returns:** `AgentResponse`

**Note:** Adds uncertainty disclaimer if `confidence < 0.7`

### `ResponseBuilder.formatWithData(response)`

Format response with data summary.

**Parameters:**
- `response` (AgentResponse): The response to format

**Returns:** `string`

### `ResponseBuilder.isAwaitingUserInput(response)`

Check if response requires user input.

**Parameters:**
- `response` (AgentResponse): The response to check

**Returns:** `boolean`

---

**Next:** [Intent Classification](./intent-classification.md) - Understand user intent

