/**
 * Custom error classes
 */

/**
 * Base error class for Clear AI
 */
export class ClearAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClearAIError';
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details
    };
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends ClearAIError {
  constructor(tool: string, errorMessage: string, details?: any) {
    super(`Tool execution failed: ${tool}`, 'TOOL_EXECUTION_ERROR', {
      tool,
      errorMessage,
      ...details
    });
    this.name = 'ToolExecutionError';
  }
}

/**
 * Plan generation error
 */
export class PlanGenerationError extends ClearAIError {
  constructor(message: string, details?: any) {
    super(message, 'PLAN_GENERATION_ERROR', details);
    this.name = 'PlanGenerationError';
  }
}

/**
 * LLM provider error
 */
export class LLMProviderError extends ClearAIError {
  constructor(provider: string, errorMessage: string, details?: any) {
    super(`LLM provider error: ${provider}`, 'LLM_PROVIDER_ERROR', {
      provider,
      errorMessage,
      ...details
    });
    this.name = 'LLMProviderError';
  }
}

/**
 * Memory operation error
 */
export class MemoryError extends ClearAIError {
  constructor(operation: string, errorMessage: string, details?: any) {
    super(`Memory operation failed: ${operation}`, 'MEMORY_ERROR', {
      operation,
      errorMessage,
      ...details
    });
    this.name = 'MemoryError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends ClearAIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Wrap unknown error into ClearAIError
 */
export function wrapError(error: unknown): ClearAIError {
  if (error instanceof ClearAIError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ClearAIError(error.message, 'UNKNOWN_ERROR', {
      originalError: error.name
    });
  }
  
  return new ClearAIError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    { error }
  );
}

