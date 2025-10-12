# Agent Tester - Metrics Tracking

## Overview

Comprehensive metrics tracking enables performance monitoring, cost analysis, and quality assessment over time.

## Metric Categories

### 1. Performance Metrics

```typescript
interface PerformanceMetrics {
  // End-to-end timing
  totalLatencyMs: number;
  
  // Agent breakdown
  orchestratorLatencyMs: number;
  plannerLatencyMs: number;
  executorLatencyMs: number;
  analyzerLatencyMs: number;
  summarizerLatencyMs: number;
  
  // Tool execution
  toolExecutionMs: Record<string, number>;
  toolParallelism: number;
  
  // Memory operations
  memoryQueryMs: number;
  memoryStoreMs: number;
  
  // Network
  networkLatencyMs: number;
  requestSizeBytes: number;
  responseSizeBytes: number;
}
```

### 2. Cost Metrics

```typescript
interface CostMetrics {
  // Token usage
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  // Cost breakdown
  llmCost: number;
  memoryCost: number;
  infraCost: number;
  totalCost: number;
  
  // Provider breakdown
  costByProvider: Record<string, number>;
}
```

### 3. Quality Metrics

```typescript
interface QualityMetrics {
  // Tool selection
  toolSelectionAccuracy: number;  // 0.0 - 1.0
  toolCountCorrect: boolean;
  
  // Analysis quality
  insightCount: number;
  entityCount: number;
  anomalyCount: number;
  analysisRelevance: number;  // 0.0 - 1.0
  
  // Response quality
  responseCompleteness: number;  // 0.0 - 1.0
  responseAccuracy: number;  // 0.0 - 1.0
  responseHelpfulness: number;  // 0.0 - 1.0
  
  // Validation
  validationConfidence: number;  // 0.0 - 1.0
  validationsPassed: number;
  validationsFailed: number;
}
```

### 4. System Health Metrics

```typescript
interface HealthMetrics {
  // Success rates
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  
  // Retry statistics
  retryCount: number;
  avgRetriesPerRequest: number;
  
  // Error categories
  errorsByType: Record<string, number>;
  
  // Resource usage
  memoryUsageMB: number;
  cpuUsagePercent: number;
}
```

## Metrics Collection

```typescript
class MetricsCollector {
  private metrics: TestMetrics[] = [];
  private db: MetricsDatabase;
  
  async record(testResult: TestResult): Promise<void> {
    const metrics: TestMetrics = {
      timestamp: Date.now(),
      scenarioId: testResult.scenario.id,
      scenarioCategory: testResult.scenario.category,
      
      // Performance
      performance: extractPerformanceMetrics(testResult),
      
      // Cost
      cost: calculateCostMetrics(testResult),
      
      // Quality
      quality: assessQualityMetrics(testResult),
      
      // Health
      health: {
        success: testResult.success,
        errorType: testResult.error?.type,
        retries: testResult.retries || 0
      }
    };
    
    this.metrics.push(metrics);
    await this.db.insert(metrics);
  }
  
  getAggregated(timeRange: TimeRange): AggregatedMetrics {
    const filtered = this.filterByTime(timeRange);
    return this.aggregate(filtered);
  }
}
```

## Metrics Storage

### SQLite Schema

```sql
CREATE TABLE test_runs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  duration_ms INTEGER,
  scenario_count INTEGER,
  passed_count INTEGER,
  failed_count INTEGER,
  total_cost REAL
);

CREATE TABLE test_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  
  -- Performance
  total_latency_ms INTEGER,
  planner_latency_ms INTEGER,
  executor_latency_ms INTEGER,
  analyzer_latency_ms INTEGER,
  summarizer_latency_ms INTEGER,
  
  -- Cost
  total_tokens INTEGER,
  total_cost REAL,
  
  -- Quality
  tool_selection_accuracy REAL,
  validation_confidence REAL,
  
  -- Success
  success BOOLEAN,
  error_type TEXT,
  
  FOREIGN KEY (run_id) REFERENCES test_runs(id)
);

CREATE INDEX idx_timestamp ON test_metrics(timestamp);
CREATE INDEX idx_scenario ON test_metrics(scenario_id);
CREATE INDEX idx_run ON test_metrics(run_id);
```

## Aggregation and Analysis

```typescript
interface AggregatedMetrics {
  // Summary
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  
  // Performance (all in ms)
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  minLatency: number;
  
  // Cost
  totalCost: number;
  avgCostPerTest: number;
  totalTokens: number;
  avgTokensPerTest: number;
  
  // Quality
  avgToolAccuracy: number;
  avgValidationConfidence: number;
  
  // Trends
  performanceTrend: 'improving' | 'degrading' | 'stable';
  costTrend: 'increasing' | 'decreasing' | 'stable';
  qualityTrend: 'improving' | 'degrading' | 'stable';
}

function aggregate(metrics: TestMetrics[]): AggregatedMetrics {
  return {
    totalTests: metrics.length,
    passedTests: metrics.filter(m => m.health.success).length,
    failedTests: metrics.filter(m => !m.health.success).length,
    successRate: metrics.filter(m => m.health.success).length / metrics.length,
    
    avgLatency: average(metrics.map(m => m.performance.totalLatencyMs)),
    p50Latency: percentile(metrics.map(m => m.performance.totalLatencyMs), 50),
    p95Latency: percentile(metrics.map(m => m.performance.totalLatencyMs), 95),
    p99Latency: percentile(metrics.map(m => m.performance.totalLatencyMs), 99),
    
    totalCost: sum(metrics.map(m => m.cost.totalCost)),
    avgCostPerTest: average(metrics.map(m => m.cost.totalCost)),
    
    totalTokens: sum(metrics.map(m => m.cost.tokenUsage.totalTokens)),
    avgTokensPerTest: average(metrics.map(m => m.cost.tokenUsage.totalTokens)),
    
    avgToolAccuracy: average(metrics.map(m => m.quality.toolSelectionAccuracy)),
    avgValidationConfidence: average(metrics.map(m => m.quality.validationConfidence)),
    
    performanceTrend: calculateTrend(metrics, m => m.performance.totalLatencyMs),
    costTrend: calculateTrend(metrics, m => m.cost.totalCost),
    qualityTrend: calculateTrend(metrics, m => m.quality.validationConfidence)
  };
}
```

## Real-Time Monitoring

```typescript
class MetricsMonitor {
  private window: TestMetrics[] = [];
  private windowSize: number = 100;
  
  add(metrics: TestMetrics): void {
    this.window.push(metrics);
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
    
    this.checkThresholds(metrics);
  }
  
  private checkThresholds(metrics: TestMetrics): void {
    // Alert on high latency
    if (metrics.performance.totalLatencyMs > 10000) {
      this.alert('high_latency', metrics);
    }
    
    // Alert on high cost
    if (metrics.cost.totalCost > 1.0) {
      this.alert('high_cost', metrics);
    }
    
    // Alert on low quality
    if (metrics.quality.validationConfidence < 0.5) {
      this.alert('low_quality', metrics);
    }
  }
  
  getCurrentStats(): RealtimeStats {
    return {
      recentLatency: this.window.map(m => m.performance.totalLatencyMs),
      recentSuccessRate: this.window.filter(m => m.health.success).length / this.window.length,
      recentCost: sum(this.window.map(m => m.cost.totalCost))
    };
  }
}
```

---

**Next Document:** [07-reporting.md](./07-reporting.md) - Reports and dashboards

