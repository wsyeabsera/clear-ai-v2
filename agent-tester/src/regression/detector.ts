import type { TestSuiteResult, TestResult } from '../types/scenario.js';
import type {
  BaselineMetadata,
  RegressionReport,
  RegressionDetail,
  RegressionSeverity,
  TestRunMetadata,
} from '../types/regression.js';

export class RegressionDetector {
  // Thresholds for regression detection
  private readonly PERFORMANCE_REGRESSION_THRESHOLD = 0.20; // 20% increase
  private readonly QUALITY_REGRESSION_THRESHOLD = 0.10; // 10% decrease
  private readonly CRITICAL_LATENCY_THRESHOLD = 0.50; // 50% increase

  /**
   * Detect regressions between baseline and current results
   */
  detect(
    baseline: TestSuiteResult,
    current: TestSuiteResult,
    baselineMetadata: BaselineMetadata,
    currentMetadata: TestRunMetadata
  ): RegressionReport {
    const regressions: RegressionDetail[] = [];
    const improvements: string[] = [];

    // Create maps for easy lookup
    const baselineMap = new Map<string, TestResult>();
    baseline.scenarios.forEach(test => {
      baselineMap.set(test.scenario.id, test);
    });

    const currentMap = new Map<string, TestResult>();
    current.scenarios.forEach(test => {
      currentMap.set(test.scenario.id, test);
    });

    // Compare each scenario
    for (const [scenarioId, currentTest] of currentMap.entries()) {
      const baselineTest = baselineMap.get(scenarioId);

      if (!baselineTest) {
        // New test - not a regression
        continue;
      }

      // Check for functionality regression
      if (baselineTest.success && !currentTest.success) {
        regressions.push({
          scenarioId,
          scenarioName: currentTest.scenario.name,
          type: 'functionality',
          severity: 'critical',
          message: `Test now failing (was passing in baseline)`,
          baseline: { passed: true },
          current: { passed: false },
          change: {},
        });
      }

      // Check for performance regression
      if (baselineTest.success && currentTest.success) {
        const baselineLatency = baselineTest.metrics.totalLatencyMs;
        const currentLatency = currentTest.metrics.totalLatencyMs;
        const latencyIncrease = currentLatency - baselineLatency;
        const latencyIncreasePercent = (latencyIncrease / baselineLatency) * 100;

        if (latencyIncreasePercent > this.PERFORMANCE_REGRESSION_THRESHOLD * 100) {
          const severity = this.getPerformanceSeverity(latencyIncreasePercent);
          regressions.push({
            scenarioId,
            scenarioName: currentTest.scenario.name,
            type: 'performance',
            severity,
            message: `Latency increased by ${latencyIncreasePercent.toFixed(1)}%`,
            baseline: { latency: baselineLatency },
            current: { latency: currentLatency },
            change: {
              latencyIncrease,
              latencyIncreasePercent,
            },
          });
        } else if (latencyIncreasePercent < -10) {
          // Performance improvement
          improvements.push(
            `${scenarioId}: Latency improved by ${Math.abs(latencyIncreasePercent).toFixed(1)}%`
          );
        }

        // Check for quality regression
        const baselineConfidence = baselineTest.validationResult.confidence;
        const currentConfidence = currentTest.validationResult.confidence;
        const confidenceDecrease = baselineConfidence - currentConfidence;
        const confidenceDecreasePercent = (confidenceDecrease / baselineConfidence) * 100;

        if (confidenceDecreasePercent > this.QUALITY_REGRESSION_THRESHOLD * 100) {
          const severity = this.getQualitySeverity(confidenceDecreasePercent);
          regressions.push({
            scenarioId,
            scenarioName: currentTest.scenario.name,
            type: 'quality',
            severity,
            message: `Validation confidence decreased by ${confidenceDecreasePercent.toFixed(1)}%`,
            baseline: { confidence: baselineConfidence },
            current: { confidence: currentConfidence },
            change: {
              confidenceDecrease,
              confidenceDecreasePercent,
            },
          });
        }
      }
    }

    // Check for missing tests
    for (const [scenarioId, baselineTest] of baselineMap.entries()) {
      if (!currentMap.has(scenarioId)) {
        regressions.push({
          scenarioId,
          scenarioName: baselineTest.scenario.name,
          type: 'functionality',
          severity: 'high',
          message: `Test missing in current run (was present in baseline)`,
          baseline: { passed: baselineTest.success },
          current: {},
          change: {},
        });
      }
    }

    // Overall success rate comparison
    const successRateChange = currentMetadata.successRate - baselineMetadata.successRate;
    if (successRateChange < -5) {
      // 5% decrease in success rate
      improvements.push(`Overall success rate decreased by ${Math.abs(successRateChange).toFixed(1)}%`);
    } else if (successRateChange > 5) {
      improvements.push(`Overall success rate improved by ${successRateChange.toFixed(1)}%`);
    }

    // Categorize regressions by severity
    const summary = {
      critical: regressions.filter(r => r.severity === 'critical').length,
      high: regressions.filter(r => r.severity === 'high').length,
      medium: regressions.filter(r => r.severity === 'medium').length,
      low: regressions.filter(r => r.severity === 'low').length,
      total: regressions.length,
    };

    return {
      hasRegressions: regressions.length > 0,
      summary,
      details: regressions,
      comparison: {
        baseline: baselineMetadata,
        current: currentMetadata,
      },
      improvements,
      regressions: regressions.map(r => r.message),
    };
  }

  private getPerformanceSeverity(increasePercent: number): RegressionSeverity {
    if (increasePercent > this.CRITICAL_LATENCY_THRESHOLD * 100) {
      return 'critical';
    } else if (increasePercent > 35) {
      return 'high';
    } else if (increasePercent > 25) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getQualitySeverity(decreasePercent: number): RegressionSeverity {
    if (decreasePercent > 25) {
      return 'critical';
    } else if (decreasePercent > 20) {
      return 'high';
    } else if (decreasePercent > 15) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

