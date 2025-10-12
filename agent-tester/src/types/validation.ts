/**
 * Validation Type Definitions
 */

export interface ValidationResult {
  passed: boolean;
  confidence: number; // 0.0 - 1.0
  details: ValidationDetail[];
  errors: string[];
  warnings: string[];
}

export interface ValidationDetail {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
  confidence?: number;
}

export interface Validator {
  validate(data: any, rule: any, context?: any): Promise<ValidationResult> | ValidationResult;
}

