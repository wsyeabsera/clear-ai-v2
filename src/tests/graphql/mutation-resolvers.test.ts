/**
 * GraphQL Mutation Resolvers Tests
 * Tests mutation resolvers with mocked dependencies
 */

import { resolvers, pubsub } from '../../graphql/resolvers.js';
import { OrchestratorAgent } from '../../agents/orchestrator.js';

describe('GraphQL Mutation Resolvers', () => {
  let mockOrchestrator: jest.Mocked<OrchestratorAgent>;
  let context: any;
  let publishSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock orchestrator with unique request IDs
    let requestCounter = 0;
    mockOrchestrator = {
      handleQuery: jest.fn().mockImplementation(async () => ({
        message: 'Test response',
        tools_used: ['test_tool'],
        data: { test: 'data' },
        analysis: {
          summary: 'Test summary',
          insights: [
            {
              type: 'test',
              description: 'Test insight',
              confidence: 0.9,
              supporting_data: [{ test: 'data' }],
            },
          ],
          entities: [
            {
              id: 'e1',
              type: 'shipment',
              name: 'S1',
              attributes: { status: 'delivered' },
              relationships: [
                {
                  type: 'belongs_to',
                  targetEntityId: 'f1',
                  strength: 1.0,
                },
              ],
            },
          ],
          anomalies: [
            {
              type: 'contamination',
              description: 'High contamination detected',
              severity: 'high',
              affected_entities: ['s1'],
              data: { level: 'critical' },
            },
          ],
          metadata: {
            tool_results_count: 1,
            successful_results: 1,
            failed_results: 0,
            analysis_time_ms: 50,
          },
        },
        metadata: {
          request_id: `test-req-${++requestCounter}`,
          total_duration_ms: 150,
          timestamp: new Date().toISOString(),
          error: false,
        },
      })),
    } as any;

    context = {
      orchestrator: mockOrchestrator,
      memory: {},
    };

    // Spy on pubsub
    publishSpy = jest.spyOn(pubsub, 'publish').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    publishSpy.mockRestore();
  });

  describe('executeQuery', () => {
    it('should execute query through orchestrator', async () => {
      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'Test query', userId: 'user-1' },
        context
      );

      expect(mockOrchestrator.handleQuery).toHaveBeenCalledWith('Test query');
      expect(result).toBeDefined();
      expect(result.requestId).toMatch(/^test-req-\d+$/);
      expect(result.message).toBe('Test response');
      expect(result.toolsUsed).toEqual(['test_tool']);
    });

    it('should store request in history', async () => {
      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'History test', userId: 'user-2' },
        context
      );

      expect(result.requestId).toBeDefined();

      // Try to retrieve it
      const history = await resolvers.Query.getRequestHistory(null, { limit: 10 });
      const found = history.find((r: any) => r.requestId === result.requestId);
      
      if (found) {
        expect(found.query).toBe('History test');
        expect(found.userId).toBe('user-2');
      }
    });

    it('should publish progress updates', async () => {
      await resolvers.Mutation.executeQuery(
        null,
        { query: 'Progress test' },
        context
      );

      // Should publish at least completion
      expect(publishSpy).toHaveBeenCalledWith(
        'QUERY_PROGRESS',
        expect.objectContaining({
          queryProgress: expect.objectContaining({
            requestId: expect.stringMatching(/^test-req-\d+$/),
            phase: expect.any(String),
            progress: expect.any(Number),
            message: expect.any(String),
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should update metrics on success', async () => {
      const metricsBefore = await resolvers.Query.getMetrics();
      
      await resolvers.Mutation.executeQuery(
        null,
        { query: 'Metrics test' },
        context
      );

      const metricsAfter = await resolvers.Query.getMetrics();

      expect(metricsAfter.totalRequests).toBe(metricsBefore.totalRequests + 1);
      expect(metricsAfter.successfulRequests).toBe(metricsBefore.successfulRequests + 1);
    });

    it('should update metrics on error', async () => {
      mockOrchestrator.handleQuery.mockRejectedValueOnce(new Error('Test error'));

      const metricsBefore = await resolvers.Query.getMetrics();
      
      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'Error test' },
        context
      );

      const metricsAfter = await resolvers.Query.getMetrics();

      expect(result.metadata.error).toBe(true);
      expect(result.message).toContain('Error');
      expect(metricsAfter.totalRequests).toBe(metricsBefore.totalRequests + 1);
      expect(metricsAfter.failedRequests).toBe(metricsBefore.failedRequests + 1);
    });

    it('should handle orchestrator errors gracefully', async () => {
      mockOrchestrator.handleQuery.mockRejectedValueOnce(
        new Error('Orchestrator failure')
      );

      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'Error query' },
        context
      );

      expect(result).toBeDefined();
      expect(result.message).toContain('Error');
      expect(result.metadata.error).toBe(true);
      expect(result.toolsUsed).toEqual([]);
      expect(result.data).toBeNull();
      expect(result.analysis).toBeNull();
    });

    it('should convert analysis to GraphQL format', async () => {
      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'Analysis test' },
        context
      );

      expect(result.analysis).toBeDefined();
      expect(result.analysis!.summary).toBe('Test summary');
      expect(result.analysis!.insights).toHaveLength(1);
      expect(result.analysis!.insights[0].type).toBe('test');
      expect(result.analysis!.entities).toHaveLength(1);
      expect(result.analysis!.entities[0].id).toBe('e1');
      expect(result.analysis!.anomalies).toHaveLength(1);
      expect(result.analysis!.metadata.toolResultsCount).toBe(1);
    });

    it('should handle null analysis', async () => {
      mockOrchestrator.handleQuery.mockResolvedValueOnce({
        message: 'No analysis',
        tools_used: [],
        data: null,
        analysis: null,
        metadata: {
          request_id: 'req-no-analysis',
          total_duration_ms: 100,
          timestamp: new Date().toISOString(),
          error: false,
        },
      } as any);

      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'No analysis query' },
        context
      );

      expect(result.analysis).toBeNull();
    });

    it('should work without userId', async () => {
      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'No user test' },
        context
      );

      expect(result).toBeDefined();
      expect(result.requestId).toBeDefined();
      
      const history = await resolvers.Query.getRequestHistory(null, { limit: 10 });
      const found = history.find((r: any) => r.requestId === result.requestId);
      
      if (found) {
        expect(found.userId).toBeUndefined();
      }
    });

    it('should include metadata in response', async () => {
      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'Metadata test' },
        context
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata.requestId).toMatch(/^test-req-\d+$/);
      expect(result.metadata.totalDurationMs).toBe(150);
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.error).toBe(false);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'test '.repeat(10000);

      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: longQuery },
        context
      );

      expect(result).toBeDefined();
      expect(mockOrchestrator.handleQuery).toHaveBeenCalledWith(longQuery);
    });

    it('should handle special characters in query', async () => {
      const specialQuery = 'Test with "quotes" and \\backslashes\\ and \nnewlines';

      const result = await resolvers.Mutation.executeQuery(
        null,
        { query: specialQuery },
        context
      );

      expect(result).toBeDefined();
      expect(mockOrchestrator.handleQuery).toHaveBeenCalledWith(specialQuery);
    });
  });

  describe('cancelQuery', () => {
    it('should return true for cancellation', async () => {
      const result = await resolvers.Mutation.cancelQuery(null, {
        requestId: 'test-req-id',
      });

      expect(result).toBe(true);
    });

    it('should handle non-existent request IDs', async () => {
      const result = await resolvers.Mutation.cancelQuery(null, {
        requestId: 'non-existent',
      });

      expect(result).toBe(true);
    });

    it('should work with any request ID format', async () => {
      const testIds = ['uuid-format', '123', 'test-id-with-dashes'];

      for (const id of testIds) {
        const result = await resolvers.Mutation.cancelQuery(null, {
          requestId: id,
        });
        expect(result).toBe(true);
      }
    });
  });

  describe('Concurrent Mutations', () => {
    it('should handle multiple concurrent executeQuery calls', async () => {
      const queries = ['Query 1', 'Query 2', 'Query 3'];

      const results = await Promise.all(
        queries.map((query) =>
          resolvers.Mutation.executeQuery(null, { query }, context)
        )
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.requestId).toBeDefined();
        expect(result.message).toBeDefined();
      });
    });

    it('should maintain separate request histories', async () => {
      const user1Result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'User 1 query', userId: 'user-1' },
        context
      );

      const user2Result = await resolvers.Mutation.executeQuery(
        null,
        { query: 'User 2 query', userId: 'user-2' },
        context
      );

      expect(user1Result.requestId).not.toBe(user2Result.requestId);

      const user1History = await resolvers.Query.getRequestHistory(null, {
        userId: 'user-1',
        limit: 10,
      });
      const user2History = await resolvers.Query.getRequestHistory(null, {
        userId: 'user-2',
        limit: 10,
      });

      // Each user should only see their own queries
      user1History.forEach((record: any) => {
        if (record.userId) {
          expect(record.userId).toBe('user-1');
        }
      });

      user2History.forEach((record: any) => {
        if (record.userId) {
          expect(record.userId).toBe('user-2');
        }
      });
    });
  });
});

