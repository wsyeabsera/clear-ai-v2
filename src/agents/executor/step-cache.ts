/**
 * Step Result Cache
 * Stores execution results from completed steps for reference resolution
 */

export interface CachedStepResult {
  success: boolean;
  data: any;
  error?: string | undefined;
  timestamp: Date;
  tool: string;
  params: any;
  stepIndex: number;
}

export class StepResultCache {
  private cache: Map<number, CachedStepResult> = new Map();
  
  /**
   * Store a step execution result
   */
  set(stepIndex: number, result: Omit<CachedStepResult, 'stepIndex'>): void {
    this.cache.set(stepIndex, {
      ...result,
      stepIndex
    });
  }
  
  /**
   * Retrieve a step execution result
   */
  get(stepIndex: number): CachedStepResult | undefined {
    return this.cache.get(stepIndex);
  }
  
  /**
   * Check if a step result exists
   */
  has(stepIndex: number): boolean {
    return this.cache.has(stepIndex);
  }
  
  /**
   * Get all cached step indices
   */
  getAvailableSteps(): number[] {
    return Array.from(this.cache.keys()).sort((a, b) => a - b);
  }
  
  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Get all cached results
   */
  getAllResults(): CachedStepResult[] {
    return Array.from(this.cache.values()).sort((a, b) => a.stepIndex - b.stepIndex);
  }
  
  /**
   * Remove a specific step result
   */
  delete(stepIndex: number): boolean {
    return this.cache.delete(stepIndex);
  }
}
