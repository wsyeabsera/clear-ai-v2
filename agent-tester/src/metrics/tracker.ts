/**
 * Metrics Tracker
 * Collects and stores test metrics
 */

import type { TestResult } from '../types/scenario.js';
import type { MetricsRecord } from '../types/metrics.js';
import { MetricsStorage } from './storage.js';

export interface MetricsTrackerConfig {
  mongoUri: string;
  enabled?: boolean;
  autoConnect?: boolean;
}

export class MetricsTracker {
  private storage: MetricsStorage;
  private enabled: boolean;
  private records: MetricsRecord[] = [];

  constructor(config: MetricsTrackerConfig) {
    this.storage = new MetricsStorage(config.mongoUri);
    this.enabled = config.enabled !== false;

    if (config.autoConnect && this.enabled) {
      this.storage.connect().catch(err => {
        console.warn('Failed to auto-connect metrics storage:', err.message);
        this.enabled = false;
      });
    }
  }

  /**
   * Connect to storage
   */
  async connect(): Promise<void> {
    if (this.enabled) {
      await this.storage.connect();
    }
  }

  /**
   * Disconnect from storage
   */
  async disconnect(): Promise<void> {
    if (this.enabled) {
      await this.storage.disconnect();
    }
  }

  /**
   * Track a test result
   */
  async track(result: TestResult): Promise<void> {
    if (!this.enabled) return;

    const record: MetricsRecord = {
      scenarioId: result.scenario.id,
      scenarioName: result.scenario.name,
      category: result.scenario.category,
      timestamp: result.timestamp,
      success: result.success,
      
      performance: {
        totalLatencyMs: result.metrics.totalLatencyMs,
        plannerLatencyMs: undefined,
        executorLatencyMs: undefined,
        analyzerLatencyMs: undefined,
        summarizerLatencyMs: undefined,
        toolExecutionMs: undefined,
        memoryQueryMs: undefined,
      },
      
      cost: {
        tokenUsage: result.metrics.tokenUsage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        llmCost: result.metrics.cost || 0,
        memoryCost: undefined,
        totalCost: result.metrics.cost || 0,
      },
      
      quality: {
        toolSelectionAccuracy: this.calculateToolAccuracy(result),
        analysisRelevance: undefined,
        responseHelpfulness: undefined,
        validationConfidence: result.validationResult.confidence,
      },
      
      health: {
        errorOccurred: !result.success,
        errorMessage: result.error,
        timeoutOccurred: false,
        retryCount: 0,
      },
    };

    this.records.push(record);

    // Store immediately if connected
    try {
      await this.storage.store(record);
    } catch (error) {
      // Silent fail if storage not available
    }
  }

  /**
   * Track multiple test results
   */
  async trackMany(results: TestResult[]): Promise<void> {
    if (!this.enabled) return;

    for (const result of results) {
      await this.track(result);
    }
  }

  /**
   * Flush pending records to storage
   */
  async flush(): Promise<void> {
    if (!this.enabled || this.records.length === 0) return;

    try {
      await this.storage.storeMany(this.records);
      this.records = [];
    } catch (error: any) {
      console.warn('Failed to flush metrics:', error.message);
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary(days?: number): Promise<any> {
    if (!this.enabled) return null;

    const endDate = new Date();
    const startDate = days ? new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000) : undefined;

    return await this.storage.getSummary(startDate, endDate);
  }

  /**
   * Get scenario trend
   */
  async getScenarioTrend(scenarioId: string, days: number = 30): Promise<any[]> {
    if (!this.enabled) return [];

    return await this.storage.getScenarioTrend(scenarioId, days);
  }

  /**
   * Cleanup old metrics
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    if (!this.enabled) return 0;

    return await this.storage.cleanup(daysToKeep);
  }

  /**
   * Calculate tool selection accuracy
   */
  private calculateToolAccuracy(result: TestResult): number {
    if (!result.executionResult) return 0;

    const expected = result.scenario.expectedBehavior.toolsUsed;
    const actual = result.executionResult.toolsUsed;

    if (expected.length === 0) return 1.0;

    const correctTools = expected.filter(tool => actual.includes(tool)).length;
    return correctTools / expected.length;
  }
}

