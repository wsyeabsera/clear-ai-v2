---
sidebar_position: 1
---

# Environment Setup

Complete guide to setting up your development environment for Clear AI v2.

## Required Services

### 1. Node.js & Yarn

```bash
# Install Node.js 22+
https://nodejs.org/

# Verify
node --version  # v22.0.0+
corepack enable
```

### 2. AI Providers (Choose One or More)

#### OpenAI (Recommended)
```bash
# Get API key: https://platform.openai.com/
OPENAI_API_KEY=sk-...
```

#### Groq (Fast, Free Tier)
```bash
# Get API key: https://console.groq.com/
GROQ_API_KEY=gsk_...
```

#### Ollama (Local, Free)
```bash
# Install
curl https://ollama.ai/install.sh | sh

# Pull model
ollama pull llama3.2

# Pull embedding model
ollama pull nomic-embed-text

OLLAMA_URL=http://localhost:11434
```

## Optional Services

### MongoDB (For Tools & API)

```bash
# Install: https://www.mongodb.com/try/download/community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

MONGODB_URI=mongodb://localhost:27017/wasteer
```

### Neo4j (For Episodic Memory)

```bash
# Install: https://neo4j.com/download/

# Or use Docker
docker run -d -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/yourpassword \
  neo4j:latest

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=yourpassword
ENABLE_NEO4J=true
```

### Pinecone (For Semantic Memory)

```bash
# Sign up: https://www.pinecone.io/
# Create index with 768 dimensions (for Ollama) or 1536 (for OpenAI)

PINECONE_API_KEY=your-key
PINECONE_INDEX=clear-ai-memories
ENABLE_PINECONE=true
```

### Langfuse (For Observability)

```bash
# Sign up: https://langfuse.com/

LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
```

## Complete .env File

```bash
# ===== AI PROVIDERS =====
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
OLLAMA_URL=http://localhost:11434

DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-3.5-turbo
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=2000

# ===== EMBEDDINGS =====
MEMORY_EMBEDDING_PROVIDER=ollama
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768

# ===== MEMORY =====
ENABLE_NEO4J=false
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

ENABLE_PINECONE=false
PINECONE_API_KEY=...
PINECONE_INDEX=clear-ai-memories

# ===== DATABASE =====
MONGODB_URI=mongodb://localhost:27017/wasteer

# ===== OBSERVABILITY =====
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...

# ===== API =====
WASTEER_API_URL=http://localhost:4000
API_PORT=4000

# ===== GENERAL =====
NODE_ENV=development
LOG_LEVEL=info
```

## Verify Setup

```bash
yarn install
yarn build
yarn test
yarn test:llm  # Test LLM providers
```

---

**Next:** [Testing Guide](./testing.md)
