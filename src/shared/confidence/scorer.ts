/**
 * Confidence Scorer
 * Calculates confidence scores for agent results
 */

import { ToolResult } from '../types/agent.js';

/**
 * Confidence level labels
 */
export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * Factors contributing to confidence
 */
export interface ConfidenceFactors {
  dataCount?: number;
  dataCompleteness?: number;
  toolSuccess?: number;
  anomalies?: number;
}

/**
 * Confidence Scorer
 * Calculates and interprets confidence scores
 */
export class ConfidenceScorer {
  private uncertaintyThreshold = 0.7;
  
  /**
   * Score based on data count vs expected
   */
  scoreFromDataCount(actualCount: number, expectedCount: number): number {
    if (expectedCount === 0) {
      // No expectation, moderate confidence if we have data
      return actualCount > 0 ? 0.7 : 0.5;
    }
    
    const ratio = actualCount / expectedCount;
    
    // Perfect match or more
    if (ratio >= 1.0) {
      return 0.95;
    }
    
    // Good amount (75%+)
    if (ratio >= 0.75) {
      return 0.85;
    }
    
    // Moderate amount (50%+)
    if (ratio >= 0.5) {
      return 0.7;
    }
    
    // Some data (25%+)
    if (ratio >= 0.25) {
      return 0.5;
    }
    
    // Very little data
    return 0.3;
  }
  
  /**
   * Score based on data completeness
   */
  scoreFromDataCompleteness(
    data: any,
    requiredFields: string[]
  ): number {
    if (!data || typeof data !== 'object') {
      return 0;
    }
    
    const presentFields = requiredFields.filter(field => 
      data[field] !== undefined && data[field] !== null
    );
    
    return presentFields.length / requiredFields.length;
  }
  
  /**
   * Score based on tool execution results
   */
  scoreFromToolResults(results: ToolResult[]): number {
    if (results.length === 0) {
      return 0.5; // No results, medium confidence
    }
    
    const successCount = results.filter(r => r.success).length;
    return successCount / results.length;
  }
  
  /**
   * Combine multiple confidence scores
   */
  combineScores(scores: number[]): number {
    if (scores.length === 0) {
      return 0.5; // Default to medium confidence
    }
    
    // Average the scores
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return sum / scores.length;
  }
  
  /**
   * Get confidence level label from score
   */
  getConfidenceLevel(score: number): ConfidenceLevel {
    if (score < 0.3) {
      return 'very_low';
    }
    if (score < 0.5) {
      return 'low';
    }
    if (score < 0.7) {
      return 'medium';
    }
    if (score < 0.9) {
      return 'high';
    }
    return 'very_high';
  }
  
  /**
   * Check if agent should express uncertainty
   */
  shouldExpressUncertainty(score: number): boolean {
    return score < this.uncertaintyThreshold;
  }
  
  /**
   * Set custom uncertainty threshold
   */
  setUncertaintyThreshold(threshold: number): void {
    this.uncertaintyThreshold = Math.max(0, Math.min(1, threshold));
  }
}

