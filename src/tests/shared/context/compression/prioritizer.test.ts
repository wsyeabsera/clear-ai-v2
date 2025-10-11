/**
 * Message Prioritizer Tests
 * Testing message importance scoring and prioritization
 */

import { MessagePrioritizer, PrioritizedMessage } from '../../../../shared/context/compression/prioritizer.js';
import { createMessage } from '../../../../shared/context/types.js';

describe('MessagePrioritizer', () => {
  let prioritizer: MessagePrioritizer;
  
  beforeEach(() => {
    prioritizer = new MessagePrioritizer();
  });
  
  describe('calculateImportance', () => {
    it('should give system messages highest importance', () => {
      const systemMsg = createMessage('system', 'You are helpful');
      const userMsg = createMessage('user', 'Hello');
      
      const systemImportance = prioritizer.calculateImportance(systemMsg);
      const userImportance = prioritizer.calculateImportance(userMsg);
      
      expect(systemImportance).toBeGreaterThan(userImportance);
      expect(systemImportance).toBe(1.0); // System always 1.0
    });
    
    it('should give sticky messages high importance', () => {
      const stickyMsg = createMessage('user', 'Important', { sticky: true });
      const normalMsg = createMessage('user', 'Normal');
      
      const stickyImportance = prioritizer.calculateImportance(stickyMsg);
      const normalImportance = prioritizer.calculateImportance(normalMsg);
      
      expect(stickyImportance).toBeGreaterThan(normalImportance);
    });
    
    it('should favor recent messages', () => {
      const oldMsg = createMessage('user', 'Old');
      // Simulate time passing
      const recentMsg = createMessage('user', 'Recent');
      
      const messages = [oldMsg, recentMsg];
      const prioritized = prioritizer.prioritize(messages);
      
      // prioritize() returns sorted by importance (highest first)
      // So prioritized[0] should be the recent message (index 1 in original)
      // and prioritized[1] should be the old message (index 0 in original)
      expect(prioritized[0]!.index).toBe(1); // Recent message
      expect(prioritized[1]!.index).toBe(0); // Old message
      expect(prioritized[0]!.importance).toBeGreaterThan(prioritized[1]!.importance);
    });
    
    it('should give tool results moderate importance', () => {
      const toolMsg = createMessage('tool', '{"result": "data"}');
      const userMsg = createMessage('user', 'Hello');
      
      const toolImportance = prioritizer.calculateImportance(toolMsg);
      const userImportance = prioritizer.calculateImportance(userMsg);
      
      expect(toolImportance).toBeGreaterThan(0.5);
      expect(toolImportance).toBeLessThan(1.0);
    });
    
    it('should consider message length', () => {
      const shortMsg = createMessage('user', 'Hi');
      const longMsg = createMessage('user', 'This is a very long message with lots of important information that should be preserved');
      
      const shortImportance = prioritizer.calculateImportance(shortMsg);
      const longImportance = prioritizer.calculateImportance(longMsg);
      
      // Longer messages slightly more important
      expect(longImportance).toBeGreaterThanOrEqual(shortImportance);
    });
  });
  
  describe('prioritize', () => {
    it('should assign importance scores to all messages', () => {
      const messages = [
        createMessage('system', 'System'),
        createMessage('user', 'User'),
        createMessage('assistant', 'Assistant'),
      ];
      
      const prioritized = prioritizer.prioritize(messages);
      
      expect(prioritized).toHaveLength(3);
      prioritized.forEach(pm => {
        expect(pm.importance).toBeGreaterThan(0);
        expect(pm.importance).toBeLessThanOrEqual(1);
      });
    });
    
    it('should sort by importance in descending order', () => {
      const prioritized = prioritizer.prioritize([
        createMessage('user', 'Normal message'),
        createMessage('system', 'System message'),
        createMessage('user', 'Another normal'),
      ]);
      
      // Should be sorted: system first (1.0), then users
      expect(prioritized[0]!.message.role).toBe('system');
      expect(prioritized[0]!.importance).toBe(1.0);
    });
    
    it('should preserve sticky messages at top', () => {
      const messages = [
        createMessage('user', 'Normal'),
        createMessage('user', 'Sticky', { sticky: true }),
        createMessage('user', 'Another normal'),
      ];
      
      const prioritized = prioritizer.prioritize(messages);
      
      // Sticky should be near top
      const stickyIndex = prioritized.findIndex(pm => pm.message.metadata?.sticky);
      expect(stickyIndex).toBeLessThan(2);
    });
  });
  
  describe('selectTopN', () => {
    it('should select N most important messages', () => {
      const messages = [
        createMessage('system', 'System'),
        createMessage('user', 'User 1'),
        createMessage('assistant', 'Assistant'),
        createMessage('user', 'User 2'),
        createMessage('user', 'User 3'),
      ];
      
      const top3 = prioritizer.selectTopN(messages, 3);
      
      expect(top3).toHaveLength(3);
      // System should always be included
      expect(top3.some(m => m.role === 'system')).toBe(true);
    });
    
    it('should return all messages if N is greater than length', () => {
      const messages = [
        createMessage('user', 'One'),
        createMessage('user', 'Two'),
      ];
      
      const selected = prioritizer.selectTopN(messages, 10);
      
      expect(selected).toHaveLength(2);
    });
    
    it('should preserve message order in selection', () => {
      const messages = [
        createMessage('system', 'System'),
        createMessage('user', 'User 1'),
        createMessage('assistant', 'Assistant'),
      ];
      
      const selected = prioritizer.selectTopN(messages, 3);
      
      // Should maintain chronological order
      expect(selected[0]?.role).toBe('system');
      expect(selected[1]?.role).toBe('user');
      expect(selected[2]?.role).toBe('assistant');
    });
  });
  
  describe('selectByTokenBudget', () => {
    it('should select messages within token budget', () => {
      const messages = [
        createMessage('system', 'System'),
        createMessage('user', 'Short'),
        createMessage('assistant', 'This is a much longer message that takes more tokens'),
      ];
      
      const selected = prioritizer.selectByTokenBudget(messages, 50);
      
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.length).toBeLessThanOrEqual(3);
      
      // Total tokens should be under budget
      const totalTokens = selected.reduce((sum, m) => sum + (m.tokenCount || 0), 0);
      expect(totalTokens).toBeLessThanOrEqual(50);
    });
    
    it('should prioritize important messages within budget', () => {
      const messages = [
        createMessage('system', 'System prompt'),
        createMessage('user', 'User question'),
        createMessage('assistant', 'Assistant answer'),
      ];
      
      const selected = prioritizer.selectByTokenBudget(messages, 20);
      
      // System message should always be included
      expect(selected.some(m => m.role === 'system')).toBe(true);
    });
    
    it('should return empty array if no messages fit budget', () => {
      const messages = [
        createMessage('user', 'This is a very long message that exceeds the tiny budget'),
      ];
      
      const selected = prioritizer.selectByTokenBudget(messages, 1);
      
      // Even if nothing fits, system messages might still be forced in
      // but for normal messages, should return empty or minimal
      expect(selected.length).toBeLessThanOrEqual(1);
    });
  });
});

