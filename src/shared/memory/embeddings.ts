/**
 * Embedding service abstraction
 * Supports multiple embedding providers (Ollama, OpenAI)
 */

import axios from 'axios';
import { OpenAI } from 'openai';
import { EmbeddingProvider, EmbeddingConfig } from '../types/memory.js';

/**
 * Generic embedding service interface
 */
export interface EmbeddingService {
  generate(text: string): Promise<number[]>;
  getDimensions(): number;
  getProvider(): EmbeddingProvider;
}

/**
 * Ollama embedding service
 * Uses local Ollama for embeddings (e.g., nomic-embed-text)
 */
export class OllamaEmbeddingService implements EmbeddingService {
  private config: EmbeddingConfig;
  private baseUrl: string;
  
  constructor(config: EmbeddingConfig) {
    this.config = config;
    this.baseUrl = config.base_url || process.env.OLLAMA_URL || 'http://localhost:11434';
  }
  
  async generate(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/embeddings`,
        {
          model: this.config.model,
          prompt: text,
        },
        {
          timeout: 30000,
        }
      );
      
      return response.data.embedding;
    } catch (error: any) {
      throw new Error(
        `Failed to generate Ollama embedding: ${error.message}`
      );
    }
  }
  
  getDimensions(): number {
    return this.config.dimensions;
  }
  
  getProvider(): EmbeddingProvider {
    return 'ollama';
  }
}

/**
 * OpenAI embedding service
 * Uses OpenAI API for embeddings
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private client: OpenAI;
  private config: EmbeddingConfig;
  
  constructor(config: EmbeddingConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.api_key || process.env.OPENAI_API_KEY,
    });
  }
  
  async generate(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: text,
      });
      
      return response.data[0]!.embedding;
    } catch (error: any) {
      throw new Error(
        `Failed to generate OpenAI embedding: ${error.message}`
      );
    }
  }
  
  getDimensions(): number {
    return this.config.dimensions;
  }
  
  getProvider(): EmbeddingProvider {
    return 'openai';
  }
}

/**
 * Create embedding service based on configuration
 */
export function createEmbeddingService(config: EmbeddingConfig): EmbeddingService {
  switch (config.provider) {
    case 'ollama':
      return new OllamaEmbeddingService(config);
    case 'openai':
      return new OpenAIEmbeddingService(config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

/**
 * Load embedding configuration from environment
 */
export function loadEmbeddingConfig(): EmbeddingConfig {
  let provider = (process.env.MEMORY_EMBEDDING_PROVIDER || 'ollama') as EmbeddingProvider;
  
  // Auto-fallback to OpenAI in production if Ollama not specified
  if (provider === 'ollama' && process.env.NODE_ENV === 'production' && !process.env.OLLAMA_URL) {
    console.warn('⚠️  Ollama not configured for production, using OpenAI embeddings');
    provider = 'openai';
  }
  
  if (provider === 'ollama') {
    return {
      provider: 'ollama',
      model: process.env.MEMORY_EMBEDDING_MODEL || 'nomic-embed-text',
      dimensions: parseInt(process.env.MEMORY_EMBEDDING_DIMENSIONS || '768'),
      base_url: process.env.OLLAMA_URL || 'http://localhost:11434',
    };
  } else {
    const config: EmbeddingConfig = {
      provider: 'openai',
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536'),
    };
    
    if (process.env.OPENAI_API_KEY) {
      config.api_key = process.env.OPENAI_API_KEY;
    }
    
    return config;
  }
}

