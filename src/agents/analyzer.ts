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
    const systemPrompt = `You are a waste management data analyst specializing in contamination detection, facility operations, and compliance monitoring.

ANALYSIS FOCUS:
1. **Relationship Mapping**:
   - Contaminants belong to specific shipments (via shipment_id)
   - Shipments are destined for facilities (via facility_id)
   - Track the complete chain: contaminant → shipment → facility

2. **Data Quality Issues**:
   - Check for malformed arrays (single characters instead of proper strings)
   - Identify contradictory data (same waste type in BOTH accepted AND rejected lists)
   - Detect missing or invalid relationships

3. **Waste Management Insights**:
   - Contamination patterns by waste type and facility
   - Facility capacity utilization vs contamination rates
   - Compliance risks (high-risk contaminants at facilities)
   - Operational efficiency (rejection rates, processing bottlenecks)

4. **Actionable Recommendations**:
   - Facility capacity warnings
   - Contamination risk assessments
   - Process improvement opportunities

Return JSON array of insights:
[
  {
    "type": "contamination_pattern|capacity_risk|data_quality|compliance_risk|operational_efficiency",
    "description": "Specific, actionable insight with clear business impact",
    "confidence": 0.0-1.0,
    "supporting_data": [{"key": "value", "entities": ["id1", "id2"]}]
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
        case 'shipments_list':
          insights.push(...this.analyzeShipments(result.data));
          break;

        case 'contaminants_list':
          insights.push(...this.analyzeContaminants(result.data));
          break;

        case 'inspections_list':
          insights.push(...this.analyzeInspections(result.data));
          break;

        case 'facilities_list':
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
        type: 'contamination_pattern',
        description: `High contamination rate: ${(contaminationRate * 100).toFixed(1)}% of shipments have contaminants - review quality control processes`,
        confidence: 0.9,
        supporting_data: [
          { contaminated, total: shipments.length, rate: contaminationRate },
        ],
      });
    }

    // Analyze by status and contamination correlation
    const statusAnalysis = shipments.reduce((acc, s) => {
      if (!acc[s.status]) {
        acc[s.status] = { total: 0, contaminated: 0, totalWeight: 0 };
      }
      acc[s.status].total++;
      if (s.has_contaminants) acc[s.status].contaminated++;
      if (s.weight_kg) acc[s.status].totalWeight += s.weight_kg;
      return acc;
    }, {} as Record<string, any>);

    // Calculate contamination rates by status
    Object.keys(statusAnalysis).forEach(status => {
      const data = statusAnalysis[status];
      data.contaminationRate = data.contaminated / data.total;
      data.avgWeight = data.totalWeight / data.total;
    });

    const rejectedRate = (statusAnalysis.rejected?.total || 0) / shipments.length;
    if (rejectedRate > 0.2) {
      insights.push({
        type: 'operational_efficiency',
        description: `High rejection rate: ${(rejectedRate * 100).toFixed(1)}% of shipments were rejected - investigate root causes`,
        confidence: 0.85,
        supporting_data: [statusAnalysis],
      });
    }

    // Analyze contamination patterns by waste type
    const wasteTypeAnalysis = shipments.reduce((acc, s) => {
      if (!s.waste_type) return acc;
      if (!acc[s.waste_type]) {
        acc[s.waste_type] = { total: 0, contaminated: 0, rejected: 0 };
      }
      acc[s.waste_type].total++;
      if (s.has_contaminants) acc[s.waste_type].contaminated++;
      if (s.status === 'rejected') acc[s.waste_type].rejected++;
      return acc;
    }, {} as Record<string, any>);

    // Find waste types with highest contamination rates
    const contaminationByType = Object.entries(wasteTypeAnalysis)
      .map(([type, data]: [string, any]) => ({
        type,
        contaminationRate: data.contaminated / data.total,
        rejectionRate: data.rejected / data.total,
        total: data.total
      }))
      .filter(item => item.total >= 2) // Only consider types with multiple shipments
      .sort((a, b) => b.contaminationRate - a.contaminationRate);

    if (contaminationByType.length > 0) {
      const worstType = contaminationByType[0];
      if (worstType && worstType.contaminationRate > 0.5) {
        insights.push({
          type: 'contamination_pattern',
          description: `${worstType.type} waste has highest contamination rate (${(worstType.contaminationRate * 100).toFixed(1)}%) - focus quality control on this waste type`,
          confidence: 0.9,
          supporting_data: [worstType],
        });
      }
    }

    // Analyze weight patterns
    const weights = shipments.map(s => s.weight_kg).filter(w => typeof w === 'number');
    if (weights.length > 0) {
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      const heavyShipments = shipments.filter(s => s.weight_kg > avgWeight * 1.5);

      if (heavyShipments.length > 0) {
        insights.push({
          type: 'operational_efficiency',
          description: `${heavyShipments.length} shipments significantly exceed average weight (${avgWeight.toFixed(0)}kg) - consider load optimization`,
          confidence: 0.8,
          supporting_data: [{
            heavy_shipments: heavyShipments.length,
            average_weight: avgWeight,
            heavy_threshold: avgWeight * 1.5
          }],
        });
      }
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
        type: 'compliance_risk',
        description: `Found ${highRisk + critical} high-risk contaminants requiring immediate attention - review safety protocols`,
        confidence: 1.0,
        supporting_data: [riskCounts],
      });
    }

    // Analyze concentration patterns
    const concentrations = contaminants
      .map(c => c.concentration_ppm)
      .filter(c => typeof c === 'number');

    if (concentrations.length > 0) {
      const avgConcentration = concentrations.reduce((a, b) => a + b, 0) / concentrations.length;
      const maxConcentration = Math.max(...concentrations);

      if (maxConcentration > avgConcentration * 3) {
        insights.push({
          type: 'contamination_pattern',
          description: `Maximum contaminant concentration (${maxConcentration}ppm) significantly exceeds average (${avgConcentration.toFixed(1)}ppm) - investigate source`,
          confidence: 0.9,
          supporting_data: [{
            max_concentration: maxConcentration,
            average_concentration: avgConcentration,
            ratio: maxConcentration / avgConcentration
          }],
        });
      }
    }

    // Count by type and analyze patterns
    const typeCounts = contaminants.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(typeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    if (mostCommon) {
      insights.push({
        type: 'contamination_pattern',
        description: `Most common contaminant: ${mostCommon[0]} (${mostCommon[1]} occurrences) - focus prevention efforts on this type`,
        confidence: 0.9,
        supporting_data: [typeCounts],
      });
    }

    // Analyze risk level distribution by contaminant type
    const typeRiskAnalysis = contaminants.reduce((acc, c) => {
      if (!acc[c.type]) {
        acc[c.type] = { total: 0, high: 0, critical: 0 };
      }
      acc[c.type].total++;
      if (c.risk_level === 'high') acc[c.type].high++;
      if (c.risk_level === 'critical') acc[c.type].critical++;
      return acc;
    }, {} as Record<string, any>);

    // Find contaminant types with highest risk rates
    const riskByType = Object.entries(typeRiskAnalysis)
      .map(([type, data]: [string, any]) => ({
        type,
        total: data.total,
        highRiskRate: (data.high + data.critical) / data.total,
        criticalRate: data.critical / data.total
      }))
      .filter(item => item.total >= 2) // Only consider types with multiple occurrences
      .sort((a, b) => b.highRiskRate - a.highRiskRate);

    if (riskByType.length > 0) {
      const riskiestType = riskByType[0];
      if (riskiestType && riskiestType.highRiskRate > 0.5) {
        insights.push({
          type: 'compliance_risk',
          description: `${riskiestType.type} contaminants have highest risk rate (${(riskiestType.highRiskRate * 100).toFixed(1)}%) - prioritize safety measures for this type`,
          confidence: 0.95,
          supporting_data: [riskiestType],
        });
      }
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
        id: f.id,
        name: f.name,
        utilization: f.current_load_tons / f.capacity_tons,
        capacity_tons: f.capacity_tons,
        current_load_tons: f.current_load_tons,
      }));

    const overUtilized = utilizationData.filter(d => d.utilization > 0.9);

    if (overUtilized.length > 0) {
      insights.push({
        type: 'capacity_risk',
        description: `${overUtilized.length} facilities operating above 90% capacity - immediate capacity planning needed`,
        confidence: 0.95,
        supporting_data: overUtilized,
      });
    }

    // Analyze facility types and their capacity distribution
    const typeAnalysis = facilities.reduce((acc, f) => {
      if (!acc[f.type]) {
        acc[f.type] = { count: 0, totalCapacity: 0, avgUtilization: 0 };
      }
      acc[f.type].count++;
      if (f.capacity_tons) acc[f.type].totalCapacity += f.capacity_tons;
      if (f.capacity_tons && f.current_load_tons) {
        acc[f.type].avgUtilization += f.current_load_tons / f.capacity_tons;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate average utilization per type
    Object.keys(typeAnalysis).forEach(type => {
      if (typeAnalysis[type].count > 0) {
        typeAnalysis[type].avgUtilization /= typeAnalysis[type].count;
      }
    });

    const sortedTypes = Object.entries(typeAnalysis)
      .sort(([,a], [,b]) => (b as any).avgUtilization - (a as any).avgUtilization);

    if (sortedTypes.length > 0) {
      const firstEntry = sortedTypes[0];
      if (firstEntry) {
        const [highestType, highestData] = firstEntry;
        insights.push({
          type: 'operational_efficiency',
          description: `${highestType} facilities have highest average utilization (${((highestData as any).avgUtilization * 100).toFixed(1)}%) - consider capacity expansion`,
          confidence: 0.85,
          supporting_data: [{ facility_type: highestType, ...(highestData as any) }],
        });
      }
    }

    // Check for waste type policy conflicts
    const policyConflicts = facilities.filter(f => {
      if (!f.accepted_waste_types || !f.rejected_waste_types) return false;
      const accepted = new Set(f.accepted_waste_types);
      const rejected = new Set(f.rejected_waste_types);
      return [...accepted].some(type => rejected.has(type));
    });

    if (policyConflicts.length > 0) {
      insights.push({
        type: 'data_quality',
        description: `${policyConflicts.length} facilities have conflicting waste type policies - same types in both accepted and rejected lists`,
        confidence: 1.0,
        supporting_data: policyConflicts.map(f => ({
          facility_id: f.id,
          conflicting_types: [...new Set(f.accepted_waste_types)].filter(t => f.rejected_waste_types.includes(t))
        })),
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
      case 'shipments_list': type = 'shipment'; break;
      case 'facilities_list': type = 'facility'; break;
      case 'contaminants_list': type = 'contaminant'; break;
      case 'inspections_list': type = 'inspection'; break;
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

    // Shipment to Facility relationship
    if (item.facility_id) {
      relationships.push({
        type: 'destined_for',
        targetEntityId: item.facility_id,
        strength: this.calculateRelationshipStrength(item, 'facility'),
      });
    }

    // Contaminant to Shipment relationship
    if (item.shipment_id) {
      relationships.push({
        type: 'belongs_to',
        targetEntityId: item.shipment_id,
        strength: this.calculateRelationshipStrength(item, 'shipment'),
      });
    }

    return relationships;
  }

  private calculateRelationshipStrength(item: any, relationshipType: string): string {
    // Calculate strength based on data characteristics
    if (relationshipType === 'shipment') {
      // For contaminants, strength based on risk level
      if (item.risk_level === 'critical') return 'critical';
      if (item.risk_level === 'high') return 'high';
      if (item.risk_level === 'medium') return 'medium';
      if (item.concentration_ppm > 100) return 'high';
      if (item.concentration_ppm > 50) return 'medium';
      return 'low';
    }

    if (relationshipType === 'facility') {
      // For shipments, strength based on weight and contamination status
      if (item.has_contaminants && item.weight_kg > 5000) return 'high';
      if (item.has_contaminants || item.weight_kg > 5000) return 'medium';
      return 'low';
    }

    return 'medium';
  }

  private detectAnomalies(results: ToolResult[]): Anomaly[] {
    console.log('[AnalyzerAgent] Detecting anomalies...');

    const anomalies: Anomaly[] = [];

    for (const result of results) {
      if (!result.data || !Array.isArray(result.data)) continue;

      // First, check for data quality issues
      anomalies.push(...this.validateDataQuality(result.data, result.tool));

      // Then check for domain-specific anomalies
      switch (result.tool) {
        case 'contaminants_list':
          anomalies.push(...this.detectContaminantAnomalies(result.data));
          break;

        case 'shipments_list':
          anomalies.push(...this.detectShipmentAnomalies(result.data));
          break;

        case 'facilities_list':
          anomalies.push(...this.detectFacilityAnomalies(result.data));
          break;
      }
    }

    return anomalies;
  }

  private validateDataQuality(data: any[], toolName: string): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const item of data) {
      // Check for malformed waste type arrays (single characters instead of strings)
      if (item.accepted_waste_types && Array.isArray(item.accepted_waste_types)) {
        const hasSingleChars = item.accepted_waste_types.some((type: any) =>
          typeof type === 'string' && type.length === 1
        );
        if (hasSingleChars) {
          anomalies.push({
            type: 'data_quality',
            description: `Malformed accepted_waste_types array detected - contains single characters instead of proper waste type strings`,
            severity: 'high',
            affected_entities: [item.id],
            data: {
              field: 'accepted_waste_types',
              value: item.accepted_waste_types,
              issue: 'single_character_elements'
            },
          });
        }
      }

      if (item.rejected_waste_types && Array.isArray(item.rejected_waste_types)) {
        const hasSingleChars = item.rejected_waste_types.some((type: any) =>
          typeof type === 'string' && type.length === 1
        );
        if (hasSingleChars) {
          anomalies.push({
            type: 'data_quality',
            description: `Malformed rejected_waste_types array detected - contains single characters instead of proper waste type strings`,
            severity: 'high',
            affected_entities: [item.id],
            data: {
              field: 'rejected_waste_types',
              value: item.rejected_waste_types,
              issue: 'single_character_elements'
            },
          });
        }
      }

      // Check for contradictory data (same waste type in both accepted AND rejected)
      if (item.accepted_waste_types && item.rejected_waste_types &&
          Array.isArray(item.accepted_waste_types) && Array.isArray(item.rejected_waste_types)) {

        const acceptedSet = new Set(item.accepted_waste_types);
        const rejectedSet = new Set(item.rejected_waste_types);
        const intersection = [...acceptedSet].filter(x => rejectedSet.has(x));

        if (intersection.length > 0) {
          anomalies.push({
            type: 'data_contradiction',
            description: `Facility ${item.id} has contradictory waste type policies - same types in both accepted and rejected lists: ${intersection.join(', ')}`,
            severity: 'critical',
            affected_entities: [item.id],
            data: {
              conflicting_types: intersection,
              accepted: item.accepted_waste_types,
              rejected: item.rejected_waste_types
            },
          });
        }
      }

      // Check for missing required relationships
      if (toolName === 'shipments_list' && !item.facility_id) {
        anomalies.push({
          type: 'missing_relationship',
          description: `Shipment ${item.id} missing facility_id - cannot determine destination`,
          severity: 'high',
          affected_entities: [item.id],
          data: { missing_field: 'facility_id' },
        });
      }

      if (toolName === 'contaminants_list' && !item.shipment_id) {
        anomalies.push({
          type: 'missing_relationship',
          description: `Contaminant ${item.id} missing shipment_id - cannot link to shipment`,
          severity: 'high',
          affected_entities: [item.id],
          data: { missing_field: 'shipment_id' },
        });
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

    // Check for unusually heavy shipments
    const heavyShipments = shipments.filter(s => s.weight_kg > 10000);
    if (heavyShipments.length > 0) {
      anomalies.push({
        type: 'threshold_exceeded',
        description: `${heavyShipments.length} shipments exceed 10,000kg weight limit`,
        severity: 'high',
        affected_entities: heavyShipments.map(s => s.id),
        data: heavyShipments,
      });
    }

    return anomalies;
  }

  private detectFacilityAnomalies(facilities: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const facility of facilities) {
      // Check for capacity overload
      if (facility.capacity_tons && facility.current_load_tons) {
        const utilization = facility.current_load_tons / facility.capacity_tons;
        if (utilization > 1.0) {
          anomalies.push({
            type: 'capacity_exceeded',
            description: `Facility ${facility.id} operating at ${(utilization * 100).toFixed(1)}% capacity - exceeds maximum`,
            severity: 'critical',
            affected_entities: [facility.id],
            data: {
              capacity_tons: facility.capacity_tons,
              current_load_tons: facility.current_load_tons,
              utilization_rate: utilization
            },
          });
        } else if (utilization > 0.95) {
          anomalies.push({
            type: 'capacity_warning',
            description: `Facility ${facility.id} operating at ${(utilization * 100).toFixed(1)}% capacity - approaching limit`,
            severity: 'high',
            affected_entities: [facility.id],
            data: {
              capacity_tons: facility.capacity_tons,
              current_load_tons: facility.current_load_tons,
              utilization_rate: utilization
            },
          });
        }
      }

      // Check for missing contact information
      if (!facility.contact_email && !facility.contact_phone) {
        anomalies.push({
          type: 'missing_contact',
          description: `Facility ${facility.id} missing both email and phone contact information`,
          severity: 'medium',
          affected_entities: [facility.id],
          data: { missing_fields: ['contact_email', 'contact_phone'] },
        });
      }
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

