/**
 * Environment variable utilities
 */

import dotenv from 'dotenv';
import { ValidationError } from './errors.js';

// Load .env file
dotenv.config();

/**
 * Get environment variable with validation
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ValidationError(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable
 */
export function getEnvOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ValidationError(`Missing required environment variable: ${key}`);
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`Environment variable ${key} must be a number, got: ${value}`);
  }
  
  return num;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ValidationError(`Missing required environment variable: ${key}`);
  }
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get all LLM-related environment variables
 */
export function getLLMEnvConfig() {
  return {
    openai: {
      apiKey: getEnvOptional('OPENAI_API_KEY'),
      model: getEnvOptional('OPENAI_MODEL', 'gpt-3.5-turbo')
    },
    groq: {
      apiKey: getEnvOptional('GROQ_API_KEY'),
      model: getEnvOptional('GROQ_MODEL', 'llama-3.1-8b-instant')
    },
    ollama: {
      baseUrl: getEnvOptional('OLLAMA_BASE_URL', 'http://localhost:11434'),
      model: getEnvOptional('OLLAMA_MODEL', 'mistral:latest')
    }
  };
}

/**
 * Get memory system configuration from environment
 */
export function getMemoryEnvConfig() {
  return {
    neo4j: {
      uri: getEnvOptional('NEO4J_URI', 'bolt://localhost:7687'),
      username: getEnvOptional('NEO4J_USERNAME', 'neo4j'),
      password: getEnvOptional('NEO4J_PASSWORD', 'password'),
      database: getEnvOptional('NEO4J_DATABASE', 'clear-ai')
    },
    pinecone: {
      apiKey: getEnvOptional('PINECONE_API_KEY'),
      environment: getEnvOptional('PINECONE_ENVIRONMENT', 'us-east-1-aws'),
      indexName: getEnvOptional('PINECONE_INDEX_NAME', 'clear-ai')
    },
    embedding: {
      model: getEnvOptional('MEMORY_EMBEDDING_MODEL', 'nomic-embed-text'),
      dimensions: getEnvNumber('MEMORY_EMBEDDING_DIMENSIONS', 768),
      maxContextMemories: getEnvNumber('MEMORY_MAX_CONTEXT_MEMORIES', 50),
      similarityThreshold: getEnvNumber('MEMORY_SIMILARITY_THRESHOLD', 0.7)
    },
    cleanup: {
      enabled: getEnvBoolean('MEMORY_CLEANUP_ENABLED', true),
      intervalHours: getEnvNumber('MEMORY_CLEANUP_INTERVAL_HOURS', 24),
      maxAgeDays: getEnvNumber('MEMORY_MAX_AGE_DAYS', 90)
    }
  };
}

/**
 * Validate required environment variables
 */
export function validateEnv(required: string[]): void {
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required environment variables: ${missing.join(', ')}`,
      { missing }
    );
  }
}

