---
sidebar_position: 3
---

# Utilities

Collection of 10+ utility modules providing common functionality: template resolution, statistics, retry logic, circuit breakers, logging, and more.

## What Problem Does This Solve?

**Problem:** Common patterns repeated everywhere
**Solution:** Reusable, tested utilities

## Available Utilities

### Template Resolver
```typescript
import { TemplateResolver } from 'clear-ai-v2/shared';

const resolver = new TemplateResolver();
const result = resolver.resolve(
  "User: {{user.name}}",
  { user: { name: 'John' } }
);
// "User: John"
```

### Statistics
```typescript
import { mean, median, standardDeviation, detectTrend } from 'clear-ai-v2/shared';

const values = [10, 20, 30, 40, 50];
console.log(mean(values));  // 30
console.log(median(values));  // 30
console.log(detectTrend(values));  // 'up'
```

### Circuit Breaker
```typescript
import { CircuitBreaker } from 'clear-ai-v2/shared';

const breaker = new CircuitBreaker({ threshold: 5, timeout: 60000 });

try {
  await breaker.execute(async () => {
    return await unreliableAPI();
  });
} catch (error) {
  // Circuit open after 5 failures
}
```

### Retry Logic
```typescript
import { retryWithBackoff } from 'clear-ai-v2/shared';

const result = await retryWithBackoff(
  async () => await apiCall(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### Logger
```typescript
import { Logger } from 'clear-ai-v2/shared';

const logger = new Logger('MyModule');

logger.info('Operation started');
logger.warn('Approaching limit');
logger.error('Operation failed', { error });
```

## Testing

```bash
yarn test utils  # 216 tests
```

---

**Next:** [Tools](./tools.md)
