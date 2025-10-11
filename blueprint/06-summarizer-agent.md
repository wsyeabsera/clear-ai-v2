# Summarizer Agent Blueprint

## Overview
The Summarizer Agent converts analysis results into human-friendly responses. It generates clear, concise summaries that directly answer the user's query while including relevant details and recommendations.

## Responsibilities

1. **Response Generation**
   - Create natural language summaries
   - Answer user's specific question
   - Include key findings
   - Add context and explanations

2. **Formatting**
   - Structure information logically
   - Highlight important points
   - Use appropriate tone
   - Support multiple formats (plain, markdown, JSON)

3. **Metadata Inclusion**
   - List tools used
   - Provide data sources
   - Include execution time
   - Add confidence levels

4. **Recommendations**
   - Suggest follow-up actions
   - Highlight areas needing attention
   - Provide context for decisions

## Architecture

```typescript
// src/agents/summarizer.ts
import { Analysis, FinalResponse } from './types.js';
import { LLMProvider } from '../llm/provider.js';

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
      ...config
    };
  }
  
  async summarize(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<FinalResponse> {
    console.log('Generating summary...');
    
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
          { role: 'user', content: userPrompt }
        ],
        config: {
          temperature: 0.7,
          max_tokens: this.config.maxLength * 2
        }
      });
      
      return {
        message: response.content,
        tools_used: toolsUsed,
        data: {
          insights: analysis.insights,
          anomalies: analysis.anomalies,
          entities: analysis.entities
        },
        analysis,
        metadata: {
          request_id: '',
          total_duration_ms: 0,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Summarization failed:', error);
      
      // Fallback to template-based summary
      return this.generateTemplateSummary(query, analysis, toolsUsed);
    }
  }
  
  private buildSystemPrompt(): string {
    const toneGuide = {
      professional: 'Use professional, formal language',
      casual: 'Use conversational, friendly language',
      technical: 'Use precise technical language with details'
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

STRUCTURE:
${this.config.format === 'markdown' ? `
Use markdown formatting:
- Use **bold** for important points
- Use bullet points for lists
- Use ### for sections
` : 'Use plain text, well-structured paragraphs'}

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
      parts.push('\n⚠️ Important Alerts:');
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
        anomalies: analysis.anomalies
      },
      analysis,
      metadata: {
        request_id: '',
        total_duration_ms: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

## Example Summaries

### Example 1: Contaminated Shipments Query
**Query:** "Get me last week's shipments that got contaminants"

**Summary (Professional):**
```
I found 12 shipments from last week that contained contaminants.

Key Findings:
1. 8 shipments (67%) were rejected due to contamination
2. Most common contaminant was Lead, detected in 6 shipments
3. High contamination rate: 75% of shipments had contaminants

⚠️ Important Alerts:
1. Critical contamination detected in 2 shipments requiring immediate attention

The contamination rate is significantly higher than normal. I recommend investigating the source facilities and reviewing quality control procedures.

Data gathered from: shipments, contaminants-detected
```

### Example 2: Hannover Contaminants
**Query:** "Analyse today's contaminants in Hannover"

**Summary (Technical):**
```
Analysis of contaminant detection data for Hannover Sorting Center (F1) on 2025-10-11:

Detected Contaminants: 3
- Lead: 1 occurrence (150 ppm, high risk)
- Mercury: 1 occurrence (75 ppm, medium risk)
- Plastic: 1 occurrence (200 ppm, low risk)

Risk Assessment:
- 1 high-risk contaminant exceeds safety threshold
- 2 contaminants within acceptable limits

Facility Status:
- Current load: 320 tons (64% capacity)
- Location: Hannover (52.3759°N, 9.732°E)

Recommendation: Immediate inspection required for high-risk Lead contamination. Shipment S2 should be quarantined.

Data gathered from: facilities, contaminants-detected
```

## Testing Strategy

```typescript
// src/tests/agents/summarizer.test.ts
import { SummarizerAgent } from '../../agents/summarizer.js';

describe('SummarizerAgent', () => {
  let summarizer: SummarizerAgent;
  let mockLLM: any;
  
  beforeEach(() => {
    mockLLM = {
      generate: jest.fn().mockResolvedValue({
        content: 'Test summary response'
      })
    };
    
    summarizer = new SummarizerAgent(mockLLM);
  });
  
  it('should generate summary from analysis', async () => {
    const analysis = {
      summary: 'Found data',
      insights: [{
        type: 'trend',
        description: 'High contamination rate',
        confidence: 0.9,
        supporting_data: []
      }],
      entities: [],
      anomalies: [],
      metadata: {
        tool_results_count: 1,
        analysis_time_ms: 100
      }
    };
    
    const response = await summarizer.summarize(
      'test query',
      analysis,
      ['shipments']
    );
    
    expect(response.message).toBeDefined();
    expect(response.tools_used).toEqual(['shipments']);
    expect(mockLLM.generate).toHaveBeenCalled();
  });
  
  it('should include insights in response', async () => {
    const analysis = {
      summary: 'Test',
      insights: [
        {
          type: 'trend',
          description: 'Key insight 1',
          confidence: 0.9,
          supporting_data: []
        },
        {
          type: 'pattern',
          description: 'Key insight 2',
          confidence: 0.8,
          supporting_data: []
        }
      ],
      entities: [],
      anomalies: [],
      metadata: { tool_results_count: 1, analysis_time_ms: 100 }
    };
    
    mockLLM.generate.mockResolvedValue({
      content: 'Summary with insights'
    });
    
    const response = await summarizer.summarize(
      'test',
      analysis,
      ['tools']
    );
    
    const promptCall = mockLLM.generate.mock.calls[0][0];
    expect(promptCall.messages[1].content).toContain('Key insight 1');
    expect(promptCall.messages[1].content).toContain('Key insight 2');
  });
  
  it('should highlight critical anomalies', async () => {
    const analysis = {
      summary: 'Test',
      insights: [],
      entities: [],
      anomalies: [{
        type: 'threshold_exceeded',
        description: 'Critical issue',
        severity: 'critical',
        affected_entities: [],
        data: {}
      }],
      metadata: { tool_results_count: 1, analysis_time_ms: 100 }
    };
    
    const response = await summarizer.summarize(
      'test',
      analysis,
      ['tools']
    );
    
    const promptCall = mockLLM.generate.mock.calls[0][0];
    expect(promptCall.messages[1].content).toContain('Critical issue');
  });
  
  it('should fallback to template if LLM fails', async () => {
    mockLLM.generate.mockRejectedValue(new Error('LLM failed'));
    
    const analysis = {
      summary: 'Test summary',
      insights: [{
        type: 'trend',
        description: 'Test insight',
        confidence: 0.9,
        supporting_data: []
      }],
      entities: [],
      anomalies: [],
      metadata: { tool_results_count: 1, analysis_time_ms: 100 }
    };
    
    const response = await summarizer.summarize(
      'test query',
      analysis,
      ['shipments']
    );
    
    expect(response.message).toContain('test query');
    expect(response.message).toContain('Test insight');
    expect(response.tools_used).toEqual(['shipments']);
  });
});
```

## Next Steps

1. Implement template-based summarization
2. Add LLM integration
3. Add multiple format support
4. Add tone control
5. Add length control
6. Test with various analysis types

