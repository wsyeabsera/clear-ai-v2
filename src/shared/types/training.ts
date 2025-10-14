/**
 * Training and Feedback Types
 * Type definitions for agent training and feedback collection
 */

export type AgentType = 'analyzer' | 'summarizer';

export interface FeedbackRating {
  overall: number; // 1-5
  accuracy?: number; // 1-5
  relevance?: number; // 1-5
  clarity?: number; // 1-5
  actionability?: number; // 1-5
}

export interface FeedbackIssue {
  type: 'accuracy' | 'relevance' | 'clarity' | 'completeness' | 'actionability' | 'tone';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion?: string;
}

export interface TrainingFeedback {
  id: string;
  requestId: string;
  configId: string;
  agentType: AgentType;
  rating: FeedbackRating;
  issues: FeedbackIssue[];
  suggestions: string[];
  metadata: {
    query?: string;
    responseTime?: number;
    confidence?: number;
    qualityScore?: number;
    userAgent?: string;
    sessionId?: string;
  };
  createdAt: Date;
}

export interface CreateFeedbackInput {
  requestId: string;
  configId: string;
  agentType: AgentType;
  rating: FeedbackRating;
  issues?: FeedbackIssue[];
  suggestions?: string[];
  metadata?: Partial<TrainingFeedback['metadata']>;
}

export interface ConfigUpdate {
  id: string;
  configId: string;
  type: 'threshold_adjustment' | 'prompt_optimization' | 'strategy_change' | 'parameter_tuning';
  description: string;
  changes: Record<string, any>;
  confidence: number; // 0-1
  reasoning: string;
  proposedBy: 'user' | 'trainer' | 'auto_tune';
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt: Date;
  appliedAt?: Date;
}

export interface TrainingOptions {
  minSamples?: number;
  targetMetrics?: {
    minConfidence?: number;
    minQualityScore?: number;
    maxResponseTime?: number;
  };
  strategy?: 'conservative' | 'aggressive' | 'balanced';
  maxIterations?: number;
}

export interface TrainingResult {
  configId: string;
  updates: ConfigUpdate[];
  metrics: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
    improvement: number; // percentage
  };
  status: 'success' | 'partial' | 'failed';
  message: string;
  completedAt: Date;
}

export interface PerformanceMetrics {
  avgConfidence: number;
  avgQualityScore: number;
  totalUsage: number;
  successRate: number;
  avgResponseTime: number;
}

export interface FeedbackFilters {
  configId?: string;
  agentType?: AgentType;
  ratingMin?: number;
  ratingMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface FeedbackListResult {
  feedback: TrainingFeedback[];
  total: number;
  hasMore: boolean;
  summary: {
    avgRating: number;
    totalIssues: number;
    commonIssues: Array<{ type: string; count: number }>;
  };
}
