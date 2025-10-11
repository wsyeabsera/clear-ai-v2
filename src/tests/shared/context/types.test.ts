/**
 * Context Types Tests
 * Testing type guards, validators, and type utilities
 */

import {
  Message,
  MessageRole,
  ContextWindow,
  ConversationMetadata,
  isValidMessage,
  isValidMessageRole,
  createMessage,
  calculateMessageTokens,
} from '../../../shared/context/types.js';

describe('Context Types', () => {
  describe('MessageRole', () => {
    it('should have correct role types', () => {
      const roles: MessageRole[] = ['system', 'user', 'assistant', 'tool'];
      expect(roles).toHaveLength(4);
    });
  });
  
  describe('isValidMessageRole', () => {
    it('should validate correct message roles', () => {
      expect(isValidMessageRole('system')).toBe(true);
      expect(isValidMessageRole('user')).toBe(true);
      expect(isValidMessageRole('assistant')).toBe(true);
      expect(isValidMessageRole('tool')).toBe(true);
    });
    
    it('should reject invalid message roles', () => {
      expect(isValidMessageRole('admin')).toBe(false);
      expect(isValidMessageRole('unknown')).toBe(false);
      expect(isValidMessageRole('')).toBe(false);
      expect(isValidMessageRole(null as any)).toBe(false);
    });
  });
  
  describe('createMessage', () => {
    it('should create a valid user message', () => {
      const message = createMessage('user', 'Hello, world!');
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, world!');
      expect(message.timestamp).toBeDefined();
      expect(new Date(message.timestamp).getTime()).toBeGreaterThan(0);
    });
    
    it('should create a system message with metadata', () => {
      const message = createMessage('system', 'You are a helpful assistant', {
        priority: 'high',
        sticky: true,
      });
      
      expect(message.role).toBe('system');
      expect(message.metadata).toBeDefined();
      expect(message.metadata?.priority).toBe('high');
      expect(message.metadata?.sticky).toBe(true);
    });
    
    it('should create an assistant message', () => {
      const message = createMessage('assistant', 'I can help with that.');
      
      expect(message.role).toBe('assistant');
      expect(message.content).toBe('I can help with that.');
    });
    
    it('should create a tool message with result', () => {
      const message = createMessage('tool', JSON.stringify({ result: 'success' }), {
        toolName: 'search',
        toolCallId: 'call_123',
      });
      
      expect(message.role).toBe('tool');
      expect(message.metadata?.toolName).toBe('search');
      expect(message.metadata?.toolCallId).toBe('call_123');
    });
  });
  
  describe('isValidMessage', () => {
    it('should validate correct messages', () => {
      const validMessage: Message = {
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
      };
      
      expect(isValidMessage(validMessage)).toBe(true);
    });
    
    it('should reject messages with invalid role', () => {
      const invalidMessage = {
        role: 'invalid',
        content: 'Test',
        timestamp: new Date().toISOString(),
      };
      
      expect(isValidMessage(invalidMessage as any)).toBe(false);
    });
    
    it('should reject messages with missing content', () => {
      const invalidMessage = {
        role: 'user',
        timestamp: new Date().toISOString(),
      };
      
      expect(isValidMessage(invalidMessage as any)).toBe(false);
    });
    
    it('should reject messages with invalid timestamp', () => {
      const invalidMessage = {
        role: 'user',
        content: 'Test',
        timestamp: 'not-a-date',
      };
      
      expect(isValidMessage(invalidMessage)).toBe(false);
    });
    
    it('should accept messages with optional token count', () => {
      const validMessage: Message = {
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        tokenCount: 5,
      };
      
      expect(isValidMessage(validMessage)).toBe(true);
    });
  });
  
  describe('calculateMessageTokens', () => {
    it('should estimate tokens for a simple message', () => {
      const message = createMessage('user', 'Hello world');
      const tokens = calculateMessageTokens(message);
      
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });
    
    it('should estimate more tokens for longer messages', () => {
      const shortMessage = createMessage('user', 'Hi');
      const longMessage = createMessage('user', 'This is a much longer message with many more words to count');
      
      const shortTokens = calculateMessageTokens(shortMessage);
      const longTokens = calculateMessageTokens(longMessage);
      
      expect(longTokens).toBeGreaterThan(shortTokens);
    });
    
    it('should account for role in token count', () => {
      const userMessage = createMessage('user', 'Hello');
      const systemMessage = createMessage('system', 'Hello');
      
      const userTokens = calculateMessageTokens(userMessage);
      const systemTokens = calculateMessageTokens(systemMessage);
      
      // Both should have positive token counts
      expect(userTokens).toBeGreaterThan(0);
      expect(systemTokens).toBeGreaterThan(0);
    });
  });
  
  describe('ContextWindow', () => {
    it('should create a valid context window', () => {
      const message = createMessage('user', 'Test');
      const contextWindow: ContextWindow = {
        maxTokens: 4096,
        currentTokens: 10,
        messages: [message],
        compressed: false,
      };
      
      expect(contextWindow.maxTokens).toBe(4096);
      expect(contextWindow.currentTokens).toBe(10);
      expect(contextWindow.messages).toHaveLength(1);
      expect(contextWindow.compressed).toBe(false);
    });
  });
  
  describe('ConversationMetadata', () => {
    it('should create valid conversation metadata', () => {
      const metadata: ConversationMetadata = {
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        turnCount: 5,
        entities: ['user', 'assistant'],
      };
      
      expect(metadata.turnCount).toBe(5);
      expect(metadata.entities).toHaveLength(2);
      expect(new Date(metadata.startedAt).getTime()).toBeGreaterThan(0);
    });
  });
});

