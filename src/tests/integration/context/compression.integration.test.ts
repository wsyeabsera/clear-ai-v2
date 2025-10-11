/**
 * Context Compression Integration Tests
 * Tests real LLM-based message summarization
 */

import dotenv from 'dotenv';
import { ContextCompressor } from '../../../shared/context/compression/compressor.js';
import { createMessage } from '../../../shared/context/types.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { getLLMConfigs } from '../../../shared/llm/config.js';

dotenv.config();

const llmConfigs = getLLMConfigs();
const hasLLM = llmConfigs.length > 0;
const describeIfLLM = hasLLM ? describe : describe.skip;

describeIfLLM('Context Compression Integration', () => {
  let compressor: ContextCompressor;
  let llmProvider: LLMProvider;
  
  beforeAll(() => {
    if (!hasLLM) {
      console.log('⚠️  No LLM providers configured, skipping context compression tests');
      return;
    }
    
    llmProvider = new LLMProvider(llmConfigs);
    compressor = new ContextCompressor(llmProvider);
  });
  
  describe('Real LLM Summarization', () => {
    it('should compress conversation using SUMMARIZE strategy', async () => {
      const messages = [
        createMessage('system', 'You are a waste management AI assistant'),
        createMessage('user', 'Show me all contaminated shipments from last month'),
        createMessage('assistant', 'I found 15 shipments with contamination issues'),
        createMessage('user', 'Which facilities had the most problems?'),
        createMessage('assistant', 'FacilityA had 8 issues, FacilityB had 5, and FacilityC had 2'),
        createMessage('user', 'What types of contaminants were detected?'),
        createMessage('assistant', 'Primarily lead, mercury, and plastic contamination'),
      ];
      
      const result = await compressor.compress(messages, 150, 'SUMMARIZE');
      
      expect(result).toBeDefined();
      expect(result.strategy).toBe('SUMMARIZE');
      expect(result.compressed.length).toBeLessThan(messages.length);
      
      // Should have calculated token savings (could be positive or negative)
      expect(typeof result.tokensSaved).toBe('number');
      expect(result.compressedTokens).toBeLessThanOrEqual(150);
      
      // Should contain a summary message
      const summaryMsg = result.compressed.find(m => m.metadata?.compressed);
      expect(summaryMsg).toBeDefined();
      expect(summaryMsg?.content).toBeTruthy();
    }, 30000);
    
    it('should preserve system messages', async () => {
      const messages = [
        createMessage('system', 'Important system prompt'),
        createMessage('user', 'Question 1'),
        createMessage('assistant', 'Answer 1'),
        createMessage('user', 'Question 2'),
        createMessage('assistant', 'Answer 2'),
      ];
      
      const result = await compressor.compress(messages, 100, 'SUMMARIZE');
      
      const hasSystemMessage = result.compressed.some(m => m.role === 'system');
      expect(hasSystemMessage).toBe(true);
    }, 30000);
  });
  
  describe('Auto Compression Strategy', () => {
    it('should automatically select best strategy', async () => {
      const messages = [
        createMessage('user', 'Test 1'),
        createMessage('assistant', 'Response 1'),
        createMessage('user', 'Test 2'),
        createMessage('assistant', 'Response 2'),
      ];
      
      const result = await compressor.compressAuto(messages, 50);
      
      expect(result).toBeDefined();
      expect(result.compressed.length).toBeLessThanOrEqual(messages.length);
      expect(['REMOVE_OLD', 'PRIORITIZE', 'SUMMARIZE']).toContain(result.strategy);
    }, 30000);
  });
});

