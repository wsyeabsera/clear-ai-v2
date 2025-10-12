/**
 * Analyzer Agent
 * Processes tool execution results to extract insights, detect anomalies, and identify patterns
 */

import { ToolResult, Analysis, Insight, Entity, Anomaly } from '../shared/types/agent.js';
import { LLMProvider } from '../shared/llm/provider.js';

export interface AnalyzerConfig {
  anomalyThreshold: number; // Standard deviations from mean
  minConfidence: number;    // Minimum confidence for insights (0-1)
  useLLM: boolean;          // Use LLM for analysis or rule-based
  enableStatisticalAnalysis: boolean;
}

export class AnalyzerAgent {
  private config: AnalyzerConfig;

  constructor(
    private llm: LLMProvider,
    config?: Partial<AnalyzerConfig>
  ) {
    this.config = {
      anomalyThreshold: 2.0,  // 2 standard deviations
      minConfidence: 0.7,
      useLLM: true,
      enableStatisticalAnalysis: true,
      ...config,
    };
  }

  async analyze(results: ToolResult[]): Promise<Analysis> {
    console.log(`[AnalyzerAgent] Analyzing ${results.length} tool results`);
    const startTime = Date.now();

    // Separate successful and failed results
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

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
          analysis_time_ms: Date.now() - startTime,
        },
      };
    }

    // Run analysis methods
    const [insights, entities, anomalies] = await Promise.all([
      this.generateInsights(successfulResults),
      this.extractEntities(successfulResults),
      this.detectAnomalies(successfulResults),
    ]);

    // Generate summary
    const summary = await this.generateSummary(
      successfulResults,
      insights,
      entities,
      anomalies
    );

    return {
      summary,
      insights,
      entities,
      anomalies,
      metadata: {
        tool_results_count: results.length,
        successful_results: successfulResults.length,
        failed_results: failedResults.length,
        analysis_time_ms: Date.now() - startTime,
      },
    };
  }

  private async generateInsights(results: ToolResult[]): Promise<Insight[]> {
    console.log('[AnalyzerAgent] Generating insights...');

    if (this.config.useLLM) {
      return this.generateInsightsWithLLM(results);
    } else {
      return this.generateInsightsRuleBased(results);
    }
  }

  private async generateInsightsWithLLM(results: ToolResult[]): Promise<Insight[]> {
    const systemPrompt = `You are a data analysis agent. Analyze the tool execution results and extract key insights.

Focus on:
1. Trends over time
2. Patterns in the data
3. Correlations between metrics
4. Comparisons (e.g., higher/lower than expected)

Return JSON array of insights:
[
  {
    "type": "trend|pattern|correlation|comparison",
    "description": "Clear description of the insight",
    "confidence": 0.0-1.0,
    "supporting_data": []
  }
]`;

    try {
      const response = await this.llm.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze these results:\n${JSON.stringify(results, null, 2)}`,
          },
        ],
        config: {
          temperature: 0.3,
          max_tokens: 1000,
        },
      });

      const insights = JSON.parse(response.content);

      // Filter by confidence threshold
      return insights.filter((i: Insight) =>
        i.confidence >= this.config.minConfidence
      );

    } catch (error) {
      console.error('[AnalyzerAgent] LLM insight generation failed:', error);
      return this.generateInsightsRuleBased(results);
    }
  }

  private generateInsightsRuleBased(results: ToolResult[]): Insight[] {
    const insights: Insight[] = [];

    // Analyze each tool's results
    for (const result of results) {
      if (!result.data) continue;

      switch (result.tool) {
        case 'shipments':
          insights.push(...this.analyzeShipments(result.data));
          break;

        case 'contaminants-detected':
          insights.push(...this.analyzeContaminants(result.data));
          break;

        case 'inspections':
          insights.push(...this.analyzeInspections(result.data));
          break;

        case 'facilities':
          insights.push(...this.analyzeFacilities(result.data));
          break;
      }
    }

    return insights.filter(i => i.confidence >= this.config.minConfidence);
  }

  private analyzeShipments(shipments: any[]): Insight[] {
    const insights: Insight[] = [];

    if (!Array.isArray(shipments) || shipments.length === 0) {
      return insights;
    }

    // Count contaminated vs clean
    const contaminated = shipments.filter(s => s.has_contaminants).length;
    const contaminationRate = contaminated / shipments.length;

    if (contaminationRate > 0.3) {
      insights.push({
        type: 'trend',
        description: `High contamination rate: ${(contaminationRate * 100).toFixed(1)}% of shipments have contaminants`,
        confidence: 0.9,
        supporting_data: [
          { contaminated, total: shipments.length, rate: contaminationRate },
        ],
      });
    }

    // Analyze by status
    const statusCounts = shipments.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rejectedRate = (statusCounts.rejected || 0) / shipments.length;
    if (rejectedRate > 0.2) {
      insights.push({
        type: 'pattern',
        description: `High rejection rate: ${(rejectedRate * 100).toFixed(1)}% of shipments were rejected`,
        confidence: 0.85,
        supporting_data: [statusCounts],
      });
    }

    return insights;
  }

  private analyzeContaminants(contaminants: any[]): Insight[] {
    const insights: Insight[] = [];

    if (!Array.isArray(contaminants) || contaminants.length === 0) {
      return insights;
    }

    // Count by risk level
    const riskCounts = contaminants.reduce((acc, c) => {
      acc[c.risk_level] = (acc[c.risk_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highRisk = riskCounts.high || 0;
    const critical = riskCounts.critical || 0;

    if (highRisk + critical > 0) {
      insights.push({
        type: 'pattern',
        description: `Found ${highRisk + critical} high-risk contaminants requiring immediate attention`,
        confidence: 1.0,
        supporting_data: [riskCounts],
      });
    }

    // Count by type
    const typeCounts = contaminants.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(typeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    if (mostCommon) {
      insights.push({
        type: 'pattern',
        description: `Most common contaminant: ${mostCommon[0]} (${mostCommon[1]} occurrences)`,
        confidence: 0.9,
        supporting_data: [typeCounts],
      });
    }

    return insights;
  }

  private analyzeInspections(inspections: any[]): Insight[] {
    const insights: Insight[] = [];

    if (!Array.isArray(inspections) || inspections.length === 0) {
      return insights;
    }

    const statusCounts = inspections.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const acceptanceRate = (statusCounts.accepted || 0) / inspections.length;

    insights.push({
      type: 'comparison',
      description: `Inspection acceptance rate: ${(acceptanceRate * 100).toFixed(1)}%`,
      confidence: 0.95,
      supporting_data: [statusCounts],
    });

    return insights;
  }

  private analyzeFacilities(facilities: any[]): Insight[] {
    const insights: Insight[] = [];

    if (!Array.isArray(facilities) || facilities.length === 0) {
      return insights;
    }

    // Analyze capacity utilization
    const utilizationData = facilities
      .filter(f => f.capacity_tons && f.current_load_tons)
      .map(f => ({
        name: f.name,
        utilization: f.current_load_tons / f.capacity_tons,
      }));

    const overUtilized = utilizationData.filter(d => d.utilization > 0.9);

    if (overUtilized.length > 0) {
      insights.push({
        type: 'pattern',
        description: `${overUtilized.length} facilities operating above 90% capacity`,
        confidence: 0.95,
        supporting_data: overUtilized,
      });
    }

    return insights;
  }

  private async extractEntities(results: ToolResult[]): Promise<Entity[]> {
    console.log('[AnalyzerAgent] Extracting entities...');

    const entityMap = new Map<string, Entity>();

    for (const result of results) {
      if (!result.data || !Array.isArray(result.data)) continue;

      for (const item of result.data) {
        const entity = this.itemToEntity(item, result.tool);
        if (entity) {
          const key = `${entity.type}:${entity.id}`;
          if (!entityMap.has(key)) {
            entityMap.set(key, entity);
          }
        }
      }
    }

    return Array.from(entityMap.values());
  }

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
      attributes: item,
      relationships: this.extractRelationships(item),
    };
  }

  private extractRelationships(item: any): any[] {
    const relationships = [];

    if (item.facility_id) {
      relationships.push({
        type: 'located_at',
        target_entity_id: item.facility_id,
      });
    }

    if (item.shipment_id) {
      relationships.push({
        type: 'belongs_to',
        target_entity_id: item.shipment_id,
      });
    }

    return relationships;
  }

  private detectAnomalies(results: ToolResult[]): Anomaly[] {
    console.log('[AnalyzerAgent] Detecting anomalies...');

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
      }
    }

    return anomalies;
  }

  private detectContaminantAnomalies(contaminants: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for critical risk levels
    const critical = contaminants.filter(c => c.risk_level === 'critical');

    if (critical.length > 0) {
      anomalies.push({
        type: 'threshold_exceeded',
        description: `Critical contamination detected in ${critical.length} shipments`,
        severity: 'critical',
        affected_entities: critical.map(c => c.shipment_id),
        data: critical,
      });
    }

    // Check for unusually high concentration
    if (this.config.enableStatisticalAnalysis) {
      const concentrations = contaminants
        .map(c => c.concentration_ppm)
        .filter(c => typeof c === 'number');

      if (concentrations.length > 2) {
        const mean = concentrations.reduce((a, b) => a + b, 0) / concentrations.length;
        const stdDev = Math.sqrt(
          concentrations.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / concentrations.length
        );

        const outliers = contaminants.filter(c => {
          const z = Math.abs((c.concentration_ppm - mean) / stdDev);
          return z > this.config.anomalyThreshold;
        });

        if (outliers.length > 0) {
          anomalies.push({
            type: 'outlier',
            description: `Detected ${outliers.length} contaminants with unusually high concentration`,
            severity: 'high',
            affected_entities: outliers.map(o => o.id),
            data: { outliers, mean, stdDev },
          });
        }
      }
    }

    return anomalies;
  }

  private detectShipmentAnomalies(shipments: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for rejected shipments with no clear reason
    const rejectedNoReason = shipments.filter(s =>
      s.status === 'rejected' && !s.has_contaminants
    );

    if (rejectedNoReason.length > 0) {
      anomalies.push({
        type: 'unexpected',
        description: `${rejectedNoReason.length} shipments rejected without detected contaminants`,
        severity: 'medium',
        affected_entities: rejectedNoReason.map(s => s.id),
        data: rejectedNoReason,
      });
    }

    return anomalies;
  }

  private async generateSummary(
    results: ToolResult[],
    insights: Insight[],
    entities: Entity[],
    anomalies: Anomaly[]
  ): Promise<string> {
    const parts = [
      `Analyzed ${results.length} tool executions`,
      `Found ${insights.length} insights`,
      `Extracted ${entities.length} entities`,
      `Detected ${anomalies.length} anomalies`,
    ];

    return parts.join('. ');
  }
}

