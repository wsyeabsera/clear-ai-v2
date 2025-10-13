# Blueprint 02: Enhanced Planner Intelligence

## 🎯 Problem Statement

**Current Issue:** Planner creates correct steps but fails to understand intent, leading to incomplete plans.

**Root Cause:** 
- No intent recognition (CREATE vs READ vs UPDATE vs DELETE)
- Missing plan validation
- Poor tool parameter inference from natural language
- No plan completeness checking

**Impact:** Critical - 24% of scenarios fail due to incomplete or incorrect plans.

## 🔍 Current Architecture Analysis

### Current Flow
```
Natural Language Query → LLM → Basic Plan → Executor → Partial Success/Failure
```

### Current Code Issues
```typescript
// In src/agents/planner.ts - Current problematic approach
const createPlan = async (query: string): Promise<Plan> => {
  // ❌ No intent recognition
  // ❌ No plan validation
  // ❌ No tool schema awareness
  // ❌ No completeness checking
  
  const steps = await llm.generateSteps(query);
  return { steps, metadata: { query } };
};
```

### Benchmark Evidence
- **Scenario 1:** Planned to query facilities but didn't plan to CREATE shipment
- **Scenario 4:** Created invalid plan leading to 0% success
- **Scenario 2:** Missing rejection workflow steps

## 🏗️ Proposed Solution

### New Architecture
```
Natural Language Query → Intent Recognition → Tool Selection → Plan Generation → Validation → Complete Plan
```

### Core Components

#### 1. Intent Recognition Engine
```typescript
interface Intent {
  type: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ANALYZE' | 'MONITOR';
  entities: string[];
  operations: string[];
  confidence: number;
}

class IntentRecognizer {
  async recognizeIntent(query: string): Promise<Intent> {
    // Analyze natural language to understand intent
    // Identify entities and operations
    // Calculate confidence score
  }
}
```

#### 2. Tool Schema Registry
```typescript
interface ToolSchema {
  name: string;
  description: string;
  parameters: ParameterSchema[];
  requiredParameters: string[];
  returns: string;
  examples: ToolExample[];
}

class ToolSchemaRegistry {
  private schemas: Map<string, ToolSchema> = new Map();
  
  getSchema(toolName: string): ToolSchema | undefined {
    return this.schemas.get(toolName);
  }
  
  validateParameters(toolName: string, params: any): ValidationResult {
    // Validate parameters against schema
  }
}
```

#### 3. Plan Validator
```typescript
class PlanValidator {
  validatePlan(plan: Plan, intent: Intent): ValidationResult {
    // Check plan completeness
    // Validate tool parameters
    // Ensure goal achievement
    // Check for missing steps
  }
}
```

## 📝 Implementation Steps

### Step 1: Create Intent Recognition System
```typescript
// src/agents/planner/intent-recognizer.ts
export class IntentRecognizer {
  private readonly intents = {
    CREATE: ['create', 'add', 'new', 'generate', 'make', 'build'],
    READ: ['get', 'find', 'list', 'show', 'display', 'fetch', 'retrieve'],
    UPDATE: ['update', 'modify', 'change', 'edit', 'alter'],
    DELETE: ['delete', 'remove', 'destroy', 'eliminate'],
    ANALYZE: ['analyze', 'examine', 'study', 'investigate', 'evaluate'],
    MONITOR: ['monitor', 'watch', 'track', 'observe', 'check']
  };
  
  private readonly entities = [
    'shipment', 'facility', 'contaminant', 'inspection', 'waste', 'analytics'
  ];
  
  async recognizeIntent(query: string): Promise<Intent> {
    const words = query.toLowerCase().split(/\s+/);
    
    // Detect intent type
    const intentType = this.detectIntentType(words);
    
    // Extract entities
    const entities = this.extractEntities(query);
    
    // Identify operations
    const operations = this.extractOperations(query);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(intentType, entities, operations);
    
    return {
      type: intentType,
      entities,
      operations,
      confidence
    };
  }
  
  private detectIntentType(words: string[]): Intent['type'] {
    for (const [intent, keywords] of Object.entries(this.intents)) {
      if (keywords.some(keyword => words.includes(keyword))) {
        return intent as Intent['type'];
      }
    }
    return 'READ'; // Default fallback
  }
  
  private extractEntities(query: string): string[] {
    const found: string[] = [];
    for (const entity of this.entities) {
      if (query.toLowerCase().includes(entity)) {
        found.push(entity);
      }
    }
    return found;
  }
  
  private extractOperations(query: string): string[] {
    // Extract specific operations mentioned in query
    const operations: string[] = [];
    
    if (query.includes('high-risk')) operations.push('filter_high_risk');
    if (query.includes('capacity')) operations.push('check_capacity');
    if (query.includes('contamination')) operations.push('analyze_contamination');
    if (query.includes('reject')) operations.push('reject_shipment');
    if (query.includes('inspect')) operations.push('create_inspection');
    
    return operations;
  }
  
  private calculateConfidence(intent: string, entities: string[], operations: string[]): number {
    let confidence = 0.5; // Base confidence
    
    if (intent !== 'READ') confidence += 0.2; // Non-default intent
    if (entities.length > 0) confidence += 0.2; // Entities found
    if (operations.length > 0) confidence += 0.1; // Operations found
    
    return Math.min(confidence, 1.0);
  }
}
```

### Step 2: Create Tool Schema Registry
```typescript
// src/agents/planner/tool-schema-registry.ts
export class ToolSchemaRegistry {
  private schemas: Map<string, ToolSchema> = new Map();
  
  constructor() {
    this.initializeSchemas();
  }
  
  private initializeSchemas(): void {
    // Shipments
    this.schemas.set('shipments_list', {
      name: 'shipments_list',
      description: 'List shipments with optional filtering',
      parameters: [
        { name: 'facility_id', type: 'string', required: false },
        { name: 'status', type: 'string', required: false },
        { name: 'has_contaminants', type: 'boolean', required: false },
        { name: 'date_from', type: 'string', required: false },
        { name: 'date_to', type: 'string', required: false },
        { name: 'limit', type: 'number', required: false }
      ],
      requiredParameters: [],
      returns: 'List of shipments',
      examples: [
        { input: { has_contaminants: true }, output: 'Filtered contaminated shipments' },
        { input: { facility_id: 'F1' }, output: 'Shipments for facility F1' }
      ]
    });
    
    this.schemas.set('shipments_create', {
      name: 'shipments_create',
      description: 'Create a new shipment',
      parameters: [
        { name: 'id', type: 'string', required: true },
        { name: 'facility_id', type: 'string', required: true },
        { name: 'date', type: 'string', required: true },
        { name: 'status', type: 'string', required: true },
        { name: 'weight_kg', type: 'number', required: true },
        { name: 'has_contaminants', type: 'boolean', required: true },
        { name: 'origin', type: 'string', required: true },
        { name: 'destination', type: 'string', required: true },
        { name: 'waste_type', type: 'string', required: true },
        { name: 'carrier', type: 'string', required: true }
      ],
      requiredParameters: ['id', 'facility_id', 'date', 'status', 'weight_kg', 'has_contaminants', 'origin', 'destination', 'waste_type', 'carrier'],
      returns: 'Created shipment details',
      examples: [
        { 
          input: { 
            id: 'S1', 
            facility_id: 'F1', 
            weight_kg: 1000, 
            origin: 'Berlin',
            destination: 'Munich'
          }, 
          output: 'New shipment S1 created' 
        }
      ]
    });
    
    // Add more schemas for facilities, contaminants, inspections, etc.
  }
  
  getSchema(toolName: string): ToolSchema | undefined {
    return this.schemas.get(toolName);
  }
  
  getAllSchemas(): ToolSchema[] {
    return Array.from(this.schemas.values());
  }
  
  validateParameters(toolName: string, params: any): ValidationResult {
    const schema = this.getSchema(toolName);
    if (!schema) {
      return { valid: false, errors: [`Unknown tool: ${toolName}`] };
    }
    
    const errors: string[] = [];
    
    // Check required parameters
    for (const required of schema.requiredParameters) {
      if (!(required in params)) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
    
    // Check parameter types
    for (const param of schema.parameters) {
      if (param.name in params) {
        const value = params[param.name];
        const expectedType = param.type;
        
        if (!this.validateType(value, expectedType)) {
          errors.push(`Parameter ${param.name} should be ${expectedType}, got ${typeof value}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### Step 3: Create Enhanced Planner
```typescript
// src/agents/planner.ts - Enhanced version
export class EnhancedPlanner {
  private intentRecognizer: IntentRecognizer;
  private toolRegistry: ToolSchemaRegistry;
  private validator: PlanValidator;
  
  constructor() {
    this.intentRecognizer = new IntentRecognizer();
    this.toolRegistry = new ToolSchemaRegistry();
    this.validator = new PlanValidator();
  }
  
  async createPlan(query: string): Promise<PlanResult> {
    try {
      // Step 1: Recognize intent
      const intent = await this.intentRecognizer.recognizeIntent(query);
      
      // Step 2: Generate plan based on intent
      const plan = await this.generatePlanFromIntent(query, intent);
      
      // Step 3: Validate plan
      const validation = this.validator.validatePlan(plan, intent);
      
      if (!validation.valid) {
        // Attempt to fix plan
        const fixedPlan = await this.fixPlan(plan, validation.errors, intent);
        const revalidation = this.validator.validatePlan(fixedPlan, intent);
        
        if (!revalidation.valid) {
          throw new Error(`Plan validation failed: ${revalidation.errors.join(', ')}`);
        }
        
        return {
          requestId: generateRequestId(),
          plan: fixedPlan,
          metadata: {
            query,
            timestamp: new Date().toISOString(),
            estimatedDurationMs: this.estimateDuration(fixedPlan),
            intent,
            confidence: intent.confidence
          },
          status: 'validated'
        };
      }
      
      return {
        requestId: generateRequestId(),
        plan,
        metadata: {
          query,
          timestamp: new Date().toISOString(),
          estimatedDurationMs: this.estimateDuration(plan),
          intent,
          confidence: intent.confidence
        },
        status: 'validated'
      };
      
    } catch (error) {
      return {
        requestId: generateRequestId(),
        plan: { steps: [] },
        metadata: {
          query,
          timestamp: new Date().toISOString(),
          estimatedDurationMs: 0,
          intent: { type: 'READ', entities: [], operations: [], confidence: 0 },
          error: error.message
        },
        status: 'failed'
      };
    }
  }
  
  private async generatePlanFromIntent(query: string, intent: Intent): Promise<Plan> {
    const steps: PlanStep[] = [];
    
    switch (intent.type) {
      case 'CREATE':
        steps.push(...this.generateCreateSteps(query, intent));
        break;
      case 'READ':
        steps.push(...this.generateReadSteps(query, intent));
        break;
      case 'UPDATE':
        steps.push(...this.generateUpdateSteps(query, intent));
        break;
      case 'DELETE':
        steps.push(...this.generateDeleteSteps(query, intent));
        break;
      case 'ANALYZE':
        steps.push(...this.generateAnalyzeSteps(query, intent));
        break;
      case 'MONITOR':
        steps.push(...this.generateMonitorSteps(query, intent));
        break;
    }
    
    return { steps };
  }
  
  private generateCreateSteps(query: string, intent: Intent): PlanStep[] {
    const steps: PlanStep[] = [];
    
    // Example: "Create a new shipment from Stuttgart to Frankfurt"
    if (intent.entities.includes('shipment')) {
      // Step 1: Get facility information
      steps.push({
        tool: 'facilities_list',
        params: this.extractLocationParams(query),
        dependsOn: [],
        parallel: false
      });
      
      // Step 2: Create shipment
      steps.push({
        tool: 'shipments_create',
        params: this.extractShipmentParams(query),
        dependsOn: [0], // Depends on facility lookup
        parallel: false
      });
    }
    
    return steps;
  }
  
  private generateReadSteps(query: string, intent: Intent): PlanStep[] {
    const steps: PlanStep[] = [];
    
    // Example: "Find shipments with high-risk contaminants"
    if (intent.entities.includes('shipment') && intent.operations.includes('filter_high_risk')) {
      steps.push({
        tool: 'shipments_list',
        params: { has_contaminants: true },
        dependsOn: [],
        parallel: false
      });
      
      steps.push({
        tool: 'contaminants_list',
        params: { risk_level: 'high' },
        dependsOn: [],
        parallel: false
      });
    }
    
    return steps;
  }
  
  private generateAnalyzeSteps(query: string, intent: Intent): PlanStep[] {
    const steps: PlanStep[] = [];
    
    // Example: "Analyze contamination patterns"
    steps.push({
      tool: 'analytics_contamination_rate',
      params: {},
      dependsOn: [],
      parallel: false
    });
    
    steps.push({
      tool: 'analytics_facility_performance',
      params: {},
      dependsOn: [],
      parallel: false
    });
    
    steps.push({
      tool: 'contaminants_list',
      params: {},
      dependsOn: [],
      parallel: false
    });
    
    return steps;
  }
  
  private extractLocationParams(query: string): any {
    const params: any = {};
    
    // Extract location mentions
    const locationMatch = query.match(/(?:from|to|in|at)\s+([A-Za-z]+)/gi);
    if (locationMatch) {
      const locations = locationMatch.map(match => match.split(/\s+/)[1]);
      if (locations.length > 0) {
        params.location = locations[0]; // Use first location for facility lookup
      }
    }
    
    return params;
  }
  
  private extractShipmentParams(query: string): any {
    const params: any = {};
    
    // Extract weight
    const weightMatch = query.match(/(\d+)\s*kg/);
    if (weightMatch) {
      params.weight_kg = parseInt(weightMatch[1]);
    }
    
    // Extract waste type
    const wasteTypes = ['plastic', 'metal', 'paper', 'glass', 'industrial', 'hazardous'];
    for (const type of wasteTypes) {
      if (query.toLowerCase().includes(type)) {
        params.waste_type = type;
        break;
      }
    }
    
    // Extract carrier
    const carrierMatch = query.match(/(?:carried by|transported by|carrier:?)\s+([A-Za-z\s]+)/i);
    if (carrierMatch) {
      params.carrier = carrierMatch[1].trim();
    }
    
    // Set defaults
    params.id = `S${Date.now()}`;
    params.date = new Date().toISOString().split('T')[0];
    params.status = 'pending';
    params.has_contaminants = false;
    
    return params;
  }
  
  private async fixPlan(plan: Plan, errors: string[], intent: Intent): Promise<Plan> {
    // Attempt to fix common plan issues
    const fixedSteps = [...plan.steps];
    
    for (const error of errors) {
      if (error.includes('Missing required parameter')) {
        // Try to infer missing parameters from context
        const stepIndex = this.findStepWithError(fixedSteps, error);
        if (stepIndex >= 0) {
          fixedSteps[stepIndex] = await this.fixStepParameters(fixedSteps[stepIndex], intent);
        }
      }
    }
    
    return { steps: fixedSteps };
  }
  
  private findStepWithError(steps: PlanStep[], error: string): number {
    // Find the step that has the error
    // This is a simplified implementation
    return 0;
  }
  
  private async fixStepParameters(step: PlanStep, intent: Intent): Promise<PlanStep> {
    // Try to infer missing parameters based on intent and tool schema
    const schema = this.toolRegistry.getSchema(step.tool);
    if (!schema) return step;
    
    const fixedParams = { ...step.params };
    
    // Add missing required parameters with smart defaults
    for (const required of schema.requiredParameters) {
      if (!(required in fixedParams)) {
        fixedParams[required] = this.generateDefaultValue(required, intent);
      }
    }
    
    return {
      ...step,
      params: fixedParams
    };
  }
  
  private generateDefaultValue(paramName: string, intent: Intent): any {
    switch (paramName) {
      case 'id':
        return `${intent.entities[0]?.toUpperCase() || 'ITEM'}${Date.now()}`;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'status':
        return intent.type === 'CREATE' ? 'pending' : 'active';
      case 'has_contaminants':
        return false;
      default:
        return null;
    }
  }
  
  private estimateDuration(plan: Plan): number {
    // Estimate execution time based on number of steps and their complexity
    const baseTime = 1000; // 1 second per step
    const complexityMultiplier = plan.steps.length > 5 ? 1.5 : 1.0;
    return Math.round(baseTime * plan.steps.length * complexityMultiplier);
  }
}
```

### Step 4: Create Plan Validator
```typescript
// src/agents/planner/plan-validator.ts
export class PlanValidator {
  private toolRegistry: ToolSchemaRegistry;
  
  constructor(toolRegistry: ToolSchemaRegistry) {
    this.toolRegistry = toolRegistry;
  }
  
  validatePlan(plan: Plan, intent: Intent): ValidationResult {
    const errors: string[] = [];
    
    // Check if plan has steps
    if (plan.steps.length === 0) {
      errors.push('Plan has no steps');
      return { valid: false, errors };
    }
    
    // Validate each step
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const stepErrors = this.validateStep(step, i);
      errors.push(...stepErrors.map(error => `Step ${i}: ${error}`));
    }
    
    // Check plan completeness
    const completenessErrors = this.checkPlanCompleteness(plan, intent);
    errors.push(...completenessErrors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private validateStep(step: PlanStep, stepIndex: number): string[] {
    const errors: string[] = [];
    
    // Check if tool exists
    const schema = this.toolRegistry.getSchema(step.tool);
    if (!schema) {
      errors.push(`Unknown tool: ${step.tool}`);
      return errors;
    }
    
    // Validate parameters
    const paramValidation = this.toolRegistry.validateParameters(step.tool, step.params);
    if (!paramValidation.valid) {
      errors.push(...paramValidation.errors);
    }
    
    // Check dependencies
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        if (dep >= stepIndex) {
          errors.push(`Dependency ${dep} is invalid (must be less than current step ${stepIndex})`);
        }
      }
    }
    
    return errors;
  }
  
  private checkPlanCompleteness(plan: Plan, intent: Intent): string[] {
    const errors: string[] = [];
    
    const tools = plan.steps.map(step => step.tool);
    
    // Check if plan can achieve the intent
    switch (intent.type) {
      case 'CREATE':
        if (intent.entities.includes('shipment') && !tools.includes('shipments_create')) {
          errors.push('Plan cannot create shipment without shipments_create tool');
        }
        break;
      case 'READ':
        if (intent.entities.includes('shipment') && !tools.some(t => t.includes('shipments'))) {
          errors.push('Plan cannot read shipments without shipment-related tools');
        }
        break;
      case 'UPDATE':
        if (!tools.some(t => t.includes('update') || t.includes('put'))) {
          errors.push('Plan cannot update without update tools');
        }
        break;
      case 'DELETE':
        if (!tools.some(t => t.includes('delete'))) {
          errors.push('Plan cannot delete without delete tools');
        }
        break;
    }
    
    return errors;
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// src/agents/planner/__tests__/intent-recognizer.test.ts
describe('IntentRecognizer', () => {
  test('should recognize CREATE intent', async () => {
    const recognizer = new IntentRecognizer();
    const intent = await recognizer.recognizeIntent('Create a new shipment from Berlin to Munich');
    
    expect(intent.type).toBe('CREATE');
    expect(intent.entities).toContain('shipment');
    expect(intent.confidence).toBeGreaterThan(0.7);
  });
  
  test('should recognize ANALYZE intent', async () => {
    const recognizer = new IntentRecognizer();
    const intent = await recognizer.recognizeIntent('Analyze contamination patterns and trends');
    
    expect(intent.type).toBe('ANALYZE');
    expect(intent.entities).toContain('contaminant');
    expect(intent.operations).toContain('analyze_contamination');
  });
});
```

### Integration Tests
```typescript
// src/agents/__tests__/enhanced-planner.test.ts
describe('EnhancedPlanner', () => {
  test('should create complete plan for shipment creation', async () => {
    const planner = new EnhancedPlanner();
    const result = await planner.createPlan('Create a new shipment from Stuttgart to Frankfurt with 1500kg of plastic waste');
    
    expect(result.status).toBe('validated');
    expect(result.plan.steps).toHaveLength(2);
    expect(result.plan.steps[0].tool).toBe('facilities_list');
    expect(result.plan.steps[1].tool).toBe('shipments_create');
    expect(result.metadata.intent.type).toBe('CREATE');
  });
});
```

## 📊 Success Metrics

### Before Implementation
- **Plan Completeness:** 76% (24% missing critical steps)
- **Intent Recognition:** Basic keyword matching only
- **Parameter Validation:** None

### After Implementation (Expected)
- **Plan Completeness:** 95%+
- **Intent Recognition:** 90%+ accuracy
- **Parameter Validation:** 100% coverage

## 🚀 Migration Plan

### Phase 1: Core Components
1. Implement `IntentRecognizer`
2. Create `ToolSchemaRegistry`
3. Add unit tests

### Phase 2: Enhanced Planner
1. Integrate intent recognition
2. Add plan validation
3. Update GraphQL schema

### Phase 3: Validation
1. Run benchmark scenarios
2. Verify plan completeness
3. Performance testing

---

**Priority:** P0 Critical  
**Estimated Effort:** 3-4 days  
**Risk Level:** Medium  
**Dependencies:** Tool schema definitions
