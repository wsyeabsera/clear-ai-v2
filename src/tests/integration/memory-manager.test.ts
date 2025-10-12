/**
 * Integration Tests for Memory Manager
 * Tests full memory system (Episodic + Semantic)
 */

import dotenv from 'dotenv';
dotenv.config();

import { MemoryManager } from '../../shared/memory/manager.js';
import { EpisodicEvent, SemanticQuery } from '../../shared/types/memory.js';

describe('Memory Manager Integration', () => {
  let memory: MemoryManager;
  const testIdPrefix = `test-${Date.now()}`;

  beforeAll(async () => {
    // Ensure we have required env vars
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for memory tests');
    }
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required for memory tests');
    }

    // Force OpenAI embeddings for tests
    process.env.MEMORY_EMBEDDING_PROVIDER = 'openai';

    // Initialize memory manager with production config
    memory = new MemoryManager({
      neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        user: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password',
      },
      pinecone: {
        api_key: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
        index_name: process.env.PINECONE_INDEX_NAME || 'clear-ai',
      },
    });

    await memory.connect();
  });

  afterAll(async () => {
    await memory.close();
  });

  describe('Combined Memory Operations', () => {
    it('should store both episodic and semantic memory for a query', async () => {
      const requestId = `${testIdPrefix}-combined-1`;
      
      // Store episodic event
      const event: EpisodicEvent = {
        id: requestId,
        type: 'request',
        timestamp: new Date().toISOString(),
        data: {
          query: 'Show me all contaminated shipments',
          plan: {
            steps: [
              { stepNumber: 1, toolName: 'shipments_list', parameters: { has_contaminants: true } },
            ],
          },
          results: [
            { success: true, data: { count: 12 } },
          ],
        },
      };

      await expect(
        memory.storeEpisodic(event)
      ).resolves.not.toThrow();

      // Store semantic memory
      const semanticText = 'Found 12 contaminated shipments requiring immediate attention';
      const metadata = {
        type: 'summary',
        requestId,
        toolsUsed: ['shipments_list'],
      };

      await expect(
        memory.storeSemantic(semanticText, metadata)
      ).resolves.not.toThrow();
    }, 30000);

    it('should retrieve episodic events by type', async () => {
      const requestId = `${testIdPrefix}-episodic-1`;
      
      const event: EpisodicEvent = {
        id: requestId,
        type: 'request',
        timestamp: new Date().toISOString(),
        data: {
          query: 'Test query for episodic retrieval',
        },
      };

      await memory.storeEpisodic(event);

      // Retrieve by type
      const events = await memory.queryEpisodic({
        type: 'request',
        limit: 10,
      });

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);

      // Should find our event
      const foundEvent = events.find(e => e.id === requestId);
      expect(foundEvent).toBeDefined();
      expect(foundEvent?.type).toBe('request');
    }, 30000);

    it('should retrieve semantic memories by similarity', async () => {
      const requestId = `${testIdPrefix}-semantic-1`;
      
      // Store a semantic memory
      await memory.storeSemantic(
        'Analysis of facility inspection failures in Berlin and Hamburg',
        {
          type: 'summary',
          requestId,
          category: 'facilities',
        }
      );

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Search for similar
      const query: SemanticQuery = {
        query: 'facility inspection problems in German cities',
        top_k: 5,
      };

      const results = await memory.querySemantic(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Should find similar content
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.7);
      });
    }, 35000);
  });

  describe('Context Loading', () => {
    beforeAll(async () => {
      // Store some historical context
      const contexts = [
        {
          episodic: {
            id: `${testIdPrefix}-context-1`,
            type: 'request',
            timestamp: new Date().toISOString(),
            data: { query: 'Previous query about contamination trends' },
          },
          semantic: {
            text: 'Historical data shows increasing contamination rates in Q3',
            metadata: {
              type: 'insight',
              requestId: `${testIdPrefix}-context-1`,
            },
          },
        },
        {
          episodic: {
            id: `${testIdPrefix}-context-2`,
            type: 'request',
            timestamp: new Date().toISOString(),
            data: { query: 'Previous query about facility performance' },
          },
          semantic: {
            text: 'Berlin facilities show better performance than Hamburg facilities',
            metadata: {
              type: 'insight',
              requestId: `${testIdPrefix}-context-2`,
            },
          },
        },
      ];

      for (const ctx of contexts) {
        await memory.storeEpisodic(ctx.episodic);
        await memory.storeSemantic(ctx.semantic.text, ctx.semantic.metadata);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }, 45000);

    it('should load relevant context for a new query', async () => {
      // Load context for a contamination-related query
      const queryText = 'What are the contamination trends this quarter?';
      
      const semanticResults = await memory.querySemantic({
        query: queryText,
        top_k: 5,
      });

      expect(semanticResults.length).toBeGreaterThan(0);
      
      // Should find contamination-related context (if any results)
      if (semanticResults.length > 0) {
        const hasContaminationContext = semanticResults.some(
          r => r.text.toLowerCase().includes('contamination')
        );
        expect(hasContaminationContext).toBe(true);
      }
    }, 30000);

    it('should load recent episodic events', async () => {
      const recentEvents = await memory.queryEpisodic({
        type: 'request',
        limit: 10,
        since: new Date(Date.now() - 60000).toISOString(), // Last minute
      });

      expect(recentEvents).toBeDefined();
      expect(Array.isArray(recentEvents)).toBe(true);
      
      // Should have events from our test
      expect(recentEvents.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Memory Persistence', () => {
    it('should persist memories across queries', async () => {
      const requestId1 = `${testIdPrefix}-persist-1`;
      const requestId2 = `${testIdPrefix}-persist-2`;

      // First query
      await memory.storeEpisodic({
        id: requestId1,
        type: 'request',
        timestamp: new Date().toISOString(),
        data: { query: 'First query about shipments' },
      });

      await memory.storeSemantic(
        'First query returned 50 shipments with various statuses',
        { type: 'summary', requestId: requestId1 }
      );

      // Second query (simulating a follow-up)
      await memory.storeEpisodic({
        id: requestId2,
        type: 'request',
        timestamp: new Date().toISOString(),
        data: { query: 'Follow-up query about those shipments' },
      });

      await memory.storeSemantic(
        'Follow-up analysis of the 50 shipments from previous query',
        { type: 'summary', requestId: requestId2 }
      );

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify both are retrievable
      const episodicEvents = await memory.queryEpisodic({
        type: 'request',
        limit: 10,
      });

      const hasFirst = episodicEvents.some(e => e.id === requestId1);
      const hasSecond = episodicEvents.some(e => e.id === requestId2);

      expect(hasFirst).toBe(true);
      expect(hasSecond).toBe(true);
    }, 40000);
  });

  describe('Memory Statistics', () => {
    it('should track memory usage', async () => {
      // Store some test data
      for (let i = 0; i < 3; i++) {
        await memory.storeEpisodic({
          id: `${testIdPrefix}-stats-${i}`,
          type: 'request',
          timestamp: new Date().toISOString(),
          data: { query: `Stats test query ${i}` },
        });

        await memory.storeSemantic(
          `Stats test result ${i}`,
          { type: 'test', requestId: `${testIdPrefix}-stats-${i}` }
        );
      }

      // Query to verify storage
      const events = await memory.queryEpisodic({
        type: 'request',
        limit: 100,
      });

      expect(events.length).toBeGreaterThanOrEqual(3);
    }, 45000);
  });

  describe('Error Recovery', () => {
    it('should handle connection errors gracefully', async () => {
      // Try to create a new manager with invalid config
      const badMemory = new MemoryManager({
        neo4j: {
          uri: 'bolt://invalid-host:7687',
          user: 'test',
          password: 'test',
        },
        pinecone: {
          api_key: 'invalid-key',
          environment: 'invalid',
          index_name: 'invalid',
        },
      });

      // Connection should fail but not crash
      await expect(
        badMemory.connect()
      ).rejects.toThrow();
    }, 30000);

    it('should handle malformed data gracefully', async () => {
      // Try to store invalid episodic data
      await expect(
        memory.storeEpisodic({
          id: '',
          type: 'invalid' as any,
          timestamp: 'not-a-date',
          data: null as any,
        })
      ).rejects.toThrow();
    });
  });
});

