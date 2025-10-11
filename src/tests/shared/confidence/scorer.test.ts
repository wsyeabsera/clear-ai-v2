/**
 * Confidence Scorer Tests
 * Testing confidence calculation for uncertain results
 */

import {
  ConfidenceScorer,
  ConfidenceLevel,
  ConfidenceFactors,
} from '../../../shared/confidence/scorer.js';

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;
  
  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });
  
  describe('scoreFromDataCount', () => {
    it('should give high confidence for sufficient data', () => {
      const score = scorer.scoreFromDataCount(100, 50);
      
      expect(score).toBeGreaterThan(0.9);
    });
    
    it('should give low confidence for insufficient data', () => {
      const score = scorer.scoreFromDataCount(5, 100);
      
      expect(score).toBeLessThan(0.5);
    });
    
    it('should give perfect score when meeting expectation', () => {
      const score = scorer.scoreFromDataCount(50, 50);
      
      expect(score).toBeGreaterThan(0.8);
    });
    
    it('should handle zero expected', () => {
      const score = scorer.scoreFromDataCount(10, 0);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
  
  describe('scoreFromDataCompleteness', () => {
    it('should give high score for complete data', () => {
      const data = {
        id: '1',
        name: 'Test',
        value: 100,
        status: 'active',
      };
      
      const score = scorer.scoreFromDataCompleteness(data, ['id', 'name', 'value', 'status']);
      
      expect(score).toBe(1.0);
    });
    
    it('should give lower score for partial data', () => {
      const data = {
        id: '1',
        name: 'Test',
      };
      
      const score = scorer.scoreFromDataCompleteness(data, ['id', 'name', 'value', 'status']);
      
      expect(score).toBe(0.5); // 2 out of 4 fields
    });
    
    it('should handle missing data gracefully', () => {
      const score = scorer.scoreFromDataCompleteness(null, ['id', 'name']);
      
      expect(score).toBe(0);
    });
  });
  
  describe('scoreFromToolResults', () => {
    it('should give high score when all tools succeed', () => {
      const results = [
        { success: true, tool: 'tool1', data: {}, metadata: { executionTime: 100, timestamp: '' } },
        { success: true, tool: 'tool2', data: {}, metadata: { executionTime: 100, timestamp: '' } },
      ];
      
      const score = scorer.scoreFromToolResults(results);
      
      expect(score).toBeGreaterThan(0.9);
    });
    
    it('should give lower score when some tools fail', () => {
      const results = [
        { success: true, tool: 'tool1', data: {}, metadata: { executionTime: 100, timestamp: '' } },
        { success: false, tool: 'tool2', error: { code: 'ERR', message: 'Failed' }, metadata: { executionTime: 100, timestamp: '' } },
      ];
      
      const score = scorer.scoreFromToolResults(results);
      
      expect(score).toBeLessThan(0.7);
    });
    
    it('should give zero score when all tools fail', () => {
      const results = [
        { success: false, tool: 'tool1', error: { code: 'ERR', message: 'Failed' }, metadata: { executionTime: 100, timestamp: '' } },
      ];
      
      const score = scorer.scoreFromToolResults(results);
      
      expect(score).toBe(0);
    });
  });
  
  describe('combineScores', () => {
    it('should average multiple scores', () => {
      const combined = scorer.combineScores([0.8, 0.9, 0.7]);
      
      expect(combined).toBeCloseTo(0.8, 1);
    });
    
    it('should handle single score', () => {
      const combined = scorer.combineScores([0.75]);
      
      expect(combined).toBe(0.75);
    });
    
    it('should handle empty array', () => {
      const combined = scorer.combineScores([]);
      
      expect(combined).toBe(0.5); // Default medium confidence
    });
  });
  
  describe('getConfidenceLevel', () => {
    it('should classify very low confidence', () => {
      const level = scorer.getConfidenceLevel(0.2);
      
      expect(level).toBe('very_low');
    });
    
    it('should classify low confidence', () => {
      const level = scorer.getConfidenceLevel(0.45);
      
      expect(level).toBe('low');
    });
    
    it('should classify medium confidence', () => {
      const level = scorer.getConfidenceLevel(0.65);
      
      expect(level).toBe('medium');
    });
    
    it('should classify high confidence', () => {
      const level = scorer.getConfidenceLevel(0.82);
      
      expect(level).toBe('high');
    });
    
    it('should classify very high confidence', () => {
      const level = scorer.getConfidenceLevel(0.95);
      
      expect(level).toBe('very_high');
    });
  });
  
  describe('shouldExpressUncertainty', () => {
    it('should express uncertainty for low confidence', () => {
      expect(scorer.shouldExpressUncertainty(0.5)).toBe(true);
      expect(scorer.shouldExpressUncertainty(0.65)).toBe(true);
    });
    
    it('should not express uncertainty for high confidence', () => {
      expect(scorer.shouldExpressUncertainty(0.85)).toBe(false);
      expect(scorer.shouldExpressUncertainty(0.95)).toBe(false);
    });
    
    it('should have threshold at 0.7', () => {
      expect(scorer.shouldExpressUncertainty(0.69)).toBe(true);
      expect(scorer.shouldExpressUncertainty(0.71)).toBe(false);
    });
  });
});

