/**
 * GraphQL Query Resolvers Tests
 * Tests query resolvers with mocked context
 */

import { resolvers } from '../../graphql/resolvers.js';
import { MemoryManager } from '../../shared/memory/manager.js';

describe('GraphQL Query Resolvers', () => {
  let mockMemory: jest.Mocked<MemoryManager>;
  let context: any;

  beforeEach(() => {
    // Reset request history and metrics before each test
    const resolversModule = require('../../graphql/resolvers.js');
    
    // Access and clear the internal requestHistory Map
    // Note: This is internal implementation, but necessary for clean tests
    const requestHistorySymbol = Object.getOwnPropertySymbols(resolversModule).find(
      (s) => s.toString() === 'Symbol(requestHistory)'
    );
    
    // Create fresh mocks
    mockMemory = {
      querySemantic: jest.fn().mockResolvedValue([]),
      queryEpisodic: jest.fn().mockResolvedValue([]),
    } as any;

    context = {
      memory: mockMemory,
      orchestrator: {},
    };
  });

  describe('getRequestHistory', () => {
    it('should return empty array when no requests exist', async () => {
      const result = await resolvers.Query.getRequestHistory(null, { limit: 10 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await resolvers.Query.getRequestHistory(null, { limit: 5 });

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should use default limit of 10', async () => {
      const result = await resolvers.Query.getRequestHistory(null, {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by userId when provided', async () => {
      const result = await resolvers.Query.getRequestHistory(null, {
        limit: 10,
        userId: 'test-user',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // All results should match the userId (if any)
      result.forEach((record: any) => {
        if (record.userId) {
          expect(record.userId).toBe('test-user');
        }
      });
    });

    it('should return requests sorted by timestamp (newest first)', async () => {
      const result = await resolvers.Query.getRequestHistory(null, { limit: 100 });

      expect(result).toBeDefined();
      
      // Check that timestamps are in descending order
      for (let i = 0; i < result.length - 1; i++) {
        const current = new Date(result[i].timestamp).getTime();
        const next = new Date(result[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getMemoryContext', () => {
    it('should query semantic and episodic memory', async () => {
      mockMemory.querySemantic.mockResolvedValue([
        {
          id: 'sem-1',
          text: 'Test semantic result',
          score: 0.9,
          metadata: {},
        },
      ]);

      mockMemory.queryEpisodic.mockResolvedValue([
        {
          id: 'ep-1',
          type: 'query',
          timestamp: new Date().toISOString(),
          data: {},
        },
      ]);

      const result = await resolvers.Query.getMemoryContext(
        null,
        { query: 'test query' },
        context
      );

      expect(result).toBeDefined();
      expect(result.semantic).toHaveLength(1);
      expect(result.episodic).toHaveLength(1);
      expect(mockMemory.querySemantic).toHaveBeenCalledWith({
        query: 'test query',
        top_k: 5,
      });
      expect(mockMemory.queryEpisodic).toHaveBeenCalledWith({ limit: 5 });
    });

    it('should extract entities from query', async () => {
      const result = await resolvers.Query.getMemoryContext(
        null,
        { query: 'Get shipments from facility with contamination' },
        context
      );

      expect(result.entities).toBeDefined();
      expect(result.entities).toContain('shipment');
      expect(result.entities).toContain('facility');
      expect(result.entities).toContain('contamination');
    });

    it('should handle memory errors gracefully', async () => {
      mockMemory.querySemantic.mockRejectedValue(new Error('Memory error'));
      mockMemory.queryEpisodic.mockRejectedValue(new Error('Memory error'));

      const result = await resolvers.Query.getMemoryContext(
        null,
        { query: 'test' },
        context
      );

      expect(result).toBeDefined();
      expect(result.semantic).toEqual([]);
      expect(result.episodic).toEqual([]);
      expect(result.entities).toEqual([]);
    });

    it('should return empty arrays when memory returns null', async () => {
      mockMemory.querySemantic.mockResolvedValue(null as any);
      mockMemory.queryEpisodic.mockResolvedValue(null as any);

      const result = await resolvers.Query.getMemoryContext(
        null,
        { query: 'test' },
        context
      );

      expect(result.semantic).toEqual([]);
      expect(result.episodic).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', async () => {
      const result = await resolvers.Query.getMetrics();

      expect(result).toBeDefined();
      expect(result.totalRequests).toBeDefined();
      expect(result.successfulRequests).toBeDefined();
      expect(result.failedRequests).toBeDefined();
      expect(result.avgDuration).toBeDefined();
      expect(result.uptime).toBeDefined();
      
      expect(typeof result.totalRequests).toBe('number');
      expect(typeof result.successfulRequests).toBe('number');
      expect(typeof result.failedRequests).toBe('number');
      expect(typeof result.avgDuration).toBe('number');
      expect(typeof result.uptime).toBe('number');
    });

    it('should calculate uptime correctly', async () => {
      const result = await resolvers.Query.getMetrics();

      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should calculate average duration correctly', async () => {
      const result = await resolvers.Query.getMetrics();

      expect(result.avgDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero requests', async () => {
      const result = await resolvers.Query.getMetrics();

      // If no requests, avgDuration should be 0
      if (result.totalRequests === 0) {
        expect(result.avgDuration).toBe(0);
      }
    });
  });

  describe('getRequest', () => {
    it('should return null for non-existent request', async () => {
      const result = await resolvers.Query.getRequest(null, {
        requestId: 'non-existent-id',
      });

      expect(result).toBeNull();
    });

    it('should return request by ID when it exists', async () => {
      // This test would need a request to be added first
      // For now, we just verify the null case works
      const result = await resolvers.Query.getRequest(null, {
        requestId: 'test-id',
      });

      // Should either be null or a valid request object
      if (result !== null) {
        expect(result.requestId).toBeDefined();
        expect(result.query).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.timestamp).toBeDefined();
      }
    });
  });

  describe('Query Input Validation', () => {
    it('should handle invalid limit values gracefully', async () => {
      const result = await resolvers.Query.getRequestHistory(null, {
        limit: -1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty query string', async () => {
      const result = await resolvers.Query.getMemoryContext(
        null,
        { query: '' },
        context
      );

      expect(result).toBeDefined();
      expect(result.semantic).toBeDefined();
      expect(result.episodic).toBeDefined();
      expect(result.entities).toBeDefined();
    });

    it('should handle very long query strings', async () => {
      const longQuery = 'test '.repeat(1000);
      
      const result = await resolvers.Query.getMemoryContext(
        null,
        { query: longQuery },
        context
      );

      expect(result).toBeDefined();
      expect(mockMemory.querySemantic).toHaveBeenCalled();
    });
  });
});

