/**
 * Analyzer Agent
 * Processes tool execution results to extract insights, detect anomalies, and identify patterns
 */

import { ToolResult, Analysis, Insight, Entity, Anomaly, ReasoningStep, ValidationResult, ValidationIssue } from '../shared/types/agent.js';
import { LLMProvider } from '../shared/llm/provider.js';
import { ANALYZER_MAX_REASONING_STEPS, CHAIN_OF_THOUGHT_TEMPERATURE } from '../shared/constants/config.js';

export interface AnalyzerConfig {
  anomalyThreshold: number; // Standard deviations from mean
  minConfidence: number;    // Minimum confidence for insights (0-1)
  useLLM: boolean;          // Use LLM for analysis or rule-based
  enableStatisticalAnalysis: boolean;
  enableChainOfThought?: boolean; // Enable multi-step reasoning
  enableSelfCritique?: boolean;   // Enable validation layer
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
      enableChainOfThought: true,
      enableSelfCritique: true,
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

    // Extract reasoning trace and validation result if available
    let reasoningTrace: ReasoningStep[] | undefined;
    let validationResult: ValidationResult | undefined;

    // If chain-of-thought was used, extract the reasoning trace
    if (this.config.enableChainOfThought && this.config.useLLM) {
      // The reasoning trace would be stored during the insight generation process
      // For now, we'll create a placeholder - in a full implementation, this would be
      // stored in the class instance during the chain-of-thought process
      reasoningTrace = [];
    }

    const result: Analysis = {
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

    // Add optional fields if they exist
    if (reasoningTrace) {
      result.reasoning_trace = reasoningTrace;
    }
    if (validationResult) {
      result.validation_result = validationResult;
    }

    return result;
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
    const systemPrompt = `You are an advanced waste management data analyst with expertise in:
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

CHAIN-OF-THOUGHT PROCESS:
1. **Observe**: Extract key facts from data
2. **Correlate**: Find relationships between entities
3. **Hypothesize**: Propose explanations for patterns
4. **Validate**: Check hypotheses against data
5. **Conclude**: Formulate confident insights

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

    try {
      // Use chain-of-thought reasoning if enabled
      if (this.config.enableChainOfThought !== false) {
        return await this.generateInsightsWithChainOfThought(results);
      }

      const response = await this.llm.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze these results:\n${JSON.stringify(results, null, 2)}`,
          },
        ],
        config: {
          temperature: CHAIN_OF_THOUGHT_TEMPERATURE,
          max_tokens: 1500,
        },
      });

      const insights = this.extractJSONFromResponse(response.content);

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

  /**
   * Generate insights using chain-of-thought reasoning
   */
  private async generateInsightsWithChainOfThought(results: ToolResult[]): Promise<Insight[]> {
    console.log('[AnalyzerAgent] Using chain-of-thought reasoning for insights...');

    const reasoningSteps: ReasoningStep[] = [];
    let currentInsights: Insight[] = [];

    try {
      // Step 1: Observation - Extract raw facts from data
      const observationStep = await this.performReasoningStep(
        'observation',
        1,
        'Extract key facts and metrics from the data',
        results,
        `Extract all key facts, metrics, and patterns from these tool results. Focus on:
        - Contamination levels and risk classifications
        - Facility capacity utilization rates
        - Shipment status distributions
        - Waste type compositions
        - Any data quality issues

        Return a structured list of observations with specific numbers and entity IDs.`
      );
      reasoningSteps.push(observationStep);

      // Step 2: Correlation - Find relationships between entities
      const correlationStep = await this.performReasoningStep(
        'correlation',
        2,
        'Identify relationships and correlations between entities',
        observationStep.output,
        `Based on the observations, identify:
        - Which contaminants belong to which shipments
        - Which shipments are destined for which facilities
        - Correlations between contamination levels and facility types
        - Patterns in rejection rates by waste type
        - Capacity utilization vs contamination correlation

        Return structured relationships with supporting evidence.`
      );
      reasoningSteps.push(correlationStep);

      // Step 3: Hypothesis - Generate explanations for patterns
      const hypothesisStep = await this.performReasoningStep(
        'hypothesis',
        3,
        'Generate hypotheses for observed patterns',
        { observations: observationStep.output, correlations: correlationStep.output },
        `Based on the observations and correlations, generate hypotheses for:
        - Why certain facilities have higher contamination rates
        - Root causes of rejection patterns
        - Factors affecting capacity utilization
        - Data quality issues and their implications

        Each hypothesis should include confidence level and supporting evidence.`
      );
      reasoningSteps.push(hypothesisStep);

      // Step 4: Validation - Check hypotheses against data
      const validationStep = await this.performReasoningStep(
        'validation',
        4,
        'Validate hypotheses against supporting data',
        { hypotheses: hypothesisStep.output, originalData: results },
        `Validate each hypothesis by:
        - Checking if supporting data is sufficient
        - Looking for contradictory evidence
        - Assessing statistical significance
        - Evaluating business impact
        - Determining actionability

        Return validated hypotheses with confidence scores and supporting data.`
      );
      reasoningSteps.push(validationStep);

      // Step 5: Conclusion - Formulate final insights
      const conclusionStep = await this.performReasoningStep(
        'conclusion',
        5,
        'Formulate actionable insights from validated hypotheses',
        { validatedHypotheses: validationStep.output },
        `Convert validated hypotheses into actionable insights:
        - Ensure each insight has clear business impact
        - Include specific recommendations
        - Provide supporting data with entity IDs
        - Set appropriate confidence scores (>0.7)
        - Prioritize by severity and urgency

        Return JSON array of insights matching the required format.`
      );
      reasoningSteps.push(conclusionStep);

      // Parse final insights with proper JSON extraction
      try {
        currentInsights = this.extractJSONFromResponse(conclusionStep.output);
      } catch (parseError) {
        console.warn('[AnalyzerAgent] Failed to parse insights JSON, falling back to rule-based analysis:', parseError);
        return this.generateInsightsRuleBased(results);
      }

      // Apply self-critique validation if enabled
      if (this.config.enableSelfCritique) {
        const validation = await this.validateInsights(currentInsights, results, reasoningSteps);
        if (!validation.is_valid) {
          console.warn('[AnalyzerAgent] Self-critique validation found issues:', validation.issues);
          // Filter out low-quality insights
          currentInsights = currentInsights.filter(() =>
            !validation.issues.some(issue =>
              issue.type === 'relevance' && issue.severity === 'high'
            )
          );
        }
      }

      // Filter by confidence threshold
      return currentInsights.filter((i: Insight) =>
        i.confidence >= this.config.minConfidence
      );

    } catch (error) {
      console.error('[AnalyzerAgent] Chain-of-thought reasoning failed:', error);
      // Fallback to rule-based analysis
      return this.generateInsightsRuleBased(results);
    }
  }

  /**
   * Perform a single reasoning step
   */
  private async performReasoningStep(
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
          content: `You are performing step ${stepNumber} of ${ANALYZER_MAX_REASONING_STEPS} in a chain-of-thought analysis.

          ${prompt}

          Be specific, provide evidence, and maintain high quality standards.`
        },
        {
          role: 'user',
          content: `Input data:\n${JSON.stringify(input, null, 2)}`
        },
      ],
      config: {
        temperature: CHAIN_OF_THOUGHT_TEMPERATURE,
        max_tokens: 800,
      },
    });

    return {
      step_number: stepNumber,
      reasoning_type: type,
      description,
      input,
      output: response.content,
      confidence: this.calculateStepConfidence(response.content),
      timestamp: startTime.toISOString(),
    };
  }

  /**
   * Extract JSON from LLM response, handling markdown formatting and common errors
   */
  private extractJSONFromResponse(response: string): any {
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to find JSON array or object in the response
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // Clean up common JSON formatting issues
    jsonStr = this.cleanJsonString(jsonStr);
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.warn('[AnalyzerAgent] JSON parsing failed, attempting to fix common issues:', error);
      
      // Try to fix common JSON issues
      let fixedJson = jsonStr;
      
      // Fix trailing commas
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix unescaped quotes in strings
      fixedJson = fixedJson.replace(/([^\\])"([^"]*)"([^,}\]\s])/g, '$1\\"$2\\"$3');
      
      // Fix missing quotes around object keys
      fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      
      // Try parsing again
      try {
        return JSON.parse(fixedJson);
      } catch (secondError) {
        console.error('[AnalyzerAgent] JSON parsing failed even after fixes:', secondError);
        console.error('[AnalyzerAgent] Original response:', response);
        console.error('[AnalyzerAgent] Attempted JSON:', jsonStr);
        console.error('[AnalyzerAgent] Fixed JSON:', fixedJson);
        throw new Error(`Failed to parse JSON: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
      }
    }
  }

  /**
   * Clean up common JSON formatting issues
   */
  private cleanJsonString(jsonStr: string): string {
    // Remove any text before the first [ or {
    const startIndex = Math.min(
      jsonStr.indexOf('[') >= 0 ? jsonStr.indexOf('[') : Infinity,
      jsonStr.indexOf('{') >= 0 ? jsonStr.indexOf('{') : Infinity
    );
    
    if (startIndex !== Infinity && startIndex > 0) {
      jsonStr = jsonStr.substring(startIndex);
    }
    
    // Remove any text after the last ] or }
    const lastBracket = jsonStr.lastIndexOf(']');
    const lastBrace = jsonStr.lastIndexOf('}');
    const endIndex = Math.max(lastBracket, lastBrace);
    
    if (endIndex !== -1 && endIndex < jsonStr.length - 1) {
      jsonStr = jsonStr.substring(0, endIndex + 1);
    }
    
    return jsonStr.trim();
  }

  /**
   * Calculate confidence score for a reasoning step
   */
  private calculateStepConfidence(content: string): number {
    // Simple heuristic based on content characteristics
    let confidence = 0.5; // Base confidence

    if (content.includes('specific') || content.includes('evidence')) confidence += 0.1;
    if (content.includes('data') || content.includes('metrics')) confidence += 0.1;
    if (content.includes('recommendation') || content.includes('actionable')) confidence += 0.1;
    if (content.includes('confidence') || content.includes('certain')) confidence += 0.1;
    if (content.length > 200) confidence += 0.1; // More detailed responses

    return Math.min(confidence, 1.0);
  }

  /**
   * Self-critique validation for insights
   */
  private async validateInsights(
    insights: Insight[],
    originalResults: ToolResult[],
    reasoningSteps: ReasoningStep[]
  ): Promise<ValidationResult> {
    console.log('[AnalyzerAgent] Performing self-critique validation...');

    const issues: ValidationIssue[] = [];
    let qualityScore = 1.0;

    // Check relevance to original data
    for (const insight of insights) {
      if (!insight.supporting_data || insight.supporting_data.length === 0) {
        issues.push({
          type: 'relevance',
          severity: 'high',
          description: `Insight "${insight.description}" lacks supporting data`,
          suggestion: 'Add specific metrics and entity IDs to support the insight'
        });
        qualityScore -= 0.2;
      }

      // Check confidence threshold
      if (insight.confidence < this.config.minConfidence) {
        issues.push({
          type: 'accuracy',
          severity: 'medium',
          description: `Insight "${insight.description}" has low confidence (${insight.confidence})`,
          suggestion: 'Increase confidence by providing stronger supporting evidence'
        });
        qualityScore -= 0.1;
      }

      // Check actionability
      if (!insight.description.includes('recommend') &&
          !insight.description.includes('action') &&
          !insight.description.includes('should')) {
        issues.push({
          type: 'actionability',
          severity: 'medium',
          description: `Insight "${insight.description}" lacks actionable recommendations`,
          suggestion: 'Include specific recommendations or next steps'
        });
        qualityScore -= 0.1;
      }
    }

    // Check completeness
    const hasContaminationInsights = insights.some(i => i.type === 'contamination_pattern');
    const hasOperationalInsights = insights.some(i => i.type === 'operational_efficiency');

    if (!hasContaminationInsights && this.hasContaminationData(originalResults)) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: 'Missing contamination pattern insights despite contamination data present',
        suggestion: 'Analyze contamination patterns and risk levels'
      });
      qualityScore -= 0.15;
    }

    if (!hasOperationalInsights && this.hasOperationalData(originalResults)) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: 'Missing operational efficiency insights despite operational data present',
        suggestion: 'Analyze facility capacity utilization and processing efficiency'
      });
      qualityScore -= 0.15;
    }

    // Check reasoning quality
    if (reasoningSteps.length < 3) {
      issues.push({
        type: 'completeness',
        severity: 'low',
        description: 'Insufficient reasoning steps in chain-of-thought analysis',
        suggestion: 'Ensure all reasoning steps (observe, correlate, hypothesize, validate, conclude) are performed'
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
   * Check if results contain contamination data
   */
  private hasContaminationData(results: ToolResult[]): boolean {
    return results.some(r =>
      r.tool?.includes('contaminant') ||
      (r.data && Array.isArray(r.data) && r.data.some((item: any) => item.has_contaminants))
    );
  }

  /**
   * Check if results contain operational data
   */
  private hasOperationalData(results: ToolResult[]): boolean {
    return results.some(r =>
      r.tool?.includes('facility') ||
      r.tool?.includes('shipment') ||
      (r.data && Array.isArray(r.data) && r.data.some((item: any) =>
        item.capacity_tons || item.current_load_tons || item.status
      ))
    );
  }
}

