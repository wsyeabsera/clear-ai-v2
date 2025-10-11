/**
 * Graph Builder Tests
 * Testing LangGraph-style workflow graph construction
 */

import {
  GraphBuilder,
  WorkflowGraph,
  NodeHandler,
} from '../../../../shared/workflow/graph/builder.js';

// Test state type
interface TestState {
  counter: number;
  messages: string[];
  error?: string;
}

describe('GraphBuilder', () => {
  let builder: GraphBuilder<TestState>;
  
  beforeEach(() => {
    builder = new GraphBuilder<TestState>();
  });
  
  describe('addNode', () => {
    it('should add a node to the graph', () => {
      const handler: NodeHandler<TestState> = async (state) => ({
        ...state,
        counter: state.counter + 1,
      });
      
      builder.addNode('increment', handler);
      builder.setEntryPoint('increment');
      
      const graph = builder.build();
      expect(graph.nodes.has('increment')).toBe(true);
    });
    
    it('should add multiple nodes', () => {
      builder.addNode('node1', async (s) => s);
      builder.addNode('node2', async (s) => s);
      builder.addNode('node3', async (s) => s);
      builder.setEntryPoint('node1');
      
      const graph = builder.build();
      expect(graph.nodes.size).toBe(3);
    });
    
    it('should throw error for duplicate node names', () => {
      builder.addNode('test', async (s) => s);
      
      expect(() => {
        builder.addNode('test', async (s) => s);
      }).toThrow('already exists');
    });
  });
  
  describe('addEdge', () => {
    beforeEach(() => {
      builder.addNode('start', async (s) => s);
      builder.addNode('end', async (s) => s);
    });
    
    it('should add an edge between nodes', () => {
      builder.addEdge('start', 'end');
      builder.setEntryPoint('start');
      
      const graph = builder.build();
      const edges = graph.edges.get('start');
      
      expect(edges).toBeDefined();
      expect(edges).toHaveLength(1);
      expect(edges![0]?.target).toBe('end');
    });
    
    it('should add multiple edges from same node', () => {
      builder.addNode('middle', async (s) => s);
      
      builder.addEdge('start', 'middle');
      builder.addEdge('start', 'end');
      builder.setEntryPoint('start');
      
      const graph = builder.build();
      const edges = graph.edges.get('start');
      
      expect(edges).toHaveLength(2);
    });
    
    it('should throw error if source node does not exist', () => {
      expect(() => {
        builder.addEdge('nonexistent', 'end');
      }).toThrow('does not exist');
    });
    
    it('should throw error if target node does not exist', () => {
      expect(() => {
        builder.addEdge('start', 'nonexistent');
      }).toThrow('does not exist');
    });
  });
  
  describe('addConditionalEdge', () => {
    beforeEach(() => {
      builder.addNode('check', async (s) => s);
      builder.addNode('success', async (s) => s);
      builder.addNode('failure', async (s) => s);
    });
    
    it('should add a conditional edge', () => {
      builder.addConditionalEdge(
        'check',
        (state) => state.counter > 0 ? 'success' : 'failure',
        {
          success: 'success',
          failure: 'failure',
        }
      );
      builder.setEntryPoint('check');
      
      const graph = builder.build();
      const edges = graph.edges.get('check');
      
      expect(edges).toBeDefined();
      expect(edges![0]?.condition).toBeDefined();
    });
    
    it('should throw error if condition targets do not exist', () => {
      expect(() => {
        builder.addConditionalEdge(
          'check',
          (state) => 'nonexistent',
          { result: 'nonexistent' }
        );
      }).toThrow();
    });
  });
  
  describe('setEntryPoint', () => {
    it('should set the entry point', () => {
      builder.addNode('start', async (s) => s);
      builder.setEntryPoint('start');
      
      const graph = builder.build();
      expect(graph.entryPoint).toBe('start');
    });
    
    it('should throw error if entry point node does not exist', () => {
      expect(() => {
        builder.setEntryPoint('nonexistent');
      }).toThrow('does not exist');
    });
  });
  
  describe('build', () => {
    it('should build a valid graph', () => {
      builder.addNode('start', async (s) => s);
      builder.addNode('end', async (s) => s);
      builder.addEdge('start', 'end');
      builder.setEntryPoint('start');
      
      const graph = builder.build();
      
      expect(graph).toBeDefined();
      expect(graph.nodes.size).toBe(2);
      expect(graph.entryPoint).toBe('start');
    });
    
    it('should detect cycles in the graph', () => {
      builder.addNode('a', async (s) => s);
      builder.addNode('b', async (s) => s);
      builder.addNode('c', async (s) => s);
      
      builder.addEdge('a', 'b');
      builder.addEdge('b', 'c');
      builder.addEdge('c', 'a'); // Creates a cycle
      
      builder.setEntryPoint('a');
      
      expect(() => builder.build()).toThrow('cycle');
    });
    
    it('should require entry point to be set', () => {
      builder.addNode('test', async (s) => s);
      
      expect(() => builder.build()).toThrow('entry point');
    });
  });
});

