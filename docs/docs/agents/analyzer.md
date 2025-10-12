---
sidebar_position: 4
---

# Analyzer Agent

The Analyzer Agent processes tool execution results to extract insights, detect anomalies, identify patterns, and perform statistical analysis using both rule-based algorithms and LLM-powered intelligence.

## What It Does

The Analyzer Agent is the third stage of the agent pipeline:

```
Tool Results → ANALYZER → Insights + Entities + Anomalies
```

**Input**: Array of ToolResult objects from Executor  
**Output**: Analysis with insights, entities, anomalies, and summary

## Analysis Methods

### Rule-Based Analysis (Fast)

Predefined algorithms for common patterns:
- **Statistical methods**: Mean, median, std deviation, outliers
- **Pattern matching**: Regex and rule-based detection
- **Threshold checking**: Configurable limits
- **Entity extraction**: ID and relationship parsing

**Performance**: 200-500ms  
**Use case**: Real-time dashboards, high-frequency queries

### LLM-Based Analysis (Intelligent)

AI-powered analysis for complex interpretation:
- **Natural language insights**: Contextual understanding
- **Pattern discovery**: Unexpected correlations
- **Semantic analysis**: Meaning extraction
- **Adaptive learning**: Improves with usage

**Performance**: 1-3 seconds  
**Use case**: Reports, investigations, complex queries

### Hybrid Approach (Recommended)

Combines both methods:
```typescript
// Rule-based for fast patterns
const ruleInsights = detectPatterns(data);

// LLM for complex interpretation
const llmInsights = await generateInsightsWithLLM(data);

// Merge and deduplicate
const allInsights = [...ruleInsights, ...llmInsights];
```

## Configuration Options

```typescript
interface AnalyzerConfig {
  anomalyThreshold: number;           // Std deviations from mean (default: 2.0)
  minConfidence: number;             // Min confidence for insights (default: 0.7)
  useLLM: boolean;                   // Use LLM analysis (default: true)
  enableStatisticalAnalysis: boolean; // Enable stats (default: true)
}

// Create with custom config
const analyzer = new AnalyzerAgent(llm, {
  anomalyThreshold: 1.5,     // More sensitive
  minConfidence: 0.8,        // Higher quality insights
  useLLM: true,              // Use LLM
  enableStatisticalAnalysis: true
});
```

## Insight Generation

### Insight Types

```typescript
type InsightType = 
  | "trend"        // Patterns over time
  | "pattern"      // Recurring observations
  | "correlation"  // Relationships between metrics
  | "comparison";  // Relative differences
```

### Insight Structure

```typescript
interface Insight {
  type: InsightType;
  description: string;           // Human-readable description
  confidence: number;            // 0.0 to 1.0
  supporting_data: any[];       // Evidence for insight
}
```

### Rule-Based Insight Examples

#### Contamination Rate Analysis

```typescript
// Input: Shipments data
const shipments = [
  { id: "S1", has_contaminants: true },
  { id: "S2", has_contaminants: true },
  { id: "S3", has_contaminants: false }
];

// Generated Insight:
{
  type: "trend",
  description: "High contamination rate: 66.7% of shipments have contaminants",
  confidence: 0.9,
  supporting_data: [
    { contaminated: 2, total: 3, rate: 0.667 }
  ]
}
```

#### Rejection Rate Analysis

```typescript
// Input: Shipments data
const shipments = [
  { id: "S1", status: "rejected" },
  { id: "S2", status: "rejected" },
  { id: "S3", status: "delivered" },
  { id: "S4", status: "delivered" }
];

// Generated Insight:
{
  type: "pattern",
  description: "High rejection rate: 50.0% of shipments were rejected",
  confidence: 0.85,
  supporting_data: [
    { rejected: 2, delivered: 2, pending: 0, in_transit: 0 }
  ]
}
```

#### Risk Level Distribution

```typescript
// Input: Contaminants data
const contaminants = [
  { id: "C1", risk_level: "critical" },
  { id: "C2", risk_level: "high" },
  { id: "C3", risk_level: "high" }
];

// Generated Insight:
{
  type: "pattern",
  description: "Found 3 high-risk contaminants requiring immediate attention",
  confidence: 1.0,
  supporting_data: [
    { low: 0, medium: 0, high: 2, critical: 1 }
  ]
}
```

### LLM-Based Insight Examples

```typescript
// Input: Complex multi-tool results
const results = [
  {
    tool: "shipments_list",
    data: [/* shipment data */]
  },
  {
    tool: "facilities_list",
    data: [/* facility data */]
  }
];

// LLM Generated Insights:
[
  {
    type: "correlation",
    description: "Berlin facilities show 40% higher contamination rates compared to Munich, suggesting regional waste source quality issues",
    confidence: 0.82,
    supporting_data: []
  },
  {
    type: "trend",
    description: "Contamination incidents increased 25% week-over-week, with Lead being the primary contributor",
    confidence: 0.88,
    supporting_data: []
  }
]
```

## Anomaly Detection Methods

### Statistical Anomaly Detection

Uses z-score method to find outliers:

```typescript
// Algorithm
function detectOutliers(values: number[], threshold: number): number[] {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return values.filter(v => {
    const zScore = Math.abs((v - mean) / stdDev);
    return zScore > threshold;  // Default: 2.0 std deviations
  });
}
```

### Anomaly Types

```typescript
type AnomalyType =
  | "threshold_exceeded"  // Value exceeds safe limit
  | "outlier"            // Statistical outlier
  | "unexpected"         // Logically unexpected
  | "pattern_break";     // Deviation from norm
```

### Anomaly Structure

```typescript
interface Anomaly {
  type: AnomalyType;
  description: string;           // What's wrong
  severity: "low" | "medium" | "high" | "critical";
  affected_entities: string[];  // IDs of affected items
  data: any;                    // Supporting evidence
}
```

### Anomaly Detection Examples

#### Critical Contaminants

```typescript
// Input: Contaminants with risk levels
const contaminants = [
  { id: "C1", risk_level: "critical", shipment_id: "S1" },
  { id: "C2", risk_level: "critical", shipment_id: "S2" }
];

// Detected Anomaly:
{
  type: "threshold_exceeded",
  description: "Critical contamination detected in 2 shipments",
  severity: "critical",
  affected_entities: ["S1", "S2"],
  data: [/* contaminant details */]
}
```

#### Concentration Outliers

```typescript
// Input: Contaminant concentrations
const concentrations = [100, 105, 98, 102, 500, 95];
//                                       ^^^
//                                     Outlier!

// Detected Anomaly:
{
  type: "outlier",
  description: "Detected 1 contaminant with unusually high concentration",
  severity: "high",
  affected_entities: ["C5"],
  data: {
    outliers: [{ id: "C5", concentration_ppm: 500 }],
    mean: 150,
    stdDev: 156
  }
}
```

#### Unexpected Rejections

```typescript
// Input: Rejected shipments without contaminants
const shipments = [
  { id: "S1", status: "rejected", has_contaminants: false },
  { id: "S2", status: "rejected", has_contaminants: false }
];

// Detected Anomaly:
{
  type: "unexpected",
  description: "2 shipments rejected without detected contaminants",
  severity: "medium",
  affected_entities: ["S1", "S2"],
  data: [/* shipment details */]
}
```

## Entity Extraction

### Entity Types

```typescript
type EntityType = 
  | "shipment"
  | "facility"
  | "contaminant"
  | "inspection"
  | "carrier"
  | "location";
```

### Entity Structure

```typescript
interface Entity {
  id: string;                    // Unique identifier
  type: EntityType;
  name: string;                  // Display name
  attributes: any;               // Full object data
  relationships: Relationship[]; // Connections to other entities
}

interface Relationship {
  type: string;                  // Relationship type
  target_entity_id: string;      // Connected entity
}
```

### Entity Extraction Examples

#### From Shipments

```typescript
// Input: Shipment data
const shipment = {
  id: "S1",
  facility_id: "F1",
  carrier: "EcoTrans GmbH",
  destination: "Hannover"
};

// Extracted Entities:
[
  {
    id: "S1",
    type: "shipment",
    name: "S1",
    attributes: { /* full shipment */ },
    relationships: [
      { type: "located_at", target_entity_id: "F1" }
    ]
  }
]
```

#### From Multiple Tools

```typescript
// Input: Multi-tool results
const results = [
  { tool: "shipments_list", data: [{ id: "S1", facility_id: "F1" }] },
  { tool: "facilities_list", data: [{ id: "F1", name: "Berlin Plant" }] },
  { tool: "contaminants_list", data: [{ id: "C1", shipment_id: "S1" }] }
];

// Extracted Entities:
[
  { id: "S1", type: "shipment", ... },
  { id: "F1", type: "facility", ... },
  { id: "C1", type: "contaminant", ... }
]

// With Relationships:
// S1 → located_at → F1
// C1 → belongs_to → S1
```

## Statistical Analysis Methods

### Descriptive Statistics

```typescript
// Calculate basic statistics
function calculateStats(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(values.length / 2)];
  
  const variance = values.reduce(
    (sum, v) => sum + Math.pow(v - mean, 2), 
    0
  ) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return { mean, median, stdDev, min: sorted[0], max: sorted[sorted.length - 1] };
}
```

### Outlier Detection (Z-Score Method)

```typescript
// Z-score formula: z = (x - μ) / σ
// Where: x = value, μ = mean, σ = standard deviation

function detectOutliers(
  values: number[], 
  threshold: number = 2.0
): { outliers: number[], zScores: number[] } {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  );

  const zScores = values.map(v => Math.abs((v - mean) / stdDev));
  const outliers = values.filter((v, i) => zScores[i] > threshold);

  return { outliers, zScores };
}

// Example:
const concentrations = [100, 105, 98, 102, 500, 95];
const { outliers } = detectOutliers(concentrations, 2.0);
// → outliers = [500]
```

### Confidence Scoring

Confidence scores reflect insight reliability:

```typescript
function calculateConfidence(insight: Insight): number {
  let confidence = 0.5;  // Base

  // Increase confidence with:
  // 1. Larger sample size
  if (sampleSize > 100) confidence += 0.2;
  else if (sampleSize > 50) confidence += 0.1;
  
  // 2. Stronger statistical significance
  if (pValue < 0.01) confidence += 0.2;
  else if (pValue < 0.05) confidence += 0.1;
  
  // 3. Consistent patterns
  if (consistency > 0.9) confidence += 0.1;
  
  // 4. Multiple data sources
  if (toolCount > 2) confidence += 0.1;

  return Math.min(confidence, 1.0);
}
```

## Configuration

```typescript
// Rule-based analyzer (fast)
const ruleAnalyzer = new AnalyzerAgent(llm, {
  useLLM: false,
  enableStatisticalAnalysis: true,
  anomalyThreshold: 2.0,
  minConfidence: 0.7
});

// LLM-based analyzer (intelligent)
const llmAnalyzer = new AnalyzerAgent(llm, {
  useLLM: true,
  enableStatisticalAnalysis: true,
  anomalyThreshold: 2.0,
  minConfidence: 0.7
});

// Hybrid analyzer (balanced)
const hybridAnalyzer = new AnalyzerAgent(llm, {
  useLLM: true,              // Try LLM first
  enableStatisticalAnalysis: true,  // Fallback to rules
  anomalyThreshold: 2.0,
  minConfidence: 0.8         // Higher quality threshold
});
```

## Analysis Examples

### Example 1: Shipment Analysis

**Input**:
```typescript
const results = [{
  success: true,
  tool: "shipments_list",
  data: [
    { id: "S1", has_contaminants: true, status: "rejected", weight_kg: 100 },
    { id: "S2", has_contaminants: true, status: "rejected", weight_kg: 150 },
    { id: "S3", has_contaminants: false, status: "delivered", weight_kg: 200 }
  ]
}];
```

**Output**:
```typescript
{
  summary: "Analyzed 1 tool executions. Found 2 insights. Extracted 3 entities. Detected 1 anomalies.",
  insights: [
    {
      type: "trend",
      description: "High contamination rate: 66.7% of shipments have contaminants",
      confidence: 0.9,
      supporting_data: [{ contaminated: 2, total: 3, rate: 0.667 }]
    },
    {
      type: "pattern",
      description: "High rejection rate: 66.7% of shipments were rejected",
      confidence: 0.85,
      supporting_data: [{ rejected: 2, delivered: 1, ... }]
    }
  ],
  entities: [
    { id: "S1", type: "shipment", name: "S1", attributes: {...}, relationships: [...] },
    { id: "S2", type: "shipment", name: "S2", attributes: {...}, relationships: [...] },
    { id: "S3", type: "shipment", name: "S3", attributes: {...}, relationships: [...] }
  ],
  anomalies: [],
  metadata: {
    tool_results_count: 1,
    successful_results: 1,
    failed_results: 0,
    analysis_time_ms: 245
  }
}
```

### Example 2: Contaminant Analysis

**Input**:
```typescript
const results = [{
  success: true,
  tool: "contaminants_list",
  data: [
    { id: "C1", type: "Lead", risk_level: "critical", concentration_ppm: 500 },
    { id: "C2", type: "Mercury", risk_level: "high", concentration_ppm: 300 },
    { id: "C3", type: "Lead", risk_level: "medium", concentration_ppm: 100 }
  ]
}];
```

**Output**:
```typescript
{
  summary: "Analyzed 1 tool executions. Found 2 insights. Extracted 3 entities. Detected 1 anomalies.",
  insights: [
    {
      type: "pattern",
      description: "Found 2 high-risk contaminants requiring immediate attention",
      confidence: 1.0,
      supporting_data: [{ low: 0, medium: 1, high: 1, critical: 1 }]
    },
    {
      type: "pattern",
      description: "Most common contaminant: Lead (2 occurrences)",
      confidence: 0.9,
      supporting_data: [{ Lead: 2, Mercury: 1 }]
    }
  ],
  entities: [
    { id: "C1", type: "contaminant", ...},
    { id: "C2", type: "contaminant", ... },
    { id: "C3", type: "contaminant", ... }
  ],
  anomalies: [
    {
      type: "threshold_exceeded",
      description: "Critical contamination detected in 1 shipments",
      severity: "critical",
      affected_entities: ["S1"],
      data: [/* critical contaminant details */]
    }
  ]
}
```

### Example 3: Facility Capacity Analysis

**Input**:
```typescript
const results = [{
  success: true,
  tool: "facilities_list",
  data: [
    { id: "F1", name: "Berlin Plant", capacity_tons: 100, current_load_tons: 95 },
    { id: "F2", name: "Munich Center", capacity_tons: 150, current_load_tons: 140 },
    { id: "F3", name: "Hamburg Facility", capacity_tons: 80, current_load_tons: 50 }
  ]
}];
```

**Output**:
```typescript
{
  insights: [
    {
      type: "pattern",
      description: "2 facilities operating above 90% capacity",
      confidence: 0.95,
      supporting_data: [
        { name: "Berlin Plant", utilization: 0.95 },
        { name: "Munich Center", utilization: 0.93 }
      ]
    }
  ],
  anomalies: [
    {
      type: "threshold_exceeded",
      description: "2 facilities near capacity limit",
      severity: "high",
      affected_entities: ["F1", "F2"],
      data: { /* capacity details */ }
    }
  ]
}
```

### Example 4: Multi-Tool Analysis

**Input**:
```typescript
const results = [
  {
    tool: "shipments_list",
    data: [
      { id: "S1", has_contaminants: true, facility_id: "F1", carrier: "CarrierA" },
      { id: "S2", has_contaminants: true, facility_id: "F1", carrier: "CarrierA" }
    ]
  },
  {
    tool: "facilities_list",
    data: [
      { id: "F1", name: "Berlin Plant", capacity_tons: 100, current_load_tons: 95 }
    ]
  }
];
```

**Output**:
```typescript
{
  insights: [
    {
      type: "correlation",
      description: "CarrierA shipments to F1 show 100% contamination rate",
      confidence: 0.92,
      supporting_data: []
    },
    {
      type: "pattern",
      description: "F1 is at 95% capacity and receiving contaminated shipments",
      confidence: 0.88,
      supporting_data: []
    }
  ],
  entities: [
    { id: "S1", type: "shipment", relationships: [{ type: "located_at", target_entity_id: "F1" }] },
    { id: "S2", type: "shipment", relationships: [{ type: "located_at", target_entity_id: "F1" }] },
    { id: "F1", type: "facility", ... }
  ]
}
```

## Pattern Recognition

### Contamination Patterns

```typescript
// Detects:
// 1. High contamination rates (>30%)
// 2. Increasing contamination trends
// 3. Facility-specific patterns
// 4. Carrier-specific patterns
// 5. Waste-type patterns

analyzeShipments(shipments) {
  // Contamination rate
  const contamRate = shipments.filter(s => s.has_contaminants).length / shipments.length;
  if (contamRate > 0.3) {
    insights.push({
      type: "trend",
      description: `High contamination rate: ${(contamRate * 100).toFixed(1)}%`,
      confidence: 0.9
    });
  }

  // By facility
  const byFacility = groupBy(shipments, 'facility_id');
  for (const [facilityId, ships] of byFacility) {
    const facilityRate = ships.filter(s => s.has_contaminants).length / ships.length;
    if (facilityRate > 0.5) {
      insights.push({
        type: "pattern",
        description: `Facility ${facilityId} has ${(facilityRate * 100).toFixed(1)}% contamination rate`,
        confidence: 0.85
      });
    }
  }
}
```

### Capacity Patterns

```typescript
// Detects:
// 1. Over-utilized facilities (>90%)
// 2. Under-utilized facilities (<30%)
// 3. Capacity trends

analyzeFacilities(facilities) {
  const overUtilized = facilities.filter(f => 
    f.current_load_tons / f.capacity_tons > 0.9
  );

  if (overUtilized.length > 0) {
    insights.push({
      type: "pattern",
      description: `${overUtilized.length} facilities operating above 90% capacity`,
      confidence: 0.95,
      supporting_data: overUtilized.map(f => ({
        name: f.name,
        utilization: f.current_load_tons / f.capacity_tons
      }))
    });
  }
}
```

### Risk Assessment

```typescript
// Risk level distribution
function assessRisk(contaminants) {
  const riskCounts = {
    low: contaminants.filter(c => c.risk_level === 'low').length,
    medium: contaminants.filter(c => c.risk_level === 'medium').length,
    high: contaminants.filter(c => c.risk_level === 'high').length,
    critical: contaminants.filter(c => c.risk_level === 'critical').length
  };

  const totalRisk = (
    riskCounts.low * 1 +
    riskCounts.medium * 2 +
    riskCounts.high * 3 +
    riskCounts.critical * 4
  );

  const avgRisk = totalRisk / contaminants.length;

  return {
    distribution: riskCounts,
    averageRisk: avgRisk,
    severity: avgRisk > 3 ? 'critical' : avgRisk > 2 ? 'high' : 'medium'
  };
}
```

## API Reference

### AnalyzerAgent Class

```typescript
class AnalyzerAgent {
  constructor(
    llm: LLMProvider,
    config?: Partial<AnalyzerConfig>
  );

  async analyze(results: ToolResult[]): Promise<Analysis>;
}
```

### Methods

#### `analyze(results)`

Analyzes tool execution results to generate insights.

**Parameters**:
- `results` (ToolResult[]): Results from Executor

**Returns**: `Promise<Analysis>`

**Example**:
```typescript
const analysis = await analyzer.analyze(executorResults);

console.log(analysis.summary);
console.log('Insights:', analysis.insights.length);
console.log('Anomalies:', analysis.anomalies.length);
console.log('Entities:', analysis.entities.length);
```

## Code Examples

### Basic Usage

```typescript
import { AnalyzerAgent } from './agents/analyzer.js';
import { LLMProvider } from './shared/llm/provider.js';

const llm = new LLMProvider(getLLMConfigs());
const analyzer = new AnalyzerAgent(llm);

const results = [/* executor results */];
const analysis = await analyzer.analyze(results);

console.log('Summary:', analysis.summary);
analysis.insights.forEach(insight => {
  console.log(`${insight.type}: ${insight.description} (${insight.confidence})`);
});
```

### Rule-Based Analysis Only

```typescript
// Fast analysis without LLM calls
const analyzer = new AnalyzerAgent(llm, { useLLM: false });

const analysis = await analyzer.analyze(results);
// Returns in 200-300ms vs 2-3s with LLM
```

### Custom Anomaly Threshold

```typescript
// More sensitive outlier detection
const sensitiveAnalyzer = new AnalyzerAgent(llm, {
  anomalyThreshold: 1.5  // 1.5 std deviations vs default 2.0
});

const analysis = await sensitiveAnalyzer.analyze(results);
// Will detect more outliers
```

### Handle Empty Results

```typescript
const emptyResults = [{
  success: true,
  tool: "shipments_list",
  data: []  // No data
}];

const analysis = await analyzer.analyze(emptyResults);

console.log(analysis.summary);
// → "No data found to analyze"

console.log(analysis.insights);
// → []
```

### Handle Failed Results

```typescript
const failedResults = [{
  success: false,
  tool: "shipments_list",
  error: { code: "TIMEOUT", message: "Request timeout" }
}];

const analysis = await analyzer.analyze(failedResults);

console.log(analysis.summary);
// → "No successful results to analyze"

console.log(analysis.metadata.failed_results);
// → 1
```

## Testing

See comprehensive test outputs in [Testing Guide](./testing.md#analyzer-integration-tests).

**Test Coverage**:
- ✅ Real data analysis
- ✅ Contaminant anomaly detection
- ✅ LLM-based insights
- ✅ Multi-tool analysis
- ✅ Large datasets (50+ records)
- ✅ Statistical edge cases
- ✅ Anomaly thresholds
- ✅ Entity extraction
- ✅ Confidence scoring
- ✅ Empty/failed results

## Troubleshooting

### No Insights Generated

**Issue**: `analysis.insights.length === 0`

**Solutions**:
1. Check data is not empty: `results[0].data.length > 0`
2. Lower `minConfidence` threshold
3. Enable LLM analysis: `useLLM: true`
4. Check data has analyzable patterns
5. Verify tool results have expected fields

### Low Confidence Scores

**Issue**: All insights have low confidence (below 0.7)

**Solutions**:
1. Increase sample size (more data)
2. Check data quality (outliers, nulls)
3. Enable statistical analysis
4. Use LLM for better context understanding

### Too Many Anomalies

**Issue**: Anomalies detected everywhere

**Solutions**:
1. Increase `anomalyThreshold` (e.g., 3.0 instead of 2.0)
2. Review data for actual outliers
3. Check if data distribution is non-normal
4. Filter low-severity anomalies in post-processing

## Related Documentation

- [Executor Agent](./executor.md) - Provides results for Analyzer
- [Summarizer Agent](./summarizer.md) - Uses Analyzer output
- [Orchestrator Agent](./orchestrator.md) - Coordinates Analyzer in pipeline
- [Testing Guide](./testing.md) - See Analyzer integration test outputs

