/**
 * OpenAI Adapter Integration Tests
 * Tests real API calls to OpenAI
 */

import dotenv from 'dotenv';
import { OpenAIAdapter } from '../../../shared/llm/adapters/openai.js';
import { LLMRequest } from '../../../shared/types/llm.js';

// Load environment variables
dotenv.config();

const hasApiKey = !!process.env.OPENAI_API_KEY;

// Conditional describe - skip if no API key
const describeIfApiKey = hasApiKey ? describe : describe.skip;

describeIfApiKey('OpenAI Adapter Integration', () => {
  let adapter: OpenAIAdapter;
  
  beforeAll(() => {
    adapter = new OpenAIAdapter({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      api_key: process.env.OPENAI_API_KEY!
    });
  });
  
  it('should be available when API key is set', async () => {
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  }, 10000);
  
  it('should generate a response for a simple prompt', async () => {
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Hello" and nothing else.' }
      ]
    };
    
    const response = await adapter.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    expect(typeof response.content).toBe('string');
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.provider).toBe('openai');
    expect(response.model).toBeTruthy();
    expect(response.metadata.latency_ms).toBeGreaterThan(0);
  }, 30000);
  
  it('should return usage information', async () => {
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Test"' }
      ]
    };
    
    const response = await adapter.generate(request);
    
    expect(response.usage).toBeDefined();
    expect(response.usage!.prompt_tokens).toBeGreaterThan(0);
    expect(response.usage!.completion_tokens).toBeGreaterThan(0);
    expect(response.usage!.total_tokens).toBeGreaterThan(0);
  }, 30000);
  
  it('should respect temperature configuration', async () => {
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Say "Config test"' }
      ],
      config: {
        temperature: 0.1
      }
    };
    
    const response = await adapter.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  }, 30000);
  
  it('should respect max_tokens configuration', async () => {
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Count from 1 to 100' }
      ],
      config: {
        max_tokens: 10
      }
    };
    
    const response = await adapter.generate(request);
    
    expect(response).toBeDefined();
    expect(response.usage).toBeDefined();
    expect(response.usage!.completion_tokens).toBeLessThanOrEqual(10);
  }, 30000);
  
  it('should handle system messages', async () => {
    const request: LLMRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello"' }
      ]
    };
    
    const response = await adapter.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  }, 30000);
  
  it('should fail with invalid API key', async () => {
    const badAdapter = new OpenAIAdapter({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      api_key: 'invalid-key'
    });
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    };
    
    await expect(badAdapter.generate(request)).rejects.toThrow();
  }, 30000);
});

describe('OpenAI Adapter Without API Key', () => {
  it('should not be available when API key is missing', async () => {
    const adapter = new OpenAIAdapter({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      api_key: ''
    });
    
    const available = await adapter.isAvailable();
    expect(available).toBe(false);
  });
});

