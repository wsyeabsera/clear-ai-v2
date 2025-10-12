/**
 * Unit tests for Executor Agent
 * All dependencies are mocked
 */

import { ExecutorAgent } from '../../agents/executor.js';
import { Plan, ToolResult } from '../../shared/types/agent.js';
import { MCPServer } from '../../mcp/server.js';

// Mock the MCP server
jest.mock('../../mcp/server.js');

describe('ExecutorAgent', () => {
  let executor: ExecutorAgent;
  let mockServer: jest.Mocked<MCPServer>;

  beforeEach(() => {
    mockServer = {
      getTool: jest.fn(),
    } as any;

    executor = new ExecutorAgent(mockServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Simple Sequential Execution', () => {
    it('should execute a single-step plan', async () => {
      const mockTool = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1', name: 'Shipment 1' }],
          metadata: {
            executionTime: 100,
            timestamp: new Date().toISOString(),
          },
        }),
      };

      mockServer.getTool.mockReturnValue(mockTool);

      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: { limit: 10 } },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toEqual([{ id: 'S1', name: 'Shipment 1' }]);
      expect(mockTool.execute).toHaveBeenCalledWith({ limit: 10 });
    });

    it('should execute multiple steps sequentially', async () => {
      const executionOrder: string[] = [];

      const tool1 = {
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push('tool1');
          return {
            success: true,
            tool: 'shipments',
            data: [{ id: 'S1' }],
            metadata: { executionTime: 100, timestamp: new Date().toISOString() },
          };
        }),
      };

      const tool2 = {
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push('tool2');
          return {
            success: true,
            tool: 'contaminants-detected',
            data: [{ id: 'C1' }],
            metadata: { executionTime: 100, timestamp: new Date().toISOString() },
          };
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: { has_contaminants: true } },
          { tool: 'contaminants-detected', params: { shipment_ids: '${step[0].data.*.id}' }, depends_on: [0] },
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(2);
      expect(executionOrder).toEqual(['tool1', 'tool2']);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent steps in parallel', async () => {
      const delays: number[] = [];
      const startTimes: number[] = [];

      const createTool = (delay: number, toolName: string) => ({
        execute: jest.fn().mockImplementation(async () => {
          startTimes.push(Date.now());
          delays.push(delay);
          await new Promise(resolve => setTimeout(resolve, delay));
          return {
            success: true,
            tool: toolName,
            data: [],
            metadata: { executionTime: delay, timestamp: new Date().toISOString() },
          };
        }),
      });

      mockServer.getTool
        .mockReturnValueOnce(createTool(100, 'tool1'))
        .mockReturnValueOnce(createTool(100, 'tool2'))
        .mockReturnValueOnce(createTool(100, 'tool3'));

      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {} },
          { tool: 'tool2', params: {} },
          { tool: 'tool3', params: {} },
        ],
      };

      const startTime = Date.now();
      const results = await executor.execute(plan);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      
      // Should take ~100ms (parallel) not ~300ms (sequential)
      expect(duration).toBeLessThan(250);
      
      // All tools should start roughly at the same time
      const timeDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(timeDiff).toBeLessThan(50);
    });

    it('should respect maxParallelExecutions limit', async () => {
      const executorLimited = new ExecutorAgent(mockServer, {
        maxParallelExecutions: 2,
      });

      const executions: number[] = [];
      let currentExecuting = 0;
      let maxConcurrent = 0;

      const createTool = () => ({
        execute: jest.fn().mockImplementation(async () => {
          currentExecuting++;
          maxConcurrent = Math.max(maxConcurrent, currentExecuting);
          executions.push(currentExecuting);
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
          currentExecuting--;
          return {
            success: true,
            tool: 'test',
            data: [],
            metadata: { executionTime: 50, timestamp: new Date().toISOString() },
          };
        }),
      });

      mockServer.getTool.mockImplementation(() => createTool());

      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {} },
          { tool: 'tool2', params: {} },
          { tool: 'tool3', params: {} },
          { tool: 'tool4', params: {} },
        ],
      };

      await executorLimited.execute(plan);

      // Should never execute more than 2 in parallel
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('Dependency Resolution', () => {
    it('should execute steps with dependencies in order', async () => {
      const executionOrder: string[] = [];

      const tool1 = {
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push('tool1');
          return {
            success: true,
            tool: 'shipments',
            data: [{ id: 'S1' }],
            metadata: { executionTime: 0, timestamp: new Date().toISOString() },
          };
        }),
      };

      const tool2 = {
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push('tool2');
          return {
            success: true,
            tool: 'contaminants-detected',
            data: [],
            metadata: { executionTime: 0, timestamp: new Date().toISOString() },
          };
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: {} },
          { tool: 'contaminants-detected', params: { ids: '${step[0].data.*.id}' }, depends_on: [0] },
        ],
      };

      await executor.execute(plan);

      expect(executionOrder).toEqual(['tool1', 'tool2']);
    });

    it('should handle complex dependency graph', async () => {
      const executionOrder: string[] = [];

      const createTool = (name: string) => ({
        execute: jest.fn().mockImplementation(async () => {
          executionOrder.push(name);
          return {
            success: true,
            tool: name,
            data: [{ id: name }],
            metadata: { executionTime: 0, timestamp: new Date().toISOString() },
          };
        }),
      });

      mockServer.getTool.mockImplementation((name) => createTool(name));

      const plan: Plan = {
        steps: [
          { tool: 'facilities', params: {} }, // 0
          { tool: 'shipments', params: {} },  // 1
          { tool: 'contaminants1', params: {}, depends_on: [0] }, // 2
          { tool: 'contaminants2', params: {}, depends_on: [1] }, // 3
          { tool: 'final', params: {}, depends_on: [2, 3] }, // 4
        ],
      };

      await executor.execute(plan);

      // 0 and 1 should execute first (in parallel)
      expect(executionOrder[0]).toMatch(/facilities|shipments/);
      expect(executionOrder[1]).toMatch(/facilities|shipments/);
      
      // 2 and 3 should execute after their dependencies
      const facilitiesIndex = executionOrder.indexOf('facilities');
      const contaminants1Index = executionOrder.indexOf('contaminants1');
      expect(contaminants1Index).toBeGreaterThan(facilitiesIndex);

      const shipmentsIndex = executionOrder.indexOf('shipments');
      const contaminants2Index = executionOrder.indexOf('contaminants2');
      expect(contaminants2Index).toBeGreaterThan(shipmentsIndex);
      
      // final should execute last
      expect(executionOrder[executionOrder.length - 1]).toBe('final');
    });
  });

  describe('Parameter Template Resolution', () => {
    it('should resolve simple field reference', async () => {
      const tool1 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'facilities',
          data: { id: 'F1', name: 'Facility 1' },
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      const tool2 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'contaminants-detected',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'facilities', params: { location: 'Hannover' } },
          { tool: 'contaminants-detected', params: { facility_id: '${step[0].data.id}' }, depends_on: [0] },
        ],
      };

      await executor.execute(plan);

      expect(tool2.execute).toHaveBeenCalledWith({ facility_id: 'F1' });
    });

    it('should resolve wildcard array mapping', async () => {
      const tool1 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'shipments',
          data: [
            { id: 'S1', name: 'Shipment 1' },
            { id: 'S2', name: 'Shipment 2' },
            { id: 'S3', name: 'Shipment 3' },
          ],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      const tool2 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'contaminants-detected',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: { has_contaminants: true } },
          { tool: 'contaminants-detected', params: { shipment_ids: '${step[0].data.*.id}' }, depends_on: [0] },
        ],
      };

      await executor.execute(plan);

      expect(tool2.execute).toHaveBeenCalledWith({
        shipment_ids: ['S1', 'S2', 'S3'],
      });
    });

    it('should resolve nested property', async () => {
      const tool1 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'shipments',
          data: [
            { id: 'S1', facility: { id: 'F1', name: 'Facility 1' } },
          ],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      const tool2 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'facilities',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: {} },
          { tool: 'facilities', params: { id: '${step[0].data[0].facility.id}' }, depends_on: [0] },
        ],
      };

      await executor.execute(plan);

      expect(tool2.execute).toHaveBeenCalledWith({ id: 'F1' });
    });

    it('should handle multiple templates in same params', async () => {
      const tool1 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'test',
          data: { start: '2025-01-01', end: '2025-01-31' },
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      const tool2 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'test2',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'test', params: {} },
          {
            tool: 'test2',
            params: {
              date_from: '${step[0].data.start}',
              date_to: '${step[0].data.end}',
            },
            depends_on: [0],
          },
        ],
      };

      await executor.execute(plan);

      expect(tool2.execute).toHaveBeenCalledWith({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      });
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect direct circular dependency', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {}, depends_on: [1] },
          { tool: 'tool2', params: {}, depends_on: [0] },
        ],
      };

      await expect(executor.execute(plan)).rejects.toThrow('Circular dependency');
    });

    it('should detect indirect circular dependency', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {}, depends_on: [2] },
          { tool: 'tool2', params: {}, depends_on: [0] },
          { tool: 'tool3', params: {}, depends_on: [1] },
        ],
      };

      await expect(executor.execute(plan)).rejects.toThrow('Circular dependency');
    });

    it('should allow valid dependency chains', async () => {
      const createTool = () => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'test',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      });

      mockServer.getTool.mockImplementation(() => createTool());

      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {} },
          { tool: 'tool2', params: {}, depends_on: [0] },
          { tool: 'tool3', params: {}, depends_on: [1] },
          { tool: 'tool4', params: {}, depends_on: [2] },
        ],
      };

      await expect(executor.execute(plan)).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle tool not found error', async () => {
      mockServer.getTool.mockReturnValue(undefined);

      const plan: Plan = {
        steps: [{ tool: 'non-existent', params: {} }],
      };

      const results = await executor.execute(plan);

      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('Tool not found');
    });

    it('should handle tool execution error', async () => {
      const tool = {
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
      };

      mockServer.getTool.mockReturnValue(tool);

      const plan: Plan = {
        steps: [{ tool: 'test', params: {} }],
      };

      const results = await executor.execute(plan);

      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('Execution failed');
    });

    it('should continue execution on partial failure', async () => {
      const tool1 = {
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
      };

      const tool2 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'tool2',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {} },
          { tool: 'tool2', params: {} }, // Independent, should still execute
        ],
      };

      const results = await executor.execute(plan);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it('should fail fast when configured', async () => {
      const executorFailFast = new ExecutorAgent(mockServer, {
        failFast: true,
      });

      const tool1 = {
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
      };

      const tool2 = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          tool: 'tool2',
          data: [],
          metadata: { executionTime: 0, timestamp: new Date().toISOString() },
        }),
      };

      mockServer.getTool
        .mockReturnValueOnce(tool1)
        .mockReturnValueOnce(tool2);

      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {} },
          { tool: 'tool2', params: {} },
        ],
      };

      await expect(executorFailFast.execute(plan)).rejects.toThrow('Step 0 failed');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed tool executions', async () => {
      let attempts = 0;
      const tool = {
        execute: jest.fn().mockImplementation(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return {
            success: true,
            tool: 'test',
            data: [],
            metadata: { executionTime: 0, timestamp: new Date().toISOString() },
          };
        }),
      };

      mockServer.getTool.mockReturnValue(tool);

      const plan: Plan = {
        steps: [{ tool: 'test', params: {} }],
      };

      const results = await executor.execute(plan);

      expect(results[0].success).toBe(true);
      expect(tool.execute).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries configuration', async () => {
      const executorCustomRetries = new ExecutorAgent(mockServer, {
        maxRetries: 1,
      });

      const tool = {
        execute: jest.fn().mockRejectedValue(new Error('Always fails')),
      };

      mockServer.getTool.mockReturnValue(tool);

      const plan: Plan = {
        steps: [{ tool: 'test', params: {} }],
      };

      await executorCustomRetries.execute(plan);

      expect(tool.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout slow tool executions', async () => {
      const executorWithTimeout = new ExecutorAgent(mockServer, {
        toolTimeout: 100,
      });

      const tool = {
        execute: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 1000))
        ),
      };

      mockServer.getTool.mockReturnValue(tool);

      const plan: Plan = {
        steps: [{ tool: 'test', params: {} }],
      };

      const results = await executorWithTimeout.execute(plan);

      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('Timeout');
    }, 10000);
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customExecutor = new ExecutorAgent(mockServer, {
        maxParallelExecutions: 10,
        toolTimeout: 60000,
        maxRetries: 5,
        retryDelay: 2000,
        failFast: true,
      });

      expect(customExecutor).toBeDefined();
    });
  });
});

