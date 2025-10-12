---
sidebar_position: 8
---

# Integration Guide

Complete step-by-step guide to integrating the Agent System into your application.

## Prerequisites

### Required

- ✅ **Node.js 18+**: Runtime environment
- ✅ **MongoDB**: For waste management API
- ✅ **OpenAI API Key**: For LLM-based agents

### Optional

- ⭕ **Neo4j**: For episodic memory (can use mocks)
- ⭕ **Pinecone**: For semantic memory (can use mocks)
- ⭕ **Groq API Key**: Alternative LLM provider
- ⭕ **Ollama**: Local LLM provider

## Installation

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd clear-ai-v2

# Install dependencies
yarn install

# Build TypeScript
yarn build
```

### 2. Environment Configuration

Create `.env` file in project root:

```bash
# Required: LLM Provider
OPENAI_API_KEY=sk-...

# Required: API Configuration
API_PORT=4000
WASTEER_API_URL=http://localhost:4000/api

# Required: MongoDB
MONGODB_URI=mongodb://localhost:27017/wasteer

# Optional: Alternative LLM Providers
GROQ_API_KEY=gsk_...
OLLAMA_BASE_URL=http://localhost:11434

# Optional: Memory Systems
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX=wasteer-memory

# Optional: LLM Configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000
```

### 3. Start Services

```bash
# Start MongoDB (if not running)
mongod --dbpath /path/to/data

# Start API server
yarn api:start

# Seed database with test data
yarn seed

# Verify API is running
curl http://localhost:4000/health
# → {"success":true,"message":"Waste Management API is running"}
```

## Integration Steps

### Step 1: Initialize LLM Provider

```typescript
import { LLMProvider } from './shared/llm/provider.js';
import { getLLMConfigs } from './shared/llm/config.js';

// Load LLM configs from environment
const llmConfigs = getLLMConfigs();
const llm = new LLMProvider(llmConfigs);

// Test LLM connection
const testResponse = await llm.generate({
  messages: [{ role: 'user', content: 'Hello' }]
});
console.log('LLM initialized:', testResponse.provider);
```

### Step 2: Initialize Memory System

#### Option A: With Real Services

```typescript
import { MemoryManager } from './shared/memory/manager.js';

const memory = new MemoryManager({
  neo4j: {
    uri: process.env.NEO4J_URI!,
    user: process.env.NEO4J_USER!,
    password: process.env.NEO4J_PASSWORD!
  },
  pinecone: {
    api_key: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
    index_name: process.env.PINECONE_INDEX!
  }
});

await memory.connect();
console.log('Memory system connected');
```

#### Option B: With Mocks (Development)

```typescript
import { MemoryManager } from './shared/memory/manager.js';

const mockNeo4j = {
  connect: async () => {},
  close: async () => {},
  isConnected: () => true,
  storeEvent: async () => {},
  queryEvents: async () => [],
  getEvent: async () => null,
  deleteEvent: async () => {}
};

const mockPinecone = {
  connect: async () => {},
  close: async () => {},
  isConnected: () => true,
  store: async () => 'id',
  search: async () => [],
  get: async () => null,
  delete: async () => {},
  deleteMany: async () => {},
  getStats: async () => ({})
};

const memory = new MemoryManager(
  {
    neo4j: { uri: '', user: '', password: '' },
    pinecone: { api_key: '', environment: '', index_name: '' }
  },
  mockNeo4j,
  mockPinecone
);

await memory.connect();
```

### Step 3: Initialize MCP Server with Tools

```typescript
import { MCPServer } from './mcp/server.js';
import { registerAllTools } from './tools/index.js';

const mcpServer = new MCPServer('my-app', '1.0.0');
const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:4000/api';

registerAllTools(mcpServer, apiUrl);

console.log('Registered', mcpServer.getToolCount(), 'tools');
// → "Registered 30 tools"
```

### Step 4: Create Agents

```typescript
import { PlannerAgent } from './agents/planner.js';
import { ExecutorAgent } from './agents/executor.js';
import { AnalyzerAgent } from './agents/analyzer.js';
import { SummarizerAgent } from './agents/summarizer.js';

const planner = new PlannerAgent(llm, mcpServer);
const executor = new ExecutorAgent(mcpServer);
const analyzer = new AnalyzerAgent(llm);
const summarizer = new SummarizerAgent(llm);

console.log('Agents initialized');
```

### Step 5: Create Orchestrator

```typescript
import { OrchestratorAgent } from './agents/orchestrator.js';

const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memory
);

console.log('Orchestrator ready');
```

### Step 6: Execute First Query

```typescript
const response = await orchestrator.handleQuery(
  "Get contaminated shipments from last week"
);

console.log('Response:', response.message);
console.log('Tools used:', response.tools_used);
console.log('Duration:', response.metadata.total_duration_ms, 'ms');
console.log('Request ID:', response.metadata.request_id);
```

## Express.js Integration

```typescript
import express from 'express';
import { OrchestratorAgent } from './agents/orchestrator.js';

const app = express();
app.use(express.json());

// Initialize orchestrator (see steps above)
const orchestrator = /* ... */;

// API endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    const response = await orchestrator.handleQuery(query);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Agent API running on port 3000');
});
```

## GraphQL Integration

```typescript
import { GraphQLAgentServer } from './graphql/server.js';

const graphqlServer = new GraphQLAgentServer({
  port: 5000,
  orchestrator,
  memory
});

await graphqlServer.start();
console.log('GraphQL server running on port 5000');
```

## Docker Setup

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN yarn build

# Expose ports
EXPOSE 4000 5000

# Start command
CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  agent-system:
    build: .
    ports:
      - "4000:4000"  # API
      - "5000:5000"  # GraphQL
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MONGODB_URI=mongodb://mongo:27017/wasteer
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=password
    depends_on:
      - mongo
      - neo4j

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  neo4j:
    image: neo4j:5
    ports:
      - "7687:7687"
      - "7474:7474"
    environment:
      - NEO4J_AUTH=neo4j/password
    volumes:
      - neo4j-data:/data

volumes:
  mongo-data:
  neo4j-data:
```

## Troubleshooting

### Common Issues

#### 1. LLM Provider Errors

**Issue**: `OPENAI_API_KEY not found`

**Solution**:
```bash
# Check environment
echo $OPENAI_API_KEY

# Set in .env file
echo "OPENAI_API_KEY=sk-..." >> .env

# Or export temporarily
export OPENAI_API_KEY=sk-...
```

#### 2. API Connection Errors

**Issue**: `ECONNREFUSED localhost:4000`

**Solution**:
```bash
# Check API is running
curl http://localhost:4000/health

# Start API if not running
yarn api:start

# Check MongoDB is running
mongosh --eval "db.version()"
```

#### 3. Tool Not Found

**Issue**: `Tool not found: shipments_list`

**Solution**:
```typescript
// Verify tools are registered
console.log('Registered tools:', mcpServer.getToolCount());

// Re-register if needed
registerAllTools(mcpServer, apiUrl);

// Check specific tool
console.log('Has shipments_list:', !!mcpServer.getTool('shipments_list'));
```

#### 4. Memory Connection Errors

**Issue**: `Neo4j connection failed`

**Solution**:
```bash
# Use mocks for development
const memory = new MemoryManager(config, mockNeo4j, mockPinecone);

# Or disable memory
const orchestrator = new OrchestratorAgent(
  planner, executor, analyzer, summarizer,
  null,  // No memory
  { enableMemory: false }
);
```

## Production Deployment

### Environment Variables

```bash
# Production .env
NODE_ENV=production
API_PORT=4000

# LLM
OPENAI_API_KEY=sk-prod-...
LLM_PROVIDER=openai
LLM_MODEL=gpt-4

# Database
MONGODB_URI=mongodb://prod-host:27017/wasteer

# Memory (optional but recommended)
NEO4J_URI=bolt://neo4j-prod:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secure-password

PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX=wasteer-production

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Health Checks

```typescript
// Add health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: await checkAPI(),
      llm: await checkLLM(),
      memory: await checkMemory(),
      agents: await checkAgents()
    }
  };
  
  const allHealthy = Object.values(health.services).every(s => s.status === 'ok');
  res.status(allHealthy ? 200 : 503).json(health);
});
```

### Monitoring

```typescript
// Log all queries and responses
orchestrator.on('query_complete', (requestId, duration, success) => {
  logger.info('Query completed', {
    requestId,
    duration,
    success,
    timestamp: new Date().toISOString()
  });
});

// Track errors
orchestrator.on('query_error', (requestId, error) => {
  logger.error('Query failed', {
    requestId,
    error: error.message,
    stack: error.stack
  });
});
```

## Testing Your Integration

```bash
# Run unit tests
yarn test

# Run integration tests
yarn test:integration

# Run your custom tests
yarn jest your-integration.test.ts
```

## Next Steps

- [Overview](./overview.md) - Understand the complete system
- [Planner Agent](./planner.md) - Configure query planning
- [Executor Agent](./executor.md) - Optimize execution
- [Analyzer Agent](./analyzer.md) - Customize analysis
- [Summarizer Agent](./summarizer.md) - Control response format
- [GraphQL API](./graphql-api.md) - Use GraphQL interface
- [Testing Guide](./testing.md) - Write and run tests

