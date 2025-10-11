---
sidebar_position: 1
---

# Context Management

Context Management handles conversation history efficiently, ensuring long conversations don't exceed token limits while preserving important information. It automatically compresses old messages when needed and tracks token usage in real-time.

## What Problem Does This Solve?

**The Problem:** AI models have limited context windows (e.g., 4,000-128,000 tokens). Long conversations quickly fill up:
- 20-message conversation = ~3,000 tokens
- Add system prompts, user data = ~5,000 tokens  
- Model response needs ~1,000 tokens
- **Result:** Context limit exceeded, conversation breaks

**The Solution:** Clear AI v2 automatically:
- Tracks token usage per message
- Compresses old messages when limit approaches
- Preserves recent messages and important context
- Saves 70-80% of tokens through smart compression

## Core Components

### 1. ContextManager

Main interface for managing conversation context.

```typescript
import { ContextManager } from 'clear-ai-v2/shared';

const manager = new ContextManager({
  maxTokens: 4000,
  model: 'gpt-3.5-turbo'
});

// Add message
await manager.addMessage({
  role: 'user',
  content: 'Show me shipments'
});

// Get formatted for LLM
const messages = manager.getFormattedMessages();

// Check if compression needed
if (manager.needsCompression()) {
  await manager.compress();
}
```

### 2. MessageHandler

Handles message operations (add, filter, token counting).

```typescript
import { MessageHandler } from 'clear-ai-v2/shared';

const handler = new MessageHandler();

// Add messages
handler.addMessage({ role: 'user', content: 'Hello' });
handler.addMessage({ role: 'assistant', content: 'Hi there!' });

// Get all messages
const messages = handler.getAllMessages();

// Filter by role
const userMessages = handler.getMessagesByRole('user');

// Count tokens
const totalTokens = handler.getTotalTokens();
```

### 3. Compression Strategies

Three strategies for different scenarios:

**Sliding Window** - Keep N most recent messages
```typescript
strategy: 'SLIDING_WINDOW'
// Simple, fast, predictable
// Best for: Short conversations, simple queries
```

**Prioritization** - Keep important messages
```typescript
strategy: 'PRIORITIZE'
// Smart scoring based on importance
// Best for: Conversations with key information
```

**Summarization** - Use LLM to summarize old messages
```typescript
strategy: 'SUMMARIZE'
// Most effective, preserves meaning
// Best for: Long, complex conversations
```

## Basic Usage

```typescript
import { 
  ContextManager,
  ContextCompressor 
} from 'clear-ai-v2/shared';

// Initialize
const manager = new ContextManager({
  maxTokens: 4000,
  model: 'gpt-3.5-turbo',
  compressionThreshold: 0.8  // Compress at 80% capacity
});

// Conversation flow
await manager.addMessage({
  role: 'system',
  content: 'You are a helpful assistant'
});

await manager.addMessage({
  role: 'user',
  content: 'What is AI?'
});

// Get current state
const stats = manager.getStats();
console.log(`Tokens: ${stats.totalTokens}/${stats.maxTokens}`);
console.log(`Messages: ${stats.messageCount}`);

// Auto-compress when needed
if (manager.needsCompression()) {
  const result = await manager.compress('SUMMARIZE');
  console.log(`Saved ${result.tokensSaved} tokens`);
  console.log(`${result.messagesRemoved} messages compressed`);
}

// Format for LLM
const formatted = manager.getFormattedMessages();
await llm.chat(formatted);
```

## Compression in Action

```typescript
// Start with many messages
const messages = [
  { role: 'user', content: 'Tell me about shipments' },
  { role: 'assistant', content: 'Shipments are...' },
  // ... 18 more messages
];

messages.forEach(m => manager.addMessage(m));

console.log('Before compression:');
console.log(`Messages: ${manager.getMessageCount()}`);  // 20
console.log(`Tokens: ${manager.getTotalTokens()}`);     // 3,500

// Compress
const result = await manager.compress('SUMMARIZE');

console.log('\nAfter compression:');
console.log(`Messages: ${manager.getMessageCount()}`);  // 8
console.log(`Tokens: ${manager.getTotalTokens()}`);     // 1,200
console.log(`Saved: ${result.tokensSaved} tokens`);     // 2,300
```

## Real-World Example

Complete conversation with automatic compression:

```typescript
import {
  ContextManager,
  LLMProvider,
  ResponseBuilder
} from 'clear-ai-v2/shared';

class ConversationalAgent {
  private context: ContextManager;
  private llm: LLMProvider;
  
  constructor() {
    this.context = new ContextManager({
      maxTokens: 4000,
      model: 'gpt-3.5-turbo',
      compressionThreshold: 0.75
    });
    
    this.llm = new LLMProvider();
    
    // System message
    this.context.addMessage({
      role: 'system',
      content: 'You are a helpful assistant for waste management.'
    });
  }
  
  async chat(userMessage: string) {
    // Add user message
    await this.context.addMessage({
      role: 'user',
      content: userMessage
    });
    
    // Check if compression needed
    if (this.context.needsCompression()) {
      console.log('Context getting full, compressing...');
      
      const result = await this.context.compress('SUMMARIZE');
      
      console.log(`Compressed ${result.messagesRemoved} messages`);
      console.log(`Saved ${result.tokensSaved} tokens`);
    }
    
    // Get formatted messages for LLM
    const messages = this.context.getFormattedMessages();
    
    // Call LLM
    const response = await this.llm.chat(messages);
    
    // Add assistant response
    await this.context.addMessage({
      role: 'assistant',
      content: response
    });
    
    // Return to user
    return ResponseBuilder.answer(response);
  }
  
  getStats() {
    return this.context.getStats();
  }
}

// Usage
const agent = new ConversationalAgent();

await agent.chat('Show me contaminated shipments');
console.log(agent.getStats());  // 12% capacity used

await agent.chat('What about from FacilityA?');
console.log(agent.getStats());  // 25% capacity used

// ... after many messages
await agent.chat('Summarize everything we discussed');
console.log(agent.getStats());  // 82% → compression triggered → 35%
```

## Compression Strategies Explained

### Sliding Window

**How it works:** Keeps the N most recent messages, drops oldest.

```typescript
const result = await compressor.compress(messages, {
  strategy: 'SLIDING_WINDOW',
  windowSize: 10  // Keep last 10 messages
});

// Before: 20 messages
// After: 10 messages (most recent)
// Token savings: ~50%
```

**Pros:**
- Fast (no LLM calls)
- Predictable
- No costs

**Cons:**
- May lose important context
- Fixed reduction

**Best for:** Simple Q&A, short conversations

### Prioritization

**How it works:** Scores each message by importance, keeps high-scoring ones.

**Importance factors:**
- Recency (recent = higher score)
- Role (system messages always kept)
- Length (longer = more information)
- Keywords (important terms boost score)

```typescript
const result = await compressor.compress(messages, {
  strategy: 'PRIORITIZE',
  targetTokens: 2000
});

// Keeps: System messages, recent messages, important content
// Drops: Old, short, low-value messages
// Token savings: 60-70%
```

**Pros:**
- No LLM costs
- Preserves important messages
- Adaptive reduction

**Cons:**
- Heuristic-based (not perfect)
- Still loses some context

**Best for:** Conversations with varying importance

### Summarization

**How it works:** Uses LLM to create concise summaries of old messages.

```typescript
const result = await compressor.compress(messages, {
  strategy: 'SUMMARIZE',
  summaryRatio: 0.3  // Summarize to 30% of original
});

// Before: 15 old messages = 2,500 tokens
// After: 1 summary message = 750 tokens
// Token savings: 70-80%
```

**Pros:**
- Preserves meaning and context
- High token savings
- Maintains conversation flow

**Cons:**
- Costs tokens (LLM call)
- Slower
- May miss nuances

**Best for:** Long, complex conversations

## Configuration Options

```typescript
const manager = new ContextManager({
  // Token limits
  maxTokens: 4000,              // Maximum tokens allowed
  compressionThreshold: 0.8,     // Compress at 80% full
  
  // Model for token counting
  model: 'gpt-3.5-turbo',
  
  // Compression preferences
  preferredStrategy: 'SUMMARIZE',  // Default strategy
  minimumMessages: 5,              // Never compress below this
  
  // Entity preservation
  preserveEntities: true,          // Extract and keep entities
  
  // System message handling
  stickySystemMessage: true        // Always keep system message
});
```

## Advanced Features

### Entity Extraction

Automatically extracts and preserves important entities:

```typescript
const entities = manager.extractEntities();

// Returns:
{
  people: ['John', 'Sarah'],
  places: ['FacilityA', 'New York'],
  dates: ['2024-01-15'],
  numbers: ['1000kg', '$5000']
}

// These are preserved during compression
```

### Conversation State

Track conversation phases:

```typescript
const state = manager.getConversationState();

console.log(state.phase);        // 'information_gathering'
console.log(state.turnCount);    // 12
console.log(state.duration);     // 125000ms
console.log(state.topics);       // ['shipments', 'contamination']
```

### Metadata Tracking

Add metadata to messages:

```typescript
await manager.addMessage({
  role: 'user',
  content: 'Show data',
  metadata: {
    intent: 'query',
    confidence: 0.95,
    entities: { facilities: ['FacilityA'] }
  }
});
```

## Testing

Context Management has 112 comprehensive tests:

```bash
# Run context management tests
yarn test --testPathPattern="context"

# Specific test suites
yarn test message.test.ts           # MessageHandler tests
yarn test manager.test.ts           # ContextManager tests
yarn test compressor.test.ts        # Compression tests
yarn test entity-extractor.test.ts  # Entity extraction tests
```

## Best Practices

### 1. Set Appropriate Limits

```typescript
// ❌ Don't set unrealistic limits
maxTokens: 1000  // Too small, compresses too often

// ✅ Set based on your model
maxTokens: 4000     // GPT-3.5
maxTokens: 8000     // GPT-4
maxTokens: 128000   // GPT-4-turbo
```

### 2. Choose Right Compression Strategy

```typescript
// ❌ Don't use expensive strategies unnecessarily
if (simpleChat) {
  strategy: 'SUMMARIZE'  // Overkill for simple chats
}

// ✅ Match strategy to use case
if (simpleQA) {
  strategy: 'SLIDING_WINDOW'
} else if (complexConversation) {
  strategy: 'SUMMARIZE'
}
```

### 3. Monitor Token Usage

```typescript
// ❌ Don't ignore warnings
// (continues until limit exceeded)

// ✅ Monitor and log
const stats = manager.getStats();
if (stats.utilizationPercent > 90) {
  console.warn('Context nearly full!');
}
```

### 4. Preserve System Messages

```typescript
// ❌ Don't let system messages get compressed
// (loses important context)

// ✅ Mark as sticky
manager.addMessage({
  role: 'system',
  content: 'Important instructions',
  metadata: { sticky: true }
});
```

## Performance Considerations

**Memory:**
- ~1KB per message in memory
- 1000 messages ≈ 1MB
- Automatic cleanup on compression

**Speed:**
- Adding message: less than 1ms
- Token counting: less than 5ms per message
- Sliding window: less than 10ms
- Prioritization: ~50ms
- Summarization: 1-3 seconds (LLM call)

**Costs:**
- Sliding window: $0
- Prioritization: $0
- Summarization: ~$0.001-0.01 per compression

## Related Modules

- [**Memory Systems**](./memory-systems.md) - Long-term storage of context
- [**Token Management**](../infrastructure/token-management.md) - Token counting and budgets
- [**LLM Providers**](../infrastructure/llm-providers.md) - For summarization
- [**Response System**](../conversational/response-system.md) - Format compressed responses

---

**Next:** [Memory Systems](./memory-systems.md) - Persistent conversation storage

