/**
 * Checkpoint Manager
 * Manages workflow state persistence for resumable execution
 */

/**
 * Checkpoint of workflow state
 */
export interface Checkpoint<TState> {
  id: string;
  workflowId: string;
  currentNode: string;
  state: TState;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Checkpoint storage interface
 */
export interface CheckpointStorage {
  save(checkpoint: Checkpoint<any>): Promise<void>;
  load(checkpointId: string): Promise<Checkpoint<any> | null>;
  list(workflowId: string): Promise<Checkpoint<any>[]>;
  delete(checkpointId: string): Promise<void>;
  deleteByWorkflow(workflowId: string): Promise<void>;
}

/**
 * In-memory checkpoint storage (default)
 */
export class InMemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints = new Map<string, Checkpoint<any>>();
  
  async save(checkpoint: Checkpoint<any>): Promise<void> {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }
  
  async load(checkpointId: string): Promise<Checkpoint<any> | null> {
    return this.checkpoints.get(checkpointId) || null;
  }
  
  async list(workflowId: string): Promise<Checkpoint<any>[]> {
    const checkpoints = Array.from(this.checkpoints.values())
      .filter(cp => cp.workflowId === workflowId);
    
    // Sort by timestamp descending (newest first)
    return checkpoints.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  async delete(checkpointId: string): Promise<void> {
    this.checkpoints.delete(checkpointId);
  }
  
  async deleteByWorkflow(workflowId: string): Promise<void> {
    Array.from(this.checkpoints.entries()).forEach(([id, cp]) => {
      if (cp.workflowId === workflowId) {
        this.checkpoints.delete(id);
      }
    });
  }
}

/**
 * Checkpoint Manager
 * Creates, loads, and manages workflow checkpoints
 */
export class CheckpointManager<TState> {
  private storage: CheckpointStorage;
  
  constructor(storage?: CheckpointStorage) {
    this.storage = storage || new InMemoryCheckpointStorage();
  }
  
  /**
   * Create a new checkpoint
   */
  async createCheckpoint(
    workflowId: string,
    currentNode: string,
    state: TState,
    metadata?: Record<string, any>
  ): Promise<Checkpoint<TState>> {
    const checkpoint: Checkpoint<TState> = {
      id: this.generateCheckpointId(),
      workflowId,
      currentNode,
      state,
      timestamp: new Date().toISOString(),
    };
    
    if (metadata) {
      checkpoint.metadata = metadata;
    }
    
    await this.storage.save(checkpoint);
    
    return checkpoint;
  }
  
  /**
   * Load a checkpoint by ID
   */
  async loadCheckpoint(checkpointId: string): Promise<Checkpoint<TState> | null> {
    return this.storage.load(checkpointId) as Promise<Checkpoint<TState> | null>;
  }
  
  /**
   * List all checkpoints for a workflow
   */
  async listCheckpoints(workflowId: string): Promise<Checkpoint<TState>[]> {
    return this.storage.list(workflowId) as Promise<Checkpoint<TState>[]>;
  }
  
  /**
   * Get the latest checkpoint for a workflow
   */
  async getLatestCheckpoint(workflowId: string): Promise<Checkpoint<TState> | null> {
    const checkpoints = await this.listCheckpoints(workflowId);
    return checkpoints.length > 0 ? checkpoints[0]! : null;
  }
  
  /**
   * Delete a specific checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.storage.delete(checkpointId);
  }
  
  /**
   * Clean up all checkpoints for a workflow
   */
  async cleanup(workflowId: string): Promise<void> {
    await this.storage.deleteByWorkflow(workflowId);
  }
  
  /**
   * Generate a unique checkpoint ID
   */
  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

