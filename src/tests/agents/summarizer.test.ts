/**
 * Unit tests for Summarizer Agent
 * All dependencies are mocked
 */

import { SummarizerAgent } from '../../agents/summarizer.js';
import { Analysis } from '../../shared/types/agent.js';
import { LLMProvider } from '../../shared/llm/provider.js';

jest.mock('../../shared/llm/provider.js');

describe('SummarizerAgent', () => {
  let summarizer: SummarizerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn().mockResolvedValue({
        content: 'Test summary response',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      }),
    } as any;

    summarizer = new SummarizerAgent(mockLLM);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Summarization', () => {
    it('should generate summary from analysis', async () => {
      const analysis: Analysis = {
        summary: 'Found data',
        insights: [{
          type: 'trend',
          description: 'High contamination rate',
          confidence: 0.9,
          supporting_data: [],
        }],
        entities: [],
        anomalies: [],
        metadata: {
          tool_results_count: 1,
          analysis_time_ms: 100,
        },
      };

      const response = await summarizer.summarize(
        'test query',
        analysis,
        ['shipments']
      );

      expect(response.message).toBeDefined();
      expect(response.tools_used).toEqual(['shipments']);
      expect(mockLLM.generate).toHaveBeenCalled();
    });

    it('should include insights in prompt', async () => {
      const analysis: Analysis = {
        summary: 'Test',
        insights: [
          {
            type: 'trend',
            description: 'Key insight 1',
            confidence: 0.9,
            supporting_data: [],
          },
          {
            type: 'pattern',
            description: 'Key insight 2',
            confidence: 0.8,
            supporting_data: [],
          },
        ],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      await summarizer.summarize('test', analysis, ['tools']);

      const promptCall = mockLLM.generate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('Key insight 1');
      expect(promptCall.messages[1].content).toContain('Key insight 2');
    });

    it('should highlight critical anomalies', async () => {
      const analysis: Analysis = {
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [{
          type: 'threshold_exceeded',
          description: 'Critical issue',
          severity: 'critical',
          affected_entities: [],
          data: {},
        }],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      await summarizer.summarize('test', analysis, ['tools']);

      const promptCall = mockLLM.generate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('Critical issue');
    });
  });

  describe('Fallback to Template', () => {
    it('should use template when LLM fails', async () => {
      mockLLM.generate.mockRejectedValue(new Error('LLM failed'));

      const analysis: Analysis = {
        summary: 'Test summary',
        insights: [{
          type: 'trend',
          description: 'Test insight',
          confidence: 0.9,
          supporting_data: [],
        }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      const response = await summarizer.summarize(
        'test query',
        analysis,
        ['shipments']
      );

      expect(response.message).toContain('test query');
      expect(response.message).toContain('Test insight');
      expect(response.tools_used).toEqual(['shipments']);
    });
  });

  describe('Response Structure', () => {
    it('should include tools_used in response', async () => {
      const analysis: Analysis = {
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      const response = await summarizer.summarize('test', analysis, ['tool1', 'tool2']);

      expect(response.tools_used).toEqual(['tool1', 'tool2']);
    });

    it('should include analysis data', async () => {
      const analysis: Analysis = {
        summary: 'Test',
        insights: [{ type: 'trend', description: 'insight', confidence: 0.9, supporting_data: [] }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      const response = await summarizer.summarize('test', analysis, ['tools']);

      expect(response.data).toBeDefined();
      expect(response.data.insights).toHaveLength(1);
      expect(response.analysis).toEqual(analysis);
    });

    it('should include metadata', async () => {
      const analysis: Analysis = {
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      const response = await summarizer.summarize('test', analysis, ['tools']);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should respect maxLength configuration', async () => {
      const customSummarizer = new SummarizerAgent(mockLLM, { maxLength: 200 });

      const analysis: Analysis = {
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      await customSummarizer.summarize('test', analysis, ['tools']);

      const promptCall = mockLLM.generate.mock.calls[0][0];
      expect(promptCall.config?.max_tokens).toBe(400); // 2x maxLength
    });
  });
});

