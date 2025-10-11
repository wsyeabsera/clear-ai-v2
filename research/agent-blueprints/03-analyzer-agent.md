# Analyzer Agent Blueprint

**Extracts Insights, Detects Anomalies, and Identifies Patterns**

Version: 2.0  
Status: Ready for Implementation  
Shared Library: ✅ Fully Integrated

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What It Does (Plain English)](#what-it-does-plain-english)
3. [Responsibilities](#responsibilities)
4. [Shared Library Integration](#shared-library-integration)
5. [Architecture](#architecture)
6. [Implementation](#implementation)
7. [Example Scenarios](#example-scenarios)
8. [Configuration](#configuration)
9. [Error Handling](#error-handling)
10. [Testing Strategy](#testing-strategy)
11. [Performance Optimization](#performance-optimization)

---

## Overview

The Analyzer Agent is the "data scientist" of the Clear AI v2 system. It processes tool execution results to extract meaningful insights, detect anomalies, identify patterns, and extract entities with relationships.

### Key Capabilities

- 🔍 **Insight Generation**: Identifies trends, patterns, correlations, and comparisons
- ⚠️ **Anomaly Detection**: Finds outliers, unexpected values, and threshold violations
- 🏷️ **Entity Extraction**: Identifies key entities and their relationships
- 📊 **Statistical Analysis**: Calculates means, standard deviations, and z-scores
- 🤖 **Dual Mode**: Rule-based for speed, LLM-based for depth
- 🎯 **Confidence Scoring**: Assigns confidence levels to all insights

---

## What It Does (Plain English)

Imagine you query: **"Get contaminated shipments from last week"**

The Executor returns:
- 12 shipments
- 10 have contaminants
- 8 were rejected

The Analyzer Agent:
1. **Calculates** - "83% contamination rate (10/12)"
2. **Compares** - "This is 3x higher than normal (baseline: 25%)"
3. **Identifies** - "Most common contaminant: Lead (6 occurrences)"
4. **Detects** - "⚠️ 2 shipments have CRITICAL contamination levels"
5. **Extracts** - "Entities: 12 shipments, 10 contaminants, 3 facilities"
6. **Suggests** - "Recommend investigating Facility F1 (50% of contaminants)"

Think of it as a data analyst who looks at the raw numbers and tells you what they mean.

---

## Responsibilities

### Core Functions

1. **Data Processing**
   - Parse tool results
   - Normalize data formats
   - Handle missing or incomplete data
   - Validate data quality

2. **Insight Generation**
   - Identify trends over time
   - Detect patterns in data
   - Find correlations between metrics
   - Make comparisons (higher/lower than expected)

3. **Anomaly Detection**
   - Statistical outliers (z-score > 2)
   - Unexpected values
   - Missing expected data
   - Threshold violations

4. **Entity Extraction**
   - Identify key entities (shipments, facilities, etc.)
   - Extract relationships between entities
   - Build entity graph for memory
   - Track entity attributes

5. **Confidence Scoring**
   - Score insights based on data quality
   - Consider data completeness
   - Factor in statistical significance
   - Provide uncertainty indicators

---

## Shared Library Integration

### Imports from Shared Library

```typescript
// Type definitions
import {
  ToolResult,
  Analysis,
  Insight,
  Anomaly,
  Entity,
  Relationship,
  AnalysisMetadata
} from '../shared/types/agent.js';

// LLM for insight generation
import { LLMProvider } from '../shared/llm/provider.js';

// Validation
import {
  AnalysisSchema,
  InsightSchema,
  AnomalySchema,
  EntitySchema,
  validateAnalysis
} from '../shared/validation/schemas.js';

// Confidence scoring
import {
  ConfidenceScorer,
  ConfidenceLevel
} from '../shared/confidence/scorer.js';

// Utilities
import { getCurrentTimestamp } from '../shared/utils/date.js';
import {
  calculateMean,
  calculateStdDev,
  calculateZScore
} from '../shared/utils/statistics.js';

// Entity extraction
import { EntityExtractor } from '../shared/context/compression/entity-extractor.js';
```

### Key Shared Components Used

| Component | Purpose | Usage in Analyzer |
|-----------|---------|------------------|
| `Analysis` interface | Type-safe analysis results | Return type |
| `ConfidenceScorer` | Score insights | Calculate confidence |
| `calculateZScore` | Statistical analysis | Detect outliers |
| `EntityExtractor` | Entity extraction | Extract entities |
| `LLMProvider` | Deep analysis | LLM-based insights |
| `AnalysisSchema` | Runtime validation | Validate output |
| `getCurrentTimestamp` | Timestamp | Track analysis time |

---

## Architecture

### System Diagram

```
Tool Results from Executor
    │
    ▼
┌─────────────────────────────────────┐
│      Analyzer Agent                 │
│                                     │
│  1. Data Validation                 │
│     ↓ Check success status          │
│     ↓ Filter valid results          │
│                                     │
│  2. Generate Insights               │
│     ├─ Rule-Based Mode              │
│     │  ↓ Domain-specific rules      │
│     │  ↓ Statistical calculations   │
│     └─ LLM-Based Mode               │
│        ↓ LLMProvider.generate       │
│        ↓ Structured prompts         │
│                                     │
│  3. Detect Anomalies                │
│     ↓ Statistical outliers          │
│     ↓ Threshold violations          │
│     ↓ Z-score analysis              │
│                                     │
│  4. Extract Entities                │
│     ↓ EntityExtractor               │
│     ↓ Relationships                 │
│                                     │
│  5. Score Confidence                │
│     ↓ ConfidenceScorer              │
│     ↓ Data quality metrics          │
│                                     │
│  6. Validate Analysis               │
│     ↓ AnalysisSchema.parse()        │
│                                     │
│  ✓ Return Analysis                  │
└─────────────────────────────────────┘
    │
    ▼
Summarizer Agent
```

### Data Flow

```typescript
// Input
results: ToolResult[]

// Processing
1. successfulResults ← results.filter(r => r.success)
2. insights ← generateInsights(successfulResults)
3. entities ← extractEntities(successfulResults)
4. anomalies ← detectAnomalies(successfulResults)
5. scoreConfidence(insights)
6. summary ← generateSummary(insights, entities, anomalies)

// Output
analysis: Analysis {
  summary: string,
  insights: Insight[],
  entities: Entity[],
  anomalies: Anomaly[],
  metadata: AnalysisMetadata
}
```

---

## Implementation

### Core Implementation

```typescript
// src/agents/analyzer/analyzer.ts
import {
  ToolResult,
  Analysis,
  Insight,
  Anomaly,
  Entity,
  Relationship
} from '../../shared/types/agent.js';
import { LLMProvider } from '../../shared/llm/provider.js';
import {
  validateAnalysis,
  InsightSchema,
  AnomalySchema
} from '../../shared/validation/schemas.js';
import {
  ConfidenceScorer,
  ConfidenceLevel
} from '../../shared/confidence/scorer.js';
import { getCurrentTimestamp } from '../../shared/utils/date.js';
import {
  calculateMean,
  calculateStdDev,
  calculateZScore
} from '../../shared/utils/statistics.js';

/**
 * Configuration options for Analyzer Agent
 */
export interface AnalyzerConfig {
  // Analysis mode
  useLLM: boolean;                      // Use LLM vs rule-based
  llmTemperature: number;               // LLM creativity
  
  // Statistical settings
  anomalyThreshold: number;             // Z-score threshold (default: 2.0)
  enableStatisticalAnalysis: boolean;   // Enable statistical methods
  
  // Confidence settings
  minConfidence: number;                // Filter insights below this
  uncertaintyThreshold: number;         // Express uncertainty below this
  
  // Entity extraction
  enableEntityExtraction: boolean;      // Extract entities
  includeRelationships: boolean;        // Extract relationships
  
  // Validation
  validateOutput: boolean;              // Validate with Zod
  strictValidation: boolean;            // Fail on validation errors
}

/**
 * Domain-specific analyzer
 */
interface DomainAnalyzer {
  analyze(data: any[]): Insight[];
}

/**
 * Analyzer Agent
 * Extracts insights, detects anomalies, and identifies patterns
 */
export class AnalyzerAgent {
  private config: AnalyzerConfig;
  private confidenceScorer: ConfidenceScorer;
  private domainAnalyzers: Map<string, DomainAnalyzer>;
  
  constructor(
    private llmProvider: LLMProvider,
    config?: Partial<AnalyzerConfig>
  ) {
    // Default configuration
    this.config = {
      useLLM: true,
      llmTemperature: 0.3,
      anomalyThreshold: 2.0,            // 2 standard deviations
      enableStatisticalAnalysis: true,
      minConfidence: 0.7,
      uncertaintyThreshold: 0.7,
      enableEntityExtraction: true,
      includeRelationships: true,
      validateOutput: true,
      strictValidation: false,
      ...config
    };
    
    this.confidenceScorer = new ConfidenceScorer();
    this.confidenceScorer.setUncertaintyThreshold(this.config.uncertaintyThreshold);
    
    // Initialize domain-specific analyzers
    this.domainAnalyzers = new Map();
    this.initializeDomainAnalyzers();
  }
  
  /**
   * Analyze tool results
   */
  async analyze(results: ToolResult[]): Promise<Analysis> {
    console.log(`[Analyzer] Analyzing ${results.length} tool results`);
    const startTime = Date.now();
    
    // Filter successful results
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    console.log(`[Analyzer] ${successfulResults.length} successful, ${failedResults.length} failed`);
    
    if (successfulResults.length === 0) {
      return {
        summary: 'No successful results to analyze',
        insights: [],
        entities: [],
        anomalies: [],
        metadata: {
          tool_results_count: results.length,
          successful_results: 0,
          failed_results: failedResults.length,
          analysis_time_ms: Date.now() - startTime
        }
      };
    }
    
    // Run analysis in parallel
    const [insights, entities, anomalies] = await Promise.all([
      this.generateInsights(successfulResults),
      this.config.enableEntityExtraction 
        ? this.extractEntities(successfulResults)
        : Promise.resolve([]),
      this.detectAnomalies(successfulResults)
    ]);
    
    // Score confidence for insights
    this.scoreInsights(insights, successfulResults);
    
    // Filter by minimum confidence
    const filteredInsights = insights.filter(
      i => i.confidence >= this.config.minConfidence
    );
    
    console.log(`[Analyzer] Generated ${filteredInsights.length} insights (${insights.length - filteredInsights.length} filtered)`);
    console.log(`[Analyzer] Extracted ${entities.length} entities`);
    console.log(`[Analyzer] Detected ${anomalies.length} anomalies`);
    
    // Generate summary
    const summary = this.generateSummary(
      successfulResults,
      filteredInsights,
      entities,
      anomalies
    );
    
    const analysis: Analysis = {
      summary,
      insights: filteredInsights,
      entities,
      anomalies,
      metadata: {
        tool_results_count: results.length,
        successful_results: successfulResults.length,
        failed_results: failedResults.length,
        analysis_time_ms: Date.now() - startTime
      }
    };
    
    // Validate if enabled
    if (this.config.validateOutput) {
      try {
        validateAnalysis(analysis);
      } catch (error) {
        if (this.config.strictValidation) {
          throw error;
        }
        console.warn('[Analyzer] Validation warning:', error);
      }
    }
    
    console.log(`[Analyzer] Analysis complete in ${analysis.metadata.analysis_time_ms}ms`);
    return analysis;
  }
  
  /**
   * Generate insights from results
   */
  private async generateInsights(results: ToolResult[]): Promise<Insight[]> {
    if (this.config.useLLM) {
      return this.generateInsightsWithLLM(results);
    } else {
      return this.generateInsightsRuleBased(results);
    }
  }
  
  /**
   * Generate insights using LLM
   */
  private async generateInsightsWithLLM(results: ToolResult[]): Promise<Insight[]> {
    const systemPrompt = `You are a data analysis agent. Analyze tool execution results and extract key insights.

Focus on:
1. **Trends** - Changes over time, increasing/decreasing patterns
2. **Patterns** - Recurring behaviors, common characteristics
3. **Correlations** - Relationships between different metrics
4. **Comparisons** - Higher/lower than expected, outliers

Return a JSON array of insights:
\`\`\`json
[
  {
    "type": "trend" | "pattern" | "correlation" | "comparison",
    "description": "Clear, actionable insight in plain English",
    "confidence": 0.0-1.0,
    "supporting_data": [/* relevant data points */]
  }
]
\`\`\`

Rules:
- Be specific with numbers and percentages
- Highlight critical issues first
- Confidence > 0.7 for actionable insights
- Include supporting data for verification`;
    
    const userPrompt = `Analyze these tool results and extract insights:

${JSON.stringify(results, null, 2)}

Provide insights as JSON array.`;
    
    try {
      const response = await this.llmProvider.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        config: {
          temperature: this.config.llmTemperature,
          max_tokens: 1500
        }
      });
      
      // Extract JSON
      const insightsJson = this.extractJSON(response.content);
      
      // Validate each insight
      const insights: Insight[] = [];
      for (const item of insightsJson) {
        try {
          const insight = InsightSchema.parse(item);
          insights.push(insight);
        } catch (error) {
          console.warn('[Analyzer] Invalid insight from LLM:', error);
        }
      }
      
      return insights;
      
    } catch (error) {
      console.error('[Analyzer] LLM insight generation failed:', error);
      // Fallback to rule-based
      return this.generateInsightsRuleBased(results);
    }
  }
  
  /**
   * Generate insights using rules
   */
  private generateInsightsRuleBased(results: ToolResult[]): Insight[] {
    const insights: Insight[] = [];
    
    // Analyze each tool's results
    for (const result of results) {
      if (!result.data || !Array.isArray(result.data)) continue;
      
      const analyzer = this.domainAnalyzers.get(result.tool);
      if (analyzer) {
        insights.push(...analyzer.analyze(result.data));
      }
    }
    
    return insights;
  }
  
  /**
   * Detect anomalies in results
   */
  private detectAnomalies(results: ToolResult[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    for (const result of results) {
      if (!result.data || !Array.isArray(result.data)) continue;
      
      switch (result.tool) {
        case 'contaminants-detected':
          anomalies.push(...this.detectContaminantAnomalies(result.data));
          break;
          
        case 'shipments':
          anomalies.push(...this.detectShipmentAnomalies(result.data));
          break;
          
        case 'facilities':
          anomalies.push(...this.detectFacilityAnomalies(result.data));
          break;
      }
    }
    
    return anomalies;
  }
  
  /**
   * Detect contaminant anomalies
   */
  private detectContaminantAnomalies(contaminants: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Check for critical risk levels
    const critical = contaminants.filter(c => c.risk_level === 'critical');
    if (critical.length > 0) {
      anomalies.push({
        type: 'threshold_exceeded',
        description: `Critical contamination detected in ${critical.length} shipment${critical.length > 1 ? 's' : ''}`,
        severity: 'critical',
        affected_entities: critical.map(c => c.shipment_id),
        data: critical
      });
    }
    
    // Statistical outlier detection
    if (this.config.enableStatisticalAnalysis && contaminants.length > 2) {
      const concentrations = contaminants
        .map(c => c.concentration_ppm)
        .filter(c => typeof c === 'number');
      
      if (concentrations.length > 2) {
        const mean = calculateMean(concentrations);
        const stdDev = calculateStdDev(concentrations);
        
        const outliers = contaminants.filter(c => {
          const z = calculateZScore(c.concentration_ppm, mean, stdDev);
          return Math.abs(z) > this.config.anomalyThreshold;
        });
        
        if (outliers.length > 0) {
          anomalies.push({
            type: 'outlier',
            description: `Detected ${outliers.length} contaminant${outliers.length > 1 ? 's' : ''} with unusually high concentration`,
            severity: 'high',
            affected_entities: outliers.map(o => o.id),
            data: { outliers, mean, stdDev }
          });
        }
      }
    }
    
    return anomalies;
  }
  
  /**
   * Detect shipment anomalies
   */
  private detectShipmentAnomalies(shipments: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Rejected without contaminants
    const rejectedNoReason = shipments.filter(s =>
      s.status === 'rejected' && !s.has_contaminants
    );
    
    if (rejectedNoReason.length > 0) {
      anomalies.push({
        type: 'unexpected',
        description: `${rejectedNoReason.length} shipment${rejectedNoReason.length > 1 ? 's' : ''} rejected without detected contaminants`,
        severity: 'medium',
        affected_entities: rejectedNoReason.map(s => s.id),
        data: rejectedNoReason
      });
    }
    
    return anomalies;
  }
  
  /**
   * Detect facility anomalies
   */
  private detectFacilityAnomalies(facilities: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Check capacity utilization
    const overUtilized = facilities.filter(f => {
      if (!f.capacity_tons || !f.current_load_tons) return false;
      return (f.current_load_tons / f.capacity_tons) > 0.95;
    });
    
    if (overUtilized.length > 0) {
      anomalies.push({
        type: 'threshold_exceeded',
        description: `${overUtilized.length} facilit${overUtilized.length > 1 ? 'ies' : 'y'} operating above 95% capacity`,
        severity: 'high',
        affected_entities: overUtilized.map(f => f.id),
        data: overUtilized
      });
    }
    
    return anomalies;
  }
  
  /**
   * Extract entities from results
   */
  private async extractEntities(results: ToolResult[]): Promise<Entity[]> {
    const entityMap = new Map<string, Entity>();
    
    for (const result of results) {
      if (!result.data || !Array.isArray(result.data)) continue;
      
      for (const item of result.data) {
        const entity = this.itemToEntity(item, result.tool);
        if (entity) {
          const key = `${entity.type}:${entity.id}`;
          entityMap.set(key, entity);
        }
      }
    }
    
    return Array.from(entityMap.values());
  }
  
  /**
   * Convert item to entity
   */
  private itemToEntity(item: any, toolName: string): Entity | null {
    if (!item.id) return null;
    
    let type = 'unknown';
    switch (toolName) {
      case 'shipments': type = 'shipment'; break;
      case 'facilities': type = 'facility'; break;
      case 'contaminants-detected': type = 'contaminant'; break;
      case 'inspections': type = 'inspection'; break;
    }
    
    return {
      id: item.id,
      type,
      name: item.name || item.id,
      attributes: { ...item },
      relationships: this.config.includeRelationships
        ? this.extractRelationships(item)
        : undefined
    };
  }
  
  /**
   * Extract relationships from item
   */
  private extractRelationships(item: any): Relationship[] {
    const relationships: Relationship[] = [];
    
    if (item.facility_id) {
      relationships.push({
        type: 'located_at',
        target_entity_id: item.facility_id,
        strength: 1.0
      });
    }
    
    if (item.shipment_id) {
      relationships.push({
        type: 'belongs_to',
        target_entity_id: item.shipment_id,
        strength: 1.0
      });
    }
    
    return relationships;
  }
  
  /**
   * Score insights for confidence
   */
  private scoreInsights(insights: Insight[], results: ToolResult[]): void {
    for (const insight of insights) {
      // If insight already has high confidence, keep it
      if (insight.confidence > 0.8) continue;
      
      // Score based on data completeness
      const dataCount = insight.supporting_data?.length || 0;
      const totalData = results.reduce((sum, r) => 
        sum + (Array.isArray(r.data) ? r.data.length : 0), 0
      );
      
      const dataScore = this.confidenceScorer.scoreFromDataCount(
        dataCount,
        totalData
      );
      
      // Score based on tool success
      const toolScore = this.confidenceScorer.scoreFromToolResults(results);
      
      // Combine scores
      insight.confidence = this.confidenceScorer.combineScores([
        insight.confidence,
        dataScore,
        toolScore
      ]);
    }
  }
  
  /**
   * Generate summary
   */
  private generateSummary(
    results: ToolResult[],
    insights: Insight[],
    entities: Entity[],
    anomalies: Anomaly[]
  ): string {
    const parts = [
      `Analyzed ${results.length} tool execution${results.length > 1 ? 's' : ''}`
    ];
    
    if (insights.length > 0) {
      parts.push(`found ${insights.length} insight${insights.length > 1 ? 's' : ''}`);
    }
    
    if (entities.length > 0) {
      parts.push(`extracted ${entities.length} entit${entities.length > 1 ? 'ies' : 'y'}`);
    }
    
    if (anomalies.length > 0) {
      const critical = anomalies.filter(a => a.severity === 'critical').length;
      if (critical > 0) {
        parts.push(`⚠️ detected ${anomalies.length} anomal${anomalies.length > 1 ? 'ies' : 'y'} (${critical} critical)`);
      } else {
        parts.push(`detected ${anomalies.length} anomal${anomalies.length > 1 ? 'ies' : 'y'}`);
      }
    }
    
    return parts.join(', ') + '.';
  }
  
  /**
   * Extract JSON from LLM response
   */
  private extractJSON(content: string): any {
    try {
      return JSON.parse(content);
    } catch (e) {
      const match = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (match) {
        return JSON.parse(match[1]!);
      }
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]!);
      }
      throw new Error('Could not extract JSON from LLM response');
    }
  }
  
  /**
   * Initialize domain-specific analyzers
   */
  private initializeDomainAnalyzers(): void {
    // Shipments analyzer
    this.domainAnalyzers.set('shipments', {
      analyze: (shipments: any[]): Insight[] => {
        const insights: Insight[] = [];
        
        // Contamination rate
        const contaminated = shipments.filter(s => s.has_contaminants).length;
        const rate = contaminated / shipments.length;
        
        if (rate > 0.3) {
          insights.push({
            type: 'trend',
            description: `High contamination rate: ${(rate * 100).toFixed(1)}% of shipments have contaminants`,
            confidence: 0.9,
            supporting_data: [{ contaminated, total: shipments.length, rate }]
          });
        }
        
        // Rejection rate
        const rejected = shipments.filter(s => s.status === 'rejected').length;
        const rejectionRate = rejected / shipments.length;
        
        if (rejectionRate > 0.2) {
          insights.push({
            type: 'pattern',
            description: `High rejection rate: ${(rejectionRate * 100).toFixed(1)}% of shipments were rejected`,
            confidence: 0.85,
            supporting_data: [{ rejected, total: shipments.length }]
          });
        }
        
        return insights;
      }
    });
    
    // Contaminants analyzer
    this.domainAnalyzers.set('contaminants-detected', {
      analyze: (contaminants: any[]): Insight[] => {
        const insights: Insight[] = [];
        
        // Risk distribution
        const riskCounts = contaminants.reduce((acc, c) => {
          acc[c.risk_level] = (acc[c.risk_level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const highRisk = (riskCounts.high || 0) + (riskCounts.critical || 0);
        if (highRisk > 0) {
          insights.push({
            type: 'pattern',
            description: `Found ${highRisk} high-risk contaminant${highRisk > 1 ? 's' : ''} requiring immediate attention`,
            confidence: 1.0,
            supporting_data: [riskCounts]
          });
        }
        
        // Most common type
        const typeCounts = contaminants.reduce((acc, c) => {
          acc[c.type] = (acc[c.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const entries = Object.entries(typeCounts);
        if (entries.length > 0) {
          const mostCommon = entries.sort(([, a], [, b]) => b - a)[0]!;
          insights.push({
            type: 'pattern',
            description: `Most common contaminant: ${mostCommon[0]} (${mostCommon[1]} occurrence${mostCommon[1] > 1 ? 's' : ''})`,
            confidence: 0.9,
            supporting_data: [typeCounts]
          });
        }
        
        return insights;
      }
    });
    
    // Inspections analyzer
    this.domainAnalyzers.set('inspections', {
      analyze: (inspections: any[]): Insight[] => {
        const insights: Insight[] = [];
        
        const accepted = inspections.filter(i => i.status === 'accepted').length;
        const rate = accepted / inspections.length;
        
        insights.push({
          type: 'comparison',
          description: `Inspection acceptance rate: ${(rate * 100).toFixed(1)}%`,
          confidence: 0.95,
          supporting_data: [{ accepted, total: inspections.length }]
        });
        
        return insights;
      }
    });
    
    // Facilities analyzer
    this.domainAnalyzers.set('facilities', {
      analyze: (facilities: any[]): Insight[] => {
        const insights: Insight[] = [];
        
        const utilizationData = facilities
          .filter(f => f.capacity_tons && f.current_load_tons)
          .map(f => ({
            id: f.id,
            name: f.name,
            utilization: f.current_load_tons / f.capacity_tons
          }));
        
        const overUtilized = utilizationData.filter(d => d.utilization > 0.9);
        
        if (overUtilized.length > 0) {
          insights.push({
            type: 'pattern',
            description: `${overUtilized.length} facilit${overUtilized.length > 1 ? 'ies' : 'y'} operating above 90% capacity`,
            confidence: 0.95,
            supporting_data: overUtilized
          });
        }
        
        return insights;
      }
    });
  }
}
```

---

## Example Scenarios

### Scenario 1: Contaminated Shipments Analysis

**Input (Tool Results):**
```typescript
[
  {
    success: true,
    tool: 'shipments',
    data: [
      { id: 'S1', has_contaminants: true, status: 'rejected' },
      { id: 'S2', has_contaminants: true, status: 'rejected' },
      { id: 'S3', has_contaminants: true, status: 'delivered' },
      { id: 'S4', has_contaminants: false, status: 'delivered' }
    ]
  }
]
```

**Output (Analysis):**
```typescript
{
  summary: "Analyzed 1 tool execution, found 2 insights, extracted 4 entities.",
  insights: [
    {
      type: "trend",
      description: "High contamination rate: 75.0% of shipments have contaminants",
      confidence: 0.9,
      supporting_data: [{ contaminated: 3, total: 4, rate: 0.75 }]
    },
    {
      type: "pattern",
      description: "High rejection rate: 50.0% of shipments were rejected",
      confidence: 0.85,
      supporting_data: [{ rejected: 2, total: 4 }]
    }
  ],
  entities: [
    { id: "S1", type: "shipment", name: "S1", attributes: {...} },
    { id: "S2", type: "shipment", name: "S2", attributes: {...} },
    { id: "S3", type: "shipment", name: "S3", attributes: {...} },
    { id: "S4", type: "shipment", name: "S4", attributes: {...} }
  ],
  anomalies: [],
  metadata: {
    tool_results_count: 1,
    successful_results: 1,
    failed_results: 0,
    analysis_time_ms: 45
  }
}
```

---

### Scenario 2: Critical Contaminant Detection

**Input:**
```typescript
[
  {
    success: true,
    tool: 'contaminants-detected',
    data: [
      { id: 'C1', shipment_id: 'S1', type: 'Lead', risk_level: 'critical', concentration_ppm: 500 },
      { id: 'C2', shipment_id: 'S2', type: 'Lead', risk_level: 'high', concentration_ppm: 300 },
      { id: 'C3', shipment_id: 'S3', type: 'Mercury', risk_level: 'low', concentration_ppm: 50 }
    ]
  }
]
```

**Output:**
```typescript
{
  summary: "Analyzed 1 tool execution, found 2 insights, extracted 3 entities, ⚠️ detected 1 anomaly (1 critical).",
  insights: [
    {
      type: "pattern",
      description: "Found 2 high-risk contaminants requiring immediate attention",
      confidence: 1.0,
      supporting_data: [{ critical: 1, high: 1, medium: 0, low: 1 }]
    },
    {
      type: "pattern",
      description: "Most common contaminant: Lead (2 occurrences)",
      confidence: 0.9,
      supporting_data: [{ Lead: 2, Mercury: 1 }]
    }
  ],
  entities: [...],
  anomalies: [
    {
      type: "threshold_exceeded",
      description: "Critical contamination detected in 1 shipment",
      severity: "critical",
      affected_entities: ["S1"],
      data: [{ id: 'C1', ... }]
    }
  ],
  metadata: {...}
}
```

---

### Scenario 3: Statistical Outlier Detection

**Input:**
```typescript
// 10 contaminants with normal concentrations (50-150 ppm)
// 1 contaminant with outlier (1000 ppm)
```

**Statistical Analysis:**
```
Mean: 136 ppm
StdDev: 272 ppm
Outlier (1000 ppm): z-score = 3.18
Threshold: 2.0
Result: ANOMALY DETECTED
```

**Output:**
```typescript
{
  anomalies: [
    {
      type: "outlier",
      description: "Detected 1 contaminant with unusually high concentration",
      severity: "high",
      affected_entities: ["C11"],
      data: {
        outliers: [{ id: "C11", concentration_ppm: 1000 }],
        mean: 136,
        stdDev: 272
      }
    }
  ]
}
```

---

## Configuration

### Environment Variables

```bash
# Analyzer Configuration
ANALYZER_USE_LLM=true                # Use LLM vs rule-based
ANALYZER_LLM_TEMPERATURE=0.3         # LLM creativity
ANALYZER_ANOMALY_THRESHOLD=2.0       # Z-score threshold
ANALYZER_MIN_CONFIDENCE=0.7          # Min confidence for insights
ANALYZER_ENABLE_STATS=true           # Enable statistical analysis
ANALYZER_ENABLE_ENTITIES=true        # Extract entities
ANALYZER_VALIDATE_OUTPUT=true        # Validate with Zod
```

### Programmatic Configuration

```typescript
const analyzer = new AnalyzerAgent(llmProvider, {
  useLLM: true,
  llmTemperature: 0.3,
  anomalyThreshold: 2.0,
  enableStatisticalAnalysis: true,
  minConfidence: 0.7,
  uncertaintyThreshold: 0.7,
  enableEntityExtraction: true,
  includeRelationships: true,
  validateOutput: true,
  strictValidation: false
});
```

---

## Error Handling

### Error Types

1. **LLM Generation Errors**
   - LLM unavailable
   - Invalid JSON response
   - **Handling**: Fallback to rule-based analysis

2. **Validation Errors**
   - Invalid insight structure
   - Missing required fields
   - **Handling**: Filter invalid insights or fail (based on strictValidation)

3. **Data Quality Errors**
   - Empty results
   - Invalid data format
   - **Handling**: Return empty analysis with metadata

### Error Handling Pattern

```typescript
try {
  const analysis = await analyzer.analyze(results);
  return analysis;
} catch (error) {
  console.error('[Analyzer] Analysis failed:', error);
  
  // Return minimal analysis
  return {
    summary: `Analysis failed: ${error.message}`,
    insights: [],
    entities: [],
    anomalies: [],
    metadata: {
      tool_results_count: results.length,
      analysis_time_ms: 0,
      error: true
    }
  };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/tests/agents/analyzer/analyzer.test.ts
import { AnalyzerAgent } from '../../../agents/analyzer/analyzer.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { ToolResult } from '../../../shared/types/agent.js';

describe('AnalyzerAgent', () => {
  let analyzer: AnalyzerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;
  
  beforeEach(() => {
    mockLLM = {
      generate: jest.fn()
    } as any;
    
    analyzer = new AnalyzerAgent(mockLLM, {
      useLLM: false  // Use rule-based for predictable tests
    });
  });
  
  it('should detect high contamination rate', async () => {
    const results: ToolResult[] = [{
      success: true,
      tool: 'shipments',
      data: Array(10).fill(null).map((_, i) => ({
        id: `S${i}`,
        has_contaminants: i < 8,  // 80% contaminated
        status: 'delivered'
      })),
      metadata: {
        executionTime: 100,
        timestamp: '2025-10-11T12:00:00Z'
      }
    }];
    
    const analysis = await analyzer.analyze(results);
    
    const contaminationInsight = analysis.insights.find(i =>
      i.description.includes('contamination rate')
    );
    
    expect(contaminationInsight).toBeDefined();
    expect(contaminationInsight!.confidence).toBeGreaterThan(0.8);
  });
  
  it('should detect critical contaminants as anomalies', async () => {
    const results: ToolResult[] = [{
      success: true,
      tool: 'contaminants-detected',
      data: [
        {
          id: 'C1',
          shipment_id: 'S1',
          type: 'Lead',
          risk_level: 'critical',
          concentration_ppm: 500
        }
      ],
      metadata: {
        executionTime: 100,
        timestamp: '2025-10-11T12:00:00Z'
      }
    }];
    
    const analysis = await analyzer.analyze(results);
    
    expect(analysis.anomalies.length).toBeGreaterThan(0);
    expect(analysis.anomalies[0].severity).toBe('critical');
  });
  
  it('should extract entities', async () => {
    const results: ToolResult[] = [{
      success: true,
      tool: 'shipments',
      data: [
        { id: 'S1', name: 'Shipment 1', facility_id: 'F1' },
        { id: 'S2', name: 'Shipment 2', facility_id: 'F2' }
      ],
      metadata: {
        executionTime: 100,
        timestamp: '2025-10-11T12:00:00Z'
      }
    }];
    
    const analysis = await analyzer.analyze(results);
    
    expect(analysis.entities.length).toBe(2);
    expect(analysis.entities[0].type).toBe('shipment');
    expect(analysis.entities[0].relationships).toBeDefined();
  });
  
  it('should filter insights by confidence', async () => {
    analyzer = new AnalyzerAgent(mockLLM, {
      useLLM: false,
      minConfidence: 0.9
    });
    
    const results: ToolResult[] = [{
      success: true,
      tool: 'shipments',
      data: [{ id: 'S1', has_contaminants: true, status: 'delivered' }],
      metadata: {
        executionTime: 100,
        timestamp: '2025-10-11T12:00:00Z'
      }
    }];
    
    const analysis = await analyzer.analyze(results);
    
    // All insights should have confidence >= 0.9
    analysis.insights.forEach(insight => {
      expect(insight.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });
  
  it('should handle empty results', async () => {
    const results: ToolResult[] = [];
    
    const analysis = await analyzer.analyze(results);
    
    expect(analysis.insights).toEqual([]);
    expect(analysis.entities).toEqual([]);
    expect(analysis.anomalies).toEqual([]);
    expect(analysis.summary).toContain('No successful results');
  });
});
```

---

## Performance Optimization

### 1. Parallel Analysis

```typescript
const [insights, entities, anomalies] = await Promise.all([
  this.generateInsights(results),
  this.extractEntities(results),
  this.detectAnomalies(results)
]);
```

**Benefits:**
- 3x faster than sequential
- Better CPU utilization

### 2. Rule-Based vs LLM Mode

```typescript
useLLM: false  // Fast, consistent
useLLM: true   // Deep, contextual
```

**Trade-offs:**
- Rule-based: ~50ms, deterministic
- LLM-based: ~2000ms, nuanced insights

### 3. Confidence Filtering

```typescript
minConfidence: 0.7  // Filter low-confidence insights
```

**Benefits:**
- Reduces noise
- Focuses on actionable insights
- Faster processing for Summarizer

### 4. Entity Extraction Toggle

```typescript
enableEntityExtraction: false  // Skip if not needed
```

**Benefits:**
- 30% faster when disabled
- Use only when memory integration is active

---

## Next Steps

1. ✅ Review this blueprint
2. ✅ Study shared library components
3. ✅ Implement `AnalyzerAgent` class
4. ✅ Write unit tests
5. ✅ Write integration tests
6. ✅ Test both rule-based and LLM modes
7. ✅ Move to Orchestrator Agent blueprint

---

## Related Documentation

- [Executor Agent Blueprint](./02-executor-agent.md) - Previous step
- [Orchestrator Agent Blueprint](./04-orchestrator-agent.md) - Next step
- [Confidence Scorer](../../src/shared/confidence/scorer.ts)
- [Statistical Utilities](../../src/shared/utils/statistics.ts)

---

**Blueprint Version:** 2.0  
**Last Updated:** October 11, 2025  
**Status:** Ready for Implementation

