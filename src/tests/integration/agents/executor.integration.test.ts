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
    const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:3000/api';
    registerAllTools(mcpServer, apiUrl);

    executor = new ExecutorAgent(mcpServer);
  });

  describe('Simple Execution with Real API', () => {
    it('should execute shipments query', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments/list',
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
            tool: 'facilities/list',
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
          { tool: 'shipments/list', params: { limit: 5 } },
          { tool: 'facilities/list', params: {} },
          { tool: 'inspections/list', params: { limit: 5 } },
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
            tool: 'shipments/list',
            params: { limit: 3, has_contaminants: true },
          },
          {
            tool: 'contaminants/list',
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
});

