# Agent Tester - Validation Engine

## Overview

The Validation Engine determines whether test results meet expectations. It supports multiple validation strategies with confidence scoring and detailed failure reporting.

## Validation Types

### 1. Tool Selection Validation

**Purpose:** Verify correct tools were selected

```typescript
interface ToolSelectionValidator {
  validate(result: ExecutionResult, expected: ToolSelectionRule): ValidationResult;
}

interface ToolSelectionRule {
  type: 'tool_selection';
  expected: string[];
  order?: 'any' | 'sequential' | 'parallel';
  allowAdditional?: boolean;
}

// Implementation
function validateToolSelection(result: ExecutionResult, rule: ToolSelectionRule): ValidationResult {
  const actualTools = result.toolsUsed;
  const expectedTools = rule.expected;
  
  // Check if all expected tools were used
  const missingTools = expectedTools.filter(t => !actualTools.includes(t));
  const extraTools = rule.allowAdditional ? [] : actualTools.filter(t => !expectedTools.includes(t));
  
  const passed = missingTools.length === 0 && extraTools.length === 0;
  
  return {
    passed,
    confidence: passed ? 1.0 : 0.0,
    details: [{
      type: 'tool_selection',
      passed,
      message: passed ? 'Correct tools selected' : 'Tool selection mismatch',
      expected: expectedTools,
      actual: actualTools,
      missing: missingTools,
      extra: extraTools
    }]
  };
}
```

### 2. Data Structure Validation

**Purpose:** Validate response structure and data types

```typescript
interface DataStructureValidator {
  validate(result: ExecutionResult, schema: JSONSchema): ValidationResult;
}

// Using AJV for JSON Schema validation
import Ajv from 'ajv';

function validateDataStructure(result: ExecutionResult, schema: JSONSchema): ValidationResult {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  
  const valid = validate(result.data);
  
  return {
    passed: valid,
    confidence: 1.0,
    details: [{
      type: 'data_structure',
      passed: valid,
      message: valid ? 'Schema validation passed' : 'Schema validation failed',
      errors: validate.errors || []
    }]
  };
}

// Example schema
const shipmentListSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'facility_id', 'date', 'status'],
    properties: {
      id: { type: 'string' },
      facility_id: { type: 'string' },
      date: { type: 'string', format: 'date' },
      status: { enum: ['pending', 'delivered', 'rejected'] },
      weight_kg: { type: 'number', minimum: 0 }
    }
  }
};
```

### 3. Semantic Validation

**Purpose:** Verify response meaning and relevance using LLM

```typescript
interface SemanticValidator {
  validate(query: string, response: string, check: string): Promise<ValidationResult>;
}

async function validateSemantic(
  query: string,
  response: string,
  check: string
): Promise<ValidationResult> {
  const prompt = `
Query: "${query}"
Response: "${response}"

Validation Check: ${check}

Does the response pass this validation check? Answer with:
- "PASS" if it clearly passes
- "FAIL" if it clearly fails
- "PARTIAL" if it partially passes

Then provide:
- Confidence (0.0 to 1.0)
- Explanation

Format:
{
  "result": "PASS|FAIL|PARTIAL",
  "confidence": 0.0-1.0,
  "explanation": "..."
}
`;

  const llmResponse = await llm.generate({
    messages: [{ role: 'user', content: prompt }],
    config: { temperature: 0.1, max_tokens: 200 }
  });
  
  const validation = JSON.parse(extractJSON(llmResponse.content));
  
  return {
    passed: validation.result === 'PASS',
    confidence: validation.confidence,
    details: [{
      type: 'semantic',
      passed: validation.result === 'PASS',
      message: validation.explanation,
      check
    }]
  };
}
```

### 4. Performance Validation

**Purpose:** Check latency, token usage, and resource consumption

```typescript
interface PerformanceValidator {
  validate(metrics: Metrics, thresholds: PerformanceThresholds): ValidationResult;
}

interface PerformanceThresholds {
  maxLatencyMs?: number;
  maxTokens?: number;
  maxMemoryMB?: number;
  maxCPUPercent?: number;
}

function validatePerformance(
  metrics: Metrics,
  thresholds: PerformanceThresholds
): ValidationResult {
  const checks = [];
  let allPassed = true;
  
  // Latency check
  if (thresholds.maxLatencyMs) {
    const passed = metrics.totalLatencyMs <= thresholds.maxLatencyMs;
    allPassed &&= passed;
    checks.push({
      type: 'latency',
      passed,
      message: `Latency ${metrics.totalLatencyMs}ms (max: ${thresholds.maxLatencyMs}ms)`,
      expected: `<= ${thresholds.maxLatencyMs}ms`,
      actual: `${metrics.totalLatencyMs}ms`
    });
  }
  
  // Token usage check
  if (thresholds.maxTokens && metrics.tokenUsage) {
    const passed = metrics.tokenUsage.totalTokens <= thresholds.maxTokens;
    allPassed &&= passed;
    checks.push({
      type: 'tokens',
      passed,
      message: `Token usage ${metrics.tokenUsage.totalTokens} (max: ${thresholds.maxTokens})`,
      expected: `<= ${thresholds.maxTokens}`,
      actual: `${metrics.tokenUsage.totalTokens}`
    });
  }
  
  return {
    passed: allPassed,
    confidence: 1.0,
    details: checks
  };
}
```

### 5. Business Rule Validation

**Purpose:** Validate domain-specific logic

```typescript
interface BusinessRuleValidator {
  validate(result: ExecutionResult, rule: BusinessRule): ValidationResult;
}

type BusinessRule = {
  type: 'business_rule';
  rule: string;
  validator: (result: ExecutionResult) => boolean;
  critical: boolean;
};

// Example rules
const businessRules: Record<string, BusinessRule> = {
  all_shipments_have_dates: {
    type: 'business_rule',
    rule: 'all_shipments_have_dates',
    validator: (result) => {
      const shipments = result.data;
      return Array.isArray(shipments) && shipments.every(s => s.date);
    },
    critical: true
  },
  
  contaminated_shipments_flagged: {
    type: 'business_rule',
    rule: 'contaminated_shipments_flagged',
    validator: (result) => {
      const shipments = result.data;
      return Array.isArray(shipments) && 
             shipments.filter(s => s.has_contaminants).every(s => s.status === 'rejected');
    },
    critical: true
  }
};

function validateBusinessRule(
  result: ExecutionResult,
  rule: BusinessRule
): ValidationResult {
  const passed = rule.validator(result);
  
  return {
    passed,
    confidence: 1.0,
    details: [{
      type: 'business_rule',
      passed,
      message: passed ? `Rule '${rule.rule}' passed` : `Rule '${rule.rule}' failed`,
      rule: rule.rule,
      critical: rule.critical
    }]
  };
}
```

## Validation Engine

```typescript
class ValidationEngine {
  private validators: Map<string, Validator> = new Map();
  
  constructor() {
    this.registerValidators();
  }
  
  private registerValidators(): void {
    this.validators.set('tool_selection', new ToolSelectionValidator());
    this.validators.set('data_structure', new DataStructureValidator());
    this.validators.set('semantic', new SemanticValidator());
    this.validators.set('performance', new PerformanceValidator());
    this.validators.set('business_rule', new BusinessRuleValidator());
  }
  
  async validate(
    result: ExecutionResult,
    rules: ValidationRule[],
    scenario: Scenario
  ): Promise<ValidationResult> {
    const validations: ValidationDetail[] = [];
    let overallPassed = true;
    let minConfidence = 1.0;
    
    for (const rule of rules) {
      const validator = this.validators.get(rule.type);
      if (!validator) {
        console.warn(`Unknown validation type: ${rule.type}`);
        continue;
      }
      
      try {
        const validationResult = await validator.validate(result, rule, scenario);
        validations.push(...validationResult.details);
        
        if (!validationResult.passed) {
          overallPassed = false;
        }
        
        minConfidence = Math.min(minConfidence, validationResult.confidence);
      } catch (error: any) {
        validations.push({
          type: rule.type,
          passed: false,
          message: `Validation error: ${error.message}`,
          error: error.message
        });
        overallPassed = false;
        minConfidence = 0;
      }
    }
    
    return {
      passed: overallPassed,
      confidence: minConfidence,
      details: validations,
      errors: validations.filter(v => !v.passed).map(v => v.message),
      warnings: []
    };
  }
}
```

## Confidence Scoring

```typescript
function calculateOverallConfidence(validations: ValidationDetail[]): number {
  if (validations.length === 0) return 0;
  
  // Weight by validation type
  const weights: Record<string, number> = {
    tool_selection: 1.0,    // Critical
    data_structure: 1.0,    // Critical
    performance: 0.8,       // Important
    semantic: 0.6,          // Helpful
    business_rule: 1.0      // Critical
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const v of validations) {
    const weight = weights[v.type] || 0.5;
    const score = v.passed ? 1.0 : 0.0;
    
    weightedSum += score * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
```

## Validation Result Format

```typescript
interface ValidationResult {
  passed: boolean;
  confidence: number;  // 0.0 - 1.0
  details: ValidationDetail[];
  errors: string[];
  warnings: string[];
}

interface ValidationDetail {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
  confidence?: number;
  metadata?: Record<string, any>;
}
```

## Usage Example

```typescript
const engine = new ValidationEngine();

// Define validation rules
const rules: ValidationRule[] = [
  {
    type: 'tool_selection',
    expected: ['shipments'],
    allowAdditional: false
  },
  {
    type: 'data_structure',
    schema: shipmentListSchema
  },
  {
    type: 'semantic',
    check: 'Response mentions the requested timeframe'
  },
  {
    type: 'performance',
    maxLatencyMs: 5000,
    maxTokens: 500
  },
  {
    type: 'business_rule',
    rule: 'all_shipments_have_dates'
  }
];

// Validate
const validationResult = await engine.validate(
  executionResult,
  rules,
  scenario
);

if (!validationResult.passed) {
  console.error('Validation failed:');
  validationResult.errors.forEach(err => console.error(`  - ${err}`));
}

console.log(`Confidence: ${(validationResult.confidence * 100).toFixed(1)}%`);
```

---

**Next Document:** [06-metrics-tracking.md](./06-metrics-tracking.md) - Metrics and observability

