/**
 * Validation Engine
 * Orchestrates multiple validators and aggregates results
 */

import type { ExecutionResult, ValidationRule, ExpectedBehavior } from '../types/scenario.js';
import type { ValidationResult, ValidationDetail, Validator } from '../types/validation.js';
import {
  ToolSelectionValidator,
  PerformanceValidator,
  ResponseContentValidator,
  DataStructureValidator,
  ErrorHandlingValidator,
} from './validators.js';
import { SchemaValidator } from './advanced/schema-validator.js';
import { SemanticValidator } from './advanced/semantic-validator.js';
import { AnalysisQualityValidator } from './advanced/analysis-quality-validator.js';
import { BusinessRuleValidator } from './advanced/business-rule-validator.js';

export interface ValidationEngineConfig {
  openaiApiKey?: string;
  enableSemanticValidation?: boolean;
}

export class ValidationEngine {
  private validators: Map<string, Validator>;

  constructor(config: ValidationEngineConfig = {}) {
    this.validators = new Map();
    
    // Register validators
    this.validators.set('tool_selection', new ToolSelectionValidator());
    this.validators.set('performance', new PerformanceValidator());
    this.validators.set('response_content', new ResponseContentValidator());
    this.validators.set('data_structure', new DataStructureValidator());
    this.validators.set('error_handling', new ErrorHandlingValidator());
    this.validators.set('schema', new SchemaValidator());
    this.validators.set('semantic', new SemanticValidator(config.openaiApiKey));
    this.validators.set('analysis_quality', new AnalysisQualityValidator());
    this.validators.set('business_rule', new BusinessRuleValidator());
  }

  /**
   * Run all validation rules for a test result
   */
  async validateAll(
    executionResult: ExecutionResult,
    rules: ValidationRule[],
    expectedBehavior: ExpectedBehavior,
    actualLatencyMs: number,
    query?: string
  ): Promise<ValidationResult> {
    const allDetails: ValidationDetail[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let overallPassed = true;
    let confidenceSum = 0;
    let confidenceCount = 0;

    // Run each validation rule
    for (const rule of rules) {
      const validator = this.validators.get(rule.type);
      
      if (!validator) {
        allWarnings.push(`Unknown validation type: ${rule.type}`);
        continue;
      }

      try {
        const context = {
          expectedBehavior,
          actualLatencyMs,
          query,
        };

        const validationResult = validator.validate(executionResult, rule, context);
        
        // Await if it's a promise
        const result = validationResult instanceof Promise ? await validationResult : validationResult;

        allDetails.push(...result.details);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);

        if (!result.passed) {
          overallPassed = false;
        }

        confidenceSum += result.confidence;
        confidenceCount++;
      } catch (error: any) {
        allErrors.push(`Validation error in ${rule.type}: ${error.message}`);
        overallPassed = false;
      }
    }

    // Always validate response content if specified
    if (expectedBehavior.responseContains || expectedBehavior.responseNotContains) {
      try {
        const validationResult = this.validators.get('response_content')!.validate(
          executionResult,
          {},
          { expectedBehavior }
        );

        const contentResult = validationResult instanceof Promise ? await validationResult : validationResult;

        allDetails.push(...contentResult.details);
        allErrors.push(...contentResult.errors);
        allWarnings.push(...contentResult.warnings);

        if (!contentResult.passed) {
          overallPassed = false;
        }

        confidenceSum += contentResult.confidence;
        confidenceCount++;
      } catch (error: any) {
        allWarnings.push(`Content validation error: ${error.message}`);
      }
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

  /**
   * Register custom validator
   */
  registerValidator(name: string, validator: Validator): void {
    this.validators.set(name, validator);
  }

  /**
   * Get validator by name
   */
  getValidator(name: string): Validator | undefined {
    return this.validators.get(name);
  }
}

