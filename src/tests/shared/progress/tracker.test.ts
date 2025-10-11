/**
 * Progress Tracker Tests
 * Testing multi-step task progress tracking
 */

import {
  ProgressTracker,
  TaskProgress,
} from '../../../shared/progress/tracker.js';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  
  beforeEach(() => {
    tracker = new ProgressTracker();
  });
  
  describe('startTask', () => {
    it('should start tracking a new task', () => {
      tracker.startTask('task_1', 5);
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress).toBeDefined();
      expect(progress.taskId).toBe('task_1');
      expect(progress.totalSteps).toBe(5);
      expect(progress.currentStep).toBe(0);
      expect(progress.status).toBe('in_progress');
    });
    
    it('should initialize with timestamp', () => {
      tracker.startTask('task_1', 3);
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress.startTime).toBeDefined();
      expect(new Date(progress.startTime).getTime()).toBeGreaterThan(0);
    });
  });
  
  describe('updateStep', () => {
    beforeEach(() => {
      tracker.startTask('task_1', 5);
    });
    
    it('should update current step', () => {
      tracker.updateStep('task_1', 1, 'Fetching data');
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress.currentStep).toBe(1);
      expect(progress.stepName).toBe('Fetching data');
    });
    
    it('should track multiple step updates', () => {
      tracker.updateStep('task_1', 1, 'Step 1');
      tracker.updateStep('task_1', 2, 'Step 2');
      tracker.updateStep('task_1', 3, 'Step 3');
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress.currentStep).toBe(3);
      expect(progress.stepName).toBe('Step 3');
    });
    
    it('should throw error for invalid task', () => {
      expect(() => {
        tracker.updateStep('nonexistent', 1, 'Test');
      }).toThrow('not found');
    });
  });
  
  describe('complete', () => {
    beforeEach(() => {
      tracker.startTask('task_1', 3);
    });
    
    it('should mark task as completed', () => {
      tracker.complete('task_1');
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress.status).toBe('completed');
      expect(progress.currentStep).toBe(progress.totalSteps);
    });
    
    it('should record completion time', () => {
      tracker.complete('task_1');
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress.completedAt).toBeDefined();
    });
  });
  
  describe('fail', () => {
    beforeEach(() => {
      tracker.startTask('task_1', 5);
    });
    
    it('should mark task as failed', () => {
      tracker.fail('task_1', 'Error occurred');
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress.status).toBe('failed');
      expect(progress.error).toBe('Error occurred');
    });
  });
  
  describe('getProgress', () => {
    it('should return null for non-existent task', () => {
      const progress = tracker.getProgress('nonexistent');
      
      expect(progress).toBeNull();
    });
    
    it('should return current progress', () => {
      tracker.startTask('task_1', 10);
      tracker.updateStep('task_1', 3, 'Processing');
      
      const progress = tracker.getProgress('task_1');
      
      expect(progress).toBeDefined();
      expect(progress.currentStep).toBe(3);
      expect(progress.totalSteps).toBe(10);
      expect(progress.percentComplete).toBe(30);
    });
  });
  
  describe('estimateTimeRemaining', () => {
    it('should estimate time based on progress', async () => {
      tracker.startTask('task_1', 4);
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      tracker.updateStep('task_1', 1, 'Step 1');
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait another 100ms
      tracker.updateStep('task_1', 2, 'Step 2');
      
      const estimate = tracker.estimateTimeRemaining('task_1');
      
      // Should estimate based on average step time
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBeLessThan(1000); // Should be reasonable
    });
    
    it('should return 0 when task not started', () => {
      const estimate = tracker.estimateTimeRemaining('nonexistent');
      
      expect(estimate).toBe(0);
    });
    
    it('should return 0 when task completed', () => {
      tracker.startTask('task_1', 2);
      tracker.complete('task_1');
      
      const estimate = tracker.estimateTimeRemaining('task_1');
      
      expect(estimate).toBe(0);
    });
  });
  
  describe('getAllTasks', () => {
    it('should return all tracked tasks', () => {
      tracker.startTask('task_1', 3);
      tracker.startTask('task_2', 5);
      
      const tasks = tracker.getAllTasks();
      
      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.taskId)).toContain('task_1');
      expect(tasks.map(t => t.taskId)).toContain('task_2');
    });
    
    it('should return empty array when no tasks', () => {
      expect(tracker.getAllTasks()).toHaveLength(0);
    });
  });
  
  describe('clearTask', () => {
    it('should remove completed task from tracking', () => {
      tracker.startTask('task_1', 2);
      tracker.complete('task_1');
      
      tracker.clearTask('task_1');
      
      expect(tracker.getProgress('task_1')).toBeNull();
    });
  });
});

