# Planner Agent Blueprint

**Converts Natural Language Queries into Structured Execution Plans**

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

The Planner Agent is the "strategist" of the Clear AI v2 system. It receives natural language queries like "Get me last week's contaminated shipments" and converts them into structured, executable plans that the Executor Agent can run.

### Key Capabilities

- 🧠 **Query Understanding**: Detects user intent and extracts key information
- 📅 **Temporal Parsing**: Converts "last week" into actual date ranges
- 🛠️ **Tool Selection**: Chooses the right tools based on the query
- 🔗 **Dependency Management**: Determines which steps depend on others
- ✅ **Plan Validation**: Ensures plans are valid before execution
- ⚡ **Performance**: Caches successful plans for faster responses

---

## What It Does (Plain English)

Imagine you're managing a waste management system and you ask: **"Show me the contaminated shipments from last week that were rejected."**

The Planner Agent:
1. **Understands** what you're asking for (contaminated shipments with specific filters)
2. **Figures out** what data it needs (shipments from Oct 4-11 with contaminants)
3. **Creates a plan** with specific steps:
   - Call the `shipments` tool with date range and contamination filter
   - Get the list of shipments
4. **Validates** the plan to make sure it's doable
5. **Passes it on** to the Executor Agent to actually run

Think of it as a project manager who breaks down your request into actionable steps.

---

## Responsibilities

### Core Functions

1. **Query Analysis**
   - Parse natural language input
   - Classify user intent (query, question, clarification, etc.)
   - Extract entities (facilities, dates, status values)
   - Identify temporal references

2. **Plan Generation**
   - Select appropriate MCP tools
   - Determine tool parameters
   - Resolve temporal references to ISO dates
   - Set up dependencies between steps
   - Optimize for parallel execution where possible

3. **Plan Validation**
   - Validate against Zod schema
   - Check tool availability
   - Verify parameter types
   - Ensure dependencies are acyclic

4. **Plan Optimization**
   - Cache successful plans
   - Identify opportunities for parallelization
   - Estimate execution duration

---

## Shared Library Integration

### Imports from Shared Library

```typescript
// Type definitions
import {
  Plan,
  PlanStep,
  PlanMetadata
} from '../shared/types/agent.js';

// LLM provider with automatic fallback
import { LLMProvider } from '../shared/llm/provider.js';
import { LLMRequest } from '../shared/types/llm.js';

// Validation schemas
import {
  PlanSchema,
  validatePlan
} from '../shared/validation/schemas.js';

// Utilities
import { parseTemporalReference, getCurrentTimestamp } from '../shared/utils/date.js';
import { withRetry } from '../shared/utils/retry.js';

// Intent classification
import {
  IntentClassifier,
  UserIntent,
  IntentResult
} from '../shared/intent/classifier.js';

// Context management
import { ContextManager } from '../shared/context/manager.js';
```

### Key Shared Components Used

| Component | Purpose | Usage in Planner |
|-----------|---------|------------------|
| `Plan` interface | Type-safe plan structure | Return type of `plan()` method |
| `LLMProvider` | Multi-provider LLM with fallback | Generate plans from queries |
| `PlanSchema` | Runtime validation | Validate LLM output |
| `IntentClassifier` | Understand user intent | Classify query type |
| `parseTemporalReference` | Date parsing | Convert "last week" → dates |
| `withRetry` | Resilience | Retry failed LLM calls |
| `ContextManager` | Conversation state | Maintain context across queries |

---

## Architecture

### System Diagram

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│      Planner Agent                  │
│                                     │
│  1. Intent Classification           │
│     ↓ IntentClassifier              │
│                                     │
│  2. Query Analysis                  │
│     ↓ Extract entities/dates        │
│     ↓ parseTemporalReference        │
│                                     │
│  3. Plan Generation                 │
│     ↓ LLM with prompt               │
│     ↓ (with retry logic)            │
│                                     │
│  4. Plan Validation                 │
│     ↓ PlanSchema.parse()            │
│     ↓ Check tool availability       │
│                                     │
│  5. Plan Optimization               │
│     ↓ Cache check/store             │
│                                     │
│  ✓ Return Plan                      │
└─────────────────────────────────────┘
    │
    ▼
Executor Agent
```

### Data Flow

```typescript
// Input
query: string
context?: ConversationContext

// Processing Steps
1. IntentResult ← IntentClassifier.classify(query)
2. entities ← extractEntities(query)
3. dateRange ← parseTemporalReference(query)
4. planJson ← LLMProvider.generate(prompt)
5. plan ← PlanSchema.parse(planJson)
6. validateToolsAvailable(plan)

// Output
plan: Plan
```

---

## Implementation

### Core Implementation

```typescript
// src/agents/planner/planner.ts
import {
  Plan,
  PlanStep,
  PlanMetadata
} from '../../shared/types/agent.js';
import { LLMProvider } from '../../shared/llm/provider.js';
import { PlanSchema, validatePlan } from '../../shared/validation/schemas.js';
import { parseTemporalReference, getCurrentTimestamp } from '../../shared/utils/date.js';
import { withRetry } from '../../shared/utils/retry.js';
import { IntentClassifier } from '../../shared/intent/classifier.js';
import { ContextManager } from '../../shared/context/manager.js';

/**
 * Configuration options for Planner Agent
 */
export interface PlannerConfig {
  // LLM settings
  temperature: number;          // Low (0.1) for deterministic planning
  maxTokens: number;            // Max tokens for LLM response
  maxRetries: number;           // Retry attempts for LLM calls
  
  // Validation settings
  validateToolAvailability: boolean;  // Check if tools exist
  strictValidation: boolean;          // Fail on any validation error
  
  // Performance settings
  enableCaching: boolean;       // Cache successful plans
  cacheMaxSize: number;         // Max cached plans
  cacheTTL: number;             // Cache time-to-live in ms
  
  // Tool settings
  availableTools: Map<string, ToolInfo>;  // Available MCP tools
}

/**
 * Tool information for validation
 */
interface ToolInfo {
  name: string;
  description: string;
  params: string[];
  requiredParams: string[];
}

/**
 * Planner Agent
 * Converts natural language queries into structured execution plans
 */
export class PlannerAgent {
  private config: PlannerConfig;
  private intentClassifier: IntentClassifier;
  private planCache: Map<string, { plan: Plan; timestamp: number }>;
  
  constructor(
    private llmProvider: LLMProvider,
    private contextManager: ContextManager,
    config?: Partial<PlannerConfig>
  ) {
    // Default configuration
    this.config = {
      temperature: 0.1,           // Deterministic for planning
      maxTokens: 1000,
      maxRetries: 3,
      validateToolAvailability: true,
      strictValidation: true,
      enableCaching: true,
      cacheMaxSize: 100,
      cacheTTL: 3600000,          // 1 hour
      availableTools: this.initializeAvailableTools(),
      ...config
    };
    
    this.intentClassifier = new IntentClassifier();
    this.planCache = new Map();
  }
  
  /**
   * Generate execution plan from user query
   */
  async plan(query: string, conversationContext?: any): Promise<Plan> {
    console.log(`[Planner] Planning for query: "${query}"`);
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedPlan(query);
      if (cached) {
        console.log('[Planner] Using cached plan');
        return cached;
      }
    }
    
    // Step 1: Classify intent
    const intent = this.intentClassifier.classify(
      query,
      conversationContext
    );
    console.log(`[Planner] Intent: ${intent.intent} (confidence: ${intent.confidence})`);
    
    // Step 2: Extract temporal references and entities
    const temporalRef = this.extractTemporalReference(query);
    const entities = this.extractEntities(query);
    
    console.log(`[Planner] Temporal: ${temporalRef?.date_from || 'none'}`);
    console.log(`[Planner] Entities:`, entities);
    
    // Step 3: Generate plan using LLM with retry
    const plan = await withRetry(
      async () => {
        const planJson = await this.generatePlanWithLLM(
          query,
          intent,
          temporalRef,
          entities,
          conversationContext
        );
        
        // Step 4: Validate plan
        return this.validateAndParsePlan(planJson);
      },
      {
        maxRetries: this.config.maxRetries,
        baseDelay: 1000,
        exponential: true,
        onRetry: (attempt, error) => {
          console.log(`[Planner] Retry ${attempt}: ${error.message}`);
        }
      }
    );
    
    // Step 5: Cache the plan
    if (this.config.enableCaching) {
      this.cachePlan(query, plan);
    }
    
    console.log(`[Planner] Plan generated with ${plan.steps.length} steps`);
    return plan;
  }
  
  /**
   * Generate plan using LLM
   */
  private async generatePlanWithLLM(
    query: string,
    intent: IntentResult,
    temporalRef: any,
    entities: string[],
    context?: any
  ): Promise<any> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      query,
      intent,
      temporalRef,
      entities,
      context
    );
    
    const response = await this.llmProvider.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      config: {
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      }
    });
    
    // Extract JSON from response
    return this.extractJSON(response.content);
  }
  
  /**
   * Build system prompt with tool descriptions
   */
  private buildSystemPrompt(): string {
    const toolDescriptions = Array.from(this.config.availableTools.values())
      .map(tool => {
        return `### ${tool.name}
Description: ${tool.description}
Parameters: ${tool.params.join(', ')}
Required: ${tool.requiredParams.join(', ')}`;
      })
      .join('\n\n');
    
    return `You are a planning agent for a waste management analysis system.

Your task is to convert user queries into structured execution plans using available tools.

## AVAILABLE TOOLS

${toolDescriptions}

## RULES

1. Return ONLY valid JSON, no additional text
2. Use ISO 8601 date format (YYYY-MM-DD) for all dates
3. Set "depends_on" array for steps that need data from previous steps
4. Set "parallel: true" for steps that can run simultaneously
5. Use template syntax \${step[N].data.field} to reference previous results
6. Use \${step[N].data.*.field} to map over arrays

## TEMPORAL REFERENCES

- "last week" = 7 days ago to today
- "this week" = Monday to today
- "this month" = first day of month to today
- "today" = today's date
- "yesterday" = yesterday's date

## COMMON QUERY PATTERNS

**Pattern 1: Simple Query with Filters**
Query: "Get shipments from last week"
Plan:
\`\`\`json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-04",
        "date_to": "2025-10-11"
      }
    }
  ]
}
\`\`\`

**Pattern 2: Query with Nested Data**
Query: "Get contaminated shipments and their contaminant details"
Plan:
\`\`\`json
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
        "shipment_ids": "\${step[0].data.*.id}"
      },
      "depends_on": [0]
    }
  ]
}
\`\`\`

**Pattern 3: Location-Based Query**
Query: "Get contaminants detected in Hannover"
Plan:
\`\`\`json
{
  "steps": [
    {
      "tool": "facilities",
      "params": {
        "location": "Hannover"
      }
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "facility_id": "\${step[0].data[0].id}"
      },
      "depends_on": [0]
    }
  ]
}
\`\`\`

## RESPONSE FORMAT

Return a JSON object with this structure:
\`\`\`json
{
  "steps": [
    {
      "tool": "tool_name",
      "params": { /* tool parameters */ },
      "depends_on": [0, 1],  // optional: array of step indices
      "parallel": false      // optional: can run in parallel
    }
  ],
  "metadata": {
    "query": "original user query",
    "timestamp": "ISO timestamp",
    "estimated_duration_ms": 1000
  }
}
\`\`\``;
  }
  
  /**
   * Build user prompt with context
   */
  private buildUserPrompt(
    query: string,
    intent: IntentResult,
    temporalRef: any,
    entities: string[],
    context?: any
  ): string {
    let prompt = `Query: ${query}\n`;
    
    if (intent.timeframe) {
      prompt += `\nDetected timeframe: ${intent.timeframe}`;
      if (temporalRef) {
        prompt += ` (${temporalRef.date_from} to ${temporalRef.date_to})`;
      }
    }
    
    if (entities.length > 0) {
      prompt += `\nDetected entities: ${entities.join(', ')}`;
    }
    
    if (context && Object.keys(context).length > 0) {
      prompt += `\n\nContext from previous conversation:\n${JSON.stringify(context, null, 2)}`;
    }
    
    prompt += `\n\nGenerate a plan to answer this query.`;
    
    return prompt;
  }
  
  /**
   * Extract temporal reference from query
   */
  private extractTemporalReference(query: string): { date_from: string; date_to: string } | null {
    const temporalKeywords = [
      'today', 'yesterday', 'last week', 'this week',
      'this month', 'last month'
    ];
    
    const lowerQuery = query.toLowerCase();
    
    for (const keyword of temporalKeywords) {
      if (lowerQuery.includes(keyword)) {
        try {
          return parseTemporalReference(keyword);
        } catch (error) {
          console.warn(`[Planner] Could not parse temporal reference: ${keyword}`);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract entities from query (simple keyword matching)
   */
  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Check for domain entities
    if (lowerQuery.includes('shipment')) entities.push('shipment');
    if (lowerQuery.includes('facility') || lowerQuery.includes('facilities')) {
      entities.push('facility');
    }
    if (lowerQuery.includes('contaminant') || lowerQuery.includes('contamination')) {
      entities.push('contaminant');
    }
    if (lowerQuery.includes('inspection')) entities.push('inspection');
    
    // Check for status values
    if (lowerQuery.includes('rejected')) entities.push('status:rejected');
    if (lowerQuery.includes('accepted')) entities.push('status:accepted');
    if (lowerQuery.includes('pending')) entities.push('status:pending');
    
    // Check for risk levels
    if (lowerQuery.includes('critical') || lowerQuery.includes('high risk')) {
      entities.push('risk:high');
    }
    
    // Extract location names (capitalized words)
    const locationMatch = query.match(/\bin\s+([A-Z][a-z]+)/);
    if (locationMatch) {
      entities.push(`location:${locationMatch[1]}`);
    }
    
    return entities;
  }
  
  /**
   * Extract JSON from LLM response
   */
  private extractJSON(content: string): any {
    // Try parsing as-is
    try {
      return JSON.parse(content);
    } catch (e) {
      // Try extracting from markdown code block
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]!);
      }
      
      // Try finding JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]!);
      }
      
      throw new Error('Could not extract valid JSON from LLM response');
    }
  }
  
  /**
   * Validate and parse plan
   */
  private validateAndParsePlan(planJson: any): Plan {
    // Validate with Zod schema
    const plan = validatePlan(planJson);
    
    // Additional validation
    if (this.config.validateToolAvailability) {
      this.validateToolsAvailable(plan);
    }
    
    // Check for circular dependencies
    this.validateNoCycles(plan);
    
    // Add metadata if missing
    if (!plan.metadata) {
      plan.metadata = {
        query: '',
        timestamp: getCurrentTimestamp()
      };
    }
    
    return plan;
  }
  
  /**
   * Validate that all tools in plan are available
   */
  private validateToolsAvailable(plan: Plan): void {
    for (const step of plan.steps) {
      if (!this.config.availableTools.has(step.tool)) {
        throw new Error(`Tool not available: ${step.tool}`);
      }
      
      // Validate depends_on indices
      if (step.depends_on) {
        for (const depIndex of step.depends_on) {
          if (depIndex < 0 || depIndex >= plan.steps.length) {
            throw new Error(`Invalid dependency index: ${depIndex}`);
          }
        }
      }
    }
  }
  
  /**
   * Validate no circular dependencies
   */
  private validateNoCycles(plan: Plan): void {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    const hasCycle = (stepIndex: number): boolean => {
      visited.add(stepIndex);
      recursionStack.add(stepIndex);
      
      const step = plan.steps[stepIndex]!;
      const deps = step.depends_on || [];
      
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }
      
      recursionStack.delete(stepIndex);
      return false;
    };
    
    for (let i = 0; i < plan.steps.length; i++) {
      if (!visited.has(i)) {
        if (hasCycle(i)) {
          throw new Error('Circular dependency detected in plan');
        }
      }
    }
  }
  
  /**
   * Get cached plan
   */
  private getCachedPlan(query: string): Plan | null {
    const cached = this.planCache.get(query);
    
    if (!cached) return null;
    
    // Check if cache is still valid
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTTL) {
      this.planCache.delete(query);
      return null;
    }
    
    return cached.plan;
  }
  
  /**
   * Cache plan
   */
  private cachePlan(query: string, plan: Plan): void {
    // Enforce cache size limit
    if (this.planCache.size >= this.config.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.planCache.keys().next().value;
      this.planCache.delete(firstKey);
    }
    
    this.planCache.set(query, {
      plan,
      timestamp: Date.now()
    });
  }
  
  /**
   * Initialize available tools
   */
  private initializeAvailableTools(): Map<string, ToolInfo> {
    const tools = new Map<string, ToolInfo>();
    
    tools.set('shipments', {
      name: 'shipments',
      description: 'Query shipments with filters for date range, status, facility, and contamination',
      params: ['date_from', 'date_to', 'facility_id', 'status', 'has_contaminants', 'waste_type', 'carrier'],
      requiredParams: []
    });
    
    tools.set('facilities', {
      name: 'facilities',
      description: 'Query waste management facilities by location, type, and capacity',
      params: ['location', 'type', 'min_capacity', 'ids'],
      requiredParams: []
    });
    
    tools.set('contaminants-detected', {
      name: 'contaminants-detected',
      description: 'Query detected contaminants with filters for shipment, facility, type, and risk level',
      params: ['shipment_ids', 'facility_id', 'date_from', 'date_to', 'type', 'risk_level'],
      requiredParams: []
    });
    
    tools.set('inspections', {
      name: 'inspections',
      description: 'Query inspection records with filters for date range, status, and facility',
      params: ['date_from', 'date_to', 'status', 'facility_id', 'shipment_id', 'has_risk_contaminants'],
      requiredParams: []
    });
    
    return tools;
  }
  
  /**
   * Clear plan cache
   */
  clearCache(): void {
    this.planCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.planCache.size,
      maxSize: this.config.cacheMaxSize,
      utilizationPercent: (this.planCache.size / this.config.cacheMaxSize) * 100
    };
  }
}
```

---

## Example Scenarios

### Scenario 1: Simple Query with Date Filter

**User Query:** "Get me shipments from last week"

**Processing:**
1. Intent: `query` (confidence: 0.85)
2. Temporal: "last week" → `{ date_from: "2025-10-04", date_to: "2025-10-11" }`
3. Entities: `["shipment"]`

**Generated Plan:**
```json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-04",
        "date_to": "2025-10-11"
      }
    }
  ],
  "metadata": {
    "query": "Get me shipments from last week",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 500
  }
}
```

---

### Scenario 2: Nested Query with Dependencies

**User Query:** "Get contaminated shipments from last week and show me the contaminant details"

**Processing:**
1. Intent: `query` (confidence: 0.9)
2. Temporal: "last week" → `{ date_from: "2025-10-04", date_to: "2025-10-11" }`
3. Entities: `["shipment", "contaminant"]`

**Generated Plan:**
```json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-04",
        "date_to": "2025-10-11",
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
  ],
  "metadata": {
    "query": "Get contaminated shipments from last week and show me the contaminant details",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 1500
  }
}
```

**Explanation:**
- Step 0: Get shipments with `has_contaminants: true`
- Step 1: Use the IDs from step 0 (`${step[0].data.*.id}`) to get contaminant details
- Step 1 depends on step 0 (`depends_on: [0]`)

---

### Scenario 3: Location-Based Query

**User Query:** "Analyze today's contaminants in Hannover"

**Processing:**
1. Intent: `query` (confidence: 0.85)
2. Temporal: "today" → `{ date_from: "2025-10-11", date_to: "2025-10-11" }`
3. Entities: `["contaminant", "location:Hannover"]`

**Generated Plan:**
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
      "tool": "contaminants-detected",
      "params": {
        "facility_id": "${step[0].data[0].id}",
        "date_from": "2025-10-11",
        "date_to": "2025-10-11"
      },
      "depends_on": [0]
    }
  ],
  "metadata": {
    "query": "Analyze today's contaminants in Hannover",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 1200
  }
}
```

---

### Scenario 4: Complex Multi-Step Query

**User Query:** "From the inspections accepted this week, did we detect any high-risk contaminants?"

**Processing:**
1. Intent: `query` (confidence: 0.9)
2. Temporal: "this week" → `{ date_from: "2025-10-07", date_to: "2025-10-11" }`
3. Entities: `["inspection", "contaminant", "status:accepted", "risk:high"]`

**Generated Plan:**
```json
{
  "steps": [
    {
      "tool": "inspections",
      "params": {
        "status": "accepted",
        "date_from": "2025-10-07",
        "date_to": "2025-10-11"
      }
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "shipment_ids": "${step[0].data.*.shipment_id}",
        "risk_level": "high"
      },
      "depends_on": [0]
    }
  ],
  "metadata": {
    "query": "From the inspections accepted this week, did we detect any high-risk contaminants?",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 1800
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Planner Configuration
PLANNER_TEMPERATURE=0.1              # Low for deterministic planning
PLANNER_MAX_TOKENS=1000              # Max tokens for plan generation
PLANNER_MAX_RETRIES=3                # Retry attempts
PLANNER_ENABLE_CACHING=true          # Enable plan caching
PLANNER_CACHE_MAX_SIZE=100           # Max cached plans
PLANNER_CACHE_TTL=3600000            # Cache TTL (1 hour)
PLANNER_VALIDATE_TOOLS=true          # Validate tool availability
```

### Programmatic Configuration

```typescript
const planner = new PlannerAgent(
  llmProvider,
  contextManager,
  {
    temperature: 0.1,
    maxTokens: 1000,
    maxRetries: 3,
    validateToolAvailability: true,
    strictValidation: true,
    enableCaching: true,
    cacheMaxSize: 100,
    cacheTTL: 3600000
  }
);
```

---

## Error Handling

### Error Types

1. **Intent Classification Errors**
   - Ambiguous query
   - Unknown intent
   - **Handling**: Ask user for clarification

2. **LLM Generation Errors**
   - LLM unavailable
   - Invalid JSON response
   - Timeout
   - **Handling**: Retry with exponential backoff (via `withRetry`)

3. **Validation Errors**
   - Invalid plan structure
   - Missing required fields
   - Invalid tool names
   - **Handling**: Retry generation with error feedback

4. **Dependency Errors**
   - Circular dependencies
   - Invalid step references
   - **Handling**: Fail fast with descriptive error

### Error Handling Pattern

```typescript
try {
  const plan = await planner.plan(query, context);
  return plan;
} catch (error) {
  if (error instanceof ZodError) {
    console.error('[Planner] Validation error:', error.errors);
    throw new PlanValidationError('Invalid plan structure', error);
  }
  
  if (error.message.includes('Circular dependency')) {
    console.error('[Planner] Circular dependency detected');
    throw new PlanDependencyError('Plan has circular dependencies');
  }
  
  if (error.message.includes('Tool not available')) {
    console.error('[Planner] Tool not found');
    throw new ToolNotFoundError(error.message);
  }
  
  // Generic error
  console.error('[Planner] Planning failed:', error);
  throw new PlannerError('Failed to generate plan', error);
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/tests/agents/planner/planner.test.ts
import { PlannerAgent } from '../../../agents/planner/planner.js';
import { PlanSchema } from '../../../shared/validation/schemas.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { ContextManager } from '../../../shared/context/manager.js';

describe('PlannerAgent', () => {
  let planner: PlannerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;
  let mockContext: jest.Mocked<ContextManager>;
  
  beforeEach(() => {
    mockLLM = {
      generate: jest.fn()
    } as any;
    
    mockContext = {
      getMessages: jest.fn().mockReturnValue([]),
      addMessage: jest.fn()
    } as any;
    
    planner = new PlannerAgent(mockLLM, mockContext, {
      enableCaching: false  // Disable for tests
    });
  });
  
  describe('plan()', () => {
    it('should generate valid plan for simple query', async () => {
      const mockPlan = {
        steps: [{
          tool: 'shipments',
          params: {
            date_from: '2025-10-04',
            date_to: '2025-10-11'
          }
        }],
        metadata: {
          query: 'Get shipments from last week',
          timestamp: '2025-10-11T12:00:00Z'
        }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 100 }
      });
      
      const plan = await planner.plan('Get shipments from last week');
      
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].tool).toBe('shipments');
      expect(plan.steps[0].params.date_from).toBe('2025-10-04');
      
      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    });
    
    it('should handle nested queries with dependencies', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'shipments',
            params: { has_contaminants: true }
          },
          {
            tool: 'contaminants-detected',
            params: { shipment_ids: '${step[0].data.*.id}' },
            depends_on: [0]
          }
        ],
        metadata: {
          query: 'test',
          timestamp: '2025-10-11T12:00:00Z'
        }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 150 }
      });
      
      const plan = await planner.plan('Get contaminated shipments and details');
      
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[1].depends_on).toEqual([0]);
      expect(plan.steps[1].params.shipment_ids).toContain('${step[0]');
    });
    
    it('should resolve temporal references', async () => {
      const mockPlan = {
        steps: [{
          tool: 'shipments',
          params: {
            date_from: '2025-10-04',
            date_to: '2025-10-11'
          }
        }],
        metadata: {
          query: 'Get shipments from last week',
          timestamp: '2025-10-11T12:00:00Z'
        }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 100 }
      });
      
      const plan = await planner.plan('Get shipments from last week');
      
      // Verify dates are resolved
      expect(plan.steps[0].params.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(plan.steps[0].params.date_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    it('should retry on invalid JSON', async () => {
      mockLLM.generate
        .mockResolvedValueOnce({
          content: 'invalid json',
          usage: { total_tokens: 50 }
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            steps: [{ tool: 'shipments', params: {} }],
            metadata: { query: 'test', timestamp: '2025-10-11T12:00:00Z' }
          }),
          usage: { total_tokens: 100 }
        });
      
      const plan = await planner.plan('test query');
      
      expect(mockLLM.generate).toHaveBeenCalledTimes(2);
      expect(plan.steps).toHaveLength(1);
    });
    
    it('should throw after max retries', async () => {
      mockLLM.generate.mockResolvedValue({
        content: 'invalid',
        usage: { total_tokens: 50 }
      });
      
      await expect(planner.plan('test')).rejects.toThrow();
      expect(mockLLM.generate).toHaveBeenCalledTimes(3); // maxRetries
    });
    
    it('should detect circular dependencies', async () => {
      const mockPlan = {
        steps: [
          {
            tool: 'tool1',
            params: {},
            depends_on: [1]  // Circular: depends on step 1
          },
          {
            tool: 'tool2',
            params: {},
            depends_on: [0]  // Circular: depends on step 0
          }
        ],
        metadata: {
          query: 'test',
          timestamp: '2025-10-11T12:00:00Z'
        }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 100 }
      });
      
      await expect(planner.plan('test')).rejects.toThrow('Circular dependency');
    });
    
    it('should validate tool availability', async () => {
      const mockPlan = {
        steps: [{
          tool: 'nonexistent-tool',
          params: {}
        }],
        metadata: {
          query: 'test',
          timestamp: '2025-10-11T12:00:00Z'
        }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 100 }
      });
      
      await expect(planner.plan('test')).rejects.toThrow('Tool not available');
    });
  });
  
  describe('caching', () => {
    beforeEach(() => {
      planner = new PlannerAgent(mockLLM, mockContext, {
        enableCaching: true,
        cacheMaxSize: 2
      });
    });
    
    it('should cache successful plans', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: { query: 'test', timestamp: '2025-10-11T12:00:00Z' }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 100 }
      });
      
      // First call
      await planner.plan('test query');
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await planner.plan('test query');
      expect(mockLLM.generate).toHaveBeenCalledTimes(1);
    });
    
    it('should enforce cache size limit', async () => {
      const mockPlan = {
        steps: [{ tool: 'shipments', params: {} }],
        metadata: { query: 'test', timestamp: '2025-10-11T12:00:00Z' }
      };
      
      mockLLM.generate.mockResolvedValue({
        content: JSON.stringify(mockPlan),
        usage: { total_tokens: 100 }
      });
      
      // Cache 3 plans (max is 2)
      await planner.plan('query 1');
      await planner.plan('query 2');
      await planner.plan('query 3');
      
      const stats = planner.getCacheStats();
      expect(stats.size).toBe(2);  // Oldest entry removed
    });
  });
});
```

### Integration Tests

```typescript
// src/tests/agents/planner/planner.integration.test.ts
import { PlannerAgent } from '../../../agents/planner/planner.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { ContextManager } from '../../../shared/context/manager.js';

describe('PlannerAgent Integration', () => {
  let planner: PlannerAgent;
  let llm: LLMProvider;
  let context: ContextManager;
  
  beforeAll(() => {
    // Use real LLM provider (with Ollama fallback for CI)
    llm = new LLMProvider([
      {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2'
      }
    ]);
    
    context = new ContextManager();
    planner = new PlannerAgent(llm, context);
  });
  
  it('should generate plan for real query', async () => {
    const plan = await planner.plan('Get contaminated shipments from last week');
    
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].tool).toBe('shipments');
    expect(plan.steps[0].params.has_contaminants).toBe(true);
  }, 30000);  // 30s timeout for real LLM
});
```

---

## Performance Optimization

### 1. Plan Caching

```typescript
// Cache successful plans by query hash
const cacheKey = hashQuery(query);
const cached = this.planCache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
  return cached.plan;
}
```

**Benefits:**
- Instant response for repeated queries
- Reduces LLM API calls
- Lowers costs

**Configuration:**
```typescript
enableCaching: true,
cacheMaxSize: 100,
cacheTTL: 3600000  // 1 hour
```

### 2. Low Temperature for Determinism

```typescript
temperature: 0.1  // Low temperature = more deterministic
```

**Benefits:**
- Consistent plans for similar queries
- Better cache hit rate
- More predictable behavior

### 3. Retry with Exponential Backoff

```typescript
await withRetry(
  async () => this.generatePlanWithLLM(...),
  {
    maxRetries: 3,
    baseDelay: 1000,
    exponential: true  // 1s, 2s, 4s
  }
);
```

**Benefits:**
- Handles transient LLM failures
- Avoids overwhelming failed services
- Improves reliability

### 4. Intent Classification Before LLM

```typescript
const intent = this.intentClassifier.classify(query);
if (intent.intent === 'confirmation') {
  // No need for LLM, handle directly
  return this.handleConfirmation(query, context);
}
```

**Benefits:**
- Faster response for simple intents
- Reduces LLM calls
- Lower latency

### 5. Parallel Context Loading

```typescript
const [intent, temporalRef, entities] = await Promise.all([
  this.classifyIntent(query),
  this.extractTemporal(query),
  this.extractEntities(query)
]);
```

**Benefits:**
- Faster preprocessing
- Better resource utilization

---

## Next Steps

1. ✅ Review this blueprint
2. ✅ Study shared library components
3. ✅ Implement `PlannerAgent` class
4. ✅ Write unit tests
5. ✅ Write integration tests
6. ✅ Test with real queries
7. ✅ Optimize based on metrics
8. ✅ Move to Executor Agent blueprint

---

## Related Documentation

- [Executor Agent Blueprint](./02-executor-agent.md) - Next step
- [Shared Library Types](../../src/shared/types/agent.ts)
- [LLM Provider](../../src/shared/llm/provider.ts)
- [Validation Schemas](../../src/shared/validation/schemas.ts)

---

**Blueprint Version:** 2.0  
**Last Updated:** October 11, 2025  
**Status:** Ready for Implementation

