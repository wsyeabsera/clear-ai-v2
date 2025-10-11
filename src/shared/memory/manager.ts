/**
 * Memory Manager
 * Unified interface for both episodic (Neo4j) and semantic (Pinecone) memory
 */

import { Neo4jMemory } from './neo4j.js';
import { PineconeMemory } from './pinecone.js';
import { EpisodicEvent, EpisodicQuery, SemanticQuery, SemanticResult } from '../types/memory.js';
import { MemoryError } from '../utils/errors.js';
import { createEmbeddingService, loadEmbeddingConfig, EmbeddingService } from './embeddings.js';

export interface MemoryManagerConfig {
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };
  pinecone: {
    api_key: string;
    environment: string;
    index_name: string;
  };
  autoConnect?: boolean;
}

export class MemoryManager {
  private neo4j: Neo4jMemory;
  private pinecone: PineconeMemory;
  private connected: boolean = false;
  
  /**
   * @param config - Memory system configuration
   * @param mockNeo4j - Optional mock Neo4j instance for testing
   * @param mockPinecone - Optional mock Pinecone instance for testing
   * @param embeddingService - Optional embedding service (created from config if not provided)
   */
  constructor(
    config: MemoryManagerConfig,
    mockNeo4j?: Neo4jMemory,
    mockPinecone?: PineconeMemory,
    embeddingService?: EmbeddingService
  ) {
    this.neo4j = mockNeo4j || new Neo4jMemory(config.neo4j);
    
    // Create embedding service if not provided
    if (!embeddingService && !mockPinecone) {
      const embeddingConfig = loadEmbeddingConfig();
      embeddingService = createEmbeddingService(embeddingConfig);
    }
    
    this.pinecone = mockPinecone || new PineconeMemory(config.pinecone, embeddingService!);
    
    if (config.autoConnect) {
      this.connect().catch(error => {
        console.error('Failed to auto-connect memory manager:', error);
      });
    }
  }
  
  /**
   * Connect to both memory systems
   */
  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.neo4j.connect(),
        this.pinecone.connect(),
      ]);
      this.connected = true;
    } catch (error: any) {
      throw new MemoryError(
        'connect',
        `Failed to connect memory systems: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Close connections to both memory systems
   */
  async close(): Promise<void> {
    await Promise.all([
      this.neo4j.close(),
      this.pinecone.close(),
    ]);
    this.connected = false;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.neo4j.isConnected() && this.pinecone.isConnected();
  }
  
  // ===== Episodic Memory Methods =====
  
  /**
   * Store an episodic event
   */
  async storeEpisodic(event: EpisodicEvent): Promise<void> {
    return this.neo4j.storeEvent(event);
  }
  
  /**
   * Query episodic events
   */
  async queryEpisodic(query: EpisodicQuery): Promise<EpisodicEvent[]> {
    return this.neo4j.queryEvents(query);
  }
  
  /**
   * Get episodic event by ID
   */
  async getEpisodicEvent(id: string): Promise<EpisodicEvent | null> {
    return this.neo4j.getEvent(id);
  }
  
  /**
   * Delete episodic event
   */
  async deleteEpisodicEvent(id: string): Promise<void> {
    return this.neo4j.deleteEvent(id);
  }
  
  // ===== Semantic Memory Methods =====
  
  /**
   * Store semantic memory with text and metadata
   */
  async storeSemantic(
    text: string,
    metadata: Record<string, any>,
    id?: string
  ): Promise<string> {
    return this.pinecone.store(text, metadata, id);
  }
  
  /**
   * Search semantic memory
   */
  async querySemantic(query: SemanticQuery): Promise<SemanticResult[]> {
    return this.pinecone.search(query);
  }
  
  /**
   * Get semantic record by ID
   */
  async getSemanticRecord(id: string): Promise<SemanticResult | null> {
    return this.pinecone.get(id);
  }
  
  /**
   * Delete semantic record
   */
  async deleteSemanticRecord(id: string): Promise<void> {
    return this.pinecone.delete(id);
  }
  
  // ===== Combined Operations =====
  
  /**
   * Store both episodic event and semantic summary
   * Useful for storing request/response pairs with searchable summaries
   */
  async storeRequestMemory(
    requestId: string,
    query: string,
    toolResults: any[],
    summary: string,
    entities?: string[]
  ): Promise<void> {
    // Store episodic event
    await this.storeEpisodic({
      id: requestId,
      type: 'request',
      timestamp: new Date().toISOString(),
      data: {
        query,
        toolResults,
        summary,
        entities,
      },
    });
    
    // Store semantic summary
    await this.storeSemantic(
      summary,
      {
        type: 'summary',
        requestId,
        query,
        entities,
        toolsUsed: toolResults.map(r => r.tool),
      },
      `sem_${requestId}`
    );
  }
  
  /**
   * Find similar past requests
   */
  async findSimilarRequests(
    query: string,
    topK: number = 5
  ): Promise<SemanticResult[]> {
    return this.querySemantic({
      query,
      top_k: topK,
      filter: { type: 'summary' },
    });
  }
  
  /**
   * Get request context (episodic event + related semantic memories)
   */
  async getRequestContext(requestId: string): Promise<{
    episodic: EpisodicEvent | null;
    semantic: SemanticResult | null;
  }> {
    const [episodic, semantic] = await Promise.all([
      this.getEpisodicEvent(requestId),
      this.getSemanticRecord(`sem_${requestId}`),
    ]);
    
    return { episodic, semantic };
  }
  
  /**
   * Store tool execution result
   */
  async storeToolExecution(
    toolName: string,
    params: any,
    result: any,
    requestId?: string
  ): Promise<string> {
    const eventId = `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await this.storeEpisodic({
      id: eventId,
      type: 'tool_call',
      timestamp: new Date().toISOString(),
      data: {
        tool: toolName,
        params,
        result,
      },
      ...(requestId ? {
        relationships: {
          caused_by: [requestId],
        }
      } : {}),
    });
    
    return eventId;
  }
  
  /**
   * Store insight or analysis result
   */
  async storeInsight(
    insight: string,
    entities: string[],
    confidence: number,
    requestId?: string
  ): Promise<string> {
    const insightId = `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Store episodic
    await this.storeEpisodic({
      id: insightId,
      type: 'insight',
      timestamp: new Date().toISOString(),
      data: {
        insight,
        entities,
        confidence,
      },
      ...(requestId ? {
        relationships: {
          caused_by: [requestId],
        }
      } : {}),
    });
    
    // Store semantic for searching
    await this.storeSemantic(
      insight,
      {
        type: 'insight',
        entities,
        confidence,
        requestId,
      },
      `sem_${insightId}`
    );
    
    return insightId;
  }
  
  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    episodic: { connected: boolean };
    semantic: any;
  }> {
    const [semanticStats] = await Promise.all([
      this.pinecone.getStats().catch(() => null),
    ]);
    
    return {
      episodic: {
        connected: this.neo4j.isConnected(),
      },
      semantic: semanticStats,
    };
  }
}

