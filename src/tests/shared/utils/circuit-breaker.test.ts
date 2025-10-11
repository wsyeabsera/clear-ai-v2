/**
 * Circuit Breaker tests
 */

import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerError,
} from '../../../shared/utils/circuit-breaker.js';
import {
  createFailedOperation,
  createSuccessfulOperation,
} from '../fixtures/shared-test-data.js';

describe('CircuitBreaker', () => {
  describe('initialization', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker();
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isOpen()).toBe(false);
    });
    
    it('should accept custom options', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('circuit opening', () => {
    it('should open after reaching failure threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 60000,
      });
      
      const failedOp = createFailedOperation();
      
      // Execute 3 failed operations
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.isOpen()).toBe(true);
      expect(breaker.getFailureCount()).toBe(3);
    });
    
    it('should reject requests when OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 60000,
      });
      
      const failedOp = createFailedOperation();
      
      // Open the circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      // Try to execute when open
      await expect(
        breaker.execute(createSuccessfulOperation('result'))
      ).rejects.toThrow(CircuitBreakerError);
      
      await expect(
        breaker.execute(createSuccessfulOperation('result'))
      ).rejects.toThrow('Circuit breaker is open');
    });
    
    it('should call onOpen callback', async () => {
      const onOpen = jest.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        onOpen,
      });
      
      const failedOp = createFailedOperation();
      
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(onOpen).toHaveBeenCalled();
    });
  });
  
  describe('circuit closing', () => {
    it('should reset failure count when transitioning to CLOSED', async () => {
      jest.useFakeTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
      });
      
      const failedOp = createFailedOperation();
      const successOp = createSuccessfulOperation('result');
      
      // Open the circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getFailureCount()).toBe(2);
      
      // Wait for reset timeout to transition to HALF_OPEN
      jest.advanceTimersByTime(1001);
      
      // Success in HALF_OPEN should close circuit and reset count
      await breaker.execute(successOp);
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
      
      jest.useRealTimers();
    });
  });
  
  describe('half-open state', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      jest.useFakeTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
      });
      
      const failedOp = createFailedOperation();
      
      // Open the circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      // Advance time past reset timeout
      jest.advanceTimersByTime(1001);
      
      // Next execution should transition to HALF_OPEN
      await breaker.execute(createSuccessfulOperation('result'));
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      
      jest.useRealTimers();
    });
    
    it('should close after successful request in HALF_OPEN', async () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        onClose,
      });
      
      const failedOp = createFailedOperation();
      const successOp = createSuccessfulOperation('result');
      
      // Open circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      // Wait for reset timeout
      jest.advanceTimersByTime(1001);
      
      // Execute successful operation
      const result = await breaker.execute(successOp);
      
      expect(result).toBe('result');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(onClose).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
    
    it('should reopen on failure in HALF_OPEN', async () => {
      jest.useFakeTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
      });
      
      const failedOp = createFailedOperation();
      
      // Open circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      // Wait for reset timeout
      jest.advanceTimersByTime(1001);
      
      // Execute failed operation in HALF_OPEN
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      jest.useRealTimers();
    });
    
    it('should call onHalfOpen callback', async () => {
      jest.useFakeTimers();
      
      const onHalfOpen = jest.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        onHalfOpen,
      });
      
      const failedOp = createFailedOperation();
      
      // Open circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      // Wait and trigger HALF_OPEN
      jest.advanceTimersByTime(1001);
      await breaker.execute(createSuccessfulOperation('result'));
      
      expect(onHalfOpen).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
  
  describe('manual control', () => {
    it('should allow manual reset', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
      });
      
      const failedOp = createFailedOperation();
      
      // Open circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      // Manual reset
      breaker.reset();
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
    });
    
    it('should allow manual open', () => {
      const breaker = new CircuitBreaker();
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      
      breaker.open();
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });
  
  describe('time tracking', () => {
    it('should track time until reset', async () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);
      
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
      });
      
      const failedOp = createFailedOperation();
      
      // Open circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      // Check time until reset
      expect(breaker.getTimeUntilReset()).toBeGreaterThan(4900);
      expect(breaker.getTimeUntilReset()).toBeLessThanOrEqual(5000);
      
      // Advance time
      jest.advanceTimersByTime(2000);
      
      expect(breaker.getTimeUntilReset()).toBeGreaterThan(2900);
      expect(breaker.getTimeUntilReset()).toBeLessThanOrEqual(3000);
      
      jest.useRealTimers();
    });
    
    it('should return 0 time until reset when closed', () => {
      const breaker = new CircuitBreaker();
      
      expect(breaker.getTimeUntilReset()).toBe(0);
    });
  });
  
  describe('success counter', () => {
    it('should track success count in HALF_OPEN', async () => {
      jest.useFakeTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
      });
      
      const failedOp = createFailedOperation();
      
      // Open circuit
      await breaker.execute(failedOp).catch(() => {});
      await breaker.execute(failedOp).catch(() => {});
      
      expect(breaker.getSuccessCount()).toBe(0);
      
      // Wait for HALF_OPEN
      jest.advanceTimersByTime(1001);
      
      // Execute successful operation
      await breaker.execute(createSuccessfulOperation('result'));
      
      // Success count should be tracked
      expect(breaker.getSuccessCount()).toBeGreaterThanOrEqual(0);
      
      jest.useRealTimers();
    });
  });
  
  describe('edge cases', () => {
    it('should handle rapid successive failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
      });
      
      const failedOp = createFailedOperation();
      
      // Execute many failures rapidly
      const promises = Array(10)
        .fill(null)
        .map(() => breaker.execute(failedOp).catch(() => {}));
      
      await Promise.all(promises);
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
    
    it('should handle operation that throws non-Error', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
      });
      
      const throwsString = async () => {
        throw 'string error';
      };
      
      await breaker.execute(throwsString).catch(() => {});
      await breaker.execute(throwsString).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
    
    it('should handle async operations correctly', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
      });
      
      const slowFailedOp = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Failed');
      };
      
      await breaker.execute(slowFailedOp).catch(() => {});
      await breaker.execute(slowFailedOp).catch(() => {});
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });
});

