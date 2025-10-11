/**
 * Context Manager
 * Main interface for managing conversation context
 */

import { Message, ContextWindow } from './types.js';
import { MessageHandler, MessageFilter, FormatOptions, FormattedMessage } from './message.js';

/**
 * Configuration for context manager
 */
export interface ContextConfig {
  maxTokens?: number; // Maximum tokens in context window
  compressionThreshold?: number; // Token count to trigger compression
  minMessagesToKeep?: number; // Minimum messages to keep after compression
}

/**
 * Context summary information
 */
export interface ContextSummary {
  messageCount: number;
  totalTokens: number;
  maxTokens: number;
  utilizationPercent: number;
  needsCompression: boolean;
  compressed: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ContextConfig> = {
  maxTokens: 4096,
  compressionThreshold: 3276, // 80% of 4096
  minMessagesToKeep: 5,
};

/**
 * Context Manager
 * Manages conversation context with automatic compression
 */
export class ContextManager {
  private config: Required<ContextConfig>;
  private messageHandler: MessageHandler;
  private compressed: boolean = false;
  
  constructor(config?: ContextConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.messageHandler = new MessageHandler();
  }
  
  /**
   * Add a message to the context
   */
  addMessage(message: Message): void {
    this.messageHandler.addMessage(message);
  }
  
  /**
   * Get messages with optional filtering
   */
  getMessages(filter?: MessageFilter): Message[] {
    return this.messageHandler.getMessages(filter);
  }
  
  /**
   * Get total token count
   */
  getTotalTokens(): number {
    return this.messageHandler.getTotalTokens();
  }
  
  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messageHandler.count();
  }
  
  /**
   * Get max tokens limit
   */
  getMaxTokens(): number {
    return this.config.maxTokens;
  }
  
  /**
   * Check if compression is needed
   */
  needsCompression(): boolean {
    return this.getTotalTokens() >= this.config.compressionThreshold;
  }
  
  /**
   * Check if context has been compressed
   */
  isCompressed(): boolean {
    return this.compressed;
  }
  
  /**
   * Get the current context window
   */
  getContextWindow(): ContextWindow {
    return {
      maxTokens: this.config.maxTokens,
      currentTokens: this.getTotalTokens(),
      messages: this.getMessages(),
      compressed: this.compressed,
    };
  }
  
  /**
   * Clear all messages
   */
  clear(): void {
    this.messageHandler.clear();
    this.compressed = false;
  }
  
  /**
   * Format messages for LLM consumption
   */
  formatForLLM(options?: FormatOptions): FormattedMessage[] {
    return this.messageHandler.formatForLLM(options);
  }
  
  /**
   * Get context summary
   */
  getSummary(): ContextSummary {
    const totalTokens = this.getTotalTokens();
    const maxTokens = this.getMaxTokens();
    const utilizationPercent = maxTokens > 0 
      ? Math.round((totalTokens / maxTokens) * 100)
      : 0;
    
    return {
      messageCount: this.getMessageCount(),
      totalTokens,
      maxTokens,
      utilizationPercent,
      needsCompression: this.needsCompression(),
      compressed: this.compressed,
    };
  }
  
  /**
   * Get system messages
   */
  getSystemMessages(): Message[] {
    return this.messageHandler.getSystemMessages();
  }
  
  /**
   * Remove oldest messages
   */
  removeOldest(count: number): void {
    this.messageHandler.removeOldest(count);
  }
  
  /**
   * Mark context as compressed
   * This is typically called by a compression strategy
   */
  markAsCompressed(): void {
    this.compressed = true;
  }
  
  /**
   * Get compression threshold
   */
  getCompressionThreshold(): number {
    return this.config.compressionThreshold;
  }
  
  /**
   * Get minimum messages to keep
   */
  getMinMessagesToKeep(): number {
    return this.config.minMessagesToKeep;
  }
}

