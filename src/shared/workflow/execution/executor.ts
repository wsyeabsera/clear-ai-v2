/**
 * Workflow Executor
 * Executes workflow graphs with state management
 */

import { WorkflowGraph } from '../graph/builder.js';

/**
 * Execution status
 */
export type ExecutionStatus = 'completed' | 'failed' | 'max_steps_reached';

/**
 * Execution error details
 */
export interface ExecutionError {
  message: string;
  node: string;
  state: any;
}

/**
 * Execution metadata
 */
export interface ExecutionMetadata {
  executionTime: number;
  startTime: string;
  endTime: string;
  stepCount: number;
}

/**
 * Execution result
 */
export interface ExecutionResult<TState> {
  finalState: TState;
  status: ExecutionStatus;
  executedNodes: string[];
  error?: ExecutionError;
  metadata: ExecutionMetadata;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  maxSteps?: number;
  timeout?: number;
}

/**
 * Workflow Executor
 * Executes state graphs step by step
 */
export class WorkflowExecutor<TState> {
  /**
   * Execute a workflow graph
   */
  async execute(
    graph: WorkflowGraph<TState>,
    initialState: TState,
    options?: ExecutionOptions
  ): Promise<ExecutionResult<TState>> {
    const startTime = new Date();
    const executedNodes: string[] = [];
    let currentState = initialState;
    let currentNode: string | null = graph.entryPoint;
    const maxSteps = options?.maxSteps || 100;
    
    try {
      while (currentNode && executedNodes.length < maxSteps) {
        // Get node
        const node = graph.nodes.get(currentNode);
        if (!node) {
          throw new Error(`Node '${currentNode}' not found in graph`);
        }
        
        // Execute node
        executedNodes.push(currentNode);
        currentState = await node.handler(currentState);
        
        // Find next node
        const edges = graph.edges.get(currentNode);
        
        if (!edges || edges.length === 0) {
          // No more edges, we're done
          currentNode = null;
          break;
        }
        
        // Get next node from edges
        const edge = edges[0];
        
        if (edge && edge.condition && edge.conditionMap) {
          // Conditional edge
          const conditionResult = edge.condition(currentState);
          const nextNode: string | undefined = edge.conditionMap[conditionResult];
          currentNode = nextNode || null;
        } else if (edge) {
          // Simple edge
          currentNode = edge.target || null;
        } else {
          currentNode = null;
        }
      }
      
      const endTime = new Date();
      const status: ExecutionStatus = executedNodes.length >= maxSteps 
        ? 'max_steps_reached'
        : 'completed';
      
      return {
        finalState: currentState,
        status,
        executedNodes,
        metadata: {
          executionTime: endTime.getTime() - startTime.getTime(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          stepCount: executedNodes.length,
        },
      };
    } catch (error: any) {
      const endTime = new Date();
      
      return {
        finalState: currentState,
        status: 'failed',
        executedNodes,
        error: {
          message: error.message,
          node: executedNodes[executedNodes.length - 1] || 'unknown',
          state: currentState,
        },
        metadata: {
          executionTime: endTime.getTime() - startTime.getTime(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          stepCount: executedNodes.length,
        },
      };
    }
  }
}

