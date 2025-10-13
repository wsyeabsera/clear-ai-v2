# Blueprint 04: Validation Layer

## 🎯 Problem Statement

**Current Issue:** Invalid plans execute and fail, wasting time and resources.

**Root Cause:** 
- No pre-execution validation
- No parameter validation against tool schemas
- No feasibility checking
- No plan completeness verification

**Impact:** High - Prevents wasted execution time and improves reliability.

## 🏗️ Proposed Solution

### New Architecture
```
Plan → Pre-Execution Validator → Parameter Validator → Feasibility Checker → Validated Plan → Executor
```

### Core Components

#### 1. Pre-Execution Validator
```typescript
class PreExecutionValidator {
  validatePlan(plan: Plan): ValidationResult {
    // Check plan structure
    // Validate tool availability
    // Check dependencies
  }
}
```

#### 2. Parameter Validator
```typescript
class ParameterValidator {
  validateParameters(toolName: string, params: any): ValidationResult {
    // Validate against tool schema
    // Check required parameters
    // Validate parameter types
  }
}
```

#### 3. Feasibility Checker
```typescript
class FeasibilityChecker {
  checkFeasibility(plan: Plan, context: ExecutionContext): FeasibilityResult {
    // Check resource availability
    // Estimate execution time
    // Validate business logic constraints
  }
}
```

## 📝 Implementation Steps

### Step 1: Create Validation Framework
```typescript
// src/agents/validation/validation-framework.ts
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
}

export class ValidationFramework {
  private validators: Validator[] = [];
  
  registerValidator(validator: Validator): void {
    this.validators.push(validator);
  }
  
  async validate(plan: Plan, context?: ExecutionContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
    
    for (const validator of this.validators) {
      const validationResult = await validator.validate(plan, context);
      
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);
      result.suggestions.push(...validationResult.suggestions);
      
      if (validationResult.errors.some(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')) {
        result.valid = false;
      }
    }
    
    return result;
  }
}
```

### Step 2: Implement Plan Structure Validator
```typescript
// src/agents/validation/plan-structure-validator.ts
export class PlanStructureValidator implements Validator {
  validate(plan: Plan, context?: ExecutionContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    // Check if plan has steps
    if (!plan.steps || plan.steps.length === 0) {
      errors.push({
        code: 'NO_STEPS',
        message: 'Plan must have at least one step',
        path: 'steps',
        severity: 'CRITICAL'
      });
      return { valid: false, errors, warnings, suggestions };
    }
    
    // Validate each step structure
    plan.steps.forEach((step, index) => {
      const stepErrors = this.validateStepStructure(step, index);
      errors.push(...stepErrors);
    });
    
    // Check for circular dependencies
    const circularDeps = this.checkCircularDependencies(plan.steps);
    if (circularDeps.length > 0) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependencies detected: ${circularDeps.join(', ')}`,
        path: 'steps',
        severity: 'HIGH'
      });
    }
    
    // Check for orphaned steps
    const orphanedSteps = this.findOrphanedSteps(plan.steps);
    if (orphanedSteps.length > 0) {
      warnings.push({
        code: 'ORPHANED_STEPS',
        message: `Steps with no dependencies or dependents: ${orphanedSteps.join(', ')}`,
        path: 'steps'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  private validateStepStructure(step: PlanStep, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check required fields
    if (!step.tool) {
      errors.push({
        code: 'MISSING_TOOL',
        message: 'Step must have a tool',
        path: `steps[${index}].tool`,
        severity: 'CRITICAL'
      });
    }
    
    if (!step.params || typeof step.params !== 'object') {
      errors.push({
        code: 'INVALID_PARAMS',
        message: 'Step must have valid parameters object',
        path: `steps[${index}].params`,
        severity: 'HIGH'
      });
    }
    
    // Validate dependencies
    if (step.dependsOn) {
      if (!Array.isArray(step.dependsOn)) {
        errors.push({
          code: 'INVALID_DEPENDENCIES',
          message: 'Dependencies must be an array',
          path: `steps[${index}].dependsOn`,
          severity: 'HIGH'
        });
      } else {
        step.dependsOn.forEach((dep, depIndex) => {
          if (typeof dep !== 'number' || dep < 0 || dep >= index) {
            errors.push({
              code: 'INVALID_DEPENDENCY_INDEX',
              message: `Invalid dependency index: ${dep}`,
              path: `steps[${index}].dependsOn[${depIndex}]`,
              severity: 'HIGH'
            });
          }
        });
      }
    }
    
    return errors;
  }
  
  private checkCircularDependencies(steps: PlanStep[]): string[] {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    const circularDeps: string[] = [];
    
    const dfs = (stepIndex: number, path: number[]): void => {
      if (recursionStack.has(stepIndex)) {
        circularDeps.push(path.join(' -> ') + ` -> ${stepIndex}`);
        return;
      }
      
      if (visited.has(stepIndex)) {
        return;
      }
      
      visited.add(stepIndex);
      recursionStack.add(stepIndex);
      
      const step = steps[stepIndex];
      if (step.dependsOn) {
        step.dependsOn.forEach(dep => {
          dfs(dep, [...path, stepIndex]);
        });
      }
      
      recursionStack.delete(stepIndex);
    };
    
    for (let i = 0; i < steps.length; i++) {
      if (!visited.has(i)) {
        dfs(i, []);
      }
    }
    
    return circularDeps;
  }
  
  private findOrphanedSteps(steps: PlanStep[]): number[] {
    const hasDependents = new Set<number>();
    const hasDependencies = new Set<number>();
    
    steps.forEach((step, index) => {
      if (step.dependsOn && step.dependsOn.length > 0) {
        hasDependencies.add(index);
        step.dependsOn.forEach(dep => {
          hasDependents.add(dep);
        });
      }
    });
    
    const orphaned: number[] = [];
    steps.forEach((_, index) => {
      if (!hasDependents.has(index) && !hasDependencies.has(index)) {
        orphaned.push(index);
      }
    });
    
    return orphaned;
  }
}
```

### Step 3: Implement Parameter Validator
```typescript
// src/agents/validation/parameter-validator.ts
export class ParameterValidator implements Validator {
  private toolRegistry: ToolSchemaRegistry;
  
  constructor(toolRegistry: ToolSchemaRegistry) {
    this.toolRegistry = toolRegistry;
  }
  
  validate(plan: Plan, context?: ExecutionContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    plan.steps.forEach((step, index) => {
      const stepValidation = this.validateStepParameters(step, index);
      errors.push(...stepValidation.errors);
      warnings.push(...stepValidation.warnings);
      suggestions.push(...stepValidation.suggestions);
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  private validateStepParameters(step: PlanStep, index: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    const schema = this.toolRegistry.getSchema(step.tool);
    if (!schema) {
      errors.push({
        code: 'UNKNOWN_TOOL',
        message: `Unknown tool: ${step.tool}`,
        path: `steps[${index}].tool`,
        severity: 'CRITICAL'
      });
      return { valid: false, errors, warnings, suggestions };
    }
    
    // Check required parameters
    for (const required of schema.requiredParameters) {
      if (!(required in step.params)) {
        errors.push({
          code: 'MISSING_REQUIRED_PARAM',
          message: `Missing required parameter: ${required}`,
          path: `steps[${index}].params.${required}`,
          severity: 'HIGH'
        });
      }
    }
    
    // Validate parameter types
    for (const param of schema.parameters) {
      if (param.name in step.params) {
        const value = step.params[param.name];
        const typeValidation = this.validateParameterType(value, param.type, param.name);
        
        if (!typeValidation.valid) {
          errors.push({
            code: 'INVALID_PARAMETER_TYPE',
            message: typeValidation.message,
            path: `steps[${index}].params.${param.name}`,
            severity: 'HIGH'
          });
        }
      }
    }
    
    // Check for unknown parameters
    const knownParams = schema.parameters.map(p => p.name);
    const unknownParams = Object.keys(step.params).filter(key => !knownParams.includes(key));
    
    if (unknownParams.length > 0) {
      warnings.push({
        code: 'UNKNOWN_PARAMETERS',
        message: `Unknown parameters: ${unknownParams.join(', ')}`,
        path: `steps[${index}].params`
      });
    }
    
    // Generate suggestions for common issues
    if (step.tool.includes('create') && !step.params.id) {
      suggestions.push(`Consider adding an 'id' parameter for ${step.tool}`);
    }
    
    if (step.tool.includes('list') && !step.params.limit) {
      suggestions.push(`Consider adding a 'limit' parameter to prevent large result sets`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  private validateParameterType(value: any, expectedType: string, paramName: string): { valid: boolean; message: string } {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, message: `Parameter ${paramName} should be a string, got ${typeof value}` };
        }
        break;
        
      case 'number':
        if (typeof value !== 'number') {
          return { valid: false, message: `Parameter ${paramName} should be a number, got ${typeof value}` };
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, message: `Parameter ${paramName} should be a boolean, got ${typeof value}` };
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, message: `Parameter ${paramName} should be an array, got ${typeof value}` };
        }
        break;
        
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { valid: false, message: `Parameter ${paramName} should be an object, got ${typeof value}` };
        }
        break;
    }
    
    return { valid: true, message: '' };
  }
}
```

### Step 4: Implement Feasibility Checker
```typescript
// src/agents/validation/feasibility-checker.ts
export class FeasibilityChecker implements Validator {
  private toolRegistry: ToolSchemaRegistry;
  
  constructor(toolRegistry: ToolSchemaRegistry) {
    this.toolRegistry = toolRegistry;
  }
  
  validate(plan: Plan, context?: ExecutionContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    // Check estimated execution time
    const estimatedTime = this.estimateExecutionTime(plan);
    if (estimatedTime > 30000) { // 30 seconds
      warnings.push({
        code: 'LONG_EXECUTION_TIME',
        message: `Estimated execution time is ${estimatedTime}ms, consider optimizing`,
        path: 'plan'
      });
    }
    
    // Check for potential bottlenecks
    const bottlenecks = this.identifyBottlenecks(plan);
    if (bottlenecks.length > 0) {
      warnings.push({
        code: 'POTENTIAL_BOTTLENECKS',
        message: `Potential bottlenecks detected: ${bottlenecks.join(', ')}`,
        path: 'plan'
      });
    }
    
    // Check resource requirements
    const resourceCheck = this.checkResourceRequirements(plan);
    if (!resourceCheck.sufficient) {
      errors.push({
        code: 'INSUFFICIENT_RESOURCES',
        message: resourceCheck.message,
        path: 'plan',
        severity: 'MEDIUM'
      });
    }
    
    // Check business logic constraints
    const constraintCheck = this.checkBusinessConstraints(plan);
    errors.push(...constraintCheck.errors);
    warnings.push(...constraintCheck.warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  private estimateExecutionTime(plan: Plan): number {
    let totalTime = 0;
    
    plan.steps.forEach(step => {
      const baseTime = this.getBaseExecutionTime(step.tool);
      const complexityMultiplier = this.getComplexityMultiplier(step.params);
      totalTime += baseTime * complexityMultiplier;
    });
    
    return totalTime;
  }
  
  private getBaseExecutionTime(tool: string): number {
    const timeMap: Record<string, number> = {
      'facilities_list': 1000,
      'shipments_list': 1500,
      'contaminants_list': 1200,
      'inspections_list': 1000,
      'shipments_create': 2000,
      'facilities_create': 2500,
      'analytics_contamination_rate': 3000,
      'analytics_facility_performance': 2500
    };
    
    return timeMap[tool] || 1000; // Default 1 second
  }
  
  private getComplexityMultiplier(params: any): number {
    let multiplier = 1.0;
    
    // Large result sets take longer
    if (params.limit && params.limit > 100) {
      multiplier += (params.limit - 100) / 1000;
    }
    
    // Complex filters take longer
    const filterCount = Object.keys(params).filter(key => 
      ['date_from', 'date_to', 'facility_id', 'status', 'has_contaminants'].includes(key)
    ).length;
    
    multiplier += filterCount * 0.2;
    
    return Math.min(multiplier, 3.0); // Cap at 3x
  }
  
  private identifyBottlenecks(plan: Plan): string[] {
    const bottlenecks: string[] = [];
    
    plan.steps.forEach((step, index) => {
      // Large list operations
      if (step.tool.includes('list') && step.params.limit > 1000) {
        bottlenecks.push(`Step ${index}: Large list operation (${step.params.limit} items)`);
      }
      
      // Sequential operations that could be parallel
      if (step.dependsOn && step.dependsOn.length === 0 && index > 0) {
        const prevStep = plan.steps[index - 1];
        if (!prevStep.dependsOn || prevStep.dependsOn.length === 0) {
          bottlenecks.push(`Step ${index}: Could be parallel with step ${index - 1}`);
        }
      }
      
      // Analytics operations
      if (step.tool.includes('analytics')) {
        bottlenecks.push(`Step ${index}: Analytics operation may be slow`);
      }
    });
    
    return bottlenecks;
  }
  
  private checkResourceRequirements(plan: Plan): { sufficient: boolean; message: string } {
    // Check memory requirements
    const memoryIntensive = plan.steps.filter(step => 
      step.tool.includes('list') && step.params.limit > 1000
    ).length;
    
    if (memoryIntensive > 2) {
      return {
        sufficient: false,
        message: 'Plan requires significant memory for large list operations'
      };
    }
    
    // Check API rate limits
    const apiCalls = plan.steps.length;
    if (apiCalls > 20) {
      return {
        sufficient: false,
        message: 'Plan may hit API rate limits with too many sequential calls'
      };
    }
    
    return { sufficient: true, message: '' };
  }
  
  private checkBusinessConstraints(plan: Plan): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for conflicting operations
    const createOperations = plan.steps.filter(step => step.tool.includes('create'));
    const deleteOperations = plan.steps.filter(step => step.tool.includes('delete'));
    
    if (createOperations.length > 0 && deleteOperations.length > 0) {
      warnings.push({
        code: 'CONFLICTING_OPERATIONS',
        message: 'Plan contains both create and delete operations',
        path: 'plan'
      });
    }
    
    // Check for missing prerequisites
    const updateOperations = plan.steps.filter(step => step.tool.includes('update'));
    const readOperations = plan.steps.filter(step => step.tool.includes('get') || step.tool.includes('list'));
    
    if (updateOperations.length > 0 && readOperations.length === 0) {
      warnings.push({
        code: 'MISSING_PREREQUISITES',
        message: 'Update operations without corresponding read operations',
        path: 'plan'
      });
    }
    
    return {
      valid: true,
      errors,
      warnings,
      suggestions: []
    };
  }
}
```

### Step 5: Integrate with Enhanced Planner
```typescript
// src/agents/planner.ts - Enhanced with validation
export class EnhancedPlanner {
  private validationFramework: ValidationFramework;
  
  constructor() {
    this.validationFramework = new ValidationFramework();
    this.initializeValidators();
  }
  
  private initializeValidators(): void {
    this.validationFramework.registerValidator(new PlanStructureValidator());
    this.validationFramework.registerValidator(new ParameterValidator(this.toolRegistry));
    this.validationFramework.registerValidator(new FeasibilityChecker(this.toolRegistry));
  }
  
  async createPlan(query: string): Promise<PlanResult> {
    try {
      // Step 1: Recognize intent
      const intent = await this.intentRecognizer.recognizeIntent(query);
      
      // Step 2: Generate plan based on intent
      const plan = await this.generatePlanFromIntent(query, intent);
      
      // Step 3: Validate plan
      const validation = await this.validationFramework.validate(plan);
      
      if (!validation.valid) {
        console.log(`❌ Plan validation failed:`, validation.errors);
        
        // Attempt to fix plan
        const fixedPlan = await this.fixPlan(plan, validation);
        
        if (fixedPlan) {
          const revalidation = await this.validationFramework.validate(fixedPlan);
          
          if (revalidation.valid) {
            return this.createPlanResult(fixedPlan, query, intent, 'validated');
          }
        }
        
        return this.createPlanResult(plan, query, intent, 'validation_failed', validation);
      }
      
      return this.createPlanResult(plan, query, intent, 'validated', validation);
      
    } catch (error) {
      return this.createPlanResult({ steps: [] }, query, { type: 'READ', entities: [], operations: [], confidence: 0 }, 'failed', null, error.message);
    }
  }
  
  private async fixPlan(plan: Plan, validation: ValidationResult): Promise<Plan | null> {
    const fixedSteps = [...plan.steps];
    
    for (const error of validation.errors) {
      if (error.code === 'MISSING_REQUIRED_PARAM') {
        const stepIndex = this.extractStepIndex(error.path);
        if (stepIndex >= 0) {
          fixedSteps[stepIndex] = await this.fixStepParameters(fixedSteps[stepIndex], error);
        }
      }
    }
    
    return { steps: fixedSteps };
  }
  
  private extractStepIndex(path: string): number {
    const match = path.match(/steps\[(\d+)\]/);
    return match ? parseInt(match[1]) : -1;
  }
  
  private async fixStepParameters(step: PlanStep, error: ValidationError): Promise<PlanStep> {
    const paramName = error.path.split('.').pop();
    if (!paramName) return step;
    
    const fixedParams = { ...step.params };
    fixedParams[paramName] = this.generateDefaultValue(paramName);
    
    return {
      ...step,
      params: fixedParams
    };
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// src/agents/validation/__tests__/validation-framework.test.ts
describe('ValidationFramework', () => {
  test('should validate plan structure', async () => {
    const framework = new ValidationFramework();
    framework.registerValidator(new PlanStructureValidator());
    
    const plan: Plan = {
      steps: [
        {
          tool: 'facilities_list',
          params: { location: 'Berlin' },
          dependsOn: [],
          parallel: false
        }
      ]
    };
    
    const result = await framework.validate(plan);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('should detect circular dependencies', async () => {
    const framework = new ValidationFramework();
    framework.registerValidator(new PlanStructureValidator());
    
    const plan: Plan = {
      steps: [
        {
          tool: 'step1',
          params: {},
          dependsOn: [1],
          parallel: false
        },
        {
          tool: 'step2',
          params: {},
          dependsOn: [0],
          parallel: false
        }
      ]
    };
    
    const result = await framework.validate(plan);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
  });
});
```

## 📊 Success Metrics

### Before Implementation
- **Pre-execution Validation:** None
- **Parameter Validation:** Basic only
- **Plan Completeness:** 76%

### After Implementation (Expected)
- **Pre-execution Validation:** 100% coverage
- **Parameter Validation:** 100% schema compliance
- **Plan Completeness:** 95%+

## 🚀 Migration Plan

### Phase 1: Core Framework
1. Implement `ValidationFramework`
2. Create `PlanStructureValidator`
3. Add unit tests

### Phase 2: Advanced Validation
1. Implement `ParameterValidator`
2. Create `FeasibilityChecker`
3. Add integration tests

### Phase 3: Integration
1. Integrate with planner
2. Update GraphQL schema
3. Performance testing

---

**Priority:** P1 High  
**Estimated Effort:** 2-3 days  
**Risk Level:** Low  
**Dependencies:** Tool Schema Registry
