/**
 * Token Budget Tests
 * Testing token budget allocation and enforcement
 */

import {
  TokenBudget,
  BudgetAllocation,
  BudgetStatus,
} from '../../../shared/tokens/budget.js';

describe('TokenBudget', () => {
  let budget: TokenBudget;
  
  beforeEach(() => {
    budget = new TokenBudget({
      total: 10000,
      perRequest: 1000,
      perOperation: 500,
    });
  });
  
  describe('initialization', () => {
    it('should create budget with limits', () => {
      expect(budget).toBeDefined();
      expect(budget.getTotalLimit()).toBe(10000);
    });
    
    it('should start with zero usage', () => {
      expect(budget.getTotalUsed()).toBe(0);
    });
  });
  
  describe('allocate', () => {
    it('should allocate tokens for an operation', () => {
      const allocated = budget.allocate('operation_1', 100);
      
      expect(allocated).toBe(true);
      expect(budget.getTotalUsed()).toBe(100);
    });
    
    it('should reject allocation exceeding budget', () => {
      const allocated = budget.allocate('big_operation', 20000);
      
      expect(allocated).toBe(false);
      expect(budget.getTotalUsed()).toBe(0); // Nothing should be allocated
    });
    
    it('should track multiple allocations', () => {
      budget.allocate('op1', 100);
      budget.allocate('op2', 200);
      budget.allocate('op3', 150);
      
      expect(budget.getTotalUsed()).toBe(450);
    });
    
    it('should enforce per-operation limit', () => {
      const allocated = budget.allocate('op1', 600); // Exceeds 500 per-operation limit
      
      expect(allocated).toBe(false);
    });
  });
  
  describe('release', () => {
    beforeEach(() => {
      budget.allocate('op1', 100);
      budget.allocate('op2', 200);
    });
    
    it('should release allocated tokens', () => {
      expect(budget.getTotalUsed()).toBe(300);
      
      budget.release('op1');
      
      expect(budget.getTotalUsed()).toBe(200);
    });
    
    it('should handle releasing non-existent operation', () => {
      const before = budget.getTotalUsed();
      
      budget.release('nonexistent');
      
      expect(budget.getTotalUsed()).toBe(before); // No change
    });
  });
  
  describe('getRemaining', () => {
    it('should calculate remaining tokens', () => {
      budget.allocate('op1', 300); // Within per-operation limit of 500
      
      const remaining = budget.getRemaining();
      
      expect(remaining).toBe(9700);
    });
    
    it('should return full budget when nothing allocated', () => {
      expect(budget.getRemaining()).toBe(10000);
    });
  });
  
  describe('canAllocate', () => {
    it('should check if allocation is possible', () => {
      expect(budget.canAllocate(500)).toBe(true);
      expect(budget.canAllocate(20000)).toBe(false);
    });
    
    it('should account for current usage', () => {
      budget.allocate('op1', 9500);
      
      expect(budget.canAllocate(600)).toBe(false); // Would exceed total
      expect(budget.canAllocate(400)).toBe(true); // Within remaining 500
    });
  });
  
  describe('getStatus', () => {
    it('should provide budget status', () => {
      budget.allocate('op1', 500); // Within per-operation limit
      
      const status = budget.getStatus();
      
      expect(status.totalLimit).toBe(10000);
      expect(status.totalUsed).toBe(500);
      expect(status.remaining).toBe(9500);
      expect(status.utilizationPercent).toBe(5);
      expect(status.activeOperations).toBe(1);
    });
    
    it('should calculate utilization percentage', () => {
      budget.allocate('op1', 250); // Within per-operation limit
      
      const status = budget.getStatus();
      
      // 250 / 10000 = 2.5%, rounds to 3%
      expect(status.utilizationPercent).toBeGreaterThanOrEqual(2);
      expect(status.utilizationPercent).toBeLessThanOrEqual(3);
    });
  });
  
  describe('reset', () => {
    it('should reset all allocations', () => {
      budget.allocate('op1', 300); // Within limits
      budget.allocate('op2', 400); // Within limits
      
      expect(budget.getTotalUsed()).toBe(700);
      
      budget.reset();
      
      expect(budget.getTotalUsed()).toBe(0);
      expect(budget.getStatus().activeOperations).toBe(0);
    });
  });
  
  describe('getAllocations', () => {
    it('should return all active allocations', () => {
      budget.allocate('op1', 100);
      budget.allocate('op2', 200);
      
      const allocations = budget.getAllocations();
      
      expect(allocations).toHaveLength(2);
      expect(allocations.find(a => a.operationId === 'op1')?.tokens).toBe(100);
      expect(allocations.find(a => a.operationId === 'op2')?.tokens).toBe(200);
    });
  });
});

