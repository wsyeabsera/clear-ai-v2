/**
 * Ollama adapter implementation
 * Uses local Ollama server with mistral:latest
 */

import axios from 'axios';
import { LLMProviderAdapter, LLMRequest, LLMResponse, LLMConfig, LLMMessage } from '../../types/llm.js';

export class OllamaAdapter implements LLMProviderAdapter {
  name: 'ollama' = 'ollama';
  private baseUrl: string;
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
    this.baseUrl = config.base_url || process.env.OLLAMA_URL || 'http://localhost:11434';
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // Format messages for Ollama
    const prompt = this.formatMessages(request.messages);
    
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model: this.config.model || 'mistral:latest',
      prompt,
      stream: false,
      options: {
        temperature: request.config?.temperature ?? this.config.temperature ?? 0.7,
        num_predict: request.config?.max_tokens ?? this.config.max_tokens ?? 1000
      }
    });
    
    return {
      content: response.data.response,
      provider: 'ollama',
      model: response.data.model,
      metadata: {
        latency_ms: Date.now() - startTime,
        retries: 0
      }
    };
  }
  
  private formatMessages(messages: LLMMessage[]): string {
    return messages.map(m => {
      const roleLabel = m.role === 'system' ? 'System' : 
                       m.role === 'user' ? 'User' : 'Assistant';
      return `${roleLabel}: ${m.content}`;
    }).join('\n\n');
  }
}

