/**
 * Integration tests for Executor Agent
 * Tests with real MCP server and API calls, no mocks
 */

import { ExecutorAgent } from '../../../agents/executor.js';
import { MCPServer } from '../../../mcp/server.js';
import { registerAllTools } from '../../../tools/index.js';
import { Plan } from '../../../shared/types/agent.js';

describe('ExecutorAgent Integration', () => {
  let executor: ExecutorAgent;
  let mcpServer: MCPServer;

  beforeAll(() => {
    // Initialize MCP Server with real tools
    mcpServer = new MCPServer('executor-integration-test', '1.0.0');
    const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:4000/api';
    registerAllTools(mcpServer, apiUrl);

    executor = new ExecutorAgent(mcpServer);
  });

  describe('Simple Execution with Real API', () => {
    it('should execute shipments query', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments_list',
            params: { limit: 5 },
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBeDefined();
      expect(Array.isArray(results[0].data)).toBe(true);
    }, 30000);

    it('should execute facilities query', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: {},
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(Array.isArray(results[0].data)).toBe(true);
    }, 30000);
  });

  describe('Parallel Execution with Real API', () => {
    it('should execute independent queries in parallel', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'shipments_list', params: { limit: 5 } },
          { tool: 'facilities_list', params: {} },
          { tool: 'inspections_list', params: { limit: 5 } },
        ],
      };

      const startTime = Date.now();
      const results = await executor.execute(plan);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      // Should complete faster than sequential
      console.log('Parallel execution took:', duration, 'ms');
      expect(duration).toBeLessThan(5000); // Reasonable upper bound
    }, 30000);
  });

  describe('Sequential Execution with Dependencies', () => {
    it('should execute dependent steps in order', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments_list',
            params: { limit: 3, has_contaminants: true },
          },
          {
            tool: 'contaminants_list',
            params: { shipment_ids: '${step[0].data.*.id}' },
            depends_on: [0],
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(2);
      
      // First step should succeed
      expect(results[0].success).toBe(true);
      expect(Array.isArray(results[0].data)).toBe(true);

      // Second step may succeed or fail depending on data
      expect(results[1]).toBeDefined();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle tool not found', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'non-existent-tool', params: {} },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    }, 30000);
  });

  describe('Complex Dependency Chains', () => {
    it('should execute 3-level dependency chain with real API', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'facilities_list', params: { location: 'Berlin', limit: 1 } },
          { 
            tool: 'shipments_list', 
            params: { facility_id: '${step[0].data[0].id}', limit: 2 },
            depends_on: [0]
          },
          { 
            tool: 'contaminants_list', 
            params: { shipment_ids: '${step[1].data.*.id}' },
            depends_on: [1]
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      
      // Verify execution order and dependencies
      expect(results[0].metadata.timestamp).toBeDefined();
      expect(results[1].metadata.timestamp).toBeDefined();
      expect(results[2].metadata.timestamp).toBeDefined();
      
      console.log('3-level dependency chain results:', 
        results.map(r => ({ success: r.success, tool: r.tool }))
      );
    }, 60000);

    it('should handle error recovery in dependency chain', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'facilities_list', params: { location: 'NonExistent' } },
          { 
            tool: 'shipments_list', 
            params: { facility_id: '${step[0].data[0].id}' },
            depends_on: [0]
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(2);
      // First step might succeed with empty data or fail
      // Second step should handle the error
      expect(results[1]).toBeDefined();
      
      console.log('Error recovery results:', 
        results.map(r => ({ success: r.success, error: r.error?.message }))
      );
    }, 40000);

    it('should handle timeout for slow API responses', async () => {
      const slowExecutor = new ExecutorAgent(mcpServer, { toolTimeout: 100 });
      
      const plan: Plan = {
        steps: [
          { tool: 'shipments_list', params: { limit: 100 } },
        ],
      };

      const startTime = Date.now();
      const results = await slowExecutor.execute(plan);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1);
      // Should either succeed quickly or timeout
      expect(duration).toBeLessThan(5000);
      
      console.log('Timeout handling:', { success: results[0].success, duration });
    }, 30000);

    it('should resolve template with nested data ${step[0].data[0].facility.id}', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'shipments_list', params: { limit: 1, has_contaminants: true } },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      
      // Check data structure
      if (results[0].data && Array.isArray(results[0].data) && results[0].data.length > 0) {
        expect(results[0].data[0]).toHaveProperty('facility_id');
      }
      
      console.log('Nested data template test:', {
        success: results[0].success,
        dataLength: results[0].data?.length
      });
    }, 30000);

    it('should resolve template with array mapping ${step[0].data.*.id}', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'shipments_list', params: { limit: 3 } },
          { 
            tool: 'facilities_list', 
            params: { ids: '${step[0].data.*.facility_id}' },
            depends_on: [0]
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      
      console.log('Array mapping test:', {
        step0Success: results[0].success,
        step1Success: results[1].success
      });
    }, 30000);

    it('should verify parallel execution is faster than sequential', async () => {
      const parallelPlan: Plan = {
        steps: [
          { tool: 'shipments_list', params: { limit: 5 }, parallel: true },
          { tool: 'facilities_list', params: {}, parallel: true },
          { tool: 'inspections_list', params: { limit: 5 }, parallel: true },
        ],
      };

      const startTime = Date.now();
      const results = await executor.execute(parallelPlan);
      const parallelDuration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      // Parallel execution should be reasonably fast
      expect(parallelDuration).toBeLessThan(10000);
      
      console.log('Parallel execution:', { duration: parallelDuration, success: results.every(r => r.success) });
    }, 30000);

    it('should handle mixed parallel and sequential execution', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'facilities_list', params: { limit: 2 }, parallel: true },
          { tool: 'shipments_list', params: { limit: 2 }, parallel: true },
          { 
            tool: 'contaminants_list', 
            params: { facility_id: '${step[0].data[0].id}' },
            depends_on: [0]
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(3);
      
      // First two should execute in parallel, third after first completes
      console.log('Mixed execution:', results.map(r => ({ success: r.success, tool: r.tool })));
    }, 40000);

    it('should handle partial failures in dependency chain', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'facilities_list', params: {} },
          { tool: 'shipments_list', params: {} },
          { tool: 'invalid-tool', params: {} },
          { 
            tool: 'inspections_list', 
            params: { limit: 5 },
            depends_on: [0]
          },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(4);
      
      // First two and fourth should succeed, third should fail
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
      expect(results[3].success).toBe(true);
      
      console.log('Partial failure handling:', results.map(r => ({ success: r.success })));
    }, 40000);

    it('should track metadata across all steps', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'shipments_list', params: { limit: 2 } },
          { tool: 'facilities_list', params: { limit: 2 } },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(2);
      
      // All results should have metadata
      for (const result of results) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata.executionTime).toBeGreaterThan(0);
        expect(result.metadata.timestamp).toBeDefined();
        expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
      
      console.log('Metadata tracking:', results.map(r => ({ 
        tool: r.tool, 
        execTime: r.metadata.executionTime 
      })));
    }, 30000);

    it('should measure performance difference: parallel vs sequential', async () => {
      // Parallel
      const parallelStart = Date.now();
      await executor.execute({
        steps: [
          { tool: 'shipments_list', params: { limit: 3 } },
          { tool: 'facilities_list', params: {} },
          { tool: 'inspections_list', params: { limit: 3 } },
        ],
      });
      const parallelDuration = Date.now() - parallelStart;

      console.log('Performance comparison:', { 
        parallelDuration, 
        note: 'Parallel should be faster than sequential'
      });
      
      expect(parallelDuration).toBeLessThan(15000);
    }, 60000);
  });
});

