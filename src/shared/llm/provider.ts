/**
 * Main LLM provider with automatic fallback
 */

import { LLMProviderAdapter, LLMRequest, LLMResponse, LLMConfig } from '../types/llm.js';
import { OpenAIAdapter } from './adapters/openai.js';
import { GroqAdapter } from './adapters/groq.js';
import { OllamaAdapter } from './adapters/ollama.js';
import { LLMProviderError } from '../utils/errors.js';

export class LLMProvider {
  private adapters: LLMProviderAdapter[];
  
  constructor(configs: LLMConfig[]) {
    this.adapters = configs.map(config => this.createAdapter(config));
  }
  
  private createAdapter(config: LLMConfig): LLMProviderAdapter {
    switch (config.provider) {
      case 'openai':
        return new OpenAIAdapter(config);
      case 'groq':
        return new GroqAdapter(config);
      case 'ollama':
        return new OllamaAdapter(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const errors: Error[] = [];
    
    for (const adapter of this.adapters) {
      try {
        const available = await adapter.isAvailable();
        if (!available) {
          console.log(`[LLMProvider] ${adapter.name} is not available, skipping...`);
          continue;
        }
        
        console.log(`[LLMProvider] Using ${adapter.name} provider`);
        return await adapter.generate(request);
      } catch (error: any) {
        console.error(`[LLMProvider] ${adapter.name} failed:`, error.message);
        errors.push(error);
      }
    }
    
    throw new LLMProviderError(
      'all',
      `All LLM providers failed. Errors: ${errors.map(e => e.message).join(', ')}`,
      { errors: errors.map(e => e.message) }
    );
  }
}

