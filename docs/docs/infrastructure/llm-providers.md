---
sidebar_position: 2
---

# LLM Providers

Multi-provider LLM support with automatic fallback. Connect to OpenAI, Groq, or Ollama through a unified interface, with automatic failover when providers are unavailable.

## What Problem Does This Solve?

**Problem:** Vendor lock-in and single points of failure
**Solution:** Use multiple providers with automatic fallback

## Basic Usage

```typescript
import { LLMProvider } from 'clear-ai-v2/shared';

const llm = new LLMProvider();  // Auto-selects best available

const response = await llm.chat([
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hello!' }
]);
```

## Supported Providers

- **OpenAI**: GPT-3.5, GPT-4 (production quality)
- **Groq**: Llama, Mixtral (fast, free tier)  
- **Ollama**: Local models (privacy, no cost)

## Configuration

```bash
# .env
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-3.5-turbo
FALLBACK_PROVIDERS=groq,ollama

OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
OLLAMA_URL=http://localhost:11434
```

## Automatic Fallback

```typescript
// Tries providers in order:
// 1. OpenAI (primary)
// 2. Groq (fallback 1)
// 3. Ollama (fallback 2)

const response = await llm.chat(messages);
// Works even if OpenAI is down!
```

## Testing

```bash
yarn test:llm  # Test all providers
yarn test provider.test.ts
```

---

**Next:** [Configuration](./configuration.md)
