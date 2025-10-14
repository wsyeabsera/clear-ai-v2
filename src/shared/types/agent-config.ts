/**
 * Agent Configuration Types
 * Type definitions for configurable analyzer and summarizer agents
 */

export type AgentType = 'analyzer' | 'summarizer';

export interface LLMConfig {
  temperature: number;
  maxTokens: number;
  model: string;
  provider?: string;
}

export interface BaseAgentConfig {
  llmConfig: LLMConfig;
  enableChainOfThought?: boolean;
  enableSelfCritique?: boolean;
  customPrompts?: Record<string, string>;
}

export interface AnalyzerConfig extends BaseAgentConfig {
  anomalyThreshold?: number;
  minConfidence?: number;
  enableStatisticalAnalysis?: boolean;
  analysisStrategies?: string[];
  promptTemplates?: {
    systemPrompt?: string;
    chainOfThoughtPrompt?: string;
    validationPrompt?: string;
  };
}

export interface SummarizerConfig extends BaseAgentConfig {
  maxLength?: number;
  format?: 'plain' | 'markdown' | 'json';
  tone?: 'professional' | 'casual' | 'technical';
  includeDetails?: boolean;
  includeRecommendations?: boolean;
  outputTemplate?: string;
  summarizationStrategies?: string[];
  promptTemplates?: {
    systemPrompt?: string;
    extractionPrompt?: string;
    prioritizationPrompt?: string;
    compositionPrompt?: string;
  };
}

export type AgentConfigData = AnalyzerConfig | SummarizerConfig;

export interface PerformanceMetrics {
  avgConfidence: number;
  avgQualityScore: number;
  totalUsage: number;
  lastUsed?: Date;
  successRate?: number;
}

export interface AgentConfigMetadata {
  createdBy?: string;
  description?: string;
  tags?: string[];
  performanceMetrics?: PerformanceMetrics;
  version?: string;
  isSystemDefault?: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  version: number;
  type: AgentType;
  isDefault: boolean;
  isActive: boolean;
  config: AgentConfigData;
  metadata: AgentConfigMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentConfigInput {
  name: string;
  type: AgentType;
  config: AgentConfigData;
  metadata?: Partial<AgentConfigMetadata>;
  isDefault?: boolean;
}

export interface UpdateAgentConfigInput {
  name?: string;
  config?: Partial<AgentConfigData>;
  metadata?: Partial<AgentConfigMetadata>;
  isActive?: boolean;
}

export interface AgentConfigFilters {
  type?: AgentType;
  isActive?: boolean;
  isDefault?: boolean;
  createdBy?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface AgentConfigListResult {
  configs: AgentConfig[];
  total: number;
  hasMore: boolean;
}
