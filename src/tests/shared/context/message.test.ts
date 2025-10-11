/**
 * Message Handler Tests
 * Testing message operations and utilities
 */

import {
  MessageHandler,
  MessageList,
  MessageFilter,
} from '../../../shared/context/message.js';
import { createMessage, Message } from '../../../shared/context/types.js';

describe('MessageHandler', () => {
  let handler: MessageHandler;
  
  beforeEach(() => {
    handler = new MessageHandler();
  });
  
  describe('addMessage', () => {
    it('should add a message to the list', () => {
      const message = createMessage('user', 'Hello');
      handler.addMessage(message);
      
      const messages = handler.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });
    
    it('should add multiple messages in order', () => {
      const msg1 = createMessage('user', 'First');
      const msg2 = createMessage('assistant', 'Second');
      const msg3 = createMessage('user', 'Third');
      
      handler.addMessage(msg1);
      handler.addMessage(msg2);
      handler.addMessage(msg3);
      
      const messages = handler.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0]?.content).toBe('First');
      expect(messages[1]?.content).toBe('Second');
      expect(messages[2]?.content).toBe('Third');
    });
    
    it('should calculate token count for added message', () => {
      const message = createMessage('user', 'Hello world');
      handler.addMessage(message);
      
      const messages = handler.getMessages();
      expect(messages[0]?.tokenCount).toBeGreaterThan(0);
    });
  });
  
  describe('getMessages', () => {
    it('should return empty array initially', () => {
      const messages = handler.getMessages();
      expect(messages).toHaveLength(0);
    });
    
    it('should return all messages', () => {
      handler.addMessage(createMessage('user', 'One'));
      handler.addMessage(createMessage('assistant', 'Two'));
      
      const messages = handler.getMessages();
      expect(messages).toHaveLength(2);
    });
    
    it('should return filtered messages by role', () => {
      handler.addMessage(createMessage('user', 'User 1'));
      handler.addMessage(createMessage('assistant', 'Assistant 1'));
      handler.addMessage(createMessage('user', 'User 2'));
      
      const userMessages = handler.getMessages({ role: 'user' });
      expect(userMessages).toHaveLength(2);
      expect(userMessages.every(m => m.role === 'user')).toBe(true);
    });
    
    it('should return limited number of messages', () => {
      for (let i = 0; i < 10; i++) {
        handler.addMessage(createMessage('user', `Message ${i}`));
      }
      
      const messages = handler.getMessages({ limit: 5 });
      expect(messages).toHaveLength(5);
    });
    
    it('should return most recent messages when limited', () => {
      handler.addMessage(createMessage('user', 'Old'));
      handler.addMessage(createMessage('user', 'New'));
      
      const messages = handler.getMessages({ limit: 1 });
      expect(messages[0]?.content).toBe('New');
    });
  });
  
  describe('getTotalTokens', () => {
    it('should return 0 for empty message list', () => {
      expect(handler.getTotalTokens()).toBe(0);
    });
    
    it('should sum token counts of all messages', () => {
      handler.addMessage(createMessage('user', 'Short'));
      handler.addMessage(createMessage('user', 'This is a longer message'));
      
      const total = handler.getTotalTokens();
      expect(total).toBeGreaterThan(0);
    });
  });
  
  describe('clear', () => {
    it('should remove all messages', () => {
      handler.addMessage(createMessage('user', 'Test 1'));
      handler.addMessage(createMessage('user', 'Test 2'));
      
      expect(handler.getMessages()).toHaveLength(2);
      
      handler.clear();
      
      expect(handler.getMessages()).toHaveLength(0);
      expect(handler.getTotalTokens()).toBe(0);
    });
  });
  
  describe('removeOldest', () => {
    it('should remove the oldest message', () => {
      const old = createMessage('user', 'Old');
      const newer = createMessage('user', 'Newer');
      
      handler.addMessage(old);
      // Wait a bit to ensure different timestamps
      handler.addMessage(newer);
      
      handler.removeOldest(1);
      
      const messages = handler.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]?.content).toBe('Newer');
    });
    
    it('should remove multiple oldest messages', () => {
      for (let i = 0; i < 5; i++) {
        handler.addMessage(createMessage('user', `Message ${i}`));
      }
      
      handler.removeOldest(3);
      
      const messages = handler.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe('Message 3');
      expect(messages[1]?.content).toBe('Message 4');
    });
    
    it('should not error when removing more than available', () => {
      handler.addMessage(createMessage('user', 'Only one'));
      
      handler.removeOldest(10);
      
      expect(handler.getMessages()).toHaveLength(0);
    });
  });
  
  describe('getSystemMessages', () => {
    it('should return only system messages', () => {
      handler.addMessage(createMessage('system', 'System prompt'));
      handler.addMessage(createMessage('user', 'User message'));
      handler.addMessage(createMessage('system', 'Another system'));
      
      const systemMessages = handler.getSystemMessages();
      
      expect(systemMessages).toHaveLength(2);
      expect(systemMessages.every(m => m.role === 'system')).toBe(true);
    });
  });
  
  describe('formatForLLM', () => {
    it('should format messages for LLM consumption', () => {
      handler.addMessage(createMessage('system', 'You are helpful'));
      handler.addMessage(createMessage('user', 'Hello'));
      handler.addMessage(createMessage('assistant', 'Hi there'));
      
      const formatted = handler.formatForLLM();
      
      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toHaveProperty('role');
      expect(formatted[0]).toHaveProperty('content');
      expect(formatted[0]?.role).toBe('system');
    });
    
    it('should exclude tool messages by default', () => {
      handler.addMessage(createMessage('user', 'Hello'));
      handler.addMessage(createMessage('tool', '{"result": "data"}'));
      handler.addMessage(createMessage('assistant', 'Done'));
      
      const formatted = handler.formatForLLM();
      
      expect(formatted).toHaveLength(2);
      expect(formatted.every(m => m.role !== 'tool')).toBe(true);
    });
    
    it('should include tool messages when specified', () => {
      handler.addMessage(createMessage('user', 'Hello'));
      handler.addMessage(createMessage('tool', '{"result": "data"}'));
      
      const formatted = handler.formatForLLM({ includeTool: true });
      
      expect(formatted).toHaveLength(2);
      expect(formatted.some(m => m.role === 'tool')).toBe(true);
    });
  });
  
  describe('MessageList', () => {
    it('should create a message list from array', () => {
      const messages = [
        createMessage('user', 'First'),
        createMessage('assistant', 'Second'),
      ];
      
      const list = new MessageList(messages);
      
      expect(list.length()).toBe(2);
      expect(list.getTotalTokens()).toBeGreaterThan(0);
    });
  });
});

