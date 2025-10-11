/**
 * Token Budget
 * Manages token allocation and enforcement
 */

/**
 * Budget configuration
 */
export interface BudgetConfig {
  total: number; // Total token budget
  perRequest?: number; // Max tokens per request
  perOperation?: number; // Max tokens per operation
}

/**
 * Budget allocation record
 */
export interface BudgetAllocation {
  operationId: string;
  tokens: number;
  timestamp: string;
}

/**
 * Budget status
 */
export interface BudgetStatus {
  totalLimit: number;
  totalUsed: number;
  remaining: number;
  utilizationPercent: number;
  activeOperations: number;
}

/**
 * Token Budget Manager
 * Tracks and enforces token usage limits
 */
export class TokenBudget {
  private config: Required<BudgetConfig>;
  private allocations: Map<string, BudgetAllocation> = new Map();
  private totalUsed: number = 0;
  
  constructor(config: BudgetConfig) {
    this.config = {
      total: config.total,
      perRequest: config.perRequest || config.total,
      perOperation: config.perOperation || config.total,
    };
  }
  
  /**
   * Allocate tokens for an operation
   * Returns true if allocation succeeded, false if budget exceeded
   */
  allocate(operationId: string, tokens: number): boolean {
    // Check per-operation limit
    if (tokens > this.config.perOperation) {
      return false;
    }
    
    // Check total budget
    if (this.totalUsed + tokens > this.config.total) {
      return false;
    }
    
    // Allocate
    const allocation: BudgetAllocation = {
      operationId,
      tokens,
      timestamp: new Date().toISOString(),
    };
    
    this.allocations.set(operationId, allocation);
    this.totalUsed += tokens;
    
    return true;
  }
  
  /**
   * Release tokens from an operation
   */
  release(operationId: string): void {
    const allocation = this.allocations.get(operationId);
    
    if (allocation) {
      this.totalUsed -= allocation.tokens;
      this.allocations.delete(operationId);
    }
  }
  
  /**
   * Get remaining tokens in budget
   */
  getRemaining(): number {
    return Math.max(0, this.config.total - this.totalUsed);
  }
  
  /**
   * Get total tokens used
   */
  getTotalUsed(): number {
    return this.totalUsed;
  }
  
  /**
   * Get total budget limit
   */
  getTotalLimit(): number {
    return this.config.total;
  }
  
  /**
   * Check if tokens can be allocated
   */
  canAllocate(tokens: number): boolean {
    return tokens <= this.config.perOperation && 
           this.totalUsed + tokens <= this.config.total;
  }
  
  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    const utilizationPercent = this.config.total > 0
      ? Math.round((this.totalUsed / this.config.total) * 100)
      : 0;
    
    return {
      totalLimit: this.config.total,
      totalUsed: this.totalUsed,
      remaining: this.getRemaining(),
      utilizationPercent,
      activeOperations: this.allocations.size,
    };
  }
  
  /**
   * Reset all allocations
   */
  reset(): void {
    this.allocations.clear();
    this.totalUsed = 0;
  }
  
  /**
   * Get all active allocations
   */
  getAllocations(): BudgetAllocation[] {
    return Array.from(this.allocations.values());
  }
  
  /**
   * Get allocation for specific operation
   */
  getAllocation(operationId: string): BudgetAllocation | null {
    return this.allocations.get(operationId) || null;
  }
}

