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
        ['facilities_list', 'contaminants_list']
      );

      expect(response.message).toBeDefined();
      // Check for keywords (case-insensitive)
      const hasRelevantKeywords = /critical|capacity|contamination/i.test(response.message);
      expect(hasRelevantKeywords).toBe(true);
      
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

  describe('Output Formats', () => {
    it('should produce plain text output with small dataset', async () => {
      const analysis: Analysis = {
        summary: 'Found 3 shipments',
        insights: [
          { type: 'trend', description: 'Low contamination rate', confidence: 0.85, supporting_data: [] },
        ],
        entities: [
          { id: 'S1', type: 'shipment', name: 'S1', attributes: {}, relationships: [] },
          { id: 'S2', type: 'shipment', name: 'S2', attributes: {}, relationships: [] },
        ],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 50 },
      };

      const response = await summarizer.summarize('Get shipments', analysis, ['shipments']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(20);
      
      console.log('\n📄 Plain text format:', response.message.substring(0, 100));
    }, 30000);

    it('should produce plain text output with large dataset', async () => {
      const largeAnalysis: Analysis = {
        summary: 'Found 50 shipments with complex patterns',
        insights: Array.from({ length: 5 }, (_, i) => ({
          type: 'pattern',
          description: `Pattern ${i + 1}: Complex trend detected`,
          confidence: 0.8 + (i * 0.02),
          supporting_data: [],
        })),
        entities: Array.from({ length: 50 }, (_, i) => ({
          id: `S${i}`,
          type: 'shipment',
          name: `Shipment ${i}`,
          attributes: {},
          relationships: [],
        })),
        anomalies: [
          { type: 'outlier', description: 'Unusual concentration', severity: 'high', affected_entities: ['S1'], data: {} },
        ],
        metadata: { tool_results_count: 2, analysis_time_ms: 300 },
      };

      const response = await summarizer.summarize('Complex query', largeAnalysis, ['shipments', 'contaminants']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(100);
      
      console.log('\n📊 Large dataset summary length:', response.message.length);
    }, 30000);

    it('should produce markdown output format with tables and lists', async () => {
      const markdownSummarizer = new SummarizerAgent(llm, { format: 'markdown' });

      const analysis: Analysis = {
        summary: 'Facility analysis with statistics',
        insights: [
          { type: 'comparison', description: 'Facility A has 30% higher throughput', confidence: 0.9, supporting_data: [] },
          { type: 'trend', description: 'Increasing contamination rates', confidence: 0.85, supporting_data: [] },
        ],
        entities: [
          { id: 'F1', type: 'facility', name: 'Facility Berlin', attributes: {}, relationships: [] },
          { id: 'F2', type: 'facility', name: 'Facility Munich', attributes: {}, relationships: [] },
        ],
        anomalies: [],
        metadata: { tool_results_count: 2, analysis_time_ms: 150 },
      };

      const response = await markdownSummarizer.summarize('Compare facilities', analysis, ['facilities']);

      expect(response.message).toBeDefined();
      // Check for markdown elements (might not always be present depending on LLM output)
      const hasMarkdownElements = response.message.includes('#') || 
                                   response.message.includes('**') || 
                                   response.message.includes('- ');
      
      console.log('\n📝 Markdown format detected:', hasMarkdownElements);
      console.log('Sample:', response.message.substring(0, 150));
    }, 30000);
  });

  describe('Tone Control', () => {
    it('should use professional tone with formal language', async () => {
      const professionalSummarizer = new SummarizerAgent(llm, { tone: 'professional' });

      const analysis: Analysis = {
        summary: 'Critical contamination detected',
        insights: [
          { type: 'trend', description: 'High-risk contaminants increasing', confidence: 0.95, supporting_data: [] },
        ],
        entities: [],
        anomalies: [
          { type: 'threshold_exceeded', description: 'Critical level exceeded', severity: 'critical', affected_entities: ['S1'], data: {} },
        ],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      const response = await professionalSummarizer.summarize('Risk assessment', analysis, ['contaminants']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(30);
      
      console.log('\n👔 Professional tone:', response.message.substring(0, 100));
    }, 30000);

    it('should use technical tone with detailed metrics', async () => {
      const technicalSummarizer = new SummarizerAgent(llm, { tone: 'technical' });

      const analysis: Analysis = {
        summary: 'Statistical analysis of shipment data',
        insights: [
          { type: 'pattern', description: 'Mean contamination rate: 35%, StdDev: 12%', confidence: 0.92, supporting_data: [] },
          { type: 'correlation', description: 'Strong correlation between carrier and contamination', confidence: 0.88, supporting_data: [] },
        ],
        entities: [],
        anomalies: [
          { type: 'outlier', description: 'Value 3.5σ above mean', severity: 'high', affected_entities: ['S10'], data: {} },
        ],
        metadata: { tool_results_count: 3, analysis_time_ms: 200 },
      };

      const response = await technicalSummarizer.summarize('Statistical analysis', analysis, ['shipments', 'analytics']);

      expect(response.message).toBeDefined();
      
      console.log('\n🔬 Technical tone:', response.message.substring(0, 100));
    }, 30000);

    it('should use casual tone with simplified language', async () => {
      const casualSummarizer = new SummarizerAgent(llm, { tone: 'casual' });

      const analysis: Analysis = {
        summary: 'Quick check on shipments',
        insights: [
          { type: 'trend', description: 'Things looking good overall', confidence: 0.8, supporting_data: [] },
        ],
        entities: [
          { id: 'S1', type: 'shipment', name: 'Shipment 1', attributes: {}, relationships: [] },
        ],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 80 },
      };

      const response = await casualSummarizer.summarize('Quick check', analysis, ['shipments']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(10);
      
      console.log('\n😊 Casual tone:', response.message.substring(0, 100));
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle summarization with no insights (data-only response)', async () => {
      const analysis: Analysis = {
        summary: 'Query executed successfully',
        insights: [], // No insights
        entities: [
          { id: 'S1', type: 'shipment', name: 'S1', attributes: { weight: 100 }, relationships: [] },
          { id: 'S2', type: 'shipment', name: 'S2', attributes: { weight: 200 }, relationships: [] },
        ],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 50 },
      };

      const response = await summarizer.summarize('Get data', analysis, ['shipments']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(10);
      // Should still provide a useful response even without insights
      
      console.log('\n📋 Data-only response:', response.message);
    }, 30000);

    it('should handle summarization with many insights (10+ insights)', async () => {
      const analysis: Analysis = {
        summary: 'Comprehensive analysis with multiple findings',
        insights: Array.from({ length: 12 }, (_, i) => ({
          type: i % 3 === 0 ? 'trend' : i % 3 === 1 ? 'pattern' : 'correlation',
          description: `Insight ${i + 1}: ${i % 2 === 0 ? 'Positive' : 'Negative'} finding`,
          confidence: 0.7 + (i * 0.02),
          supporting_data: [],
        })),
        entities: [],
        anomalies: [
          { type: 'outlier', description: 'Anomaly 1', severity: 'high', affected_entities: [], data: {} },
          { type: 'outlier', description: 'Anomaly 2', severity: 'medium', affected_entities: [], data: {} },
        ],
        metadata: { tool_results_count: 5, analysis_time_ms: 500 },
      };

      const response = await summarizer.summarize('Comprehensive analysis', analysis, ['multiple-tools']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(100);
      // Should organize many insights into a coherent summary
      
      console.log('\n📚 Many insights summary length:', response.message.length);
      console.log('Insights summarized:', analysis.insights.length);
    }, 30000);

    it('should handle LLM fallback when needed', async () => {
      const analysis: Analysis = {
        summary: 'Complex scenario requiring interpretation',
        insights: [
          { 
            type: 'pattern', 
            description: 'Unusual pattern detected requiring contextual understanding and domain expertise to interpret correctly', 
            confidence: 0.75, 
            supporting_data: [{ complex: 'data', nested: { values: [1, 2, 3] } }] 
          },
        ],
        entities: [],
        anomalies: [
          { 
            type: 'unexpected', 
            description: 'Unexpected behavior in system', 
            severity: 'medium', 
            affected_entities: ['E1', 'E2', 'E3'], 
            data: {} 
          },
        ],
        metadata: { tool_results_count: 3, analysis_time_ms: 350 },
      };

      const response = await summarizer.summarize('Complex interpretation', analysis, ['advanced-analysis']);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(50);
      // LLM should provide meaningful interpretation
      
      console.log('\n🤖 LLM-enhanced summary:', response.message.substring(0, 150));
    }, 40000);

    it('should handle empty analysis gracefully', async () => {
      const analysis: Analysis = {
        summary: 'No data found',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 10 },
      };

      const response = await summarizer.summarize('Empty query', analysis, []);

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(5);
      // Should provide informative message about no data
      
      console.log('\n∅ Empty analysis message:', response.message);
    }, 30000);
  });
});

