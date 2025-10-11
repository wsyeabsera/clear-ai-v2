/**
 * Tests for LLM adapters
 * Note: These tests mock the actual API clients
 */

import { OpenAIAdapter } from '../../../shared/llm/adapters/openai.js';
import { GroqAdapter } from '../../../shared/llm/adapters/groq.js';
import { OllamaAdapter } from '../../../shared/llm/adapters/ollama.js';
import { LLMRequest } from '../../../shared/types/llm.js';
import nock from 'nock';

describe('LLM Adapters', () => {
  const mockRequest: LLMRequest = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ]
  };
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  describe('OpenAIAdapter', () => {
    it('should check availability based on API key', async () => {
      const adapter = new OpenAIAdapter({
        provider: 'openai',
        model: 'gpt-4',
        api_key: 'test-key'
      });
      
      expect(await adapter.isAvailable()).toBe(true);
    });
    
    it('should not be available without API key', async () => {
      const adapter = new OpenAIAdapter({
        provider: 'openai',
        model: 'gpt-4',
        api_key: '' // Empty API key
      });
      
      expect(await adapter.isAvailable()).toBe(false);
    });
    
    it('should have correct name', () => {
      const adapter = new OpenAIAdapter({
        provider: 'openai',
        model: 'gpt-4',
        api_key: 'test'
      });
      
      expect(adapter.name).toBe('openai');
    });
  });
  
  describe('GroqAdapter', () => {
    it('should check availability based on API key', async () => {
      const adapter = new GroqAdapter({
        provider: 'groq',
        model: 'mixtral-8x7b-32768',
        api_key: 'test-key'
      });
      
      expect(await adapter.isAvailable()).toBe(true);
    });
    
    it('should not be available without API key', async () => {
      const adapter = new GroqAdapter({
        provider: 'groq',
        model: 'mixtral-8x7b-32768',
        api_key: '' // Empty API key
      });
      
      expect(await adapter.isAvailable()).toBe(false);
    });
    
    it('should have correct name', () => {
      const adapter = new GroqAdapter({
        provider: 'groq',
        model: 'mixtral-8x7b-32768',
        api_key: 'test'
      });
      
      expect(adapter.name).toBe('groq');
    });
  });
  
  describe('OllamaAdapter', () => {
    it('should check availability by calling tags endpoint', async () => {
      nock('http://localhost:11434')
        .get('/api/tags')
        .reply(200, { models: [] });
      
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest',
        base_url: 'http://localhost:11434'
      });
      
      expect(await adapter.isAvailable()).toBe(true);
    });
    
    it('should not be available when server is down', async () => {
      nock('http://localhost:11434')
        .get('/api/tags')
        .replyWithError('Connection refused');
      
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest',
        base_url: 'http://localhost:11434'
      });
      
      expect(await adapter.isAvailable()).toBe(false);
    });
    
    it('should generate response with proper message formatting', async () => {
      nock('http://localhost:11434')
        .post('/api/generate', (body) => {
          // Check that prompt is formatted correctly
          expect(body.prompt).toContain('System:');
          expect(body.prompt).toContain('User:');
          return true;
        })
        .reply(200, {
          response: 'Hello! How can I help you?',
          model: 'mistral:latest'
        });
      
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest',
        base_url: 'http://localhost:11434'
      });
      
      const result = await adapter.generate(mockRequest);
      
      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.provider).toBe('ollama');
      expect(result.model).toBe('mistral:latest');
      expect(result.metadata.latency_ms).toBeGreaterThan(0);
    });
    
    it('should have correct name', () => {
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest'
      });
      
      expect(adapter.name).toBe('ollama');
    });
    
    it('should use default base URL', () => {
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest'
      });
      
      expect((adapter as any).baseUrl).toBe('http://localhost:11434');
    });
    
    it('should use custom base URL', () => {
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest',
        base_url: 'http://custom:8080'
      });
      
      expect((adapter as any).baseUrl).toBe('http://custom:8080');
    });
  });
  
  describe('Configuration', () => {
    it('should use config temperature', async () => {
      nock('http://localhost:11434')
        .post('/api/generate', (body) => {
          expect(body.options.temperature).toBe(0.5);
          return true;
        })
        .reply(200, {
          response: 'Test',
          model: 'mistral:latest'
        });
      
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest',
        base_url: 'http://localhost:11434',
        temperature: 0.5
      });
      
      await adapter.generate({
        messages: [{ role: 'user', content: 'Test' }]
      });
    });
    
    it('should override temperature from request config', async () => {
      nock('http://localhost:11434')
        .post('/api/generate', (body) => {
          expect(body.options.temperature).toBe(0.9);
          return true;
        })
        .reply(200, {
          response: 'Test',
          model: 'mistral:latest'
        });
      
      const adapter = new OllamaAdapter({
        provider: 'ollama',
        model: 'mistral:latest',
        base_url: 'http://localhost:11434',
        temperature: 0.5
      });
      
      await adapter.generate({
        messages: [{ role: 'user', content: 'Test' }],
        config: { temperature: 0.9 }
      });
    });
  });
});

