# Orchestrator Agent Blueprint

**Coordinates the Entire Agent Pipeline**

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

The Orchestrator Agent is the "project manager" of the Clear AI v2 system. It's the main entry point that coordinates all other agents, manages memory integration, handles error recovery, and ensures the entire pipeline runs smoothly from query to response.

### Key Capabilities

- 🎯 **Pipeline Coordination**: Routes requests through all agents in correct order
- 🧠 **Memory Integration**: Loads context before planning, stores results after completion
- 🔄 **Error Recovery**: Handles failures gracefully with retry logic and fallbacks
- 📊 **Performance Monitoring**: Tracks metrics, timing, and success rates
- 🚦 **Circuit Breaker**: Protects against cascading failures
- 📈 **Progress Tracking**: Provides real-time updates on multi-step operations
- 🔍 **Observability**: Integrates with LangFuse for tracing and debugging

---

## What It Does (Plain English)

Imagine you ask: **"Get me last week's contaminated shipments"**

The Orchestrator Agent:
1. **Receives** your query
2. **Loads Context** - Checks memory for similar past queries
3. **Delegates to Planner** - "Create a plan for this query"
4. **Delegates to Executor** - "Execute this plan"
5. **Delegates to Analyzer** - "Analyze these results"
6. **Delegates to Summarizer** - "Create a human-friendly response"
7. **Stores Results** - Saves everything in memory for future use
8. **Returns Response** - Sends you the final answer

Think of it as a project manager who:
- Assigns tasks to team members (agents)
- Checks past similar projects (memory)
- Handles problems when things go wrong (error recovery)
- Tracks progress and performance (metrics)
- Documents everything for future reference (memory storage)

---

## Responsibilities

### Core Functions

1. **Request Management**
   - Generate unique request IDs
   - Track execution time
   - Manage request lifecycle
   - Provide progress updates

2. **Agent Coordination**
   - Route through Planner → Executor → Analyzer → Summarizer
   - Pass data between agents
   - Handle agent failures
   - Implement retry logic

3. **Memory Integration**
   - Load semantic context (similar queries)
   - Load episodic context (related events)
   - Store episodic events
   - Store semantic embeddings

4. **Error Recovery**
   - Catch and handle errors
   - Implement fallback strategies
   - Provide meaningful error messages
   - Log failures for debugging

5. **Performance Monitoring**
   - Track request counts
   - Calculate success rates
   - Monitor average duration
   - Identify bottlenecks

6. **Observability**
   - Trace request flow
   - Log agent interactions
   - Report metrics to LangFuse
   - Enable debugging

---

## Shared Library Integration

### Imports from Shared Library

```typescript
// Type definitions
import {
  Plan,
  ToolResult,
  Analysis,
  FinalResponse,
  ResponseMetadata
} from '../shared/types/agent.js';

// Memory management
import { MemoryManager } from '../shared/memory/manager.js';

// Context management
import {
  ContextManager,
  ContextConfig
} from '../shared/context/manager.js';

// Response building
import { ResponseBuilder } from '../shared/response/builder.js';

// Progress tracking
import { ProgressTracker } from '../shared/progress/tracker.js';

// Observability
import { LangFuseClient } from '../shared/observability/langfuse.js';

// Utilities
import { withRetry } from '../shared/utils/retry.js';
import { CircuitBreaker } from '../shared/utils/circuit-breaker.js';
import { getCurrentTimestamp } from '../shared/utils/date.js';
import {
  AppError,
  PlannerError,
  ExecutorError,
  AnalyzerError
} from '../shared/utils/errors.js';
```

### Key Shared Components Used

| Component | Purpose | Usage in Orchestrator |
|-----------|---------|----------------------|
| `MemoryManager` | Memory operations | Load/store context |
| `ContextManager` | Conversation state | Maintain dialogue |
| `ResponseBuilder` | Structured responses | Build final output |
| `ProgressTracker` | Progress updates | Track pipeline stages |
| `LangFuseClient` | Observability | Trace requests |
| `CircuitBreaker` | Failure protection | Prevent cascading failures |
| `withRetry` | Resilience | Retry failed operations |
| Error classes | Type-safe errors | Handle specific failures |

---

## Architecture

### System Diagram

```
User Query
    │
    ▼
┌─────────────────────────────────────────────┐
│      Orchestrator Agent                     │
│                                             │
│  1. Initialize Request                      │
│     ├─ Generate request ID                  │
│     ├─ Start progress tracker               │
│     └─ Begin LangFuse trace                 │
│                                             │
│  2. Load Context (Memory)                   │
│     ├─ Semantic search (similar queries)    │
│     ├─ Episodic search (related events)     │
│     └─ Update context manager               │
│                                             │
│  3. Plan (Planner Agent)                    │
│     ├─ withRetry()                          │
│     ├─ Circuit breaker check                │
│     └─ Update progress (20%)                │
│                                             │
│  4. Execute (Executor Agent)                │
│     ├─ withRetry()                          │
│     ├─ Circuit breaker check                │
│     └─ Update progress (50%)                │
│                                             │
│  5. Analyze (Analyzer Agent)                │
│     ├─ withRetry()                          │
│     └─ Update progress (75%)                │
│                                             │
│  6. Summarize (Summarizer Agent)            │
│     ├─ withRetry()                          │
│     └─ Update progress (90%)                │
│                                             │
│  7. Store Results (Memory)                  │
│     ├─ Store episodic event                 │
│     ├─ Store semantic embedding             │
│     └─ Update progress (100%)               │
│                                             │
│  8. Finalize Response                       │
│     ├─ Add metadata                         │
│     ├─ End LangFuse trace                   │
│     └─ Update metrics                       │
│                                             │
│  ✓ Return Final Response                    │
└─────────────────────────────────────────────┘
    │
    ▼
User
```

### Data Flow

```typescript
// Input
query: string

// Processing Steps
1. requestId ← generateId()
2. context ← MemoryManager.loadContext(query)
3. plan ← PlannerAgent.plan(query, context)
4. results ← ExecutorAgent.execute(plan)
5. analysis ← AnalyzerAgent.analyze(results)
6. response ← SummarizerAgent.summarize(query, analysis)
7. MemoryManager.store(requestId, query, plan, results, analysis, response)
8. response.metadata ← { requestId, duration, timestamp }

// Output
response: FinalResponse
```

---

## Implementation

### Core Implementation

```typescript
// src/agents/orchestrator/orchestrator.ts
import {
  Plan,
  ToolResult,
  Analysis,
  FinalResponse
} from '../../shared/types/agent.js';
import { MemoryManager } from '../../shared/memory/manager.js';
import { ContextManager } from '../../shared/context/manager.js';
import { ResponseBuilder } from '../../shared/response/builder.js';
import { ProgressTracker } from '../../shared/progress/tracker.js';
import { LangFuseClient } from '../../shared/observability/langfuse.js';
import { withRetry } from '../../shared/utils/retry.js';
import { CircuitBreaker } from '../../shared/utils/circuit-breaker.js';
import { getCurrentTimestamp } from '../../shared/utils/date.js';
import {
  AppError,
  PlannerError,
  ExecutorError,
  AnalyzerError,
  SummarizerError
} from '../../shared/utils/errors.js';

// Agent imports
import { PlannerAgent } from '../planner/planner.js';
import { ExecutorAgent } from '../executor/executor.js';
import { AnalyzerAgent } from '../analyzer/analyzer.js';
import { SummarizerAgent } from '../summarizer/summarizer.js';

/**
 * Configuration options for Orchestrator Agent
 */
export interface OrchestratorConfig {
  // Memory settings
  enableMemory: boolean;
  enableContextLoading: boolean;
  maxContextItems: number;
  
  // Retry settings
  maxRetries: number;
  retryDelay: number;
  
  // Timeout settings
  requestTimeout: number;
  plannerTimeout: number;
  executorTimeout: number;
  analyzerTimeout: number;
  summarizerTimeout: number;
  
  // Feature flags
  enableProgressTracking: boolean;
  enableObservability: boolean;
  enableCircuitBreaker: boolean;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableRequestLogging: boolean;
}

/**
 * Request context
 */
interface RequestContext {
  requestId: string;
  query: string;
  startTime: number;
  progressTracker?: ProgressTracker;
  traceId?: string;
}

/**
 * Metrics tracking
 */
interface OrchestratorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  avgDuration: number;
  agentMetrics: {
    planner: { calls: number; failures: number; avgDuration: number };
    executor: { calls: number; failures: number; avgDuration: number };
    analyzer: { calls: number; failures: number; avgDuration: number };
    summarizer: { calls: number; failures: number; avgDuration: number };
  };
}

/**
 * Orchestrator Agent
 * Coordinates the entire agent pipeline
 */
export class OrchestratorAgent {
  private config: OrchestratorConfig;
  private metrics: OrchestratorMetrics;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  constructor(
    private planner: PlannerAgent,
    private executor: ExecutorAgent,
    private analyzer: AnalyzerAgent,
    private summarizer: SummarizerAgent,
    private memoryManager: MemoryManager,
    private contextManager: ContextManager,
    private langfuse?: LangFuseClient,
    config?: Partial<OrchestratorConfig>
  ) {
    // Default configuration
    this.config = {
      enableMemory: true,
      enableContextLoading: true,
      maxContextItems: 5,
      maxRetries: 3,
      retryDelay: 1000,
      requestTimeout: 60000,      // 1 minute
      plannerTimeout: 10000,      // 10 seconds
      executorTimeout: 30000,     // 30 seconds
      analyzerTimeout: 10000,     // 10 seconds
      summarizerTimeout: 10000,   // 10 seconds
      enableProgressTracking: true,
      enableObservability: true,
      enableCircuitBreaker: true,
      logLevel: 'info',
      enableRequestLogging: true,
      ...config
    };
    
    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      avgDuration: 0,
      agentMetrics: {
        planner: { calls: 0, failures: 0, avgDuration: 0 },
        executor: { calls: 0, failures: 0, avgDuration: 0 },
        analyzer: { calls: 0, failures: 0, avgDuration: 0 },
        summarizer: { calls: 0, failures: 0, avgDuration: 0 }
      }
    };
    
    // Initialize circuit breakers
    this.circuitBreakers = new Map();
    if (this.config.enableCircuitBreaker) {
      this.initializeCircuitBreakers();
    }
  }
  
  /**
   * Handle user query (main entry point)
   */
  async handleQuery(query: string): Promise<FinalResponse> {
    const ctx = this.initializeRequest(query);
    
    this.log('info', `[${ctx.requestId}] Processing query: "${query}"`);
    
    try {
      // Start trace if observability enabled
      if (this.config.enableObservability && this.langfuse) {
        ctx.traceId = await this.langfuse.startTrace({
          name: 'orchestrator-query',
          input: { query },
          metadata: { requestId: ctx.requestId }
        });
      }
      
      // Execute pipeline with timeout
      const response = await this.executeWithTimeout(
        () => this.executePipeline(ctx),
        this.config.requestTimeout,
        `Request timeout after ${this.config.requestTimeout}ms`
      );
      
      // Update success metrics
      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      const duration = Date.now() - ctx.startTime;
      this.metrics.totalDuration += duration;
      this.metrics.avgDuration = this.metrics.totalDuration / this.metrics.totalRequests;
      
      // Complete progress
      if (ctx.progressTracker) {
        ctx.progressTracker.complete();
      }
      
      // End trace
      if (ctx.traceId && this.langfuse) {
        await this.langfuse.endTrace(ctx.traceId, {
          output: response,
          metadata: { duration }
        });
      }
      
      this.log('info', `[${ctx.requestId}] Complete in ${duration}ms`);
      
      return response;
      
    } catch (error: any) {
      // Update failure metrics
      this.metrics.totalRequests++;
      this.metrics.failedRequests++;
      
      this.log('error', `[${ctx.requestId}] Error: ${error.message}`);
      
      // Store error in memory
      if (this.config.enableMemory) {
        await this.storeError(ctx, error);
      }
      
      // End trace with error
      if (ctx.traceId && this.langfuse) {
        await this.langfuse.endTrace(ctx.traceId, {
          output: null,
          error: error.message
        });
      }
      
      // Return error response
      return this.createErrorResponse(ctx, error);
    }
  }
  
  /**
   * Initialize request context
   */
  private initializeRequest(query: string): RequestContext {
    const ctx: RequestContext = {
      requestId: crypto.randomUUID(),
      query,
      startTime: Date.now()
    };
    
    // Initialize progress tracker
    if (this.config.enableProgressTracking) {
      ctx.progressTracker = new ProgressTracker(6);  // 6 major steps
      ctx.progressTracker.setStepName('Initializing');
    }
    
    return ctx;
  }
  
  /**
   * Execute the agent pipeline
   */
  private async executePipeline(ctx: RequestContext): Promise<FinalResponse> {
    // Step 1: Load Context
    let context = {};
    if (this.config.enableMemory && this.config.enableContextLoading) {
      ctx.progressTracker?.setStepName('Loading context');
      context = await this.loadContext(ctx);
      ctx.progressTracker?.increment();
    }
    
    // Step 2: Plan
    ctx.progressTracker?.setStepName('Planning');
    const plan = await this.callPlanner(ctx, context);
    ctx.progressTracker?.increment();
    
    // Step 3: Execute
    ctx.progressTracker?.setStepName('Executing tools');
    const results = await this.callExecutor(ctx, plan);
    ctx.progressTracker?.increment();
    
    // Step 4: Analyze
    ctx.progressTracker?.setStepName('Analyzing results');
    const analysis = await this.callAnalyzer(ctx, results);
    ctx.progressTracker?.increment();
    
    // Step 5: Summarize
    ctx.progressTracker?.setStepName('Generating response');
    const toolsUsed = results.map(r => r.tool);
    const response = await this.callSummarizer(ctx, analysis, toolsUsed);
    ctx.progressTracker?.increment();
    
    // Step 6: Store in Memory
    if (this.config.enableMemory) {
      ctx.progressTracker?.setStepName('Storing results');
      await this.storeInMemory(ctx, plan, results, analysis, response);
      ctx.progressTracker?.increment();
    }
    
    // Add metadata
    response.metadata = {
      request_id: ctx.requestId,
      total_duration_ms: Date.now() - ctx.startTime,
      timestamp: getCurrentTimestamp()
    };
    
    return response;
  }
  
  /**
   * Load context from memory
   */
  private async loadContext(ctx: RequestContext): Promise<any> {
    try {
      // Load semantic context (similar queries)
      const semanticContext = await this.memoryManager.querySemantic(
        ctx.query,
        this.config.maxContextItems
      );
      
      // Load episodic context (related events)
      const episodicContext = await this.memoryManager.queryEpisodic({
        query: ctx.query,
        limit: this.config.maxContextItems
      });
      
      this.log('debug', `[${ctx.requestId}] Loaded ${semanticContext.length} semantic, ${episodicContext.length} episodic contexts`);
      
      return {
        semantic: semanticContext,
        episodic: episodicContext
      };
      
    } catch (error) {
      this.log('warn', `[${ctx.requestId}] Failed to load context: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Call Planner Agent with retry and circuit breaker
   */
  private async callPlanner(ctx: RequestContext, context: any): Promise<Plan> {
    const startTime = Date.now();
    
    try {
      const plan = await this.executeWithCircuitBreaker(
        'planner',
        () => withRetry(
          () => this.planner.plan(ctx.query, context),
          {
            maxRetries: this.config.maxRetries,
            baseDelay: this.config.retryDelay,
            onRetry: (attempt, error) => {
              this.log('warn', `[${ctx.requestId}] Planner retry ${attempt}: ${error.message}`);
            }
          }
        )
      );
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateAgentMetrics('planner', duration, true);
      
      this.log('debug', `[${ctx.requestId}] Plan generated with ${plan.steps.length} steps`);
      
      return plan;
      
    } catch (error: any) {
      this.updateAgentMetrics('planner', Date.now() - startTime, false);
      throw new PlannerError(`Planning failed: ${error.message}`, error);
    }
  }
  
  /**
   * Call Executor Agent
   */
  private async callExecutor(ctx: RequestContext, plan: Plan): Promise<ToolResult[]> {
    const startTime = Date.now();
    
    try {
      const results = await this.executeWithCircuitBreaker(
        'executor',
        () => withRetry(
          () => this.executor.execute(plan),
          {
            maxRetries: this.config.maxRetries,
            baseDelay: this.config.retryDelay,
            onRetry: (attempt, error) => {
              this.log('warn', `[${ctx.requestId}] Executor retry ${attempt}: ${error.message}`);
            }
          }
        )
      );
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateAgentMetrics('executor', duration, true);
      
      const successCount = results.filter(r => r.success).length;
      this.log('debug', `[${ctx.requestId}] Executed ${results.length} steps (${successCount} successful)`);
      
      return results;
      
    } catch (error: any) {
      this.updateAgentMetrics('executor', Date.now() - startTime, false);
      throw new ExecutorError(`Execution failed: ${error.message}`, error);
    }
  }
  
  /**
   * Call Analyzer Agent
   */
  private async callAnalyzer(ctx: RequestContext, results: ToolResult[]): Promise<Analysis> {
    const startTime = Date.now();
    
    try {
      const analysis = await withRetry(
        () => this.analyzer.analyze(results),
        {
          maxRetries: this.config.maxRetries,
          baseDelay: this.config.retryDelay,
          onRetry: (attempt, error) => {
            this.log('warn', `[${ctx.requestId}] Analyzer retry ${attempt}: ${error.message}`);
          }
        }
      );
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateAgentMetrics('analyzer', duration, true);
      
      this.log('debug', `[${ctx.requestId}] Analysis: ${analysis.insights.length} insights, ${analysis.anomalies.length} anomalies`);
      
      return analysis;
      
    } catch (error: any) {
      this.updateAgentMetrics('analyzer', Date.now() - startTime, false);
      throw new AnalyzerError(`Analysis failed: ${error.message}`, error);
    }
  }
  
  /**
   * Call Summarizer Agent
   */
  private async callSummarizer(
    ctx: RequestContext,
    analysis: Analysis,
    toolsUsed: string[]
  ): Promise<FinalResponse> {
    const startTime = Date.now();
    
    try {
      const response = await withRetry(
        () => this.summarizer.summarize(ctx.query, analysis, toolsUsed),
        {
          maxRetries: this.config.maxRetries,
          baseDelay: this.config.retryDelay,
          onRetry: (attempt, error) => {
            this.log('warn', `[${ctx.requestId}] Summarizer retry ${attempt}: ${error.message}`);
          }
        }
      );
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateAgentMetrics('summarizer', duration, true);
      
      this.log('debug', `[${ctx.requestId}] Summary generated`);
      
      return response;
      
    } catch (error: any) {
      this.updateAgentMetrics('summarizer', Date.now() - startTime, false);
      throw new SummarizerError(`Summarization failed: ${error.message}`, error);
    }
  }
  
  /**
   * Store results in memory
   */
  private async storeInMemory(
    ctx: RequestContext,
    plan: Plan,
    results: ToolResult[],
    analysis: Analysis,
    response: FinalResponse
  ): Promise<void> {
    try {
      // Store episodic event
      await this.memoryManager.storeEpisodic({
        id: ctx.requestId,
        type: 'request',
        timestamp: getCurrentTimestamp(),
        data: {
          query: ctx.query,
          plan,
          results: results.map(r => ({ tool: r.tool, success: r.success })),
          insights: analysis.insights.length,
          anomalies: analysis.anomalies.length
        }
      });
      
      // Store semantic embedding
      await this.memoryManager.storeSemantic(
        response.message,
        {
          type: 'summary',
          requestId: ctx.requestId,
          query: ctx.query,
          toolsUsed: response.tools_used,
          timestamp: getCurrentTimestamp()
        }
      );
      
      this.log('debug', `[${ctx.requestId}] Stored in memory`);
      
    } catch (error: any) {
      this.log('warn', `[${ctx.requestId}] Failed to store in memory: ${error.message}`);
      // Don't fail the request if memory storage fails
    }
  }
  
  /**
   * Store error in memory
   */
  private async storeError(ctx: RequestContext, error: Error): Promise<void> {
    try {
      await this.memoryManager.storeEpisodic({
        id: `${ctx.requestId}-error`,
        type: 'error',
        timestamp: getCurrentTimestamp(),
        data: {
          query: ctx.query,
          error: {
            message: error.message,
            type: error.constructor.name
          }
        }
      });
    } catch (e) {
      this.log('warn', `[${ctx.requestId}] Failed to store error: ${e.message}`);
    }
  }
  
  /**
   * Create error response
   */
  private createErrorResponse(ctx: RequestContext, error: Error): FinalResponse {
    let message = `I encountered an error processing your request`;
    
    if (error instanceof PlannerError) {
      message += `: I couldn't create a plan for your query. Please try rephrasing it.`;
    } else if (error instanceof ExecutorError) {
      message += `: I had trouble getting the data. Please try again.`;
    } else if (error instanceof AnalyzerError) {
      message += `: I couldn't analyze the results properly.`;
    } else if (error instanceof SummarizerError) {
      message += `: I couldn't generate a summary.`;
    } else {
      message += `: ${error.message}`;
    }
    
    return {
      message,
      tools_used: [],
      metadata: {
        request_id: ctx.requestId,
        total_duration_ms: Date.now() - ctx.startTime,
        timestamp: getCurrentTimestamp(),
        error: true
      }
    };
  }
  
  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }
  
  /**
   * Execute with circuit breaker
   */
  private async executeWithCircuitBreaker<T>(
    service: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enableCircuitBreaker) {
      return operation();
    }
    
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) {
      return operation();
    }
    
    return breaker.execute(operation);
  }
  
  /**
   * Initialize circuit breakers for each service
   */
  private initializeCircuitBreakers(): void {
    const services = ['planner', 'executor', 'analyzer', 'summarizer'];
    
    for (const service of services) {
      this.circuitBreakers.set(service, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,  // 1 minute
        onStateChange: (state) => {
          this.log('warn', `Circuit breaker for ${service}: ${state}`);
        }
      }));
    }
  }
  
  /**
   * Update agent metrics
   */
  private updateAgentMetrics(
    agent: 'planner' | 'executor' | 'analyzer' | 'summarizer',
    duration: number,
    success: boolean
  ): void {
    const metrics = this.metrics.agentMetrics[agent];
    metrics.calls++;
    if (!success) metrics.failures++;
    
    const totalDuration = (metrics.avgDuration * (metrics.calls - 1)) + duration;
    metrics.avgDuration = totalDuration / metrics.calls;
  }
  
  /**
   * Log with configured level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];
    
    if (messageLevel >= configLevel) {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }
  
  /**
   * Get metrics
   */
  getMetrics(): OrchestratorMetrics {
    return {
      ...this.metrics,
      agentMetrics: { ...this.metrics.agentMetrics }
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      avgDuration: 0,
      agentMetrics: {
        planner: { calls: 0, failures: 0, avgDuration: 0 },
        executor: { calls: 0, failures: 0, avgDuration: 0 },
        analyzer: { calls: 0, failures: 0, avgDuration: 0 },
        summarizer: { calls: 0, failures: 0, avgDuration: 0 }
      }
    };
  }
}
```

---

## Example Scenarios

### Scenario 1: Successful End-to-End Request

**User Query:** "Get me last week's contaminated shipments"

**Execution Timeline:**
```
0ms     - Request received (ID: abc-123)
10ms    - Context loaded (3 semantic, 2 episodic)
150ms   - Plan generated (2 steps)
800ms   - Plan executed (2 tools, both successful)
920ms   - Analysis complete (3 insights, 1 anomaly)
1100ms  - Summary generated
1150ms  - Results stored in memory
1150ms  - Response returned

Total: 1.15 seconds
```

**Final Response:**
```typescript
{
  message: "I found 12 contaminated shipments from last week...",
  tools_used: ["shipments", "contaminants-detected"],
  data: {...},
  analysis: {...},
  metadata: {
    request_id: "abc-123",
    total_duration_ms: 1150,
    timestamp: "2025-10-11T12:00:01.150Z"
  }
}
```

---

### Scenario 2: Planner Failure with Retry

**Execution:**
```
0ms     - Request received
10ms    - Context loaded
150ms   - Planner call #1 → LLM timeout
1150ms  - Planner retry #1 → LLM failure
2150ms  - Planner retry #2 → Success
2300ms  - Continue with execution...
```

**Outcome:** Request succeeds after 2 retries

---

### Scenario 3: Circuit Breaker Opens

**Execution:**
```
Request 1: Executor fails
Request 2: Executor fails
Request 3: Executor fails
Request 4: Executor fails
Request 5: Executor fails
→ Circuit breaker OPEN

Request 6: Immediately fails (circuit open)
  Response: "Service temporarily unavailable"

[Wait 60 seconds]

Request 7: Circuit HALF-OPEN, trying...
  → Success!
  → Circuit CLOSED
```

**Benefit:** Prevents cascading failures, gives failing service time to recover

---

### Scenario 4: Partial Failure Handling

**Execution:**
```
Plan with 3 tool calls:
  Step 1: shipments → Success
  Step 2: contaminants → Failure (API down)
  Step 3: facilities → Success

Analyzer receives:
  - 2 successful results
  - 1 failed result

Analyzer proceeds with available data

Summarizer creates response:
  "I found shipments data, but couldn't get contaminant details.
   Here's what I found from shipments..."
```

**Outcome:** Partial success is still useful

---

## Configuration

### Environment Variables

```bash
# Orchestrator Configuration
ENABLE_MEMORY=true
ENABLE_CONTEXT_LOADING=true
MAX_CONTEXT_ITEMS=5

ORCHESTRATOR_MAX_RETRIES=3
ORCHESTRATOR_RETRY_DELAY=1000

ORCHESTRATOR_REQUEST_TIMEOUT=60000
ORCHESTRATOR_PLANNER_TIMEOUT=10000
ORCHESTRATOR_EXECUTOR_TIMEOUT=30000
ORCHESTRATOR_ANALYZER_TIMEOUT=10000
ORCHESTRATOR_SUMMARIZER_TIMEOUT=10000

ENABLE_PROGRESS_TRACKING=true
ENABLE_OBSERVABILITY=true
ENABLE_CIRCUIT_BREAKER=true

LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### Programmatic Configuration

```typescript
const orchestrator = new OrchestratorAgent(
  planner,
  executor,
  analyzer,
  summarizer,
  memoryManager,
  contextManager,
  langfuse,
  {
    enableMemory: true,
    enableContextLoading: true,
    maxContextItems: 5,
    maxRetries: 3,
    retryDelay: 1000,
    requestTimeout: 60000,
    enableProgressTracking: true,
    enableObservability: true,
    enableCircuitBreaker: true,
    logLevel: 'info'
  }
);
```

---

## Error Handling

### Error Types

1. **Planning Errors** (`PlannerError`)
   - Invalid query
   - LLM failure
   - **Handling**: Retry 3x, then ask user for clarification

2. **Execution Errors** (`ExecutorError`)
   - Tool failure
   - Network error
   - **Handling**: Retry 3x, proceed with partial results

3. **Analysis Errors** (`AnalyzerError`)
   - Invalid data format
   - **Handling**: Return raw results without analysis

4. **Summarization Errors** (`SummarizerError`)
   - LLM failure
   - **Handling**: Use template-based summary

5. **Memory Errors**
   - Database connection failure
   - **Handling**: Continue without memory (logged as warning)

6. **Timeout Errors**
   - Request exceeds timeout
   - **Handling**: Cancel and return timeout error

### Error Handling Pattern

```typescript
try {
  const response = await orchestrator.handleQuery(query);
  return response;
} catch (error) {
  if (error instanceof PlannerError) {
    console.error('Planning failed. Please rephrase your query.');
  } else if (error instanceof ExecutorError) {
    console.error('Execution failed. Please try again later.');
  } else if (error.message.includes('timeout')) {
    console.error('Request timeout. Query too complex or system overloaded.');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/tests/agents/orchestrator/orchestrator.test.ts
import { OrchestratorAgent } from '../../../agents/orchestrator/orchestrator.js';

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;
  let mockPlanner: any;
  let mockExecutor: any;
  let mockAnalyzer: any;
  let mockSummarizer: any;
  let mockMemory: any;
  let mockContext: any;
  
  beforeEach(() => {
    mockPlanner = { plan: jest.fn() };
    mockExecutor = { execute: jest.fn() };
    mockAnalyzer = { analyze: jest.fn() };
    mockSummarizer = { summarize: jest.fn() };
    mockMemory = {
      querySemantic: jest.fn().mockResolvedValue([]),
      queryEpisodic: jest.fn().mockResolvedValue([]),
      storeEpisodic: jest.fn().mockResolvedValue(undefined),
      storeSemantic: jest.fn().mockResolvedValue(undefined)
    };
    mockContext = {
      getMessages: jest.fn().mockReturnValue([]),
      addMessage: jest.fn()
    };
    
    orchestrator = new OrchestratorAgent(
      mockPlanner,
      mockExecutor,
      mockAnalyzer,
      mockSummarizer,
      mockMemory,
      mockContext
    );
  });
  
  it('should process query end-to-end', async () => {
    mockPlanner.plan.mockResolvedValue({ steps: [] });
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: 'Test',
      insights: [],
      entities: [],
      anomalies: [],
      metadata: { tool_results_count: 0, analysis_time_ms: 10 }
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: 'Test response',
      tools_used: [],
      metadata: {}
    });
    
    const response = await orchestrator.handleQuery('test query');
    
    expect(response.message).toBe('Test response');
    expect(response.metadata.request_id).toBeDefined();
    expect(mockPlanner.plan).toHaveBeenCalled();
    expect(mockExecutor.execute).toHaveBeenCalled();
    expect(mockAnalyzer.analyze).toHaveBeenCalled();
    expect(mockSummarizer.summarize).toHaveBeenCalled();
  });
  
  it('should load context when enabled', async () => {
    // ... (setup mocks)
    
    await orchestrator.handleQuery('test query');
    
    expect(mockMemory.querySemantic).toHaveBeenCalled();
    expect(mockMemory.queryEpisodic).toHaveBeenCalled();
  });
  
  it('should store results in memory', async () => {
    // ... (setup mocks)
    
    await orchestrator.handleQuery('test query');
    
    expect(mockMemory.storeEpisodic).toHaveBeenCalled();
    expect(mockMemory.storeSemantic).toHaveBeenCalled();
  });
  
  it('should handle planner failure with retry', async () => {
    let attempts = 0;
    mockPlanner.plan.mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error('Planner failed');
      return { steps: [] };
    });
    
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: '', insights: [], entities: [], anomalies: [],
      metadata: { tool_results_count: 0, analysis_time_ms: 0 }
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: 'Success', tools_used: [], metadata: {}
    });
    
    const response = await orchestrator.handleQuery('test');
    
    expect(attempts).toBe(2);
    expect(response.message).toBe('Success');
  });
  
  it('should handle errors gracefully', async () => {
    mockPlanner.plan.mockRejectedValue(new Error('Planning failed'));
    
    const response = await orchestrator.handleQuery('test');
    
    expect(response.message).toContain('error');
    expect(response.metadata.error).toBe(true);
  });
  
  it('should not fail if memory storage fails', async () => {
    mockPlanner.plan.mockResolvedValue({ steps: [] });
    mockExecutor.execute.mockResolvedValue([]);
    mockAnalyzer.analyze.mockResolvedValue({
      summary: '', insights: [], entities: [], anomalies: [],
      metadata: { tool_results_count: 0, analysis_time_ms: 0 }
    });
    mockSummarizer.summarize.mockResolvedValue({
      message: 'test', tools_used: [], metadata: {}
    });
    mockMemory.storeEpisodic.mockRejectedValue(new Error('Storage failed'));
    
    const response = await orchestrator.handleQuery('test');
    
    expect(response.message).toBe('test');
    expect(response.metadata.error).toBeUndefined();
  });
});
```

---

## Performance Optimization

### 1. Parallel Context Loading

```typescript
const [semantic, episodic] = await Promise.all([
  this.memoryManager.querySemantic(query, 5),
  this.memoryManager.queryEpisodic({ query, limit: 5 })
]);
```

**Benefits:** 2x faster context loading

### 2. Circuit Breaker Pattern

```typescript
// Prevents cascading failures
circuitBreaker: {
  failureThreshold: 5,
  timeout: 60000
}
```

**Benefits:**
- Fails fast when service is down
- Gives service time to recover
- Prevents wasting resources on doomed requests

### 3. Timeout Configuration

```typescript
plannerTimeout: 10000,      // Quick planning
executorTimeout: 30000,     // Allow time for tools
requestTimeout: 60000       // Overall limit
```

**Benefits:**
- Prevents hanging requests
- Better resource utilization
- Faster error detection

### 4. Metrics Tracking

```typescript
const metrics = orchestrator.getMetrics();
console.log(`Success rate: ${metrics.successfulRequests / metrics.totalRequests}`);
console.log(`Avg duration: ${metrics.avgDuration}ms`);
```

**Benefits:**
- Identify bottlenecks
- Monitor performance degradation
- Data-driven optimization

### 5. Memory Storage (Non-Blocking)

```typescript
// Don't wait for memory storage
await this.storeInMemory(...).catch(err => {
  console.warn('Memory storage failed:', err);
  // Continue anyway
});
```

**Benefits:**
- Faster responses
- Memory failures don't affect UX
- System remains responsive

---

## Next Steps

1. ✅ Review this blueprint
2. ✅ Study shared library components
3. ✅ Implement `OrchestratorAgent` class
4. ✅ Write unit tests
5. ✅ Write integration tests
6. ✅ Test with all agents integrated
7. ✅ Monitor metrics in production
8. ✅ Optimize based on bottlenecks

---

## Related Documentation

- [Planner Agent Blueprint](./01-planner-agent.md)
- [Executor Agent Blueprint](./02-executor-agent.md)
- [Analyzer Agent Blueprint](./03-analyzer-agent.md)
- [Memory Manager](../../src/shared/memory/manager.ts)
- [Circuit Breaker](../../src/shared/utils/circuit-breaker.ts)
- [Progress Tracker](../../src/shared/progress/tracker.ts)

---

**Blueprint Version:** 2.0  
**Last Updated:** October 11, 2025  
**Status:** Ready for Implementation  
**Next:** Begin implementation with Planner Agent

