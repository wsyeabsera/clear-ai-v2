/**
 * Context Compressor
 * Orchestrates different compression strategies
 */

import { Message, calculateMessageTokens } from '../types.js';
import { MessagePrioritizer } from './prioritizer.js';
import { MessageSummarizer } from './summarizer.js';
import { LLMProvider } from '../../llm/provider.js';

/**
 * Compression strategies
 */
export type CompressionStrategy = 'REMOVE_OLD' | 'PRIORITIZE' | 'SUMMARIZE';

/**
 * Compression result
 */
export interface CompressionResult {
  compressed: Message[];
  strategy: CompressionStrategy;
  tokensSaved: number;
  originalTokens: number;
  compressedTokens: number;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  originalCount: number;
  compressedCount: number;
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  compressionRatio: number; // 0-1, where 0.5 means 50% compression
}

/**
 * Context Compressor
 * Applies different strategies to reduce context size
 */
export class ContextCompressor {
  private prioritizer: MessagePrioritizer;
  private summarizer: MessageSummarizer | null = null;
  
  constructor(llm?: LLMProvider) {
    this.prioritizer = new MessagePrioritizer();
    
    if (llm) {
      this.summarizer = new MessageSummarizer(llm);
    }
  }
  
  /**
   * Check if compression is needed
   */
  needsCompression(messages: Message[], tokenLimit: number): boolean {
    const totalTokens = messages.reduce((sum, m) => 
      sum + (m.tokenCount || calculateMessageTokens(m)), 0
    );
    
    return totalTokens > tokenLimit;
  }
  
  /**
   * Compress messages using specified strategy
   */
  async compress(
    messages: Message[],
    tokenLimit: number,
    strategy?: CompressionStrategy
  ): Promise<CompressionResult> {
    const selectedStrategy = strategy || this.selectBestStrategy(messages, tokenLimit);
    
    let compressed: Message[];
    
    switch (selectedStrategy) {
      case 'REMOVE_OLD':
        compressed = await this.compressRemoveOld(messages, tokenLimit);
        break;
      case 'PRIORITIZE':
        compressed = await this.compressPrioritize(messages, tokenLimit);
        break;
      case 'SUMMARIZE':
        compressed = await this.compressSummarize(messages, tokenLimit);
        break;
      default:
        throw new Error(`Unknown compression strategy: ${selectedStrategy}`);
    }
    
    const originalTokens = this.calculateTotalTokens(messages);
    const compressedTokens = this.calculateTotalTokens(compressed);
    
    return {
      compressed,
      strategy: selectedStrategy,
      tokensSaved: originalTokens - compressedTokens,
      originalTokens,
      compressedTokens,
    };
  }
  
  /**
   * Automatically select and apply best compression strategy
   */
  async compressAuto(messages: Message[], tokenLimit: number): Promise<CompressionResult> {
    const strategy = this.selectBestStrategy(messages, tokenLimit);
    return this.compress(messages, tokenLimit, strategy);
  }
  
  /**
   * Get compression statistics
   */
  getCompressionStats(original: Message[], compressed: Message[]): CompressionStats {
    const originalTokens = this.calculateTotalTokens(original);
    const compressedTokens = this.calculateTotalTokens(compressed);
    const tokensSaved = originalTokens - compressedTokens;
    const compressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1;
    
    return {
      originalCount: original.length,
      compressedCount: compressed.length,
      originalTokens,
      compressedTokens,
      tokensSaved,
      compressionRatio,
    };
  }
  
  /**
   * Select best compression strategy based on context
   */
  private selectBestStrategy(messages: Message[], _tokenLimit: number): CompressionStrategy {
    const messageCount = messages.length;
    const hasConversationFlow = messages.some(m => m.role === 'user') && 
                                 messages.some(m => m.role === 'assistant');
    
    // If we have LLM and a good conversation flow, use summarization
    if (this.summarizer && messageCount >= 4 && hasConversationFlow) {
      return 'SUMMARIZE';
    }
    
    // If messages have priority/sticky flags, use prioritization
    const hasPriorityMessages = messages.some(m => 
      m.metadata?.sticky || m.metadata?.priority === 'high'
    );
    
    if (hasPriorityMessages) {
      return 'PRIORITIZE';
    }
    
    // Default: simple removal of old messages
    return 'REMOVE_OLD';
  }
  
  /**
   * Compression strategy: Remove oldest messages
   */
  private async compressRemoveOld(messages: Message[], tokenLimit: number): Promise<Message[]> {
    let compressed = [...messages];
    let currentTokens = this.calculateTotalTokens(compressed);
    
    // Always keep system messages
    const systemMessages = compressed.filter(m => m.role === 'system');
    let otherMessages = compressed.filter(m => m.role !== 'system');
    
    // Remove oldest non-system messages until under limit
    while (currentTokens > tokenLimit && otherMessages.length > 0) {
      otherMessages.shift(); // Remove oldest
      compressed = [...systemMessages, ...otherMessages];
      currentTokens = this.calculateTotalTokens(compressed);
    }
    
    return compressed;
  }
  
  /**
   * Compression strategy: Prioritize important messages
   */
  private async compressPrioritize(messages: Message[], tokenLimit: number): Promise<Message[]> {
    // Use prioritizer to select most important messages within budget
    const compressed = this.prioritizer.selectByTokenBudget(messages, tokenLimit);
    return compressed;
  }
  
  /**
   * Compression strategy: Summarize old messages
   */
  private async compressSummarize(messages: Message[], tokenLimit: number): Promise<Message[]> {
    if (!this.summarizer) {
      throw new Error('LLM provider required for SUMMARIZE strategy');
    }
    
    // Keep recent messages, summarize old ones
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    // Keep last few messages, summarize the rest
    const recentCount = Math.min(4, Math.floor(otherMessages.length / 2));
    const recentMessages = otherMessages.slice(-recentCount);
    const oldMessages = otherMessages.slice(0, -recentCount);
    
    let result: Message[] = [...systemMessages];
    
    // Summarize old messages if there are enough
    if (oldMessages.length >= 2) {
      const summaryMessage = await this.summarizer.summarizeToMessage(oldMessages);
      result.push(summaryMessage);
    } else {
      result.push(...oldMessages);
    }
    
    result.push(...recentMessages);
    
    // If still over limit, apply prioritization
    const currentTokens = this.calculateTotalTokens(result);
    if (currentTokens > tokenLimit) {
      result = this.prioritizer.selectByTokenBudget(result, tokenLimit);
    }
    
    return result;
  }
  
  /**
   * Calculate total tokens for a list of messages
   */
  private calculateTotalTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => 
      sum + (m.tokenCount || calculateMessageTokens(m)), 0
    );
  }
}

