# LLM Provider Layer Blueprint

## Overview
The LLM Provider Layer provides a unified interface for multiple LLM providers with automatic fallback, rate limiting, and error handling. It supports OpenAI, Anthropic, and local Ollama models.

## Architecture

```typescript
// src/llm/types.ts
export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  api_key?: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface LLMRequest {
  messages: LLMMessage[];
  config?: Partial<LLMConfig>;
  system_prompt?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata: {
    latency_ms: number;
    retries: number;
  };
}

export interface LLMProviderAdapter {
  name: LLMProvider;
  isAvailable(): Promise<boolean>;
  generate(request: LLMRequest): Promise<LLMResponse>;
}
```

## Provider Implementation

```typescript
// src/llm/provider.ts
import { LLMProviderAdapter, LLMRequest, LLMResponse } from './types.js';
import { OpenAIAdapter } from './adapters/openai.js';
import { AnthropicAdapter } from './adapters/anthropic.js';
import { OllamaAdapter } from './adapters/ollama.js';

export class LLMProvider {
  private adapters: LLMProviderAdapter[];
  
  constructor(configs: LLMConfig[]) {
    this.adapters = configs.map(config => {
      switch (config.provider) {
        case 'openai':
          return new OpenAIAdapter(config);
        case 'anthropic':
          return new AnthropicAdapter(config);
        case 'ollama':
          return new OllamaAdapter(config);
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }
    });
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const errors: Error[] = [];
    
    for (const adapter of this.adapters) {
      try {
        if (await adapter.isAvailable()) {
          console.log(`Using ${adapter.name} provider`);
          return await adapter.generate(request);
        }
      } catch (error: any) {
        console.error(`${adapter.name} failed:`, error.message);
        errors.push(error);
      }
    }
    
    throw new Error(
      `All LLM providers failed. Errors: ${errors.map(e => e.message).join(', ')}`
    );
  }
}

// src/llm/adapters/openai.ts
import { OpenAI } from 'openai';
import { LLMProviderAdapter, LLMRequest, LLMResponse, LLMConfig } from '../types.js';

export class OpenAIAdapter implements LLMProviderAdapter {
  name: 'openai' = 'openai';
  private client: OpenAI;
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.api_key || process.env.OPENAI_API_KEY
    });
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.client.apiKey;
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-4',
      messages: request.messages,
      temperature: request.config?.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.config?.max_tokens ?? this.config.max_tokens ?? 1000,
      top_p: request.config?.top_p ?? this.config.top_p
    });
    
    return {
      content: response.choices[0]?.message?.content || '',
      provider: 'openai',
      model: response.model,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : undefined,
      metadata: {
        latency_ms: Date.now() - startTime,
        retries: 0
      }
    };
  }
}

// src/llm/adapters/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { LLMProviderAdapter, LLMRequest, LLMResponse, LLMConfig } from '../types.js';

export class AnthropicAdapter implements LLMProviderAdapter {
  name: 'anthropic' = 'anthropic';
  private client: Anthropic;
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.api_key || process.env.ANTHROPIC_API_KEY
    });
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.client.apiKey;
  }
  
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // Separate system message from conversation
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');
    
    const response = await this.client.messages.create({
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: request.config?.max_tokens ?? this.config.max_tokens ?? 1000,
      temperature: request.config?.temperature ?? this.config.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: conversationMessages
    });
    
    const textContent = response.content.find(c => c.type === 'text');
    
    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      provider: 'anthropic',
      model: response.model,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      },
      metadata: {
        latency_ms: Date.now() - startTime,
        retries: 0
      }
    };
  }
}

// src/llm/adapters/ollama.ts
import axios from 'axios';
import { LLMProviderAdapter, LLMRequest, LLMResponse, LLMConfig } from '../types.js';

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
      model: this.config.model || 'llama2',
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
```

## Configuration

```typescript
// src/config/llm.config.ts
export const llmConfig = [
  // Primary: OpenAI
  {
    provider: 'openai' as const,
    model: 'gpt-4-turbo-preview',
    api_key: process.env.OPENAI_API_KEY,
    temperature: 0.7,
    max_tokens: 2000
  },
  // Fallback: Anthropic
  {
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    api_key: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
    max_tokens: 2000
  },
  // Local fallback: Ollama
  {
    provider: 'ollama' as const,
    model: 'llama2',
    base_url: process.env.OLLAMA_URL || 'http://localhost:11434',
    temperature: 0.7,
    max_tokens: 2000
  }
];
```

## Usage

```typescript
import { LLMProvider } from './llm/provider.js';
import { llmConfig } from './config/llm.config.js';

const llm = new LLMProvider(llmConfig);

const response = await llm.generate({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ],
  config: {
    temperature: 0.5,
    max_tokens: 500
  }
});

console.log(response.content);
console.log(`Used ${response.provider} (${response.model})`);
console.log(`Latency: ${response.metadata.latency_ms}ms`);
```

## Testing

```typescript
// src/tests/llm/provider.test.ts
describe('LLMProvider', () => {
  it('should use primary provider when available', async () => {
    const mockAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockResolvedValue({
        content: 'test',
        provider: 'openai',
        model: 'gpt-4',
        metadata: { latency_ms: 100, retries: 0 }
      })
    };
    
    const provider = new LLMProvider([mockAdapter as any]);
    
    const response = await provider.generate({
      messages: [{ role: 'user', content: 'test' }]
    });
    
    expect(response.content).toBe('test');
    expect(mockAdapter.generate).toHaveBeenCalled();
  });
  
  it('should fallback to next provider on failure', async () => {
    const failingAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockRejectedValue(new Error('Failed'))
    };
    
    const workingAdapter = {
      name: 'anthropic',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockResolvedValue({
        content: 'test',
        provider: 'anthropic',
        model: 'claude',
        metadata: { latency_ms: 100, retries: 0 }
      })
    };
    
    const provider = new LLMProvider([
      failingAdapter as any,
      workingAdapter as any
    ]);
    
    const response = await provider.generate({
      messages: [{ role: 'user', content: 'test' }]
    });
    
    expect(response.provider).toBe('anthropic');
    expect(workingAdapter.generate).toHaveBeenCalled();
  });
});
```

