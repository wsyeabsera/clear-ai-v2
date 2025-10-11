/**
 * Memory Manager tests
 * 
 * Uses mock implementations via dependency injection
 */

import { MemoryManager } from '../../../shared/memory/manager.js';
import { Neo4jMemory } from '../../../shared/memory/neo4j.js';
import { PineconeMemory } from '../../../shared/memory/pinecone.js';
import { mockEpisodicEvent, mockToolResults } from '../fixtures/shared-test-data.js';
import {
  MockNeo4jDriver,
  MockPineconeClient,
  MockEmbeddingService,
} from '../fixtures/memory-mocks.js';

describe('MemoryManager', () => {
  let manager: MemoryManager;
  
  beforeEach(() => {
    // Create mocked memory instances
    const mockNeo4jDriver = new MockNeo4jDriver();
    const mockPinecone = new MockPineconeClient();
    const mockEmbeddingService = new MockEmbeddingService();
    
    const neo4jMemory = new Neo4jMemory(
      {
        uri: 'bolt://localhost:7687',
        user: 'neo4j',
        password: 'password',
      },
      mockNeo4jDriver
    );
    
    const pineconeMemory = new PineconeMemory(
      {
        api_key: 'test-key',
        environment: 'us-east-1',
        index_name: 'test-index',
      },
      mockEmbeddingService,
      mockPinecone
    );
    
    // Create manager with mocked instances
    manager = new MemoryManager(
      {
        neo4j: {
          uri: 'bolt://localhost:7687',
          user: 'neo4j',
          password: 'password',
        },
        pinecone: {
          api_key: 'test-key',
          environment: 'us-east-1',
          index_name: 'test-index',
        },
      },
      neo4jMemory,
      pineconeMemory
    );
  });
  
  afterEach(async () => {
    if (manager.isConnected()) {
      await manager.close();
    }
  });
  
  describe('connection', () => {
    it('should connect to both systems', async () => {
      await manager.connect();
      
      expect(manager.isConnected()).toBe(true);
    });
    
    it('should close both connections', async () => {
      await manager.connect();
      await manager.close();
      
      expect(manager.isConnected()).toBe(false);
    });
    
    it('should auto-connect if configured', () => {
      const autoManager = new MemoryManager({
        neo4j: {
          uri: 'bolt://localhost:7687',
          user: 'neo4j',
          password: 'password',
        },
        pinecone: {
          api_key: 'key',
          environment: 'env',
          index_name: 'index',
        },
        autoConnect: true,
      });
      
      // Auto-connect happens in background
      expect(autoManager).toBeDefined();
    });
  });
  
  describe('episodic memory operations', () => {
    it('should store episodic event', async () => {
      await manager.connect();
      
      await expect(
        manager.storeEpisodic(mockEpisodicEvent)
      ).resolves.not.toThrow();
    });
    
    it('should query episodic events', async () => {
      await manager.connect();
      
      const events = await manager.queryEpisodic({
        type: 'request',
        limit: 10,
      });
      
      expect(Array.isArray(events)).toBe(true);
    });
    
    it('should get episodic event by ID', async () => {
      await manager.connect();
      
      const event = await manager.getEpisodicEvent('evt_123');
      
      expect(event === null || typeof event === 'object').toBe(true);
    });
    
    it('should delete episodic event', async () => {
      await manager.connect();
      
      await expect(
        manager.deleteEpisodicEvent('evt_123')
      ).resolves.not.toThrow();
    });
  });
  
  describe('semantic memory operations', () => {
    it('should store semantic record', async () => {
      await manager.connect();
      
      const id = await manager.storeSemantic(
        'Test summary text',
        { type: 'summary' }
      );
      
      expect(typeof id).toBe('string');
    });
    
    it('should query semantic memory', async () => {
      await manager.connect();
      
      const results = await manager.querySemantic({
        query: 'Test query',
        top_k: 5,
      });
      
      expect(Array.isArray(results)).toBe(true);
    });
    
    it('should get semantic record by ID', async () => {
      await manager.connect();
      
      const record = await manager.getSemanticRecord('sem_123');
      
      expect(record === null || typeof record === 'object').toBe(true);
    });
    
    it('should delete semantic record', async () => {
      await manager.connect();
      
      await expect(
        manager.deleteSemanticRecord('sem_123')
      ).resolves.not.toThrow();
    });
  });
  
  describe('combined operations', () => {
    it('should store request memory in both systems', async () => {
      await manager.connect();
      
      await expect(
        manager.storeRequestMemory(
          'req_123',
          'Get contaminated shipments',
          mockToolResults,
          'Found 3 contaminated shipments',
          ['S1', 'S2', 'S3']
        )
      ).resolves.not.toThrow();
    });
    
    it('should find similar requests', async () => {
      await manager.connect();
      
      const results = await manager.findSimilarRequests('contaminated shipments', 3);
      
      expect(Array.isArray(results)).toBe(true);
    });
    
    it('should get request context', async () => {
      await manager.connect();
      
      const context = await manager.getRequestContext('req_123');
      
      expect(context).toHaveProperty('episodic');
      expect(context).toHaveProperty('semantic');
    });
    
    it('should store tool execution', async () => {
      await manager.connect();
      
      const id = await manager.storeToolExecution(
        'shipments',
        { date_from: '2025-10-01' },
        { data: [] },
        'req_123'
      );
      
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^tool_/);
    });
    
    it('should store tool execution without request ID', async () => {
      await manager.connect();
      
      const id = await manager.storeToolExecution(
        'shipments',
        {},
        { data: [] }
      );
      
      expect(typeof id).toBe('string');
    });
    
    it('should store insight', async () => {
      await manager.connect();
      
      const id = await manager.storeInsight(
        'Contamination rate is increasing',
        ['S1', 'S2'],
        0.85,
        'req_123'
      );
      
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^insight_/);
    });
    
    it('should store insight without request ID', async () => {
      await manager.connect();
      
      const id = await manager.storeInsight(
        'Pattern detected',
        ['E1'],
        0.9
      );
      
      expect(typeof id).toBe('string');
    });
  });
  
  describe('getStats', () => {
    it('should get statistics from both systems', async () => {
      await manager.connect();
      
      const stats = await manager.getStats();
      
      expect(stats).toHaveProperty('episodic');
      expect(stats).toHaveProperty('semantic');
      expect(stats.episodic.connected).toBe(true);
    });
    
    it('should handle stats error gracefully', async () => {
      await manager.connect();
      
      // Even if stats fail, should not throw
      const stats = await manager.getStats();
      
      expect(stats).toBeDefined();
    });
  });
});

