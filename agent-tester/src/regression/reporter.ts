import chalk from 'chalk';
import type { RegressionReport, RegressionDetail } from '../types/regression.js';

export class RegressionReporter {
  /**
   * Print regression report to console with colors
   */
  printConsole(report: RegressionReport): void {
    console.log('\n' + '='.repeat(70));
    console.log(chalk.bold.white('  REGRESSION DETECTION REPORT'));
    console.log('='.repeat(70) + '\n');

    // Summary
    this.printSummary(report);

    // Regressions
    if (report.hasRegressions) {
      this.printRegressions(report);
    } else {
      console.log(chalk.green.bold('\n✅ NO REGRESSIONS DETECTED!\n'));
    }

    // Improvements
    if (report.improvements.length > 0) {
      this.printImprovements(report);
    }

    // Comparison
    this.printComparison(report);

    console.log('='.repeat(70) + '\n');
  }

  /**
   * Generate Markdown report for GitHub PR comments
   */
  generateMarkdown(report: RegressionReport): string {
    const lines: string[] = [];

    lines.push('## 🔍 Regression Detection Report');
    lines.push('');

    // Summary
    if (report.hasRegressions) {
      lines.push(`### ⚠️ **Regressions Detected: ${report.summary.total}**`);
      lines.push('');
      lines.push(`- 🔴 Critical: ${report.summary.critical}`);
      lines.push(`- 🟠 High: ${report.summary.high}`);
      lines.push(`- 🟡 Medium: ${report.summary.medium}`);
      lines.push(`- 🔵 Low: ${report.summary.low}`);
    } else {
      lines.push('### ✅ No Regressions Detected');
    }

    lines.push('');

    // Comparison
    lines.push('### 📊 Baseline Comparison');
    lines.push('');
    lines.push('| Metric | Baseline | Current | Change |');
    lines.push('|--------|----------|---------|--------|');

    const baselineRate = report.comparison.baseline.successRate;
    const currentRate = report.comparison.current.successRate;
    const rateChange = currentRate - baselineRate;
    const rateIcon = rateChange >= 0 ? '📈' : '📉';

    lines.push(
      `| Success Rate | ${baselineRate.toFixed(1)}% | ${currentRate.toFixed(1)}% | ${rateIcon} ${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(1)}% |`
    );

    const baselineDuration = report.comparison.baseline.avgDuration;
    const currentDuration = report.comparison.current.avgDuration;
    const durationChange = currentDuration - baselineDuration;
    const durationIcon = durationChange <= 0 ? '⚡' : '🐌';

    lines.push(
      `| Avg Duration | ${baselineDuration.toFixed(0)}ms | ${currentDuration.toFixed(0)}ms | ${durationIcon} ${durationChange >= 0 ? '+' : ''}${durationChange.toFixed(0)}ms |`
    );

    lines.push(
      `| Tests Passed | ${report.comparison.baseline.passedTests}/${report.comparison.baseline.totalTests} | ${report.comparison.current.passedTests}/${report.comparison.current.totalTests} | ${report.comparison.current.passedTests - report.comparison.baseline.passedTests >= 0 ? '✅' : '❌'} |`
    );

    lines.push('');

    // Regressions Details
    if (report.hasRegressions) {
      lines.push('### 🔴 Regression Details');
      lines.push('');

      // Group by severity
      const critical = report.details.filter(r => r.severity === 'critical');
      const high = report.details.filter(r => r.severity === 'high');
      const medium = report.details.filter(r => r.severity === 'medium');
      const low = report.details.filter(r => r.severity === 'low');

      if (critical.length > 0) {
        lines.push('#### 🔴 Critical');
        critical.forEach(r => {
          lines.push(`- **${r.scenarioId}**: ${r.message}`);
        });
        lines.push('');
      }

      if (high.length > 0) {
        lines.push('#### 🟠 High');
        high.forEach(r => {
          lines.push(`- **${r.scenarioId}**: ${r.message}`);
        });
        lines.push('');
      }

      if (medium.length > 0) {
        lines.push('#### 🟡 Medium');
        medium.forEach(r => {
          lines.push(`- **${r.scenarioId}**: ${r.message}`);
        });
        lines.push('');
      }

      if (low.length > 0) {
        lines.push('#### 🔵 Low');
        low.forEach(r => {
          lines.push(`- **${r.scenarioId}**: ${r.message}`);
        });
        lines.push('');
      }
    }

    // Improvements
    if (report.improvements.length > 0) {
      lines.push('### ✅ Improvements');
      lines.push('');
      report.improvements.forEach(improvement => {
        lines.push(`- ${improvement}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export report as JSON
   */
  exportJSON(report: RegressionReport): string {
    return JSON.stringify(report, null, 2);
  }

  // Private helper methods for console output

  private printSummary(report: RegressionReport): void {
    console.log(chalk.bold('Summary:'));

    if (report.hasRegressions) {
      console.log(chalk.red(`  ❌ Total Regressions: ${report.summary.total}`));
      if (report.summary.critical > 0) {
        console.log(chalk.red.bold(`     🔴 Critical: ${report.summary.critical}`));
      }
      if (report.summary.high > 0) {
        console.log(chalk.yellow.bold(`     🟠 High: ${report.summary.high}`));
      }
      if (report.summary.medium > 0) {
        console.log(chalk.yellow(`     🟡 Medium: ${report.summary.medium}`));
      }
      if (report.summary.low > 0) {
        console.log(chalk.blue(`     🔵 Low: ${report.summary.low}`));
      }
    } else {
      console.log(chalk.green('  ✅ No Regressions'));
    }

    console.log('');
  }

  private printRegressions(report: RegressionReport): void {
    console.log(chalk.bold.red('\nRegressions:'));

    // Group by severity
    const bySeverity = {
      critical: report.details.filter(r => r.severity === 'critical'),
      high: report.details.filter(r => r.severity === 'high'),
      medium: report.details.filter(r => r.severity === 'medium'),
      low: report.details.filter(r => r.severity === 'low'),
    };

    for (const [severity, details] of Object.entries(bySeverity)) {
      if (details.length === 0) continue;

      const color = this.getSeverityColor(severity as any);
      const icon = this.getSeverityIcon(severity as any);

      console.log(`\n${color.bold(`  ${icon} ${severity.toUpperCase()}:`)}`);

      details.forEach(detail => {
        console.log(color(`    • ${detail.scenarioId}: ${detail.scenarioName}`));
        console.log(color(`      ${detail.message}`));

        if (detail.change.latencyIncreasePercent) {
          console.log(
            chalk.gray(
              `      Latency: ${detail.baseline.latency}ms → ${detail.current.latency}ms (+${detail.change.latencyIncreasePercent.toFixed(1)}%)`
            )
          );
        }

        if (detail.change.confidenceDecreasePercent) {
          console.log(
            chalk.gray(
              `      Confidence: ${detail.baseline.confidence?.toFixed(2)} → ${detail.current.confidence?.toFixed(2)} (-${detail.change.confidenceDecreasePercent.toFixed(1)}%)`
            )
          );
        }
      });
    }
  }

  private printImprovements(report: RegressionReport): void {
    console.log(chalk.bold.green('\nImprovements:'));
    report.improvements.forEach(improvement => {
      console.log(chalk.green(`  ✅ ${improvement}`));
    });
  }

  private printComparison(report: RegressionReport): void {
    console.log(chalk.bold('\nBaseline vs Current:'));

    const baseline = report.comparison.baseline;
    const current = report.comparison.current;

    console.log(
      `  Success Rate: ${baseline.successRate.toFixed(1)}% → ${current.successRate.toFixed(1)}%`
    );
    console.log(
      `  Avg Duration: ${baseline.avgDuration.toFixed(0)}ms → ${current.avgDuration.toFixed(0)}ms`
    );
    console.log(
      `  Tests Passed: ${baseline.passedTests}/${baseline.totalTests} → ${current.passedTests}/${current.totalTests}`
    );
    console.log(
      `  Baseline: ${baseline.name} (${new Date(baseline.timestamp).toLocaleString()})`
    );
  }

  private getSeverityColor(severity: 'critical' | 'high' | 'medium' | 'low') {
    switch (severity) {
      case 'critical':
        return chalk.red;
      case 'high':
        return chalk.yellow;
      case 'medium':
        return chalk.yellow;
      case 'low':
        return chalk.blue;
    }
  }

  private getSeverityIcon(severity: 'critical' | 'high' | 'medium' | 'low') {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
    }
  }
}

