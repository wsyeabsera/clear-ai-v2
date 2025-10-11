/**
 * Progress Tracker
 * Tracks progress for multi-step tasks
 */

/**
 * Task status
 */
export type TaskStatus = 'in_progress' | 'completed' | 'failed';

/**
 * Task progress information
 */
export interface TaskProgress {
  taskId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  percentComplete: number;
  status: TaskStatus;
  startTime: string;
  completedAt?: string;
  error?: string;
  stepTimestamps: string[]; // Timestamp for each step completion
}

/**
 * Progress Tracker
 * Manages progress for multiple concurrent tasks
 */
export class ProgressTracker {
  private tasks: Map<string, TaskProgress> = new Map();
  
  /**
   * Start tracking a new task
   */
  startTask(taskId: string, totalSteps: number): void {
    const now = new Date().toISOString();
    
    const task: TaskProgress = {
      taskId,
      currentStep: 0,
      totalSteps,
      stepName: '',
      percentComplete: 0,
      status: 'in_progress',
      startTime: now,
      stepTimestamps: [],
    };
    
    this.tasks.set(taskId, task);
  }
  
  /**
   * Update current step
   */
  updateStep(taskId: string, stepIndex: number, stepName: string): void {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    const percentComplete = task.totalSteps > 0
      ? Math.round((stepIndex / task.totalSteps) * 100)
      : 0;
    
    task.currentStep = stepIndex;
    task.stepName = stepName;
    task.percentComplete = percentComplete;
    task.stepTimestamps.push(new Date().toISOString());
  }
  
  /**
   * Mark task as completed
   */
  complete(taskId: string): void {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    task.status = 'completed';
    task.currentStep = task.totalSteps;
    task.percentComplete = 100;
    task.completedAt = new Date().toISOString();
  }
  
  /**
   * Mark task as failed
   */
  fail(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date().toISOString();
  }
  
  /**
   * Get progress for a task
   */
  getProgress(taskId: string): TaskProgress | null {
    return this.tasks.get(taskId) || null;
  }
  
  /**
   * Estimate time remaining for a task (in milliseconds)
   */
  estimateTimeRemaining(taskId: string): number {
    const task = this.tasks.get(taskId);
    
    if (!task || task.status !== 'in_progress') {
      return 0;
    }
    
    if (task.currentStep === 0) {
      return 0; // No data to estimate from
    }
    
    // Calculate average time per step
    const now = new Date().getTime();
    const start = new Date(task.startTime).getTime();
    const elapsed = now - start;
    
    const avgTimePerStep = elapsed / task.currentStep;
    const stepsRemaining = task.totalSteps - task.currentStep;
    
    return Math.round(avgTimePerStep * stepsRemaining);
  }
  
  /**
   * Get all tracked tasks
   */
  getAllTasks(): TaskProgress[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * Clear a task from tracking
   */
  clearTask(taskId: string): void {
    this.tasks.delete(taskId);
  }
  
  /**
   * Clear all completed tasks
   */
  clearCompleted(): void {
    Array.from(this.tasks.entries()).forEach(([id, task]) => {
      if (task.status === 'completed') {
        this.tasks.delete(id);
      }
    });
  }
}

