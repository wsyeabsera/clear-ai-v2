/**
 * Console Reporter
 * Formats and displays test results in the console
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import type { TestResult, TestSuiteResult } from '../types/scenario.js';

export class ConsoleReporter {
  /**
   * Report a single test result
   */
  reportTest(result: TestResult): void {
    const icon = result.success ? chalk.green('✓') : chalk.red('✗');
    const status = result.success ? chalk.green('PASSED') : chalk.red('FAILED');
    const duration = `${result.duration}ms`;
    const confidence = result.validationResult.confidence
      ? `${Math.round(result.validationResult.confidence * 100)}%`
      : 'N/A';

    console.log(
      `${icon} ${result.scenario.id}: ${result.scenario.name} - ${status} (${duration}, ${confidence} confidence)`
    );

    // Show tools used
    if (result.executionResult) {
      console.log(
        chalk.gray(`  Tools: ${result.executionResult.toolsUsed.join(', ') || 'none'}`)
      );
    }

    // Show errors
    if (result.validationResult.errors.length > 0) {
      console.log(chalk.red('  Errors:'));
      for (const error of result.validationResult.errors) {
        console.log(chalk.red(`    - ${error}`));
      }
    }

    // Show warnings
    if (result.validationResult.warnings.length > 0) {
      console.log(chalk.yellow('  Warnings:'));
      for (const warning of result.validationResult.warnings) {
        console.log(chalk.yellow(`    - ${warning}`));
      }
    }

    // Show validation details if failed
    if (!result.success && result.validationResult.details.length > 0) {
      console.log(chalk.gray('  Validation Details:'));
      for (const detail of result.validationResult.details) {
        if (!detail.passed) {
          console.log(chalk.gray(`    - ${detail.message}`));
          if (detail.expected !== undefined && detail.actual !== undefined) {
            console.log(chalk.gray(`      Expected: ${JSON.stringify(detail.expected)}`));
            console.log(chalk.gray(`      Actual: ${JSON.stringify(detail.actual)}`));
          }
        }
      }
    }

    console.log('');
  }

  /**
   * Report test suite summary
   */
  reportSummary(result: TestSuiteResult): void {
    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold('Test Suite Summary'));
    console.log(chalk.bold('='.repeat(60)));

    const { summary } = result;

    // Overall stats
    console.log(`\nTotal: ${summary.total}`);
    console.log(chalk.green(`Passed: ${summary.passed}`));
    console.log(chalk.red(`Failed: ${summary.failed}`));
    if (summary.skipped > 0) {
      console.log(chalk.yellow(`Skipped: ${summary.skipped}`));
    }

    // Success rate
    const successColor = summary.successRate >= 90 ? chalk.green : 
                         summary.successRate >= 70 ? chalk.yellow : 
                         chalk.red;
    console.log(successColor(`Success Rate: ${summary.successRate.toFixed(1)}%`));

    // Timing
    console.log(`\nTotal Duration: ${this.formatDuration(summary.totalDuration)}`);
    console.log(`Average Duration: ${this.formatDuration(summary.avgDuration)}`);

    // Failed scenarios
    if (summary.failed > 0) {
      console.log(chalk.red('\nFailed Scenarios:'));
      const failedScenarios = result.scenarios.filter((r) => !r.success);
      for (const scenario of failedScenarios) {
        console.log(chalk.red(`  - ${scenario.scenario.id}: ${scenario.scenario.name}`));
        if (scenario.error) {
          console.log(chalk.gray(`    Error: ${scenario.error}`));
        } else if (scenario.validationResult.errors.length > 0) {
          console.log(chalk.gray(`    ${scenario.validationResult.errors[0]}`));
        }
      }
    }

    console.log(chalk.bold('\n' + '='.repeat(60) + '\n'));
  }

  /**
   * Export results to JSON
   */
  exportJSON(result: TestSuiteResult, filepath: string): void {
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write JSON
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(chalk.green(`\n✓ Results exported to ${filepath}`));
  }

  /**
   * Print progress indicator
   */
  printProgress(current: number, total: number): void {
    const percentage = Math.round((current / total) * 100);
    const bar = this.createProgressBar(percentage);
    process.stdout.write(`\r${bar} ${current}/${total} (${percentage}%)`);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * Create progress bar
   */
  private createProgressBar(percentage: number, width: number = 40): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  /**
   * Format duration in human-readable form
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Print header
   */
  printHeader(): void {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║        Agent Tester - Clear AI v2 Test Suite          ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));
  }

  /**
   * Print section header
   */
  printSection(title: string): void {
    console.log(chalk.bold(`\n${title}`));
    console.log(chalk.gray('─'.repeat(60)));
  }
}

