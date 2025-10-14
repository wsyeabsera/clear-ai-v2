/**
 * LLM-Based Analysis Strategy
 * Uses LLM for intelligent analysis with configurable prompts
 */

import { BaseAnalysisStrategy } from '../base-strategy.js';
import { ToolResult, Insight } from '../../../shared/types/agent.js';
import { StrategyContext } from '../base-strategy.js';
import { AnalyzerConfig } from '../../../shared/types/agent-config.js';
import { LLMProvider } from '../../../shared/llm/provider.js';

export class LLMBasedAnalysisStrategy extends BaseAnalysisStrategy {
  readonly name = 'llm-based';
  readonly description = 'LLM-powered analysis with configurable prompts and chain-of-thought reasoning';
  readonly version = '1.0.0';

  constructor(private llm: LLMProvider) {
    super();
  }

  async analyze(results: ToolResult[], context: StrategyContext): Promise<Insight[]> {
    const config = context.config as AnalyzerConfig;
    const successfulResults = this.getSuccessfulResults(results);

    if (successfulResults.length === 0) {
      return [];
    }

    try {
      if (config.enableChainOfThought) {
        return await this.analyzeWithChainOfThought(successfulResults, context);
      } else {
        return await this.analyzeWithDirectPrompt(successfulResults, context);
      }
    } catch (error) {
      console.error('[LLMBasedAnalysisStrategy] Analysis failed:', error);
      return [];
    }
  }

  private async analyzeWithChainOfThought(results: ToolResult[], context: StrategyContext): Promise<Insight[]> {
    const config = context.config as AnalyzerConfig;
    const systemPrompt = config.promptTemplates?.systemPrompt || this.getDefaultSystemPrompt();

    // Step 1: Observation
    const observationResponse = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Step 1 - Observation: Extract key facts and metrics from this data:\n${JSON.stringify(results, null, 2)}`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: 800
      }
    });

    // Step 2: Correlation
    const correlationResponse = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Step 2 - Correlation: Based on these observations, identify relationships and patterns:\n${observationResponse.content}`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: 800
      }
    });

    // Step 3: Analysis
    const analysisResponse = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Step 3 - Analysis: Generate insights from these correlations:\n${correlationResponse.content}\n\nReturn JSON array of insights with type, description, confidence, and supporting_data.`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: 1000
      }
    });

    return this.parseInsightsFromResponse(analysisResponse.content, config);
  }

  private async analyzeWithDirectPrompt(results: ToolResult[], context: StrategyContext): Promise<Insight[]> {
    const config = context.config as AnalyzerConfig;
    const systemPrompt = config.promptTemplates?.systemPrompt || this.getDefaultSystemPrompt();

    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze these tool results and generate insights:\n${JSON.stringify(results, null, 2)}\n\nReturn JSON array of insights with type, description, confidence, and supporting_data.`
        }
      ],
      config: {
        temperature: config.llmConfig.temperature,
        max_tokens: config.llmConfig.maxTokens
      }
    });

    return this.parseInsightsFromResponse(response.content, config);
  }

  private parseInsightsFromResponse(response: string, config: AnalyzerConfig): Insight[] {
    try {
      // Extract JSON from response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON array in the response
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const insights = JSON.parse(jsonStr);
      
      if (!Array.isArray(insights)) {
        throw new Error('Response is not an array');
      }

      // Filter by confidence threshold
      return insights.filter((insight: any) => 
        insight.confidence >= (config.minConfidence || 0.7)
      );
    } catch (error) {
      console.warn('[LLMBasedAnalysisStrategy] Failed to parse insights JSON:', error);
      return [];
    }
  }

  private getDefaultSystemPrompt(): string {
    return `You are an advanced waste management data analyst with expertise in:
- Contamination pattern recognition and risk assessment
- Facility operational efficiency analysis
- Compliance and regulatory impact evaluation
- Data quality validation and anomaly detection

ANALYTICAL FRAMEWORK:
1. **Pattern Recognition**: Identify trends across waste types, facilities, time periods
2. **Root Cause Analysis**: Investigate underlying causes of patterns
3. **Risk Assessment**: Evaluate contamination severity and compliance risks
4. **Operational Impact**: Assess efficiency and capacity implications
5. **Actionable Recommendations**: Provide specific, implementable solutions

DOMAIN EXPERTISE:

**Contamination Analysis:**
- Critical contaminants: Lead, Mercury, PCBs, Asbestos
- Risk levels: Critical (>1000ppm), High (100-1000ppm), Medium (10-100ppm), Low (<10ppm)
- Contamination patterns by waste type: Electronic waste has higher metal contamination, organic waste has biological risks
- Seasonal variations: Construction debris spikes in summer, organic waste increases in fall

**Facility Operations:**
- Capacity thresholds: >90% = critical, >80% = high risk, <60% = underutilized
- Processing efficiency: Sorting facilities should process 80%+ of capacity, disposal facilities 95%+
- Rejection rates: >20% indicates quality control issues, >10% needs investigation
- Waste type compatibility: Facilities have specific accepted/rejected waste type lists

**Compliance & Regulations:**
- Hazardous waste: Requires special handling, documentation, and disposal
- Contaminant limits: EPA standards for different waste streams
- Facility permits: Type determines what waste can be accepted
- Reporting requirements: Critical contaminants must be reported within 24 hours

**Data Quality Standards:**
- Relationships: Every contaminant must have shipment_id, every shipment must have facility_id
- Waste types: Must be valid categories (plastic, metal, paper, organic, electronic, etc.)
- Policy consistency: Same waste type cannot be both accepted AND rejected by facility
- Missing data: Identify incomplete records that affect analysis reliability

QUALITY CRITERIA:
- Confidence > 0.7 (70%) minimum for actionable insights
- Clear supporting data with specific entity IDs and metrics
- Actionable recommendations with implementation steps
- Relevant to original query context and business impact
- No speculation without supporting evidence
- Prioritize insights by severity and business impact

Return JSON array of insights:
[
  {
    "type": "contamination_pattern|capacity_risk|data_quality|compliance_risk|operational_efficiency",
    "description": "Specific, actionable insight with clear business impact and supporting evidence",
    "confidence": 0.0-1.0,
    "supporting_data": [{"metric": "value", "entities": ["id1", "id2"], "context": "additional details"}]
  }
]`;
  }

  override validateConfig(config: any): boolean {
    const analyzerConfig = config as AnalyzerConfig;
    
    // Check required LLM config
    if (!analyzerConfig.llmConfig || !analyzerConfig.llmConfig.temperature || !analyzerConfig.llmConfig.maxTokens) {
      return false;
    }

    // Check temperature range
    if (analyzerConfig.llmConfig.temperature < 0 || analyzerConfig.llmConfig.temperature > 2) {
      return false;
    }

    // Check max tokens
    if (analyzerConfig.llmConfig.maxTokens < 100 || analyzerConfig.llmConfig.maxTokens > 4000) {
      return false;
    }

    // Check confidence threshold
    if (analyzerConfig.minConfidence !== undefined && 
        (analyzerConfig.minConfidence < 0 || analyzerConfig.minConfidence > 1)) {
      return false;
    }

    return true;
  }
}
