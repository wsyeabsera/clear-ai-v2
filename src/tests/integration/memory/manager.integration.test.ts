/**
 * Memory Manager Integration Tests
 * Tests real combined Neo4j + Pinecone operations
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import axios from 'axios';
import { MemoryManager } from '../../../shared/memory/manager.js';
import { EpisodicEvent, EventType } from '../../../shared/types/memory.js';

// Load environment variables
dotenv.config();

// Check if Neo4j is available
async function isNeo4jAvailable(): Promise<boolean> {
  try {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || '';
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    await driver.verifyConnectivity();
    await driver.close();
    return true;
  } catch {
    return false;
  }
}

// Check if Ollama is running
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Check if Pinecone is configured
function isPineconeConfigured(): boolean {
  return !!(
    process.env.PINECONE_API_KEY &&
    process.env.PINECONE_INDEX
  );
}

const neo4jAvailable = await isNeo4jAvailable();
const ollamaAvailable = await isOllamaAvailable();
const pineconeConfigured = isPineconeConfigured();
const allReady = neo4jAvailable && ollamaAvailable && pineconeConfigured;

const describeIfReady = allReady ? describe : describe.skip;

describeIfReady('Memory Manager Integration', () => {
  let manager: MemoryManager;
  
  beforeAll(async () => {
    if (!allReady) {
      if (!neo4jAvailable) {
        console.log('⚠️  Neo4j not available');
      }
      if (!ollamaAvailable) {
        console.log('⚠️  Ollama not available');
      }
      if (!pineconeConfigured) {
        console.log('⚠️  Pinecone not configured');
      }
      console.log('⚠️  Skipping Memory Manager integration tests');
      return;
    }
    
    manager = new MemoryManager({
      neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        user: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || '',
      },
      pinecone: {
        api_key: process.env.PINECONE_API_KEY!,
        environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
        index_name: process.env.PINECONE_INDEX!,
      },
    });
    
    await manager.connect();
  });
  
  afterAll(async () => {
    if (manager && manager.isConnected()) {
      await cleanupAll();
      await manager.close();
    }
  });
  
  beforeEach(async () => {
    await cleanupAll();
  });
  
  /**
   * Helper to clean up all test data
   */
  async function cleanupAll(): Promise<void> {
    if (!manager || !manager.isConnected()) {
      return;
    }
    
    try {
      // Clean up Neo4j
      const neo4jDriver = neo4j.driver(
        process.env.NEO4J_URI || 'bolt://localhost:7687',
        neo4j.auth.basic(
          process.env.NEO4J_USER || 'neo4j',
          process.env.NEO4J_PASSWORD || ''
        )
      );
      
      const session = neo4jDriver.session();
      try {
        await session.run(`
          MATCH (e:Event)
          WHERE e.id STARTS WITH 'test_'
          DETACH DELETE e
        `);
      } finally {
        await session.close();
        await neo4jDriver.close();
      }
      
      // Clean up Pinecone - search for test records and delete
      const results = await manager.search({
        query: 'test cleanup',
        top_k: 100,
        filter: {
          test: { $eq: true },
        },
      });
      
      if (results.length > 0) {
        const ids = results.map(r => r.id);
        await manager.deleteSemanticMany(ids);
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }
  
  describe('Real Combined Operations', () => {
    it('should store request memory in both systems', async () => {
      const requestId = 'test_req_1';
      const query = 'Show me all contaminated shipments from last month';
      const toolResults = [
        {
          success: true,
          tool: 'shipments',
          data: { count: 5, shipments: [] },
          metadata: {
            executionTime: 100,
            timestamp: new Date().toISOString(),
          },
        },
      ];
      
      await manager.storeRequestMemory(requestId, query, toolResults);
      
      // Verify episodic memory (Neo4j)
      const event = await manager.getEpisodicEvent(requestId);
      expect(event).toBeDefined();
      expect(event?.data.query).toBe(query);
      
      // Verify semantic memory (Pinecone)
      const similar = await manager.findSimilarRequests(query, 1);
      expect(similar.length).toBeGreaterThan(0);
    }, 30000);
    
    it('should find similar requests', async () => {
      // Store multiple requests
      await manager.storeRequestMemory(
        'test_req_2',
        'Find all shipments with high contamination',
        []
      );
      
      await manager.storeRequestMemory(
        'test_req_3',
        'Show facilities processing plastic waste',
        []
      );
      
      await manager.storeRequestMemory(
        'test_req_4',
        'List shipments with contamination issues',
        []
      );
      
      // Search for similar
      const similar = await manager.findSimilarRequests(
        'contaminated shipments query',
        2
      );
      
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0]?.score).toBeGreaterThan(0);
    }, 30000);
    
    it('should store and retrieve tool executions', async () => {
      const toolResult = {
        success: true,
        tool: 'shipments',
        data: { count: 10 },
        metadata: {
          executionTime: 150,
          timestamp: new Date().toISOString(),
        },
      };
      
      await manager.storeToolExecution(
        'test_tool_1',
        'shipments',
        { status: 'delivered' },
        toolResult,
        'test_req_5'
      );
      
      const event = await manager.getEpisodicEvent('test_tool_1');
      
      expect(event).toBeDefined();
      expect(event?.type).toBe('tool_call');
      expect(event?.data.tool).toBe('shipments');
    }, 30000);
    
    it('should store and retrieve insights', async () => {
      await manager.storeInsight(
        'test_insight_1',
        'High contamination rate detected in plastic shipments',
        {
          type: 'trend',
          confidence: 0.85,
          affected_types: ['plastic'],
        },
        'test_req_6'
      );
      
      // Check episodic storage
      const event = await manager.getEpisodicEvent('test_insight_1');
      expect(event).toBeDefined();
      expect(event?.type).toBe('insight');
      
      // Check semantic storage
      const similar = await manager.search({
        query: 'contamination in plastic waste',
        top_k: 5,
      });
      
      const insight = similar.find(r => r.id === 'test_insight_1');
      expect(insight).toBeDefined();
    }, 30000);
    
    it('should get request context', async () => {
      // Store a request with tool execution
      const requestId = 'test_req_7';
      await manager.storeRequestMemory(requestId, 'Test query', []);
      await manager.storeToolExecution(
        'test_tool_2',
        'test_tool',
        {},
        {
          success: true,
          tool: 'test',
          data: {},
          metadata: {
            executionTime: 100,
            timestamp: new Date().toISOString(),
          },
        },
        requestId
      );
      
      const context = await manager.getRequestContext(requestId);
      
      expect(context.episodic).toBeDefined();
      expect(context.episodic?.id).toBe(requestId);
      expect(context.similar).toBeDefined();
      expect(Array.isArray(context.similar)).toBe(true);
    }, 30000);
    
    it('should handle concurrent operations across both systems', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        manager.storeRequestMemory(
          `test_req_concurrent_${i}`,
          `Test query ${i}`,
          []
        )
      );
      
      await Promise.all(promises);
      
      // Verify all stored in Neo4j
      for (let i = 0; i < 3; i++) {
        const event = await manager.getEpisodicEvent(`test_req_concurrent_${i}`);
        expect(event).toBeDefined();
      }
      
      // Verify in Pinecone
      const similar = await manager.search({
        query: 'test query',
        top_k: 10,
      });
      
      const concurrentRecords = similar.filter(r => 
        r.id.startsWith('test_req_concurrent_')
      );
      expect(concurrentRecords.length).toBeGreaterThanOrEqual(3);
    }, 30000);
  });
});

