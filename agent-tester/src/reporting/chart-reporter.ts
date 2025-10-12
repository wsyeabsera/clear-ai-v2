/**
 * Chart Reporter
 * Generates ASCII charts for terminal display
 */

import chalk from 'chalk';

export class ChartReporter {
  /**
   * Generate bar chart
   */
  barChart(data: Array<{ label: string; value: number }>, maxWidth: number = 50): string {
    if (data.length === 0) return '';

    const maxValue = Math.max(...data.map(d => d.value));
    const lines: string[] = [];

    for (const item of data) {
      const barLength = Math.round((item.value / maxValue) * maxWidth);
      const bar = chalk.cyan('█'.repeat(barLength));
      const label = item.label.padEnd(20);
      const value = item.value.toFixed(0).padStart(8);
      
      lines.push(`${label} ${bar} ${value}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate histogram
   */
  histogram(values: number[], bins: number = 10): string {
    if (values.length === 0) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    const binCounts = new Array(bins).fill(0);

    // Count values in bins
    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      binCounts[binIndex]++;
    }

    // Create bar chart
    const data = binCounts.map((count, i) => ({
      label: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}ms`,
      value: count,
    }));

    return this.barChart(data);
  }

  /**
   * Generate trend line (simple ASCII sparkline)
   */
  sparkline(values: number[], width: number = 50): string {
    if (values.length === 0) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    
    return values
      .slice(-width)
      .map(v => {
        const normalized = range > 0 ? (v - min) / range : 0.5;
        const index = Math.floor(normalized * (chars.length - 1));
        return chars[index];
      })
      .join('');
  }

  /**
   * Print success rate pie chart (ASCII)
   */
  printSuccessRate(passed: number, failed: number): void {
    const total = passed + failed;
    if (total === 0) return;

    const passedPercent = (passed / total) * 100;
    const failedPercent = (failed / total) * 100;

    console.log(chalk.bold('\nSuccess Rate Distribution:'));
    console.log(chalk.green(`  Passed: ${'█'.repeat(Math.round(passedPercent / 2))} ${passedPercent.toFixed(1)}%`));
    console.log(chalk.red(`  Failed: ${'█'.repeat(Math.round(failedPercent / 2))} ${failedPercent.toFixed(1)}%`));
  }

  /**
   * Print latency distribution
   */
  printLatencyDistribution(latencies: number[]): void {
    console.log(chalk.bold('\nLatency Distribution:'));
    console.log(this.histogram(latencies));
  }

  /**
   * Print trend over time
   */
  printTrend(values: number[], label: string = 'Trend'): void {
    console.log(chalk.bold(`\n${label}:`));
    console.log(this.sparkline(values));
    console.log(chalk.gray(`Min: ${Math.min(...values).toFixed(0)} | Max: ${Math.max(...values).toFixed(0)} | Avg: ${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(0)}`));
  }
}

