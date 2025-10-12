/**
 * Metrics Type Definitions
 */

export interface MetricsRecord {
  _id?: string;
  scenarioId: string;
  scenarioName: string;
  category: string;
  timestamp: Date;
  success: boolean;
  
  // Performance metrics
  performance: PerformanceMetrics;
  
  // Cost metrics
  cost: CostMetrics;
  
  // Quality metrics
  quality: QualityMetrics;
  
  // Health metrics
  health: HealthMetrics;
}

export interface PerformanceMetrics {
  totalLatencyMs: number;
  plannerLatencyMs?: number;
  executorLatencyMs?: number;
  analyzerLatencyMs?: number;
  summarizerLatencyMs?: number;
  toolExecutionMs?: Record<string, number>;
  memoryQueryMs?: number;
}

export interface CostMetrics {
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  llmCost: number;
  memoryCost?: number;
  totalCost: number;
}

export interface QualityMetrics {
  toolSelectionAccuracy: number;
  analysisRelevance?: number;
  responseHelpfulness?: number;
  validationConfidence: number;
}

export interface HealthMetrics {
  errorOccurred: boolean;
  errorMessage?: string;
  timeoutOccurred: boolean;
  retryCount: number;
}

export interface MetricsSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalCost: number;
  avgCost: number;
}

