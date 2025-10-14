/**
 * Strategy Registry
 * Central registry for managing analysis and summarization strategies
 */

import { IAnalysisStrategy, ISummarizationStrategy, StrategyContext, StrategyExecutionResult, StrategyMetrics } from './base-strategy.js';
import { ToolResult, Analysis } from '../../shared/types/agent.js';

export class StrategyRegistry {
  private analysisStrategies = new Map<string, IAnalysisStrategy>();
  private summarizationStrategies = new Map<string, ISummarizationStrategy>();
  private metrics = new Map<string, StrategyMetrics>();

  /**
   * Register an analysis strategy
   */
  registerAnalysisStrategy(strategy: IAnalysisStrategy): void {
    this.analysisStrategies.set(strategy.name, strategy);
    this.initializeMetrics(strategy.name);
    console.log(`[StrategyRegistry] Registered analysis strategy: ${strategy.name} v${strategy.version}`);
  }

  /**
   * Register a summarization strategy
   */
  registerSummarizationStrategy(strategy: ISummarizationStrategy): void {
    this.summarizationStrategies.set(strategy.name, strategy);
    this.initializeMetrics(strategy.name);
    console.log(`[StrategyRegistry] Registered summarization strategy: ${strategy.name} v${strategy.version}`);
  }

  /**
   * Get an analysis strategy by name
   */
  getAnalysisStrategy(name: string): IAnalysisStrategy | undefined {
    return this.analysisStrategies.get(name);
  }

  /**
   * Get a summarization strategy by name
   */
  getSummarizationStrategy(name: string): ISummarizationStrategy | undefined {
    return this.summarizationStrategies.get(name);
  }

  /**
   * List all registered analysis strategies
   */
  listAnalysisStrategies(): IAnalysisStrategy[] {
    return Array.from(this.analysisStrategies.values());
  }

  /**
   * List all registered summarization strategies
   */
  listSummarizationStrategies(): ISummarizationStrategy[] {
    return Array.from(this.summarizationStrategies.values());
  }

  /**
   * Execute an analysis strategy
   */
  async executeAnalysisStrategy(
    strategyName: string,
    results: ToolResult[],
    context: StrategyContext
  ): Promise<StrategyExecutionResult<any>> {
    const startTime = Date.now();
    
    try {
      const strategy = this.getAnalysisStrategy(strategyName);
      if (!strategy) {
        throw new Error(`Analysis strategy not found: ${strategyName}`);
      }

      // Validate configuration if strategy supports it
      if (strategy.validateConfig && !strategy.validateConfig(context.config)) {
        throw new Error(`Invalid configuration for strategy: ${strategyName}`);
      }

      const data = await strategy.analyze(results, context);
      const executionTime = Date.now() - startTime;

      this.updateMetrics(strategyName, true, executionTime);

      return {
        success: true,
        data,
        executionTime,
        strategy: strategyName
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(strategyName, false, executionTime);

      return {
        success: false,
        error: error.message,
        executionTime,
        strategy: strategyName
      };
    }
  }

  /**
   * Execute a summarization strategy
   */
  async executeSummarizationStrategy(
    strategyName: string,
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<StrategyExecutionResult<string>> {
    const startTime = Date.now();
    
    try {
      const strategy = this.getSummarizationStrategy(strategyName);
      if (!strategy) {
        throw new Error(`Summarization strategy not found: ${strategyName}`);
      }

      // Validate configuration if strategy supports it
      if (strategy.validateConfig && !strategy.validateConfig(context.config)) {
        throw new Error(`Invalid configuration for strategy: ${strategyName}`);
      }

      const data = await strategy.summarize(analysis, query, context);
      const executionTime = Date.now() - startTime;

      this.updateMetrics(strategyName, true, executionTime);

      return {
        success: true,
        data,
        executionTime,
        strategy: strategyName
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(strategyName, false, executionTime);

      return {
        success: false,
        error: error.message,
        executionTime,
        strategy: strategyName
      };
    }
  }

  /**
   * Execute multiple analysis strategies and combine results
   */
  async executeMultipleAnalysisStrategies(
    strategyNames: string[],
    results: ToolResult[],
    context: StrategyContext
  ): Promise<{
    insights: any[];
    entities: any[];
    anomalies: any[];
    executionResults: StrategyExecutionResult<any>[];
  }> {
    const executionResults: StrategyExecutionResult<any>[] = [];
    const allInsights: any[] = [];
    const allEntities: any[] = [];
    const allAnomalies: any[] = [];

    for (const strategyName of strategyNames) {
      const result = await this.executeAnalysisStrategy(strategyName, results, context);
      executionResults.push(result);

      if (result.success && result.data) {
        // Assuming the strategy returns insights directly
        if (Array.isArray(result.data)) {
          allInsights.push(...result.data);
        }
      }
    }

    // Try to extract entities and anomalies from strategies that support them
    for (const strategyName of strategyNames) {
      const strategy = this.getAnalysisStrategy(strategyName);
      if (strategy) {
        try {
          if (strategy.extractEntities) {
            const entities = await strategy.extractEntities(results, context);
            allEntities.push(...entities);
          }
          if (strategy.detectAnomalies) {
            const anomalies = await strategy.detectAnomalies(results, context);
            allAnomalies.push(...anomalies);
          }
        } catch (error) {
          console.warn(`[StrategyRegistry] Failed to extract entities/anomalies from ${strategyName}:`, error);
        }
      }
    }

    return {
      insights: allInsights,
      entities: allEntities,
      anomalies: allAnomalies,
      executionResults
    };
  }

  /**
   * Get strategy metrics
   */
  getStrategyMetrics(strategyName: string): StrategyMetrics | undefined {
    return this.metrics.get(strategyName);
  }

  /**
   * Get all strategy metrics
   */
  getAllMetrics(): Record<string, StrategyMetrics> {
    const result: Record<string, StrategyMetrics> = {};
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = { ...metrics };
    }
    return result;
  }

  /**
   * Check if a strategy is registered
   */
  hasAnalysisStrategy(name: string): boolean {
    return this.analysisStrategies.has(name);
  }

  hasSummarizationStrategy(name: string): boolean {
    return this.summarizationStrategies.has(name);
  }

  /**
   * Unregister a strategy
   */
  unregisterAnalysisStrategy(name: string): boolean {
    const removed = this.analysisStrategies.delete(name);
    this.metrics.delete(name);
    if (removed) {
      console.log(`[StrategyRegistry] Unregistered analysis strategy: ${name}`);
    }
    return removed;
  }

  unregisterSummarizationStrategy(name: string): boolean {
    const removed = this.summarizationStrategies.delete(name);
    this.metrics.delete(name);
    if (removed) {
      console.log(`[StrategyRegistry] Unregistered summarization strategy: ${name}`);
    }
    return removed;
  }

  /**
   * Clear all strategies
   */
  clear(): void {
    this.analysisStrategies.clear();
    this.summarizationStrategies.clear();
    this.metrics.clear();
    console.log('[StrategyRegistry] Cleared all strategies');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    analysisStrategies: number;
    summarizationStrategies: number;
    totalStrategies: number;
  } {
    return {
      analysisStrategies: this.analysisStrategies.size,
      summarizationStrategies: this.summarizationStrategies.size,
      totalStrategies: this.analysisStrategies.size + this.summarizationStrategies.size
    };
  }

  /**
   * Initialize metrics for a strategy
   */
  private initializeMetrics(strategyName: string): void {
    this.metrics.set(strategyName, {
      totalExecutions: 0,
      successfulExecutions: 0,
      averageExecutionTime: 0,
      errorRate: 0
    });
  }

  /**
   * Update metrics for a strategy
   */
  private updateMetrics(strategyName: string, success: boolean, executionTime: number): void {
    const metrics = this.metrics.get(strategyName);
    if (!metrics) return;

    metrics.totalExecutions++;
    if (success) {
      metrics.successfulExecutions++;
    }

    // Update average execution time
    const totalTime = metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime;
    metrics.averageExecutionTime = totalTime / metrics.totalExecutions;

    // Update error rate
    metrics.errorRate = (metrics.totalExecutions - metrics.successfulExecutions) / metrics.totalExecutions;

    metrics.lastExecuted = new Date();
  }
}
