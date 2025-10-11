/**
 * Ollama Adapter Integration Tests
 * Tests real API calls to local Ollama server
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { OllamaAdapter } from '../../../shared/llm/adapters/ollama.js';
import { LLMRequest } from '../../../shared/types/llm.js';

// Load environment variables
dotenv.config();

// Check if Ollama is running
async function isOllamaRunning(): Promise<boolean> {
  try {
    const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

describe('Ollama Adapter Integration', () => {
  let adapter: OllamaAdapter;
  let ollamaAvailable: boolean;
  
  beforeAll(async () => {
    ollamaAvailable = await isOllamaRunning();
    
    if (ollamaAvailable) {
      adapter = new OllamaAdapter({
        provider: 'ollama',
        model: process.env.OLLAMA_MODEL || 'mistral:latest',
        base_url: process.env.OLLAMA_URL || 'http://localhost:11434'
      });
    }
  });
  
  it('should detect if Ollama is running', async () => {
    if (!ollamaAvailable) {
      console.log('⚠️  Ollama not running, skipping Ollama tests');
    }
    expect(typeof ollamaAvailable).toBe('boolean');
  });
  
  it('should be available when Ollama is running', async () => {
    if (!ollamaAvailable) {
      return; // Skip test
    }
    
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  }, 10000);
  
  it('should generate a response for a simple prompt', async () => {
    if (!ollamaAvailable) {
      return; // Skip test
    }
    
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
    expect(response.provider).toBe('ollama');
    expect(response.model).toBeTruthy();
    expect(response.metadata.latency_ms).toBeGreaterThan(0);
  }, 60000);
  
  it('should respect temperature configuration', async () => {
    if (!ollamaAvailable) {
      return; // Skip test
    }
    
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
  }, 60000);
  
  it('should respect max_tokens (num_predict) configuration', async () => {
    if (!ollamaAvailable) {
      return; // Skip test
    }
    
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
    expect(response.content).toBeTruthy();
    // Note: Ollama doesn't return usage info in the same way
  }, 60000);
  
  it('should handle system messages', async () => {
    if (!ollamaAvailable) {
      return; // Skip test
    }
    
    const request: LLMRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello"' }
      ]
    };
    
    const response = await adapter.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  }, 60000);
  
  it('should format multi-turn conversations', async () => {
    if (!ollamaAvailable) {
      return; // Skip test
    }
    
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: 'My name is Bob.' },
        { role: 'assistant', content: 'Nice to meet you, Bob!' },
        { role: 'user', content: 'Say my name.' }
      ]
    };
    
    const response = await adapter.generate(request);
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  }, 60000);
});

describe('Ollama Adapter Without Server', () => {
  it('should not be available when Ollama is not running', async () => {
    const adapter = new OllamaAdapter({
      provider: 'ollama',
      model: 'mistral:latest',
      base_url: 'http://localhost:99999' // Invalid port
    });
    
    const available = await adapter.isAvailable();
    expect(available).toBe(false);
  });
});

