---
sidebar_position: 1
slug: /
---

# Welcome to Clear AI v2

**Build intelligent, conversational AI agents that understand context, express uncertainty, and guide users naturally.**

Clear AI v2 is a production-ready framework for creating business-focused AI agents that can:
- 🤝 Have natural, multi-turn conversations
- 🧠 Remember context and learn from interactions
- 💬 Ask clarifying questions when uncertain
- 📊 Show progress for long-running tasks
- 🎯 Understand user intent and follow-ups
- ⚡ Switch between multiple AI providers seamlessly

## Why Clear AI v2?

Traditional AI agents struggle with real-world business conversations. They don't know when to ask for clarification, can't track multi-step processes, and often give confident answers when they shouldn't.

Clear AI v2 solves these problems with a comprehensive conversational intelligence system built from the ground up for production use.

### For Non-Technical Users

Think of Clear AI v2 as a framework for building AI assistants that feel more like helpful colleagues than robots:

- **Natural Conversations**: The AI can ask follow-up questions ("Which time period did you mean?") instead of guessing or failing
- **Honest About Uncertainty**: When the AI isn't sure, it tells you ("I'm 65% confident in this result")
- **Progress Updates**: For complex tasks, you see what's happening ("Step 2/5: Analyzing data...")
- **Remembers Context**: The AI understands "What about the rejected ones?" refers to your previous query

### For Developers

Clear AI v2 provides:
- **19 Production-Ready Modules** covering context management, workflows, token budgets, conversational AI
- **724 Unit Tests** + **45 Integration Tests** = 100% test coverage
- **Multi-LLM Support**: OpenAI, Groq, Ollama with automatic fallback
- **Memory Systems**: Neo4j (episodic) + Pinecone (semantic) for context retrieval
- **Workflow Graphs**: LangGraph-style state machines for complex logic
- **Observability**: Built-in Langfuse integration for production debugging
- **TypeScript-First**: Strict types, ESM modules, modern tooling

## What Can You Build?

### Customer Support Agent
```typescript
// User: "Show me my recent orders"
const intent = classifier.classify(message);  // → 'query'

// Agent analyzes and asks for clarification
if (orders.length > 50) {
  return ResponseBuilder.question(
    "You have many orders. Which time period?",
    ["this week", "this month", "all time"]
  );
}
```

### Data Analysis Agent
```typescript
// Track progress through multi-step analysis
tracker.startTask('analysis_1', 4);

yield ResponseBuilder.progress(1, 4, "Fetching shipments");
// ... fetch data

yield ResponseBuilder.progress(2, 4, "Analyzing patterns");
// ... analyze

// Express confidence in results
return ResponseBuilder.withConfidence(
  ResponseBuilder.answer("Upward trend detected", data),
  0.85  // High confidence
);
```

### Business Intelligence Agent
```typescript
// Understand follow-up questions
// User: "Show contaminated shipments"
const results1 = await tools.shipments.execute({ has_contaminants: true });

// User: "What about from FacilityA?"
const intent2 = classifier.classify(message);  // → 'followup'
const entities = utils.extractBusinessEntities(message);  // { facilities: ['FacilityA'] }

// Filter previous results by detected entity
const filtered = results1.filter(s => s.facility_id === 'FacilityA');
```

## Core Features

### 🗣️ Conversational Intelligence

**Response Types**: Ask questions, show progress, acknowledge commands, provide answers
```typescript
ResponseBuilder.question("Which facility?", ["FacilityA", "FacilityB"])
ResponseBuilder.progress(3, 5, "Processing data...")
ResponseBuilder.answer("Found 10 shipments", data)
```

**Intent Detection**: Understand what users mean
```typescript
classifier.classify("Show me data")  // → 'query'
classifier.classify("What is X?")    // → 'question'
classifier.classify("yes")           // → 'confirmation'
```

**Confidence Scoring**: Express uncertainty appropriately
```typescript
const score = scorer.scoreFromDataCount(5, 100);  // Only 5% of expected data
ResponseBuilder.withConfidence(response, score);   // Adds disclaimer
```

### 🧠 Context & Memory

**Context Compression**: Automatically summarize old messages when context window fills
```typescript
const compressor = new ContextCompressor(manager, llm);
const result = await compressor.compress(messages, strategy: 'SUMMARIZE');
// Converts 15 old messages → 1 summary message, saving ~80% tokens
```

**Memory Systems**: Remember past interactions and retrieve relevant context
```typescript
// Store episodic memory (conversation flow)
await neo4jMemory.storeMemory({ sessionId, content, timestamp });

// Store semantic memory (searchable knowledge)
await pineconeMemory.storeMemory({ id, text, metadata });
```

### 🔄 Workflows

**State Graphs**: Build complex logic flows with conditional branching
```typescript
const graph = new GraphBuilder()
  .addNode('analyze', analyzeData)
  .addNode('validate', validateResults)
  .addConditionalEdge('analyze', (state) => 
    state.confidence > 0.7 ? 'validate' : 'ask_user'
  )
  .build();

const executor = new WorkflowExecutor();
const result = await executor.execute(graph, initialState);
```

**Checkpointing**: Resume workflows after interruptions
```typescript
const checkpoint = await checkpointManager.create(workflowId, state);
// ... system restarts
const state = await checkpointManager.load(workflowId);
// Continue from where we left off
```

### 💰 Token Management

**Token Counting**: Accurate counts for any LLM
```typescript
const counter = new TokenCounter('gpt-4');
const tokens = counter.countTokens("Your message");
const cost = counter.estimateCost(tokens);  // → { input: $0.003, output: $0.006 }
```

**Budget Enforcement**: Control costs per operation
```typescript
const budget = new TokenBudget(100000);  // 100K tokens
budget.allocate('query', 5000);  // Reserve 5K for this query

if (budget.getRemainingTokens() < 1000) {
  // Warn user or compress context
}
```

### 🔍 Observability

**Langfuse Integration**: Debug production issues
```typescript
const tracer = new LangfuseTracer(config);
const trace = tracer.startTrace('user_query');
const span = tracer.startSpan(trace.id, 'llm_call');

// ... execute
tracer.endSpan(span.id, { tokens: 150 });
tracer.endTrace(trace.id);
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Your AI Agent                        │
│  (Orchestrator, Planner, Executor, etc.)       │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│         Clear AI v2 Shared Library              │
├─────────────────────────────────────────────────┤
│  • Conversational AI (Intent, Response, etc.)   │
│  • Context Management (Compression, State)      │
│  • Workflow Orchestration (Graphs, Execution)   │
│  • Token Management (Counting, Budgets)         │
│  • Memory Systems (Neo4j, Pinecone)             │
│  • LLM Providers (OpenAI, Groq, Ollama)         │
│  • Observability (Langfuse Tracing)             │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│         External Services                       │
│  • OpenAI / Groq / Ollama                       │
│  • Neo4j Database                               │
│  • Pinecone Vector DB                           │
│  • Langfuse Platform                            │
│  • Your Business API                            │
└─────────────────────────────────────────────────┘
```

## Quick Example

Here's a complete conversational agent in action:

```typescript
import {
  ResponseBuilder,
  IntentClassifier,
  ConfidenceScorer,
  ProgressTracker,
} from 'clear-ai-v2/shared';

class SupportAgent {
  private classifier = new IntentClassifier();
  private scorer = new ConfidenceScorer();
  private tracker = new ProgressTracker();
  
  async handleMessage(message: string, context: ConversationContext) {
    // Detect intent
    const intent = this.classifier.classify(message, context);
    
    if (intent.intent === 'query') {
      // Start tracking
      this.tracker.startTask('query_1', 3);
      
      // Step 1
      this.tracker.updateStep('query_1', 1, 'Searching database');
      yield ResponseBuilder.progress(1, 3, 'Searching database');
      
      const results = await this.searchData(message);
      
      // Step 2
      this.tracker.updateStep('query_1', 2, 'Analyzing results');
      const analysis = this.analyze(results);
      
      // Calculate confidence
      const confidence = this.scorer.scoreFromDataCount(
        results.length,
        expectedCount
      );
      
      // Return with confidence
      this.tracker.complete('query_1');
      return ResponseBuilder.withConfidence(
        ResponseBuilder.answer(
          `Found ${results.length} matching items`,
          results
        ),
        confidence
      );
    }
    
    if (intent.intent === 'question') {
      return ResponseBuilder.question(
        "Could you provide more details?",
        ["Option A", "Option B", "Option C"]
      );
    }
  }
}
```

## Test Coverage

Clear AI v2 is production-ready with comprehensive test coverage:

- ✅ **724 Unit Tests** - Every module fully tested
- ✅ **45 Integration Tests** - Real service integration verified
- ✅ **100% Pass Rate** - All tests passing
- ✅ **TDD Approach** - Test-driven development throughout

## What's Next?

- 📖 [**Getting Started**](./getting-started.md) - Set up your first agent
- 🎯 [**Core Concepts**](./core-concepts.md) - Understand key ideas (non-technical)
- 🏗️ [**Architecture**](./architecture.md) - System design overview
- 📚 [**API Reference**](./api/overview.md) - Detailed module documentation
- 🎓 [**Tutorials**](./tutorials/first-agent.md) - Step-by-step guides
- 💡 [**Examples**](./examples/overview.md) - Real-world use cases

---

**Ready to build intelligent AI agents?** Let's get started! 🚀
