/**
 * Enhanced Summarizer Agent Tests
 * Tests chain-of-thought reasoning and self-critique validation
 */

import { SummarizerAgent } from '../../agents/summarizer.js';
import { Analysis } from '../../shared/types/agent.js';
import { LLMProvider } from '../../shared/llm/provider.js';

jest.mock('../../shared/llm/provider.js');

describe('Enhanced SummarizerAgent', () => {
  let summarizer: SummarizerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn(),
    } as any;

    // Use enhanced configuration
    summarizer = new SummarizerAgent(mockLLM, {
      enableChainOfThought: true,
      enableSelfCritique: true,
      maxLength: 500,
      includeRecommendations: true,
      tone: 'professional',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chain-of-Thought Reasoning', () => {
    it('should perform multi-step reasoning for summary generation', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Found contamination issues',
        insights: [
          {
            type: 'compliance_risk',
            description: 'Critical contaminants require immediate action',
            confidence: 0.95,
            supporting_data: [{ risk_level: 'critical' }]
          }
        ],
        entities: [],
        anomalies: [
          {
            type: 'threshold_exceeded',
            description: 'Critical contamination detected',
            severity: 'critical',
            affected_entities: ['C1'],
            data: { concentration: 1500 }
          }
        ],
        metadata: {
          tool_results_count: 1,
          analysis_time_ms: 100,
        },
      };

      // Mock chain-of-thought reasoning steps
      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'Key findings: Critical contaminants (1500ppm), immediate regulatory reporting required',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Priority: Critical contamination is highest priority, requires immediate action',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Structure: Executive summary first, then detailed findings, then recommendations',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Draft: Critical contamination detected requiring immediate regulatory reporting...',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        })
        .mockResolvedValueOnce({
          content: 'Critical contamination detected in shipment C1 with concentration of 1500ppm, exceeding regulatory limits. Immediate regulatory reporting required within 24 hours. Recommendations: 1) Notify authorities immediately, 2) Implement containment measures, 3) Review quality control processes.',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const response = await summarizer.summarize(
        'Show me contamination issues',
        mockAnalysis,
        ['contaminants_list']
      );

      expect(mockLLM.generate).toHaveBeenCalledTimes(5);
      expect(response.message).toContain('Critical contamination');
      expect(response.message).toContain('immediate');
      expect(response.metadata.reasoning_trace).toBeDefined();
      expect(response.metadata.reasoning_trace).toHaveLength(5);
    });

    it('should fallback to template summary on chain-of-thought failure', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Found issues',
        insights: [{
          type: 'compliance_risk',
          description: 'Critical issue',
          confidence: 0.9,
          supporting_data: []
        }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock chain-of-thought failure
      mockLLM.generate.mockRejectedValueOnce(new Error('LLM error'));

      const response = await summarizer.summarize(
        'test query',
        mockAnalysis,
        ['test_tool']
      );

      // Should still return a summary using template fallback
      expect(response.message).toBeDefined();
      expect(response.message).toContain('Based on your query');
    });
  });

  describe('Self-Critique Validation', () => {
    it('should validate summary completeness against query', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Analysis complete',
        insights: [{
          type: 'compliance_risk',
          description: 'Critical contamination found',
          confidence: 0.9,
          supporting_data: []
        }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock chain-of-thought that produces incomplete summary
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Critical contamination found', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'High priority issue', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Structure for executive audience', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Draft summary about contamination', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: 'Some contamination was found.', // Incomplete - doesn't address "show me contamination issues"
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const response = await summarizer.summarize(
        'Show me contamination issues and their severity levels',
        mockAnalysis,
        ['contaminants_list']
      );

      expect(response.metadata.validation_result).toBeDefined();
      if (response.metadata.validation_result) {
        expect(response.metadata.validation_result.issues.some(issue => 
          issue.type === 'completeness' && issue.description.includes('coverage')
        )).toBe(true);
      }
    });

    it('should detect missing actionable recommendations', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Analysis complete',
        insights: [{
          type: 'compliance_risk',
          description: 'Critical contamination found',
          confidence: 0.9,
          supporting_data: []
        }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock chain-of-thought that produces summary without recommendations
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Critical contamination found', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'High priority', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Structure for clarity', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Draft summary', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: 'Critical contamination was detected in the shipment. This exceeds regulatory limits.', // No recommendations
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const response = await summarizer.summarize(
        'test query',
        mockAnalysis,
        ['contaminants_list']
      );

      expect(response.metadata.validation_result).toBeDefined();
      if (response.metadata.validation_result) {
        expect(response.metadata.validation_result.issues.some(issue => 
          issue.type === 'actionability' && issue.description.includes('recommendations')
        )).toBe(true);
      }
    });

    it('should detect critical information prioritization issues', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Analysis complete',
        insights: [{
          type: 'operational_efficiency',
          description: 'Minor efficiency issue',
          confidence: 0.6,
          supporting_data: []
        }],
        entities: [],
        anomalies: [
          {
            type: 'threshold_exceeded',
            description: 'Critical contamination exceeds limits',
            severity: 'critical',
            affected_entities: ['C1'],
            data: { concentration: 2000 }
          }
        ],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock chain-of-thought that buries critical information
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Minor efficiency issue and critical contamination', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Prioritize efficiency first', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Structure with efficiency first', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Draft with efficiency focus', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: 'There is a minor efficiency issue that should be addressed. Additionally, there is some critical contamination that exceeds limits.', // Critical info buried
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const response = await summarizer.summarize(
        'test query',
        mockAnalysis,
        ['contaminants_list']
      );

      expect(response.metadata.validation_result).toBeDefined();
      if (response.metadata.validation_result) {
        expect(response.metadata.validation_result.issues.some(issue => 
          issue.type === 'completeness' && issue.description.includes('critical issues')
        )).toBe(true);
      }
    });
  });

  describe('Enhanced Communication Principles', () => {
    it('should apply waste management communication expertise', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Analysis complete',
        insights: [{
          type: 'compliance_risk',
          description: 'Critical contaminants require immediate action',
          confidence: 0.95,
          supporting_data: [{ contaminants: ['Lead', 'Mercury'], levels: [1500, 800] }]
        }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock chain-of-thought with regulatory expertise
      mockLLM.generate
        .mockResolvedValueOnce({ content: 'Critical heavy metals: Lead 1500ppm, Mercury 800ppm', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Highest priority: Regulatory reporting required within 24 hours', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Executive format with clear action items', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({ content: 'Draft with regulatory compliance focus', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } })
        .mockResolvedValueOnce({
          content: 'CRITICAL: Heavy metal contamination detected requiring immediate regulatory action. Lead (1500ppm) and Mercury (800ppm) levels exceed EPA limits. Regulatory reporting must be completed within 24 hours. Immediate recommendations: 1) Notify EPA immediately, 2) Implement containment measures, 3) Document all procedures for compliance audit.',
          provider: 'openai',
          model: 'gpt-4',
          metadata: { latency_ms: 100, retries: 0 },
        });

      const response = await summarizer.summarize(
        'Show me contamination risks',
        mockAnalysis,
        ['contaminants_list']
      );

      expect(response.message).toContain('CRITICAL');
      expect(response.message).toContain('24 hours');
      expect(response.message).toContain('EPA');
      expect(response.message).toContain('containment measures');
    });

    it('should adapt tone for different audiences', async () => {
      // Test professional tone
      const professionalSummarizer = new SummarizerAgent(mockLLM, {
        tone: 'professional',
        enableChainOfThought: true,
        enableSelfCritique: false, // Disable for simpler test
      });

      const mockAnalysis: Analysis = {
        summary: 'Analysis complete',
        insights: [{
          type: 'operational_efficiency',
          description: 'Capacity utilization issue',
          confidence: 0.8,
          supporting_data: []
        }],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      mockLLM.generate
        .mockResolvedValue({ content: 'Capacity utilization analysis indicates operational inefficiencies requiring management attention and strategic planning for optimization.', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } });

      const professionalResponse = await professionalSummarizer.summarize(
        'test query',
        mockAnalysis,
        ['facilities_list']
      );

      // Test casual tone
      const casualSummarizer = new SummarizerAgent(mockLLM, {
        tone: 'casual',
        enableChainOfThought: false,
        enableSelfCritique: false,
      });

      mockLLM.generate
        .mockResolvedValue({ content: 'Hey there! So we found some capacity issues that we should probably look into. Nothing too urgent, but worth checking out.', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } });

      const casualResponse = await casualSummarizer.summarize(
        'test query',
        mockAnalysis,
        ['facilities_list']
      );

      expect(professionalResponse.message).toContain('strategic planning');
      expect(casualResponse.message).toContain('Hey there');
    });
  });

  describe('Configuration Options', () => {
    it('should respect chain-of-thought configuration', async () => {
      const summarizerWithoutCoT = new SummarizerAgent(mockLLM, {
        enableChainOfThought: false,
        enableSelfCritique: false,
      });

      const mockAnalysis: Analysis = {
        summary: 'Test analysis',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      mockLLM.generate.mockResolvedValueOnce({
        content: 'Test summary response',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const response = await summarizerWithoutCoT.summarize(
        'test query',
        mockAnalysis,
        ['test_tool']
      );

      // Should use direct LLM call, not chain-of-thought
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
      expect(response.metadata.reasoning_trace).toBeUndefined();
    });

    it('should respect self-critique configuration', async () => {
      const summarizerWithoutCritique = new SummarizerAgent(mockLLM, {
        enableChainOfThought: true,
        enableSelfCritique: false,
      });

      const mockAnalysis: Analysis = {
        summary: 'Test analysis',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock chain-of-thought steps
      mockLLM.generate
        .mockResolvedValue({ content: 'Step output', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } });

      const response = await summarizerWithoutCritique.summarize(
        'test query',
        mockAnalysis,
        ['test_tool']
      );

      expect(response.metadata.validation_result).toBeUndefined();
    });

    it('should respect length constraints', async () => {
      const shortSummarizer = new SummarizerAgent(mockLLM, {
        maxLength: 50,
        enableChainOfThought: false,
        enableSelfCritique: false,
      });

      const mockAnalysis: Analysis = {
        summary: 'Test analysis',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      mockLLM.generate.mockResolvedValueOnce({
        content: 'This is a very long summary that exceeds the maximum length constraint and should trigger validation issues.',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 },
      });

      const response = await shortSummarizer.summarize(
        'test query',
        mockAnalysis,
        ['test_tool']
      );

      // Should still work but validation would flag length issues if enabled
      expect(response.message).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM failures gracefully', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Test analysis',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock LLM failure
      mockLLM.generate.mockRejectedValue(new Error('LLM service unavailable'));

      const response = await summarizer.summarize(
        'test query',
        mockAnalysis,
        ['test_tool']
      );

      // Should fallback to template summary
      expect(response.message).toBeDefined();
      expect(response.message).toContain('Based on your query');
    });

    it('should handle validation errors gracefully', async () => {
      const mockAnalysis: Analysis = {
        summary: 'Test analysis',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 1, analysis_time_ms: 100 },
      };

      // Mock successful chain-of-thought but validation failure
      mockLLM.generate
        .mockResolvedValue({ content: 'Step output', provider: 'openai', model: 'gpt-4', metadata: { latency_ms: 100, retries: 0 } });

      // Mock validation that throws error
      jest.spyOn(summarizer as any, 'validateSummary').mockRejectedValue(new Error('Validation error'));

      const response = await summarizer.summarize(
        'test query',
        mockAnalysis,
        ['test_tool']
      );

      // Should still return summary despite validation error
      expect(response.message).toBeDefined();
    });
  });
});
