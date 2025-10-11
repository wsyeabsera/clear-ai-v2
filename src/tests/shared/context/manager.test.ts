/**
 * Context Manager Tests
 * Testing conversation context management
 */

import { ContextManager, ContextConfig } from '../../../shared/context/manager.js';
import { createMessage } from '../../../shared/context/types.js';

describe('ContextManager', () => {
  let manager: ContextManager;
  let config: ContextConfig;
  
  beforeEach(() => {
    config = {
      maxTokens: 1000,
      compressionThreshold: 800, // Compress when 80% full
      minMessagesToKeep: 2,
    };
    manager = new ContextManager(config);
  });
  
  describe('initialization', () => {
    it('should create manager with default config', () => {
      const defaultManager = new ContextManager();
      expect(defaultManager).toBeDefined();
      expect(defaultManager.getTotalTokens()).toBe(0);
    });
    
    it('should create manager with custom config', () => {
      expect(manager).toBeDefined();
      expect(manager.getMaxTokens()).toBe(1000);
    });
  });
  
  describe('addMessage', () => {
    it('should add a message to context', () => {
      const message = createMessage('user', 'Hello');
      manager.addMessage(message);
      
      expect(manager.getMessageCount()).toBe(1);
      expect(manager.getTotalTokens()).toBeGreaterThan(0);
    });
    
    it('should add multiple messages', () => {
      manager.addMessage(createMessage('user', 'First'));
      manager.addMessage(createMessage('assistant', 'Second'));
      manager.addMessage(createMessage('user', 'Third'));
      
      expect(manager.getMessageCount()).toBe(3);
    });
    
    it('should calculate token counts for messages', () => {
      const before = manager.getTotalTokens();
      manager.addMessage(createMessage('user', 'This is a test message'));
      const after = manager.getTotalTokens();
      
      expect(after).toBeGreaterThan(before);
    });
  });
  
  describe('getMessages', () => {
    beforeEach(() => {
      manager.addMessage(createMessage('system', 'You are helpful'));
      manager.addMessage(createMessage('user', 'Hello'));
      manager.addMessage(createMessage('assistant', 'Hi there'));
    });
    
    it('should return all messages', () => {
      const messages = manager.getMessages();
      expect(messages).toHaveLength(3);
    });
    
    it('should filter messages by role', () => {
      const userMessages = manager.getMessages({ role: 'user' });
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0]?.content).toBe('Hello');
    });
    
    it('should limit number of messages returned', () => {
      const messages = manager.getMessages({ limit: 2 });
      expect(messages).toHaveLength(2);
    });
  });
  
  describe('compression', () => {
    it('should detect when compression is needed', () => {
      const smallConfig: ContextConfig = {
        maxTokens: 100,
        compressionThreshold: 80,
        minMessagesToKeep: 1,
      };
      const smallManager = new ContextManager(smallConfig);
      
      // Add messages until threshold reached
      for (let i = 0; i < 10; i++) {
        smallManager.addMessage(createMessage('user', `Message ${i}`));
      }
      
      expect(smallManager.needsCompression()).toBe(true);
    });
    
    it('should not need compression when under threshold', () => {
      manager.addMessage(createMessage('user', 'Short'));
      
      expect(manager.needsCompression()).toBe(false);
    });
    
    it('should return compression status', () => {
      expect(manager.isCompressed()).toBe(false);
    });
  });
  
  describe('getContextWindow', () => {
    it('should return context window with metadata', () => {
      manager.addMessage(createMessage('user', 'Test'));
      
      const window = manager.getContextWindow();
      
      expect(window.maxTokens).toBe(1000);
      expect(window.currentTokens).toBeGreaterThan(0);
      expect(window.messages).toHaveLength(1);
      expect(window.compressed).toBe(false);
    });
  });
  
  describe('clear', () => {
    it('should remove all messages', () => {
      manager.addMessage(createMessage('user', 'Test 1'));
      manager.addMessage(createMessage('user', 'Test 2'));
      
      expect(manager.getMessageCount()).toBe(2);
      
      manager.clear();
      
      expect(manager.getMessageCount()).toBe(0);
      expect(manager.getTotalTokens()).toBe(0);
    });
  });
  
  describe('formatForLLM', () => {
    beforeEach(() => {
      manager.addMessage(createMessage('system', 'You are helpful'));
      manager.addMessage(createMessage('user', 'Hello'));
      manager.addMessage(createMessage('assistant', 'Hi'));
      manager.addMessage(createMessage('tool', '{"result": "data"}'));
    });
    
    it('should format messages for LLM', () => {
      const formatted = manager.formatForLLM();
      
      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted[0]).toHaveProperty('role');
      expect(formatted[0]).toHaveProperty('content');
    });
    
    it('should exclude tool messages by default', () => {
      const formatted = manager.formatForLLM();
      
      expect(formatted.every(m => m.role !== 'tool')).toBe(true);
    });
    
    it('should include tool messages when specified', () => {
      const formatted = manager.formatForLLM({ includeTool: true });
      
      expect(formatted.some(m => m.role === 'tool')).toBe(true);
    });
  });
  
  describe('getSummary', () => {
    it('should provide context summary', () => {
      manager.addMessage(createMessage('user', 'Test'));
      
      const summary = manager.getSummary();
      
      expect(summary).toHaveProperty('messageCount');
      expect(summary).toHaveProperty('totalTokens');
      expect(summary).toHaveProperty('utilizationPercent');
      expect(summary).toHaveProperty('needsCompression');
      expect(summary).toHaveProperty('compressed');
      
      expect(summary.messageCount).toBe(1);
      expect(summary.totalTokens).toBeGreaterThan(0);
      expect(summary.utilizationPercent).toBeGreaterThan(0);
      expect(summary.utilizationPercent).toBeLessThanOrEqual(100);
    });
    
    it('should calculate utilization percentage correctly', () => {
      const summary = manager.getSummary();
      
      expect(summary.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(summary.utilizationPercent).toBeLessThanOrEqual(100);
    });
  });
  
  describe('token management', () => {
    it('should track total tokens accurately', () => {
      const before = manager.getTotalTokens();
      
      manager.addMessage(createMessage('user', 'Short'));
      const afterShort = manager.getTotalTokens();
      
      manager.addMessage(createMessage('user', 'This is a much longer message with more content'));
      const afterLong = manager.getTotalTokens();
      
      expect(afterShort).toBeGreaterThan(before);
      expect(afterLong).toBeGreaterThan(afterShort);
    });
    
    it('should respect max tokens limit', () => {
      const maxTokens = manager.getMaxTokens();
      expect(maxTokens).toBe(1000);
    });
  });
});

