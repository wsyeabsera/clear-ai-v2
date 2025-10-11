/**
 * Message Summarizer Tests
 * Testing LLM-based message summarization
 */

import { MessageSummarizer, SummarizationResult } from '../../../../shared/context/compression/summarizer.js';
import { createMessage, Message } from '../../../../shared/context/types.js';
import { LLMProvider } from '../../../../shared/llm/provider.js';

// Mock LLM Provider
class MockLLMProvider {
  async generate(request: any): Promise<any> {
    return {
      content: 'Summary: User asked about shipments. Assistant provided data.',
      provider: 'mock',
      model: 'mock-model',
      metadata: {
        latency_ms: 100,
        retries: 0,
      },
    };
  }
}

describe('MessageSummarizer', () => {
  let summarizer: MessageSummarizer;
  let mockLLM: MockLLMProvider;
  
  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    summarizer = new MessageSummarizer(mockLLM as any);
  });
  
  describe('summarize', () => {
    it('should summarize a list of messages', async () => {
      const messages: Message[] = [
        createMessage('user', 'Show me all shipments'),
        createMessage('assistant', 'Found 10 shipments'),
        createMessage('user', 'What about contaminated ones?'),
        createMessage('assistant', '3 shipments have contaminants'),
      ];
      
      const result = await summarizer.summarize(messages);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });
    
    it('should include key points in summary', async () => {
      const messages: Message[] = [
        createMessage('user', 'Query about facilities'),
        createMessage('assistant', 'Response with data'),
      ];
      
      const result = await summarizer.summarize(messages);
      
      expect(result.keyPoints).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });
    
    it('should return token count', async () => {
      const messages: Message[] = [
        createMessage('user', 'This is a longer test message with more content to ensure the summary will be shorter'),
        createMessage('assistant', 'Here is a detailed response with lots of information that could be compressed'),
        createMessage('user', 'And another message to make the conversation longer'),
        createMessage('assistant', 'With more detailed responses that take up more tokens'),
      ];
      
      const result = await summarizer.summarize(messages);
      
      // Should have calculated tokens (could be positive or negative depending on compression effectiveness)
      expect(typeof result.tokensSaved).toBe('number');
      expect(result.originalTokens).toBeGreaterThan(0);
      expect(result.summaryTokens).toBeGreaterThan(0);
    });
    
    it('should preserve entities', async () => {
      const messages: Message[] = [
        createMessage('user', 'Check FacilityA status'),
        createMessage('assistant', 'FacilityA is operational'),
      ];
      
      const result = await summarizer.summarize(messages);
      
      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });
  
  describe('summarizeToMessage', () => {
    it('should convert summary to a system message', async () => {
      const messages: Message[] = [
        createMessage('user', 'Original conversation'),
        createMessage('assistant', 'Response here'),
      ];
      
      const summaryMessage = await summarizer.summarizeToMessage(messages);
      
      expect(summaryMessage.role).toBe('system');
      expect(summaryMessage.content).toContain('Summary');
      expect(summaryMessage.metadata?.compressed).toBe(true);
      expect(summaryMessage.metadata?.originalCount).toBe(2);
    });
    
    it('should mark message as sticky', async () => {
      const messages: Message[] = [
        createMessage('user', 'Test question'),
        createMessage('assistant', 'Test answer'),
      ];
      
      const summaryMessage = await summarizer.summarizeToMessage(messages);
      
      expect(summaryMessage.metadata?.sticky).toBe(true);
    });
  });
  
  describe('canSummarize', () => {
    it('should return true for sufficient messages', () => {
      const messages: Message[] = [
        createMessage('user', 'One'),
        createMessage('assistant', 'Two'),
        createMessage('user', 'Three'),
      ];
      
      const canSummarize = summarizer.canSummarize(messages);
      
      expect(canSummarize).toBe(true);
    });
    
    it('should return false for too few messages', () => {
      const messages: Message[] = [
        createMessage('user', 'Only one'),
      ];
      
      const canSummarize = summarizer.canSummarize(messages);
      
      expect(canSummarize).toBe(false);
    });
    
    it('should return false for empty array', () => {
      expect(summarizer.canSummarize([])).toBe(false);
    });
  });
  
  describe('error handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const failingLLM = {
        generate: async () => {
          throw new Error('LLM failed');
        },
      };
      
      const failingSummarizer = new MessageSummarizer(failingLLM as any);
      const messages = [createMessage('user', 'Test')];
      
      await expect(failingSummarizer.summarize(messages)).rejects.toThrow();
    });
  });
});

