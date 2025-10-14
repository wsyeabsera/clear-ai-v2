/**
 * Configurable Analyzer Agent
 * Replaces the hardcoded analyzer with a flexible, configuration-driven system
 */

import { ToolResult, Analysis, Insight, Entity, Anomaly } from '../shared/types/agent.js';
import { AnalyzerConfig } from '../shared/types/agent-config.js';
import { StrategyContext } from './strategies/base-strategy.js';
import { StrategyRegistry } from './strategies/registry.js';
import { AgentConfigStorageService } from '../graphql/services/agent-config-storage.service.js';
import { LLMProvider } from '../shared/llm/provider.js';

export class ConfigurableAnalyzer {
  private config: AnalyzerConfig | null = null;
  private configId: string | null = null;

  constructor(
    _llm: LLMProvider,
    private configStorage: AgentConfigStorageService,
    private strategyRegistry: StrategyRegistry,
    configOrId?: string | AnalyzerConfig
  ) {
    if (typeof configOrId === 'string') {
      this.configId = configOrId;
    } else if (configOrId) {
      this.config = configOrId;
    }
  }

  async analyze(
    results: ToolResult[],
    requestId?: string,
    overrideConfig?: Partial<AnalyzerConfig>
  ): Promise<Analysis> {
    console.log(`[ConfigurableAnalyzer] Analyzing ${results.length} tool results`);
    const startTime = Date.now();

    // Load configuration
    const config = await this.loadConfiguration(overrideConfig);
    if (!config) {
      throw new Error('No analyzer configuration available');
    }

    // Separate successful and failed results
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    if (successfulResults.length === 0) {
      return {
        summary: 'No successful results to analyze',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: {
          tool_results_count: results.length,
          successful_results: 0,
          failed_results: failedResults.length,
          analysis_time_ms: Date.now() - startTime,
        },
      };
    }

    // Create strategy context
    const context: StrategyContext = {
      requestId: requestId || '',
      config,
      metadata: {
        totalResults: results.length,
        successfulResults: successfulResults.length,
        failedResults: failedResults.length
      }
    };

    // Execute analysis strategies
    const analysisStrategies = config.analysisStrategies || ['rule-based'];
    const strategyResults = await this.strategyRegistry.executeMultipleAnalysisStrategies(
      analysisStrategies,
      successfulResults,
      context
    );

    // Generate summary
    const summary = await this.generateSummary(
      successfulResults,
      strategyResults.insights,
      strategyResults.entities,
      strategyResults.anomalies,
      config
    );

    // Update performance metrics
    if (this.configId) {
      await this.updatePerformanceMetrics(strategyResults.insights, strategyResults.anomalies);
    }

    const result: Analysis = {
      summary,
      insights: strategyResults.insights,
      entities: strategyResults.entities,
      anomalies: strategyResults.anomalies,
      metadata: {
        tool_results_count: results.length,
        successful_results: successfulResults.length,
        failed_results: failedResults.length,
        analysis_time_ms: Date.now() - startTime,
      },
    };

    return result;
  }

  /**
   * Load configuration from storage or use provided config
   */
  private async loadConfiguration(overrideConfig?: Partial<AnalyzerConfig>): Promise<AnalyzerConfig | null> {
    let config: AnalyzerConfig | null = null;

    // Use override config if provided
    if (overrideConfig) {
      config = { ...this.config, ...overrideConfig } as AnalyzerConfig;
    } else if (this.config) {
      // Use instance config
      config = this.config;
    } else if (this.configId) {
      // Load from storage
      const storedConfig = await this.configStorage.getConfig(this.configId);
      if (storedConfig && storedConfig.type === 'analyzer') {
        config = storedConfig.config as AnalyzerConfig;
      }
    } else {
      // Try to get default config
      const defaultConfig = await this.configStorage.getDefaultConfig('analyzer');
      if (defaultConfig) {
        config = defaultConfig.config as AnalyzerConfig;
      }
    }

    return config;
  }

  /**
   * Generate analysis summary
   */
  private async generateSummary(
    results: ToolResult[],
    insights: Insight[],
    entities: Entity[],
    anomalies: Anomaly[],
    _config: AnalyzerConfig
  ): Promise<string> {
    const parts = [
      `Analyzed ${results.length} tool executions`,
      `Found ${insights.length} insights`,
      `Extracted ${entities.length} entities`,
      `Detected ${anomalies.length} anomalies`,
    ];

    // Add critical issues if any
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    if (criticalAnomalies.length > 0) {
      parts.push(`${criticalAnomalies.length} critical issues require immediate attention`);
    }

    return parts.join('. ');
  }

  /**
   * Update performance metrics for the configuration
   */
  private async updatePerformanceMetrics(insights: Insight[], anomalies: Anomaly[]): Promise<void> {
    if (!this.configId) return;

    try {
      // Calculate average confidence
      const avgConfidence = insights.length > 0 
        ? insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length 
        : 0;

      // Calculate quality score based on insights and anomalies
      const qualityScore = this.calculateQualityScore(insights, anomalies);

      await this.configStorage.updatePerformanceMetrics(this.configId, {
        avgConfidence,
        avgQualityScore: qualityScore,
        totalUsage: 1, // This would be incremented in a real implementation
        successRate: 1.0 // This would be calculated based on actual success/failure rates
      });
    } catch (error) {
      console.warn('[ConfigurableAnalyzer] Failed to update performance metrics:', error);
    }
  }

  /**
   * Calculate quality score based on insights and anomalies
   */
  private calculateQualityScore(insights: Insight[], anomalies: Anomaly[]): number {
    let score = 0.5; // Base score

    // Reward for high-confidence insights
    const highConfidenceInsights = insights.filter(i => i.confidence > 0.8).length;
    score += (highConfidenceInsights / Math.max(insights.length, 1)) * 0.3;

    // Reward for actionable insights
    const actionableInsights = insights.filter(i => 
      i.description.includes('recommend') || 
      i.description.includes('should') || 
      i.description.includes('action')
    ).length;
    score += (actionableInsights / Math.max(insights.length, 1)) * 0.2;

    // Penalty for critical anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    score -= criticalAnomalies * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): AnalyzerConfig | null {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<AnalyzerConfig>): Promise<void> {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
    } else {
      throw new Error('No configuration to update');
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: AnalyzerConfig): boolean {
    // Check required fields
    if (!config.llmConfig || !config.llmConfig.temperature || !config.llmConfig.maxTokens) {
      return false;
    }

    // Check temperature range
    if (config.llmConfig.temperature < 0 || config.llmConfig.temperature > 2) {
      return false;
    }

    // Check max tokens
    if (config.llmConfig.maxTokens < 100 || config.llmConfig.maxTokens > 4000) {
      return false;
    }

    // Check confidence threshold
    if (config.minConfidence !== undefined && 
        (config.minConfidence < 0 || config.minConfidence > 1)) {
      return false;
    }

    // Check anomaly threshold
    if (config.anomalyThreshold !== undefined && config.anomalyThreshold < 0) {
      return false;
    }

    // Validate analysis strategies
    if (config.analysisStrategies) {
      for (const strategyName of config.analysisStrategies) {
        if (!this.strategyRegistry.hasAnalysisStrategy(strategyName)) {
          console.warn(`[ConfigurableAnalyzer] Unknown analysis strategy: ${strategyName}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get available analysis strategies
   */
  getAvailableStrategies(): string[] {
    return this.strategyRegistry.listAnalysisStrategies().map(s => s.name);
  }

  /**
   * Get strategy metrics
   */
  getStrategyMetrics(): Record<string, any> {
    return this.strategyRegistry.getAllMetrics();
  }
}
