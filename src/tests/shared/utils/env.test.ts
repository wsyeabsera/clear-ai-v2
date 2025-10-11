/**
 * Tests for environment utilities
 */

import {
  getEnv,
  getEnvOptional,
  getEnvNumber,
  getEnvBoolean,
  isDevelopment,
  isProduction,
  isTest,
  getLLMEnvConfig,
  getMemoryEnvConfig,
  validateEnv
} from '../../../shared/utils/env.js';
import { ValidationError } from '../../../shared/utils/errors.js';

describe('Environment Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnv', () => {
    it('should get environment variable', () => {
      process.env.TEST_VAR = 'test_value';
      expect(getEnv('TEST_VAR')).toBe('test_value');
    });

    it('should use default value when not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnv('TEST_VAR', 'default')).toBe('default');
    });

    it('should throw when required var is missing', () => {
      delete process.env.TEST_VAR;
      expect(() => getEnv('TEST_VAR')).toThrow(ValidationError);
      expect(() => getEnv('TEST_VAR')).toThrow('Missing required environment variable');
    });
  });

  describe('getEnvOptional', () => {
    it('should get optional environment variable', () => {
      process.env.TEST_VAR = 'test_value';
      expect(getEnvOptional('TEST_VAR')).toBe('test_value');
    });

    it('should return undefined when not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnvOptional('TEST_VAR')).toBeUndefined();
    });

    it('should return default value when not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnvOptional('TEST_VAR', 'default')).toBe('default');
    });
  });

  describe('getEnvNumber', () => {
    it('should parse number from env', () => {
      process.env.TEST_NUM = '42';
      expect(getEnvNumber('TEST_NUM')).toBe(42);
    });

    it('should parse float from env', () => {
      process.env.TEST_NUM = '3.14';
      expect(getEnvNumber('TEST_NUM')).toBe(3.14);
    });

    it('should use default when not set', () => {
      delete process.env.TEST_NUM;
      expect(getEnvNumber('TEST_NUM', 100)).toBe(100);
    });

    it('should throw on invalid number', () => {
      process.env.TEST_NUM = 'not_a_number';
      expect(() => getEnvNumber('TEST_NUM')).toThrow(ValidationError);
      expect(() => getEnvNumber('TEST_NUM')).toThrow('must be a number');
    });

    it('should throw when required number is missing', () => {
      delete process.env.TEST_NUM;
      expect(() => getEnvNumber('TEST_NUM')).toThrow(ValidationError);
    });
  });

  describe('getEnvBoolean', () => {
    it('should parse "true" as boolean', () => {
      process.env.TEST_BOOL = 'true';
      expect(getEnvBoolean('TEST_BOOL')).toBe(true);
    });

    it('should parse "TRUE" as boolean', () => {
      process.env.TEST_BOOL = 'TRUE';
      expect(getEnvBoolean('TEST_BOOL')).toBe(true);
    });

    it('should parse "1" as true', () => {
      process.env.TEST_BOOL = '1';
      expect(getEnvBoolean('TEST_BOOL')).toBe(true);
    });

    it('should parse "false" as boolean', () => {
      process.env.TEST_BOOL = 'false';
      expect(getEnvBoolean('TEST_BOOL')).toBe(false);
    });

    it('should parse "0" as false', () => {
      process.env.TEST_BOOL = '0';
      expect(getEnvBoolean('TEST_BOOL')).toBe(false);
    });

    it('should use default when not set', () => {
      delete process.env.TEST_BOOL;
      expect(getEnvBoolean('TEST_BOOL', true)).toBe(true);
    });

    it('should throw when required boolean is missing', () => {
      delete process.env.TEST_BOOL;
      expect(() => getEnvBoolean('TEST_BOOL')).toThrow(ValidationError);
    });
  });

  describe('environment checks', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });

  describe('getLLMEnvConfig', () => {
    it('should get LLM configuration from environment', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.GROQ_API_KEY = 'gsk-test';
      
      const config = getLLMEnvConfig();
      
      expect(config.openai.apiKey).toBe('sk-test');
      expect(config.openai.model).toBe('gpt-4');
      expect(config.groq.apiKey).toBe('gsk-test');
      expect(config.ollama.baseUrl).toBe('http://localhost:11434');
    });

    it('should use defaults for missing values', () => {
      delete process.env.OPENAI_MODEL;
      
      const config = getLLMEnvConfig();
      
      expect(config.openai.model).toBe('gpt-3.5-turbo');
      expect(config.ollama.model).toBe('mistral:latest');
    });
  });

  describe('getMemoryEnvConfig', () => {
    it('should get memory configuration from environment', () => {
      process.env.NEO4J_URI = 'bolt://test:7687';
      process.env.PINECONE_API_KEY = 'test-key';
      process.env.MEMORY_EMBEDDING_DIMENSIONS = '1536';
      
      const config = getMemoryEnvConfig();
      
      expect(config.neo4j.uri).toBe('bolt://test:7687');
      expect(config.pinecone.apiKey).toBe('test-key');
      expect(config.embedding.dimensions).toBe(1536);
    });

    it('should use defaults for missing values', () => {
      const config = getMemoryEnvConfig();
      
      expect(config.neo4j.username).toBe('neo4j');
      expect(config.embedding.dimensions).toBe(768);
      expect(config.cleanup.enabled).toBe(true);
    });
  });

  describe('validateEnv', () => {
    it('should pass when all required vars are present', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      
      expect(() => validateEnv(['VAR1', 'VAR2'])).not.toThrow();
    });

    it('should throw when required vars are missing', () => {
      delete process.env.VAR1;
      process.env.VAR2 = 'value2';
      
      expect(() => validateEnv(['VAR1', 'VAR2', 'VAR3'])).toThrow(ValidationError);
      expect(() => validateEnv(['VAR1', 'VAR2', 'VAR3'])).toThrow('VAR1');
      expect(() => validateEnv(['VAR1', 'VAR2', 'VAR3'])).toThrow('VAR3');
    });
  });
});

