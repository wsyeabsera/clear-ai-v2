/**
 * Token Counter Tests
 * Testing accurate token counting for different models
 */

import {
  TokenCounter,
  ModelEncoding,
  TokenCount,
} from '../../../shared/tokens/counter.js';

describe('TokenCounter', () => {
  let counter: TokenCounter;
  
  beforeEach(() => {
    counter = new TokenCounter();
  });
  
  describe('countTokens', () => {
    it('should count tokens for GPT-3.5', () => {
      const text = 'Hello, how are you?';
      const count = counter.countTokens(text, 'gpt-3.5-turbo');
      
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(text.length); // Should be fewer than characters
    });
    
    it('should count tokens for GPT-4', () => {
      const text = 'This is a test message';
      const count = counter.countTokens(text, 'gpt-4');
      
      expect(count).toBeGreaterThan(0);
    });
    
    it('should handle empty string', () => {
      const count = counter.countTokens('', 'gpt-3.5-turbo');
      
      expect(count).toBe(0);
    });
    
    it('should handle long text', () => {
      const longText = 'word '.repeat(1000);
      const count = counter.countTokens(longText, 'gpt-3.5-turbo');
      
      expect(count).toBeGreaterThan(1000);
    });
    
    it('should use default model if not specified', () => {
      const text = 'Hello world';
      const count = counter.countTokens(text);
      
      expect(count).toBeGreaterThan(0);
    });
  });
  
  describe('countMessages', () => {
    it('should count tokens in message array', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      
      const count = counter.countMessages(messages, 'gpt-3.5-turbo');
      
      expect(count.totalTokens).toBeGreaterThan(0);
      expect(count.messageCount).toBe(3);
      expect(count.perMessage).toHaveLength(3);
    });
    
    it('should include message formatting overhead', () => {
      const singleMessage = [
        { role: 'user', content: 'Hello' },
      ];
      
      const contentTokens = counter.countTokens('Hello', 'gpt-3.5-turbo');
      const messageTokens = counter.countMessages(singleMessage, 'gpt-3.5-turbo');
      
      // Message should have more tokens than raw content (formatting overhead)
      expect(messageTokens.totalTokens).toBeGreaterThan(contentTokens);
    });
    
    it('should handle empty message array', () => {
      const count = counter.countMessages([], 'gpt-3.5-turbo');
      
      expect(count.totalTokens).toBe(0);
      expect(count.messageCount).toBe(0);
    });
  });
  
  describe('fitsInWindow', () => {
    it('should check if text fits in context window', () => {
      const shortText = 'Hello';
      const longText = 'word '.repeat(10000);
      
      expect(counter.fitsInWindow(shortText, 'gpt-3.5-turbo')).toBe(true);
      expect(counter.fitsInWindow(longText, 'gpt-3.5-turbo')).toBe(false);
    });
    
    it('should use model-specific limits', () => {
      const text = 'test message';
      
      // GPT-3.5 has 4k window, GPT-4 has larger
      expect(counter.fitsInWindow(text, 'gpt-3.5-turbo')).toBe(true);
      expect(counter.fitsInWindow(text, 'gpt-4')).toBe(true);
    });
  });
  
  describe('getModelMaxTokens', () => {
    it('should return max tokens for GPT-3.5', () => {
      const max = counter.getModelMaxTokens('gpt-3.5-turbo');
      expect(max).toBe(4096);
    });
    
    it('should return max tokens for GPT-4', () => {
      const max = counter.getModelMaxTokens('gpt-4');
      expect(max).toBe(8192);
    });
    
    it('should return max tokens for GPT-4 Turbo', () => {
      const max = counter.getModelMaxTokens('gpt-4-turbo');
      expect(max).toBe(128000);
    });
    
    it('should have default for unknown models', () => {
      const max = counter.getModelMaxTokens('unknown-model');
      expect(max).toBeGreaterThan(0);
    });
  });
  
  describe('estimateCost', () => {
    it('should estimate cost for GPT-3.5', () => {
      const cost = counter.estimateCost(1000, 500, 'gpt-3.5-turbo');
      
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.input).toBeGreaterThan(0);
      expect(cost.output).toBeGreaterThan(0);
      expect(cost.total).toBe(cost.input + cost.output);
    });
    
    it('should estimate cost for GPT-4', () => {
      const cost = counter.estimateCost(1000, 500, 'gpt-4');
      
      expect(cost.total).toBeGreaterThan(0);
    });
    
    it('should have different costs for different models', () => {
      const gpt35Cost = counter.estimateCost(1000, 1000, 'gpt-3.5-turbo');
      const gpt4Cost = counter.estimateCost(1000, 1000, 'gpt-4');
      
      // GPT-4 should be more expensive
      expect(gpt4Cost.total).toBeGreaterThan(gpt35Cost.total);
    });
  });
  
  describe('getRemainingTokens', () => {
    it('should calculate remaining tokens in context window', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
      ];
      
      const remaining = counter.getRemainingTokens(messages, 'gpt-3.5-turbo');
      
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(4096);
    });
  });
});

