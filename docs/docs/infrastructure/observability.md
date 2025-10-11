---
sidebar_position: 4
---

# Observability

Langfuse integration for production observability. Trace every LLM call, track costs, debug issues, and monitor performance in real-time.

## What Problem Does This Solve?

**Problem:** Can't debug production AI issues
**Solution:** Complete tracing and monitoring

## Basic Usage

```typescript
import { LangfuseTracer } from 'clear-ai-v2/shared';

const tracer = new LangfuseTracer({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY
});

// Start trace
const trace = tracer.startTrace('user_query', {
  userId: 'user_123',
  sessionId: 'session_456'
});

// Track LLM call
const generation = tracer.trackGeneration(trace.id, {
  name: 'chat',
  input: messages,
  model: 'gpt-3.5-turbo'
});

const response = await llm.chat(messages);

tracer.endGeneration(generation.id, {
  output: response,
  tokens: { input: 150, output: 75, total: 225 },
  cost: 0.0003
});

// End trace
tracer.endTrace(trace.id);
```

## Dashboard

View all traces at: https://cloud.langfuse.com

See:
- Every prompt and response
- Token usage and costs
- Execution times
- Error rates
- User sessions

## Testing

Optional dependency - works with or without Langfuse.

---

**Infrastructure complete!** Next: [Types](../foundation/types.md)
