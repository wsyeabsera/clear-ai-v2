# Blueprint 01: Step Reference Resolution System

## 🎯 Problem Statement

**Current Issue:** "Invalid step reference: 0" errors causing 24% failure rate in benchmark scenarios.

**Root Cause:** The executor cannot resolve dynamic step references like `${step[0].data[0].id}` when executing dependent steps.

**Impact:** Critical - Blocks complex workflows and multi-step operations.

## 🔍 Current Architecture Analysis

### Current Flow
```
Planner → Creates plan with step references → Executor → Fails to resolve references → Error
```

### Current Code Issues
```typescript
// In src/agents/executor.ts - Current problematic approach
const executeStep = async (step: PlanStep, context: ExecutionContext) => {
  // ❌ No step result caching
  // ❌ No reference resolution
  // ❌ No context passing between steps
  const result = await executeTool(step.tool, step.params);
  return result;
};
```

### Benchmark Evidence
- **Scenario 1:** Failed on `"facility_id":"${step[0].data[0].id}"`
- **Scenario 4:** Complete failure due to unresolved references
- **Scenario 2:** Partial failure on dependent steps

## 🏗️ Proposed Solution

### New Architecture
```
Planner → Creates plan with references → Executor → Step Result Cache → Reference Resolver → Tool Execution → Success
```

### Core Components

#### 1. Step Result Cache
```typescript
interface StepResultCache {
  [stepIndex: number]: {
    success: boolean;
    data: any;
    error?: string;
    timestamp: Date;
    tool: string;
    params: any;
  };
}
```

#### 2. Reference Resolver
```typescript
class StepReferenceResolver {
  resolveReferences(params: any, cache: StepResultCache): any {
    // Resolve ${step[0].data[0].id} patterns
    // Handle array indexing and property access
    // Validate references exist
  }
}
```

#### 3. Enhanced Executor
```typescript
class EnhancedExecutor {
  private stepCache: StepResultCache = {};
  private resolver: StepReferenceResolver;
  
  async executeStep(step: PlanStep, stepIndex: number): Promise<ToolResult> {
    // 1. Resolve references in parameters
    const resolvedParams = this.resolver.resolveReferences(step.params, this.stepCache);
    
    // 2. Execute tool with resolved parameters
    const result = await this.executeTool(step.tool, resolvedParams);
    
    // 3. Cache result for future references
    this.stepCache[stepIndex] = {
      success: result.success,
      data: result.data,
      error: result.error,
      timestamp: new Date(),
      tool: step.tool,
      params: resolvedParams
    };
    
    return result;
  }
}
```

## 📝 Implementation Steps

### Step 1: Create Step Result Cache
```typescript
// src/agents/executor/step-cache.ts
export class StepResultCache {
  private cache: Map<number, CachedStepResult> = new Map();
  
  set(stepIndex: number, result: CachedStepResult): void {
    this.cache.set(stepIndex, result);
  }
  
  get(stepIndex: number): CachedStepResult | undefined {
    return this.cache.get(stepIndex);
  }
  
  has(stepIndex: number): boolean {
    return this.cache.has(stepIndex);
  }
}

interface CachedStepResult {
  success: boolean;
  data: any;
  error?: string;
  timestamp: Date;
  tool: string;
  params: any;
}
```

### Step 2: Implement Reference Resolver
```typescript
// src/agents/executor/reference-resolver.ts
export class StepReferenceResolver {
  private static readonly REFERENCE_PATTERN = /\$\{step\[(\d+)\]\.([^}]+)\}/g;
  
  resolveReferences(params: any, cache: StepResultCache): any {
    if (typeof params === 'string') {
      return this.resolveStringReferences(params, cache);
    }
    
    if (Array.isArray(params)) {
      return params.map(param => this.resolveReferences(param, cache));
    }
    
    if (typeof params === 'object' && params !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveReferences(value, cache);
      }
      return resolved;
    }
    
    return params;
  }
  
  private resolveStringReferences(str: string, cache: StepResultCache): any {
    return str.replace(StepReferenceResolver.REFERENCE_PATTERN, (match, stepIndex, path) => {
      const index = parseInt(stepIndex);
      
      if (!cache.has(index)) {
        throw new Error(`Step ${index} not found in cache. Available steps: ${Array.from(cache.keys()).join(', ')}`);
      }
      
      const stepResult = cache.get(index)!;
      
      if (!stepResult.success) {
        throw new Error(`Step ${index} failed: ${stepResult.error}`);
      }
      
      return this.getNestedValue(stepResult.data, path);
    });
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // Handle array indexing like data[0].id
      const arrayMatch = key.match(/^([^[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        const array = current[arrayKey];
        return Array.isArray(array) ? array[parseInt(index)] : undefined;
      }
      
      return current[key];
    }, obj);
  }
}
```

### Step 3: Enhance Executor
```typescript
// src/agents/executor.ts - Enhanced version
export class Executor {
  private stepCache: StepResultCache = new StepResultCache();
  private resolver: StepReferenceResolver = new StepReferenceResolver();
  
  async executePlan(plan: Plan): Promise<ExecutionResults> {
    const results: ToolResult[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      try {
        // Check dependencies first
        if (step.dependsOn && !this.checkDependencies(step.dependsOn)) {
          throw new Error(`Dependencies not met for step ${i}: ${step.dependsOn.join(', ')}`);
        }
        
        // Resolve references in parameters
        const resolvedParams = this.resolver.resolveReferences(step.params, this.stepCache);
        
        // Execute tool
        const result = await this.executeTool(step.tool, resolvedParams);
        
        // Cache result
        this.stepCache.set(i, {
          success: result.success,
          data: result.data,
          error: result.error,
          timestamp: new Date(),
          tool: step.tool,
          params: resolvedParams
        });
        
        results.push(result);
        
        // Stop on failure unless step is marked as optional
        if (!result.success && !step.optional) {
          break;
        }
        
      } catch (error) {
        const errorResult: ToolResult = {
          success: false,
          tool: step.tool,
          data: null,
          error: {
            code: 'EXECUTION_FAILED',
            message: error.message
          },
          metadata: {
            executionTime: 0,
            timestamp: new Date().toISOString()
          }
        };
        
        this.stepCache.set(i, {
          success: false,
          data: null,
          error: error.message,
          timestamp: new Date(),
          tool: step.tool,
          params: step.params
        });
        
        results.push(errorResult);
        
        if (!step.optional) {
          break;
        }
      }
    }
    
    return {
      requestId: plan.requestId,
      results,
      metadata: {
        totalDurationMs: Date.now() - startTime,
        successfulSteps: results.filter(r => r.success).length,
        failedSteps: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  private checkDependencies(dependsOn: number[]): boolean {
    return dependsOn.every(stepIndex => {
      const cached = this.stepCache.get(stepIndex);
      return cached && cached.success;
    });
  }
}
```

### Step 4: Update GraphQL Schema
```graphql
# src/graphql/schema.ts - Add new fields
type PlanStep {
  tool: String!
  params: JSON!
  dependsOn: [Int!]
  parallel: Boolean!
  optional: Boolean!  # New field
  retryCount: Int     # New field
  timeout: Int        # New field
}

type ToolResult {
  success: Boolean!
  tool: String!
  data: JSON
  error: ErrorDetails
  metadata: ToolResultMetadata!
  stepIndex: Int!     # New field
  resolvedParams: JSON # New field
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// src/agents/executor/__tests__/reference-resolver.test.ts
describe('StepReferenceResolver', () => {
  test('should resolve simple step reference', () => {
    const resolver = new StepReferenceResolver();
    const cache = new StepResultCache();
    
    cache.set(0, {
      success: true,
      data: { id: 'F1', name: 'Test Facility' },
      timestamp: new Date(),
      tool: 'facilities_list',
      params: {}
    });
    
    const result = resolver.resolveReferences(
      '${step[0].data.id}',
      cache
    );
    
    expect(result).toBe('F1');
  });
  
  test('should resolve array access', () => {
    const resolver = new StepReferenceResolver();
    const cache = new StepResultCache();
    
    cache.set(0, {
      success: true,
      data: [{ id: 'F1' }, { id: 'F2' }],
      timestamp: new Date(),
      tool: 'facilities_list',
      params: {}
    });
    
    const result = resolver.resolveReferences(
      '${step[0].data[0].id}',
      cache
    );
    
    expect(result).toBe('F1');
  });
  
  test('should handle missing step gracefully', () => {
    const resolver = new StepReferenceResolver();
    const cache = new StepResultCache();
    
    expect(() => {
      resolver.resolveReferences('${step[0].data.id}', cache);
    }).toThrow('Step 0 not found in cache');
  });
});
```

### Integration Tests
```typescript
// src/agents/__tests__/executor-integration.test.ts
describe('Executor Integration', () => {
  test('should execute plan with step references', async () => {
    const executor = new Executor();
    const plan: Plan = {
      steps: [
        {
          tool: 'facilities_list',
          params: { location: 'Stuttgart' },
          dependsOn: [],
          parallel: false
        },
        {
          tool: 'shipments_list',
          params: { facility_id: '${step[0].data[0].id}' },
          dependsOn: [0],
          parallel: false
        }
      ]
    };
    
    const result = await executor.executePlan(plan);
    
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);
  });
});
```

## 📊 Success Metrics

### Before Implementation
- **Step Reference Errors:** 24% of scenarios
- **Complex Workflow Success:** 0% (Scenario 4)
- **Multi-step Success:** 75% (Scenario 2)

### After Implementation (Expected)
- **Step Reference Errors:** 0%
- **Complex Workflow Success:** 100%
- **Multi-step Success:** 100%

### Performance Impact
- **Memory Usage:** +10-15% (for step cache)
- **Execution Time:** +5-10% (for reference resolution)
- **Reliability:** +24% improvement

## 🚀 Migration Plan

### Phase 1: Implement Core Components
1. Create `StepResultCache` class
2. Create `StepReferenceResolver` class
3. Add unit tests

### Phase 2: Integrate with Executor
1. Modify `Executor.executePlan()` method
2. Add dependency checking
3. Update error handling

### Phase 3: Update GraphQL
1. Add new fields to schema
2. Update resolvers
3. Test GraphQL mutations

### Phase 4: Validation
1. Run benchmark scenarios
2. Verify 100% success rate on step references
3. Performance testing

## 🔧 Rollback Strategy

If issues arise:
1. **Feature Flag:** Add `ENABLE_STEP_REFERENCES` environment variable
2. **Graceful Degradation:** Fall back to old executor if new one fails
3. **Monitoring:** Track error rates and performance metrics

## 📚 Additional Resources

- [Current Executor Code](../../src/agents/executor.ts)
- [GraphQL Schema](../../src/graphql/schema.ts)
- [Benchmark Results](../../benchmark-comparison-report.md)

---

**Priority:** P0 Critical  
**Estimated Effort:** 2-3 days  
**Risk Level:** Medium  
**Dependencies:** None
