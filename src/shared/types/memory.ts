/**
 * Memory system type definitions
 * Types for Episodic (Neo4j) and Semantic (Pinecone) memory
 */

/**
 * Embedding configuration
 */
export type EmbeddingProvider = 'ollama' | 'openai';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  base_url?: string; // For Ollama
  api_key?: string; // For OpenAI
}

/**
 * Episodic Memory (Neo4j)
 */
export interface EpisodicEvent {
  id: string;
  type: EventType;
  timestamp: string;
  data: any;
  relationships?: EventRelationships;
}

export type EventType = 'request' | 'tool_call' | 'insight' | 'error';

export interface EventRelationships {
  caused_by?: string[];
  led_to?: string[];
  relates_to?: string[];
}

export interface EpisodicQuery {
  type?: string;
  date_from?: string;
  date_to?: string;
  entity_ids?: string[];
  relationship_type?: string;
  limit?: number;
}

/**
 * Semantic Memory (Pinecone)
 */
export interface SemanticRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: SemanticMetadata;
}

export interface SemanticMetadata {
  type: 'summary' | 'insight' | 'entity' | 'query';
  timestamp: string;
  source?: string;
  entities?: string[];
  [key: string]: any;
}

export interface SemanticQuery {
  query: string;
  top_k?: number;
  filter?: Record<string, any>;
  namespace?: string;
}

export interface SemanticResult {
  id: string;
  score: number;
  text: string;
  metadata: any;
}

