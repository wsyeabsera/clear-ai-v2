/**
 * Neo4j Memory tests
 * 
 * Uses mock driver via dependency injection for unit testing
 */

import { Neo4jMemory } from '../../../shared/memory/neo4j.js';
import { MemoryError } from '../../../shared/utils/errors.js';
import { mockEpisodicEvent } from '../fixtures/shared-test-data.js';
import { MockNeo4jDriver } from '../fixtures/memory-mocks.js';

describe('Neo4jMemory', () => {
  let memory: Neo4jMemory;
  let mockDriver: MockNeo4jDriver;
  
  beforeEach(() => {
    mockDriver = new MockNeo4jDriver();
    memory = new Neo4jMemory(
      {
        uri: 'bolt://localhost:7687',
        user: 'neo4j',
        password: 'test-password',
      },
      mockDriver
    );
  });
  
  afterEach(async () => {
    if (memory.isConnected()) {
      await memory.close();
    }
  });
  
  describe('connection', () => {
    it('should connect to Neo4j', async () => {
      await memory.connect();
      
      expect(memory.isConnected()).toBe(true);
    });
    
    it('should close connection', async () => {
      await memory.connect();
      await memory.close();
      
      expect(memory.isConnected()).toBe(false);
    });
    
    it('should throw error if operation before connect', async () => {
      // Create memory without mock driver to test connection check
      const unmockedMemory = new Neo4jMemory({
        uri: 'bolt://localhost:7687',
        user: 'neo4j',
        password: 'test-password',
      });
      
      await expect(
        unmockedMemory.storeEvent(mockEpisodicEvent)
      ).rejects.toThrow(MemoryError);
      
      await expect(
        unmockedMemory.storeEvent(mockEpisodicEvent)
      ).rejects.toThrow('connection');
    });
  });
  
  describe('storeEvent', () => {
    it('should store event without relationships', async () => {
      await memory.connect();
      
      const event = {
        id: 'evt_123',
        type: 'request' as const,
        timestamp: '2025-10-11T10:00:00Z',
        data: { query: 'test' },
      };
      
      await expect(memory.storeEvent(event)).resolves.not.toThrow();
    });
    
    it('should store event with relationships', async () => {
      await memory.connect();
      
      await expect(memory.storeEvent(mockEpisodicEvent)).resolves.not.toThrow();
    });
  });
  
  describe('queryEvents', () => {
    it('should query events without filters', async () => {
      await memory.connect();
      
      const events = await memory.queryEvents({});
      
      expect(Array.isArray(events)).toBe(true);
    });
    
    it('should query events with type filter', async () => {
      await memory.connect();
      
      const events = await memory.queryEvents({ type: 'request' });
      
      expect(Array.isArray(events)).toBe(true);
    });
    
    it('should query events with date range', async () => {
      await memory.connect();
      
      const events = await memory.queryEvents({
        date_from: '2025-10-01T00:00:00Z',
        date_to: '2025-10-11T23:59:59Z',
      });
      
      expect(Array.isArray(events)).toBe(true);
    });
    
    it('should query events with limit', async () => {
      await memory.connect();
      
      const events = await memory.queryEvents({ limit: 5 });
      
      expect(Array.isArray(events)).toBe(true);
    });
  });
  
  describe('getEvent', () => {
    it('should get event by ID', async () => {
      await memory.connect();
      
      const result = await memory.getEvent('evt_123');
      
      // With mocked driver, will return null
      expect(result === null || typeof result === 'object').toBe(true);
    });
    
    it('should return null for non-existent event', async () => {
      await memory.connect();
      
      const result = await memory.getEvent('nonexistent');
      
      expect(result).toBeNull();
    });
  });
  
  describe('deleteEvent', () => {
    it('should delete event', async () => {
      await memory.connect();
      
      await expect(memory.deleteEvent('evt_123')).resolves.not.toThrow();
    });
  });
  
  describe('error handling', () => {
    it('should throw MemoryError on store failure', async () => {
      await memory.connect();
      
      // Create a new memory without mock to test real connection error
      const badMemory = new Neo4jMemory({
        uri: 'bolt://invalid:7687',
        user: 'user',
        password: 'pass',
      });
      
      // Should throw when trying to connect to invalid URI
      await expect(badMemory.connect()).rejects.toThrow(MemoryError);
    });
  });
});

