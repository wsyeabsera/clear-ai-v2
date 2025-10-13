/**
 * Unit tests for StepResultCache
 */

import { StepResultCache, CachedStepResult } from '../../../agents/executor/step-cache.js';

describe('StepResultCache', () => {
  let cache: StepResultCache;
  
  beforeEach(() => {
    cache = new StepResultCache();
  });
  
  describe('set and get', () => {
    it('should store and retrieve step results', () => {
      const result: Omit<CachedStepResult, 'stepIndex'> = {
        success: true,
        data: { id: 'F1', name: 'Test Facility' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: { location: 'Berlin' }
      };
      
      cache.set(0, result);
      
      const retrieved = cache.get(0);
      expect(retrieved).toBeDefined();
      expect(retrieved?.success).toBe(true);
      expect(retrieved?.data).toEqual({ id: 'F1', name: 'Test Facility' });
      expect(retrieved?.tool).toBe('facilities_list');
      expect(retrieved?.stepIndex).toBe(0);
    });
    
    it('should store failed step results', () => {
      const result: Omit<CachedStepResult, 'stepIndex'> = {
        success: false,
        data: null,
        error: 'Tool execution failed',
        timestamp: new Date(),
        tool: 'shipments_list',
        params: { facility_id: 'INVALID' }
      };
      
      cache.set(1, result);
      
      const retrieved = cache.get(1);
      expect(retrieved).toBeDefined();
      expect(retrieved?.success).toBe(false);
      expect(retrieved?.error).toBe('Tool execution failed');
      expect(retrieved?.stepIndex).toBe(1);
    });
  });
  
  describe('has', () => {
    it('should return true for existing steps', () => {
      cache.set(0, {
        success: true,
        data: { id: 'F1' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      expect(cache.has(0)).toBe(true);
    });
    
    it('should return false for non-existing steps', () => {
      expect(cache.has(0)).toBe(false);
      expect(cache.has(999)).toBe(false);
    });
  });
  
  describe('getAvailableSteps', () => {
    it('should return sorted list of available step indices', () => {
      cache.set(2, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool_2',
        params: {}
      });
      
      cache.set(0, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool_0',
        params: {}
      });
      
      cache.set(1, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool_1',
        params: {}
      });
      
      const availableSteps = cache.getAvailableSteps();
      expect(availableSteps).toEqual([0, 1, 2]);
    });
    
    it('should return empty array when cache is empty', () => {
      expect(cache.getAvailableSteps()).toEqual([]);
    });
  });
  
  describe('clear', () => {
    it('should remove all cached results', () => {
      cache.set(0, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool',
        params: {}
      });
      
      cache.set(1, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool_2',
        params: {}
      });
      
      expect(cache.size()).toBe(2);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.has(0)).toBe(false);
      expect(cache.has(1)).toBe(false);
    });
  });
  
  describe('size', () => {
    it('should return correct cache size', () => {
      expect(cache.size()).toBe(0);
      
      cache.set(0, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool',
        params: {}
      });
      
      expect(cache.size()).toBe(1);
      
      cache.set(1, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool_2',
        params: {}
      });
      
      expect(cache.size()).toBe(2);
    });
  });
  
  describe('getAllResults', () => {
    it('should return all results sorted by step index', () => {
      cache.set(2, {
        success: true,
        data: { id: 'C' },
        timestamp: new Date(),
        tool: 'test_tool_2',
        params: {}
      });
      
      cache.set(0, {
        success: true,
        data: { id: 'A' },
        timestamp: new Date(),
        tool: 'test_tool_0',
        params: {}
      });
      
      cache.set(1, {
        success: false,
        data: null,
        error: 'Error',
        timestamp: new Date(),
        tool: 'test_tool_1',
        params: {}
      });
      
      const results = cache.getAllResults();
      
      expect(results).toHaveLength(3);
      expect(results[0]?.stepIndex).toBe(0);
      expect(results[0]?.data.id).toBe('A');
      expect(results[1]?.stepIndex).toBe(1);
      expect(results[1]?.success).toBe(false);
      expect(results[2]?.stepIndex).toBe(2);
      expect(results[2]?.data.id).toBe('C');
    });
  });
  
  describe('delete', () => {
    it('should remove specific step result', () => {
      cache.set(0, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool',
        params: {}
      });
      
      cache.set(1, {
        success: true,
        data: {},
        timestamp: new Date(),
        tool: 'test_tool_2',
        params: {}
      });
      
      expect(cache.has(0)).toBe(true);
      expect(cache.has(1)).toBe(true);
      
      const deleted = cache.delete(0);
      
      expect(deleted).toBe(true);
      expect(cache.has(0)).toBe(false);
      expect(cache.has(1)).toBe(true);
      expect(cache.size()).toBe(1);
    });
    
    it('should return false when trying to delete non-existing step', () => {
      const deleted = cache.delete(999);
      expect(deleted).toBe(false);
    });
  });
});
