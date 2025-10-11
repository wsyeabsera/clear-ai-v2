# Executor Agent Blueprint

**Executes Plans with Dependency Resolution and Parallelization**

Version: 2.0  
Status: Ready for Implementation  
Shared Library: ✅ Fully Integrated

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What It Does (Plain English)](#what-it-does-plain-english)
3. [Responsibilities](#responsibilities)
4. [Shared Library Integration](#shared-library-integration)
5. [Architecture](#architecture)
6. [Implementation](#implementation)
7. [Example Scenarios](#example-scenarios)
8. [Configuration](#configuration)
9. [Error Handling](#error-handling)
10. [Testing Strategy](#testing-strategy)
11. [Performance Optimization](#performance-optimization)

---

## Overview

The Executor Agent is the "doer" of the Clear AI v2 system. It takes structured plans from the Planner Agent and executes them by calling MCP tools, managing dependencies, handling parallelization, and aggregating results.

### Key Capabilities

- 🔗 **Dependency Resolution**: Builds execution graphs and resolves dependencies
- ⚡ **Parallel Execution**: Runs independent steps simultaneously
- 🔄 **Template Resolution**: Converts `${step[0].data.*.id}` into actual values
- 🔁 **Retry Logic**: Handles transient failures with exponential backoff
- ⏱️ **Timeout Management**: Prevents hanging operations
- 📊 **Metrics Tracking**: Monitors execution performance

---

## What It Does (Plain English)

Imagine you have a plan that says:
1. Get all contaminated shipments
2. For each shipment, get the contaminant details

The Executor Agent:
1. **Executes Step 1** - Calls the `shipments` tool with filters
2. **Waits** for the results (e.g., 5 shipments found)
3. **Resolves Template** - Takes the shipment IDs `[S1, S2, S3, S4, S5]`
4. **Executes Step 2** - Calls `contaminants-detected` with those IDs
5. **Aggregates** - Collects all results into a structured format
6. **Returns** - Passes everything to the Analyzer

Think of it as a project coordinator who follows the plan, delegates tasks, waits for results, and compiles everything together.

---

## Responsibilities

### Core Functions

1. **Plan Execution**
   - Execute plan steps in correct order
   - Respect dependency constraints
   - Handle sequential and parallel execution
   - Track execution progress

2. **Tool Invocation**
   - Call MCP tools with parameters
   - Resolve template parameters from previous results
   - Handle tool errors gracefully
   - Track tool execution metadata

3. **Dependency Management**
   - Build dependency graph from plan
   - Detect circular dependencies
   - Find steps ready for execution
   - Manage execution order

4. **Result Aggregation**
   - Collect results from all executions
   - Maintain execution order information
   - Preserve metadata (timing, errors, retries)
   - Format results for analysis

5. **Error Management**
   - Retry failed tool calls
   - Handle partial failures
   - Provide detailed error information
   - Implement timeout protection

---

## Shared Library Integration

### Imports from Shared Library

```typescript
// Type definitions
import {
  Plan,
  PlanStep,
  ToolResult,
  ErrorDetails,
  ToolResultMetadata
} from '../shared/types/agent.js';

import { MCPTool } from '../shared/types/tool.js';

// Template resolution
import {
  resolveTemplateParams,
  hasTemplates,
  getStepDependencies
} from '../shared/utils/template.js';

// Retry and timeout
import {
  withRetry,
  withTimeout,
  sleep
} from '../shared/utils/retry.js';

// Validation
import {
  ToolResultSchema,
  validateToolResult
} from '../shared/validation/schemas.js';

// Utilities
import { getCurrentTimestamp } from '../shared/utils/date.js';
```

### Key Shared Components Used

| Component | Purpose | Usage in Executor |
|-----------|---------|------------------|
| `ToolResult` interface | Type-safe tool results | Return type of execution |
| `resolveTemplateParams` | Parameter interpolation | Resolve `${step[0].data.*.id}` |
| `hasTemplates` | Check for templates | Detect dependencies |
| `withRetry` | Resilience | Retry failed tool calls |
| `withTimeout` | Timeout protection | Prevent hanging operations |
| `ToolResultSchema` | Runtime validation | Validate tool outputs |
| `getCurrentTimestamp` | Timestamp generation | Track execution time |

---

## Architecture

### System Diagram

```
Plan from Planner
    │
    ▼
┌─────────────────────────────────────┐
│      Executor Agent                 │
│                                     │
│  1. Build Dependency Graph          │
│     ↓ Analyze depends_on            │
│     ↓ Detect cycles                 │
│                                     │
│  2. Find Ready Steps                │
│     ↓ No pending dependencies       │
│                                     │
│  3. Execute Batch (Parallel)        │
│     ↓ Promise.all()                 │
│     ↓ Up to maxParallel             │
│                                     │
│  4. For Each Step:                  │
│     ├─ Resolve Templates            │
│     │  ↓ resolveTemplateParams      │
│     ├─ Call Tool                    │
│     │  ↓ withRetry + withTimeout    │
│     └─ Store Result                 │
│                                     │
│  5. Repeat Until Complete           │
│                                     │
│  ✓ Return All Results               │
└─────────────────────────────────────┘
    │
    ▼
Analyzer Agent
```

### Execution Flow

```typescript
// Input
plan: Plan

// Processing
1. graph ← buildExecutionGraph(plan.steps)
2. validateNoCycles(graph)
3. completed = new Set()
4. results = []

5. while (completed.size < plan.steps.length):
   a. readySteps ← findReadySteps(completed, graph)
   b. batchResults ← executeBatch(readySteps)
   c. results.push(...batchResults)
   d. completed.add(readySteps)

// Output
results: ToolResult[]
```

---

## Implementation

### Core Implementation

```typescript
// src/agents/executor/executor.ts
import {
  Plan,
  PlanStep,
  ToolResult,
  ErrorDetails
} from '../../shared/types/agent.js';
import { MCPTool } from '../../shared/types/tool.js';
import {
  resolveTemplateParams,
  hasTemplates,
  getStepDependencies
} from '../../shared/utils/template.js';
import {
  withRetry,
  withTimeout,
  sleep
} from '../../shared/utils/retry.js';
import {
  validateToolResult
} from '../../shared/validation/schemas.js';
import { getCurrentTimestamp } from '../../shared/utils/date.js';

/**
 * Configuration options for Executor Agent
 */
export interface ExecutorConfig {
  // Execution settings
  maxParallelExecutions: number;  // Max parallel tool calls
  failFast: boolean;              // Stop on first error
  
  // Timeout settings
  toolTimeout: number;            // Timeout per tool (ms)
  totalTimeout: number;           // Total execution timeout (ms)
  
  // Retry settings
  maxRetries: number;             // Retry attempts per tool
  retryDelay: number;             // Base retry delay (ms)
  exponentialBackoff: boolean;    // Use exponential backoff
  
  // Validation settings
  validateResults: boolean;       // Validate tool results
  strictValidation: boolean;      // Fail on validation errors
}

/**
 * Execution metrics
 */
interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  avgDuration: number;
  toolMetrics: Map<string, ToolMetrics>;
}

interface ToolMetrics {
  calls: number;
  failures: number;
  totalDuration: number;
  avgDuration: number;
  retries: number;
}

/**
 * Executor Agent
 * Executes plans with dependency resolution and parallelization
 */
export class ExecutorAgent {
  private config: ExecutorConfig;
  private metrics: ExecutionMetrics;
  private toolRegistry: Map<string, MCPTool>;
  
  constructor(
    toolRegistry: Map<string, MCPTool>,
    config?: Partial<ExecutorConfig>
  ) {
    this.toolRegistry = toolRegistry;
    
    // Default configuration
    this.config = {
      maxParallelExecutions: 5,
      failFast: false,
      toolTimeout: 30000,        // 30 seconds
      totalTimeout: 300000,      // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,          // 1 second
      exponentialBackoff: true,
      validateResults: true,
      strictValidation: false,
      ...config
    };
    
    // Initialize metrics
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      avgDuration: 0,
      toolMetrics: new Map()
    };
  }
  
  /**
   * Execute a plan
   */
  async execute(plan: Plan): Promise<ToolResult[]> {
    console.log(`[Executor] Executing plan with ${plan.steps.length} steps`);
    const startTime = Date.now();
    
    try {
      // Wrap in total timeout
      const results = await withTimeout(
        this.executeInternal(plan),
        this.config.totalTimeout,
        `Plan execution timeout after ${this.config.totalTimeout}ms`
      );
      
      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      const duration = Date.now() - startTime;
      this.metrics.totalDuration += duration;
      this.metrics.avgDuration = this.metrics.totalDuration / this.metrics.totalExecutions;
      
      console.log(`[Executor] Plan executed successfully in ${duration}ms`);
      return results;
      
    } catch (error) {
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      console.error(`[Executor] Plan execution failed:`, error);
      throw error;
    }
  }
  
  /**
   * Internal execution logic
   */
  private async executeInternal(plan: Plan): Promise<ToolResult[]> {
    const results: ToolResult[] = new Array(plan.steps.length);
    const completed = new Set<number>();
    
    // Step 1: Build execution graph
    const graph = this.buildExecutionGraph(plan.steps);
    console.log(`[Executor] Built execution graph`);
    
    // Step 2: Validate no cycles
    this.validateNoCycles(graph);
    
    // Step 3: Execute in topological order
    while (completed.size < plan.steps.length) {
      // Find steps ready to execute
      const readySteps = this.findReadySteps(plan.steps, completed, graph);
      
      if (readySteps.length === 0) {
        throw new Error('Execution deadlock: No steps ready but not all completed');
      }
      
      console.log(`[Executor] Executing ${readySteps.length} steps in parallel`);
      
      // Execute ready steps in parallel
      const batchResults = await this.executeBatch(
        readySteps,
        plan.steps,
        results
      );
      
      // Store results and mark as completed
      for (let i = 0; i < readySteps.length; i++) {
        const stepIndex = readySteps[i]!;
        const result = batchResults[i]!;
        
        results[stepIndex] = result;
        completed.add(stepIndex);
        
        // Check for failure if failFast is enabled
        if (this.config.failFast && !result.success) {
          throw new Error(
            `Step ${stepIndex} (${result.tool}) failed: ${result.error?.message}`
          );
        }
      }
    }
    
    console.log(`[Executor] All ${plan.steps.length} steps completed`);
    return results;
  }
  
  /**
   * Build execution graph from plan steps
   */
  private buildExecutionGraph(steps: PlanStep[]): Map<number, number[]> {
    const graph = new Map<number, number[]>();
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const deps = step.depends_on || [];
      graph.set(i, deps);
    }
    
    return graph;
  }
  
  /**
   * Validate no circular dependencies
   */
  private validateNoCycles(graph: Map<number, number[]>): void {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    const hasCycle = (node: number): boolean => {
      visited.add(node);
      recursionStack.add(node);
      
      const deps = graph.get(node) || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          throw new Error('Circular dependency detected in execution plan');
        }
      }
    }
  }
  
  /**
   * Find steps ready to execute (dependencies satisfied)
   */
  private findReadySteps(
    steps: PlanStep[],
    completed: Set<number>,
    graph: Map<number, number[]>
  ): number[] {
    const ready: number[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      // Skip if already completed
      if (completed.has(i)) continue;
      
      // Check if all dependencies are completed
      const deps = graph.get(i) || [];
      const allDepsComplete = deps.every(dep => completed.has(dep));
      
      if (allDepsComplete) {
        ready.push(i);
        
        // Limit parallel executions
        if (ready.length >= this.config.maxParallelExecutions) {
          break;
        }
      }
    }
    
    return ready;
  }
  
  /**
   * Execute a batch of steps in parallel
   */
  private async executeBatch(
    stepIndices: number[],
    steps: PlanStep[],
    previousResults: ToolResult[]
  ): Promise<ToolResult[]> {
    const promises = stepIndices.map(index =>
      this.executeStep(steps[index]!, index, previousResults)
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Execute a single step
   */
  private async executeStep(
    step: PlanStep,
    index: number,
    previousResults: ToolResult[]
  ): Promise<ToolResult> {
    console.log(`[Executor] Executing step ${index}: ${step.tool}`);
    const startTime = Date.now();
    
    try {
      // Get tool from registry
      const tool = this.toolRegistry.get(step.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${step.tool}`);
      }
      
      // Resolve parameters (may reference previous results)
      const resolvedParams = hasTemplates(step.params)
        ? resolveTemplateParams(step.params, previousResults)
        : step.params;
      
      console.log(`[Executor] Step ${index} params:`, resolvedParams);
      
      // Execute with retry and timeout
      const result = await withRetry(
        async () => {
          return await withTimeout(
            tool.execute(resolvedParams),
            this.config.toolTimeout,
            `Tool ${step.tool} timeout after ${this.config.toolTimeout}ms`
          );
        },
        {
          maxRetries: this.config.maxRetries,
          baseDelay: this.config.retryDelay,
          exponential: this.config.exponentialBackoff,
          onRetry: (attempt, error) => {
            console.log(`[Executor] Step ${index} retry ${attempt}: ${error.message}`);
            this.trackRetry(step.tool);
          }
        }
      );
      
      // Validate result if enabled
      if (this.config.validateResults) {
        try {
          validateToolResult(result);
        } catch (error) {
          if (this.config.strictValidation) {
            throw error;
          }
          console.warn(`[Executor] Step ${index} validation warning:`, error);
        }
      }
      
      // Ensure metadata exists
      if (!result.metadata) {
        result.metadata = {
          executionTime: Date.now() - startTime,
          timestamp: getCurrentTimestamp()
        };
      }
      
      // Track metrics
      this.trackToolExecution(
        step.tool,
        Date.now() - startTime,
        result.success
      );
      
      console.log(`[Executor] Step ${index} completed in ${result.metadata.executionTime}ms`);
      return result;
      
    } catch (error: any) {
      console.error(`[Executor] Step ${index} (${step.tool}) failed:`, error.message);
      
      // Track metrics
      this.trackToolExecution(step.tool, Date.now() - startTime, false);
      
      // Return error result
      return {
        success: false,
        tool: step.tool,
        error: {
          code: 'EXECUTION_FAILED',
          message: error.message,
          details: error
        },
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: getCurrentTimestamp()
        }
      };
    }
  }
  
  /**
   * Track tool execution metrics
   */
  private trackToolExecution(
    toolName: string,
    duration: number,
    success: boolean
  ): void {
    if (!this.metrics.toolMetrics.has(toolName)) {
      this.metrics.toolMetrics.set(toolName, {
        calls: 0,
        failures: 0,
        totalDuration: 0,
        avgDuration: 0,
        retries: 0
      });
    }
    
    const metrics = this.metrics.toolMetrics.get(toolName)!;
    metrics.calls++;
    if (!success) metrics.failures++;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.calls;
  }
  
  /**
   * Track retry
   */
  private trackRetry(toolName: string): void {
    const metrics = this.metrics.toolMetrics.get(toolName);
    if (metrics) {
      metrics.retries++;
    }
  }
  
  /**
   * Get execution metrics
   */
  getMetrics(): ExecutionMetrics {
    return {
      ...this.metrics,
      toolMetrics: new Map(this.metrics.toolMetrics)
    };
  }
  
  /**
   * Get metrics for specific tool
   */
  getToolMetrics(toolName: string): ToolMetrics | undefined {
    return this.metrics.toolMetrics.get(toolName);
  }
  
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      avgDuration: 0,
      toolMetrics: new Map()
    };
  }
}
```

---

## Example Scenarios

### Scenario 1: Sequential Execution with Dependency

**Plan:**
```json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "has_contaminants": true
      }
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "shipment_ids": "${step[0].data.*.id}"
      },
      "depends_on": [0]
    }
  ]
}
```

**Execution Flow:**
```
1. Execute step 0 (shipments)
   ↓ Result: [{ id: "S1" }, { id: "S2" }, { id: "S3" }]

2. Resolve template: "${step[0].data.*.id}" → ["S1", "S2", "S3"]

3. Execute step 1 (contaminants-detected)
   ↓ Params: { shipment_ids: ["S1", "S2", "S3"] }
   ↓ Result: [{ id: "C1", shipment_id: "S1" }, ...]

4. Return both results
```

---

### Scenario 2: Parallel Execution (No Dependencies)

**Plan:**
```json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-01"
      }
    },
    {
      "tool": "facilities",
      "params": {
        "location": "Hannover"
      }
    },
    {
      "tool": "inspections",
      "params": {
        "status": "rejected"
      }
    }
  ]
}
```

**Execution Flow:**
```
1. All 3 steps have no dependencies
   ↓ Execute in parallel with Promise.all()

2. Step 0, 1, 2 run simultaneously
   ↓ Each with its own timeout and retry

3. Wait for all to complete

4. Return all 3 results
```

**Performance:**
- Sequential: ~1500ms (500ms each)
- Parallel: ~500ms (all at once)
- **3x faster!**

---

### Scenario 3: Mixed Execution (Partial Parallelization)

**Plan:**
```json
{
  "steps": [
    {
      "tool": "facilities",
      "params": {
        "location": "Hannover"
      }
    },
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-01"
      }
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "facility_id": "${step[0].data[0].id}"
      },
      "depends_on": [0]
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "shipment_ids": "${step[1].data.*.id}"
      },
      "depends_on": [1]
    }
  ]
}
```

**Execution Flow:**
```
Batch 1 (Parallel):
  ├─ Step 0: facilities
  └─ Step 1: shipments

Wait for Batch 1...

Batch 2 (Parallel):
  ├─ Step 2: contaminants (uses step 0 result)
  └─ Step 3: contaminants (uses step 1 result)

Return all 4 results
```

---

### Scenario 4: Template Resolution Examples

**Example 1: Simple Field Reference**
```typescript
// Template
params: {
  facility_id: "${step[0].data.id}"
}

// Step 0 result
data: { id: "F1", name: "Facility" }

// Resolved
params: {
  facility_id: "F1"
}
```

**Example 2: Array Wildcard**
```typescript
// Template
params: {
  shipment_ids: "${step[0].data.*.id}"
}

// Step 0 result
data: [
  { id: "S1", name: "Shipment 1" },
  { id: "S2", name: "Shipment 2" }
]

// Resolved
params: {
  shipment_ids: ["S1", "S2"]
}
```

**Example 3: Nested Field**
```typescript
// Template
params: {
  facility_id: "${step[0].data[0].facility.id}"
}

// Step 0 result
data: [
  {
    facility: { id: "F1", name: "Facility" }
  }
]

// Resolved
params: {
  facility_id: "F1"
}
```

---

## Configuration

### Environment Variables

```bash
# Executor Configuration
EXECUTOR_MAX_PARALLEL=5              # Max parallel executions
EXECUTOR_FAIL_FAST=false             # Stop on first error
EXECUTOR_TOOL_TIMEOUT=30000          # Tool timeout (30s)
EXECUTOR_TOTAL_TIMEOUT=300000        # Total timeout (5 min)
EXECUTOR_MAX_RETRIES=3               # Retry attempts
EXECUTOR_RETRY_DELAY=1000            # Retry delay (1s)
EXECUTOR_EXPONENTIAL_BACKOFF=true    # Use exponential backoff
EXECUTOR_VALIDATE_RESULTS=true       # Validate tool results
```

### Programmatic Configuration

```typescript
const executor = new ExecutorAgent(toolRegistry, {
  maxParallelExecutions: 5,
  failFast: false,
  toolTimeout: 30000,
  totalTimeout: 300000,
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  validateResults: true,
  strictValidation: false
});
```

---

## Error Handling

### Error Types

1. **Tool Not Found**
   - Tool doesn't exist in registry
   - **Handling**: Fail step with error result

2. **Tool Execution Error**
   - Tool throws exception
   - Network error
   - Invalid parameters
   - **Handling**: Retry with exponential backoff

3. **Timeout Error**
   - Tool exceeds timeout
   - **Handling**: Cancel and retry

4. **Template Resolution Error**
   - Invalid template syntax
   - Referenced step failed
   - Field doesn't exist
   - **Handling**: Fail step with descriptive error

5. **Circular Dependency**
   - Steps depend on each other
   - **Handling**: Fail fast before execution

### Error Handling Pattern

```typescript
try {
  const results = await executor.execute(plan);
  return results;
} catch (error) {
  if (error.message.includes('Circular dependency')) {
    console.error('[Executor] Invalid plan: circular dependencies');
    throw new ExecutionError('Plan contains circular dependencies');
  }
  
  if (error.message.includes('timeout')) {
    console.error('[Executor] Execution timeout');
    throw new TimeoutError('Plan execution exceeded timeout');
  }
  
  if (error.message.includes('Tool not found')) {
    console.error('[Executor] Tool not registered');
    throw new ToolNotFoundError(error.message);
  }
  
  // Generic error
  console.error('[Executor] Execution failed:', error);
  throw new ExecutionError('Plan execution failed', error);
}
```

### Partial Failure Handling

```typescript
// With failFast: false, execution continues
const results = await executor.execute(plan);

// Check for failures
const failures = results.filter(r => !r.success);
if (failures.length > 0) {
  console.warn(`[Executor] ${failures.length} steps failed`);
  
  for (const failure of failures) {
    console.error(`  - ${failure.tool}: ${failure.error?.message}`);
  }
}

// Process successful results
const successes = results.filter(r => r.success);
console.log(`[Executor] ${successes.length} steps succeeded`);
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/tests/agents/executor/executor.test.ts
import { ExecutorAgent } from '../../../agents/executor/executor.js';
import { MCPTool } from '../../../shared/types/tool.js';
import { Plan } from '../../../shared/types/agent.js';

describe('ExecutorAgent', () => {
  let executor: ExecutorAgent;
  let mockTools: Map<string, MCPTool>;
  
  beforeEach(() => {
    mockTools = new Map();
    
    // Mock shipments tool
    mockTools.set('shipments', {
      name: 'shipments',
      description: 'Get shipments',
      schema: { params: {}, returns: { type: 'array', description: 'Shipments' } },
      execute: jest.fn().mockResolvedValue({
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', name: 'Shipment 1' },
          { id: 'S2', name: 'Shipment 2' }
        ],
        metadata: {
          executionTime: 100,
          timestamp: '2025-10-11T12:00:00Z'
        }
      })
    });
    
    // Mock contaminants tool
    mockTools.set('contaminants-detected', {
      name: 'contaminants-detected',
      description: 'Get contaminants',
      schema: { params: {}, returns: { type: 'array', description: 'Contaminants' } },
      execute: jest.fn().mockResolvedValue({
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', shipment_id: 'S1' }
        ],
        metadata: {
          executionTime: 150,
          timestamp: '2025-10-11T12:00:01Z'
        }
      })
    });
    
    executor = new ExecutorAgent(mockTools, {
      maxRetries: 2,
      retryDelay: 10  // Fast retries for tests
    });
  });
  
  describe('execute()', () => {
    it('should execute simple plan', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments',
            params: { limit: 10 }
          }
        ]
      };
      
      const results = await executor.execute(plan);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toHaveLength(2);
      
      const shipmentsTool = mockTools.get('shipments');
      expect(shipmentsTool?.execute).toHaveBeenCalledWith({ limit: 10 });
    });
    
    it('should execute steps with dependencies in order', async () => {
      const executionOrder: string[] = [];
      
      mockTools.get('shipments')!.execute = jest.fn().mockImplementation(async () => {
        executionOrder.push('shipments');
        await sleep(10);
        return {
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1' }],
          metadata: { executionTime: 10, timestamp: '2025-10-11T12:00:00Z' }
        };
      });
      
      mockTools.get('contaminants-detected')!.execute = jest.fn().mockImplementation(async () => {
        executionOrder.push('contaminants');
        return {
          success: true,
          tool: 'contaminants-detected',
          data: [],
          metadata: { executionTime: 10, timestamp: '2025-10-11T12:00:01Z' }
        };
      });
      
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments',
            params: {}
          },
          {
            tool: 'contaminants-detected',
            params: { shipment_ids: '${step[0].data.*.id}' },
            depends_on: [0]
          }
        ]
      };
      
      await executor.execute(plan);
      
      expect(executionOrder).toEqual(['shipments', 'contaminants']);
    });
    
    it('should resolve template parameters', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments',
            params: {}
          },
          {
            tool: 'contaminants-detected',
            params: { shipment_ids: '${step[0].data.*.id}' },
            depends_on: [0]
          }
        ]
      };
      
      await executor.execute(plan);
      
      const contaminantsTool = mockTools.get('contaminants-detected');
      expect(contaminantsTool?.execute).toHaveBeenCalledWith({
        shipment_ids: ['S1', 'S2']
      });
    });
    
    it('should execute independent steps in parallel', async () => {
      const startTimes: number[] = [];
      
      const createDelayedTool = (name: string, delay: number): MCPTool => ({
        name,
        description: 'Test tool',
        schema: { params: {}, returns: { type: 'array', description: 'Test' } },
        execute: jest.fn().mockImplementation(async () => {
          startTimes.push(Date.now());
          await sleep(delay);
          return {
            success: true,
            tool: name,
            data: [],
            metadata: { executionTime: delay, timestamp: '2025-10-11T12:00:00Z' }
          };
        })
      });
      
      mockTools.set('tool1', createDelayedTool('tool1', 100));
      mockTools.set('tool2', createDelayedTool('tool2', 100));
      mockTools.set('tool3', createDelayedTool('tool3', 100));
      
      const plan: Plan = {
        steps: [
          { tool: 'tool1', params: {} },
          { tool: 'tool2', params: {} },
          { tool: 'tool3', params: {} }
        ]
      };
      
      const overallStart = Date.now();
      await executor.execute(plan);
      const overallDuration = Date.now() - overallStart;
      
      // All should start roughly at the same time (parallel)
      const maxStartTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxStartTimeDiff).toBeLessThan(50);  // < 50ms difference
      
      // Overall time should be ~100ms (parallel) not ~300ms (sequential)
      expect(overallDuration).toBeLessThan(200);
    });
    
    it('should retry failed tool calls', async () => {
      let attempts = 0;
      mockTools.get('shipments')!.execute = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return {
          success: true,
          tool: 'shipments',
          data: [],
          metadata: { executionTime: 10, timestamp: '2025-10-11T12:00:00Z' }
        };
      });
      
      const plan: Plan = {
        steps: [{ tool: 'shipments', params: {} }]
      };
      
      const results = await executor.execute(plan);
      
      expect(attempts).toBe(2);  // Failed once, then succeeded
      expect(results[0].success).toBe(true);
    });
    
    it('should handle tool timeout', async () => {
      mockTools.get('shipments')!.execute = jest.fn().mockImplementation(async () => {
        await sleep(100000);  // Very long delay
        return {
          success: true,
          tool: 'shipments',
          data: [],
          metadata: { executionTime: 100000, timestamp: '2025-10-11T12:00:00Z' }
        };
      });
      
      executor = new ExecutorAgent(mockTools, {
        toolTimeout: 100,  // 100ms timeout
        maxRetries: 1
      });
      
      const plan: Plan = {
        steps: [{ tool: 'shipments', params: {} }]
      };
      
      const results = await executor.execute(plan);
      
      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('timeout');
    });
    
    it('should detect circular dependencies', async () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'tool1',
            params: {},
            depends_on: [1]  // Depends on step 1
          },
          {
            tool: 'tool2',
            params: {},
            depends_on: [0]  // Depends on step 0 → circular
          }
        ]
      };
      
      await expect(executor.execute(plan)).rejects.toThrow('Circular dependency');
    });
    
    it('should fail fast when configured', async () => {
      mockTools.get('shipments')!.execute = jest.fn().mockRejectedValue(
        new Error('Tool failed')
      );
      
      executor = new ExecutorAgent(mockTools, {
        failFast: true,
        maxRetries: 1
      });
      
      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: {} },
          { tool: 'contaminants-detected', params: {} }
        ]
      };
      
      await expect(executor.execute(plan)).rejects.toThrow('failed');
      
      // Second tool should not be called
      const contaminantsTool = mockTools.get('contaminants-detected');
      expect(contaminantsTool?.execute).not.toHaveBeenCalled();
    });
  });
  
  describe('metrics', () => {
    it('should track execution metrics', async () => {
      const plan: Plan = {
        steps: [
          { tool: 'shipments', params: {} },
          { tool: 'contaminants-detected', params: {} }
        ]
      };
      
      await executor.execute(plan);
      
      const metrics = executor.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.toolMetrics.size).toBe(2);
      
      const shipmentsMetrics = executor.getToolMetrics('shipments');
      expect(shipmentsMetrics?.calls).toBe(1);
      expect(shipmentsMetrics?.failures).toBe(0);
    });
  });
});
```

---

## Performance Optimization

### 1. Parallel Execution

```typescript
// Execute independent steps simultaneously
const readySteps = this.findReadySteps(completed, graph);
const results = await Promise.all(
  readySteps.map(i => this.executeStep(steps[i]))
);
```

**Benefits:**
- 3-5x faster for independent steps
- Better resource utilization
- Reduced total execution time

### 2. Configurable Parallelism

```typescript
maxParallelExecutions: 5  // Limit concurrent tool calls
```

**Benefits:**
- Prevents overwhelming external APIs
- Controls resource usage
- Balances speed vs stability

### 3. Exponential Backoff

```typescript
retryDelay: 1000,
exponentialBackoff: true  // 1s, 2s, 4s, 8s
```

**Benefits:**
- Gives failing services time to recover
- Reduces retry storm impact
- Higher success rate

### 4. Timeout Protection

```typescript
toolTimeout: 30000,      // Per tool
totalTimeout: 300000     // Overall
```

**Benefits:**
- Prevents hanging executions
- Faster failure detection
- Better resource cleanup

### 5. Result Caching (Future Enhancement)

```typescript
// Cache tool results by params hash
const cacheKey = hashParams(tool, params);
const cached = this.resultCache.get(cacheKey);
if (cached && !isCacheExpired(cached)) {
  return cached.result;
}
```

---

## Next Steps

1. ✅ Review this blueprint
2. ✅ Study shared library components
3. ✅ Implement `ExecutorAgent` class
4. ✅ Write unit tests
5. ✅ Write integration tests
6. ✅ Test with real tools
7. ✅ Optimize based on metrics
8. ✅ Move to Analyzer Agent blueprint

---

## Related Documentation

- [Planner Agent Blueprint](./01-planner-agent.md) - Previous step
- [Analyzer Agent Blueprint](./03-analyzer-agent.md) - Next step
- [Template Resolution](../../src/shared/utils/template.ts)
- [Retry Logic](../../src/shared/utils/retry.ts)

---

**Blueprint Version:** 2.0  
**Last Updated:** October 11, 2025  
**Status:** Ready for Implementation

