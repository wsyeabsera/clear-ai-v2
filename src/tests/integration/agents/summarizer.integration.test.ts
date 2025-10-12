/**
 * Integration tests for Summarizer Agent
 * Tests with real LLM, no mocks
 */

import { SummarizerAgent } from '../../../agents/summarizer.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { getLLMConfigs } from '../../../shared/llm/config.js';
import { Analysis } from '../../../shared/types/agent.js';

describe('SummarizerAgent Integration', () => {
  let summarizer: SummarizerAgent;
  let llm: LLMProvider;

  beforeAll(() => {
    const llmConfigs = getLLMConfigs();
    llm = new LLMProvider(llmConfigs);
    summarizer = new SummarizerAgent(llm);
  });

  describe('Real LLM Summarization', () => {
    it('should generate summary with real LLM', async () => {
      const analysis: Analysis = {
        summary: 'Found 5 contaminated shipments',
        insights: [
          {
            type: 'trend',
            description: 'High contamination rate: 50% of shipments have contaminants',
            confidence: 0.9,
            supporting_data: [],
          },
        ],
        entities: [],
        anomalies: [],
        metadata: {
          tool_results_count: 1,
          analysis_time_ms: 100,
        },
      };

      const response = await summarizer.summarize(
        'Get contaminated shipments',
        analysis,
        ['shipments', 'contaminants-detected']
      );

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(0);
      expect(response.tools_used).toEqual(['shipments', 'contaminants-detected']);
      
      console.log('\n📝 Generated summary:', response.message);
    }, 30000);

    it('should handle complex analysis with anomalies', async () => {
      const analysis: Analysis = {
        summary: 'Analyzed facility operations',
        insights: [
          {
            type: 'pattern',
            description: '3 facilities operating above 90% capacity',
            confidence: 0.95,
            supporting_data: [],
          },
        ],
        entities: [],
        anomalies: [
          {
            type: 'threshold_exceeded',
            description: 'Critical contamination detected in 2 shipments',
            severity: 'critical',
            affected_entities: ['S1', 'S2'],
            data: {},
          },
        ],
        metadata: {
          tool_results_count: 2,
          analysis_time_ms: 150,
        },
      };

      const response = await summarizer.summarize(
        'Check facility status',
        analysis,
        ['facilities', 'contaminants-detected']
      );

      expect(response.message).toBeDefined();
      expect(response.message).toContain('Critical' || 'critical' || 'capacity');
      
      console.log('\n📝 Summary with anomalies:', response.message);
    }, 30000);
  });

  describe('Response Quality', () => {
    it('should produce readable responses', async () => {
      const analysis: Analysis = {
        summary: 'Test analysis',
        insights: [
          { type: 'trend', description: 'Insight 1', confidence: 0.8, supporting_data: [] },
          { type: 'pattern', description: 'Insight 2', confidence: 0.9, supporting_data: [] },
        ],
        entities: [],
        anomalies: [],
        metadata: {
          tool_results_count: 1,
          analysis_time_ms: 100,
        },
      };

      const response = await summarizer.summarize('test', analysis, ['tools']);

      // Response should be human-readable
      expect(response.message.length).toBeGreaterThan(10);
      expect(response.data).toBeDefined();
      expect(response.analysis).toEqual(analysis);
    }, 30000);
  });
});

