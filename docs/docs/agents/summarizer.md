---
sidebar_position: 5
---

# Summarizer Agent

The Summarizer Agent transforms analysis results into natural, human-readable responses with configurable formats, tones, and styles using template-based generation and LLM-enhanced summarization.

## What It Does

The Summarizer Agent is the fourth stage of the agent pipeline:

```
Analysis (Insights + Entities + Anomalies) → SUMMARIZER → Natural Language Response
```

**Input**: Analysis from Analyzer, query context, tools used  
**Output**: AgentResponse with natural language message

## Summarization Strategies

### Template-Based (Fast)

Predefined templates for common response patterns:
- **Performance**: 10-50ms
- **Consistency**: Highly predictable format
- **Use case**: Real-time responses, structured outputs

```typescript
// Template example
template = `Found ${insights.length} insights from ${tools.length} tools.
${insights.map(i => `- ${i.description}`).join('\n')}`;
```

### LLM-Based (Intelligent)

AI-powered summarization for natural responses:
- **Performance**: 1-3 seconds
- **Quality**: Natural, contextual, adaptive
- **Use case**: User-facing responses, reports

```typescript
// LLM generates: 
"Your analysis revealed 3 contaminated shipments from last week, 
with Lead being the primary concern (2 occurrences). The contamination 
rate of 60% is significantly higher than normal and requires immediate attention."
```

### Hybrid (Recommended)

Template for structure, LLM for enhancement:
```typescript
// 1. Generate structured summary with template
const structure = buildTemplateSummary(analysis);

// 2. Enhance with LLM for natural flow
const enhanced = await enhanceWithLLM(structure, query);

// 3. Return combined result
return { message: enhanced, ... };
```

## Configuration Options

```typescript
interface SummarizerConfig {
  format: "plain" | "markdown" | "json";  // Output format
  tone: "professional" | "technical" | "casual";  // Response tone
  maxLength: number;                      // Max response characters
  includeSupportingData: boolean;         // Include raw data
}

// Create with custom config
const summarizer = new SummarizerAgent(llm, {
  format: "markdown",
  tone: "professional",
  maxLength: 500,
  includeSupportingData: true
});
```

## Format Options

### Plain Text Format

Simple, readable text output:

```typescript
const plainSummarizer = new SummarizerAgent(llm, {
  format: "plain"
});

const response = await plainSummarizer.summarize(query, analysis, tools);

console.log(response.message);
// Output:
// "Found 5 contaminated shipments from last week. High contamination 
// rate: 60% of shipments have contaminants. Most common contaminant: 
// Lead (3 occurrences). Immediate attention required for 2 high-risk items."
```

### Markdown Format

Structured output with formatting:

```typescript
const markdownSummarizer = new SummarizerAgent(llm, {
  format: "markdown"
});

const response = await markdownSummarizer.summarize(query, analysis, tools);

console.log(response.message);
// Output:
// "## Contaminated Shipments Analysis
//
// ### Summary
// Found **5 contaminated shipments** from last week.
//
// ### Key Insights
// - High contamination rate: **60%** of shipments
// - Most common: **Lead** (3 occurrences)
// - Risk level: **2 high-risk** items
//
// ### Recommendations
// Immediate attention required for high-risk contaminants."
```

### JSON Format

Structured data output:

```typescript
const jsonSummarizer = new SummarizerAgent(llm, {
  format: "json"
});

const response = await jsonSummarizer.summarize(query, analysis, tools);

console.log(JSON.parse(response.message));
// Output:
// {
//   "summary": "Found 5 contaminated shipments",
//   "metrics": {
//     "total_shipments": 5,
//     "contamination_rate": 0.6,
//     "high_risk_count": 2
//   },
//   "recommendations": ["Immediate attention required"]
// }
```

## Tone Control

### Professional Tone

Formal, business-appropriate language:

```typescript
const professionalSummarizer = new SummarizerAgent(llm, {
  tone: "professional"
});

const response = await professionalSummarizer.summarize(query, analysis, tools);

// Output:
// "The analysis identified 5 contaminated shipments during the specified 
// period. The contamination rate of 60% exceeds acceptable thresholds 
// and warrants immediate investigation. Lead contaminants account for 
// 60% of detected substances, indicating a systematic issue requiring 
// corrective action."
```

### Technical Tone

Detailed, metric-focused language:

```typescript
const technicalSummarizer = new SummarizerAgent(llm, {
  tone: "technical"
});

const response = await technicalSummarizer.summarize(query, analysis, tools);

// Output:
// "Query executed shipments_list tool (execution time: 45ms). Dataset: 
// n=5 shipments, contamination_rate=0.60, μ_concentration=245ppm, 
// σ=125ppm. Outlier detection (threshold=2σ) identified 1 anomaly 
// (z-score=3.2). Primary contaminant: Lead (60% prevalence, 
// risk_level=high)."
```

### Casual Tone

Friendly, conversational language:

```typescript
const casualSummarizer = new SummarizerAgent(llm, {
  tone: "casual"
});

const response = await casualSummarizer.summarize(query, analysis, tools);

// Output:
// "Hey! So I found 5 shipments with contamination issues from last week. 
// The contamination rate is pretty high at 60% - definitely something 
// to look into. Lead seems to be the main culprit, showing up in 3 of 
// them. A couple of these are high-risk, so you'll want to deal with 
// those ASAP."
```

## Response Examples

### Example 1: Simple Data Query

**Input**:
```typescript
query = "Get shipments";
analysis = {
  summary: "Found 10 shipments",
  insights: [
    { type: "trend", description: "Low contamination rate: 10%", confidence: 0.85 }
  ],
  entities: [/* 10 shipments */],
  anomalies: []
};
tools = ["shipments_list"];
```

**Output**:
```typescript
{
  message: "Found 10 shipments in the system. Analysis shows a low contamination rate of 10%, which is within acceptable parameters.",
  tools_used: ["shipments_list"],
  data: [/* raw shipment data */],
  analysis: { /* full analysis */ },
  metadata: { /* request metadata */ }
}
```

### Example 2: Complex Analysis with Anomalies

**Input**:
```typescript
query = "Analyze contamination patterns";
analysis = {
  summary: "Analyzed contamination across facilities",
  insights: [
    { type: "pattern", description: "Berlin facilities show 40% higher contamination", confidence: 0.88 },
    { type: "correlation", description: "CarrierA shipments have 3x contamination rate", confidence: 0.92 }
  ],
  entities: [/* facilities and shipments */],
  anomalies: [
    { type: "outlier", description: "Facility F1 has 95% contamination rate", severity: "critical" }
  ]
};
tools = ["facilities_list", "shipments_list", "contaminants_list"];
```

**Output**:
```typescript
{
  message: "Analysis of contamination patterns revealed significant findings. 
  Berlin facilities demonstrate 40% higher contamination rates compared to other regions (confidence: 88%). 
  Additionally, shipments from CarrierA show 3x higher contamination rates than average (confidence: 92%). 
  
  ⚠️ Critical anomaly detected: Facility F1 is experiencing a 95% contamination rate, 
  significantly exceeding normal parameters. Immediate investigation and corrective action recommended.",
  
  tools_used: ["facilities_list", "shipments_list", "contaminants_list"],
  analysis: { /* full analysis */ }
}
```

### Example 3: No Data Found

**Input**:
```typescript
query = "Get shipments from NonExistentFacility";
analysis = {
  summary: "No data found",
  insights: [],
  entities: [],
  anomalies: []
};
tools = ["facilities_list", "shipments_list"];
```

**Output**:
```typescript
{
  message: "No shipments were found from NonExistentFacility. The facility may not exist in the system, or there may be no shipments associated with it.",
  tools_used: ["facilities_list", "shipments_list"],
  data: []
}
```

### Example 4: Many Insights

**Input**:
```typescript
analysis = {
  insights: [
    { type: "trend", description: "Insight 1...", confidence: 0.9 },
    { type: "pattern", description: "Insight 2...", confidence: 0.85 },
    { type: "correlation", description: "Insight 3...", confidence: 0.92 },
    // ... 10 more insights
  ]
};
```

**Output** (LLM organizes into coherent summary):
```
"Comprehensive analysis revealed multiple significant findings:

**Primary Trends:**
- Insight 1... (confidence: 90%)
- Insight 4... (confidence: 87%)

**Key Patterns:**
- Insight 2... (confidence: 85%)
- Insight 5... (confidence: 83%)

**Correlations:**
- Insight 3... (confidence: 92%)

The data suggests systematic issues requiring strategic intervention."
```

## LLM Enhancement

### Enhancement Process

```typescript
async function enhanceWithLLM(
  templateSummary: string,
  analysis: Analysis,
  query: string
): Promise<string> {
  const prompt = `
    Original query: "${query}"
    
    Template summary: "${templateSummary}"
    
    Analysis details:
    - ${analysis.insights.length} insights found
    - ${analysis.anomalies.length} anomalies detected
    - ${analysis.entities.length} entities identified
    
    Generate a natural, fluent summary that:
    1. Directly answers the user's query
    2. Highlights most important insights
    3. Mentions critical anomalies
    4. Uses clear, professional language
    5. Is concise but complete
  `;

  const response = await llm.generate({ messages: [{ role: "user", content: prompt }] });
  return response.content;
}
```

### LLM Fallback

```typescript
// If LLM fails, falls back to template
async summarize(query, analysis, tools) {
  try {
    // Try LLM enhancement
    const enhanced = await enhanceWithLLM(analysis);
    return createResponse(enhanced);
  } catch (error) {
    // Fallback to template
    console.log('LLM failed, using template fallback');
    const template = buildTemplateSummary(analysis);
    return createResponse(template);
  }
}
```

## API Reference

### SummarizerAgent Class

```typescript
class SummarizerAgent {
  constructor(
    llm: LLMProvider,
    config?: Partial<SummarizerConfig>
  );

  async summarize(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<AgentResponse>;
}
```

### Methods

#### `summarize(query, analysis, toolsUsed)`

Generates natural language response from analysis.

**Parameters**:
- `query` (string): Original user query
- `analysis` (Analysis): Analysis from Analyzer
- `toolsUsed` (string[]): Tools that were executed

**Returns**: `Promise<AgentResponse>`

**Example**:
```typescript
const response = await summarizer.summarize(
  "Get contaminated shipments",
  analysisResults,
  ["shipments_list", "contaminants_list"]
);

console.log(response.message);
// Natural language summary
```

## Code Examples

### Basic Usage

```typescript
import { SummarizerAgent } from './agents/summarizer.js';
import { LLMProvider } from './shared/llm/provider.js';

const llm = new LLMProvider(getLLMConfigs());
const summarizer = new SummarizerAgent(llm);

const response = await summarizer.summarize(
  query,
  analysis,
  ["shipments_list"]
);

console.log(response.message);
```

### With Format Options

```typescript
// Markdown output for documentation
const mdSummarizer = new SummarizerAgent(llm, {
  format: "markdown",
  tone: "technical"
});

const response = await mdSummarizer.summarize(query, analysis, tools);

// Response includes markdown formatting
console.log(response.message);
// "## Analysis Results\n\n### Insights\n- Insight 1..."
```

### With Tone Control

```typescript
// Professional for client-facing
const professional = new SummarizerAgent(llm, {
  tone: "professional"
});

// Technical for internal teams
const technical = new SummarizerAgent(llm, {
  tone: "technical"
});

// Casual for dashboards
const casual = new SummarizerAgent(llm, {
  tone: "casual"
});
```

### With Length Limits

```typescript
const concise = new SummarizerAgent(llm, {
  maxLength: 200  // Keep responses brief
});

const detailed = new SummarizerAgent(llm, {
  maxLength: 1000  // Allow detailed responses
});
```

## Template System

### Template Variables

Available in templates:

```typescript
{
  query: string;              // Original query
  insights: Insight[];        // Array of insights
  entities: Entity[];         // Array of entities
  anomalies: Anomaly[];       // Array of anomalies
  tools: string[];            // Tools used
  summary: string;            // Analysis summary
  metadata: {                 // Execution metadata
    tool_results_count: number;
    successful_results: number;
    failed_results: number;
    analysis_time_ms: number;
  }
}
```

### Template Examples

```typescript
// Basic template
const template = `
Query: {query}
Results: Found {entities.length} items using {tools.join(', ')}

Insights:
{insights.map(i => `- ${i.description} (confidence: ${i.confidence})`).join('\n')}

{anomalies.length > 0 ? `⚠️ Anomalies detected: ${anomalies.length}` : ''}
`;

// With conditional logic
const template = `
{insights.length > 0 
  ? `Analysis revealed ${insights.length} key findings:\n${insights.map(i => `• ${i.description}`).join('\n')}`
  : 'No significant patterns detected in the data.'
}

{anomalies.length > 0 
  ? `\n\n⚠️ ${anomalies.length} anomalies require attention:\n${anomalies.map(a => `• ${a.description} (${a.severity})`).join('\n')}`
  : ''
}
`;
```

## Response Structure

### AgentResponse

```typescript
interface AgentResponse {
  message: string;                  // Natural language summary
  tools_used: string[];            // Tools executed
  data?: any;                      // Raw execution results (optional)
  analysis?: Analysis;             // Full analysis (optional)
  metadata: ResponseMetadata;      // Request metadata
}

interface ResponseMetadata {
  request_id: string;              // UUID for tracking
  total_duration_ms: number;       // Total execution time
  timestamp: string;               // ISO timestamp
  error: boolean;                  // Error flag
}
```

### Complete Response Example

```typescript
{
  message: "Found 3 contaminated shipments from last week. High contamination rate: 60% of shipments have contaminants. Most common contaminant: Lead (2 occurrences). Immediate attention required for 1 critical item.",
  
  tools_used: ["shipments_list", "contaminants_list"],
  
  data: [
    { id: "S1", has_contaminants: true, ... },
    { id: "S2", has_contaminants: true, ... },
    { id: "S3", has_contaminants: true, ... }
  ],
  
  analysis: {
    summary: "Analyzed 2 tool executions",
    insights: [
      { type: "trend", description: "High contamination rate: 60%", confidence: 0.9 }
    ],
    entities: [
      { id: "S1", type: "shipment", ... },
      { id: "S2", type: "shipment", ... },
      { id: "S3", type: "shipment", ... }
    ],
    anomalies: [
      { type: "threshold_exceeded", description: "Critical contamination in S1", severity: "critical" }
    ]
  },
  
  metadata: {
    request_id: "550e8400-e29b-41d4-a716-446655440000",
    total_duration_ms: 3245,
    timestamp: "2025-10-12T06:00:00.000Z",
    error: false
  }
}
```

## Summarization Examples

### Example 1: Data-Only Response (No Insights)

**Input**:
```typescript
analysis = {
  summary: "Query executed successfully",
  insights: [],
  entities: [
    { id: "S1", type: "shipment", ... },
    { id: "S2", type: "shipment", ... }
  ],
  anomalies: []
};
```

**Output**:
```
"Found 2 shipments matching your query. No significant patterns or anomalies detected in the data."
```

### Example 2: Insights with Anomalies

**Input**:
```typescript
analysis = {
  insights: [
    { type: "trend", description: "Contamination increasing", confidence: 0.9 }
  ],
  anomalies: [
    { type: "critical", description: "F1 at 95% contamination", severity: "critical" }
  ]
};
```

**Output**:
```
"Analysis shows contamination rates are increasing (confidence: 90%).

⚠️ CRITICAL: Facility F1 is experiencing 95% contamination rate, well above normal levels. Immediate action required."
```

### Example 3: Complex Multi-Tool Analysis

**Input**:
```typescript
query = "Which carriers have highest contamination rates?";
analysis = {
  insights: [
    { type: "comparison", description: "CarrierA: 45% rate vs CarrierB: 15% rate", confidence: 0.92 },
    { type: "pattern", description: "CarrierA primarily serves Berlin facilities", confidence: 0.85 }
  ]
};
tools = ["shipments_list"];
```

**Output**:
```
"Analysis of carrier performance reveals significant differences. CarrierA has a contamination rate of 45%, triple that of CarrierB's 15% (confidence: 92%). 

Notably, CarrierA primarily serves Berlin facilities, which may contribute to the elevated contamination rates. This suggests either regional waste source issues or carrier handling practices require investigation."
```

### Example 4: Time-Series Analysis

**Input**:
```typescript
query = "Show me contaminant trends over past 30 days";
analysis = {
  insights: [
    { type: "trend", description: "25% increase in contamination week-over-week", confidence: 0.88 },
    { type: "pattern", description: "Lead contamination doubled in last 2 weeks", confidence: 0.91 }
  ]
};
```

**Output**:
```
"Contaminant trends over the past 30 days show concerning patterns. Overall contamination has increased 25% week-over-week (confidence: 88%). 

Particularly notable is the doubling of Lead contamination in the last 2 weeks (confidence: 91%), suggesting an emerging systematic issue requiring root cause analysis."
```

## API Reference

### SummarizerAgent Class

```typescript
class SummarizerAgent {
  constructor(
    llm: LLMProvider,
    config?: Partial<SummarizerConfig>
  );

  async summarize(
    query: string,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<AgentResponse>;
}
```

### Configuration

```typescript
interface SummarizerConfig {
  format: "plain" | "markdown" | "json";       // Default: "plain"
  tone: "professional" | "technical" | "casual"; // Default: "professional"
  maxLength: number;                           // Default: 500
  includeSupportingData: boolean;              // Default: true
}
```

## Code Examples

### Error Handling

```typescript
try {
  const response = await summarizer.summarize(query, analysis, tools);
  return response;
} catch (error) {
  console.error('Summarization failed:', error);
  
  // Fallback: return basic summary
  return {
    message: `Query completed with ${analysis.insights.length} insights found.`,
    tools_used: tools,
    analysis,
    metadata: { /* ... */ }
  };
}
```

### Custom Templates

```typescript
// Override default templates
class CustomSummarizer extends SummarizerAgent {
  protected buildTemplateSummary(analysis: Analysis): string {
    // Custom template logic
    return `
      🔍 Query Analysis Complete
      
      📊 Metrics:
      - Insights: ${analysis.insights.length}
      - Entities: ${analysis.entities.length}
      - Anomalies: ${analysis.anomalies.length}
      
      💡 Top Insight: ${analysis.insights[0]?.description || 'None'}
    `;
  }
}

const customSummarizer = new CustomSummarizer(llm);
```

### Integration with Orchestrator

```typescript
// Summarizer is automatically used by Orchestrator
const response = await orchestrator.handleQuery("Get contaminated shipments");

// Orchestrator internally:
// 1. Plans query
// 2. Executes plan
// 3. Analyzes results
// 4. Summarizes with Summarizer ← We are here
// 5. Returns response
```

## Testing

See comprehensive test outputs in [Testing Guide](./testing.md#summarizer-integration-tests).

**Test Coverage**:
- ✅ Real LLM summarization
- ✅ Complex analysis handling
- ✅ Response quality validation
- ✅ Plain text formatting
- ✅ Markdown formatting
- ✅ Professional tone
- ✅ Technical tone
- ✅ Casual tone
- ✅ No-insights handling
- ✅ Many-insights organization
- ✅ LLM fallback mechanisms

## Best Practices

### 1. Choose Appropriate Format

```typescript
// For user-facing: plain text
const userSummarizer = new SummarizerAgent(llm, {
  format: "plain",
  tone: "professional"
});

// For documentation: markdown
const docsSummarizer = new SummarizerAgent(llm, {
  format: "markdown",
  tone: "technical"
});

// For APIs: JSON
const apiSummarizer = new SummarizerAgent(llm, {
  format: "json",
  tone: "technical"
});
```

### 2. Match Tone to Audience

```typescript
// Executive summary: professional
"The analysis indicates systematic quality issues requiring strategic intervention."

// Engineering report: technical
"Contamination rate: μ=0.35, σ=0.12, p<0.01, statistically significant."

// Dashboard: casual
"Looks like we've got some contamination issues - 35% of shipments affected."
```

### 3. Handle Edge Cases

```typescript
// Empty results
if (analysis.insights.length === 0 && analysis.entities.length === 0) {
  return "No data found matching your query criteria.";
}

// Only errors
if (analysis.metadata.successful_results === 0) {
  return "Unable to retrieve data. Please check your query parameters and try again.";
}

// Partial results
if (analysis.metadata.failed_results > 0) {
  message += `\n\nNote: ${analysis.metadata.failed_results} tool(s) failed to execute. Results may be incomplete.`;
}
```

## Troubleshooting

### Generic/Unhelpful Summaries

**Issue**: Summaries are too generic or don't answer the query

**Solutions**:
1. Include more context in analysis
2. Use LLM-based summarization (`useLLM: true`)
3. Provide clearer query to Orchestrator
4. Check analysis has meaningful insights

### Too Long/Too Short

**Issue**: Responses don't match expected length

**Solutions**:
1. Adjust `maxLength` configuration
2. Use different tone (technical = longer, casual = shorter)
3. Filter insights by confidence before summarizing
4. Use custom templates for specific length requirements

### LLM Failures

**Issue**: LLM summarization fails frequently

**Solutions**:
1. Check OPENAI_API_KEY is valid
2. Verify rate limits not exceeded
3. Increase retry logic in LLM provider
4. Template fallback should handle automatically

## Related Documentation

- [Analyzer Agent](./analyzer.md) - Provides input for Summarizer
- [Orchestrator Agent](./orchestrator.md) - Uses Summarizer in pipeline
- [Testing Guide](./testing.md) - See Summarizer integration test outputs
- [Integration Guide](./integration.md) - Set up Summarizer in your app

