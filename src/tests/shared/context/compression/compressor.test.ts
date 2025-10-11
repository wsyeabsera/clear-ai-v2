/**
 * Context Compressor Tests
 * Testing orchestration of compression strategies
 */

import { ContextCompressor, CompressionStrategy, CompressionResult } from '../../../../shared/context/compression/compressor.js';
import { createMessage, Message } from '../../../../shared/context/types.js';

// Mock LLM Provider
class MockLLMProvider {
  async generate(request: any): Promise<any> {
    return {
      content: 'SUMMARY: Compressed conversation\nKEY POINTS:\n- Point 1\n- Point 2',
      provider: 'mock',
      model: 'mock-model',
      metadata: {
        latency_ms: 100,
        retries: 0,
      },
    };
  }
}

describe('ContextCompressor', () => {
  let compressor: ContextCompressor;
  let mockLLM: MockLLMProvider;
  
  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    compressor = new ContextCompressor(mockLLM as any);
  });
  
  describe('compress', () => {
    it('should compress messages when over token limit', async () => {
      const messages: Message[] = [];
      for (let i = 0; i < 20; i++) {
        messages.push(createMessage('user', `Message ${i} with some content to increase token count`));
      }
      
      const result = await compressor.compress(messages, 100); // Low token limit
      
      expect(result).toBeDefined();
      expect(result.compressed.length).toBeLessThan(messages.length); // Should be smaller
      expect(result.compressedTokens).toBeLessThanOrEqual(100); // Should fit in limit
      expect(result.strategy).toBeDefined();
      expect(result.tokensSaved).toBeGreaterThan(0); // Should save tokens
    });
    
    it('should use REMOVE_OLD strategy for simple compression', async () => {
      const messages: Message[] = [
        createMessage('system', 'You are helpful'),
        ...Array.from({ length: 15 }, (_, i) => createMessage('user', `Message ${i}`)),
      ];
      
      const result = await compressor.compress(messages, 50);
      
      expect(result.strategy).toBe('REMOVE_OLD');
    });
    
    it('should use SUMMARIZE strategy when appropriate', async () => {
      const messages: Message[] = [
        createMessage('system', 'You are helpful'),
        createMessage('user', 'Long conversation start'),
        createMessage('assistant', 'Detailed response'),
        createMessage('user', 'Follow-up question'),
        createMessage('assistant', 'More details'),
        createMessage('user', 'Another question'),
        createMessage('assistant', 'Final answer'),
      ];
      
      const result = await compressor.compress(messages, 30, 'SUMMARIZE');
      
      expect(result.strategy).toBe('SUMMARIZE');
    });
    
    it('should use PRIORITIZE strategy', async () => {
      const messages: Message[] = [
        createMessage('system', 'System prompt'),
        createMessage('user', 'Important', { sticky: true }),
        createMessage('user', 'Less important'),
        createMessage('user', 'Also less important'),
      ];
      
      const result = await compressor.compress(messages, 30, 'PRIORITIZE');
      
      expect(result.strategy).toBe('PRIORITIZE');
      // Should keep system and sticky messages
      const hasSystem = result.compressed.some(m => m.role === 'system');
      const hasSticky = result.compressed.some(m => m.metadata?.sticky);
      expect(hasSystem).toBe(true);
      expect(hasSticky).toBe(true);
    });
    
    it('should preserve system messages in all strategies', async () => {
      const messages: Message[] = [
        createMessage('system', 'System prompt'),
        ...Array.from({ length: 10 }, (_, i) => createMessage('user', `Msg ${i}`)),
      ];
      
      const result = await compressor.compress(messages, 50);
      
      const systemMessages = result.compressed.filter(m => m.role === 'system');
      expect(systemMessages.length).toBeGreaterThan(0);
    });
  });
  
  describe('auto compression', () => {
    it('should automatically select best strategy', async () => {
      const messages: Message[] = Array.from({ length: 10 }, (_, i) => 
        createMessage('user', `Message ${i}`)
      );
      
      const result = await compressor.compressAuto(messages, 50);
      
      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(['REMOVE_OLD', 'PRIORITIZE', 'SUMMARIZE']).toContain(result.strategy);
    });
  });
  
  describe('needsCompression', () => {
    it('should detect when compression is needed', () => {
      const messages: Message[] = Array.from({ length: 50 }, (_, i) => 
        createMessage('user', `Very long message number ${i} with lots of content`)
      );
      
      const needs = compressor.needsCompression(messages, 100);
      
      expect(needs).toBe(true);
    });
    
    it('should return false when under limit', () => {
      const messages: Message[] = [
        createMessage('user', 'Short'),
      ];
      
      const needs = compressor.needsCompression(messages, 1000);
      
      expect(needs).toBe(false);
    });
  });
  
  describe('getCompressionStats', () => {
    it('should provide compression statistics', async () => {
      const messages: Message[] = [
        ...Array.from({ length: 10 }, (_, i) => createMessage('user', `Message ${i}`)),
      ];
      
      const result = await compressor.compress(messages, 50);
      const stats = compressor.getCompressionStats(messages, result.compressed);
      
      expect(stats).toBeDefined();
      expect(stats.originalCount).toBe(messages.length);
      expect(stats.compressedCount).toBe(result.compressed.length);
      expect(stats.originalTokens).toBeGreaterThan(0);
      expect(stats.compressedTokens).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeGreaterThan(0);
    });
  });
});

