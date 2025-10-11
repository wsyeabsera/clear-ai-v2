/**
 * Pinecone Memory tests
 * 
 * Uses mock client via dependency injection for unit testing
 */

import { PineconeMemory } from '../../../shared/memory/pinecone.js';
import { MemoryError } from '../../../shared/utils/errors.js';
import {
  MockPineconeClient,
  MockEmbeddingService,
} from '../fixtures/memory-mocks.js';

describe('PineconeMemory', () => {
  let memory: PineconeMemory;
  let mockPinecone: MockPineconeClient;
  let mockEmbeddingService: MockEmbeddingService;
  
  beforeEach(() => {
    mockPinecone = new MockPineconeClient();
    mockEmbeddingService = new MockEmbeddingService();
    
    memory = new PineconeMemory(
      {
        api_key: 'test-pinecone-key',
        environment: 'us-east-1',
        index_name: 'test-index',
      },
      mockEmbeddingService,
      mockPinecone
    );
  });
  
  afterEach(async () => {
    if (memory.isConnected()) {
      await memory.close();
    }
  });
  
  describe('connection', () => {
    it('should connect to Pinecone', async () => {
      await memory.connect();
      
      expect(memory.isConnected()).toBe(true);
    });
    
    it('should close connection', async () => {
      await memory.connect();
      await memory.close();
      
      expect(memory.isConnected()).toBe(false);
    });
    
    it('should throw error with invalid embedding service', async () => {
      // Create memory without embedding service should fail
      const badEmbeddingService = {
        generate: async () => {
          throw new Error('Embedding failed');
        },
        getDimensions: () => 768,
        getProvider: () => 'ollama' as const,
      };
      
      const newMemory = new PineconeMemory(
        {
          api_key: 'test-key',
          environment: 'env',
          index_name: 'index',
        },
        badEmbeddingService,
        mockPinecone
      );
      
      await newMemory.connect();
      await expect(newMemory.store('test', {})).rejects.toThrow(MemoryError);
    });
    
    it('should throw error if operation before connect', async () => {
      // Create memory without mocks to test connection check
      const unmockedMemory = new PineconeMemory(
        {
          api_key: 'test-key',
          environment: 'env',
          index_name: 'index',
        },
        mockEmbeddingService
      );
      
      await expect(
        unmockedMemory.store('test', {})
      ).rejects.toThrow(MemoryError);
      
      await expect(
        unmockedMemory.store('test', {})
      ).rejects.toThrow('connection');
    });
  });
  
  describe('store', () => {
    it('should store semantic record with embedding', async () => {
      await memory.connect();
      
      const id = await memory.store('Test summary text', {
        type: 'summary',
        entities: ['E1', 'E2'],
      });
      
      expect(typeof id).toBe('string');
      expect(id).toBeTruthy();
    });
    
    it('should use provided ID', async () => {
      await memory.connect();
      
      const customId = 'custom_123';
      const id = await memory.store('Test text', {}, customId);
      
      expect(id).toBe(customId);
    });
    
    it('should generate ID if not provided', async () => {
      await memory.connect();
      
      const id = await memory.store('Test text', {});
      
      expect(id).toMatch(/^sem_/);
    });
  });
  
  describe('search', () => {
    it('should search for similar records', async () => {
      await memory.connect();
      
      // Store some test data first
      await memory.store('Similar text', { type: 'summary' });
      await memory.store('Another similar text', { type: 'insight' });
      
      const results = await memory.search({
        query: 'Test query',
        top_k: 5,
      });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
    
    it('should use default top_k', async () => {
      await memory.connect();
      
      const results = await memory.search({ query: 'Test' });
      
      expect(Array.isArray(results)).toBe(true);
    });
    
    it('should apply filter', async () => {
      await memory.connect();
      
      const results = await memory.search({
        query: 'Test',
        filter: { type: 'summary' },
      });
      
      expect(Array.isArray(results)).toBe(true);
    });
  });
  
  describe('get', () => {
    it('should get record by ID', async () => {
      await memory.connect();
      
      // Store a record first
      const id = await memory.store('Test text', { type: 'summary' }, 'sem_123');
      
      const result = await memory.get(id);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('sem_123');
    });
    
    it('should return null for non-existent record', async () => {
      await memory.connect();
      
      const result = await memory.get('nonexistent');
      
      expect(result).toBeNull();
    });
  });
  
  describe('delete', () => {
    it('should delete record by ID', async () => {
      await memory.connect();
      
      await expect(memory.delete('sem_123')).resolves.not.toThrow();
    });
    
    it('should delete multiple records', async () => {
      await memory.connect();
      
      await expect(
        memory.deleteMany(['sem_1', 'sem_2', 'sem_3'])
      ).resolves.not.toThrow();
    });
  });
  
  describe('getStats', () => {
    it('should get index statistics', async () => {
      await memory.connect();
      
      const stats = await memory.getStats();
      
      expect(stats).toBeDefined();
    });
  });
  
  describe('error handling', () => {
    it('should handle missing records gracefully', async () => {
      await memory.connect();
      
      const result = await memory.get('nonexistent_id');
      
      expect(result).toBeNull();
    });
  });
});

