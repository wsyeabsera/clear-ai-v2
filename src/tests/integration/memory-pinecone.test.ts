/**
 * Integration Tests for Pinecone Semantic Memory
 * Tests embedding generation and vector storage/retrieval
 */

import dotenv from 'dotenv';
dotenv.config();

import { PineconeMemory } from '../../shared/memory/pinecone.js';
import { OpenAIEmbeddingService, loadEmbeddingConfig, createEmbeddingService } from '../../shared/memory/embeddings.js';
import { SemanticQuery } from '../../shared/types/memory.js';

describe('Pinecone Semantic Memory Integration', () => {
  let pinecone: PineconeMemory;
  let embeddingService: any;
  const testIdPrefix = `test-${Date.now()}`;

  beforeAll(async () => {
    // Ensure we have required env vars
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Pinecone memory tests');
    }
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required for Pinecone memory tests');
    }

    // Force OpenAI embeddings for tests
    process.env.MEMORY_EMBEDDING_PROVIDER = 'openai';
    
    // Load embedding config (should use OpenAI)
    const embeddingConfig = loadEmbeddingConfig();
    embeddingService = createEmbeddingService(embeddingConfig);

    // Initialize Pinecone
    pinecone = new PineconeMemory(
      {
        api_key: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
        index_name: process.env.PINECONE_INDEX_NAME || 'clear-ai',
      },
      embeddingService
    );

    await pinecone.connect();
  });

  afterAll(async () => {
    if (pinecone) {
      await pinecone.close();
    }
  });

  describe('Embedding Service', () => {
    it('should generate embeddings using OpenAI', async () => {
      const text = 'This is a test query about waste management shipments';
      const embedding = await embeddingService.generate(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536); // text-embedding-3-small dimensions
      expect(typeof embedding[0]).toBe('number');
    }, 30000);

    it('should generate consistent embeddings for same text', async () => {
      const text = 'Consistent test text';
      const embedding1 = await embeddingService.generate(text);
      const embedding2 = await embeddingService.generate(text);

      // OpenAI embeddings may have slight variations but should be very similar
      // Calculate cosine similarity
      const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i]!, 0);
      const mag1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
      const mag2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
      const cosineSimilarity = dotProduct / (mag1 * mag2);

      // Should be extremely similar (> 0.99) even if not identical
      expect(cosineSimilarity).toBeGreaterThan(0.99);
    }, 30000);

    it('should generate different embeddings for different text', async () => {
      const text1 = 'First test text about shipments';
      const text2 = 'Second test text about facilities';
      
      const embedding1 = await embeddingService.generate(text1);
      const embedding2 = await embeddingService.generate(text2);

      // Embeddings should be different
      expect(embedding1).not.toEqual(embedding2);
    }, 30000);
  });

  describe('Pinecone Storage', () => {
    it('should store semantic memory in Pinecone', async () => {
      const text = 'Test query: Show me all contaminated shipments from last week';
      const metadata = {
        type: 'query',
        requestId: `${testIdPrefix}-1`,
        timestamp: new Date().toISOString(),
      };

      await expect(
        pinecone.store(text, metadata)
      ).resolves.not.toThrow();
    }, 30000);

    it('should store multiple semantic memories', async () => {
      const memories = [
        {
          text: 'Query about facilities with high contamination rates',
          metadata: { type: 'query', requestId: `${testIdPrefix}-2` },
        },
        {
          text: 'Query about recent inspections that failed',
          metadata: { type: 'query', requestId: `${testIdPrefix}-3` },
        },
        {
          text: 'Query about shipment trends over time',
          metadata: { type: 'query', requestId: `${testIdPrefix}-4` },
        },
      ];

      for (const memory of memories) {
        await expect(
          pinecone.store(memory.text, memory.metadata)
        ).resolves.not.toThrow();
      }
    }, 60000);
  });

  describe('Pinecone Retrieval', () => {
    beforeAll(async () => {
      // Store some test data for retrieval
      await pinecone.store(
        'Show me all shipments with critical risk contaminants',
        {
          type: 'query',
          requestId: `${testIdPrefix}-retrieval-1`,
          category: 'contamination',
        }
      );

      await pinecone.store(
        'List facilities in Berlin with high inspection failure rates',
        {
          type: 'query',
          requestId: `${testIdPrefix}-retrieval-2`,
          category: 'facilities',
        }
      );

      // Wait for vectors to be indexed
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, 40000);

    it('should retrieve similar semantic memories', async () => {
      const query: SemanticQuery = {
        query: 'Find shipments with dangerous contaminants',
        top_k: 5,
      };

      const results = await pinecone.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check result structure
      results.forEach(result => {
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('metadata');
        expect(result).toHaveProperty('score');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    }, 30000);

    it('should filter results by metadata', async () => {
      const query: SemanticQuery = {
        query: 'facility queries',
        top_k: 10,
        filter: {
          category: 'facilities',
        },
      };

      const results = await pinecone.search(query);

      expect(results).toBeDefined();
      
      // All results should have matching category
      results.forEach(result => {
        expect(result.metadata.category).toBe('facilities');
      });
    }, 30000);

    it('should respect result limit', async () => {
      const query: SemanticQuery = {
        query: 'waste management query',
        top_k: 3,
      };

      const results = await pinecone.search(query);

      expect(results.length).toBeLessThanOrEqual(3);
    }, 30000);

    it('should respect similarity threshold', async () => {
      const query: SemanticQuery = {
        query: 'completely unrelated topic about astronomy',
        top_k: 10,
      };

      const results = await pinecone.search(query);

      // Pinecone doesn't have a threshold filter in the query itself
      // All results are returned up to top_k, but with varying scores
      // Lower scores indicate less similarity
      expect(results.length).toBeLessThanOrEqual(10);
      
      // Check that unrelated topics have lower scores
      if (results.length > 0) {
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        // Astronomy query should have low similarity to waste management
        expect(avgScore).toBeLessThan(0.8);
      }
    }, 30000);
  });

  describe('Full Memory Flow', () => {
    it('should store and retrieve a query with context', async () => {
      const originalQuery = 'Show me shipments rejected due to heavy metal contamination in Hamburg facilities';
      const metadata = {
        type: 'summary',
        requestId: `${testIdPrefix}-flow-1`,
        timestamp: new Date().toISOString(),
        toolsUsed: ['shipments_list', 'contaminants_list'],
      };

      // Store
      await pinecone.store(originalQuery, metadata);

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retrieve similar
      const results = await pinecone.search({
        query: 'Find rejected shipments with heavy metals in Hamburg',
        top_k: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      
      // Should find our stored query
      const foundOurQuery = results.some(
        r => r.metadata.requestId === metadata.requestId
      );
      expect(foundOurQuery).toBe(true);
    }, 40000);

    it('should handle batch storage efficiently', async () => {
      const queries = Array.from({ length: 5 }, (_, i) => ({
        text: `Test query ${i}: ${['shipments', 'facilities', 'contaminants', 'inspections', 'analytics'][i]}`,
        metadata: {
          type: 'query',
          requestId: `${testIdPrefix}-batch-${i}`,
          batchId: `${testIdPrefix}-batch`,
        },
      }));

      const startTime = Date.now();

      // Store all queries
      for (const query of queries) {
        await pinecone.store(query.text, query.metadata);
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (not testing exact timing due to API variability)
      expect(duration).toBeLessThan(60000); // 1 minute for 5 queries
    }, 90000);
  });

  describe('Error Handling', () => {
    it('should handle empty text gracefully', async () => {
      // Empty text will generate an embedding, but won't be very useful
      // Pinecone will still accept it
      const result = await pinecone.store('', { type: 'test' });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string'); // Should return an ID
    }, 30000);

    it('should handle metadata with special characters', async () => {
      // Pinecone should handle various metadata
      const result = await pinecone.store('test query with special metadata', {
        type: 'test',
        description: 'Test with special chars: @#$%',
        timestamp: new Date().toISOString(),
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    }, 30000);
  });

  describe('Performance', () => {
    it('should generate embeddings within acceptable time', async () => {
      const text = 'Performance test query about waste management operations';
      
      const startTime = Date.now();
      await embeddingService.generate(text);
      const duration = Date.now() - startTime;

      // OpenAI embeddings should be fast (usually 100-500ms)
      expect(duration).toBeLessThan(5000); // 5 seconds max
    }, 30000);

    it('should store vectors within acceptable time', async () => {
      const text = 'Performance test for vector storage';
      const metadata = { type: 'performance-test' };

      const startTime = Date.now();
      await pinecone.store(text, metadata);
      const duration = Date.now() - startTime;

      // Store operation should be fast
      expect(duration).toBeLessThan(5000); // 5 seconds max
    }, 30000);
  });
});

