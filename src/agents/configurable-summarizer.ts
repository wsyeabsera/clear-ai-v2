/**
 * Configurable Summarizer Agent
 * Replaces the hardcoded summarizer with a flexible, configuration-driven system
 */

import { Analysis, FinalResponse } from '../shared/types/agent.js';
import { SummarizerConfig } from '../shared/types/agent-config.js';
import { StrategyContext } from './strategies/base-strategy.js';
import { StrategyRegistry } from './strategies/registry.js';
import { AgentConfigStorageService } from '../graphql/services/agent-config-storage.service.js';
import { LLMProvider } from '../shared/llm/provider.js';

export class ConfigurableSummarizer {
  private config: SummarizerConfig | null = null;
  private configId: string | null = null;

  constructor(
    _llm: LLMProvider,
    private configStorage: AgentConfigStorageService,
    private strategyRegistry: StrategyRegistry,
    configOrId?: string | SummarizerConfig
  ) {
    if (typeof configOrId === 'string') {
      this.configId = configOrId;
    } else if (configOrId) {
      this.config = configOrId;
    }
  }

  async summarize(
    query: string,
    analysis: Analysis,
    toolsUsed: string[],
    requestId?: string,
    overrideConfig?: Partial<SummarizerConfig>
  ): Promise<FinalResponse> {
    console.log('[ConfigurableSummarizer] Generating summary...');

    // Load configuration
    const config = await this.loadConfiguration(overrideConfig);
    if (!config) {
      throw new Error('No summarizer configuration available');
    }

    // Create strategy context
    const context: StrategyContext = {
      requestId: requestId || '',
      query,
      config,
      metadata: {
        toolsUsed,
        insightsCount: analysis.insights.length,
        anomaliesCount: analysis.anomalies.length,
        entitiesCount: analysis.entities.length
      }
    };

    try {
      // Execute summarization strategies
      const summarizationStrategies = config.summarizationStrategies || ['template-based'];
      let summary = '';

      if (summarizationStrategies.length === 1) {
        // Single strategy
        const strategyName = summarizationStrategies[0];
        if (!strategyName) {
          throw new Error('No summarization strategy specified');
        }
        
        const strategy = this.strategyRegistry.getSummarizationStrategy(strategyName);
        if (!strategy) {
          throw new Error(`Summarization strategy not found: ${strategyName}`);
        }

        const result = await this.strategyRegistry.executeSummarizationStrategy(
          strategyName,
          analysis,
          query,
          context
        );

        if (!result.success) {
          throw new Error(result.error || 'Summarization strategy failed');
        }

        summary = result.data || '';
      } else {
        // Multiple strategies - combine results
        const results = await Promise.all(
          summarizationStrategies.map(strategyName => 
            this.strategyRegistry.executeSummarizationStrategy(strategyName, analysis, query, context)
          )
        );

        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length === 0) {
          throw new Error('All summarization strategies failed');
        }

        // Combine summaries (simple concatenation for now)
        summary = successfulResults
          .map(r => r.data!)
          .filter(s => s)
          .join('\n\n---\n\n');
      }

      // Apply length limit if specified
      if (config.maxLength && summary.length > config.maxLength) {
        summary = this.truncateSummary(summary, config.maxLength);
      }

      // Update performance metrics
      if (this.configId) {
        await this.updatePerformanceMetrics(summary, analysis);
      }

      const response: FinalResponse = {
        message: summary,
        tools_used: toolsUsed,
        data: {
          insights: analysis.insights,
          anomalies: analysis.anomalies,
          entities: analysis.entities,
        },
        analysis,
        metadata: {
          request_id: requestId || '',
          total_duration_ms: 0, // This would be calculated in a real implementation
          timestamp: new Date().toISOString(),
        },
      };

      return response;

    } catch (error) {
      console.error('[ConfigurableSummarizer] Summarization failed:', error);
      
      // Fallback to template-based summary
      return this.generateFallbackSummary(query, analysis, toolsUsed, config, requestId);
    }
  }

  /**
   * Load configuration from storage or use provided config
   */
  private async loadConfiguration(overrideConfig?: Partial<SummarizerConfig>): Promise<SummarizerConfig | null> {
    let config: SummarizerConfig | null = null;

    // Use override config if provided
    if (overrideConfig) {
      config = { ...this.config, ...overrideConfig } as SummarizerConfig;
    } else if (this.config) {
      // Use instance config
      config = this.config;
    } else if (this.configId) {
      // Load from storage
      const storedConfig = await this.configStorage.getConfig(this.configId);
      if (storedConfig && storedConfig.type === 'summarizer') {
        config = storedConfig.config as SummarizerConfig;
      }
    } else {
      // Try to get default config
      const defaultConfig = await this.configStorage.getDefaultConfig('summarizer');
      if (defaultConfig) {
        config = defaultConfig.config as SummarizerConfig;
      }
    }

    return config;
  }

  /**
   * Generate fallback summary when strategies fail
   */
  private generateFallbackSummary(
    query: string,
    analysis: Analysis,
    toolsUsed: string[],
    config: SummarizerConfig,
    requestId?: string
  ): FinalResponse {
    const parts: string[] = [];

    // Opening
    const greeting = config.tone === 'casual' ? 'Hey there!' : config.tone === 'technical' ? 'Analysis complete.' : 'Based on your query';
    parts.push(`${greeting} "${query}", here's what I found:\n`);

    // Summary
    parts.push(analysis.summary);

    // Key insights
    if (analysis.insights.length > 0 && config.includeDetails !== false) {
      parts.push('\nKey Findings:');
      analysis.insights.slice(0, 3).forEach((insight, idx) => {
        parts.push(`${idx + 1}. ${insight.description}`);
      });
    }

    // Critical anomalies
    const criticalAnomalies = analysis.anomalies.filter(
      a => a.severity === 'critical' || a.severity === 'high'
    );

    if (criticalAnomalies.length > 0) {
      parts.push('\n⚠️ Important Alerts:');
      criticalAnomalies.forEach((anomaly, idx) => {
        parts.push(`${idx + 1}. ${anomaly.description}`);
      });
    }

    // Recommendations if enabled
    if (config.includeRecommendations !== false) {
      parts.push('\n💡 Recommendations:');
      parts.push('Please review the critical issues and consider implementing additional quality control measures.');
    }

    // Data sources
    parts.push(`\nData gathered from: ${toolsUsed.join(', ')}`);

    return {
      message: parts.join('\n'),
      tools_used: toolsUsed,
      data: {
        insights: analysis.insights,
        anomalies: analysis.anomalies,
        entities: analysis.entities,
      },
      analysis,
      metadata: {
        request_id: requestId || '',
        total_duration_ms: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Truncate summary to fit within max length
   */
  private truncateSummary(summary: string, maxLength: number): string {
    if (summary.length <= maxLength) {
      return summary;
    }

    // Try to truncate at sentence boundaries
    const sentences = summary.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      const testLength = truncated.length + sentence.length + 1;
      if (testLength > maxLength - 10) { // Leave room for "..."
        break;
      }
      truncated += (truncated ? '. ' : '') + sentence;
    }

    if (truncated.length < summary.length) {
      truncated += '...';
    }

    return truncated;
  }

  /**
   * Update performance metrics for the configuration
   */
  private async updatePerformanceMetrics(summary: string, analysis: Analysis): Promise<void> {
    if (!this.configId) return;

    try {
      // Calculate quality score based on summary characteristics
      const qualityScore = this.calculateQualityScore(summary, analysis);

      await this.configStorage.updatePerformanceMetrics(this.configId, {
        avgQualityScore: qualityScore,
        totalUsage: 1, // This would be incremented in a real implementation
        successRate: 1.0 // This would be calculated based on actual success/failure rates
      });
    } catch (error) {
      console.warn('[ConfigurableSummarizer] Failed to update performance metrics:', error);
    }
  }

  /**
   * Calculate quality score based on summary characteristics
   */
  private calculateQualityScore(summary: string, analysis: Analysis): number {
    let score = 0.5; // Base score

    // Reward for appropriate length
    const wordCount = summary.split(/\s+/).length;
    if (wordCount >= 50 && wordCount <= 500) {
      score += 0.1;
    }

    // Reward for including key information
    if (analysis.insights.length > 0 && summary.includes('insight')) {
      score += 0.1;
    }

    if (analysis.anomalies.length > 0 && summary.includes('anomaly')) {
      score += 0.1;
    }

    // Reward for actionable language
    const actionableWords = ['recommend', 'should', 'action', 'implement', 'consider'];
    const hasActionableLanguage = actionableWords.some(word => 
      summary.toLowerCase().includes(word)
    );
    if (hasActionableLanguage) {
      score += 0.1;
    }

    // Reward for structure
    if (summary.includes('\n') || summary.includes('•') || summary.includes('-')) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): SummarizerConfig | null {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<SummarizerConfig>): Promise<void> {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
    } else {
      throw new Error('No configuration to update');
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: SummarizerConfig): boolean {
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

    // Check format
    if (config.format && !['plain', 'markdown', 'json'].includes(config.format)) {
      return false;
    }

    // Check tone
    if (config.tone && !['professional', 'casual', 'technical'].includes(config.tone)) {
      return false;
    }

    // Check max length
    if (config.maxLength !== undefined && config.maxLength < 50) {
      return false;
    }

    // Validate summarization strategies
    if (config.summarizationStrategies) {
      for (const strategyName of config.summarizationStrategies) {
        if (!this.strategyRegistry.hasSummarizationStrategy(strategyName)) {
          console.warn(`[ConfigurableSummarizer] Unknown summarization strategy: ${strategyName}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get available summarization strategies
   */
  getAvailableStrategies(): string[] {
    return this.strategyRegistry.listSummarizationStrategies().map(s => s.name);
  }

  /**
   * Get strategy metrics
   */
  getStrategyMetrics(): Record<string, any> {
    return this.strategyRegistry.getAllMetrics();
  }
}
