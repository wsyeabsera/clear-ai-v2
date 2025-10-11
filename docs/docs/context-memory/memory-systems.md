---
sidebar_position: 2
---

# Memory Systems

Memory Systems provide persistent storage for conversations and knowledge, enabling AI to remember past interactions and retrieve relevant context. Clear AI v2 uses a dual-memory architecture: Neo4j for episodic memory (conversation flow) and Pinecone for semantic memory (searchable knowledge).

## What Problem Does This Solve?

**The Problem:** Without memory, AI:
- Forgets previous conversations immediately
- Can't learn from past interactions
- Repeats mistakes
- Has no context beyond current conversation
- Can't build relationships with users

**The Solution:** Dual memory system:
- **Episodic Memory (Neo4j)**: Remembers conversation flow, relationships, temporal order
- **Semantic Memory (Pinecone)**: Stores searchable knowledge, facts, and learned information

## Architecture

```
┌────────────────────────────────┐
│     Conversation Context       │
└───────────┬────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼────────┐  ┌───▼─────────┐
│  Episodic  │  │  Semantic   │
│  Memory    │  │  Memory     │
│  (Neo4j)   │  │  (Pinecone) │
└────────────┘  └─────────────┘
    │                │
    │  "When did     │  "What does
    │   user ask     │   user prefer
    │   about X?"    │   for Y?"
    │                │
    └────────┬───────┘
             │
      ┌──────▼───────┐
      │   Retrieval  │
      └──────────────┘
```

## Episodic Memory (Neo4j)

Stores **conversation flow** as a graph:
- Who said what, when
- How topics relate
- Conversation structure
- Temporal relationships

### Basic Usage

```typescript
import { Neo4jMemory } from 'clear-ai-v2/shared';

const neo4j = new Neo4jMemory({
  uri: process.env.NEO4J_URI,
  user: process.env.NEO4J_USER,
  password: process.env.NEO4J_PASSWORD
});

await neo4j.connect();

// Store conversation
await neo4j.storeMemory({
  sessionId: 'user_123_session_1',
  userId: 'user_123',
  content: 'Show me shipments from last week',
  type: 'query',
  timestamp: new Date(),
  metadata: {
    intent: 'data_request',
    entities: { timeframe: 'last week' }
  }
});

// Retrieve conversation history
const history = await neo4j.getConversationHistory(
  'user_123',
  { limit: 10 }
);

// Find related conversations
const related = await neo4j.findRelated('user_123', 'shipments');
```

### Graph Structure

```
(User) -[:HAD_SESSION]-> (Session)
(Session) -[:CONTAINS]-> (Message)
(Message) -[:FOLLOWED_BY]-> (Message)
(Message) -[:MENTIONS]-> (Entity)
(Message) -[:RELATES_TO]-> (Topic)
```

## Semantic Memory (Pinecone)

Stores **searchable knowledge** as vectors:
- Facts and information
- User preferences
- Learned patterns
- Contextual knowledge

### Basic Usage

```typescript
import { PineconeMemory } from 'clear-ai-v2/shared';

const pinecone = new PineconeMemory({
  apiKey: process.env.PINECONE_API_KEY,
  index: process.env.PINECONE_INDEX,
  embeddingProvider: 'ollama'  // or 'openai'
});

await pinecone.connect();

// Store knowledge
await pinecone.storeMemory({
  id: 'fact_001',
  text: 'User prefers weekly reports on Mondays',
  metadata: {
    userId: 'user_123',
    type: 'preference',
    category: 'reporting'
  }
});

// Semantic search
const results = await pinecone.search(
  'When does user want reports?',
  { limit: 5, filter: { userId: 'user_123' } }
);

// Results ranked by semantic similarity
console.log(results[0].text);  
// "User prefers weekly reports on Mondays"
console.log(results[0].score);  // 0.92
```

## Memory Manager

Orchestrates both memory systems:

```typescript
import { MemoryManager } from 'clear-ai-v2/shared';

const memory = new MemoryManager({
  neo4j: {
    uri: process.env.NEO4J_URI,
    user: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    index: process.env.PINECONE_INDEX
  },
  embedding: {
    provider: 'ollama',
    model: 'nomic-embed-text'
  }
});

await memory.connect();

// Store in both systems
await memory.storeConversation({
  sessionId: 'session_1',
  userId: 'user_123',
  messages: conversationMessages
});

// Retrieve relevant context
const context = await memory.retrieveContext({
  userId: 'user_123',
  query: 'contaminated shipments',
  limit: 5
});
```

## Real-World Example

Complete agent with memory:

```typescript
import {
  MemoryManager,
  ContextManager,
  LLMProvider,
  ResponseBuilder
} from 'clear-ai-v2/shared';

class MemoryEnhancedAgent {
  private memory: MemoryManager;
  private context: ContextManager;
  private llm: LLMProvider;
  
  constructor() {
    this.memory = new MemoryManager({
      /* config */
    });
    this.context = new ContextManager({ maxTokens: 4000 });
    this.llm = new LLMProvider();
  }
  
  async chat(userId: string, message: string) {
    // 1. Retrieve relevant memories
    const memories = await this.memory.retrieveContext({
      userId,
      query: message,
      limit: 3
    });
    
    // 2. Add memories to context
    if (memories.length > 0) {
      await this.context.addMessage({
        role: 'system',
        content: `Relevant context:\n${memories.map(m => m.text).join('\n')}`
      });
    }
    
    // 3. Add user message
    await this.context.addMessage({
      role: 'user',
      content: message
    });
    
    // 4. Get LLM response
    const formatted = this.context.getFormattedMessages();
    const response = await this.llm.chat(formatted);
    
    // 5. Store conversation in memory
    await this.memory.storeConversation({
      sessionId: `session_${Date.now()}`,
      userId,
      messages: [
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]
    });
    
    // 6. Extract and store new knowledge
    const knowledge = await this.extractKnowledge(message, response);
    if (knowledge) {
      await this.memory.storeKnowledge({
        userId,
        text: knowledge,
        metadata: { extractedAt: new Date() }
      });
    }
    
    return ResponseBuilder.answer(response);
  }
  
  async extractKnowledge(userMsg: string, agentMsg: string): Promise<string | null> {
    // Extract facts, preferences, or learned information
    if (userMsg.includes('I prefer') || userMsg.includes('I like')) {
      return userMsg;  // Store user preference
    }
    return null;
  }
}

// Usage
const agent = new MemoryEnhancedAgent();

// First conversation
await agent.chat('user_123', 'I prefer weekly reports on Mondays');
// Stored in memory

// Later conversation (different session)
await agent.chat('user_123', 'When should I send reports?');
// Agent recalls: "Based on your preference, send reports on Mondays"
```

## Configuration

### Neo4j Setup

```bash
# .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
ENABLE_NEO4J=true
```

### Pinecone Setup

```bash
# .env
PINECONE_API_KEY=your-api-key
PINECONE_INDEX=clear-ai-memories
ENABLE_PINECONE=true

# Embedding configuration
MEMORY_EMBEDDING_PROVIDER=ollama  # or openai
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768
```

### Optional Configuration

```typescript
const memory = new MemoryManager({
  // Neo4j config
  neo4j: {
    uri: '...',
    user: '...',
    password: '...',
    database: 'neo4j'  // Optional
  },
  
  // Pinecone config
  pinecone: {
    apiKey: '...',
    index: '...',
    namespace: 'production'  // Optional
  },
  
  // Embedding config
  embedding: {
    provider: 'ollama',
    model: 'nomic-embed-text',
    apiKey: '...',  // For OpenAI
    dimensions: 768
  },
  
  // Retrieval config
  retrieval: {
    defaultLimit: 5,
    minScore: 0.7,  // Minimum similarity
    maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
  }
});
```

## Query Patterns

### Find Recent Conversations

```typescript
const recent = await neo4j.getConversationHistory(userId, {
  limit: 10,
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // Last 7 days
});
```

### Search by Topic

```typescript
const about = await pinecone.search('contamination issues', {
  filter: { userId, type: 'issue' },
  limit: 5
});
```

### Find Related Users

```typescript
const similar = await neo4j.findSimilarUsers(userId, {
  basedOn: 'queries',
  limit: 5
});
```

### Temporal Queries

```typescript
const timeline = await neo4j.getTimeline(userId, {
  from: startDate,
  to: endDate,
  topics: ['shipments', 'facilities']
});
```

## Testing

Memory systems have comprehensive tests (15 integration tests):

```bash
# Unit tests (with mocks)
yarn test neo4j.test.ts
yarn test pinecone.test.ts
yarn test manager.test.ts

# Integration tests (real services)
yarn test:integration memory
```

## Best Practices

### 1. Enable Memory Selectively

```typescript
// ❌ Don't enable for simple queries
if (simpleCalculation) {
  // No need for memory
}

// ✅ Enable for conversational use cases
if (multiTurnConversation) {
  await memory.storeConversation(...)
}
```

### 2. Clean Old Memories

```typescript
// Set up periodic cleanup
setInterval(async () => {
  await memory.cleanup({
    olderThan: 90 * 24 * 60 * 60 * 1000,  // 90 days
    keepImportant: true
  });
}, 24 * 60 * 60 * 1000);  // Daily
```

### 3. Use Appropriate Filters

```typescript
// ❌ Don't search everything
const results = await pinecone.search(query);

// ✅ Filter by user/context
const results = await pinecone.search(query, {
  filter: { 
    userId: currentUser,
    type: 'preference'
  }
});
```

### 4. Handle Connection Failures

```typescript
try {
  await memory.connect();
} catch (error) {
  console.error('Memory unavailable, continuing without');
  // Agent still works, just without memory
}
```

## Performance

**Neo4j:**
- Store: ~10-50ms
- Retrieve: ~20-100ms
- Complex queries: ~100-500ms

**Pinecone:**
- Store: ~50-200ms (includes embedding)
- Search: ~100-300ms
- Batch operations: More efficient

**Embeddings:**
- Ollama (local): ~100ms, free
- OpenAI: ~200ms, $0.0001 per 1K tokens

## Privacy & Security

### Data Isolation

```typescript
// Always filter by userId
filter: { userId: currentUser }

// Never mix user data
// ❌ BAD
await pinecone.search(query);  // Searches all users

// ✅ GOOD
await pinecone.search(query, {
  filter: { userId }
});
```

### Sensitive Data

```typescript
// Don't store sensitive information
// ❌ BAD
await memory.store({
  text: `User password is ${password}`
});

// ✅ GOOD
await memory.store({
  text: 'User updated their password',
  metadata: { action: 'security_update' }
});
```

## Related Modules

- [**Context Management**](./context-management.md) - Short-term conversation context
- [**Embeddings**](./embeddings.md) - Vector generation for semantic search
- [**Configuration**](../infrastructure/configuration.md) - Memory system setup

---

**Next:** [Embeddings](./embeddings.md) - Vector generation for semantic memory

