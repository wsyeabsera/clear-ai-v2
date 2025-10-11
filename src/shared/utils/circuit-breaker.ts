/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export interface CircuitBreakerOptions {
  /**
   * Number of failures before opening the circuit
   * @default 5
   */
  failureThreshold?: number;
  
  /**
   * Time in ms to wait before attempting to close the circuit
   * @default 60000 (1 minute)
   */
  resetTimeout?: number;
  
  /**
   * Optional callback when circuit opens
   */
  onOpen?: () => void;
  
  /**
   * Optional callback when circuit closes
   */
  onClose?: () => void;
  
  /**
   * Optional callback when circuit enters half-open state
   */
  onHalfOpen?: () => void;
}

export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly onOpen: (() => void) | undefined;
  private readonly onClose: (() => void) | undefined;
  private readonly onHalfOpen: (() => void) | undefined;
  
  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60000;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;
  }
  
  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to half-open
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }
    
    // Reject if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerError(
        'Circuit breaker is open',
        this.failureCount,
        this.lastFailureTime
      );
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
  
  /**
   * Get current success count (in half-open state)
   */
  getSuccessCount(): number {
    return this.successCount;
  }
  
  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
  
  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.transitionToOpen();
  }
  
  /**
   * Get time until circuit attempts reset (in ms)
   */
  getTimeUntilReset(): number {
    if (this.state !== CircuitState.OPEN) {
      return 0;
    }
    
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeout - elapsed);
  }
  
  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // After a successful request in half-open, close the circuit
      this.transitionToClosed();
    }
  }
  
  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Open circuit if failure threshold is reached
    if (this.state === CircuitState.CLOSED && 
        this.failureCount >= this.failureThreshold) {
      this.transitionToOpen();
    }
    
    // If failure in half-open state, reopen the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    }
  }
  
  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }
  
  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.successCount = 0;
    
    if (this.onOpen) {
      this.onOpen();
    }
  }
  
  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    
    if (this.onHalfOpen) {
      this.onHalfOpen();
    }
  }
  
  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    
    if (this.onClose) {
      this.onClose();
    }
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly failureCount: number,
    public readonly lastFailureTime: number
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Create a circuit breaker with default options
 */
export function createCircuitBreaker(
  options?: CircuitBreakerOptions
): CircuitBreaker {
  return new CircuitBreaker(options);
}

