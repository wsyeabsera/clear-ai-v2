/**
 * LLM-Based Summarization Strategy
 * Uses LLM for intelligent summarization with configurable prompts
 */

import { BaseSummarizationStrategy } from '../base-strategy.js';
import { Analysis } from '../../../shared/types/agent.js';
import { StrategyContext } from '../base-strategy.js';
import { SummarizerConfig } from '../../../shared/types/agent-config.js';
import { LLMProvider } from '../../../shared/llm/provider.js';

export class LLMBasedSummarizationStrategy extends BaseSummarizationStrategy {
  readonly name = 'llm-based';
  readonly description = 'LLM-powered summarization with configurable prompts and chain-of-thought reasoning';
  readonly version = '1.0.0';

  constructor(private llm: LLMProvider) {
    super();
  }

  async summarize(
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<string> {
    const config = context.config as SummarizerConfig;

    try {
      if (config.enableChainOfThought) {
        return await this.summarizeWithChainOfThought(analysis, query, context);
      } else {
        return await this.summarizeWithDirectPrompt(analysis, query, context);
      }
    } catch (error) {
      console.error('[LLMBasedSummarizationStrategy] Summarization failed:', error);
      return this.generateFallbackSummary(analysis, query, config);
    }
  }

  private async summarizeWithChainOfThought(
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<string> {
    const config = context.config as SummarizerConfig;
    const systemPrompt = config.promptTemplates?.systemPrompt || this.getDefaultSystemPrompt(config);

    // Step 1: Extraction
    const extractionResponse = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Step 1 - Extract key findings from this analysis for query "${query}":\n${JSON.stringify(analysis, null, 2)}`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: 800
      }
    });

    // Step 2: Prioritization
    const prioritizationResponse = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Step 2 - Prioritize these findings by importance and urgency:\n${extractionResponse.content}`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: 600
      }
    });

    // Step 3: Composition
    const compositionResponse = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Step 3 - Compose a clear, actionable summary based on the prioritized findings:\n${prioritizationResponse.content}\n\nQuery: "${query}"\n\nFormat: ${config.format || 'plain'}\nTone: ${config.tone || 'professional'}\nMax length: ${config.maxLength || 500} words`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: config.llmConfig.maxTokens
      }
    });

    return compositionResponse.content;
  }

  private async summarizeWithDirectPrompt(
    analysis: Analysis,
    query: string,
    context: StrategyContext
  ): Promise<string> {
    const config = context.config as SummarizerConfig;
    const systemPrompt = config.promptTemplates?.systemPrompt || this.getDefaultSystemPrompt(config);

    const userPrompt = this.buildUserPrompt(analysis, query, config);

    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: config.llmConfig.maxTokens
      }
    });

    return response.content;
  }

  private buildUserPrompt(analysis: Analysis, query: string, config: SummarizerConfig): string {
    const format = config.format || 'plain';
    const tone = config.tone || 'professional';
    const maxLength = config.maxLength || 500;
    const includeDetails = config.includeDetails !== false;
    const includeRecommendations = config.includeRecommendations !== false;

    return `Original Query: ${query}

Analysis Summary: ${analysis.summary}

Insights (${analysis.insights.length}):
${this.formatInsights(analysis.insights)}

Anomalies (${analysis.anomalies.length}):
${this.formatAnomalies(analysis.anomalies)}

Entities Found: ${analysis.entities.length}

Create a clear, direct response to the user's query.
Format: ${format}
Tone: ${tone}
Max length: ${maxLength} words
${includeDetails ? 'Include supporting details and context' : 'Keep details minimal'}
${includeRecommendations ? 'End with specific recommendations and next steps' : 'Focus on findings only'}`;
  }

  private getDefaultSystemPrompt(config: SummarizerConfig): string {
    const tone = config.tone || 'professional';
    const format = config.format || 'plain';

    const toneGuide = {
      professional: 'Use professional, formal language with clear structure and authority',
      casual: 'Use conversational, friendly language that builds rapport',
      technical: 'Use precise technical language with detailed explanations and specifications',
    };

    return `You are an expert communicator specializing in waste management insights with deep domain knowledge.

COMMUNICATION PRINCIPLES:
1. **Clarity First**: Use plain language, explain technical terms, avoid jargon without explanation
2. **Prioritize Critical**: Most important information first, especially safety and compliance issues
3. **Actionable**: Always include next steps or recommendations with specific implementation guidance
4. **Context-Aware**: Adapt tone to audience (technical vs. executive vs. operational staff)
5. **Complete**: Address the original query fully with supporting evidence

DOMAIN EXPERTISE:

**Risk Communication:**
- Critical contaminants: Immediate action required, notify authorities within 24 hours
- High-risk patterns: Escalate to management, implement containment measures
- Compliance violations: Document thoroughly, follow regulatory procedures
- Capacity issues: Plan for alternatives, notify stakeholders

**Stakeholder Communication:**
- **Executive Summary**: Focus on business impact, costs, strategic implications
- **Technical Teams**: Provide detailed data, specific metrics, implementation steps
- **Operational Staff**: Clear procedures, safety considerations, immediate actions
- **Regulatory**: Compliance status, documentation requirements, reporting timelines

**Quality Standards:**
- Direct answers to user queries with specific data points
- Highlight critical issues prominently with clear severity indicators
- Provide clear next steps with timelines and responsible parties
- Use appropriate tone for the context and audience
- Include supporting data with entity IDs and specific metrics
- Structure information for easy scanning and decision-making

TONE: ${toneGuide[tone as keyof typeof toneGuide]}

FORMATTING REQUIREMENTS:
- Format: ${format}
- Max length: ${config.maxLength || 500} words
- ${config.includeDetails !== false ? 'Include supporting details and context' : 'Keep details minimal'}
- ${config.includeRecommendations !== false ? 'End with specific recommendations and next steps' : 'Focus on findings only'}

OUTPUT FORMAT:
Return ONLY the summary text, no preamble or meta-commentary.`;
  }

  private generateFallbackSummary(analysis: Analysis, query: string, config: SummarizerConfig): string {
    const parts: string[] = [];

    // Opening
    const greeting = config.tone === 'casual' ? 'Hey there!' : config.tone === 'technical' ? 'Analysis complete.' : 'Based on your query';
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

    // Recommendations if enabled
    if (config.includeRecommendations !== false) {
      parts.push('\n💡 Recommendations:');
      parts.push('Please review the critical issues and consider implementing additional quality control measures.');
    }

    return parts.join('\n');
  }

  override validateConfig(config: any): boolean {
    const summarizerConfig = config as SummarizerConfig;
    
    // Check required LLM config
    if (!summarizerConfig.llmConfig || !summarizerConfig.llmConfig.temperature || !summarizerConfig.llmConfig.maxTokens) {
      return false;
    }

    // Check temperature range
    if (summarizerConfig.llmConfig.temperature < 0 || summarizerConfig.llmConfig.temperature > 2) {
      return false;
    }

    // Check max tokens
    if (summarizerConfig.llmConfig.maxTokens < 100 || summarizerConfig.llmConfig.maxTokens > 4000) {
      return false;
    }

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
