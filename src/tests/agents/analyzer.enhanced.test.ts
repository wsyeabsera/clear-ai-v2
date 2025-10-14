/**
 * Enhanced Analyzer Agent Tests
 * Tests chain-of-thought reasoning and self-critique validation
 */

import { AnalyzerAgent } from '../../agents/analyzer.js';
import { ToolResult } from '../../shared/types/agent.js';
import { LLMProvider } from '../../shared/llm/provider.js';

// Mock the LLM provider
jest.mock('../../shared/llm/provider.js');

describe('Enhanced AnalyzerAgent', () => {
  let analyzer: AnalyzerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn(),
    } as any;

    // Use enhanced configuration
    analyzer = new AnalyzerAgent(mockLLM, {
      useLLM: true,
      enableChainOfThought: true,
      enableSelfCritique: true,
      minConfidence: 0.7,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chain-of-Thought Reasoning', () => {
    it('should perform multi-step reasoning for insight generation', async () => {
      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'shipments_list',
        data: [
          { id: 'S1', has_contaminants: true, status: 'delivered', weight_kg: 5000 },
          { id: 'S2', has_contaminants: false, status: 'rejected', weight_kg: 3000 },
          { id: 'S3', has_contaminants: true, status: 'delivered', weight_kg: 8000 },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      // Mock chain-of-thought reasoning steps
      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'Observations: 2 contaminated shipments, 1 rejected shipment, average weight 5333kg',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Correlations: contaminated shipments are heavier, rejected shipment is clean',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Hypotheses: weight correlation with contamination, quality control issues',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Validation: data supports weight-contamination correlation hypothesis',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([{
            type: 'contamination_pattern',
            description: 'Heavier shipments show higher contamination rates - investigate load optimization',
            confidence: 0.85,
            supporting_data: [{ avg_weight_contaminated: 6500, avg_weight_clean: 3000 }]
          }]),
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const analysis = await analyzer.analyze(mockResults);

      expect(mockLLM.generate).toHaveBeenCalledTimes(5);
      expect(analysis.insights).toHaveLength(1);
      expect(analysis.insights[0].confidence).toBeGreaterThanOrEqual(0.7);
      expect(analysis.reasoning_trace).toBeDefined();
    });

    it('should fallback to rule-based analysis on chain-of-thought failure', async () => {
      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'shipments_list',
        data: [{ id: 'S1', has_contaminants: true, status: 'delivered' }],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      // Mock chain-of-thought failure
      mockLLM.generate.mockRejectedValueOnce(new Error('LLM error'));

      const analysis = await analyzer.analyze(mockResults);

      // Should still return insights from rule-based analysis
      expect(analysis.insights.length).toBeGreaterThan(0);
      expect(analysis.summary).toContain('Analyzed');
    });
  });

  describe('Self-Critique Validation', () => {
    it('should validate insights and filter low-quality ones', async () => {
      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'contaminants_list',
        data: [
          { id: 'C1', risk_level: 'critical', concentration_ppm: 1500 },
          { id: 'C2', risk_level: 'high', concentration_ppm: 500 },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      // Mock chain-of-thought that produces mixed quality insights
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Critical contaminants detected', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'High risk correlation found', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Hypothesis: contamination source identified', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Validation confirms high risk', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: JSON.stringify([
            {
              type: 'compliance_risk',
              description: 'Critical contaminants require immediate action',
              confidence: 0.95,
              supporting_data: [{ critical_count: 1, high_count: 1 }]
            },
            {
              type: 'contamination_pattern',
              description: 'Some pattern observed', // Low quality insight
              confidence: 0.3, // Below threshold
              supporting_data: []
            }
          ]),
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const analysis = await analyzer.analyze(mockResults);

      // Should filter out low-confidence insights
      expect(analysis.insights.length).toBe(1);
      expect(analysis.insights[0].confidence).toBeGreaterThanOrEqual(0.7);
      expect(analysis.validation_result).toBeDefined();
    });

    it('should detect completeness issues in insights', async () => {
      const mockResults: ToolResult[] = [
        {
          success: true,
          tool: 'contaminants_list',
          data: [{ id: 'C1', risk_level: 'critical', concentration_ppm: 1500 }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: true,
          tool: 'facilities_list',
          data: [{ id: 'F1', capacity_tons: 1000, current_load_tons: 950 }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        }
      ];

      // Mock insights that miss operational efficiency analysis
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Critical contaminants found', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'High facility utilization', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Hypothesis about contamination', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Validation confirms risks', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: JSON.stringify([{
            type: 'compliance_risk',
            description: 'Critical contaminants detected',
            confidence: 0.9,
            supporting_data: [{ risk_level: 'critical' }]
          }]),
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const analysis = await analyzer.analyze(mockResults);

      expect(analysis.validation_result).toBeDefined();
      if (analysis.validation_result) {
        expect(analysis.validation_result.issues.some(issue => 
          issue.type === 'completeness' && issue.description.includes('operational efficiency')
        )).toBe(true);
      }
    });
  });

  describe('Enhanced Domain Knowledge', () => {
    it('should apply waste management expertise in analysis', async () => {
      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'contaminants_list',
        data: [
          { id: 'C1', type: 'Lead', concentration_ppm: 1500, risk_level: 'critical' },
          { id: 'C2', type: 'Mercury', concentration_ppm: 800, risk_level: 'high' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Critical Lead and High Mercury detected', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Heavy metal contamination pattern', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Electronic waste source hypothesis', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Validation confirms electronic waste correlation', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: JSON.stringify([{
            type: 'compliance_risk',
            description: 'Critical heavy metal contamination (Lead 1500ppm, Mercury 800ppm) requires immediate regulatory reporting within 24 hours',
            confidence: 0.95,
            supporting_data: [{ contaminants: ['Lead', 'Mercury'], levels: [1500, 800], regulatory_requirement: '24_hour_reporting' }]
          }]),
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const analysis = await analyzer.analyze(mockResults);

      expect(analysis.insights[0].description).toContain('regulatory reporting');
      expect(analysis.insights[0].description).toContain('24 hours');
      expect(analysis.insights[0].supporting_data[0]).toHaveProperty('regulatory_requirement');
    });

    it('should detect data quality issues with enhanced validation', async () => {
      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'facilities_list',
        data: [{
          id: 'F1',
          accepted_waste_types: ['p', 'l', 'a'], // Malformed: single characters
          rejected_waste_types: ['plastic', 'metal'],
        }],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(mockResults);

      // Should detect malformed waste type arrays
      const dataQualityAnomalies = analysis.anomalies.filter(a => a.type === 'data_quality');
      expect(dataQualityAnomalies.length).toBeGreaterThan(0);
      expect(dataQualityAnomalies.some(a => a.description.includes('single characters'))).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should respect chain-of-thought configuration', async () => {
      const analyzerWithoutCoT = new AnalyzerAgent(mockLLM, {
        useLLM: true,
        enableChainOfThought: false,
        enableSelfCritique: false,
      });

      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'shipments_list',
        data: [{ id: 'S1', has_contaminants: true }],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      mockLLM.generate.mockResolvedValueOnce({
        content: JSON.stringify([{
          type: 'contamination_pattern',
          description: 'Contamination detected',
          confidence: 0.8,
          supporting_data: []
        }]),
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const analysis = await analyzerWithoutCoT.analyze(mockResults);

      // Should use direct LLM call, not chain-of-thought
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
      expect(analysis.reasoning_trace).toBeUndefined();
    });

    it('should respect self-critique configuration', async () => {
      const analyzerWithoutCritique = new AnalyzerAgent(mockLLM, {
        useLLM: true,
        enableChainOfThought: true,
        enableSelfCritique: false,
      });

      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'shipments_list',
        data: [{ id: 'S1', has_contaminants: true }],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      // Mock chain-of-thought steps
      mockLLM.generate
        .mockResolvedValue({ content: 'Step output', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } });

      const analysis = await analyzerWithoutCritique.analyze(mockResults);

      expect(analysis.validation_result).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const mockResults: ToolResult[] = [{
        success: true,
        tool: 'shipments_list',
        data: [{ id: 'S1', has_contaminants: true }],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      // Mock chain-of-thought that returns invalid JSON
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Step 1', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Step 2', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Step 3', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Step 4', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Invalid JSON response', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } });

      const analysis = await analyzer.analyze(mockResults);

      // Should fallback to rule-based analysis
      expect(analysis.insights.length).toBeGreaterThan(0);
      expect(analysis.summary).toContain('Analyzed');
    });
  });
});
