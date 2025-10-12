/**
 * Analysis Quality Validator
 * Validates the quality of analysis results (insights, entities, anomalies)
 */

import type { ExecutionResult, ValidationRule } from '../../types/scenario.js';
import type { ValidationResult, ValidationDetail, Validator } from '../../types/validation.js';

export class AnalysisQualityValidator implements Validator {
  /**
   * Validate analysis quality
   */
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    context?: any
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const analysis = executionResult.analysis;

    if (!analysis) {
      if (rule.requireAnalysis !== false) {
        errors.push('Analysis is missing but was expected');
        return {
          passed: false,
          confidence: 1.0,
          details: [{
            type: 'analysis_quality',
            passed: false,
            message: 'No analysis provided',
            confidence: 1.0,
          }],
          errors,
          warnings,
        };
      }
      
      return {
        passed: true,
        confidence: 1.0,
        details: [],
        errors: [],
        warnings: ['No analysis to validate'],
      };
    }

    let passed = true;

    // Check insights
    if (rule.minInsights !== undefined) {
      const insightCount = analysis.insights?.length || 0;
      const insightsPassed = insightCount >= rule.minInsights;
      
      details.push({
        type: 'insights_count',
        passed: insightsPassed,
        message: insightsPassed
          ? `Insights count (${insightCount}) meets minimum (${rule.minInsights})`
          : `Insights count (${insightCount}) below minimum (${rule.minInsights})`,
        expected: rule.minInsights,
        actual: insightCount,
        confidence: 1.0,
      });

      if (!insightsPassed) {
        passed = false;
        errors.push(`Insufficient insights: ${insightCount} < ${rule.minInsights}`);
      }
    }

    // Check entities
    if (rule.minEntities !== undefined) {
      const entityCount = analysis.entities?.length || 0;
      const entitiesPassed = entityCount >= rule.minEntities;
      
      details.push({
        type: 'entities_count',
        passed: entitiesPassed,
        message: entitiesPassed
          ? `Entities count (${entityCount}) meets minimum (${rule.minEntities})`
          : `Entities count (${entityCount}) below minimum (${rule.minEntities})`,
        expected: rule.minEntities,
        actual: entityCount,
        confidence: 1.0,
      });

      if (!entitiesPassed) {
        passed = false;
        errors.push(`Insufficient entities: ${entityCount} < ${rule.minEntities}`);
      }
    }

    // Check anomalies
    if (rule.minAnomalies !== undefined) {
      const anomalyCount = analysis.anomalies?.length || 0;
      const anomaliesPassed = anomalyCount >= rule.minAnomalies;
      
      details.push({
        type: 'anomalies_count',
        passed: anomaliesPassed,
        message: anomaliesPassed
          ? `Anomalies count (${anomalyCount}) meets minimum (${rule.minAnomalies})`
          : `Anomalies count (${anomalyCount}) below minimum (${rule.minAnomalies})`,
        expected: rule.minAnomalies,
        actual: anomalyCount,
        confidence: 1.0,
      });

      if (!anomaliesPassed) {
        passed = false;
        errors.push(`Insufficient anomalies: ${anomalyCount} < ${rule.minAnomalies}`);
      }
    }

    // Check insight confidence
    if (rule.minInsightConfidence !== undefined && analysis.insights) {
      for (const insight of analysis.insights) {
        if (insight.confidence < rule.minInsightConfidence) {
          warnings.push(
            `Low confidence insight: "${insight.description}" (${insight.confidence})`
          );
        }
      }
    }

    // Check insight relevance
    if (rule.insightRelevance && analysis.insights) {
      const relevanceLevel = rule.insightRelevance; // 'high', 'medium', 'low'
      const minConfidence = relevanceLevel === 'high' ? 0.8 : relevanceLevel === 'medium' ? 0.6 : 0.4;
      
      const relevantInsights = analysis.insights.filter(i => i.confidence >= minConfidence);
      const relevancePassed = relevantInsights.length === analysis.insights.length;
      
      details.push({
        type: 'insight_relevance',
        passed: relevancePassed,
        message: relevancePassed
          ? `All insights meet ${relevanceLevel} relevance threshold`
          : `Some insights below ${relevanceLevel} relevance threshold`,
        expected: minConfidence,
        actual: relevantInsights.length,
        confidence: 0.8,
      });

      if (!relevancePassed) {
        warnings.push(`${analysis.insights.length - relevantInsights.length} insights have low relevance`);
      }
    }

    return {
      passed,
      confidence: passed ? 1.0 : 0.5,
      details,
      errors,
      warnings,
    };
  }
}

