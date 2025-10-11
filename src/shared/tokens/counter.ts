/**
 * Token Counter
 * Accurate token counting using tiktoken for different models
 */

import { encoding_for_model, Tiktoken } from 'tiktoken';

/**
 * Model encoding types
 */
export type ModelEncoding = 
  | 'gpt-3.5-turbo'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'text-embedding-3-small'
  | 'text-embedding-3-large';

/**
 * Message for token counting
 */
export interface CountableMessage {
  role: string;
  content: string;
  name?: string;
}

/**
 * Token count result
 */
export interface TokenCount {
  totalTokens: number;
  messageCount: number;
  perMessage: number[];
}

/**
 * Cost estimate
 */
export interface CostEstimate {
  input: number;  // USD
  output: number; // USD
  total: number;  // USD
}

/**
 * Model pricing (per 1M tokens as of 2024)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
};

/**
 * Model context window limits
 */
const MODEL_LIMITS: Record<string, number> = {
  'gpt-3.5-turbo': 4096,
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
};

/**
 * Token Counter
 * Provides accurate token counting for LLM models
 */
export class TokenCounter {
  private encoders: Map<string, Tiktoken> = new Map();
  private defaultModel: ModelEncoding = 'gpt-3.5-turbo';
  
  /**
   * Count tokens in a text string
   */
  countTokens(text: string, model?: string): number {
    if (!text) {
      return 0;
    }
    
    const modelName = (model || this.defaultModel) as ModelEncoding;
    
    try {
      const encoder = this.getEncoder(modelName);
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback to approximation if encoding fails
      return Math.ceil(text.length / 4);
    }
  }
  
  /**
   * Count tokens in an array of messages
   * Includes message formatting overhead
   */
  countMessages(messages: CountableMessage[], model?: string): TokenCount {
    if (messages.length === 0) {
      return {
        totalTokens: 0,
        messageCount: 0,
        perMessage: [],
      };
    }
    
    const modelName = model || this.defaultModel;
    let totalTokens = 0;
    const perMessage: number[] = [];
    
    // Message formatting overhead (approximately)
    const perMessageOverhead = 4; // Tokens per message for role, separator, etc.
    
    messages.forEach(message => {
      const roleTokens = this.countTokens(message.role, modelName);
      const contentTokens = this.countTokens(message.content, modelName);
      const nameTokens = message.name ? this.countTokens(message.name, modelName) : 0;
      
      const messageTotal = roleTokens + contentTokens + nameTokens + perMessageOverhead;
      perMessage.push(messageTotal);
      totalTokens += messageTotal;
    });
    
    // Add conversation overhead
    totalTokens += 3; // Every reply is primed with assistant
    
    return {
      totalTokens,
      messageCount: messages.length,
      perMessage,
    };
  }
  
  /**
   * Check if text fits in model's context window
   */
  fitsInWindow(text: string, model?: string): boolean {
    const modelName = model || this.defaultModel;
    const tokens = this.countTokens(text, modelName);
    const maxTokens = this.getModelMaxTokens(modelName);
    
    return tokens <= maxTokens;
  }
  
  /**
   * Get maximum tokens for a model
   */
  getModelMaxTokens(model: string): number {
    return MODEL_LIMITS[model] || 4096; // Default fallback
  }
  
  /**
   * Estimate cost for token usage
   */
  estimateCost(inputTokens: number, outputTokens: number, model?: string): CostEstimate {
    const modelName = model || this.defaultModel;
    const pricing = MODEL_PRICING[modelName] || MODEL_PRICING['gpt-3.5-turbo']!;
    
    // Pricing is per 1M tokens, convert to actual cost
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    };
  }
  
  /**
   * Get remaining tokens in context window
   */
  getRemainingTokens(messages: CountableMessage[], model?: string): number {
    const modelName = model || this.defaultModel;
    const used = this.countMessages(messages, modelName).totalTokens;
    const max = this.getModelMaxTokens(modelName);
    
    return Math.max(0, max - used);
  }
  
  /**
   * Get or create encoder for a model
   */
  private getEncoder(model: ModelEncoding): Tiktoken {
    if (!this.encoders.has(model)) {
      const encoder = encoding_for_model(model);
      this.encoders.set(model, encoder);
    }
    
    return this.encoders.get(model)!;
  }
  
  /**
   * Clean up encoders
   */
  dispose(): void {
    this.encoders.forEach(encoder => encoder.free());
    this.encoders.clear();
  }
}

