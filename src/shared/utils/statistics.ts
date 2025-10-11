/**
 * Statistical analysis utilities
 * Provides functions for analyzing data, detecting outliers, and identifying trends
 */

/**
 * Calculate mean (average) of a dataset
 */
export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate median of a dataset
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  
  return sorted[mid]!;
}

/**
 * Calculate standard deviation of a dataset
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate variance of a dataset
 */
export function variance(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  
  return mean(squareDiffs);
}

/**
 * Calculate min, max, and range
 */
export function range(values: number[]): { min: number; max: number; range: number } {
  if (values.length === 0) {
    return { min: 0, max: 0, range: 0 };
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    min,
    max,
    range: max - min,
  };
}

/**
 * Detect outliers using z-score method
 * Returns indices of outliers (values more than threshold standard deviations from mean)
 */
export function detectOutliersZScore(
  values: number[],
  threshold: number = 2.0
): {
  indices: number[];
  values: number[];
  zScores: number[];
} {
  if (values.length < 3) {
    return { indices: [], values: [], zScores: [] };
  }
  
  const avg = mean(values);
  const stdDev = standardDeviation(values);
  
  if (stdDev === 0) {
    return { indices: [], values: [], zScores: [] };
  }
  
  const outliers: {
    indices: number[];
    values: number[];
    zScores: number[];
  } = {
    indices: [],
    values: [],
    zScores: [],
  };
  
  values.forEach((value, index) => {
    const zScore = Math.abs((value - avg) / stdDev);
    if (zScore > threshold) {
      outliers.indices.push(index);
      outliers.values.push(value);
      outliers.zScores.push(zScore);
    }
  });
  
  return outliers;
}

/**
 * Detect outliers using IQR (Interquartile Range) method
 * More robust to extreme values than z-score
 */
export function detectOutliersIQR(
  values: number[],
  multiplier: number = 1.5
): {
  indices: number[];
  values: number[];
  lowerBound: number;
  upperBound: number;
} {
  if (values.length < 4) {
    return { indices: [], values: [], lowerBound: 0, upperBound: 0 };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index]!;
  const q3 = sorted[q3Index]!;
  const iqr = q3 - q1;
  
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  
  const outliers: {
    indices: number[];
    values: number[];
    lowerBound: number;
    upperBound: number;
  } = {
    indices: [],
    values: [],
    lowerBound,
    upperBound,
  };
  
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      outliers.indices.push(index);
      outliers.values.push(value);
    }
  });
  
  return outliers;
}

/**
 * Calculate percentile of a dataset
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  
  if (p < 0 || p > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  
  if (Number.isInteger(index)) {
    return sorted[index]!;
  }
  
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

/**
 * Detect trend in time series data
 * Returns 'increasing', 'decreasing', or 'stable'
 */
export function detectTrend(
  values: number[],
  stabilityThreshold: number = 0.05
): {
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  confidence: number;
} {
  if (values.length < 2) {
    return { trend: 'stable', slope: 0, confidence: 0 };
  }
  
  // Calculate linear regression slope
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  
  const xMean = mean(xValues);
  const yMean = mean(values);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i]! - xMean) * (values[i]! - yMean);
    denominator += Math.pow(xValues[i]! - xMean, 2);
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  
  // Calculate R-squared for confidence
  const yPredicted = xValues.map(x => yMean + slope * (x - xMean));
  const ssRes = values.reduce((acc, y, i) => acc + Math.pow(y - yPredicted[i]!, 2), 0);
  const ssTot = values.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
  
  // Normalize slope by data range
  const dataRange = range(values).range;
  const normalizedSlope = dataRange === 0 ? 0 : slope / dataRange;
  
  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(normalizedSlope) < stabilityThreshold) {
    trend = 'stable';
  } else if (normalizedSlope > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }
  
  return {
    trend,
    slope,
    confidence: Math.max(0, Math.min(1, rSquared)),
  };
}

/**
 * Calculate correlation between two datasets
 * Returns Pearson correlation coefficient (-1 to 1)
 */
export function correlation(xValues: number[], yValues: number[]): number {
  if (xValues.length !== yValues.length || xValues.length === 0) {
    return 0;
  }
  
  const xMean = mean(xValues);
  const yMean = mean(yValues);
  
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;
  
  for (let i = 0; i < xValues.length; i++) {
    const xDiff = xValues[i]! - xMean;
    const yDiff = yValues[i]! - yMean;
    
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(xDenominator * yDenominator);
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate summary statistics for a dataset
 */
export function summarize(values: number[]): {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
} {
  if (values.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      variance: 0,
      min: 0,
      max: 0,
      range: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
    };
  }
  
  const stats = range(values);
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    stdDev: standardDeviation(values),
    variance: variance(values),
    min: stats.min,
    max: stats.max,
    range: stats.range,
    q1,
    q3,
    iqr: q3 - q1,
  };
}

/**
 * Group data by a key function and calculate statistics for each group
 */
export function groupByAndSummarize<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number
): Record<string, ReturnType<typeof summarize>> {
  const groups: Record<string, number[]> = {};
  
  items.forEach(item => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(valueFn(item));
  });
  
  const result: Record<string, ReturnType<typeof summarize>> = {};
  
  Object.entries(groups).forEach(([key, values]) => {
    result[key] = summarize(values);
  });
  
  return result;
}

