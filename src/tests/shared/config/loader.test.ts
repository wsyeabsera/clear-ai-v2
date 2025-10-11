/**
 * Configuration loader tests
 */

import {
  loadConfig,
  validateConfig,
  loadAndValidateConfig,
  getConfigValue,
} from '../../../shared/config/loader.js';
import * as llmConfig from '../../../shared/llm/config.js';

// Mock getLLMConfigs to return predictable values
jest.mock('../../../shared/llm/config.js');

describe('Configuration Loader', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Mock getLLMConfigs to return a default config
    jest.spyOn(llmConfig, 'getLLMConfigs').mockReturnValue([
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        api_key: 'test-key',
        temperature: 0.7,
        max_tokens: 1000,
      },
    ]);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  describe('loadConfig', () => {
    it('should load configuration with defaults', () => {
      // Clear PORT to use default
      delete process.env.PORT;
      process.env.NODE_ENV = 'development';
      process.env.WASTEER_API_URL = 'https://test-api.com';
      
      const config = loadConfig();
      
      expect(config.server.name).toBe('clear-ai-v2');
      expect(config.server.port).toBe(3000);
      expect(config.server.env).toBe('development');
      expect(config.tools.api_base_url).toBe('https://test-api.com');
      expect(config.tools.timeout).toBe(30000);
    });
    
    it('should load configuration from environment variables', () => {
      process.env.SERVER_NAME = 'custom-server';
      process.env.PORT = '4000';
      process.env.NODE_ENV = 'production';
      process.env.WASTEER_API_URL = 'https://custom-api.com';
      process.env.TOOL_TIMEOUT = '60000';
      process.env.TOOL_RETRIES = '5';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const config = loadConfig();
      
      expect(config.server.name).toBe('custom-server');
      expect(config.server.port).toBe(4000);
      expect(config.server.env).toBe('production');
      expect(config.tools.api_base_url).toBe('https://custom-api.com');
      expect(config.tools.timeout).toBe(60000);
      expect(config.tools.retries).toBe(5);
    });
    
    it('should load agent configurations', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.PLANNER_TEMPERATURE = '0.2';
      process.env.EXECUTOR_MAX_PARALLEL = '10';
      process.env.ANALYZER_ANOMALY_THRESHOLD = '3.0';
      
      const config = loadConfig();
      
      expect(config.agents.planner.temperature).toBe(0.2);
      expect(config.agents.executor.max_parallel_executions).toBe(10);
      expect(config.agents.analyzer.anomaly_threshold).toBe(3.0);
    });
    
    it('should load memory configuration', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.NEO4J_URI = 'bolt://localhost:7687';
      process.env.NEO4J_USER = 'admin';
      process.env.NEO4J_PASSWORD = 'password123';
      process.env.PINECONE_API_KEY = 'pc-key';
      process.env.PINECONE_ENVIRONMENT = 'us-east-1';
      process.env.PINECONE_INDEX = 'my-index';
      
      const config = loadConfig();
      
      expect(config.memory.neo4j.uri).toBe('bolt://localhost:7687');
      expect(config.memory.neo4j.user).toBe('admin');
      expect(config.memory.neo4j.password).toBe('password123');
      expect(config.memory.pinecone.api_key).toBe('pc-key');
      expect(config.memory.pinecone.environment).toBe('us-east-1');
      expect(config.memory.pinecone.index_name).toBe('my-index');
    });
    
    it('should load feature flags', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.ENABLE_MEMORY = 'false';
      process.env.ENABLE_CONTEXT_LOADING = 'true';
      process.env.MAX_PARALLEL_EXECUTIONS = '8';
      
      const config = loadConfig();
      
      expect(config.features.enable_memory).toBe(false);
      expect(config.features.enable_context_loading).toBe(true);
      expect(config.features.max_parallel_executions).toBe(8);
    });
  });
  
  describe('validateConfig', () => {
    it('should pass validation with valid config', () => {
      process.env.WASTEER_API_URL = 'http://localhost:4000';
      process.env.NEO4J_PASSWORD = 'password';
      process.env.PINECONE_API_KEY = 'key';
      process.env.PINECONE_ENVIRONMENT = 'env';
      
      const config = loadConfig();
      
      expect(() => validateConfig(config)).not.toThrow();
    });
    
    it('should fail validation without API URL', () => {
      const config = loadConfig();
      
      // Manually set API URL to empty to test validation
      config.tools.api_base_url = '';
      
      expect(() => validateConfig(config)).toThrow('WASTEER_API_URL');
    });
    
    it('should fail validation without Neo4j password when memory enabled', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.WASTEER_API_URL = 'http://localhost:4000';
      process.env.ENABLE_MEMORY = 'true';
      process.env.NEO4J_PASSWORD = '';
      
      const config = loadConfig();
      
      expect(() => validateConfig(config)).toThrow('NEO4J_PASSWORD');
    });
    
    it('should fail validation without Pinecone config when memory enabled', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.WASTEER_API_URL = 'http://localhost:4000';
      process.env.ENABLE_MEMORY = 'true';
      process.env.NEO4J_PASSWORD = 'password';
      process.env.PINECONE_API_KEY = '';
      
      const config = loadConfig();
      
      expect(() => validateConfig(config)).toThrow('PINECONE_API_KEY');
    });
    
    it('should not require memory config when memory disabled', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.WASTEER_API_URL = 'http://localhost:4000';
      process.env.ENABLE_MEMORY = 'false';
      process.env.NEO4J_PASSWORD = '';
      process.env.PINECONE_API_KEY = '';
      
      const config = loadConfig();
      
      expect(() => validateConfig(config)).not.toThrow();
    });
  });
  
  describe('loadAndValidateConfig', () => {
    it('should load and validate in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.WASTEER_API_URL = 'http://localhost:4000';
      process.env.ENABLE_MEMORY = 'false';
      
      expect(() => loadAndValidateConfig()).not.toThrow();
    });
    
    it('should skip validation in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.WASTEER_API_URL = '';
      process.env.OPENAI_API_KEY = 'test-key';
      
      // Should not throw even though API URL is missing
      expect(() => loadAndValidateConfig()).not.toThrow();
    });
  });
  
  describe('getConfigValue', () => {
    it('should retrieve nested configuration value', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.WASTEER_API_URL = 'http://localhost:4000';
      
      const config = loadConfig();
      const value = getConfigValue(config, 'tools.api_base_url');
      
      expect(value).toBe('http://localhost:4000');
    });
    
    it('should retrieve deep nested value', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.PLANNER_TEMPERATURE = '0.5';
      
      const config = loadConfig();
      const value = getConfigValue(config, 'agents.planner.temperature');
      
      expect(value).toBe(0.5);
    });
    
    it('should return default value for missing path', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const config = loadConfig();
      const value = getConfigValue(config, 'nonexistent.path', 'default');
      
      expect(value).toBe('default');
    });
    
    it('should throw for missing path without default', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const config = loadConfig();
      
      expect(() => getConfigValue(config, 'nonexistent.path')).toThrow('not found');
    });
  });
  
  describe('LLM configuration', () => {
    it('should throw if no LLM providers configured', () => {
      // Mock getLLMConfigs to return empty array
      jest.spyOn(llmConfig, 'getLLMConfigs').mockReturnValue([]);
      
      expect(() => loadConfig()).toThrow('No LLM providers configured');
    });
    
    it('should configure primary and fallbacks', () => {
      // Mock multiple providers
      jest.spyOn(llmConfig, 'getLLMConfigs').mockReturnValue([
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          api_key: 'openai-key',
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          provider: 'groq',
          model: 'llama-3-70b',
          api_key: 'groq-key',
          temperature: 0.7,
          max_tokens: 1000,
        },
      ]);
      
      const config = loadConfig();
      
      expect(config.llm.primary).toBeDefined();
      expect(config.llm.primary.provider).toBe('openai');
      expect(config.llm.fallbacks.length).toBe(1);
      expect(config.llm.fallbacks[0]?.provider).toBe('groq');
    });
  });
});

