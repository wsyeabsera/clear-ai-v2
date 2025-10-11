/**
 * Tests for error utilities
 */

import {
  ClearAIError,
  ToolExecutionError,
  PlanGenerationError,
  LLMProviderError,
  MemoryError,
  ValidationError,
  wrapError
} from '../../../shared/utils/errors.js';

describe('Error Utilities', () => {
  describe('ClearAIError', () => {
    it('should create base error', () => {
      const error = new ClearAIError('Test error', 'TEST_CODE', { detail: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('ClearAIError');
    });
    
    it('should serialize to JSON', () => {
      const error = new ClearAIError('Test error', 'TEST_CODE', { detail: 'test' });
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'ClearAIError',
        message: 'Test error',
        code: 'TEST_CODE',
        details: { detail: 'test' }
      });
    });
  });
  
  describe('ToolExecutionError', () => {
    it('should create tool execution error', () => {
      const error = new ToolExecutionError('shipments', 'API failed', { status: 500 });
      
      expect(error.message).toBe('Tool execution failed: shipments');
      expect(error.code).toBe('TOOL_EXECUTION_ERROR');
      expect(error.details).toEqual({ tool: 'shipments', errorMessage: 'API failed', status: 500 });
      expect(error.name).toBe('ToolExecutionError');
    });
  });
  
  describe('PlanGenerationError', () => {
    it('should create plan generation error', () => {
      const error = new PlanGenerationError('Invalid plan', { reason: 'missing tool' });
      
      expect(error.message).toBe('Invalid plan');
      expect(error.code).toBe('PLAN_GENERATION_ERROR');
      expect(error.details).toEqual({ reason: 'missing tool' });
      expect(error.name).toBe('PlanGenerationError');
    });
  });
  
  describe('LLMProviderError', () => {
    it('should create LLM provider error', () => {
      const error = new LLMProviderError('openai', 'API key invalid', { status: 401 });
      
      expect(error.message).toBe('LLM provider error: openai');
      expect(error.code).toBe('LLM_PROVIDER_ERROR');
      expect(error.details).toEqual({ provider: 'openai', errorMessage: 'API key invalid', status: 401 });
      expect(error.name).toBe('LLMProviderError');
    });
  });
  
  describe('MemoryError', () => {
    it('should create memory error', () => {
      const error = new MemoryError('store', 'Connection failed', { db: 'neo4j' });
      
      expect(error.message).toBe('Memory operation failed: store');
      expect(error.code).toBe('MEMORY_ERROR');
      expect(error.details).toEqual({ operation: 'store', errorMessage: 'Connection failed', db: 'neo4j' });
      expect(error.name).toBe('MemoryError');
    });
  });
  
  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });
  });
  
  describe('wrapError', () => {
    it('should pass through ClearAIError', () => {
      const original = new ClearAIError('Test', 'TEST_CODE');
      const wrapped = wrapError(original);
      
      expect(wrapped).toBe(original);
    });
    
    it('should wrap standard Error', () => {
      const original = new Error('Standard error');
      const wrapped = wrapError(original);
      
      expect(wrapped).toBeInstanceOf(ClearAIError);
      expect(wrapped.message).toBe('Standard error');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.details).toEqual({ originalError: 'Error' });
    });
    
    it('should wrap unknown errors', () => {
      const wrapped = wrapError('string error');
      
      expect(wrapped).toBeInstanceOf(ClearAIError);
      expect(wrapped.message).toBe('An unknown error occurred');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.details).toEqual({ error: 'string error' });
    });
    
    it('should wrap null/undefined', () => {
      const wrapped = wrapError(null);
      
      expect(wrapped).toBeInstanceOf(ClearAIError);
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });
  });
});

