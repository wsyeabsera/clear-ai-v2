/**
 * Rule-Based Analysis Strategy
 * Migrated from the original hardcoded analyzer logic
 */

import { BaseAnalysisStrategy } from '../base-strategy.js';
import { ToolResult, Insight, Entity, Anomaly } from '../../../shared/types/agent.js';
import { StrategyContext } from '../base-strategy.js';
import { AnalyzerConfig } from '../../../shared/types/agent-config.js';

export class RuleBasedAnalysisStrategy extends BaseAnalysisStrategy {
  readonly name = 'rule-based';
  readonly description = 'Rule-based analysis using hardcoded business logic';
  readonly version = '1.0.0';

  async analyze(results: ToolResult[], context: StrategyContext): Promise<Insight[]> {
    const config = context.config as AnalyzerConfig;
    const insights: Insight[] = [];

    // Analyze each tool's results
    for (const result of results) {
      if (!result.data) continue;

      switch (result.tool) {
        case 'shipments_list':
          insights.push(...this.analyzeShipments(result.data, config));
          break;

        case 'contaminants_list':
          insights.push(...this.analyzeContaminants(result.data, config));
          break;

        case 'inspections_list':
          insights.push(...this.analyzeInspections(result.data, config));
          break;

        case 'facilities_list':
          insights.push(...this.analyzeFacilities(result.data, config));
          break;
      }
    }

    return insights.filter(i => i.confidence >= (config.minConfidence || 0.7));
  }

  override async extractEntities(results: ToolResult[], _context: StrategyContext): Promise<Entity[]> {
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

  override async detectAnomalies(results: ToolResult[], context: StrategyContext): Promise<Anomaly[]> {
    const config = context.config as AnalyzerConfig;
    const anomalies: Anomaly[] = [];

    for (const result of results) {
      if (!result.data || !Array.isArray(result.data)) continue;

      // Check for data quality issues
      anomalies.push(...this.validateDataQuality(result.data, result.tool));

      // Check for domain-specific anomalies
      switch (result.tool) {
        case 'contaminants_list':
          anomalies.push(...this.detectContaminantAnomalies(result.data, config));
          break;

        case 'shipments_list':
          anomalies.push(...this.detectShipmentAnomalies(result.data, config));
          break;

        case 'facilities_list':
          anomalies.push(...this.detectFacilityAnomalies(result.data, config));
          break;
      }
    }

    return anomalies;
  }

  private analyzeShipments(shipments: any[], _config: AnalyzerConfig): Insight[] {
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

  private analyzeContaminants(contaminants: any[], _config: AnalyzerConfig): Insight[] {
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

    return insights;
  }

  private analyzeInspections(inspections: any[], _config: AnalyzerConfig): Insight[] {
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

  private analyzeFacilities(facilities: any[], _config: AnalyzerConfig): Insight[] {
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
    if (relationshipType === 'shipment') {
      if (item.risk_level === 'critical') return 'critical';
      if (item.risk_level === 'high') return 'high';
      if (item.risk_level === 'medium') return 'medium';
      if (item.concentration_ppm > 100) return 'high';
      if (item.concentration_ppm > 50) return 'medium';
      return 'low';
    }

    if (relationshipType === 'facility') {
      if (item.has_contaminants && item.weight_kg > 5000) return 'high';
      if (item.has_contaminants || item.weight_kg > 5000) return 'medium';
      return 'low';
    }

    return 'medium';
  }

  private validateDataQuality(data: any[], toolName: string): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const item of data) {
      // Check for malformed waste type arrays
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

      // Check for contradictory data
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

  private detectContaminantAnomalies(contaminants: any[], _config: AnalyzerConfig): Anomaly[] {
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
    if (_config.enableStatisticalAnalysis) {
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
          return z > (_config.anomalyThreshold || 2.0);
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

  private detectShipmentAnomalies(shipments: any[], _config: AnalyzerConfig): Anomaly[] {
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

  private detectFacilityAnomalies(facilities: any[], _config: AnalyzerConfig): Anomaly[] {
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
}
