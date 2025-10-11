/**
 * Message Handler
 * Operations for managing conversation messages
 */

import { Message, MessageRole, calculateMessageTokens } from './types.js';

/**
 * Filter options for retrieving messages
 */
export interface MessageFilter {
  role?: MessageRole;
  limit?: number;
  since?: string; // ISO timestamp
  until?: string; // ISO timestamp
}

/**
 * Format options for LLM consumption
 */
export interface FormatOptions {
  includeTool?: boolean;
  includeMetadata?: boolean;
  maxTokens?: number;
}

/**
 * Formatted message for LLM
 */
export interface FormattedMessage {
  role: MessageRole;
  content: string;
}

/**
 * Message list wrapper
 */
export class MessageList {
  private messages: Message[];
  
  constructor(messages: Message[] = []) {
    this.messages = messages;
  }
  
  length(): number {
    return this.messages.length;
  }
  
  getTotalTokens(): number {
    return this.messages.reduce((total, msg) => {
      return total + (msg.tokenCount || calculateMessageTokens(msg));
    }, 0);
  }
  
  toArray(): Message[] {
    return [...this.messages];
  }
}

/**
 * Message handler for managing conversation messages
 */
export class MessageHandler {
  private messages: Message[] = [];
  
  /**
   * Add a message to the handler
   */
  addMessage(message: Message): void {
    // Calculate and set token count if not present
    if (!message.tokenCount) {
      message.tokenCount = calculateMessageTokens(message);
    }
    
    this.messages.push(message);
  }
  
  /**
   * Get all messages with optional filtering
   */
  getMessages(filter?: MessageFilter): Message[] {
    let filtered = [...this.messages];
    
    // Filter by role
    if (filter?.role) {
      filtered = filtered.filter(m => m.role === filter.role);
    }
    
    // Filter by time range
    if (filter?.since) {
      const sinceTime = new Date(filter.since).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() >= sinceTime);
    }
    
    if (filter?.until) {
      const untilTime = new Date(filter.until).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() <= untilTime);
    }
    
    // Apply limit (take most recent)
    if (filter?.limit && filter.limit < filtered.length) {
      filtered = filtered.slice(-filter.limit);
    }
    
    return filtered;
  }
  
  /**
   * Get total token count across all messages
   */
  getTotalTokens(): number {
    return this.messages.reduce((total, msg) => {
      return total + (msg.tokenCount || 0);
    }, 0);
  }
  
  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }
  
  /**
   * Remove the oldest N messages
   */
  removeOldest(count: number): void {
    if (count >= this.messages.length) {
      this.messages = [];
    } else {
      this.messages = this.messages.slice(count);
    }
  }
  
  /**
   * Get only system messages
   */
  getSystemMessages(): Message[] {
    return this.messages.filter(m => m.role === 'system');
  }
  
  /**
   * Format messages for LLM consumption
   */
  formatForLLM(options?: FormatOptions): FormattedMessage[] {
    let messages = [...this.messages];
    
    // Exclude tool messages by default
    if (!options?.includeTool) {
      messages = messages.filter(m => m.role !== 'tool');
    }
    
    // Format to simple structure
    const formatted: FormattedMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    
    // Apply token limit if specified
    if (options?.maxTokens) {
      let currentTokens = 0;
      const limited: FormattedMessage[] = [];
      
      // Take messages from most recent until we hit the limit
      for (let i = formatted.length - 1; i >= 0; i--) {
        const msg = formatted[i]!;
        const msgTokens = calculateMessageTokens(messages[i]!);
        
        if (currentTokens + msgTokens <= options.maxTokens) {
          limited.unshift(msg);
          currentTokens += msgTokens;
        } else {
          break;
        }
      }
      
      return limited;
    }
    
    return formatted;
  }
  
  /**
   * Get message count
   */
  count(): number {
    return this.messages.length;
  }
}

