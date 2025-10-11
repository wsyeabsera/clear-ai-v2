/**
 * Graph Builder
 * LangGraph-style workflow graph construction
 */

/**
 * Node handler function
 */
export type NodeHandler<TState> = (state: TState) => Promise<TState>;

/**
 * Condition function for conditional edges
 */
export type ConditionFunction<TState> = (state: TState) => string;

/**
 * Workflow node definition
 */
export interface WorkflowNode<TState> {
  name: string;
  handler: NodeHandler<TState>;
}

/**
 * Workflow edge definition
 */
export interface WorkflowEdge<TState> {
  source: string;
  target: string;
  condition?: ConditionFunction<TState>;
  conditionMap?: Record<string, string>;
}

/**
 * Compiled workflow graph
 */
export interface WorkflowGraph<TState> {
  nodes: Map<string, WorkflowNode<TState>>;
  edges: Map<string, WorkflowEdge<TState>[]>;
  entryPoint: string;
}

/**
 * Graph Builder
 * Fluent API for constructing workflow graphs
 */
export class GraphBuilder<TState> {
  private nodes: Map<string, WorkflowNode<TState>> = new Map();
  private edges: Map<string, WorkflowEdge<TState>[]> = new Map();
  private entryPoint: string | null = null;
  
  /**
   * Add a node to the graph
   */
  addNode(name: string, handler: NodeHandler<TState>): this {
    if (this.nodes.has(name)) {
      throw new Error(`Node '${name}' already exists in the graph`);
    }
    
    this.nodes.set(name, { name, handler });
    this.edges.set(name, []); // Initialize empty edge list
    
    return this;
  }
  
  /**
   * Add a simple edge between two nodes
   */
  addEdge(source: string, target: string): this {
    if (!this.nodes.has(source)) {
      throw new Error(`Source node '${source}' does not exist`);
    }
    
    if (!this.nodes.has(target)) {
      throw new Error(`Target node '${target}' does not exist`);
    }
    
    const edge: WorkflowEdge<TState> = {
      source,
      target,
    };
    
    const edgeList = this.edges.get(source) || [];
    edgeList.push(edge);
    this.edges.set(source, edgeList);
    
    return this;
  }
  
  /**
   * Add a conditional edge
   */
  addConditionalEdge(
    source: string,
    condition: ConditionFunction<TState>,
    conditionMap: Record<string, string>
  ): this {
    if (!this.nodes.has(source)) {
      throw new Error(`Source node '${source}' does not exist`);
    }
    
    // Validate all target nodes exist
    for (const target of Object.values(conditionMap)) {
      if (!this.nodes.has(target)) {
        throw new Error(`Target node '${target}' does not exist in condition map`);
      }
    }
    
    const edge: WorkflowEdge<TState> = {
      source,
      target: '', // Will be determined by condition
      condition,
      conditionMap,
    };
    
    const edgeList = this.edges.get(source) || [];
    edgeList.push(edge);
    this.edges.set(source, edgeList);
    
    return this;
  }
  
  /**
   * Set the entry point of the graph
   */
  setEntryPoint(nodeName: string): this {
    if (!this.nodes.has(nodeName)) {
      throw new Error(`Entry point node '${nodeName}' does not exist`);
    }
    
    this.entryPoint = nodeName;
    
    return this;
  }
  
  /**
   * Build and validate the graph
   */
  build(): WorkflowGraph<TState> {
    // Validate entry point is set
    if (!this.entryPoint) {
      throw new Error('Graph entry point must be set before building');
    }
    
    // Detect cycles
    if (this.hasCycle()) {
      throw new Error('Graph contains a cycle, which is not allowed');
    }
    
    return {
      nodes: new Map(this.nodes),
      edges: new Map(this.edges),
      entryPoint: this.entryPoint,
    };
  }
  
  /**
   * Detect if the graph has cycles using DFS
   */
  private hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      
      const edges = this.edges.get(node) || [];
      
      for (const edge of edges) {
        // Get all possible targets
        const targets: string[] = [];
        
        if (edge.target) {
          targets.push(edge.target);
        }
        
        if (edge.conditionMap) {
          targets.push(...Object.values(edge.conditionMap));
        }
        
        for (const target of targets) {
          if (!visited.has(target)) {
            if (dfs(target)) {
              return true;
            }
          } else if (recursionStack.has(target)) {
            return true; // Cycle detected
          }
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    // Check from entry point
    if (this.entryPoint && dfs(this.entryPoint)) {
      return true;
    }
    
    // Check any unvisited nodes
    for (const nodeName of this.nodes.keys()) {
      if (!visited.has(nodeName) && dfs(nodeName)) {
        return true;
      }
    }
    
    return false;
  }
}

