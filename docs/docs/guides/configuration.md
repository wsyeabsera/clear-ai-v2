---
sidebar_position: 3
---

# Configuration Guide

Complete reference for all configuration options in Clear AI v2.

## Configuration Categories

### LLM Configuration

```bash
# Provider selection
DEFAULT_LLM_PROVIDER=openai  # openai | groq | ollama
DEFAULT_LLM_MODEL=gpt-3.5-turbo

# Generation parameters
DEFAULT_TEMPERATURE=0.7  # 0.0 (deterministic) to 1.0 (creative)
DEFAULT_MAX_TOKENS=2000  # Max response length

# Fallback providers (comma-separated)
FALLBACK_PROVIDERS=groq,ollama

# Provider API keys
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
OLLAMA_URL=http://localhost:11434
```

### Memory Configuration

```bash
# Enable/disable memory systems
ENABLE_NEO4J=false  # Episodic memory
ENABLE_PINECONE=false  # Semantic memory

# Neo4j (Episodic)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j  # Optional

# Pinecone (Semantic)
PINECONE_API_KEY=...
PINECONE_INDEX=clear-ai-memories
PINECONE_NAMESPACE=production  # Optional

# Embeddings
MEMORY_EMBEDDING_PROVIDER=ollama  # ollama | openai
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768  # 768 for Ollama, 1536 for OpenAI
```

### Token Management

```bash
# Context limits
MAX_CONTEXT_TOKENS=4000
COMPRESSION_THRESHOLD=0.8  # Compress at 80%

# Budget limits
DAILY_TOKEN_BUDGET=100000
PER_OPERATION_BUDGET=5000
```

### Observability

```bash
# Langfuse
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Logging
LOG_LEVEL=info  # debug | info | warn | error
```

### API & Tools

```bash
# API configuration
WASTEER_API_URL=https://api.wasteer.dev
API_PORT=4000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wasteer
```

### General

```bash
NODE_ENV=development  # development | production | test
```

## Environment-Specific Configs

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_NEO4J=false  # Optional in dev
ENABLE_PINECONE=false
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_NEO4J=true
ENABLE_PINECONE=true
LANGFUSE_PUBLIC_KEY=pk-...
```

### Testing
```bash
NODE_ENV=test
LOG_LEVEL=warn
# Tests use mocks, no real services needed
```

## Accessing Configuration

```typescript
import { loadConfig } from 'clear-ai-v2/shared';

const config = loadConfig();

console.log(config.llm.provider);
console.log(config.memory.enabled);
console.log(config.tokens.maxTokens);
```

---

**Next:** [Development Guide](./development.md)
