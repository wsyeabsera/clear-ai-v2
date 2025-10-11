/**
 * Message Prioritizer
 * Assigns importance scores to messages for compression decisions
 */

import { Message, calculateMessageTokens } from '../types.js';

/**
 * Message with importance score
 */
export interface PrioritizedMessage {
  message: Message;
  importance: number; // 0-1, where 1 is highest importance
  index: number; // Original position
}

/**
 * Message Prioritizer
 * Calculates importance scores based on role, recency, metadata, and content
 */
export class MessagePrioritizer {
  /**
   * Calculate importance score for a single message
   */
  calculateImportance(message: Message, index: number = 0, total: number = 1): number {
    let importance = 0.5; // Base importance
    
    // Role-based importance
    switch (message.role) {
      case 'system':
        return 1.0; // System messages always have highest importance
      case 'tool':
        importance = 0.7; // Tool results are important
        break;
      case 'assistant':
        importance = 0.6; // Assistant responses are fairly important
        break;
      case 'user':
        importance = 0.65; // User messages slightly more important than assistant
        break;
    }
    
    // Sticky metadata makes message critical
    if (message.metadata?.sticky) {
      return 1.0;
    }
    
    // Priority metadata
    if (message.metadata?.priority) {
      switch (message.metadata.priority) {
        case 'high':
          importance += 0.2;
          break;
        case 'medium':
          importance += 0.1;
          break;
        case 'low':
          importance -= 0.1;
          break;
      }
    }
    
    // Recency boost (more recent = more important)
    // Linear boost based on position: 0 to 0.15
    const recencyRatio = total > 1 ? index / (total - 1) : 0.5;
    const recencyBoost = recencyRatio * 0.15;
    importance += recencyBoost;
    
    // Length consideration (longer messages slightly more important)
    const lengthBoost = Math.min(message.content.length / 1000, 0.05);
    importance += lengthBoost;
    
    // Explicit importance from metadata
    if (typeof message.metadata?.importance === 'number') {
      // Average with calculated importance
      importance = (importance + message.metadata.importance) / 2;
    }
    
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, importance));
  }
  
  /**
   * Prioritize a list of messages
   * Returns messages sorted by importance (highest first)
   */
  prioritize(messages: Message[]): PrioritizedMessage[] {
    const prioritized: PrioritizedMessage[] = messages.map((message, index) => ({
      message,
      importance: this.calculateImportance(message, index, messages.length),
      index,
    }));
    
    // Sort by importance (descending), then by index (maintain order for equal importance)
    return prioritized.sort((a, b) => {
      if (Math.abs(a.importance - b.importance) < 0.001) {
        return a.index - b.index; // Maintain original order
      }
      return b.importance - a.importance; // Higher importance first
    });
  }
  
  /**
   * Select top N most important messages
   * Returns messages in original chronological order
   */
  selectTopN(messages: Message[], n: number): Message[] {
    if (n >= messages.length) {
      return messages;
    }
    
    const prioritized = this.prioritize(messages);
    const topN = prioritized.slice(0, n);
    
    // Sort back to chronological order
    topN.sort((a, b) => a.index - b.index);
    
    return topN.map(pm => pm.message);
  }
  
  /**
   * Select messages that fit within a token budget
   * Prioritizes most important messages
   */
  selectByTokenBudget(messages: Message[], tokenBudget: number): Message[] {
    const prioritized = this.prioritize(messages);
    
    let currentTokens = 0;
    const selected: PrioritizedMessage[] = [];
    
    for (const pm of prioritized) {
      const messageTokens = pm.message.tokenCount || calculateMessageTokens(pm.message);
      
      if (currentTokens + messageTokens <= tokenBudget) {
        selected.push(pm);
        currentTokens += messageTokens;
      } else if (pm.message.role === 'system' && selected.length === 0) {
        // Always try to include at least system messages even if over budget
        selected.push(pm);
        currentTokens += messageTokens;
        break;
      }
    }
    
    // Sort back to chronological order
    selected.sort((a, b) => a.index - b.index);
    
    return selected.map(pm => pm.message);
  }
  
  /**
   * Filter out messages below importance threshold
   */
  filterByImportance(messages: Message[], threshold: number): Message[] {
    const prioritized = this.prioritize(messages);
    return prioritized
      .filter(pm => pm.importance >= threshold)
      .sort((a, b) => a.index - b.index) // Restore chronological order
      .map(pm => pm.message);
  }
}

