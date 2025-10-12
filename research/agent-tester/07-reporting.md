# Agent Tester - Reporting System

## Overview

The Reporting System transforms raw test results and metrics into actionable insights through real-time console output, summary reports, comparison analysis, and optional dashboard UI.

## Report Types

### 1. Real-Time Console Output

**Purpose:** Immediate feedback during test execution

**Format:**
```
Agent Tester v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running: comprehensive-test-suite
Started: 2025-10-12 10:00:00
Config: 100 scenarios, 5 parallel

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: ████████████████░░░░░░░░░░░░ 45/100 (45%) 

✓ simple-001: List shipments                    1.2s  $0.01  95%
✓ simple-002: Search facilities                 0.9s  $0.01  98%
✗ complex-001: Contamination analysis           5.2s  $0.05  45%
  └─ Tool selection incorrect
     Expected: [shipments, contaminants]
     Actual:   [shipments]
     
⚠ simple-003: Find inspections                  2.1s  $0.02  78%
  └─ Low confidence on semantic validation
  
⏱ complex-002: Facility capacity (running...)   3.5s

Current Stats:
  Passed:  42  Failed:  3  Pending:  55
  Avg Latency: 1.8s  Total Cost: $1.25
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Implementation:**
```typescript
class ConsoleReporter {
  private spinner: Ora;
  private progressBar: ProgressBar;
  
  start(totalTests: number): void {
    this.progressBar = new ProgressBar(totalTests);
    console.log(chalk.blue.bold('Agent Tester v1.0.0'));
    console.log(chalk.gray('━'.repeat(70)));
  }
  
  reportTest(result: TestResult): void {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? 'green' : 'red';
    const duration = `${(result.metrics.totalLatencyMs / 1000).toFixed(1)}s`;
    const cost = `$${result.metrics.cost.toFixed(2)}`;
    const confidence = `${(result.validation.confidence * 100).toFixed(0)}%`;
    
    console.log(
      chalk[color](icon),
      chalk.white(result.scenario.name.padEnd(40)),
      chalk.gray(duration.padEnd(6)),
      chalk.yellow(cost.padEnd(6)),
      chalk.cyan(confidence)
    );
    
    if (!result.success) {
      result.validation.errors.forEach(err => {
        console.log(chalk.red(`  └─ ${err}`));
      });
    }
    
    this.progressBar.increment();
  }
  
  finish(summary: TestSummary): void {
    console.log(chalk.gray('━'.repeat(70)));
    console.log(chalk.bold('Summary:'));
    console.log(`  Total:    ${summary.total}`);
    console.log(`  Passed:   ${chalk.green(summary.passed)}`);
    console.log(`  Failed:   ${chalk.red(summary.failed)}`);
    console.log(`  Duration: ${summary.durationMs}ms`);
    console.log(`  Cost:     $${summary.totalCost.toFixed(2)}`);
  }
}
```

### 2. Summary Report (JSON)

**Purpose:** Machine-readable test results

```json
{
  "testRun": {
    "id": "run-2025-10-12-100000",
    "timestamp": "2025-10-12T10:00:00Z",
    "durationMs": 512000,
    "config": {
      "scenarioCount": 100,
      "parallelLimit": 5,
      "timeout": 30000
    }
  },
  "results": {
    "total": 100,
    "passed": 92,
    "failed": 6,
    "skipped": 2,
    "successRate": 0.92
  },
  "performance": {
    "avgLatencyMs": 2100,
    "p50LatencyMs": 1800,
    "p95LatencyMs": 4200,
    "p99LatencyMs": 6100,
    "minLatencyMs": 450,
    "maxLatencyMs": 8200
  },
  "cost": {
    "totalTokens": 125000,
    "promptTokens": 50000,
    "completionTokens": 75000,
    "totalCost": 2.50,
    "avgCostPerTest": 0.025
  },
  "quality": {
    "avgToolAccuracy": 0.94,
    "avgValidationConfidence": 0.87,
    "analysisQuality": 0.89
  },
  "failures": [
    {
      "scenarioId": "complex-001",
      "error": "Tool selection incorrect",
      "confidence": 0.45
    }
  ]
}
```

### 3. Comparison Report

**Purpose:** Compare current run against baseline

```typescript
interface ComparisonReport {
  baseline: TestSummary;
  current: TestSummary;
  changes: {
    performance: MetricChange;
    cost: MetricChange;
    quality: MetricChange;
  };
  regressions: Regression[];
  improvements: Improvement[];
}

interface MetricChange {
  metric: string;
  baselineValue: number;
  currentValue: number;
  change: number;
  percentChange: number;
  direction: 'better' | 'worse' | 'neutral';
}

// Example output
const comparisonOutput = `
Performance Comparison: baseline (Oct 10) vs current (Oct 12)
═════════════════════════════════════════════════════════════

📊 Performance
  Avg Latency:   2.3s → 2.1s    ✓  8.7% faster
  P95 Latency:   5.1s → 4.2s    ✓ 17.6% faster
  P99 Latency:   7.2s → 6.1s    ✓ 15.3% faster

💰 Cost
  Total Cost:    $2.80 → $2.50  ✓ 10.7% cheaper
  Tokens:        140K → 125K    ✓ 10.7% fewer
  Avg Per Test:  $0.028 → $0.025  ✓ 10.7% cheaper

✨ Quality
  Tool Accuracy: 92% → 94%      ✓  2.2% better
  Validation:    85% → 87%      ✓  2.4% better
  Success Rate:  94% → 92%      ✗  2.1% worse

🚨 Regressions Detected: 3

  1. complex-001: Contamination analysis
     Tool selection accuracy dropped from 100% to 60%
     Impact: CRITICAL
     
  2. performance-test-5: Concurrent 100 requests
     P95 latency increased from 8.2s to 9.5s (+15.9%)
     Impact: HIGH
     
  3. edge-case-007: Timeout handling
     New timeout error not seen in baseline
     Impact: MEDIUM

📈 Improvements: 5

  1. simple-queries: 8% faster average
  2. Token usage: 10% reduction across all tests
  3. Analysis quality: More relevant insights
  
Recommendation: Fix regressions before merge
`;
```

### 4. HTML Dashboard

**Purpose:** Interactive visualization

**Features:**
- Trend charts (latency, cost, quality over time)
- Test result table (filterable, sortable)
- Drill-down into failures
- Performance heatmaps
- Cost breakdown pie charts

**Technology:**
- Templates: Handlebars
- Charts: Chart.js or Recharts
- Styling: Tailwind CSS
- Export: PDF via Puppeteer

**Example Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Agent Test Results - Oct 12, 2025</title>
</head>
<body>
  <header>
    <h1>Test Run: comprehensive-v1</h1>
    <div class="summary">
      <div class="metric success">92% Success Rate</div>
      <div class="metric latency">2.1s Avg Latency</div>
      <div class="metric cost">$2.50 Total Cost</div>
    </div>
  </header>
  
  <section class="charts">
    <div class="chart">
      <h2>Latency Distribution</h2>
      <canvas id="latency-chart"></canvas>
    </div>
    <div class="chart">
      <h2>Cost Breakdown</h2>
      <canvas id="cost-chart"></canvas>
    </div>
  </section>
  
  <section class="results">
    <h2>Test Results</h2>
    <table id="results-table">
      <!-- Filterable, sortable table -->
    </table>
  </section>
  
  <section class="failures">
    <h2>Failures (6)</h2>
    <!-- Detailed failure analysis -->
  </section>
</body>
</html>
```

## Regression Detection

```typescript
interface RegressionDetector {
  detect(baseline: TestMetrics[], current: TestMetrics[]): Regression[];
}

interface Regression {
  scenarioId: string;
  type: 'performance' | 'cost' | 'quality' | 'functional';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  baselineValue: any;
  currentValue: any;
  change: number;
}

function detectRegressions(
  baseline: TestMetrics[],
  current: TestMetrics[]
): Regression[] {
  const regressions: Regression[] = [];
  
  // Compare by scenario ID
  const baselineMap = new Map(baseline.map(m => [m.scenarioId, m]));
  
  for (const currentMetric of current) {
    const baselineMetric = baselineMap.get(currentMetric.scenarioId);
    if (!baselineMetric) continue;
    
    // Performance regression: > 20% slower
    if (currentMetric.performance.totalLatencyMs > baselineMetric.performance.totalLatencyMs * 1.2) {
      regressions.push({
        scenarioId: currentMetric.scenarioId,
        type: 'performance',
        severity: 'high',
        description: 'Latency increased significantly',
        baselineValue: baselineMetric.performance.totalLatencyMs,
        currentValue: currentMetric.performance.totalLatencyMs,
        change: currentMetric.performance.totalLatencyMs - baselineMetric.performance.totalLatencyMs
      });
    }
    
    // Cost regression: > 15% more expensive
    if (currentMetric.cost.totalCost > baselineMetric.cost.totalCost * 1.15) {
      regressions.push({
        scenarioId: currentMetric.scenarioId,
        type: 'cost',
        severity: 'medium',
        description: 'Cost increased',
        baselineValue: baselineMetric.cost.totalCost,
        currentValue: currentMetric.cost.totalCost,
        change: currentMetric.cost.totalCost - baselineMetric.cost.totalCost
      });
    }
    
    // Quality regression: validation confidence dropped
    if (currentMetric.quality.validationConfidence < baselineMetric.quality.validationConfidence - 0.1) {
      regressions.push({
        scenarioId: currentMetric.scenarioId,
        type: 'quality',
        severity: 'high',
        description: 'Validation confidence decreased',
        baselineValue: baselineMetric.quality.validationConfidence,
        currentValue: currentMetric.quality.validationConfidence,
        change: currentMetric.quality.validationConfidence - baselineMetric.quality.validationConfidence
      });
    }
    
    // Functional regression: now failing
    if (baselineMetric.health.success && !currentMetric.health.success) {
      regressions.push({
        scenarioId: currentMetric.scenarioId,
        type: 'functional',
        severity: 'critical',
        description: 'Test now failing (was passing)',
        baselineValue: true,
        currentValue: false,
        change: -1
      });
    }
  }
  
  return regressions.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
```

## CI/CD Integration

### GitHub Actions Output

```typescript
function generateGitHubSummary(results: TestResults): string {
  const passRate = (results.passed / results.total * 100).toFixed(1);
  
  return `
## Agent Test Results

**Status:** ${results.failed === 0 ? '✅ PASSED' : '❌ FAILED'}

### Summary
- Total Tests: ${results.total}
- Passed: ${results.passed} (${passRate}%)
- Failed: ${results.failed}
- Duration: ${formatDuration(results.durationMs)}
- Cost: $${results.totalCost.toFixed(2)}

### Performance
- Avg Latency: ${results.avgLatency}ms
- P95 Latency: ${results.p95Latency}ms
- Success Rate: ${passRate}%

${results.failed > 0 ? `
### Failures
${results.failures.map(f => `- **${f.scenarioId}**: ${f.error}`).join('\n')}
` : ''}

${results.regressions.length > 0 ? `
### 🚨 Regressions Detected: ${results.regressions.length}
${results.regressions.slice(0, 5).map(r => `- **${r.scenarioId}**: ${r.description}`).join('\n')}
` : ''}
`;
}
```

### Exit Codes

```typescript
enum ExitCode {
  SUCCESS = 0,              // All tests passed
  TEST_FAILURES = 1,        // Some tests failed
  REGRESSIONS = 2,          // Regressions detected
  CRITICAL_FAILURE = 3,     // Critical test failed
  SETUP_ERROR = 4,          // Setup/configuration error
  INTERNAL_ERROR = 5        // Internal tester error
}

function determineExitCode(results: TestResults): ExitCode {
  if (results.setupError) return ExitCode.SETUP_ERROR;
  if (results.internalError) return ExitCode.INTERNAL_ERROR;
  if (results.criticalFailures > 0) return ExitCode.CRITICAL_FAILURE;
  if (results.regressions.length > 0) return ExitCode.REGRESSIONS;
  if (results.failed > 0) return ExitCode.TEST_FAILURES;
  return ExitCode.SUCCESS;
}
```

## Report Formats

### JSON Export

```bash
# Export to JSON
yarn test:run --output json --file results/run-20251012.json
```

### CSV Export

```bash
# Export metrics to CSV for Excel analysis
yarn test:run --output csv --file results/metrics.csv
```

### HTML Report

```bash
# Generate interactive HTML report
yarn test:run --output html --file results/report.html
```

### PDF Export

```bash
# Generate PDF for sharing
yarn test:run --output pdf --file results/report.pdf
```

## Historical Tracking

```typescript
interface HistoricalReport {
  timeRange: {
    start: string;
    end: string;
  };
  runs: TestRunSummary[];
  trends: {
    performance: TrendData;
    cost: TrendData;
    quality: TrendData;
  };
  insights: string[];
}

interface TrendData {
  values: number[];
  timestamps: string[];
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
}

// Generate 30-day trend report
function generateTrendReport(days: number = 30): HistoricalReport {
  const runs = getTestRuns(days);
  
  return {
    timeRange: {
      start: subDays(new Date(), days).toISOString(),
      end: new Date().toISOString()
    },
    runs: runs.map(summarizeRun),
    trends: {
      performance: calculateTrend(runs, r => r.avgLatency),
      cost: calculateTrend(runs, r => r.totalCost),
      quality: calculateTrend(runs, r => r.successRate)
    },
    insights: generateInsights(runs)
  };
}
```

---

**Next Document:** [08-data-management.md](./08-data-management.md) - Test data handling

