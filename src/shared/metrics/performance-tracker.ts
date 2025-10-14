/**
 * Performance Tracker
 * 
 * Tracks and analyzes performance metrics for the multi-agent system
 * including execution times, cache performance, and resource utilization.
 */

export interface PerformanceMetrics {
  requestId: string;
  totalDuration: number;
  planningDuration: number;
  executionDuration: number;
  analysisDuration: number;
  summarizationDuration: number;
  stepDurations: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
  parallelSteps: number;
  sequentialSteps: number;
  timeoutSteps: number;
  failedSteps: number;
  success: boolean;
  timestamp: Date;
}

export interface PerformanceReport {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  cacheHitRate: number;
  parallelExecutionRate: number;
  successRate: number;
  timeoutRate: number;
  slowQueries: PerformanceMetrics[];
  recentMetrics: PerformanceMetrics[];
  totalRequests: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 1000; // Keep last 1000 requests
  private slowQueryThreshold: number = 10000; // 10 seconds

  constructor(options?: {
    maxMetrics?: number;
    slowQueryThreshold?: number;
  }) {
    this.maxMetrics = options?.maxMetrics || 1000;
    this.slowQueryThreshold = options?.slowQueryThreshold || 10000;
  }

  /**
   * Track a request's performance metrics
   */
  trackRequest(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (metrics.totalDuration > this.slowQueryThreshold) {
      console.warn(`[PerformanceTracker] Slow query detected: ${metrics.requestId} took ${metrics.totalDuration}ms`);
    }
  }

  /**
   * Get average latency across all requests
   */
  getAverageLatency(): number {
    if (this.metrics.length === 0) return 0;
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.totalDuration, 0);
    return Math.round(totalDuration / this.metrics.length);
  }

  /**
   * Get P95 latency (95th percentile)
   */
  getP95Latency(): number {
    if (this.metrics.length === 0) return 0;
    
    const sortedDurations = this.metrics
      .map(m => m.totalDuration)
      .sort((a, b) => a - b);
    
    const index = Math.ceil(sortedDurations.length * 0.95) - 1;
    return sortedDurations[index] || 0;
  }

  /**
   * Get P99 latency (99th percentile)
   */
  getP99Latency(): number {
    if (this.metrics.length === 0) return 0;
    
    const sortedDurations = this.metrics
      .map(m => m.totalDuration)
      .sort((a, b) => a - b);
    
    const index = Math.ceil(sortedDurations.length * 0.99) - 1;
    return sortedDurations[index] || 0;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const totalHits = this.metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalRequests = this.metrics.reduce((sum, m) => sum + m.cacheHits + m.cacheMisses, 0);
    
    return totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) / 100 : 0;
  }

  /**
   * Get parallel execution rate
   */
  getParallelExecutionRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const totalParallel = this.metrics.reduce((sum, m) => sum + m.parallelSteps, 0);
    const totalSteps = this.metrics.reduce((sum, m) => sum + m.parallelSteps + m.sequentialSteps, 0);
    
    return totalSteps > 0 ? Math.round((totalParallel / totalSteps) * 100) / 100 : 0;
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const successful = this.metrics.filter(m => m.success).length;
    return Math.round((successful / this.metrics.length) * 100) / 100;
  }

  /**
   * Get timeout rate
   */
  getTimeoutRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const totalSteps = this.metrics.reduce((sum, m) => sum + m.parallelSteps + m.sequentialSteps, 0);
    const timeoutSteps = this.metrics.reduce((sum, m) => sum + m.timeoutSteps, 0);
    
    return totalSteps > 0 ? Math.round((timeoutSteps / totalSteps) * 100) / 100 : 0;
  }

  /**
   * Get slow queries above threshold
   */
  getSlowQueries(threshold?: number): PerformanceMetrics[] {
    const limit = threshold || this.slowQueryThreshold;
    return this.metrics
      .filter(m => m.totalDuration > limit)
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * Get recent metrics (last N requests)
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const now = new Date();
    
    return {
      averageLatency: this.getAverageLatency(),
      p95Latency: this.getP95Latency(),
      p99Latency: this.getP99Latency(),
      cacheHitRate: this.getCacheHitRate(),
      parallelExecutionRate: this.getParallelExecutionRate(),
      successRate: this.getSuccessRate(),
      timeoutRate: this.getTimeoutRate(),
      slowQueries: this.getSlowQueries(),
      recentMetrics: this.getRecentMetrics(20),
      totalRequests: this.metrics.length,
      timeRange: {
        start: this.metrics.length > 0 ? this.metrics[0]!.timestamp : now,
        end: now
      }
    };
  }

  /**
   * Get metrics by time range
   */
  getMetricsByTimeRange(start: Date, end: Date): PerformanceMetrics[] {
    return this.metrics.filter(m => m.timestamp >= start && m.timestamp <= end);
  }

  /**
   * Get step performance breakdown
   */
  getStepPerformanceBreakdown(): Record<string, {
    averageDuration: number;
    count: number;
    successRate: number;
  }> {
    const stepStats = new Map<string, {
      totalDuration: number;
      count: number;
      successes: number;
    }>();

    for (const metric of this.metrics) {
      for (const [stepName, duration] of Object.entries(metric.stepDurations)) {
        if (!stepStats.has(stepName)) {
          stepStats.set(stepName, { totalDuration: 0, count: 0, successes: 0 });
        }
        
        const stats = stepStats.get(stepName)!;
        stats.totalDuration += duration;
        stats.count += 1;
        
        // Count as success if step didn't timeout and overall request succeeded
        if (duration < this.slowQueryThreshold && metric.success) {
          stats.successes += 1;
        }
      }
    }

    const breakdown: Record<string, {
      averageDuration: number;
      count: number;
      successRate: number;
    }> = {};

    for (const [stepName, stats] of stepStats) {
      breakdown[stepName] = {
        averageDuration: Math.round(stats.totalDuration / stats.count),
        count: stats.count,
        successRate: Math.round((stats.successes / stats.count) * 100) / 100
      };
    }

    return breakdown;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Import metrics from JSON
   */
  importMetrics(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData) as PerformanceMetrics[];
      this.metrics = imported.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch (error) {
      console.error('[PerformanceTracker] Failed to import metrics:', error);
    }
  }
}

// Singleton instance for global use
let globalTracker: PerformanceTracker | null = null;

export function getGlobalPerformanceTracker(): PerformanceTracker {
  if (!globalTracker) {
    globalTracker = new PerformanceTracker({
      maxMetrics: parseInt(process.env.PERFORMANCE_MAX_METRICS || '1000'),
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '10000')
    });
  }
  return globalTracker;
}

export function clearGlobalPerformanceTracker(): void {
  if (globalTracker) {
    globalTracker.clear();
  }
}
