/**
 * Unit tests for Planner Agent
 * All dependencies are mocked
 */

import { PlannerAgent } from '../../agents/planner.js';
import { PlanSchema } from '../../shared/validation/schemas.js';
import { LLMProvider } from '../../shared/llm/provider.js';
import { MCPServer } from '../../mcp/server.js';

// Mock the dependencies
jest.mock('../../shared/llm/provider.js');
jest.mock('../../mcp/server.js');

describe('PlannerAgent', () => {
  let planner: PlannerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;
  let mockMCPServer: jest.Mocked<MCPServer>;

  beforeEach(() => {
    // Create mock LLM provider
    mockLLM = {
      generate: jest.fn(),
    } as any;

    // Create mock MCP server
    mockMCPServer = {
      getTool: jest.fn(),
    } as any;

    planner = new PlannerAgent(mockLLM, mockMCPServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Simple Query Planning', () => {
    it('should generate valid plan for simple query', async () => {
      const mockPlan = {
        steps: [{
          tool: 'shipments',
          params: { date_from: '2025-10-04', date_to: '2025-10-11' },
        }],
        metadata: {
          query: 'Get shipments from last week',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('Get shipments from last week');

      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].tool).toBe('shipments');
      expect(plan.steps[0].params).toHaveProperty('date_from');
      
      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    });

    it('should include query in metadata', async () => {
      const mockPlan = {
        steps: [{ tool: 'facilities', params: { location: 'Hannover' } }],
        metadata: {
          query: 'test query',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('test query');

      expect(plan.metadata?.query).toBe('test query');
    });
  });

  describe('Query with Dependencies', () => {
    it('should handle nested queries with dependencies', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'shipments',
            params: { has_contaminants: true },
          },
          {
            tool: 'contaminants-detected',
            params: { shipment_ids: '${step[0].data.*.id}' },
            depends_on: [0],
          },
        ],
        metadata: {
          query: 'Get contaminated shipments and details',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 150, retries: 0 },
      });

      const plan = await planner.plan('Get contaminated shipments and details');

      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[1].depends_on).toEqual([0]);
      expect(plan.steps[1].params.shipment_ids).toContain('${step[0]');
    });

    it('should validate dependency indices', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'shipments',
            params: {},
          },
          {
            tool: 'contaminants-detected',
            params: {},
            depends_on: [5], // Invalid index
          },
        ],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(planner.plan('test')).rejects.toThrow('Invalid dependency index');
    });
  });

  describe('JSON Extraction', () => {
    it('should extract JSON from markdown code blocks', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: '```json\n' + JSON.stringify(mockPlan) + '\n```',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('test');

      expect(plan.steps).toHaveLength(1);
    });

    it('should extract JSON from mixed text', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: 'Here is the plan: ' + JSON.stringify(mockPlan) + ' Done!',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('test');

      expect(plan.steps).toHaveLength(1);
    });

    it('should parse plain JSON', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('test');

      expect(plan.steps).toHaveLength(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on invalid JSON', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'invalid json',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify(mockPlan),
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const plan = await planner.plan('test');

      expect(mockLLM.generate).toHaveBeenCalledTimes(2);
      expect(plan.steps).toHaveLength(1);
    });

    it('should throw after max retries', async () => {
      mockLLM.generate.mockResolvedValue({
        content: 'invalid json',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(planner.plan('test')).rejects.toThrow('Failed to generate valid plan');
      expect(mockLLM.generate).toHaveBeenCalledTimes(3); // maxRetries = 3
    });

    it('should include error feedback in retry prompt', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'invalid',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify(mockPlan),
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      await planner.plan('test');

      const secondCall = mockLLM.generate.mock.calls[1][0];
      expect(secondCall.messages[1].content).toContain('Previous attempt failed');
    });
  });

  describe('Tool Availability Validation', () => {
    it('should validate tool availability when enabled', async () => {
      const mockPlan = {
        steps: [{ tool: 'non-existent-tool', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(planner.plan('test')).rejects.toThrow('Tool not available');
    });

    it('should skip validation when disabled', async () => {
      const plannerNoValidation = new PlannerAgent(mockLLM, mockMCPServer, {
        validateToolAvailability: false,
      });

      const mockPlan = {
        steps: [{ tool: 'any-tool', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await plannerNoValidation.plan('test');

      expect(plan.steps[0].tool).toBe('any-tool');
    });
  });

  describe('Context Handling', () => {
    it('should include context in LLM prompt when provided', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const context = {
        semantic: [{ text: 'Previous similar query', score: 0.9 }],
        entities: ['facility:F1'],
      };

      await planner.plan('test query', context);

      const call = mockLLM.generate.mock.calls[0][0];
      expect(call.messages[1].content).toContain('Context:');
      expect(call.messages[1].content).toContain('facility:F1');
    });

    it('should work without context', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('test query');

      expect(plan).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM failures gracefully', async () => {
      mockLLM.generate.mockRejectedValue(new Error('LLM error'));

      await expect(planner.plan('test')).rejects.toThrow();
    });

    it('should handle schema validation failures', async () => {
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify({ invalid: 'structure' }),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(planner.plan('test')).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use custom temperature', async () => {
      const customPlanner = new PlannerAgent(mockLLM, mockMCPServer, {
        temperature: 0.5,
      });

      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await customPlanner.plan('test');

      const call = mockLLM.generate.mock.calls[0][0];
      expect(call.config?.temperature).toBe(0.5);
    });

    it('should use custom maxRetries', async () => {
      const customPlanner = new PlannerAgent(mockLLM, mockMCPServer, {
        maxRetries: 1,
      });

      mockLLM.generate.mockResolvedValue({
        content: 'invalid',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(customPlanner.plan('test')).rejects.toThrow();
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Plan Quality Validation', () => {
    it('should validate template syntax and throw error for .ids usage', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'contaminants_list',
            params: { shipment_ids: '${step[0].data.ids}' }, // Wrong: .ids instead of .*.id
          },
        ],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(planner.plan('test')).rejects.toThrow('Invalid template: use ${step[N].data.*.id} not .ids');
    });

    it('should validate parameter names for contaminants_list', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'contaminants_list',
            params: { ids: '${step[0].data.*.id}' }, // Wrong: ids instead of shipment_ids
          },
        ],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      await expect(planner.plan('test')).rejects.toThrow('contaminants_list uses "shipment_ids" not "ids"');
    });

    it('should generate valid multi-step plan for facilities and contaminants', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { type: 'sorting' },
            depends_on: [],
            parallel: false,
          },
          {
            tool: 'contaminants_list',
            params: {
              facility_id: '${step[0].data[0].id}',
            },
            depends_on: [0],
            parallel: false,
          },
        ],
        metadata: {
          query: 'Get sorting facilities and their contaminants',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('Get sorting facilities and their contaminants');

      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].tool).toBe('facilities_list');
      expect(plan.steps[1].tool).toBe('contaminants_list');
      expect(plan.steps[1].depends_on).toEqual([0]);
      expect(plan.steps[1].params.facility_id).toContain('${step[0]');
    });

    it('should generate valid plan for shipments to contaminants', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'shipments_list',
            params: { has_contaminants: true },
            depends_on: [],
            parallel: false,
          },
          {
            tool: 'contaminants_list',
            params: {
              shipment_ids: '${step[0].data.*.id}',
            },
            depends_on: [0],
            parallel: false,
          },
        ],
        metadata: {
          query: 'Get contaminated shipments and their contaminant details',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const plan = await planner.plan('Get contaminated shipments and their contaminant details');

      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].tool).toBe('shipments_list');
      expect(plan.steps[1].tool).toBe('contaminants_list');
      expect(plan.steps[1].depends_on).toEqual([0]);
      expect(plan.steps[1].params.shipment_ids).toContain('${step[0].data.*.id}');
    });

    it('should warn for single-step plan when multi-step is suggested', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { type: 'sorting' },
            depends_on: [],
            parallel: false,
          },
        ],
        metadata: {
          query: 'Get sorting facilities and their contaminants',
          timestamp: new Date().toISOString(),
        },
      };

      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await planner.plan('Get sorting facilities and their contaminants');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Query suggests multi-step plan but only 1 step generated')
      );

      consoleSpy.mockRestore();
    });
  });
});

