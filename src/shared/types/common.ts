/**
 * Common/generic type definitions
 * Shared types used across the system
 */

import { LLMConfig } from './llm.js';

/**
 * Generic result type for operations
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Pagination
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

/**
 * Date range
 */
export interface DateRange {
  date_from: string;
  date_to: string;
}

/**
 * Key-value metadata
 */
export type Metadata = Record<string, any>;

/**
 * System Configuration
 */
export interface SystemConfig {
  server: ServerConfig;
  tools: ToolsConfig;
  llm: LLMSystemConfig;
  memory: MemorySystemConfig;
  agents: AgentsConfig;
  features: FeaturesConfig;
}

export interface ServerConfig {
  name: string;
  version: string;
  port?: number;
  env: 'development' | 'production' | 'test';
}

export interface ToolsConfig {
  api_base_url: string;
  timeout: number;
  retries: number;
  retry_delay: number;
}

export interface LLMSystemConfig {
  primary: LLMConfig;
  fallbacks: LLMConfig[];
}

export interface MemorySystemConfig {
  neo4j: Neo4jConfig;
  pinecone: PineconeConfig;
}

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
}

export interface PineconeConfig {
  api_key: string;
  environment: string;
  index_name: string;
}

export interface AgentsConfig {
  planner: PlannerConfig;
  executor: ExecutorConfig;
  analyzer: AnalyzerConfig;
  summarizer: SummarizerConfig;
  orchestrator: OrchestratorConfig;
}

export interface PlannerConfig {
  temperature: number;
  max_retries: number;
  validate_tool_availability: boolean;
}

export interface ExecutorConfig {
  max_parallel_executions: number;
  tool_timeout: number;
  max_retries: number;
  retry_delay: number;
  fail_fast: boolean;
}

export interface AnalyzerConfig {
  anomaly_threshold: number;
  min_confidence: number;
  use_llm: boolean;
  enable_statistical_analysis: boolean;
}

export interface SummarizerConfig {
  max_length: number;
  format: 'plain' | 'markdown' | 'json';
  include_details: boolean;
  include_recommendations: boolean;
  tone: 'professional' | 'casual' | 'technical';
}

export interface OrchestratorConfig {
  enable_memory: boolean;
  max_retries: number;
  timeout: number;
  enable_context_loading: boolean;
}

export interface FeaturesConfig {
  enable_memory: boolean;
  enable_context_loading: boolean;
  max_parallel_executions: number;
}

