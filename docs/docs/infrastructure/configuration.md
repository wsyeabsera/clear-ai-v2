---
sidebar_position: 3
---

# Configuration

Centralized configuration management with environment validation. Load settings from .env files, validate required values, and access configuration throughout your application.

## What Problem Does This Solve?

**Problem:** Config scattered, validation missing, errors at runtime
**Solution:** Centralized, validated configuration

## Basic Usage

```typescript
import { loadConfig } from 'clear-ai-v2/shared';

const config = loadConfig();

console.log(config.llm.provider);     // 'openai'
console.log(config.llm.model);        // 'gpt-3.5-turbo'
console.log(config.memory.enabled);   // true
console.log(config.tools.api_base_url);  // 'http://localhost:4000'
```

## Configuration Structure

```typescript
interface Config {
  env: 'development' | 'production' | 'test';
  llm: {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    fallbackProviders?: string[];
  };
  memory: {
    enabled: boolean;
    neo4j?: { uri, user, password };
    pinecone?: { apiKey, index };
    embedding: { provider, model, dimensions };
  };
  tokens: {
    maxTokens: number;
    budgetPerOperation: number;
  };
  tools: {
    api_base_url: string;
  };
  observability?: {
    langfuse?: { publicKey, secretKey };
  };
}
```

## Environment Variables

See [Environment Setup Guide](../guides/environment-setup.md) for complete list.

## Validation

Config is validated on load:

```typescript
try {
  const config = loadConfig();
} catch (error) {
  console.error('Invalid configuration:', error.message);
  // Required fields missing or invalid
}
```

## Testing

```bash
yarn test loader.test.ts  # 18 tests
```

---

**Next:** [Observability](./observability.md)
