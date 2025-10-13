/**
 * Pinecone Semantic Memory Implementation
 * Stores vector embeddings for similarity search
 */

import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import { SemanticQuery, SemanticResult } from '../types/memory.js';
import { PineconeConfig } from '../types/common.js';
import { MemoryError } from '../utils/errors.js';
import { EmbeddingService } from './embeddings.js';

export class PineconeMemory {
  private pinecone: Pinecone | null = null;
  private embeddingService: EmbeddingService;
  private index: Index<RecordMetadata> | null = null;
  private config: PineconeConfig;
  
  /**
   * @param config - Pinecone configuration
   * @param embeddingService - Service for generating embeddings
   * @param mockPinecone - Optional mock Pinecone client for testing
   */
  constructor(
    config: PineconeConfig,
    embeddingService: EmbeddingService,
    mockPinecone?: any
  ) {
    this.config = config;
    this.embeddingService = embeddingService;
    if (mockPinecone) {
      this.pinecone = mockPinecone;
      this.index = mockPinecone.index(config.index_name);
    }
  }
  
  /**
   * Initialize Pinecone client
   */
  async connect(): Promise<void> {
    // Skip if mock already injected
    if (this.pinecone && this.index) {
      return;
    }
    
    try {
      // Initialize Pinecone
      this.pinecone = new Pinecone({
        apiKey: this.config.api_key,
      });
      
      // Get index
      this.index = this.pinecone.index(this.config.index_name);
    } catch (error: any) {
      throw new MemoryError(
        'connect',
        `Failed to connect to Pinecone: ${error.message}`,
        { index: this.config.index_name, error: error.message }
      );
    }
  }
  
  /**
   * Close connections (cleanup)
   */
  async close(): Promise<void> {
    this.pinecone = null;
    this.index = null;
  }
  
  /**
   * Store a semantic record with vector embedding
   */
  async store(
    text: string,
    metadata: Record<string, any>,
    id?: string
  ): Promise<string> {
    this.ensureConnected();
    
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(text);
      
      // Generate ID if not provided
      const recordId = id || this.generateId();
      
      // Store in Pinecone
      await this.index!.upsert([
        {
          id: recordId,
          values: embedding,
          metadata: {
            text,
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      ]);
      
      return recordId;
    } catch (error: any) {
      throw new MemoryError(
        'store',
        `Failed to store semantic record: ${error.message}`,
        { text: text.substring(0, 100), error: error.message }
      );
    }
  }
  
  /**
   * Search for similar semantic records
   */
  async search(
    query: SemanticQuery
  ): Promise<SemanticResult[]> {
    this.ensureConnected();
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query.query);
      
      // Build query options
      const queryOptions: any = {
        vector: queryEmbedding,
        topK: Math.floor(query.top_k || 5),
        includeMetadata: true,
      };
      
      // Add filter if provided
      if (query.filter) {
        queryOptions.filter = query.filter;
      }
      
      // Execute query
      const results = await this.index!.query(queryOptions);
      
      // Parse results
      const semanticResults: SemanticResult[] = (results.matches || []).map(match => ({
        id: match.id,
        score: match.score || 0,
        text: match.metadata?.text as string || '',
        metadata: match.metadata || {},
      }));
      
      return semanticResults;
    } catch (error: any) {
      throw new MemoryError(
        'search',
        `Failed to search semantic records: ${error.message}`,
        { query: query.query, error: error.message }
      );
    }
  }
  
  /**
   * Get a semantic record by ID
   */
  async get(id: string): Promise<SemanticResult | null> {
    this.ensureConnected();
    
    try {
      const result = await this.index!.fetch([id]);
      
      if (!result.records || Object.keys(result.records).length === 0) {
        return null;
      }
      
      const record = result.records[id]!;
      if (!record) {
        return null;
      }
      
      return {
        id: record.id,
        score: 1.0, // Full match
        text: record.metadata?.text as string || '',
        metadata: record.metadata || {},
      };
    } catch (error: any) {
      throw new MemoryError(
        'get',
        `Failed to get semantic record: ${error.message}`,
        { id, error: error.message }
      );
    }
  }
  
  /**
   * Delete a semantic record
   */
  async delete(id: string): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.index!.deleteOne(id);
    } catch (error: any) {
      throw new MemoryError(
        'delete',
        `Failed to delete semantic record: ${error.message}`,
        { id, error: error.message }
      );
    }
  }
  
  /**
   * Delete multiple semantic records
   */
  async deleteMany(ids: string[]): Promise<void> {
    this.ensureConnected();
    
    try {
      await this.index!.deleteMany(ids);
    } catch (error: any) {
      throw new MemoryError(
        'deleteMany',
        `Failed to delete semantic records: ${error.message}`,
        { count: ids.length, error: error.message }
      );
    }
  }
  
  /**
   * Generate embedding for text using configured embedding service
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.embeddingService.generate(text);
    } catch (error: any) {
      throw new MemoryError(
        'embedding',
        `Failed to generate embedding: ${error.message}`,
        { text: text.substring(0, 50), error: error.message }
      );
    }
  }
  
  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `sem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.pinecone !== null && this.index !== null;
  }
  
  /**
   * Ensure connection is established
   */
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new MemoryError(
        'connection',
        'Not connected to Pinecone. Call connect() first.',
        {}
      );
    }
  }
  
  /**
   * Get index stats
   */
  async getStats(): Promise<any> {
    this.ensureConnected();
    
    try {
      const stats = await this.index!.describeIndexStats();
      return stats;
    } catch (error: any) {
      throw new MemoryError(
        'getStats',
        `Failed to get index stats: ${error.message}`,
        { error: error.message }
      );
    }
  }
}

