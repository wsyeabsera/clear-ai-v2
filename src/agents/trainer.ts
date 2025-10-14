/**
 * Trainer Agent
 * Collects feedback and learns from user interactions to improve agent configurations
 */

import { AgentConfig, AnalyzerConfig, SummarizerConfig } from '../shared/types/agent-config.js';
import { TrainingFeedback, CreateFeedbackInput, ConfigUpdate, PerformanceMetrics } from '../shared/types/training.js';
import { AgentConfigStorageService } from '../graphql/services/agent-config-storage.service.js';
import { TrainingStorageService } from '../graphql/services/training-storage.service.js';
import { LLMProvider } from '../shared/llm/provider.js';

export class TrainerAgent {
  constructor(
    private configStorage: AgentConfigStorageService,
    private trainingStorage: TrainingStorageService,
    _llm: LLMProvider
  ) {}

  /**
   * Record feedback for a specific request and configuration
   */
  async recordFeedback(input: CreateFeedbackInput): Promise<TrainingFeedback> {
    try {
      const feedback = await this.trainingStorage.recordFeedback(input);
      console.log(`[TrainerAgent] Recorded feedback for request ${input.requestId}`);
      return feedback;
    } catch (error: any) {
      console.error(`[TrainerAgent] Failed to record feedback:`, error);
      throw new Error(`Failed to record feedback: ${error.message}`);
    }
  }

  /**
   * Record feedback for a specific request and configuration (legacy method)
   */
  async recordFeedbackLegacy(
    requestId: string,
    agentType: 'analyzer' | 'summarizer',
    feedback: {
      rating: number; // 1-5
      issues: string[];
      suggestions: string[];
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Find the config used for this request (this would need to be stored during execution)
      const configId = await this.findConfigForRequest(requestId, agentType);
      if (!configId) {
        console.warn(`[TrainerAgent] No config found for request ${requestId} and agent type ${agentType}`);
        return;
      }

      const feedbackInput: CreateFeedbackInput = {
        requestId,
        configId,
        agentType,
        rating: {
          overall: feedback.rating,
          accuracy: feedback.rating, // Default to overall rating
          relevance: feedback.rating,
          clarity: feedback.rating,
          actionability: feedback.rating
        },
        issues: feedback.issues.map(issue => ({
          type: this.categorizeIssue(issue),
          severity: this.assessSeverity(issue),
          description: issue,
          suggestion: this.generateSuggestion(issue)
        })),
        suggestions: feedback.suggestions,
        metadata: {
          ...feedback.metadata,
          timestamp: new Date().toISOString()
        }
      };

      await this.trainingStorage.recordFeedback(feedbackInput);
      console.log(`[TrainerAgent] Recorded feedback for config ${configId}: ${feedback.rating}/5`);
    } catch (error) {
      console.error('[TrainerAgent] Failed to record feedback:', error);
      throw new Error(`Failed to record feedback: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze feedback patterns for a configuration
   */
  async analyzeFeedback(
    configId: string,
    minSamples: number = 10
  ): Promise<ConfigUpdate[]> {
    try {
      const feedback = await this.trainingStorage.getFeedbackForConfig(configId, minSamples);
      
      if (feedback.length < minSamples) {
        console.log(`[TrainerAgent] Insufficient feedback samples for config ${configId}: ${feedback.length}/${minSamples}`);
        return [];
      }

      const updates: ConfigUpdate[] = [];
      const config = await this.configStorage.getConfig(configId);
      
      if (!config) {
        throw new Error(`Configuration not found: ${configId}`);
      }

      // Analyze rating patterns
      const avgRating = feedback.reduce((sum, f) => sum + f.rating.overall, 0) / feedback.length;
      
      if (avgRating < 3.0) {
        updates.push(...await this.generateLowRatingUpdates(config, feedback));
      }

      // Analyze common issues
      const issueAnalysis = this.analyzeCommonIssues(feedback);
      updates.push(...await this.generateIssueBasedUpdates(config, issueAnalysis));

      // Analyze performance trends
      const trendAnalysis = this.analyzePerformanceTrends(feedback);
      updates.push(...await this.generateTrendBasedUpdates(config, trendAnalysis));

      console.log(`[TrainerAgent] Generated ${updates.length} config updates for ${configId}`);
      return updates;
    } catch (error) {
      console.error('[TrainerAgent] Failed to analyze feedback:', error);
      throw new Error(`Failed to analyze feedback: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Propose configuration updates based on analysis
   */
  async proposeConfigUpdate(
    configId: string,
    updates: Partial<AgentConfig>
  ): Promise<AgentConfig> {
    try {
      const currentConfig = await this.configStorage.getConfig(configId);
      if (!currentConfig) {
        throw new Error(`Configuration not found: ${configId}`);
      }

      const updatedConfig = {
        ...currentConfig,
        ...updates,
        updatedAt: new Date()
      };

      // Validate the updated configuration
      if (!this.validateConfigUpdate(updatedConfig)) {
        throw new Error('Invalid configuration update');
      }

      console.log(`[TrainerAgent] Proposed config update for ${configId}`);
      return updatedConfig;
    } catch (error) {
      console.error('[TrainerAgent] Failed to propose config update:', error);
      throw new Error(`Failed to propose config update: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Auto-tune configuration based on target metrics
   */
  async autoTune(
    configId: string,
    targetMetrics: {
      minConfidence?: number;
      minQualityScore?: number;
      maxResponseTime?: number;
    }
  ): Promise<AgentConfig> {
    try {
      const config = await this.configStorage.getConfig(configId);
      if (!config) {
        throw new Error(`Configuration not found: ${configId}`);
      }

      const feedback = await this.trainingStorage.getFeedbackForConfig(configId, 5);
      if (feedback.length < 5) {
        throw new Error('Insufficient feedback for auto-tuning');
      }

      const currentMetrics = await this.calculateCurrentMetrics(configId, feedback);
      const updates: Partial<AgentConfig> = {};

      // Tune based on confidence
      if (targetMetrics.minConfidence && currentMetrics.avgConfidence < targetMetrics.minConfidence) {
        if (config.type === 'analyzer') {
          const analyzerConfig = config.config as AnalyzerConfig;
          updates.config = {
            ...analyzerConfig,
            minConfidence: Math.max(0.5, targetMetrics.minConfidence - 0.1)
          };
        }
      }

      // Tune based on quality score
      if (targetMetrics.minQualityScore && currentMetrics.avgQualityScore < targetMetrics.minQualityScore) {
        if (config.type === 'summarizer') {
          const summarizerConfig = config.config as SummarizerConfig;
          updates.config = {
            ...summarizerConfig,
            includeDetails: true,
            includeRecommendations: true
          };
        }
      }

      // Tune LLM parameters
      if (currentMetrics.avgResponseTime > (targetMetrics.maxResponseTime || 5000)) {
        const llmConfig = config.config.llmConfig;
        updates.config = {
          ...config.config,
          llmConfig: {
            ...llmConfig,
            maxTokens: Math.min(llmConfig.maxTokens, 1000),
            temperature: Math.max(0.1, llmConfig.temperature - 0.1)
          }
        };
      }

      if (Object.keys(updates).length === 0) {
        console.log(`[TrainerAgent] No tuning needed for config ${configId}`);
        return config;
      }

      const tunedConfig = await this.proposeConfigUpdate(configId, updates);
      console.log(`[TrainerAgent] Auto-tuned config ${configId}`);
      return tunedConfig;
    } catch (error) {
      console.error('[TrainerAgent] Failed to auto-tune config:', error);
      throw new Error(`Failed to auto-tune configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get training statistics for a configuration
   */
  async getTrainingStats(configId: string): Promise<{
    totalFeedback: number;
    avgRating: number;
    recentTrend: 'improving' | 'declining' | 'stable';
    commonIssues: Array<{ type: string; count: number; percentage: number }>;
    recommendations: string[];
  }> {
    try {
      const stats = await this.trainingStorage.getConfigFeedbackStats(configId);
      const recommendations = await this.generateRecommendations(configId, stats);
      
      return {
        totalFeedback: stats.totalFeedback,
        avgRating: stats.avgRating,
        recentTrend: stats.recentTrend,
        commonIssues: stats.commonIssues,
        recommendations
      };
    } catch (error) {
      console.error('[TrainerAgent] Failed to get training stats:', error);
      throw new Error(`Failed to get training statistics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find configuration used for a specific request
   */
  private async findConfigForRequest(_requestId: string, agentType: 'analyzer' | 'summarizer'): Promise<string | null> {
    // In a real implementation, this would query a request tracking system
    // For now, we'll try to find the default config for the agent type
    try {
      const defaultConfig = await this.configStorage.getDefaultConfig(agentType);
      return defaultConfig?.id || null;
    } catch (error) {
      console.warn('[TrainerAgent] Failed to find config for request:', error);
      return null;
    }
  }

  /**
   * Categorize feedback issues
   */
  private categorizeIssue(issue: string): 'accuracy' | 'relevance' | 'clarity' | 'completeness' | 'actionability' | 'tone' {
    const lowerIssue = issue.toLowerCase();
    
    if (lowerIssue.includes('wrong') || lowerIssue.includes('incorrect') || lowerIssue.includes('inaccurate')) {
      return 'accuracy';
    }
    if (lowerIssue.includes('irrelevant') || lowerIssue.includes('unrelated') || lowerIssue.includes('off-topic')) {
      return 'relevance';
    }
    if (lowerIssue.includes('unclear') || lowerIssue.includes('confusing') || lowerIssue.includes('hard to understand')) {
      return 'clarity';
    }
    if (lowerIssue.includes('incomplete') || lowerIssue.includes('missing') || lowerIssue.includes('partial')) {
      return 'completeness';
    }
    if (lowerIssue.includes('actionable') || lowerIssue.includes('recommendation') || lowerIssue.includes('next step')) {
      return 'actionability';
    }
    if (lowerIssue.includes('tone') || lowerIssue.includes('style') || lowerIssue.includes('formal') || lowerIssue.includes('casual')) {
      return 'tone';
    }
    
    return 'accuracy'; // Default category
  }

  /**
   * Assess issue severity
   */
  private assessSeverity(issue: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerIssue = issue.toLowerCase();
    
    if (lowerIssue.includes('critical') || lowerIssue.includes('urgent') || lowerIssue.includes('severe')) {
      return 'critical';
    }
    if (lowerIssue.includes('major') || lowerIssue.includes('significant') || lowerIssue.includes('important')) {
      return 'high';
    }
    if (lowerIssue.includes('minor') || lowerIssue.includes('small') || lowerIssue.includes('slight')) {
      return 'low';
    }
    
    return 'medium'; // Default severity
  }

  /**
   * Generate suggestion for an issue
   */
  private generateSuggestion(issue: string): string {
    const lowerIssue = issue.toLowerCase();
    
    if (lowerIssue.includes('confidence')) {
      return 'Consider adjusting the confidence threshold or improving data quality validation';
    }
    if (lowerIssue.includes('prompt')) {
      return 'Review and refine the prompt templates for better clarity';
    }
    if (lowerIssue.includes('length')) {
      return 'Adjust the maximum length setting or improve content prioritization';
    }
    if (lowerIssue.includes('tone')) {
      return 'Review the tone configuration to better match user expectations';
    }
    
    return 'Consider reviewing the configuration parameters and strategy selection';
  }

  /**
   * Generate updates for low rating feedback
   */
  private async generateLowRatingUpdates(config: AgentConfig, feedback: TrainingFeedback[]): Promise<ConfigUpdate[]> {
    const updates: ConfigUpdate[] = [];
    const avgRating = feedback.reduce((sum, f) => sum + f.rating.overall, 0) / feedback.length;

    if (avgRating < 2.0) {
      updates.push({
        id: `update_${Date.now()}_1`,
        configId: config.id,
        type: 'parameter_tuning',
        description: 'Adjust confidence thresholds due to low ratings',
        changes: {
          minConfidence: 0.5 // Lower threshold to be more inclusive
        },
        confidence: 0.8,
        reasoning: `Average rating is ${avgRating.toFixed(1)}/5, suggesting overly strict filtering`,
        proposedBy: 'trainer',
        status: 'pending',
        createdAt: new Date()
      });
    }

    return updates;
  }

  /**
   * Analyze common issues in feedback
   */
  private analyzeCommonIssues(feedback: TrainingFeedback[]): Record<string, number> {
    const issueCounts: Record<string, number> = {};
    
    feedback.forEach(f => {
      f.issues.forEach(issue => {
        issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
      });
    });

    return issueCounts;
  }

  /**
   * Generate updates based on common issues
   */
  private async generateIssueBasedUpdates(config: AgentConfig, issueAnalysis: Record<string, number>): Promise<ConfigUpdate[]> {
    const updates: ConfigUpdate[] = [];
    const totalIssues = Object.values(issueAnalysis).reduce((sum, count) => sum + count, 0);

    Object.entries(issueAnalysis).forEach(([issueType, count]) => {
      const percentage = (count / totalIssues) * 100;
      
      if (percentage > 30) { // If more than 30% of issues are of this type
        updates.push({
          id: `update_${Date.now()}_${issueType}`,
          configId: config.id,
          type: 'parameter_tuning',
          description: `Address ${issueType} issues (${percentage.toFixed(1)}% of feedback)`,
          changes: this.getChangesForIssueType(issueType, config),
          confidence: Math.min(0.9, percentage / 100),
          reasoning: `${percentage.toFixed(1)}% of feedback mentions ${issueType} issues`,
          proposedBy: 'trainer',
          status: 'pending',
          createdAt: new Date()
        });
      }
    });

    return updates;
  }

  /**
   * Get configuration changes for a specific issue type
   */
  private getChangesForIssueType(issueType: string, config: AgentConfig): Record<string, any> {
    const changes: Record<string, any> = {};

    switch (issueType) {
      case 'clarity':
        if (config.type === 'summarizer') {
          const summarizerConfig = config.config as SummarizerConfig;
          changes.config = {
            ...summarizerConfig,
            tone: 'professional',
            includeDetails: true
          };
        }
        break;
      case 'actionability':
        if (config.type === 'summarizer') {
          const summarizerConfig = config.config as SummarizerConfig;
          changes.config = {
            ...summarizerConfig,
            includeRecommendations: true
          };
        }
        break;
      case 'accuracy':
        if (config.type === 'analyzer') {
          const analyzerConfig = config.config as AnalyzerConfig;
          changes.config = {
            ...analyzerConfig,
            minConfidence: Math.max(0.6, analyzerConfig.minConfidence || 0.7)
          };
        }
        break;
    }

    return changes;
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(feedback: TrainingFeedback[]): {
    trend: 'improving' | 'declining' | 'stable';
    avgRating: number;
  } {
    if (feedback.length < 4) {
      return { trend: 'stable', avgRating: 0 };
    }

    // Compare recent vs older feedback
    const recentCount = Math.max(2, Math.floor(feedback.length / 2));
    const recentFeedback = feedback.slice(0, recentCount);
    const olderFeedback = feedback.slice(recentCount);

    const recentAvg = recentFeedback.reduce((sum, f) => sum + f.rating.overall, 0) / recentFeedback.length;
    const olderAvg = olderFeedback.reduce((sum, f) => sum + f.rating.overall, 0) / olderFeedback.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.5) trend = 'improving';
    else if (recentAvg < olderAvg - 0.5) trend = 'declining';

    return { trend, avgRating: recentAvg };
  }

  /**
   * Generate updates based on performance trends
   */
  private async generateTrendBasedUpdates(config: AgentConfig, trendAnalysis: any): Promise<ConfigUpdate[]> {
    const updates: ConfigUpdate[] = [];

    if (trendAnalysis.trend === 'declining' && trendAnalysis.avgRating < 3.0) {
      updates.push({
        id: `update_${Date.now()}_trend`,
        configId: config.id,
        type: 'strategy_change',
        description: 'Performance declining, consider strategy adjustment',
        changes: {
          // Suggest trying different strategies
          analysisStrategies: ['rule-based', 'llm-based'],
          summarizationStrategies: ['template-based', 'llm-based']
        },
        confidence: 0.7,
        reasoning: `Performance trend is declining with average rating of ${trendAnalysis.avgRating.toFixed(1)}/5`,
        proposedBy: 'trainer',
        status: 'pending',
        createdAt: new Date()
      });
    }

    return updates;
  }

  /**
   * Calculate current performance metrics
   */
  private async calculateCurrentMetrics(_configId: string, feedback: TrainingFeedback[]): Promise<PerformanceMetrics> {
    const avgRating = feedback.reduce((sum, f) => sum + f.rating.overall, 0) / feedback.length;
    const avgResponseTime = feedback.reduce((sum, f) => sum + (f.metadata.responseTime || 0), 0) / feedback.length;
    
    return {
      avgConfidence: 0.7, // This would be calculated from actual analysis results
      avgQualityScore: avgRating / 5, // Convert 1-5 rating to 0-1 scale
      totalUsage: feedback.length,
      successRate: 0.9, // This would be calculated from actual success/failure rates
      avgResponseTime
    };
  }

  /**
   * Generate recommendations based on training stats
   */
  private async generateRecommendations(_configId: string, stats: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (stats.avgRating < 3.0) {
      recommendations.push('Consider adjusting configuration parameters to improve output quality');
    }

    if (stats.commonIssues.length > 0) {
      const topIssue = stats.commonIssues[0];
      recommendations.push(`Focus on addressing ${topIssue.type} issues (${topIssue.percentage.toFixed(1)}% of feedback)`);
    }

    if (stats.recentTrend === 'declining') {
      recommendations.push('Performance is declining - consider reverting recent changes or trying different strategies');
    }

    if (stats.totalFeedback < 10) {
      recommendations.push('Collect more feedback before making significant configuration changes');
    }

    return recommendations;
  }

  /**
   * Validate configuration update
   */
  private validateConfigUpdate(config: AgentConfig): boolean {
    // Basic validation - in a real implementation, this would be more comprehensive
    return !!(config.id && config.name && config.type && config.config);
  }
}
