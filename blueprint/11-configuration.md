# Configuration Blueprint

## Environment Variables

```bash
# API Configuration
WASTEER_API_URL=https://api.wasteer.dev
TOOL_TIMEOUT=30000
TOOL_RETRIES=3

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_URL=http://localhost:11434

# Memory Systems
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=clear-ai-v2

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Features
ENABLE_MEMORY=true
ENABLE_CONTEXT_LOADING=true
MAX_PARALLEL_EXECUTIONS=5
```

## Configuration Files

```typescript
// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development'
  },
  
  tools: {
    apiBaseUrl: process.env.WASTEER_API_URL || 'https://api.wasteer.dev',
    timeout: parseInt(process.env.TOOL_TIMEOUT || '30000'),
    retries: parseInt(process.env.TOOL_RETRIES || '3')
  },
  
  llm: {
    providers: [
      {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        api_key: process.env.OPENAI_API_KEY
      },
      {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        api_key: process.env.ANTHROPIC_API_KEY
      }
    ]
  },
  
  memory: {
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || ''
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || '',
      indexName: process.env.PINECONE_INDEX || 'clear-ai-v2'
    }
  },
  
  features: {
    enableMemory: process.env.ENABLE_MEMORY !== 'false',
    enableContextLoading: process.env.ENABLE_CONTEXT_LOADING !== 'false',
    maxParallelExecutions: parseInt(process.env.MAX_PARALLEL_EXECUTIONS || '5')
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

