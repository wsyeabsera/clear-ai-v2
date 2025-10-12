import type { TestSuiteResult, TestResult } from './scenario.js';

export interface BaselineMetadata {
  name: string;
  timestamp: Date;
  gitCommit?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  avgDuration: number;
}

export interface TestRunMetadata {
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  avgDuration: number;
}

export type RegressionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface RegressionDetail {
  scenarioId: string;
  scenarioName: string;
  type: 'functionality' | 'performance' | 'cost' | 'quality';
  severity: RegressionSeverity;
  message: string;
  baseline: {
    passed?: boolean;
    latency?: number;
    confidence?: number;
  };
  current: {
    passed?: boolean;
    latency?: number;
    confidence?: number;
  };
  change: {
    latencyIncrease?: number;
    latencyIncreasePercent?: number;
    confidenceDecrease?: number;
    confidenceDecreasePercent?: number;
  };
}

export interface RegressionReport {
  hasRegressions: boolean;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  details: RegressionDetail[];
  comparison: {
    baseline: BaselineMetadata;
    current: TestRunMetadata;
  };
  improvements: string[];
  regressions: string[];
}

export interface BaselineStorage {
  version: string;
  baselines: {
    [name: string]: {
      metadata: BaselineMetadata;
      results: TestSuiteResult;
    };
  };
  latest?: string;
}

