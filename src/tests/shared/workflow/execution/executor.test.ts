/**
 * Workflow Executor Tests
 * Testing graph execution engine
 */

import { GraphBuilder } from '../../../../shared/workflow/graph/builder.js';
import { WorkflowExecutor, ExecutionResult, ExecutionOptions } from '../../../../shared/workflow/execution/executor.js';

interface TestState {
  value: number;
  visited: string[];
  shouldFail?: boolean;
}

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor<TestState>;
  
  beforeEach(() => {
    executor = new WorkflowExecutor<TestState>();
  });
  
  describe('execute simple graph', () => {
    it('should execute a linear graph', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('start', async (state) => ({
          ...state,
          value: state.value + 1,
          visited: [...state.visited, 'start'],
        }))
        .addNode('end', async (state) => ({
          ...state,
          value: state.value * 2,
          visited: [...state.visited, 'end'],
        }))
        .addEdge('start', 'end')
        .setEntryPoint('start');
      
      const graph = builder.build();
      const initialState: TestState = { value: 0, visited: [] };
      
      const result = await executor.execute(graph, initialState);
      
      expect(result.finalState.value).toBe(2); // (0 + 1) * 2
      expect(result.finalState.visited).toEqual(['start', 'end']);
      expect(result.status).toBe('completed');
    });
    
    it('should track execution steps', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('step1', async (s) => ({ ...s, visited: [...s.visited, 'step1'] }))
        .addNode('step2', async (s) => ({ ...s, visited: [...s.visited, 'step2'] }))
        .addEdge('step1', 'step2')
        .setEntryPoint('step1');
      
      const result = await executor.execute(builder.build(), { value: 0, visited: [] });
      
      expect(result.executedNodes).toEqual(['step1', 'step2']);
    });
  });
  
  describe('execute conditional graph', () => {
    it('should follow conditional paths', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('check', async (s) => s)
        .addNode('positive', async (s) => ({ ...s, visited: [...s.visited, 'positive'] }))
        .addNode('negative', async (s) => ({ ...s, visited: [...s.visited, 'negative'] }))
        .addConditionalEdge(
          'check',
          (state) => state.value > 0 ? 'positive' : 'negative',
          {
            positive: 'positive',
            negative: 'negative',
          }
        )
        .setEntryPoint('check');
      
      // Test positive path
      const result1 = await executor.execute(builder.build(), { value: 5, visited: [] });
      expect(result1.finalState.visited).toContain('positive');
      
      // Test negative path  
      const result2 = await executor.execute(builder.build(), { value: -5, visited: [] });
      expect(result2.finalState.visited).toContain('negative');
    });
  });
  
  describe('error handling', () => {
    it('should handle node errors', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('failing', async (state) => {
          if (state.shouldFail) {
            throw new Error('Node failed');
          }
          return state;
        })
        .setEntryPoint('failing');
      
      const result = await executor.execute(builder.build(), { value: 0, visited: [], shouldFail: true });
      
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Node failed');
    });
    
    it('should record which node failed', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('ok', async (s) => s)
        .addNode('bad', async () => {
          throw new Error('This node fails');
        })
        .addEdge('ok', 'bad')
        .setEntryPoint('ok');
      
      const result = await executor.execute(builder.build(), { value: 0, visited: [] });
      
      expect(result.status).toBe('failed');
      expect(result.error?.node).toBe('bad');
    });
  });
  
  describe('execution options', () => {
    it('should respect max steps limit', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('a', async (s) => ({ ...s, visited: [...s.visited, 'a'] }))
        .addNode('b', async (s) => ({ ...s, visited: [...s.visited, 'b'] }))
        .addNode('c', async (s) => ({ ...s, visited: [...s.visited, 'c'] }))
        .addNode('d', async (s) => ({ ...s, visited: [...s.visited, 'd'] }))
        .addEdge('a', 'b')
        .addEdge('b', 'c')
        .addEdge('c', 'd')
        .setEntryPoint('a');
      
      const options: ExecutionOptions = {
        maxSteps: 2,
      };
      
      const result = await executor.execute(builder.build(), { value: 0, visited: [] }, options);
      
      expect(result.executedNodes.length).toBeLessThanOrEqual(2);
      expect(result.status).toBe('max_steps_reached');
    });
  });
  
  describe('execution metadata', () => {
    it('should track execution time', async () => {
      const builder = new GraphBuilder<TestState>();
      
      builder
        .addNode('test', async (s) => s)
        .setEntryPoint('test');
      
      const result = await executor.execute(builder.build(), { value: 0, visited: [] });
      
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.startTime).toBeDefined();
      expect(result.metadata.endTime).toBeDefined();
      expect(result.metadata.stepCount).toBe(1);
    });
  });
});

