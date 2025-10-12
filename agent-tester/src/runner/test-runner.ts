/**
 * Test Runner
 * Orchestrates test scenario execution
 */

import { GraphQLClient } from '../client/graphql-client.js';
import type { Scenario, TestMetrics, TestResult, TestSuiteResult } from '../types/scenario.js';
import type { ValidationResult } from '../types/validation.js';
import {
  ToolSelectionValidator,
  PerformanceValidator,
  ResponseContentValidator,
  DataStructureValidator,
  ErrorHandlingValidator,
} from '../validation/validators.js';

export interface TestRunnerConfig {
  client: GraphQLClient;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
}

export class TestRunner {
  private config: TestRunnerConfig;
  private validators: Map<string, any>;

  constructor(config: TestRunnerConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      verbose: false,
      ...config,
    };

    // Initialize validators
    this.validators = new Map([
      ['tool_selection', new ToolSelectionValidator()],
      ['performance', new PerformanceValidator()],
      ['response_content', new ResponseContentValidator()],
      ['data_structure', new DataStructureValidator()],
      ['error_handling', new ErrorHandlingValidator()],
    ]);
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

      // Run validations
      const validationResult = await this.validate(
        scenario,
        executionResult,
        duration
      );

      const success = validationResult.passed;

      if (this.config.verbose) {
        console.log(`Result: ${success ? '✓ PASSED' : '✗ FAILED'}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Tools used: ${executionResult.toolsUsed.join(', ')}`);
      }

      return {
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
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`Result: ✗ ERROR`);
        console.log(`Error: ${error.message}`);
      }

      return {
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
    }
  }

  /**
   * Run multiple scenarios
   */
  async runSuite(scenarios: Scenario[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    console.log(`\nRunning ${scenarios.length} scenarios...\n`);

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const summary = {
      total: scenarios.length,
      passed,
      failed,
      skipped: 0,
      successRate: (passed / scenarios.length) * 100,
      totalDuration,
      avgDuration: totalDuration / scenarios.length,
    };

    return {
      scenarios: results,
      summary,
      timestamp: new Date(),
    };
  }

  /**
   * Validate test result
   */
  private async validate(
    scenario: Scenario,
    executionResult: any,
    actualLatencyMs: number
  ): Promise<ValidationResult> {
    const allDetails: any[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let overallPassed = true;
    let confidenceSum = 0;
    let confidenceCount = 0;

    // Run each validation rule
    for (const rule of scenario.validation) {
      let result: ValidationResult | null = null;

      switch (rule.type) {
        case 'tool_selection':
          result = this.validators.get('tool_selection')!.validate(
            executionResult,
            rule,
            scenario.expectedBehavior
          );
          break;

        case 'performance':
          result = this.validators.get('performance')!.validate(
            executionResult,
            rule,
            {
              expectedBehavior: scenario.expectedBehavior,
              actualLatencyMs
            }
          );
          break;

        case 'data_structure':
          result = this.validators.get('data_structure')!.validate(
            executionResult,
            rule
          );
          break;

        case 'error_handling':
          result = this.validators.get('error_handling')!.validate(
            executionResult,
            rule
          );
          break;

        default:
          // Unknown validation type, skip
          allWarnings.push(`Unknown validation type: ${rule.type}`);
      }

      if (result) {
        allDetails.push(...result.details);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
        
        if (!result.passed) {
          overallPassed = false;
        }

        confidenceSum += result.confidence;
        confidenceCount++;
      }
    }

    // Always validate response content if specified
    if (
      scenario.expectedBehavior.responseContains ||
      scenario.expectedBehavior.responseNotContains
    ) {
      const contentResult = this.validators.get('response_content')!.validate(
        executionResult,
        {},
        scenario.expectedBehavior
      );
      
      allDetails.push(...contentResult.details);
      allErrors.push(...contentResult.errors);
      allWarnings.push(...contentResult.warnings);
      
      if (!contentResult.passed) {
        overallPassed = false;
      }

      confidenceSum += contentResult.confidence;
      confidenceCount++;
    }

    const avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

    return {
      passed: overallPassed,
      confidence: avgConfidence,
      details: allDetails,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}

