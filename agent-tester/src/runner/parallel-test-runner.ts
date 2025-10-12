/**
 * Parallel Test Runner
 * Extends TestRunner with parallel execution capabilities
 */

import pLimit from 'p-limit';
import { GraphQLClient } from '../client/graphql-client.js';
import { ValidationEngine } from '../validation/engine.js';
import { MetricsTracker } from '../metrics/tracker.js';
import type { Scenario, TestResult, TestSuiteResult } from '../types/scenario.js';

export interface ParallelTestRunnerConfig {
  client: GraphQLClient;
  validationEngine?: ValidationEngine;
  metricsTracker?: MetricsTracker;
  concurrency?: number;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
}

export class ParallelTestRunner {
  private config: ParallelTestRunnerConfig;
  private validationEngine: ValidationEngine;
  private metricsTracker?: MetricsTracker;

  constructor(config: ParallelTestRunnerConfig) {
    this.config = {
      concurrency: 5,
      timeout: 30000,
      retries: 3,
      verbose: false,
      ...config,
    };

    this.validationEngine = config.validationEngine || new ValidationEngine();
    this.metricsTracker = config.metricsTracker;
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario: Scenario): Promise<TestResult> {
    const startTime = Date.now();

    try {
      if (this.config.verbose) {
        console.log(`\nRunning scenario: ${scenario.id} - ${scenario.name}`);
        console.log(`Query: ${scenario.query}`);
      }

      // Execute query through GraphQL
      const { result: executionResult, metrics } = await this.config.client.executeQuery({
        query: scenario.query,
        userId: scenario.userId,
      });

      const duration = Date.now() - startTime;

      // Run validations using validation engine
      const validationResult = await this.validationEngine.validateAll(
        executionResult,
        scenario.validation,
        scenario.expectedBehavior,
        duration,
        scenario.query
      );

      const success = validationResult.passed;

      if (this.config.verbose) {
        console.log(`Result: ${success ? '✓ PASSED' : '✗ FAILED'}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Tools used: ${executionResult.toolsUsed.join(', ')}`);
      }

      const testResult: TestResult = {
        scenario,
        success,
        executionResult,
        validationResult,
        metrics: {
          ...metrics,
          totalLatencyMs: duration,
        },
        timestamp: new Date(),
        duration,
      };

      // Track metrics if enabled
      if (this.metricsTracker) {
        await this.metricsTracker.track(testResult);
      }

      return testResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`Result: ✗ ERROR`);
        console.log(`Error: ${error.message}`);
      }

      const testResult: TestResult = {
        scenario,
        success: false,
        validationResult: {
          passed: false,
          confidence: 0,
          details: [],
          errors: [error.message],
          warnings: [],
        },
        metrics: {
          totalLatencyMs: duration,
        },
        error: error.message,
        timestamp: new Date(),
        duration,
      };

      // Track metrics if enabled
      if (this.metricsTracker) {
        await this.metricsTracker.track(testResult);
      }

      return testResult;
    }
  }

  /**
   * Run multiple scenarios in parallel
   */
  async runSuite(scenarios: Scenario[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    
    console.log(`\nRunning ${scenarios.length} scenarios with ${this.config.concurrency} parallel workers...\n`);

    // Create rate limiter
    const limit = pLimit(this.config.concurrency!);

    // Execute all scenarios in parallel (with limit)
    const resultPromises = scenarios.map(scenario =>
      limit(() => this.runScenario(scenario))
    );

    const results = await Promise.all(resultPromises);

    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const summary = {
      total: scenarios.length,
      passed,
      failed,
      skipped: 0,
      successRate: (passed / scenarios.length) * 100,
      totalDuration,
      avgDuration: totalDuration / scenarios.length,
    };

    // Flush metrics if tracker enabled
    if (this.metricsTracker) {
      await this.metricsTracker.flush();
    }

    return {
      scenarios: results,
      summary,
      timestamp: new Date(),
    };
  }
}

