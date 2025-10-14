/**
 * GraphQL Server Integration Tests
 * Tests full GraphQL server with HTTP requests
 */

import request from 'supertest';
import { GraphQLAgentServer } from '../../graphql/server.js';
import { AnalysisStorageService } from '../../graphql/services/analysis-storage.service.js';
import { OrchestratorAgent } from '../../agents/orchestrator.js';
import { MemoryManager } from '../../shared/memory/manager.js';

describe('GraphQL Server Integration', () => {
  let server: GraphQLAgentServer;
  let mockOrchestrator: jest.Mocked<OrchestratorAgent>;
  let mockMemory: jest.Mocked<MemoryManager>;

  beforeAll(async () => {
    // Create mocks with unique request IDs
    let requestCounter = 0;
    mockOrchestrator = {
      handleQuery: jest.fn().mockImplementation(async () => ({
        message: 'Test response',
        tools_used: ['test_tool'],
        data: { test: 'data' },
        analysis: null,
        metadata: {
          request_id: `test-request-${++requestCounter}`,
          total_duration_ms: 100,
          timestamp: new Date().toISOString(),
          error: false,
        },
      })),
    } as any;

    mockMemory = {
      querySemantic: jest.fn().mockResolvedValue([]),
      queryEpisodic: jest.fn().mockResolvedValue([]),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create server
    server = new GraphQLAgentServer({
      port: 4001,
      orchestrator: mockOrchestrator,
      memory: mockMemory,
      analysisStorage: new AnalysisStorageService(),
    });

    await server.start();
  }, 30000);

  afterAll(async () => {
    await server.stop();
  });

  describe('Server Startup', () => {
    it('should start successfully', () => {
      expect(server).toBeDefined();
    });

    it('should respond to health check', async () => {
      const response = await request(server.getApp()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GraphQL Endpoint', () => {
    it('should handle introspection query', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            {
              __schema {
                types {
                  name
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.__schema).toBeDefined();
    });

    it('should execute query through GraphQL', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            query {
              getMetrics {
                totalRequests
                successfulRequests
                failedRequests
                avgDuration
                uptime
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.getMetrics).toBeDefined();
      expect(response.body.data.getMetrics.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it('should execute mutation through GraphQL', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            mutation {
              executeQuery(query: "Test query", userId: "test-user") {
                requestId
                message
                toolsUsed
                metadata {
                  requestId
                  totalDurationMs
                  timestamp
                  error
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.executeQuery).toBeDefined();
      expect(response.body.data.executeQuery.requestId).toMatch(/^test-request-\d+$/);
      expect(response.body.data.executeQuery.message).toBe('Test response');
    });

    it('should handle GraphQL errors', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            query {
              nonExistentField
            }
          `,
        });

      // GraphQL returns 200 with errors in body for schema validation errors
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Context Propagation', () => {
    it('should pass orchestrator and memory to resolvers', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            mutation {
              executeQuery(query: "Test context") {
                requestId
                message
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(mockOrchestrator.handleQuery).toHaveBeenCalledWith('Test context');
    });

    it('should allow memory context queries', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            query {
              getMemoryContext(query: "test query") {
                semantic {
                  id
                  text
                  score
                }
                episodic {
                  id
                  type
                  timestamp
                }
                entities
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.getMemoryContext).toBeDefined();
      expect(mockMemory.querySemantic).toHaveBeenCalled();
      expect(mockMemory.queryEpisodic).toHaveBeenCalled();
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request(server.getApp())
        .post('/graphql')
        .set('Origin', 'http://localhost:3000')
        .send({
          query: `
            query {
              getMetrics {
                totalRequests
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator errors gracefully', async () => {
      mockOrchestrator.handleQuery.mockRejectedValueOnce(new Error('Orchestrator error'));

      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            mutation {
              executeQuery(query: "Error test") {
                requestId
                message
                metadata {
                  error
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.executeQuery.metadata.error).toBe(true);
      expect(response.body.data.executeQuery.message).toContain('Error');
    });

    it('should handle memory errors gracefully', async () => {
      mockMemory.querySemantic.mockRejectedValueOnce(new Error('Memory error'));

      const response = await request(server.getApp())
        .post('/graphql')
        .send({
          query: `
            query {
              getMemoryContext(query: "error test") {
                semantic {
                  id
                }
                episodic {
                  id
                }
                entities
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      // Should return empty arrays when memory fails
      expect(response.body.data.getMemoryContext.semantic).toEqual([]);
    });
  });
});

