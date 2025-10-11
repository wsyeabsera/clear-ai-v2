---
sidebar_position: 2
---

# Getting Started

Get up and running with Clear AI v2 in minutes. This guide will walk you through installation, setup, and verifying everything works.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 22+** installed ([download here](https://nodejs.org/))
- **Yarn Berry (v4+)** package manager
- At least one AI provider account:
  - [OpenAI API key](https://platform.openai.com/) (recommended for production)
  - [Groq API key](https://console.groq.com/) (fast, free tier available)
  - [Ollama](https://ollama.ai/) running locally (privacy-focused, free)

### Optional Services

For advanced features, you may want:

- **Neo4j** (episodic memory) - [Download](https://neo4j.com/download/)
- **Pinecone** (semantic memory) - [Sign up](https://www.pinecone.io/)
- **MongoDB** (tools & API) - [Download](https://www.mongodb.com/try/download/community)
- **Langfuse** (observability) - [Sign up](https://langfuse.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/clear-ai/clear-ai-v2.git
cd clear-ai-v2
```

### 2. Install Dependencies

```bash
yarn install
```

This will install all required packages including:
- TypeScript, Jest (testing)
- OpenAI, Axios (AI providers)
- Neo4j, Pinecone, Mongoose (databases)
- Express (API server)
- And more...

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# ===== AI PROVIDERS (at least one required) =====

# OpenAI (recommended for production)
OPENAI_API_KEY=sk-...

# Groq (fast, free tier)
GROQ_API_KEY=gsk_...

# Ollama (local, privacy-focused)
OLLAMA_URL=http://localhost:11434

# Default LLM configuration
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-3.5-turbo
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=2000

# ===== EMBEDDINGS (for memory systems) =====

# Using Ollama (recommended, free, private)
MEMORY_EMBEDDING_PROVIDER=ollama
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768

# OR using OpenAI
# MEMORY_EMBEDDING_PROVIDER=openai
# MEMORY_EMBEDDING_MODEL=text-embedding-3-small
# MEMORY_EMBEDDING_DIMENSIONS=1536

# ===== MEMORY SYSTEMS (optional) =====

# Neo4j (episodic memory - conversation flow)
ENABLE_NEO4J=false
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Pinecone (semantic memory - searchable knowledge)
ENABLE_PINECONE=false
PINECONE_API_KEY=...
PINECONE_INDEX=clear-ai-memories

# ===== DATABASE (for tools & API) =====

MONGODB_URI=mongodb://localhost:27017/wasteer

# ===== OBSERVABILITY (optional) =====

# Langfuse (production debugging)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# ===== API CONFIGURATION =====

WASTEER_API_URL=https://api.wasteer.dev
API_PORT=4000

# ===== GENERAL =====

NODE_ENV=development
LOG_LEVEL=info
```

:::tip
Start with just one AI provider (OpenAI or Ollama) to get going quickly. You can add memory systems and observability later.
:::

## Verify Installation

### 1. Build the Project

```bash
yarn build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 2. Run Tests

```bash
# Run all unit tests (724 tests)
yarn test

# Expected output:
# Test Suites: 44 passed, 44 total
# Tests:       724 passed, 724 total
```

All tests should pass! ✅

### 3. Test LLM Providers

Verify your AI providers are working:

```bash
yarn test:llm
```

This will test each configured provider (OpenAI, Groq, Ollama) and show which ones are available.

**Expected output:**
```
✓ OpenAI: Available (gpt-3.5-turbo)
✓ Groq: Available (llama-3.1-70b-versatile)
✓ Ollama: Available (llama3.2:latest)
```

:::info
If a provider shows as unavailable, check your API key or service status.
:::

## Quick Start: Your First Agent

Now let's create a simple conversational agent to verify everything works.

Create `my-first-agent.ts`:

```typescript
import {
  ResponseBuilder,
  IntentClassifier,
  ConfidenceScorer,
  LLMProvider,
} from './src/shared/index.js';

async function simpleAgent(userMessage: string) {
  // 1. Detect user intent
  const classifier = new IntentClassifier();
  const intent = classifier.classify(userMessage);
  
  console.log(`User intent: ${intent.intent}`);
  
  // 2. Handle different intents
  if (intent.intent === 'question') {
    // User is asking a question
    return ResponseBuilder.answer(
      "I'm a demo agent. I can help you understand Clear AI v2!",
      { helpful: true }
    );
  }
  
  if (intent.intent === 'confirmation') {
    // User said yes/no
    return ResponseBuilder.acknowledge("Got it!");
  }
  
  // 3. For queries, use LLM
  const llm = new LLMProvider();
  const llmResponse = await llm.chat([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage }
  ]);
  
  // 4. Calculate confidence
  const scorer = new ConfidenceScorer();
  const confidence = 0.85; // In real scenario, calculate based on data quality
  
  // 5. Return response with confidence
  return ResponseBuilder.withConfidence(
    ResponseBuilder.answer(llmResponse, { source: 'llm' }),
    confidence
  );
}

// Test it
const response = await simpleAgent("What can you do?");
console.log('Agent response:', response);
```

Run it:

```bash
yarn build
node dist/my-first-agent.js
```

**You should see:**
```
User intent: question
Agent response: {
  type: 'answer',
  content: "I'm a demo agent. I can help you understand Clear AI v2!",
  data: { helpful: true },
  requiresInput: false
}
```

🎉 **Congratulations!** You've successfully set up Clear AI v2 and created your first conversational agent.

## Project Structure

Here's what you're working with:

```
clear-ai-v2/
├── src/
│   ├── shared/              # 🎯 The shared library (19 modules)
│   │   ├── conversational/  # Response, Intent, Confidence, Progress
│   │   ├── context/         # Context management & compression
│   │   ├── workflow/        # State graphs & execution
│   │   ├── tokens/          # Token counting & budgets
│   │   ├── memory/          # Neo4j + Pinecone
│   │   ├── llm/             # Multi-provider LLM interface
│   │   ├── observability/   # Langfuse tracing
│   │   ├── types/           # TypeScript types
│   │   ├── validation/      # Zod schemas
│   │   ├── utils/           # Utilities
│   │   └── config/          # Configuration
│   ├── tools/               # MCP tools (Shipments, Facilities, etc.)
│   ├── api/                 # REST API server
│   ├── mcp/                 # MCP server
│   └── tests/               # 724 unit + 45 integration tests
├── dist/                    # Compiled JavaScript
├── docs/                    # 📚 This documentation site
└── package.json
```

## Available Commands

```bash
# Development
yarn build              # Compile TypeScript
yarn dev                # Build and run main
yarn api:dev            # Build and run API server

# Testing
yarn test               # Run unit tests (724 tests)
yarn test:integration   # Run integration tests (45 tests)
yarn test:all           # Run all tests
yarn test:coverage      # Generate coverage report
yarn test:watch         # Watch mode

# API Server
yarn api:start          # Start API server (port 4000)
yarn seed               # Seed database with sample data

# Utilities
yarn lint               # Type check without emitting
yarn test:llm           # Test LLM provider connections
```

## Common Issues

### Issue: Tests Failing

**Solution:** Make sure you've built the project first:
```bash
yarn build
yarn test
```

### Issue: "Provider not available"

**Solution:** Check your API keys in `.env`:
- Verify the key is correct
- Check you have credits/quota remaining
- For Ollama, ensure it's running (`ollama serve`)

### Issue: Memory/Database Connection Errors

**Solution:** If you're not using memory systems yet, disable them in `.env`:
```bash
ENABLE_NEO4J=false
ENABLE_PINECONE=false
```

### Issue: Port 4000 Already in Use

**Solution:** Change the API port in `.env`:
```bash
API_PORT=4001
```

## What's Next?

Now that you're set up, dive deeper:

- 📖 [**Core Concepts**](./core-concepts.md) - Understand the key ideas (plain language)
- 🏗️ [**Architecture**](./architecture.md) - See how everything fits together
- 💬 [**Conversational AI**](./conversational/response-system.md) - Build natural conversations
- 🧠 [**Context Management**](./context-memory/context-management.md) - Handle long conversations
- 🔄 [**Workflows**](./workflows/workflow-graphs.md) - Create complex logic flows

---

**Need help?** Check our [guides](./guides/environment-setup.md) or report issues on [GitHub](https://github.com/clear-ai/clear-ai-v2/issues).

