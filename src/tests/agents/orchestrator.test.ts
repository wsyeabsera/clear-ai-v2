/**
 * Unit tests for Orchestrator Agent
 * All dependencies are mocked
 */

import { OrchestratorAgent } from '../../agents/orchestrator.js';
import { PlannerAgent } from '../../agents/planner.js';
import { ExecutorAgent } from '../../agents/executor.js';
import { AnalyzerAgent } from '../../agents/analyzer.js';
import { SummarizerAgent } from '../../agents/summarizer.js';
import { MemoryManager } from '../../shared/memory/manager.js';

jest.mock('../../agents/planner.js');
jest.mock('../../agents/executor.js');
jest.mock('../../agents/analyzer.js');
jest.mock('../../agents/summarizer.js');
jest.mock('../../shared/memory/manager.js');

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;
  let mockPlanner: jest.Mocked<PlannerAgent>;
  let mockExecutor: jest.Mocked<ExecutorAgent>;
  let mockAnalyzer: jest.Mocked<AnalyzerAgent>;
  let mockSummarizer: jest.Mocked<SummarizerAgent>;
  let mockMemory: jest.Mocked<MemoryManager>;

  beforeEach(() => {
    mockPlanner = {
      plan: jest.fn(),
    } as any;

    mockExecutor = {
      execute: jest.fn(),
    } as any;

    mockAnalyzer = {
      analyze: jest.fn(),
    } as any;

    mockSummarizer = {
      summarize: jest.fn(),
    } as any;

    mockMemory = {
      querySemantic: jest.fn().mockResolvedValue([]),
      queryEpisodic: jest.fn().mockResolvedValue([]),
      storeEpisodic: jest.fn().mockResolvedValue(undefined),
      storeSemantic: jest.fn().mockResolvedValue(undefined),
    } as any;

    orchestrator = new OrchestratorAgent(
      mockPlanner,
      mockExecutor,
      mockAnalyzer,
      mockSummarizer,
      mockMemory
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Query Processing', () => {
    it('should process query through all agents', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: 'Test response',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      const response = await orchestrator.handleQuery('test query');

      expect(response.message).toBe('Test response');
      expect(response.metadata.request_id).toBeDefined();
      expect(mockPlanner.plan).toHaveBeenCalled();
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockAnalyzer.analyze).toHaveBeenCalled();
      expect(mockSummarizer.summarize).toHaveBeenCalled();
    });

    it('should include request_id in metadata', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: 'Test',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      const response = await orchestrator.handleQuery('test');

      expect(response.metadata.request_id).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('should track execution duration', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: 'Test',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: 'Test',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      const response = await orchestrator.handleQuery('test');

      expect(response.metadata.total_duration_ms).toBeGreaterThan(0);
    });
  });

  describe('Context Loading', () => {
    it('should load context from memory when enabled', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: '',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: '',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      await orchestrator.handleQuery('test query');

      expect(mockMemory.querySemantic).toHaveBeenCalled();
      expect(mockMemory.queryEpisodic).toHaveBeenCalled();
    });

    it('should not load context when disabled', async () => {
      const orchestratorNoMemory = new OrchestratorAgent(
        mockPlanner,
        mockExecutor,
        mockAnalyzer,
        mockSummarizer,
        mockMemory,
        { enableMemory: false }
      );

      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: '',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: '',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      await orchestratorNoMemory.handleQuery('test');

      expect(mockMemory.querySemantic).not.toHaveBeenCalled();
    });

    it('should pass context to planner', async () => {
      mockMemory.querySemantic.mockResolvedValue([{ text: 'context', score: 0.9, metadata: {} }]);
      mockMemory.queryEpisodic.mockResolvedValue([]);

      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: '',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: '',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      await orchestrator.handleQuery('test');

      expect(mockPlanner.plan).toHaveBeenCalledWith('test', expect.objectContaining({
        semantic: expect.any(Array),
      }));
    });
  });

  describe('Memory Storage', () => {
    it('should store results in memory when enabled', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: '',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: 'test',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      await orchestrator.handleQuery('test query');

      expect(mockMemory.storeEpisodic).toHaveBeenCalled();
      expect(mockMemory.storeSemantic).toHaveBeenCalledWith(
        'test',
        expect.any(Object)
      );
    });

    it('should not fail if memory storage fails', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: '',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: 'test',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });
      mockMemory.storeEpisodic.mockRejectedValue(new Error('Storage failed'));

      const response = await orchestrator.handleQuery('test query');

      // Should still succeed
      expect(response.message).toBe('test');
      expect(response.metadata.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle planning errors gracefully', async () => {
      mockPlanner.plan.mockRejectedValue(new Error('Planning failed'));

      const response = await orchestrator.handleQuery('test query');

      expect(response.message).toContain('error');
      expect(response.metadata.error).toBe(true);
    });

    it('should handle execution errors', async () => {
      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockRejectedValue(new Error('Execution failed'));

      const response = await orchestrator.handleQuery('test');

      expect(response.message).toContain('error');
      expect(response.metadata.error).toBe(true);
    });

    it('should store errors in memory', async () => {
      mockPlanner.plan.mockRejectedValue(new Error('Planning failed'));

      await orchestrator.handleQuery('test');

      expect(mockMemory.storeEpisodic).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });

    it('should continue on memory query failure', async () => {
      mockMemory.querySemantic.mockRejectedValue(new Error('Memory failed'));

      mockPlanner.plan.mockResolvedValue({ steps: [] });
      mockExecutor.execute.mockResolvedValue([]);
      mockAnalyzer.analyze.mockResolvedValue({
        summary: '',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: { tool_results_count: 0, analysis_time_ms: 0 },
      });
      mockSummarizer.summarize.mockResolvedValue({
        message: 'test',
        tools_used: [],
        metadata: { request_id: '', total_duration_ms: 0, timestamp: '' },
      });

      const response = await orchestrator.handleQuery('test');

      expect(response.message).toBe('test');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customOrchestrator = new OrchestratorAgent(
        mockPlanner,
        mockExecutor,
        mockAnalyzer,
        mockSummarizer,
        mockMemory,
        {
          enableMemory: false,
          maxRetries: 5,
          timeout: 120000,
        }
      );

      expect(customOrchestrator).toBeDefined();
    });
  });
});

