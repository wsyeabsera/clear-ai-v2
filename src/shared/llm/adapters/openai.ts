/**
 * OpenAI adapter implementation
 */

import OpenAI from 'openai';
import { LLMProviderAdapter, LLMRequest, LLMResponse, LLMConfig } from '../../types/llm.js';

export class OpenAIAdapter implements LLMProviderAdapter {
  name: 'openai' = 'openai';
  private client: OpenAI;
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
    const apiKey = config.api_key || process.env.OPENAI_API_KEY || 'dummy';
    this.client = new OpenAI({
      apiKey
    });
  }
  
  async isAvailable(): Promise<boolean> {
    // If api_key is explicitly set in config (even if empty), use that
    // Only fall back to env if api_key is undefined
    const apiKey = this.config.api_key !== undefined 
      ? this.config.api_key 
      : process.env.OPENAI_API_KEY;
    return !!(apiKey && apiKey.length > 0 && apiKey !== 'dummy');
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    const params: any = {
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: request.messages,
      temperature: request.config?.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.config?.max_tokens ?? this.config.max_tokens ?? 1000
    };
    
    const topP = request.config?.top_p ?? this.config.top_p;
    if (topP !== undefined) {
      params.top_p = topP;
    }
    
    const response = await this.client.chat.completions.create(params);
    
    const result: LLMResponse = {
      content: response.choices[0]?.message?.content || '',
      provider: 'openai',
      model: response.model,
      metadata: {
        latency_ms: Date.now() - startTime,
        retries: 0
      }
    };
    
    if (response.usage) {
      result.usage = {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      };
    }
    
    return result;
  }
}

