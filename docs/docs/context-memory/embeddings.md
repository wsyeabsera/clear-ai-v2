---
sidebar_position: 3
---

# Embeddings

Embeddings convert text into vector representations that capture semantic meaning, enabling similarity search and semantic memory. Clear AI v2 supports both local (Ollama) and cloud (OpenAI) embedding providers, prioritizing privacy and flexibility.

## What Problem Does This Solve?

**The Problem:** Traditional search uses exact keyword matching:
- "Show contaminated shipments" ≠ "Display polluted cargo"
- Can't find semantically similar content
- Misses context and meaning
- No fuzzy matching

**The Solution:** Embeddings represent meaning as vectors:
- Similar meanings = similar vectors
- "contaminated shipments" ≈ "polluted cargo" (high similarity)
- Enables semantic search
- Understands context

## How Embeddings Work

```
Text → Embedding Model → Vector (array of numbers)

"Show shipments" → [0.12, -0.34, 0.56, ..., 0.23] (768 dimensions)
"Display cargo"  → [0.14, -0.31, 0.59, ..., 0.25] (similar vector!)

Similarity Score: 0.94 (very similar)
```

## Supported Providers

### 1. Ollama (Recommended)

**Local, privacy-focused, free**

```typescript
import { OllamaEmbeddingService } from 'clear-ai-v2/shared';

const embeddings = new OllamaEmbeddingService({
  model: 'nomic-embed-text',
  baseUrl: 'http://localhost:11434'
});

const vector = await embeddings.generateEmbedding(
  "Show me contaminated shipments"
);

console.log(vector.length);  // 768 dimensions
console.log(vector[0]);      // 0.123456
```

**Pros:**
- ✅ Free (no API costs)
- ✅ Private (data never leaves your machine)
- ✅ Fast (~100ms)
- ✅ No rate limits

**Cons:**
- Requires Ollama installed locally
- Slightly lower quality than OpenAI

### 2. OpenAI

**Cloud-based, high quality**

```typescript
import { OpenAIEmbeddingService } from 'clear-ai-v2/shared';

const embeddings = new OpenAIEmbeddingService({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small'
});

const vector = await embeddings.generateEmbedding(
  "Show me contaminated shipments"
);

console.log(vector.length);  // 1536 dimensions
```

**Pros:**
- ✅ Highest quality embeddings
- ✅ No local setup needed
- ✅ Latest models

**Cons:**
- 💰 Costs $0.0001 per 1K tokens
- 🌐 Requires internet
- 📤 Data sent to OpenAI

## Basic Usage

```typescript
import { loadEmbeddingConfig } from 'clear-ai-v2/shared';

// Auto-detects from environment
const config = loadEmbeddingConfig();

console.log(config.provider);  // 'ollama' or 'openai'
console.log(config.model);     // 'nomic-embed-text'

// Generate embedding
const embedding = await config.service.generateEmbedding(
  "Your text here"
);

// Generate batch
const embeddings = await config.service.generateEmbeddings([
  "Text 1",
  "Text 2",
  "Text 3"
]);
```

## Configuration

### Ollama Setup

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull embedding model
ollama pull nomic-embed-text

# .env configuration
MEMORY_EMBEDDING_PROVIDER=ollama
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768
OLLAMA_URL=http://localhost:11434
```

### OpenAI Setup

```bash
# .env configuration
MEMORY_EMBEDDING_PROVIDER=openai
MEMORY_EMBEDDING_MODEL=text-embedding-3-small
MEMORY_EMBEDDING_DIMENSIONS=1536
OPENAI_API_KEY=sk-...
```

## Integration with Pinecone

```typescript
import { 
  PineconeMemory,
  loadEmbeddingConfig 
} from 'clear-ai-v2/shared';

const config = loadEmbeddingConfig();

const pinecone = new PineconeMemory({
  apiKey: process.env.PINECONE_API_KEY,
  index: process.env.PINECONE_INDEX,
  embeddingService: config.service  // Inject embedding service
});

// Store with automatic embedding
await pinecone.storeMemory({
  id: 'memory_1',
  text: 'User prefers weekly reports',  // Automatically embedded
  metadata: { userId: 'user_123' }
});

// Search with automatic embedding
const results = await pinecone.search(
  'When does user want reports?',  // Query automatically embedded
  { limit: 5 }
);
```

## Similarity Calculation

```typescript
import { cosineSimilarity } from 'clear-ai-v2/shared';

const embedding1 = await service.generateEmbedding("contaminated shipments");
const embedding2 = await service.generateEmbedding("polluted cargo");
const embedding3 = await service.generateEmbedding("sunny weather");

console.log(cosineSimilarity(embedding1, embedding2));  // 0.89 (similar!)
console.log(cosineSimilarity(embedding1, embedding3));  // 0.12 (different)
```

**Similarity Scale:**
- 0.9-1.0: Very similar (nearly identical)
- 0.7-0.9: Similar (related topics)
- 0.5-0.7: Somewhat related
- 0.0-0.5: Different
- Below 0.0: Opposite

## Real-World Example

Semantic search implementation:

```typescript
import {
  loadEmbeddingConfig,
  PineconeMemory
} from 'clear-ai-v2/shared';

class SemanticSearch {
  private embeddings: EmbeddingService;
  private pinecone: PineconeMemory;
  
  async initialize() {
    const config = loadEmbeddingConfig();
    this.embeddings = config.service;
    
    this.pinecone = new PineconeMemory({
      apiKey: process.env.PINECONE_API_KEY,
      index: process.env.PINECONE_INDEX,
      embeddingService: this.embeddings
    });
    
    await this.pinecone.connect();
  }
  
  async indexDocuments(documents: Array<{id: string, text: string}>) {
    for (const doc of documents) {
      await this.pinecone.storeMemory({
        id: doc.id,
        text: doc.text,
        metadata: { indexedAt: new Date() }
      });
    }
  }
  
  async search(query: string, options = {}) {
    const results = await this.pinecone.search(query, {
      limit: 10,
      minScore: 0.7,  // Only show good matches
      ...options
    });
    
    return results.map(r => ({
      id: r.id,
      text: r.text,
      similarity: r.score,
      isHighConfidence: r.score > 0.85
    }));
  }
}

// Usage
const search = new SemanticSearch();
await search.initialize();

// Index documents
await search.indexDocuments([
  { id: '1', text: 'Shipment contains hazardous materials' },
  { id: '2', text: 'Facility processes plastic waste' },
  { id: '3', text: 'Contamination detected in cargo' }
]);

// Semantic search
const results = await search.search('dangerous substances in shipment');

// Finds document 1 and 3 even though exact words don't match
console.log(results);
// [
//   { id: '1', text: 'Shipment contains hazardous materials', similarity: 0.91 },
//   { id: '3', text: 'Contamination detected in cargo', similarity: 0.78 }
// ]
```

## Model Comparison

| Feature | Ollama (nomic-embed-text) | OpenAI (text-embedding-3-small) |
|---------|---------------------------|----------------------------------|
| **Dimensions** | 768 | 1536 |
| **Speed** | ~100ms | ~200ms |
| **Cost** | Free | $0.0001/1K tokens |
| **Privacy** | 100% local | Cloud |
| **Quality** | Good | Excellent |
| **Setup** | Requires Ollama | Just API key |
| **Rate Limits** | None | Yes |
| **Best For** | Privacy, cost | Quality, scale |

## Testing

```bash
# Test embedding generation
yarn test embeddings.test.ts

# Test integration with Pinecone
yarn test:integration pinecone
```

## Best Practices

### 1. Choose Provider Based on Needs

```typescript
// ✅ Privacy-sensitive data
provider: 'ollama'

// ✅ Maximum quality needed
provider: 'openai'

// ✅ High volume, cost-sensitive
provider: 'ollama'
```

### 2. Batch When Possible

```typescript
// ❌ Don't generate one at a time
for (const text of texts) {
  await service.generateEmbedding(text);
}

// ✅ Batch for efficiency
const embeddings = await service.generateEmbeddings(texts);
```

### 3. Cache Embeddings

```typescript
const cache = new Map();

async function getEmbedding(text: string) {
  if (cache.has(text)) {
    return cache.get(text);
  }
  
  const embedding = await service.generateEmbedding(text);
  cache.set(text, embedding);
  return embedding;
}
```

### 4. Set Appropriate Similarity Thresholds

```typescript
// ❌ Too low = irrelevant results
minScore: 0.3

// ✅ Good balance
minScore: 0.7  // For general search
minScore: 0.85 // For high precision
```

## Performance

**Ollama (Local):**
- Single embedding: ~100ms
- Batch (10): ~500ms
- Throughput: ~10/second
- Memory: ~2GB (model loaded)

**OpenAI:**
- Single embedding: ~200ms
- Batch (10): ~300ms
- Throughput: Limited by rate limits
- No local memory needed

## Troubleshooting

### Ollama Not Available

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Pull model if needed
ollama pull nomic-embed-text
```

### OpenAI Rate Limits

```typescript
// Implement retry with backoff
async function generateWithRetry(text: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await service.generateEmbedding(text);
    } catch (error) {
      if (error.status === 429) {
        await sleep(1000 * Math.pow(2, i));  // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

## Related Modules

- [**Memory Systems**](./memory-systems.md) - Uses embeddings for semantic search
- [**Context Management**](./context-management.md) - May use embeddings for similarity
- [**Configuration**](../infrastructure/configuration.md) - Embedding configuration

---

**Next:** [Workflow Graphs](../workflows/workflow-graphs.md) - Multi-step process orchestration
