/**
 * Test Scenario Type Definitions
 */

import type { ValidationResult } from './validation.js';

export type ScenarioCategory = 'simple' | 'complex' | 'edge-case' | 'performance' | 'memory';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ValidationRuleType = 
  | 'tool_selection' 
  | 'data_structure' 
  | 'semantic' 
  | 'performance' 
  | 'business_rule'
  | 'analysis_quality'
  | 'error_handling';

export interface Scenario {
  id: string;
  name: string;
  category: ScenarioCategory;
  description?: string;
  tags?: string[];
  priority?: Priority;
  
  // Test input
  query: string;
  userId?: string;
  context?: Record<string, any>;
  
  // Expected behavior
  expectedBehavior: ExpectedBehavior;
  
  // Validation rules
  validation: ValidationRule[];
  
  // Test configuration
  timeout?: number;
  retries?: number;
  skipIf?: SkipCondition[];
}

export interface ExpectedBehavior {
  toolsUsed: string[];
  toolSequence?: 'sequential' | 'parallel' | 'any';
  minResults?: number;
  maxResults?: number;
  responseContains?: string[];
  responseNotContains?: string[];
  maxLatencyMs: number;
  maxTokens?: number;
  analysisRequired?: boolean;
  entitiesExpected?: EntityExpectation[];
}

export interface EntityExpectation {
  type: string;
  minCount: number;
}

export interface ValidationRule {
  type: ValidationRuleType;
  [key: string]: any;
}

export interface SkipCondition {
  env?: string;
  feature?: string;
}

export interface TestResult {
  scenario: Scenario;
  success: boolean;
  executionResult?: ExecutionResult;
  validationResult: ValidationResult;
  metrics: TestMetrics;
  error?: string;
  timestamp: Date;
  duration: number;
}

export interface TestSuiteResult {
  scenarios: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
    totalDuration: number;
    avgDuration: number;
  };
  timestamp: Date;
}

export interface ExecutionResult {
  requestId: string;
  message: string;
  toolsUsed: string[];
  data: any;
  analysis?: Analysis;
  metadata: ResponseMetadata;
}

export interface Analysis {
  summary: string;
  insights: Insight[];
  entities: Entity[];
  anomalies: Anomaly[];
  metadata: AnalysisMetadata;
}

export interface Insight {
  type: string;
  description: string;
  confidence: number;
  supportingData: any[];
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
  relationships?: Relationship[];
}

export interface Relationship {
  type: string;
  targetEntityId: string;
  strength?: number;
}

export interface Anomaly {
  type: string;
  description: string;
  severity: string;
  affectedEntities: string[];
  data: any;
}

export interface AnalysisMetadata {
  toolResultsCount: number;
  successfulResults?: number;
  failedResults?: number;
  analysisTimeMs: number;
}

export interface ResponseMetadata {
  requestId: string;
  totalDurationMs: number;
  timestamp: string;
  error?: boolean;
}

export interface TestMetrics {
  totalLatencyMs: number;
  responseSizeBytes?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

