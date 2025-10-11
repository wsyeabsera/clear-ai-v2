/**
 * LLM provider configuration
 */

import { LLMConfig } from '../types/llm.js';
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '../constants/config.js';
import { getLLMEnvConfig } from '../utils/env.js';

export function getLLMConfigs(): LLMConfig[] {
  const envConfig = getLLMEnvConfig();
  const configs: LLMConfig[] = [];
  
  // Primary: OpenAI (gpt-3.5-turbo is faster and cheaper for most tasks)
  if (envConfig.openai.apiKey) {
    configs.push({
      provider: 'openai',
      model: envConfig.openai.model!,
      api_key: envConfig.openai.apiKey,
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS
    });
  }
  
  // Fallback 1: Groq (fast inference)
  if (envConfig.groq.apiKey) {
    configs.push({
      provider: 'groq',
      model: envConfig.groq.model!,
      api_key: envConfig.groq.apiKey,
      base_url: 'https://api.groq.com/openai/v1',
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS
    });
  }
  
  // Fallback 2: Local Ollama (always available as last resort)
  configs.push({
    provider: 'ollama',
    model: envConfig.ollama.model!,
    base_url: envConfig.ollama.baseUrl!,
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS
  });
  
  return configs;
}

