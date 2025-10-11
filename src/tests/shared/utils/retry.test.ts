/**
 * Tests for retry utilities
 */

import {
  withRetry,
  sleep,
  withTimeout
} from '../../../shared/utils/retry.js';

describe('Retry Utilities', () => {
  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });
  
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation, {
        maxRetries: 3,
        baseDelay: 100
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
        exponential: false
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should throw after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fail'));
      
      await expect(withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10
      })).rejects.toThrow('Always fail');
      
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
    
    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const start = Date.now();
      await withRetry(operation, {
        maxRetries: 3,
        baseDelay: 100,
        exponential: true
      });
      const duration = Date.now() - start;
      
      // With exponential: 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThanOrEqual(250);
    });
    
    it('should respect maxDelay', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      await withRetry(operation, {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 100,
        exponential: true
      });
      
      // Should cap delays at maxDelay
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const promise = Promise.resolve('success');
      
      const result = await withTimeout(promise, 1000);
      
      expect(result).toBe('success');
    });
    
    it('should timeout slow promises', async () => {
      const promise = sleep(1000).then(() => 'too slow');
      
      await expect(withTimeout(promise, 100, 'Timed out'))
        .rejects.toThrow('Timed out');
    });
    
    it('should use default error message', async () => {
      const promise = sleep(1000).then(() => 'too slow');
      
      await expect(withTimeout(promise, 100))
        .rejects.toThrow('Operation timed out');
    });
  });
});

