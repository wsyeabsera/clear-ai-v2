/**
 * LLM Provider Integration Tests
 * Tests real fallback behavior with multiple providers
 */

import dotenv from 'dotenv';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { LLMRequest, LLMConfig } from '../../../shared/types/llm.js';

// Load environment variables
dotenv.config();

const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasGroq = !!process.env.GROQ_API_KEY;

// Only run if at least one provider is available
const describeIfAnyProvider = (hasOpenAI || hasGroq) ? describe : describe.skip;

describeIfAnyProvider('LLM Provider Integration', () => {
  it('should use the first available provider', async () => {
    const configs: LLMConfig[] = [];
    
    if (hasOpenAI) {
      configs.push({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: process.env.OPENAI_API_KEY!
      });
    }
    
    if (hasGroq) {
      configs.push({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        api_key: process.env.GROQ_API_KEY!
      });
    }
    
    const provider = new LLMProvider(configs);
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Hello"' }
      ]
    };
    
    const response = await provider.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    expect(response.provider).toBeTruthy();
    
    // Should use the first provider
    if (hasOpenAI) {
      expect(response.provider).toBe('openai');
    } else if (hasGroq) {
      expect(response.provider).toBe('groq');
    }
  }, 30000);
  
  it('should fallback to next provider when first fails', async () => {
    const configs: LLMConfig[] = [
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: 'invalid-key-should-fail'
      }
    ];
    
    // Add a valid fallback provider
    if (hasOpenAI) {
      configs.push({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: process.env.OPENAI_API_KEY!
      });
    } else if (hasGroq) {
      configs.push({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        api_key: process.env.GROQ_API_KEY!
      });
    }
    
    const provider = new LLMProvider(configs);
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Fallback test"' }
      ]
    };
    
    const response = await provider.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    // Should have used the second (valid) provider
    expect(response.provider).not.toBe('invalid');
  }, 60000);
  
  it('should skip unavailable providers', async () => {
    const configs: LLMConfig[] = [
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: '' // Empty key, should be skipped
      }
    ];
    
    // Add a valid provider
    if (hasOpenAI) {
      configs.push({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: process.env.OPENAI_API_KEY!
      });
    } else if (hasGroq) {
      configs.push({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        api_key: process.env.GROQ_API_KEY!
      });
    }
    
    const provider = new LLMProvider(configs);
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Skip test"' }
      ]
    };
    
    const response = await provider.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  }, 30000);
  
  it('should throw error when all providers fail', async () => {
    const configs: LLMConfig[] = [
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: 'invalid-key-1'
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        api_key: 'invalid-key-2'
      }
    ];
    
    const provider = new LLMProvider(configs);
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'This should fail' }
      ]
    };
    
    await expect(provider.generate(request)).rejects.toThrow();
  }, 60000);
  
  it('should throw error when all providers unavailable', async () => {
    const configs: LLMConfig[] = [
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: ''
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        api_key: ''
      }
    ];
    
    const provider = new LLMProvider(configs);
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'This should fail' }
      ]
    };
    
    await expect(provider.generate(request)).rejects.toThrow();
  }, 30000);
  
  it('should work with multiple valid providers', async () => {
    const configs: LLMConfig[] = [];
    
    if (hasOpenAI) {
      configs.push({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: process.env.OPENAI_API_KEY!
      });
    }
    
    if (hasGroq) {
      configs.push({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        api_key: process.env.GROQ_API_KEY!
      });
    }
    
    if (configs.length < 2) {
      console.log('⚠️  Skipping multi-provider test - need at least 2 API keys');
      return;
    }
    
    const provider = new LLMProvider(configs);
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Multi-provider test"' }
      ]
    };
    
    const response = await provider.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    expect(response.provider).toBeTruthy();
  }, 30000);
});

