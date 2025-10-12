/**
 * Comparison Reporter
 * Compares two test runs to detect regressions or improvements
 */

import chalk from 'chalk';
import type { TestSuiteResult } from '../types/scenario.js';

export interface ComparisonResult {
  baseline: TestSuiteResult;
  current: TestSuiteResult;
  regressions: RegressionItem[];
  improvements: ImprovementItem[];
  summary: ComparisonSummary;
}

export interface RegressionItem {
  scenarioId: string;
  type: 'functionality' | 'performance' | 'quality';
  description: string;
  baselineValue: any;
  currentValue: any;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ImprovementItem {
  scenarioId: string;
  type: 'functionality' | 'performance' | 'quality';
  description: string;
  improvement: string;
}

export interface ComparisonSummary {
  baselineSuccessRate: number;
  currentSuccessRate: number;
  successRateDelta: number;
  baselineAvgLatency: number;
  currentAvgLatency: number;
  latencyDelta: number;
  latencyDeltaPercent: number;
  newFailures: number;
  newPasses: number;
  totalRegressions: number;
  totalImprovements: number;
}

export class ComparisonReporter {
  /**
   * Compare two test runs
   */
  compare(baseline: TestSuiteResult, current: TestSuiteResult): ComparisonResult {
    const regressions: RegressionItem[] = [];
    const improvements: ImprovementItem[] = [];

    // Compare scenario by scenario
    for (const currentScenario of current.scenarios) {
      const baselineScenario = baseline.scenarios.find(
        s => s.scenario.id === currentScenario.scenario.id
      );

      if (!baselineScenario) continue;

      // Check for new failures
      if (baselineScenario.success && !currentScenario.success) {
        regressions.push({
          scenarioId: currentScenario.scenario.id,
          type: 'functionality',
          description: 'Scenario now failing',
          baselineValue: 'PASSED',
          currentValue: 'FAILED',
          severity: 'critical',
        });
      }

      // Check for new passes
      if (!baselineScenario.success && currentScenario.success) {
        improvements.push({
          scenarioId: currentScenario.scenario.id,
          type: 'functionality',
          description: 'Scenario now passing',
          improvement: 'Fixed',
        });
      }

      // Check for performance regression (>20% slower)
      if (baselineScenario.success && currentScenario.success) {
        const baselineLatency = baselineScenario.duration;
        const currentLatency = currentScenario.duration;
        const increase = ((currentLatency - baselineLatency) / baselineLatency) * 100;

        if (increase > 20) {
          regressions.push({
            scenarioId: currentScenario.scenario.id,
            type: 'performance',
            description: `Latency increased by ${increase.toFixed(1)}%`,
            baselineValue: `${baselineLatency}ms`,
            currentValue: `${currentLatency}ms`,
            severity: increase > 50 ? 'high' : 'medium',
          });
        }

        // Check for performance improvement (>20% faster)
        if (increase < -20) {
          improvements.push({
            scenarioId: currentScenario.scenario.id,
            type: 'performance',
            description: `Latency decreased by ${Math.abs(increase).toFixed(1)}%`,
            improvement: 'Faster',
          });
        }

        // Check for quality regression
        const baselineConfidence = baselineScenario.validationResult.confidence;
        const currentConfidence = currentScenario.validationResult.confidence;
        const confidenceDrop = baselineConfidence - currentConfidence;

        if (confidenceDrop > 0.1) {
          regressions.push({
            scenarioId: currentScenario.scenario.id,
            type: 'quality',
            description: `Validation confidence dropped`,
            baselineValue: `${(baselineConfidence * 100).toFixed(0)}%`,
            currentValue: `${(currentConfidence * 100).toFixed(0)}%`,
            severity: 'low',
          });
        }
      }
    }

    // Calculate summary
    const summary: ComparisonSummary = {
      baselineSuccessRate: baseline.summary.successRate,
      currentSuccessRate: current.summary.successRate,
      successRateDelta: current.summary.successRate - baseline.summary.successRate,
      baselineAvgLatency: baseline.summary.avgDuration,
      currentAvgLatency: current.summary.avgDuration,
      latencyDelta: current.summary.avgDuration - baseline.summary.avgDuration,
      latencyDeltaPercent: ((current.summary.avgDuration - baseline.summary.avgDuration) / baseline.summary.avgDuration) * 100,
      newFailures: regressions.filter(r => r.type === 'functionality').length,
      newPasses: improvements.filter(i => i.type === 'functionality').length,
      totalRegressions: regressions.length,
      totalImprovements: improvements.length,
    };

    return {
      baseline,
      current,
      regressions,
      improvements,
      summary,
    };
  }

  /**
   * Print comparison report
   */
  printComparison(comparison: ComparisonResult): void {
    console.log(chalk.bold('\n' + '='.repeat(70)));
    console.log(chalk.bold('Baseline vs Current Comparison'));
    console.log(chalk.bold('='.repeat(70)));

    const { summary } = comparison;

    // Success rate comparison
    console.log(chalk.bold('\n📊 Success Rate:'));
    const successColor = summary.successRateDelta >= 0 ? chalk.green : chalk.red;
    const successSymbol = summary.successRateDelta >= 0 ? '↑' : '↓';
    console.log(`  Baseline: ${summary.baselineSuccessRate.toFixed(1)}%`);
    console.log(`  Current:  ${summary.currentSuccessRate.toFixed(1)}%`);
    console.log(successColor(`  Change:   ${successSymbol} ${Math.abs(summary.successRateDelta).toFixed(1)}%`));

    // Latency comparison
    console.log(chalk.bold('\n⚡ Average Latency:'));
    const latencyColor = summary.latencyDelta <= 0 ? chalk.green : chalk.red;
    const latencySymbol = summary.latencyDelta <= 0 ? '↓' : '↑';
    console.log(`  Baseline: ${summary.baselineAvgLatency.toFixed(0)}ms`);
    console.log(`  Current:  ${summary.currentAvgLatency.toFixed(0)}ms`);
    console.log(latencyColor(`  Change:   ${latencySymbol} ${Math.abs(summary.latencyDeltaPercent).toFixed(1)}%`));

    // Regressions
    if (comparison.regressions.length > 0) {
      console.log(chalk.bold.red(`\n❌ Regressions Detected: ${comparison.regressions.length}`));
      for (const regression of comparison.regressions) {
        const severityColor = regression.severity === 'critical' ? chalk.red :
                              regression.severity === 'high' ? chalk.yellow :
                              chalk.gray;
        console.log(severityColor(`  [${regression.severity.toUpperCase()}] ${regression.scenarioId}: ${regression.description}`));
        console.log(chalk.gray(`    Baseline: ${regression.baselineValue} → Current: ${regression.currentValue}`));
      }
    } else {
      console.log(chalk.green('\n✅ No Regressions Detected'));
    }

    // Improvements
    if (comparison.improvements.length > 0) {
      console.log(chalk.bold.green(`\n✨ Improvements: ${comparison.improvements.length}`));
      for (const improvement of comparison.improvements) {
        console.log(chalk.green(`  ${improvement.scenarioId}: ${improvement.description}`));
      }
    }

    console.log(chalk.bold('\n' + '='.repeat(70) + '\n'));
  }
}

