/**
 * LLM provider type definitions
 * Types for OpenAI, Groq, and Ollama integrations
 */

export type LLMProvider = 'openai' | 'groq' | 'ollama';

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
  usage?: TokenUsage;
  metadata: LLMMetadata;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMMetadata {
  latency_ms: number;
  retries: number;
}

export interface LLMProviderAdapter {
  name: LLMProvider;
  isAvailable(): Promise<boolean>;
  generate(request: LLMRequest): Promise<LLMResponse>;
}

