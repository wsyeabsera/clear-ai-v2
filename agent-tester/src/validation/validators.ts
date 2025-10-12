/**
 * Basic Validators
 * Core validation logic for test scenarios
 */

import type { 
  ExecutionResult, 
  ExpectedBehavior, 
  ValidationRule 
} from '../types/scenario.js';
import type { ValidationResult, ValidationDetail, Validator } from '../types/validation.js';

/**
 * Tool Selection Validator
 * Validates that the correct tools were used
 */
export class ToolSelectionValidator implements Validator {
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    expectedBehavior: ExpectedBehavior
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];
    
    const expectedTools = rule.expected || expectedBehavior.toolsUsed;
    const actualTools = executionResult.toolsUsed || [];

    // Check if all expected tools were used
    const missingTools = expectedTools.filter((tool: string) => !actualTools.includes(tool));
    const extraTools = actualTools.filter((tool: string) => !expectedTools.includes(tool));

    const passed = missingTools.length === 0 && (rule.allowExtra || extraTools.length === 0);

    details.push({
      type: 'tool_selection',
      passed,
      message: passed 
        ? 'Tool selection correct' 
        : `Tool selection mismatch`,
      expected: expectedTools,
      actual: actualTools,
      confidence: passed ? 1.0 : 0.0,
    });

    if (missingTools.length > 0) {
      errors.push(`Missing tools: ${missingTools.join(', ')}`);
    }

    if (!rule.allowExtra && extraTools.length > 0) {
      errors.push(`Unexpected tools: ${extraTools.join(', ')}`);
    }

    return {
      passed,
      confidence: passed ? 1.0 : 0.0,
      details,
      errors,
      warnings: [],
    };
  }
}

/**
 * Performance Validator
 * Validates latency and resource usage
 */
export class PerformanceValidator implements Validator {
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    context?: any
  ): ValidationResult {
    const expectedBehavior = context?.expectedBehavior;
    const actualLatencyMs = context?.actualLatencyMs || 0;
    const details: ValidationDetail[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const maxLatency = rule.maxLatencyMs || expectedBehavior.maxLatencyMs;
    const latencyPassed = actualLatencyMs <= maxLatency;

    details.push({
      type: 'performance_latency',
      passed: latencyPassed,
      message: latencyPassed
        ? `Latency within limit (${actualLatencyMs}ms <= ${maxLatency}ms)`
        : `Latency exceeded limit (${actualLatencyMs}ms > ${maxLatency}ms)`,
      expected: maxLatency,
      actual: actualLatencyMs,
      confidence: 1.0,
    });

    if (!latencyPassed) {
      errors.push(`Latency ${actualLatencyMs}ms exceeds maximum ${maxLatency}ms`);
    }

    // Warn if close to limit (within 10%)
    if (latencyPassed && actualLatencyMs > maxLatency * 0.9) {
      warnings.push(`Latency ${actualLatencyMs}ms approaching limit ${maxLatency}ms`);
    }

    return {
      passed: latencyPassed,
      confidence: 1.0,
      details,
      errors,
      warnings,
    };
  }
}

/**
 * Response Content Validator
 * Validates response contains/doesn't contain specific strings
 */
export class ResponseContentValidator implements Validator {
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    expectedBehavior: ExpectedBehavior
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];

    const responseText = JSON.stringify(executionResult).toLowerCase();

    // Check responseContains
    const shouldContain = expectedBehavior.responseContains || [];
    const missingContent: string[] = [];

    for (const text of shouldContain) {
      const found = responseText.includes(text.toLowerCase());
      if (!found) {
        missingContent.push(text);
      }
      
      details.push({
        type: 'response_contains',
        passed: found,
        message: found ? `Response contains "${text}"` : `Response missing "${text}"`,
        expected: text,
        actual: found,
        confidence: 1.0,
      });
    }

    // Check responseNotContains
    const shouldNotContain = expectedBehavior.responseNotContains || [];
    const unexpectedContent: string[] = [];

    for (const text of shouldNotContain) {
      const found = responseText.includes(text.toLowerCase());
      if (found) {
        unexpectedContent.push(text);
      }

      details.push({
        type: 'response_not_contains',
        passed: !found,
        message: !found 
          ? `Response correctly does not contain "${text}"` 
          : `Response unexpectedly contains "${text}"`,
        expected: false,
        actual: found,
        confidence: 1.0,
      });
    }

    if (missingContent.length > 0) {
      errors.push(`Response missing expected content: ${missingContent.join(', ')}`);
    }

    if (unexpectedContent.length > 0) {
      errors.push(`Response contains unexpected content: ${unexpectedContent.join(', ')}`);
    }

    const passed = missingContent.length === 0 && unexpectedContent.length === 0;

    return {
      passed,
      confidence: 1.0,
      details,
      errors,
      warnings: [],
    };
  }
}

/**
 * Data Structure Validator
 * Validates that response has expected structure
 */
export class DataStructureValidator implements Validator {
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];

    // Check if data exists
    const hasData = executionResult.data !== null && executionResult.data !== undefined;
    
    details.push({
      type: 'data_exists',
      passed: hasData,
      message: hasData ? 'Response contains data' : 'Response missing data',
      expected: true,
      actual: hasData,
      confidence: 1.0,
    });

    if (!hasData && rule.required) {
      errors.push('Response missing required data field');
    }

    // Check if analysis exists (if required)
    if (rule.requireAnalysis) {
      const hasAnalysis = executionResult.analysis !== null && 
                          executionResult.analysis !== undefined;
      
      details.push({
        type: 'analysis_exists',
        passed: hasAnalysis,
        message: hasAnalysis ? 'Response contains analysis' : 'Response missing analysis',
        expected: true,
        actual: hasAnalysis,
        confidence: 1.0,
      });

      if (!hasAnalysis) {
        errors.push('Response missing required analysis');
      }
    }

    const passed = errors.length === 0;

    return {
      passed,
      confidence: 1.0,
      details,
      errors,
      warnings: [],
    };
  }
}

/**
 * Error Handling Validator
 * Validates proper error handling
 */
export class ErrorHandlingValidator implements Validator {
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];

    const hasError = executionResult.metadata?.error === true;
    const expectError = rule.expectError === true;

    const passed = hasError === expectError;

    details.push({
      type: 'error_handling',
      passed,
      message: passed
        ? expectError 
          ? 'Error occurred as expected'
          : 'No error as expected'
        : expectError
          ? 'Expected error but none occurred'
          : 'Unexpected error occurred',
      expected: expectError,
      actual: hasError,
      confidence: 1.0,
    });

    if (!passed) {
      errors.push(
        expectError
          ? 'Expected an error but query succeeded'
          : 'Query failed when it should have succeeded'
      );
    }

    return {
      passed,
      confidence: 1.0,
      details,
      errors,
      warnings: [],
    };
  }
}

