/**
 * Base Strategy Interfaces
 * Abstract base classes and interfaces for analysis and summarization strategies
 */

import { ToolResult, Analysis, Insight, Entity, Anomaly } from '../../shared/types/agent.js';
import { AgentConfigData } from '../../shared/types/agent-config.js';

/**
 * Context passed to strategies during execution
 */
export interface StrategyContext {
  requestId?: string;
  query?: string;
  config: AgentConfigData;
  metadata?: Record<string, any>;
}

/**
 * Base interface for analysis strategies
 */
export interface IAnalysisStrategy {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  /**
   * Analyze tool results and generate insights
   */
  analyze(
    results: ToolResult[], 
    context: StrategyContext
  ): Promise<Insight[]>;
  
  /**
   * Extract entities from tool results
   */
  extractEntities?(
    results: ToolResult[], 
    context: StrategyContext
  ): Promise<Entity[]>;
  
  /**
   * Detect anomalies in tool results
   */
  detectAnomalies?(
    results: ToolResult[], 
    context: StrategyContext
  ): Promise<Anomaly[]>;
  
  /**
   * Validate strategy configuration
   */
  validateConfig?(config: AgentConfigData): boolean;
}

/**
 * Base interface for summarization strategies
 */
export interface ISummarizationStrategy {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  /**
   * Generate a summary from analysis results
   */
  summarize(
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<string>;
  
  /**
   * Validate strategy configuration
   */
  validateConfig?(config: AgentConfigData): boolean;
}

/**
 * Abstract base class for analysis strategies
 */
export abstract class BaseAnalysisStrategy implements IAnalysisStrategy {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;

  abstract analyze(
    results: ToolResult[], 
    context: StrategyContext
  ): Promise<Insight[]>;

  extractEntities?(
    _results: ToolResult[], 
    _context: StrategyContext
  ): Promise<Entity[]> {
    // Default implementation - can be overridden
    return Promise.resolve([]);
  }

  detectAnomalies?(
    _results: ToolResult[], 
    _context: StrategyContext
  ): Promise<Anomaly[]> {
    // Default implementation - can be overridden
    return Promise.resolve([]);
  }

  validateConfig?(_config: any): boolean {
    // Default implementation - can be overridden
    return true;
  }

  /**
   * Helper method to filter successful results
   */
  protected getSuccessfulResults(results: ToolResult[]): ToolResult[] {
    return results.filter(r => r.success && r.data);
  }

  /**
   * Helper method to extract data from results
   */
  protected extractData(results: ToolResult[]): any[] {
    return this.getSuccessfulResults(results)
      .flatMap(r => Array.isArray(r.data) ? r.data : [r.data])
      .filter(data => data != null);
  }

  /**
   * Helper method to group results by tool
   */
  protected groupResultsByTool(results: ToolResult[]): Record<string, ToolResult[]> {
    return results.reduce((acc, result) => {
      if (!acc[result.tool]) {
        acc[result.tool] = [];
      }
      acc[result.tool]!.push(result);
      return acc;
    }, {} as Record<string, ToolResult[]>);
  }
}

/**
 * Abstract base class for summarization strategies
 */
export abstract class BaseSummarizationStrategy implements ISummarizationStrategy {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;

  abstract summarize(
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<string>;

  validateConfig?(_config: any): boolean {
    // Default implementation - can be overridden
    return true;
  }

  /**
   * Helper method to format insights for display
   */
  protected formatInsights(insights: Insight[]): string {
    if (insights.length === 0) {
      return 'No insights generated.';
    }

    return insights
      .map((insight, index) => {
        const confidence = (insight.confidence * 100).toFixed(0);
        return `${index + 1}. [${insight.type}] ${insight.description} (${confidence}% confidence)`;
      })
      .join('\n');
  }

  /**
   * Helper method to format anomalies for display
   */
  protected formatAnomalies(anomalies: Anomaly[]): string {
    if (anomalies.length === 0) {
      return 'No anomalies detected.';
    }

    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    const otherAnomalies = anomalies.filter(a => a.severity !== 'critical' && a.severity !== 'high');

    let result = '';
    
    if (criticalAnomalies.length > 0) {
      result += '⚠️ Critical Issues:\n';
      result += criticalAnomalies
        .map((anomaly, index) => `${index + 1}. [${anomaly.severity.toUpperCase()}] ${anomaly.description}`)
        .join('\n');
    }

    if (otherAnomalies.length > 0) {
      if (result) result += '\n\n';
      result += 'Other Issues:\n';
      result += otherAnomalies
        .map((anomaly, index) => `${index + 1}. [${anomaly.severity}] ${anomaly.description}`)
        .join('\n');
    }

    return result;
  }

  /**
   * Helper method to format entities for display
   */
  protected formatEntities(entities: Entity[]): string {
    if (entities.length === 0) {
      return 'No entities identified.';
    }

    const groupedEntities = entities.reduce((acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type]!.push(entity);
      return acc;
    }, {} as Record<string, Entity[]>);

    return Object.entries(groupedEntities)
      .map(([type, entityList]) => {
        const count = entityList.length;
        const names = entityList.map(e => e.name || e.id).slice(0, 5).join(', ');
        const more = count > 5 ? ` and ${count - 5} more` : '';
        return `${type.charAt(0).toUpperCase() + type.slice(1)}s: ${names}${more}`;
      })
      .join('\n');
  }
}

/**
 * Strategy execution result
 */
export interface StrategyExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  strategy: string;
}

/**
 * Strategy performance metrics
 */
export interface StrategyMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  errorRate: number;
}
