/**
 * Workflow Execution Integration Tests
 * Tests end-to-end workflow execution with checkpointing
 */

import { GraphBuilder } from '../../../shared/workflow/graph/builder.js';
import { WorkflowExecutor } from '../../../shared/workflow/execution/executor.js';
import { CheckpointManager } from '../../../shared/workflow/checkpoint/manager.js';

interface WorkflowState {
  stage: string;
  results: any[];
  error?: string;
}

describe('Workflow Execution Integration', () => {
  let executor: WorkflowExecutor<WorkflowState>;
  let checkpointer: CheckpointManager<WorkflowState>;
  
  beforeAll(() => {
    executor = new WorkflowExecutor<WorkflowState>();
    checkpointer = new CheckpointManager<WorkflowState>();
  });
  
  describe('End-to-End Workflow', () => {
    it('should execute a multi-step workflow', async () => {
      const builder = new GraphBuilder<WorkflowState>();
      
      builder
        .addNode('start', async (state) => ({
          ...state,
          stage: 'started',
          results: [...state.results, 'start_completed'],
        }))
        .addNode('process', async (state) => ({
          ...state,
          stage: 'processing',
          results: [...state.results, 'process_completed'],
        }))
        .addNode('finalize', async (state) => ({
          ...state,
          stage: 'finalized',
          results: [...state.results, 'finalize_completed'],
        }))
        .addEdge('start', 'process')
        .addEdge('process', 'finalize')
        .setEntryPoint('start');
      
      const graph = builder.build();
      const initialState: WorkflowState = {
        stage: 'initial',
        results: [],
      };
      
      const result = await executor.execute(graph, initialState);
      
      expect(result.status).toBe('completed');
      expect(result.finalState.stage).toBe('finalized');
      expect(result.finalState.results).toHaveLength(3);
      expect(result.executedNodes).toEqual(['start', 'process', 'finalize']);
    });
    
    it('should handle conditional branching', async () => {
      const builder = new GraphBuilder<WorkflowState>();
      
      builder
        .addNode('check', async (state) => state)
        .addNode('success_path', async (state) => ({
          ...state,
          results: [...state.results, 'success'],
        }))
        .addNode('error_path', async (state) => ({
          ...state,
          results: [...state.results, 'error'],
        }))
        .addConditionalEdge(
          'check',
          (state) => state.error ? 'error' : 'success',
          {
            success: 'success_path',
            error: 'error_path',
          }
        )
        .setEntryPoint('check');
      
      // Test success path
      const result1 = await executor.execute(builder.build(), { stage: 'initial', results: [] });
      expect(result1.executedNodes).toContain('success_path');
      
      // Test error path
      const result2 = await executor.execute(builder.build(), { stage: 'initial', results: [], error: 'test error' });
      expect(result2.executedNodes).toContain('error_path');
    });
  });
  
  describe('Workflow with Checkpointing', () => {
    it('should create checkpoints during execution', async () => {
      const builder = new GraphBuilder<WorkflowState>();
      
      builder
        .addNode('step1', async (state) => {
          const newState = { ...state, stage: 'step1', results: [...state.results, 's1'] };
          await checkpointer.createCheckpoint('wf_1', 'step1', newState);
          return newState;
        })
        .addNode('step2', async (state) => {
          const newState = { ...state, stage: 'step2', results: [...state.results, 's2'] };
          await checkpointer.createCheckpoint('wf_1', 'step2', newState);
          return newState;
        })
        .addEdge('step1', 'step2')
        .setEntryPoint('step1');
      
      await executor.execute(builder.build(), { stage: 'initial', results: [] });
      
      const checkpoints = await checkpointer.listCheckpoints('wf_1');
      expect(checkpoints.length).toBeGreaterThanOrEqual(2);
      
      // Cleanup
      await checkpointer.cleanup('wf_1');
    });
    
    it('should resume from checkpoint', async () => {
      const builder = new GraphBuilder<WorkflowState>();
      
      builder
        .addNode('step1', async (s) => ({ ...s, results: [...s.results, 's1'] }))
        .addNode('step2', async (s) => ({ ...s, results: [...s.results, 's2'] }))
        .addNode('step3', async (s) => ({ ...s, results: [...s.results, 's3'] }))
        .addEdge('step1', 'step2')
        .addEdge('step2', 'step3')
        .setEntryPoint('step1');
      
      // Execute partial workflow and checkpoint
      const graph = builder.build();
      const step1Result = await executor.execute(graph, { stage: 'initial', results: [] }, { maxSteps: 1 });
      
      const checkpoint = await checkpointer.createCheckpoint('wf_2', 'step1', step1Result.finalState);
      
      // Resume from checkpoint
      const resumed = await checkpointer.loadCheckpoint(checkpoint.id);
      expect(resumed).toBeDefined();
      expect(resumed?.state.results).toContain('s1');
      
      // Cleanup
      await checkpointer.cleanup('wf_2');
    });
  });
});

