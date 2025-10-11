/**
 * Tests for LLM provider with fallback logic
 */

import { LLMProvider } from '../../../shared/llm/provider.js';
import { LLMProviderAdapter, LLMRequest, LLMResponse } from '../../../shared/types/llm.js';

describe('LLMProvider', () => {
  const mockRequest: LLMRequest = {
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  };
  
  const mockResponse: LLMResponse = {
    content: 'Hi there!',
    provider: 'openai',
    model: 'gpt-4',
    metadata: {
      latency_ms: 100,
      retries: 0
    }
  };
  
  it('should use first available provider', async () => {
    const mockAdapter1: LLMProviderAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockResolvedValue(mockResponse)
    };
    
    const mockAdapter2: LLMProviderAdapter = {
      name: 'groq',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockResolvedValue(mockResponse)
    };
    
    const provider = new LLMProvider([
      { provider: 'openai', model: 'gpt-4', api_key: 'test' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', api_key: 'test' }
    ]);
    
    // Replace adapters with mocks
    (provider as any).adapters = [mockAdapter1, mockAdapter2];
    
    const result = await provider.generate(mockRequest);
    
    expect(result).toEqual(mockResponse);
    expect(mockAdapter1.generate).toHaveBeenCalledWith(mockRequest);
    expect(mockAdapter2.generate).not.toHaveBeenCalled();
  });
  
  it('should fallback to next provider on failure', async () => {
    const mockAdapter1: LLMProviderAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockRejectedValue(new Error('API key invalid'))
    };
    
    const mockAdapter2: LLMProviderAdapter = {
      name: 'groq',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockResolvedValue({
        ...mockResponse,
        provider: 'groq'
      })
    };
    
    const provider = new LLMProvider([
      { provider: 'openai', model: 'gpt-4', api_key: 'test' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', api_key: 'test' }
    ]);
    
    (provider as any).adapters = [mockAdapter1, mockAdapter2];
    
    const result = await provider.generate(mockRequest);
    
    expect(result.provider).toBe('groq');
    expect(mockAdapter1.generate).toHaveBeenCalled();
    expect(mockAdapter2.generate).toHaveBeenCalled();
  });
  
  it('should skip unavailable providers', async () => {
    const mockAdapter1: LLMProviderAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(false),
      generate: jest.fn().mockResolvedValue(mockResponse)
    };
    
    const mockAdapter2: LLMProviderAdapter = {
      name: 'groq',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockResolvedValue({
        ...mockResponse,
        provider: 'groq'
      })
    };
    
    const provider = new LLMProvider([
      { provider: 'openai', model: 'gpt-4', api_key: 'test' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', api_key: 'test' }
    ]);
    
    (provider as any).adapters = [mockAdapter1, mockAdapter2];
    
    const result = await provider.generate(mockRequest);
    
    expect(result.provider).toBe('groq');
    expect(mockAdapter1.generate).not.toHaveBeenCalled();
    expect(mockAdapter2.generate).toHaveBeenCalled();
  });
  
  it('should throw error when all providers fail', async () => {
    const mockAdapter1: LLMProviderAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockRejectedValue(new Error('Fail 1'))
    };
    
    const mockAdapter2: LLMProviderAdapter = {
      name: 'groq',
      isAvailable: jest.fn().mockResolvedValue(true),
      generate: jest.fn().mockRejectedValue(new Error('Fail 2'))
    };
    
    const provider = new LLMProvider([
      { provider: 'openai', model: 'gpt-4', api_key: 'test' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', api_key: 'test' }
    ]);
    
    (provider as any).adapters = [mockAdapter1, mockAdapter2];
    
    await expect(provider.generate(mockRequest)).rejects.toThrow('LLM provider error');
  });
  
  it('should throw error when all providers unavailable', async () => {
    const mockAdapter1: LLMProviderAdapter = {
      name: 'openai',
      isAvailable: jest.fn().mockResolvedValue(false),
      generate: jest.fn().mockResolvedValue(mockResponse)
    };
    
    const mockAdapter2: LLMProviderAdapter = {
      name: 'groq',
      isAvailable: jest.fn().mockResolvedValue(false),
      generate: jest.fn().mockResolvedValue(mockResponse)
    };
    
    const provider = new LLMProvider([
      { provider: 'openai', model: 'gpt-4', api_key: 'test' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', api_key: 'test' }
    ]);
    
    (provider as any).adapters = [mockAdapter1, mockAdapter2];
    
    await expect(provider.generate(mockRequest)).rejects.toThrow('LLM provider error');
  });
});

