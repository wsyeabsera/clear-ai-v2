/**
 * Schema Validator
 * Validates response structure against JSON Schema using AJV
 */

import Ajv, { ValidateFunction } from 'ajv';
import type { ExecutionResult, ValidationRule } from '../../types/scenario.js';
import type { ValidationResult, ValidationDetail, Validator } from '../../types/validation.js';

// Predefined schemas for common response types
const SCHEMAS = {
  shipment_list: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          shipments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                weight_kg: { type: 'number' },
              },
              required: ['id'],
            },
          },
        },
      },
    },
  },
  
  facility_list: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          facilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                location: { type: 'string' },
                type: { type: 'string' },
              },
              required: ['id', 'name'],
            },
          },
        },
      },
    },
  },
  
  contaminant_list: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          contaminants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                risk_level: { type: 'string' },
                concentration_ppm: { type: 'number' },
              },
              required: ['id', 'type'],
            },
          },
        },
      },
    },
  },
  
  analysis: {
    type: 'object',
    properties: {
      analysis: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                description: { type: 'string' },
                confidence: { type: 'number' },
              },
              required: ['type', 'description', 'confidence'],
            },
          },
          entities: { type: 'array' },
          anomalies: { type: 'array' },
        },
        required: ['summary', 'insights'],
      },
    },
  },
};

export class SchemaValidator implements Validator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    
    // Compile predefined schemas
    for (const [name, schema] of Object.entries(SCHEMAS)) {
      this.validators.set(name, this.ajv.compile(schema));
    }
  }

  /**
   * Validate execution result against schema
   */
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    context?: any
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];

    const schemaName = rule.schema || rule.schemaName;
    
    if (!schemaName) {
      return {
        passed: true,
        confidence: 1.0,
        details: [],
        errors: ['No schema specified for validation'],
        warnings: ['Schema validation skipped - no schema name provided'],
      };
    }

    // Get validator for schema
    let validator = this.validators.get(schemaName);
    
    // If custom schema provided, compile it
    if (!validator && rule.customSchema) {
      try {
        validator = this.ajv.compile(rule.customSchema);
        this.validators.set(schemaName, validator);
      } catch (error: any) {
        return {
          passed: false,
          confidence: 0,
          details: [],
          errors: [`Failed to compile schema: ${error.message}`],
          warnings: [],
        };
      }
    }

    if (!validator) {
      return {
        passed: true,
        confidence: 0.5,
        details: [],
        errors: [],
        warnings: [`Unknown schema: ${schemaName}, validation skipped`],
      };
    }

    // Validate
    const valid = validator(executionResult);

    if (!valid && validator.errors) {
      for (const error of validator.errors) {
        const errorMsg = `${error.instancePath || '/'} ${error.message}`;
        errors.push(errorMsg);
        
        details.push({
          type: 'schema_validation',
          passed: false,
          message: errorMsg,
          expected: error.params,
          actual: error.data,
          confidence: 1.0,
        });
      }
    }

    const passed = valid === true;

    if (passed) {
      details.push({
        type: 'schema_validation',
        passed: true,
        message: `Response structure matches ${schemaName} schema`,
        confidence: 1.0,
      });
    }

    return {
      passed,
      confidence: passed ? 1.0 : 0.0,
      details,
      errors,
      warnings: [],
    };
  }

  /**
   * Add custom schema
   */
  addSchema(name: string, schema: any): void {
    const validator = this.ajv.compile(schema);
    this.validators.set(name, validator);
  }
}

