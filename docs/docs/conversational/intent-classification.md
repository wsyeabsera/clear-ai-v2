---
sidebar_position: 2
---

# Intent Classification

Intent Classification automatically detects what users mean when they send messages. Instead of writing complex if/else logic, the system categorizes messages into 5 intent types and extracts relevant information.

## What Problem Does This Solve?

Users don't always say exactly what they mean:
- *"Show me shipments"* vs *"What is a shipment?"* - Same word, different intent
- *"yes"* - Means confirmation, not a query
- *"What about the rejected ones?"* - Refers to previous context

Intent Classification handles all of this automatically.

## The 5 Intent Types

### 1. Query

User wants data or wants something done.

**Examples:**
- "Show me contaminated shipments"
- "Get facilities in California"
- "List pending inspections"
- "Find shipments from FacilityA"

**Characteristics:**
- Contains action verbs: show, get, list, find, fetch, display
- Requesting data or execution

### 2. Question

User is asking for information or explanation.

**Examples:**
- "What is contamination?"
- "How many facilities are there?"
- "Why was this rejected?"
- "When did this happen?"

**Characteristics:**
- Starts with question words: what, how, why, when, where
- Or ends with `?`
- Asking for knowledge, not data

### 3. Clarification

User is responding to a question the agent asked.

**Examples:**
- Agent asked: *"Which time period?"*
- User responds: *"this week"*

**Context-dependent:** Only detected when `awaitingClarification: true`

### 4. Confirmation

User is saying yes or no.

**Examples:**
- "yes", "yeah", "ok", "sure", "proceed"
- "no", "cancel", "stop", "nevermind"

**Characteristics:**
- Single word or short phrase
- Affirmative or negative

### 5. Follow-Up

User is referring to previous conversation.

**Examples:**
- "What about the rejected ones?"
- "And for FacilityB?"
- "Tell me more about them"
- "How about yesterday?"

**Characteristics:**
- Contains: "what about", "how about", "and", "also"
- Uses pronouns: them, those, these, it, that

## Basic Usage

```typescript
import { IntentClassifier } from 'clear-ai-v2/shared';

const classifier = new IntentClassifier();

// Query intent
const intent1 = classifier.classify("Show me all shipments");
// { intent: 'query', confidence: 0.85, action: 'show' }

// Question intent
const intent2 = classifier.classify("What is contamination?");
// { intent: 'question', confidence: 0.9 }

// Confirmation intent
const intent3 = classifier.classify("yes");
// { intent: 'confirmation', confidence: 0.95 }

// Follow-up intent
const intent4 = classifier.classify("What about the rejected ones?");
// { intent: 'followup', confidence: 0.85 }
```

## Context-Aware Classification

Provide conversation context for better accuracy:

```typescript
// Agent asked a question
const agentAsked = ResponseBuilder.question(
  "Which time period?",
  ["today", "this week", "this month"]
);

// User responds
const intent = classifier.classify("this week", {
  awaitingClarification: true,
  lastQuestion: "Which time period?"
});

// Result: { intent: 'clarification', confidence: 0.9 }
```

## Extracting Information

### Extract Action Verbs

```typescript
const action = classifier.extractAction("Show me facilities");
// Returns: "show"

const action2 = classifier.extractAction("Find pending shipments");
// Returns: "find"
```

**Supported verbs:** show, get, list, find, fetch, display, retrieve, give, pull, search, filter, query, analyze

### Extract Timeframes

```typescript
const timeframe = classifier.extractTimeframe("Show data from last week");
// Returns: "last week"

const timeframe2 = classifier.extractTimeframe("Today's shipments");
// Returns: "today"
```

**Supported timeframes:** today, yesterday, this week, last week, this month, last month, this year, last year

## Confirmation Detection

Check if user is confirming or denying:

```typescript
const result = classifier.isConfirmation("yes");
// Returns: 'yes'

const result2 = classifier.isConfirmation("no");
// Returns: 'no'

const result3 = classifier.isConfirmation("Show me data");
// Returns: null (not a confirmation)
```

**Affirmative words:** yes, yeah, yep, ok, okay, sure, proceed, go ahead, continue, confirm, approve

**Negative words:** no, nope, nah, cancel, stop, abort, deny, reject, nevermind

## Real-World Example

Here's a complete conversational agent:

```typescript
class ConversationalAgent {
  private classifier = new IntentClassifier();
  private context: ConversationContext = {
    awaitingClarification: false
  };
  
  async handleMessage(message: string) {
    // Classify intent
    const intent = this.classifier.classify(message, this.context);
    
    switch (intent.intent) {
      case 'query':
        // Execute query
        const timeframe = this.classifier.extractTimeframe(message);
        const action = intent.action;
        
        if (!timeframe) {
          // Need clarification
          this.context.awaitingClarification = true;
          this.context.lastQuestion = "Which time period?";
          
          return ResponseBuilder.question(
            "Which time period?",
            ["today", "this week", "this month"]
          );
        }
        
        // Execute with timeframe
        const results = await this.executeQuery(action, timeframe);
        return ResponseBuilder.answer(
          `Found ${results.length} items`,
          results
        );
      
      case 'question':
        // Answer question
        return this.answerQuestion(message);
      
      case 'clarification':
        // User answered our question
        this.context.awaitingClarification = false;
        const answer = message; // "this week"
        
        // Re-execute with clarification
        return this.executeWithClarification(answer);
      
      case 'confirmation':
        // User said yes/no
        const response = this.classifier.isConfirmation(message);
        
        if (response === 'yes') {
          return this.proceed();
        } else {
          return ResponseBuilder.acknowledge("Cancelled");
        }
      
      case 'followup':
        // Refer to previous results
        this.context.lastQuery = message;
        return this.handleFollowUp(message);
    }
  }
}
```

## Testing

The Intent Classifier has 21 unit tests covering:
- All intent types
- Action extraction
- Timeframe extraction
- Confirmation detection
- Context-aware classification
- Follow-up detection

```bash
yarn test --testNamePattern="IntentClassifier"
```

## Best Practices

### 1. Use Context

```typescript
// ❌ Don't ignore context
classifier.classify("this week");  // Might misclassify

// ✅ Provide context when available
classifier.classify("this week", {
  awaitingClarification: true,
  lastQuestion: "Which period?"
});
```

### 2. Check for Ambiguity

```typescript
const intent = classifier.classify(message);

if (intent.intent === 'query') {
  const timeframe = classifier.extractTimeframe(message);
  
  if (!timeframe) {
    // Ask for clarification
    return ResponseBuilder.question("Which time period?", [...]);
  }
}
```

### 3. Handle Follow-Ups

```typescript
if (intent.intent === 'followup') {
  // Use previous context
  const previousResults = context.lastResults;
  
  // Extract new filters from follow-up
  const entities = utils.extractBusinessEntities(message);
  
  // Apply filters to previous results
  const filtered = filterResults(previousResults, entities);
}
```

## Type Definitions

```typescript
type UserIntent =
  | 'query'           // "Show me X", "Get Y"
  | 'question'        // "What is X?", "How many Y?"
  | 'clarification'   // Answering agent's question
  | 'confirmation'    // "yes", "no", "ok"
  | 'followup';       // Referring to previous results

interface ConversationContext {
  awaitingClarification?: boolean;
  lastQuestion?: string;
  lastQuery?: string;
}

interface IntentResult {
  intent: UserIntent;
  confidence: number;
  action?: string | null;
  timeframe?: string | null;
}
```

## API Reference

### `classifier.classify(message, context?)`

Classify user message intent.

**Parameters:**
- `message` (string): User's message
- `context?` (ConversationContext): Optional conversation context

**Returns:** `IntentResult`

### `classifier.isQuery(message)`

Check if message is a query.

**Parameters:**
- `message` (string): Message to check

**Returns:** `boolean`

### `classifier.isQuestion(message)`

Check if message is a question.

**Parameters:**
- `message` (string): Message to check

**Returns:** `boolean`

### `classifier.isConfirmation(message)`

Check if message is a confirmation.

**Parameters:**
- `message` (string): Message to check

**Returns:** `'yes' | 'no' | null`

### `classifier.isFollowUp(message)`

Check if message is a follow-up.

**Parameters:**
- `message` (string): Message to check

**Returns:** `boolean`

### `classifier.extractAction(message)`

Extract action verb from message.

**Parameters:**
- `message` (string): Message to extract from

**Returns:** `string | null`

### `classifier.extractTimeframe(message)`

Extract time reference from message.

**Parameters:**
- `message` (string): Message to extract from

**Returns:** `string | null`

---

**Next:** [Confidence Scoring](./confidence-scoring.md) - Express uncertainty

