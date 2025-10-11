/**
 * Statistics utilities tests
 */

import {
  mean,
  median,
  standardDeviation,
  variance,
  range,
  detectOutliersZScore,
  detectOutliersIQR,
  percentile,
  detectTrend,
  correlation,
  summarize,
  groupByAndSummarize,
} from '../../../shared/utils/statistics.js';
import { sampleDatasets } from '../fixtures/shared-test-data.js';

describe('Statistics Utilities', () => {
  describe('mean', () => {
    it('should calculate mean correctly', () => {
      expect(mean(sampleDatasets.simple)).toBe(3);
    });
    
    it('should handle empty array', () => {
      expect(mean([])).toBe(0);
    });
    
    it('should handle single value', () => {
      expect(mean([5])).toBe(5);
    });
  });
  
  describe('median', () => {
    it('should calculate median for odd length array', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });
    
    it('should calculate median for even length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
    
    it('should handle unsorted array', () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3);
    });
    
    it('should handle empty array', () => {
      expect(median([])).toBe(0);
    });
    
    it('should handle single value', () => {
      expect(median([5])).toBe(5);
    });
  });
  
  describe('standardDeviation', () => {
    it('should calculate standard deviation', () => {
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2, 0);
    });
    
    it('should return 0 for empty array', () => {
      expect(standardDeviation([])).toBe(0);
    });
    
    it('should return 0 for constant values', () => {
      expect(standardDeviation([5, 5, 5, 5])).toBe(0);
    });
  });
  
  describe('variance', () => {
    it('should calculate variance', () => {
      const result = variance([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(4, 0);
    });
    
    it('should return 0 for empty array', () => {
      expect(variance([])).toBe(0);
    });
  });
  
  describe('range', () => {
    it('should calculate min, max, and range', () => {
      const result = range([1, 5, 3, 9, 2]);
      
      expect(result.min).toBe(1);
      expect(result.max).toBe(9);
      expect(result.range).toBe(8);
    });
    
    it('should handle single value', () => {
      const result = range([5]);
      
      expect(result.min).toBe(5);
      expect(result.max).toBe(5);
      expect(result.range).toBe(0);
    });
    
    it('should handle empty array', () => {
      const result = range([]);
      
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.range).toBe(0);
    });
  });
  
  describe('detectOutliersZScore', () => {
    it('should detect outliers using z-score', () => {
      const result = detectOutliersZScore(sampleDatasets.withOutliers, 2.0);
      
      expect(result.indices.length).toBeGreaterThan(0);
      expect(result.values).toContain(100);
    });
    
    it('should not detect outliers in normal data', () => {
      const result = detectOutliersZScore(sampleDatasets.normal, 2.0);
      
      expect(result.indices.length).toBe(0);
    });
    
    it('should handle different thresholds', () => {
      const strict = detectOutliersZScore(sampleDatasets.withOutliers, 1.5);
      const lenient = detectOutliersZScore(sampleDatasets.withOutliers, 3.0);
      
      expect(strict.indices.length).toBeGreaterThanOrEqual(lenient.indices.length);
    });
    
    it('should return empty for arrays too small', () => {
      const result = detectOutliersZScore([1, 2], 2.0);
      
      expect(result.indices).toEqual([]);
    });
    
    it('should return empty for constant values', () => {
      const result = detectOutliersZScore([5, 5, 5, 5, 5], 2.0);
      
      expect(result.indices).toEqual([]);
    });
  });
  
  describe('detectOutliersIQR', () => {
    it('should detect outliers using IQR', () => {
      const result = detectOutliersIQR(sampleDatasets.withOutliers, 1.5);
      
      expect(result.indices.length).toBeGreaterThan(0);
      expect(result.values).toContain(100);
    });
    
    it('should calculate bounds correctly', () => {
      const result = detectOutliersIQR([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 1.5);
      
      expect(result.lowerBound).toBeLessThan(1);
      expect(result.upperBound).toBeLessThan(100);
    });
    
    it('should handle different multipliers', () => {
      const strict = detectOutliersIQR(sampleDatasets.withOutliers, 1.0);
      const lenient = detectOutliersIQR(sampleDatasets.withOutliers, 2.0);
      
      expect(strict.indices.length).toBeGreaterThanOrEqual(lenient.indices.length);
    });
    
    it('should return empty for arrays too small', () => {
      const result = detectOutliersIQR([1, 2, 3], 1.5);
      
      expect(result.indices).toEqual([]);
    });
  });
  
  describe('percentile', () => {
    it('should calculate 50th percentile (median)', () => {
      const result = percentile([1, 2, 3, 4, 5], 50);
      
      expect(result).toBe(3);
    });
    
    it('should calculate 25th percentile', () => {
      const result = percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 25);
      
      expect(result).toBeCloseTo(3.25, 1);
    });
    
    it('should calculate 75th percentile', () => {
      const result = percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75);
      
      expect(result).toBeCloseTo(7.75, 1);
    });
    
    it('should handle 0th percentile', () => {
      const result = percentile([1, 2, 3, 4, 5], 0);
      
      expect(result).toBe(1);
    });
    
    it('should handle 100th percentile', () => {
      const result = percentile([1, 2, 3, 4, 5], 100);
      
      expect(result).toBe(5);
    });
    
    it('should throw error for invalid percentile', () => {
      expect(() => percentile([1, 2, 3], -1)).toThrow();
      expect(() => percentile([1, 2, 3], 101)).toThrow();
    });
    
    it('should return 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });
  });
  
  describe('detectTrend', () => {
    it('should detect increasing trend', () => {
      const result = detectTrend(sampleDatasets.increasing);
      
      expect(result.trend).toBe('increasing');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
    
    it('should detect decreasing trend', () => {
      const result = detectTrend(sampleDatasets.decreasing);
      
      expect(result.trend).toBe('decreasing');
      expect(result.slope).toBeLessThan(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
    
    it('should detect stable trend', () => {
      const result = detectTrend(sampleDatasets.stable);
      
      expect(result.trend).toBe('stable');
      expect(Math.abs(result.slope)).toBeCloseTo(0, 5);
    });
    
    it('should handle single value', () => {
      const result = detectTrend([5]);
      
      expect(result.trend).toBe('stable');
      expect(result.slope).toBe(0);
      expect(result.confidence).toBe(0);
    });
    
    it('should handle different stability thresholds', () => {
      const slightlyIncreasing = [5, 5.1, 5.2, 5.1, 5.3];
      
      const strict = detectTrend(slightlyIncreasing, 0.01);
      const lenient = detectTrend(slightlyIncreasing, 0.5); // More lenient threshold
      
      // With strict threshold, should detect as increasing
      expect(strict.trend).toBe('increasing');
      // With lenient threshold, might detect as stable since change is small
      expect(['increasing', 'stable']).toContain(lenient.trend);
    });
  });
  
  describe('correlation', () => {
    it('should calculate perfect positive correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      
      const result = correlation(x, y);
      
      expect(result).toBeCloseTo(1, 5);
    });
    
    it('should calculate perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      
      const result = correlation(x, y);
      
      expect(result).toBeCloseTo(-1, 5);
    });
    
    it('should calculate no correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 3, 5, 3, 5];
      
      const result = correlation(x, y);
      
      expect(Math.abs(result)).toBeLessThan(0.5);
    });
    
    it('should return 0 for different length arrays', () => {
      const x = [1, 2, 3];
      const y = [1, 2, 3, 4, 5];
      
      const result = correlation(x, y);
      
      expect(result).toBe(0);
    });
    
    it('should return 0 for empty arrays', () => {
      expect(correlation([], [])).toBe(0);
    });
  });
  
  describe('summarize', () => {
    it('should calculate comprehensive statistics', () => {
      const result = summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      
      expect(result.count).toBe(10);
      expect(result.mean).toBe(5.5);
      expect(result.median).toBe(5.5);
      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
      expect(result.range).toBe(9);
      expect(result.stdDev).toBeGreaterThan(0);
      expect(result.variance).toBeGreaterThan(0);
      expect(result.q1).toBeCloseTo(3.25, 1);
      expect(result.q3).toBeCloseTo(7.75, 1);
      expect(result.iqr).toBeGreaterThan(0);
    });
    
    it('should handle empty array', () => {
      const result = summarize([]);
      
      expect(result.count).toBe(0);
      expect(result.mean).toBe(0);
      expect(result.median).toBe(0);
    });
    
    it('should handle single value', () => {
      const result = summarize([5]);
      
      expect(result.count).toBe(1);
      expect(result.mean).toBe(5);
      expect(result.median).toBe(5);
      expect(result.stdDev).toBe(0);
    });
  });
  
  describe('groupByAndSummarize', () => {
    it('should group and summarize data', () => {
      const items = [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 30 },
        { category: 'B', value: 40 },
        { category: 'B', value: 50 },
      ];
      
      const result = groupByAndSummarize(
        items,
        item => item.category,
        item => item.value
      );
      
      expect(result.A.count).toBe(2);
      expect(result.A.mean).toBe(15);
      expect(result.B.count).toBe(3);
      expect(result.B.mean).toBe(40);
    });
    
    it('should handle single group', () => {
      const items = [
        { type: 'X', value: 1 },
        { type: 'X', value: 2 },
        { type: 'X', value: 3 },
      ];
      
      const result = groupByAndSummarize(
        items,
        item => item.type,
        item => item.value
      );
      
      expect(Object.keys(result)).toEqual(['X']);
      expect(result.X.count).toBe(3);
      expect(result.X.mean).toBe(2);
    });
    
    it('should handle empty array', () => {
      const result = groupByAndSummarize(
        [],
        (item: any) => item.key,
        (item: any) => item.value
      );
      
      expect(Object.keys(result)).toEqual([]);
    });
  });
});

