/**
 * Summarizer Agent
 * Converts analysis results into human-friendly responses
 */

import { Analysis, FinalResponse, ReasoningStep, ValidationResult, ValidationIssue } from '../shared/types/agent.js';
import { LLMProvider } from '../shared/llm/provider.js';
import { SUMMARIZER_MAX_REASONING_STEPS, CHAIN_OF_THOUGHT_TEMPERATURE } from '../shared/constants/config.js';

export interface SummarizerConfig {
  maxLength: number;
  format: 'plain' | 'markdown' | 'json';
  includeDetails: boolean;
  includeRecommendations: boolean;
  tone: 'professional' | 'casual' | 'technical';
  enableChainOfThought?: boolean; // Enable multi-step reasoning
  enableSelfCritique?: boolean;   // Enable validation layer
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
      enableChainOfThought: true,
      enableSelfCritique: true,
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
      // Use chain-of-thought reasoning if enabled
      if (this.config.enableChainOfThought) {
        return await this.summarizeWithChainOfThought(query, analysis, toolsUsed);
      }

      const response = await this.llm.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        config: {
          temperature: CHAIN_OF_THOUGHT_TEMPERATURE,
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

CHAIN-OF-THOUGHT PROCESS:
1. **Extract**: Identify all key findings from analysis (insights, anomalies, patterns)
2. **Prioritize**: Rank by importance and urgency (critical > high > medium > low)
3. **Structure**: Organize information logically (executive summary → details → recommendations)
4. **Compose**: Draft clear, concise summary with appropriate tone
5. **Refine**: Improve clarity and impact, ensure actionability

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

TONE: ${toneGuide[this.config.tone]}

FORMATTING REQUIREMENTS:
- Format: ${this.config.format}
- Max length: ${this.config.maxLength} words
- ${this.config.includeDetails ? 'Include supporting details and context' : 'Keep details minimal'}
- ${this.config.includeRecommendations ? 'End with specific recommendations and next steps' : 'Focus on findings only'}

STRUCTURE TEMPLATE:
1. **Direct Answer**: Immediate response to the query
2. **Key Findings**: Most important insights (prioritized by severity)
3. **Critical Issues**: Safety, compliance, or operational concerns requiring immediate attention
4. **Supporting Details**: ${this.config.includeDetails ? 'Specific data, metrics, and entity information' : 'Minimal contextual information'}
5. **Recommendations**: ${this.config.includeRecommendations ? 'Specific next steps with timelines and responsible parties' : 'None'}

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

  /**
   * Generate summary using chain-of-thought reasoning
   */
  private async summarizeWithChainOfThought(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<FinalResponse> {
    console.log('[SummarizerAgent] Using chain-of-thought reasoning for summarization...');

    const reasoningSteps: ReasoningStep[] = [];

    try {
      // Step 1: Extraction - Identify key findings and their importance
      const extractionStep = await this.performSummarizationStep(
        'extraction',
        1,
        'Extract and prioritize key findings from analysis',
        { query, analysis },
        `Extract all key findings from the analysis and prioritize them by importance and urgency:
        - Critical issues requiring immediate attention
        - High-priority insights with significant business impact
        - Medium-priority findings that inform decision-making
        - Low-priority observations for context

        For each finding, include:
        - Specific data points and metrics
        - Entity IDs and affected systems
        - Severity level and urgency
        - Business impact assessment

        Return structured findings with priority rankings.`
      );
      reasoningSteps.push(extractionStep);

      // Step 2: Prioritization - Rank findings by importance and urgency
      const prioritizationStep = await this.performSummarizationStep(
        'prioritization',
        2,
        'Prioritize findings by importance and urgency',
        { query, findings: extractionStep.output },
        `Based on the extracted findings and the original query, prioritize information:
        - What does the user most need to know?
        - What requires immediate action?
        - What provides context and background?
        - How should information be ordered for maximum impact?

        Consider:
        - Query intent and user needs
        - Risk levels and compliance requirements
        - Business impact and strategic implications
        - Timeline sensitivity and urgency

        Return prioritized information structure.`
      );
      reasoningSteps.push(prioritizationStep);

      // Step 3: Structuring - Organize information hierarchically
      const structuringStep = await this.performSummarizationStep(
        'structuring',
        3,
        'Structure information for clear communication',
        { prioritizedFindings: prioritizationStep.output, query },
        `Structure the prioritized information for optimal communication:
        - Determine appropriate format and tone for the audience
        - Organize information hierarchically (most important first)
        - Create logical flow from summary to details to recommendations
        - Ensure critical information is prominently featured
        - Plan supporting details and context placement

        Consider:
        - User's likely role and expertise level
        - Information complexity and technical depth needed
        - Communication format requirements
        - Length constraints and readability

        Return structured communication plan.`
      );
      reasoningSteps.push(structuringStep);

      // Step 4: Composition - Draft initial summary
      const compositionStep = await this.performSummarizationStep(
        'composition',
        4,
        'Draft clear and actionable summary',
        { structure: structuringStep.output, query, analysis },
        `Compose a clear, actionable summary based on the structure:
        - Start with direct answer to the query
        - Present key findings in priority order
        - Highlight critical issues prominently
        - Include specific data points and entity IDs
        - Provide actionable recommendations with next steps
        - Use appropriate tone and language for the audience

        Ensure:
        - Clarity and conciseness
        - Complete coverage of important findings
        - Actionable recommendations
        - Appropriate technical depth
        - Professional presentation

        Return the draft summary.`
      );
      reasoningSteps.push(compositionStep);

      // Step 5: Refinement - Improve clarity and impact
      const refinementStep = await this.performSummarizationStep(
        'refinement',
        5,
        'Refine summary for maximum clarity and impact',
        { draftSummary: compositionStep.output, query, originalAnalysis: analysis },
        `Refine the draft summary to maximize clarity and impact:
        - Review for clarity and readability
        - Ensure all critical information is included
        - Verify recommendations are specific and actionable
        - Check tone appropriateness for audience
        - Optimize for scanning and quick comprehension
        - Remove redundancy and improve flow

        Quality checks:
        - Does it directly answer the user's query?
        - Are critical issues highlighted appropriately?
        - Are recommendations specific and actionable?
        - Is the tone appropriate for the context?
        - Is the information complete and accurate?
        - Is it within length constraints?

        Return the refined final summary.`
      );
      reasoningSteps.push(refinementStep);

      // Apply self-critique validation if enabled
      let validationResult: ValidationResult | undefined;
      if (this.config.enableSelfCritique) {
        validationResult = await this.validateSummary(
          refinementStep.output,
          query,
          analysis,
          reasoningSteps
        );

        if (!validationResult.is_valid) {
          console.warn('[SummarizerAgent] Self-critique validation found issues:', validationResult.issues);
          // Could implement automatic refinement here based on validation issues
        }
      }

      const result: FinalResponse = {
        message: refinementStep.output,
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
          reasoning_trace: reasoningSteps,
        },
      };

      // Add optional validation result if it exists
      if (validationResult) {
        result.metadata.validation_result = validationResult;
      }

      return result;

    } catch (error) {
      console.error('[SummarizerAgent] Chain-of-thought summarization failed:', error);
      // Fallback to template-based summary
      return this.generateTemplateSummary(query, analysis, toolsUsed);
    }
  }

  /**
   * Perform a single summarization reasoning step
   */
  private async performSummarizationStep(
    type: ReasoningStep['reasoning_type'],
    stepNumber: number,
    description: string,
    input: any,
    prompt: string
  ): Promise<ReasoningStep> {
    const startTime = new Date();

    const response = await this.llm.generate({
      messages: [
        {
          role: 'system',
          content: `You are performing step ${stepNumber} of ${SUMMARIZER_MAX_REASONING_STEPS} in a chain-of-thought summarization process.

          ${prompt}

          Focus on clarity, actionability, and user needs.`
        },
        {
          role: 'user',
          content: `Input data:\n${JSON.stringify(input, null, 2)}`
        },
      ],
      config: {
        temperature: CHAIN_OF_THOUGHT_TEMPERATURE,
        max_tokens: 1000,
      },
    });

    return {
      step_number: stepNumber,
      reasoning_type: type,
      description,
      input,
      output: response.content,
      confidence: this.calculateSummarizationStepConfidence(response.content),
      timestamp: startTime.toISOString(),
    };
  }

  /**
   * Calculate confidence score for a summarization step
   */
  private calculateSummarizationStepConfidence(content: string): number {
    // Simple heuristic based on content characteristics
    let confidence = 0.5; // Base confidence

    if (content.includes('specific') || content.includes('actionable')) confidence += 0.1;
    if (content.includes('critical') || content.includes('priority')) confidence += 0.1;
    if (content.includes('recommendation') || content.includes('next step')) confidence += 0.1;
    if (content.includes('data') || content.includes('metric')) confidence += 0.1;
    if (content.length > 300) confidence += 0.1; // More detailed responses

    return Math.min(confidence, 1.0);
  }

  /**
   * Self-critique validation for summaries
   */
  private async validateSummary(
    summary: string,
    originalQuery: string,
    analysis: Analysis,
    reasoningSteps: ReasoningStep[]
  ): Promise<ValidationResult> {
    console.log('[SummarizerAgent] Performing self-critique validation...');

    const issues: ValidationIssue[] = [];
    let qualityScore = 1.0;

    // Check completeness - does it address the query?
    const queryWords = originalQuery.toLowerCase().split(/\s+/);
    const summaryWords = summary.toLowerCase();
    const queryCoverage = queryWords.filter(word =>
      word.length > 3 && summaryWords.includes(word)
    ).length / queryWords.length;

    if (queryCoverage < 0.5) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        description: `Summary doesn't adequately address the original query (${(queryCoverage * 100).toFixed(0)}% coverage)`,
        suggestion: 'Include more direct responses to query elements'
      });
      qualityScore -= 0.2;
    }

    // Check clarity - is it easy to understand?
    const hasJargon = /contaminant|facility|shipment|ppm|utilization/i.test(summary);
    const hasExplanations = /which means|that is|in other words|specifically/i.test(summary);

    if (hasJargon && !hasExplanations) {
      issues.push({
        type: 'clarity',
        severity: 'medium',
        description: 'Summary contains technical jargon without explanations',
        suggestion: 'Add explanations for technical terms or simplify language'
      });
      qualityScore -= 0.15;
    }

    // Check actionability - are there clear next steps?
    const hasRecommendations = /recommend|should|next step|action|implement/i.test(summary);

    if (!hasRecommendations && this.config.includeRecommendations) {
      issues.push({
        type: 'actionability',
        severity: 'medium',
        description: 'Summary lacks actionable recommendations despite being configured to include them',
        suggestion: 'Add specific recommendations and next steps'
      });
      qualityScore -= 0.15;
    }

    // Check critical information prioritization
    const criticalIssues = analysis.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    const mentionsCriticalIssues = criticalIssues.some(issue =>
      summary.toLowerCase().includes(issue.description.toLowerCase().substring(0, 20))
    );

    if (criticalIssues.length > 0 && !mentionsCriticalIssues) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        description: 'Summary fails to mention critical issues that require immediate attention',
        suggestion: 'Prominently feature critical issues at the beginning of the summary'
      });
      qualityScore -= 0.25;
    }

    // Check tone appropriateness
    const toneIssues = this.checkToneAppropriateness(summary);
    if (toneIssues.length > 0) {
      issues.push(...toneIssues);
      qualityScore -= 0.1 * toneIssues.length;
    }

    // Check length constraints
    const wordCount = summary.split(/\s+/).length;
    if (wordCount > this.config.maxLength * 1.2) {
      issues.push({
        type: 'completeness',
        severity: 'low',
        description: `Summary exceeds recommended length (${wordCount} words, limit: ${this.config.maxLength})`,
        suggestion: 'Condense information while maintaining key details'
      });
      qualityScore -= 0.1;
    }

    // Check reasoning quality
    if (reasoningSteps.length < 3) {
      issues.push({
        type: 'completeness',
        severity: 'low',
        description: 'Insufficient reasoning steps in chain-of-thought process',
        suggestion: 'Ensure all reasoning steps (extract, prioritize, structure, compose, refine) are performed'
      });
      qualityScore -= 0.1;
    }

    const is_valid = qualityScore >= 0.7 && issues.filter(i => i.severity === 'high').length === 0;
    const confidence = Math.max(0, Math.min(1, qualityScore));

    return {
      is_valid,
      quality_score: qualityScore,
      issues,
      recommendations: issues.map(i => i.suggestion),
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check tone appropriateness for the configured tone
   */
  private checkToneAppropriateness(summary: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    switch (this.config.tone) {
      case 'professional':
        if (/lol|omg|awesome|cool/i.test(summary)) {
          issues.push({
            type: 'tone',
            severity: 'medium',
            description: 'Summary contains casual language inappropriate for professional tone',
            suggestion: 'Use more formal, professional language'
          });
        }
        break;

      case 'casual':
        if (/pursuant to|herein|aforementioned|whereas/i.test(summary)) {
          issues.push({
            type: 'tone',
            severity: 'medium',
            description: 'Summary contains overly formal language for casual tone',
            suggestion: 'Use more conversational, friendly language'
          });
        }
        break;

      case 'technical':
        if (!/[a-zA-Z]{4,}[\s]*[a-zA-Z]{4,}[\s]*[a-zA-Z]{4,}/.test(summary)) {
          issues.push({
            type: 'tone',
            severity: 'low',
            description: 'Summary may lack technical depth for technical audience',
            suggestion: 'Include more technical details and specifications'
          });
        }
        break;
    }

    return issues;
  }
}

