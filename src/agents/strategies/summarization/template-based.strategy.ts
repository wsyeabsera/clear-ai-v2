/**
 * Template-Based Summarization Strategy
 * Uses Handlebars templates for structured output generation
 */

import { BaseSummarizationStrategy } from '../base-strategy.js';
import { Analysis } from '../../../shared/types/agent.js';
import { StrategyContext } from '../base-strategy.js';
import { SummarizerConfig } from '../../../shared/types/agent-config.js';

export class TemplateBasedSummarizationStrategy extends BaseSummarizationStrategy {
  readonly name = 'template-based';
  readonly description = 'Template-based summarization using Handlebars templates';
  readonly version = '1.0.0';

  async summarize(
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<string> {
    const config = context.config as SummarizerConfig;
    const template = config.outputTemplate || this.getDefaultTemplate(config);

    try {
      // Simple template replacement (in a real implementation, use Handlebars)
      return this.renderTemplate(template, {
        query,
        analysis,
        config,
        insights: analysis.insights,
        anomalies: analysis.anomalies,
        entities: analysis.entities,
        summary: analysis.summary,
        metadata: analysis.metadata
      });
    } catch (error) {
      console.error('[TemplateBasedSummarizationStrategy] Template rendering failed:', error);
      return this.generateFallbackSummary(analysis, query, config);
    }
  }

  private renderTemplate(template: string, data: any): string {
    // Simple template replacement - in production, use Handlebars or similar
    return template
      .replace(/\{\{query\}\}/g, data.query || '')
      .replace(/\{\{summary\}\}/g, data.summary || '')
      .replace(/\{\{insights\}\}/g, this.formatInsights(data.insights || []))
      .replace(/\{\{anomalies\}\}/g, this.formatAnomalies(data.anomalies || []))
      .replace(/\{\{entities\}\}/g, this.formatEntities(data.entities || []))
      .replace(/\{\{insightsCount\}\}/g, (data.insights || []).length.toString())
      .replace(/\{\{anomaliesCount\}\}/g, (data.anomalies || []).length.toString())
      .replace(/\{\{entitiesCount\}\}/g, (data.entities || []).length.toString())
      .replace(/\{\{criticalAnomalies\}\}/g, this.formatCriticalAnomalies(data.anomalies || []))
      .replace(/\{\{criticalAnomaliesCount\}\}/g, this.getCriticalAnomaliesCount(data.anomalies || []).toString());
  }

  private getDefaultTemplate(config: SummarizerConfig): string {
    const tone = config.tone || 'professional';
    const format = config.format || 'plain';
    const includeDetails = config.includeDetails !== false;
    const includeRecommendations = config.includeRecommendations !== false;

    if (format === 'json') {
      return this.getJsonTemplate();
    }

    if (format === 'markdown') {
      return this.getMarkdownTemplate(tone, includeDetails, includeRecommendations);
    }

    return this.getPlainTemplate(tone, includeDetails, includeRecommendations);
  }

  private getPlainTemplate(tone: string, includeDetails: boolean, includeRecommendations: boolean): string {
    const greeting = tone === 'casual' ? 'Hey there!' : tone === 'technical' ? 'Analysis Results:' : 'Based on your query';
    const criticalSection = includeDetails ? '\n\n⚠️ Critical Issues:\n{{criticalAnomalies}}' : '';
    const detailsSection = includeDetails ? '\n\n📊 Detailed Analysis:\n{{insights}}' : '';
    const recommendationsSection = includeRecommendations ? '\n\n💡 Recommendations:\nPlease review the critical issues and consider implementing additional quality control measures.' : '';

    return `${greeting} "{{query}}", here's what I found:

{{summary}}${criticalSection}${detailsSection}${recommendationsSection}

Data analyzed: {{insightsCount}} insights, {{anomaliesCount}} anomalies, {{entitiesCount}} entities identified.`;
  }

  private getMarkdownTemplate(tone: string, includeDetails: boolean, includeRecommendations: boolean): string {
    const title = tone === 'casual' ? '# Analysis Results' : tone === 'technical' ? '# Data Analysis Report' : '# Analysis Summary';
    const criticalSection = includeDetails ? '\n\n## ⚠️ Critical Issues\n\n{{criticalAnomalies}}' : '';
    const detailsSection = includeDetails ? '\n\n## 📊 Detailed Analysis\n\n{{insights}}' : '';
    const recommendationsSection = includeRecommendations ? '\n\n## 💡 Recommendations\n\nPlease review the critical issues and consider implementing additional quality control measures.' : '';

    return `${title}

**Query:** {{query}}

## Summary

{{summary}}${criticalSection}${detailsSection}${recommendationsSection}

---

**Analysis Metrics:**
- Insights: {{insightsCount}}
- Anomalies: {{anomaliesCount}}
- Entities: {{entitiesCount}}`;
  }

  private getJsonTemplate(): string {
    return `{
  "query": "{{query}}",
  "summary": "{{summary}}",
  "insights": {{insights}},
  "anomalies": {{anomalies}},
  "entities": {{entities}},
  "metrics": {
    "insightsCount": {{insightsCount}},
    "anomaliesCount": {{anomaliesCount}},
    "entitiesCount": {{entitiesCount}},
    "criticalAnomaliesCount": {{criticalAnomaliesCount}}
  }
}`;
  }

  private formatCriticalAnomalies(anomalies: any[]): string {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    
    if (criticalAnomalies.length === 0) {
      return 'No critical issues detected.';
    }

    return criticalAnomalies
      .map((anomaly, index) => `${index + 1}. [${anomaly.severity.toUpperCase()}] ${anomaly.description}`)
      .join('\n');
  }

  private getCriticalAnomaliesCount(anomalies: any[]): number {
    return anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  }

  private generateFallbackSummary(analysis: Analysis, query: string, config: SummarizerConfig): string {
    const parts: string[] = [];

    // Opening
    const greeting = config.tone === 'casual' ? 'Hey!' : config.tone === 'technical' ? 'Analysis complete.' : 'Based on your query';
    parts.push(`${greeting} "${query}", here's what I found:\n`);

    // Summary
    parts.push(analysis.summary);

    // Key insights
    if (analysis.insights.length > 0) {
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

    return parts.join('\n');
  }

  override validateConfig(config: any): boolean {
    const summarizerConfig = config as SummarizerConfig;
    
    // Check format
    if (summarizerConfig.format && !['plain', 'markdown', 'json'].includes(summarizerConfig.format)) {
      return false;
    }

    // Check tone
    if (summarizerConfig.tone && !['professional', 'casual', 'technical'].includes(summarizerConfig.tone)) {
      return false;
    }

    // Check max length
    if (summarizerConfig.maxLength !== undefined && summarizerConfig.maxLength < 50) {
      return false;
    }

    return true;
  }
}
