/**
 * Checkpoint Manager Tests
 * Testing workflow state persistence and resumption
 */

import {
  CheckpointManager,
  Checkpoint,
  CheckpointStorage,
} from '../../../../shared/workflow/checkpoint/manager.js';

// Mock storage for testing
class MockCheckpointStorage implements CheckpointStorage {
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

interface TestState {
  step: number;
  data: string[];
}

describe('CheckpointManager', () => {
  let manager: CheckpointManager<TestState>;
  let storage: MockCheckpointStorage;
  
  beforeEach(() => {
    storage = new MockCheckpointStorage();
    manager = new CheckpointManager(storage);
  });
  
  describe('createCheckpoint', () => {
    it('should create a checkpoint', async () => {
      const state: TestState = {
        step: 5,
        data: ['a', 'b', 'c'],
      };
      
      const checkpoint = await manager.createCheckpoint(
        'workflow_1',
        'node_current',
        state
      );
      
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.workflowId).toBe('workflow_1');
      expect(checkpoint.currentNode).toBe('node_current');
      expect(checkpoint.state).toEqual(state);
      expect(checkpoint.timestamp).toBeDefined();
    });
    
    it('should auto-generate checkpoint ID', async () => {
      const checkpoint = await manager.createCheckpoint(
        'workflow_1',
        'node_1',
        { step: 1, data: [] }
      );
      
      expect(checkpoint.id).toMatch(/^cp_/);
    });
    
    it('should save checkpoint to storage', async () => {
      const checkpoint = await manager.createCheckpoint(
        'workflow_1',
        'node_1',
        { step: 1, data: [] }
      );
      
      const loaded = await storage.load(checkpoint.id);
      expect(loaded).toEqual(checkpoint);
    });
  });
  
  describe('loadCheckpoint', () => {
    it('should load an existing checkpoint', async () => {
      const original = await manager.createCheckpoint(
        'workflow_1',
        'node_1',
        { step: 1, data: ['test'] }
      );
      
      const loaded = await manager.loadCheckpoint(original.id);
      
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(original.id);
      expect(loaded?.state).toEqual(original.state);
    });
    
    it('should return null for non-existent checkpoint', async () => {
      const loaded = await manager.loadCheckpoint('nonexistent');
      
      expect(loaded).toBeNull();
    });
  });
  
  describe('listCheckpoints', () => {
    it('should list all checkpoints for a workflow', async () => {
      await manager.createCheckpoint('workflow_1', 'node_1', { step: 1, data: [] });
      await manager.createCheckpoint('workflow_1', 'node_2', { step: 2, data: [] });
      await manager.createCheckpoint('workflow_2', 'node_1', { step: 1, data: [] });
      
      const checkpoints = await manager.listCheckpoints('workflow_1');
      
      expect(checkpoints).toHaveLength(2);
      expect(checkpoints.every(cp => cp.workflowId === 'workflow_1')).toBe(true);
    });
    
    it('should return empty array for workflow with no checkpoints', async () => {
      const checkpoints = await manager.listCheckpoints('nonexistent');
      
      expect(checkpoints).toHaveLength(0);
    });
    
    it('should return checkpoints sorted by timestamp (newest first)', async () => {
      // Create checkpoints sequentially
      for (let i = 1; i <= 3; i++) {
        await manager.createCheckpoint('workflow_1', `node_${i}`, { step: i, data: [] });
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const checkpoints = await manager.listCheckpoints('workflow_1');
      
      expect(checkpoints).toHaveLength(3);
      // Verify descending order: timestamps should be decreasing
      const timestamps = checkpoints.map(cp => new Date(cp.timestamp).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]!).toBeGreaterThanOrEqual(timestamps[i + 1]!);
      }
    });
  });
  
  describe('deleteCheckpoint', () => {
    it('should delete a checkpoint', async () => {
      const checkpoint = await manager.createCheckpoint(
        'workflow_1',
        'node_1',
        { step: 1, data: [] }
      );
      
      await manager.deleteCheckpoint(checkpoint.id);
      
      const loaded = await manager.loadCheckpoint(checkpoint.id);
      expect(loaded).toBeNull();
    });
  });
  
  describe('cleanup', () => {
    it('should delete all checkpoints for a workflow', async () => {
      await manager.createCheckpoint('workflow_1', 'node_1', { step: 1, data: [] });
      await manager.createCheckpoint('workflow_1', 'node_2', { step: 2, data: [] });
      
      await manager.cleanup('workflow_1');
      
      const checkpoints = await manager.listCheckpoints('workflow_1');
      expect(checkpoints).toHaveLength(0);
    });
    
    it('should not affect other workflows', async () => {
      await manager.createCheckpoint('workflow_1', 'node_1', { step: 1, data: [] });
      await manager.createCheckpoint('workflow_2', 'node_1', { step: 1, data: [] });
      
      await manager.cleanup('workflow_1');
      
      const workflow2Checkpoints = await manager.listCheckpoints('workflow_2');
      expect(workflow2Checkpoints).toHaveLength(1);
    });
  });
  
  describe('getLatestCheckpoint', () => {
    it('should get the most recent checkpoint for a workflow', async () => {
      await manager.createCheckpoint('workflow_1', 'node_1', { step: 1, data: [] });
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure different timestamps
      await manager.createCheckpoint('workflow_1', 'node_2', { step: 2, data: ['latest'] });
      
      const retrieved = await manager.getLatestCheckpoint('workflow_1');
      
      // Should get the most recent one (step: 2)
      expect(retrieved).toBeDefined();
      expect(retrieved?.state.step).toBe(2);
      expect(retrieved?.state.data).toEqual(['latest']);
    });
    
    it('should return null if no checkpoints exist', async () => {
      const latest = await manager.getLatestCheckpoint('nonexistent');
      
      expect(latest).toBeNull();
    });
  });
});

