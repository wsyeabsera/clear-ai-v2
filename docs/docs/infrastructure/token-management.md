---
sidebar_position: 1
---

# Token Management

Token Management provides accurate token counting, budget enforcement, and cost estimation for AI operations. Control spending, prevent overruns, and optimize token usage across all LLM interactions.

## What Problem Does This Solve?

**The Problem:** AI costs spiral out of control:
- No visibility into token usage
- One conversation costs $5+
- Can't set budgets
- Surprise bills at month-end

**The Solution:** Complete token control:
- Accurate counting for any model
- Set budgets per operation
- Real-time cost estimation
- Prevent overruns automatically

## Components

### TokenCounter

Accurate token counting using tiktoken:

```typescript
import { TokenCounter } from 'clear-ai-v2/shared';

const counter = new TokenCounter('gpt-3.5-turbo');

// Count text
const tokens = counter.countTokens("Hello, world!");
console.log(tokens);  // 4

// Count messages
const msgTokens = counter.countMessages([
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hi!' }
]);
console.log(msgTokens);  // 18

// Estimate cost
const cost = counter.estimateCost(1000);
console.log(cost);  // { input: 0.0005, output: 0.0015, total: 0.002 }
```

### TokenBudget

Enforce token limits:

```typescript
import { TokenBudget } from 'clear-ai-v2/shared';

const budget = new TokenBudget(10000);  // 10K token limit

// Allocate for operation
budget.allocate('query_1', 2000);

console.log(budget.getRemainingTokens());  // 8000

// Release when done
budget.release('query_1');

console.log(budget.getRemainingTokens());  // 10000
```

## Real-World Example

```typescript
import { TokenCounter, TokenBudget, ContextManager } from 'clear-ai-v2/shared';

class CostControlledAgent {
  private counter: TokenCounter;
  private budget: TokenBudget;
  private context: ContextManager;
  
  constructor() {
    this.counter = new TokenCounter('gpt-3.5-turbo');
    this.budget = new TokenBudget(50000);  // 50K daily budget
    this.context = new ContextManager({ maxTokens: 4000 });
  }
  
  async chat(message: string) {
    // Count incoming message
    const msgTokens = this.counter.countTokens(message);
    
    // Estimate total operation cost
    const context = this.context.getFormattedMessages();
    const contextTokens = this.counter.countMessages(context);
    const estimatedTotal = msgTokens + contextTokens + 500;  // + response
    
    // Check budget
    if (!this.budget.canAllocate('current_chat', estimatedTotal)) {
      return ResponseBuilder.answer(
        "Daily token budget exceeded. Please try again tomorrow."
      );
    }
    
    // Allocate budget
    this.budget.allocate('current_chat', estimatedTotal);
    
    try {
      // Execute
      const response = await this.llm.chat(context);
      
      // Calculate actual cost
      const actualTokens = this.counter.countTokens(response);
      const cost = this.counter.estimateCost(actualTokens);
      
      console.log(`Cost: $${cost.total.toFixed(4)}`);
      console.log(`Budget: ${this.budget.getUtilization()}% used`);
      
      return ResponseBuilder.answer(response);
      
    } finally {
      // Always release
      this.budget.release('current_chat');
    }
  }
}
```

## Supported Models

TokenCounter supports accurate counting for:
- GPT-3.5, GPT-4, GPT-4-turbo
- Claude 2, Claude 3
- Llama models
- Mixtral
- And more...

```typescript
const gpt4 = new TokenCounter('gpt-4');
const claude = new TokenCounter('claude-3-opus');
const llama = new TokenCounter('llama-3-70b');
```

## Cost Estimation

```typescript
const counter = new TokenCounter('gpt-4');

const tokens = 1500;
const cost = counter.estimateCost(tokens);

console.log(cost);
// {
//   input: 0.015,   // $0.015 for input tokens
//   output: 0.045,  // $0.045 for output tokens
//   total: 0.060    // $0.060 total
// }
```

**Pricing** (as of Oct 2024):
- GPT-3.5: $0.0005/1K input, $0.0015/1K output
- GPT-4: $0.03/1K input, $0.06/1K output  
- Claude 3: Varies by model
- Ollama: Free (local)

## Testing

```bash
yarn test counter.test.ts  # 19 tests
yarn test budget.test.ts   # 15 tests
```

## Best Practices

### 1. Always Use Budgets in Production

```typescript
// ❌ No budget control
const response = await llm.chat(messages);

// ✅ With budget
if (budget.canAllocate('op', estimatedTokens)) {
  budget.allocate('op', estimatedTokens);
  const response = await llm.chat(messages);
  budget.release('op');
}
```

### 2. Monitor Utilization

```typescript
const utilization = budget.getUtilization();

if (utilization > 90) {
  console.warn('Budget 90% used!');
  // Trigger compression or warn user
}
```

### 3. Reset Budgets Periodically

```typescript
// Daily budget reset
setInterval(() => {
  budget.reset();
  console.log('Daily token budget reset');
}, 24 * 60 * 60 * 1000);
```

## Related Modules

- [**Context Management**](../context-memory/context-management.md) - Token-aware compression
- [**LLM Providers**](./llm-providers.md) - LLM calls tracked
- [**Observability**](./observability.md) - Cost tracking

---

**Next:** [LLM Providers](./llm-providers.md) - Multi-provider AI access
