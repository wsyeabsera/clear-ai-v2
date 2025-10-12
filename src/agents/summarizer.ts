/**
 * Summarizer Agent
 * Converts analysis results into human-friendly responses
 */

import { Analysis, FinalResponse } from '../shared/types/agent.js';
import { LLMProvider } from '../shared/llm/provider.js';

export interface SummarizerConfig {
  maxLength: number;
  format: 'plain' | 'markdown' | 'json';
  includeDetails: boolean;
  includeRecommendations: boolean;
  tone: 'professional' | 'casual' | 'technical';
}

export class SummarizerAgent {
  private config: SummarizerConfig;

  constructor(
    private llm: LLMProvider,
    config?: Partial<SummarizerConfig>
  ) {
    this.config = {
      maxLength: 500,
      format: 'plain',
      includeDetails: true,
      includeRecommendations: true,
      tone: 'professional',
      ...config,
    };
  }

  async summarize(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<FinalResponse> {
    console.log('[SummarizerAgent] Generating summary...');

    const systemPrompt = this.buildSystemPrompt();

    const userPrompt = `
Original Query: ${query}

Analysis Summary: ${analysis.summary}

Insights (${analysis.insights.length}):
${analysis.insights.map((i, idx) =>
  `${idx + 1}. [${i.type}] ${i.description} (confidence: ${(i.confidence * 100).toFixed(0)}%)`
).join('\n')}

Anomalies (${analysis.anomalies.length}):
${analysis.anomalies.map((a, idx) =>
  `${idx + 1}. [${a.severity}] ${a.description}`
).join('\n')}

Entities Found: ${analysis.entities.length}

Create a clear, direct response to the user's query.
`;

    try {
      const response = await this.llm.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        config: {
          temperature: 0.7,
          max_tokens: this.config.maxLength * 2,
        },
      });

      return {
        message: response.content,
        tools_used: toolsUsed,
        data: {
          insights: analysis.insights,
          anomalies: analysis.anomalies,
          entities: analysis.entities,
        },
        analysis,
        metadata: {
          request_id: '',
          total_duration_ms: 0,
          timestamp: new Date().toISOString(),
        },
      };

    } catch (error) {
      console.error('[SummarizerAgent] Summarization failed:', error);

      // Fallback to template-based summary
      return this.generateTemplateSummary(query, analysis, toolsUsed);
    }
  }

  private buildSystemPrompt(): string {
    const toneGuide = {
      professional: 'Use professional, formal language',
      casual: 'Use conversational, friendly language',
      technical: 'Use precise technical language with details',
    };

    return `You are a summarization agent that creates clear, actionable responses.

TONE: ${toneGuide[this.config.tone]}

RULES:
1. Start with a direct answer to the user's query
2. Include key findings from the analysis
3. Highlight any critical issues or anomalies
4. ${this.config.includeDetails ? 'Provide supporting details and context' : 'Keep details minimal'}
5. ${this.config.includeRecommendations ? 'End with recommendations or next steps' : 'Do not include recommendations'}
6. Keep response under ${this.config.maxLength} words
7. Format: ${this.config.format}

OUTPUT FORMAT:
Return ONLY the summary text, no preamble or meta-commentary.`;
  }

  private generateTemplateSummary(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): FinalResponse {
    const parts: string[] = [];

    // Opening
    parts.push(`Based on your query "${query}", here's what I found:\n`);

    // Key insights
    if (analysis.insights.length > 0) {
      parts.push('\nKey Findings:');
      analysis.insights.slice(0, 3).forEach((insight, idx) => {
        parts.push(`${idx + 1}. ${insight.description}`);
      });
    }

    // Anomalies
    const criticalAnomalies = analysis.anomalies.filter(
      a => a.severity === 'critical' || a.severity === 'high'
    );

    if (criticalAnomalies.length > 0) {
      parts.push('\n⚠️  Important Alerts:');
      criticalAnomalies.forEach((anomaly, idx) => {
        parts.push(`${idx + 1}. ${anomaly.description}`);
      });
    }

    // Summary
    parts.push(`\n${analysis.summary}`);

    // Data sources
    parts.push(`\nData gathered from: ${toolsUsed.join(', ')}`);

    return {
      message: parts.join('\n'),
      tools_used: toolsUsed,
      data: {
        insights: analysis.insights,
        anomalies: analysis.anomalies,
      },
      analysis,
      metadata: {
        request_id: '',
        total_duration_ms: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

