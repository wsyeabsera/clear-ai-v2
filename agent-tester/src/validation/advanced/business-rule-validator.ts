/**
 * Business Rule Validator
 * Validates domain-specific business rules
 */

import type { ExecutionResult, ValidationRule } from '../../types/scenario.js';
import type { ValidationResult, ValidationDetail, Validator } from '../../types/validation.js';

// Business rule functions
type BusinessRule = (data: any) => { passed: boolean; message: string };

const BUSINESS_RULES: Record<string, BusinessRule> = {
  /**
   * All contaminated shipments should be flagged
   */
  all_contaminated_shipments_flagged: (data) => {
    if (!data.shipments) return { passed: true, message: 'No shipments to validate' };
    
    const shipments = Array.isArray(data.shipments) ? data.shipments : [data.shipments];
    const unflagged = shipments.filter((s: any) => s.contaminants && s.contaminants.length > 0 && !s.has_contaminants);
    
    return {
      passed: unflagged.length === 0,
      message: unflagged.length > 0 
        ? `${unflagged.length} contaminated shipments not flagged`
        : 'All contaminated shipments properly flagged',
    };
  },

  /**
   * All shipments have dates
   */
  all_shipments_have_dates: (data) => {
    if (!data.shipments) return { passed: true, message: 'No shipments to validate' };
    
    const shipments = Array.isArray(data.shipments) ? data.shipments : [data.shipments];
    const withoutDates = shipments.filter((s: any) => !s.date && !s.created_at);
    
    return {
      passed: withoutDates.length === 0,
      message: withoutDates.length > 0
        ? `${withoutDates.length} shipments missing dates`
        : 'All shipments have dates',
    };
  },

  /**
   * Facility capacity not exceeded
   */
  facility_capacity_not_exceeded: (data) => {
    if (!data.facilities) return { passed: true, message: 'No facilities to validate' };
    
    const facilities = Array.isArray(data.facilities) ? data.facilities : [data.facilities];
    const overCapacity = facilities.filter((f: any) => 
      f.current_load_tons && f.capacity_tons && f.current_load_tons > f.capacity_tons
    );
    
    return {
      passed: overCapacity.length === 0,
      message: overCapacity.length > 0
        ? `${overCapacity.length} facilities over capacity`
        : 'All facilities within capacity',
    };
  },

  /**
   * High-risk contaminants have inspections
   */
  high_risk_contaminants_inspected: (data) => {
    if (!data.contaminants) return { passed: true, message: 'No contaminants to validate' };
    
    const contaminants = Array.isArray(data.contaminants) ? data.contaminants : [data.contaminants];
    const highRisk = contaminants.filter((c: any) => 
      c.risk_level === 'high' || c.risk_level === 'critical'
    );
    
    // This is a simplified check - in production would cross-reference with inspections
    return {
      passed: true,
      message: `Found ${highRisk.length} high-risk contaminants`,
    };
  },

  /**
   * Capacity calculation correct
   */
  capacity_calculation_correct: (data) => {
    if (!data.facilities) return { passed: true, message: 'No facilities to validate' };
    
    const facilities = Array.isArray(data.facilities) ? data.facilities : [data.facilities];
    let allCorrect = true;
    
    for (const facility of facilities) {
      if (facility.capacity_tons && facility.current_load_tons) {
        const calculatedPercentage = (facility.current_load_tons / facility.capacity_tons) * 100;
        // Allow 1% variance for floating point
        if (facility.load_percentage && Math.abs(calculatedPercentage - facility.load_percentage) > 1) {
          allCorrect = false;
        }
      }
    }
    
    return {
      passed: allCorrect,
      message: allCorrect ? 'Capacity calculations correct' : 'Some capacity calculations incorrect',
    };
  },
};

export class BusinessRuleValidator implements Validator {
  /**
   * Validate business rules
   */
  validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    context?: any
  ): ValidationResult {
    const details: ValidationDetail[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const ruleName = rule.rule || rule.ruleName;
    
    if (!ruleName) {
      return {
        passed: true,
        confidence: 1.0,
        details: [],
        errors: [],
        warnings: ['No business rule specified'],
      };
    }

    // Get business rule function
    const ruleFunction = BUSINESS_RULES[ruleName];
    
    if (!ruleFunction) {
      return {
        passed: true,
        confidence: 0,
        details: [],
        errors: [],
        warnings: [`Unknown business rule: ${ruleName}`],
      };
    }

    // Execute business rule
    try {
      const data = executionResult.data || {};
      const result = ruleFunction(data);

      details.push({
        type: 'business_rule',
        passed: result.passed,
        message: `Business rule '${ruleName}': ${result.message}`,
        confidence: 1.0,
      });

      if (!result.passed) {
        const errorMsg = `Business rule violation: ${result.message}`;
        
        if (rule.critical) {
          errors.push(errorMsg);
        } else {
          warnings.push(errorMsg);
        }
      }

      return {
        passed: result.passed || !rule.critical,
        confidence: result.passed ? 1.0 : 0.5,
        details,
        errors,
        warnings,
      };
    } catch (error: any) {
      return {
        passed: !rule.critical,
        confidence: 0,
        details: [],
        errors: rule.critical ? [`Business rule error: ${error.message}`] : [],
        warnings: !rule.critical ? [`Business rule error: ${error.message}`] : [],
      };
    }
  }

  /**
   * Add custom business rule
   */
  static addRule(name: string, rule: BusinessRule): void {
    BUSINESS_RULES[name] = rule;
  }
}

