# Error Handling Blueprint

## Error Types

```typescript
// src/errors/types.ts
export class ClearAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClearAIError';
  }
}

export class ToolExecutionError extends ClearAIError {
  constructor(tool: string, message: string, details?: any) {
    super(`Tool execution failed: ${tool}`, 'TOOL_EXECUTION_ERROR', {
      tool,
      ...details
    });
  }
}

export class PlanGenerationError extends ClearAIError {
  constructor(message: string, details?: any) {
    super(message, 'PLAN_GENERATION_ERROR', details);
  }
}

export class LLMProviderError extends ClearAIError {
  constructor(provider: string, message: string, details?: any) {
    super(`LLM provider error: ${provider}`, 'LLM_PROVIDER_ERROR', {
      provider,
      ...details
    });
  }
}

export class MemoryError extends ClearAIError {
  constructor(operation: string, message: string, details?: any) {
    super(`Memory operation failed: ${operation}`, 'MEMORY_ERROR', {
      operation,
      ...details
    });
  }
}
```

## Error Handling Patterns

### 1. Retry with Exponential Backoff
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. Graceful Degradation
```typescript
async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn('Primary operation failed, using fallback');
    return await fallback();
  }
}
```

### 3. Circuit Breaker
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    return this.failures >= this.threshold &&
           Date.now() - this.lastFailTime < this.timeout;
  }
  
  private onSuccess(): void {
    this.failures = 0;
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
  }
}
```

