# Planner Agent Blueprint

## Overview
The Planner Agent is responsible for converting natural language queries into structured, executable plans. It analyzes user intent, selects appropriate tools, and creates a dependency graph for execution.

## Responsibilities

1. **Query Understanding**
   - Parse natural language input
   - Extract user intent
   - Identify required information
   - Detect temporal references (last week, today, etc.)
   - Extract entities (facilities, locations, etc.)

2. **Tool Selection**
   - Choose appropriate tools based on query
   - Understand tool capabilities
   - Determine tool execution order
   - Identify dependencies between tools

3. **Plan Generation**
   - Create structured execution plan
   - Define tool parameters
   - Set up data flow between steps
   - Optimize for parallel execution where possible

4. **Plan Validation**
   - Validate against schema (Zod)
   - Check tool availability
   - Verify parameter types
   - Ensure dependencies are valid

## Architecture

```typescript
// src/agents/planner.ts
import { Plan, PlanStep } from './types.js';
import { LLMProvider } from '../llm/provider.js';
import { PlanSchema } from '../validation/schemas.js';
import { MCPServer } from '../mcp/server.js';

export interface PlannerConfig {
  temperature: number;
  maxRetries: number;
  validateToolAvailability: boolean;
}

export class PlannerAgent {
  private config: PlannerConfig;
  private availableTools: Map<string, any>;
  
  constructor(
    private llm: LLMProvider,
    private mcpServer?: MCPServer,
    config?: Partial<PlannerConfig>
  ) {
    this.config = {
      temperature: 0.1, // Low temperature for deterministic planning
      maxRetries: 3,
      validateToolAvailability: true,
      ...config
    };
    
    // Cache available tools
    this.availableTools = new Map();
    if (mcpServer) {
      this.loadAvailableTools();
    }
  }
  
  private loadAvailableTools(): void {
    // Get all registered tools from MCP server
    // This would need to be implemented in MCPServer
    // For now, hardcode the tools
    this.availableTools.set('shipments', {
      description: 'Query shipments with filters',
      params: ['date_from', 'date_to', 'facility_id', 'status', 'has_contaminants']
    });
    this.availableTools.set('facilities', {
      description: 'Query waste management facilities',
      params: ['location', 'type', 'min_capacity', 'facility_ids']
    });
    this.availableTools.set('contaminants-detected', {
      description: 'Query detected contaminants',
      params: ['shipment_ids', 'facility_id', 'date_from', 'date_to', 'contaminant_type', 'risk_level']
    });
    this.availableTools.set('inspections', {
      description: 'Query inspection records',
      params: ['date_from', 'date_to', 'status', 'facility_id', 'shipment_id', 'has_risk_contaminants']
    });
  }
  
  async plan(query: string, context?: any): Promise<Plan> {
    console.log('Planning for query:', query);
    
    // Build system prompt with tool descriptions
    const systemPrompt = this.buildSystemPrompt();
    
    // Add context if available
    let userPrompt = `Query: ${query}`;
    if (context && Object.keys(context).length > 0) {
      userPrompt += `\n\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    // Call LLM to generate plan
    let planJson: any;
    let attempts = 0;
    
    while (attempts < this.config.maxRetries) {
      try {
        const response = await this.llm.generate({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          config: {
            temperature: this.config.temperature,
            max_tokens: 1000
          }
        });
        
        // Extract JSON from response
        planJson = this.extractJSON(response.content);
        
        // Validate plan
        const plan = PlanSchema.parse(planJson);
        
        // Additional validation
        if (this.config.validateToolAvailability) {
          this.validateToolsAvailable(plan);
        }
        
        console.log('Plan generated successfully');
        return plan;
        
      } catch (error: any) {
        attempts++;
        console.error(`Planning attempt ${attempts} failed:`, error.message);
        
        if (attempts >= this.config.maxRetries) {
          throw new Error(`Failed to generate valid plan after ${attempts} attempts: ${error.message}`);
        }
        
        // Add error feedback to next attempt
        userPrompt += `\n\n[Previous attempt failed: ${error.message}. Please fix and try again.]`;
      }
    }
    
    throw new Error('Failed to generate plan');
  }
  
  private buildSystemPrompt(): string {
    const toolDescriptions = Array.from(this.availableTools.entries())
      .map(([name, info]) => {
        return `- ${name}: ${info.description}\n  Parameters: ${info.params.join(', ')}`;
      })
      .join('\n\n');
    
    return `You are a planning agent for a waste management analysis system.

Your task is to convert user queries into structured execution plans using available tools.

AVAILABLE TOOLS:
${toolDescriptions}

RULES:
1. Return ONLY valid JSON, no additional text
2. Use ISO 8601 date format (YYYY-MM-DD)
3. Set "depends_on" array for steps that need data from previous steps
4. Set "parallel: true" for steps that can run simultaneously
5. Use template syntax \${step[N].data.field} to reference previous results

TEMPORAL REFERENCES:
- "last week" = 7 days ago to today
- "this week" = Monday to today
- "this month" = first day of month to today
- "today" = today's date

COMMON PATTERNS:

Pattern 1: Query with filters
Query: "Get shipments from last week"
Plan: Single step with shipments tool, date filters

Pattern 2: Query with nested data
Query: "Get contaminated shipments and their contaminant details"
Plan: 
  Step 1: shipments tool with has_contaminants=true
  Step 2: contaminants-detected tool with shipment_ids from step 1

Pattern 3: Location-based query
Query: "Get contaminants in Hannover"
Plan:
  Step 1: facilities tool with location=Hannover
  Step 2: contaminants-detected with facility_id from step 1

RESPONSE FORMAT (JSON only):
{
  "steps": [
    {
      "tool": "tool_name",
      "params": {
        "param1": "value1",
        "param2": "value2"
      },
      "depends_on": [0],
      "parallel": false
    }
  ],
  "metadata": {
    "query": "original query",
    "timestamp": "ISO timestamp",
    "estimated_duration_ms": 1000
  }
}`;
  }
  
  private extractJSON(content: string): any {
    // Try to parse as-is first
    try {
      return JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find JSON object in text
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error('Could not extract valid JSON from response');
    }
  }
  
  private validateToolsAvailable(plan: Plan): void {
    for (const step of plan.steps) {
      if (!this.availableTools.has(step.tool)) {
        throw new Error(`Tool not available: ${step.tool}`);
      }
      
      // Validate depends_on indices
      if (step.depends_on) {
        for (const depIndex of step.depends_on) {
          if (depIndex >= plan.steps.length) {
            throw new Error(`Invalid dependency index: ${depIndex}`);
          }
        }
      }
    }
  }
  
  // Helper method to calculate dates
  private resolveTemporal(reference: string): { date_from: string; date_to: string } {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    switch (reference.toLowerCase()) {
      case 'today':
        return {
          date_from: formatDate(today),
          date_to: formatDate(today)
        };
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          date_from: formatDate(yesterday),
          date_to: formatDate(yesterday)
        };
        
      case 'last week':
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return {
          date_from: formatDate(lastWeek),
          date_to: formatDate(today)
        };
        
      case 'this week':
        const monday = new Date(today);
        monday.setDate(monday.getDate() - monday.getDay() + 1);
        return {
          date_from: formatDate(monday),
          date_to: formatDate(today)
        };
        
      case 'this month':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          date_from: formatDate(firstDay),
          date_to: formatDate(today)
        };
        
      default:
        throw new Error(`Unknown temporal reference: ${reference}`);
    }
  }
}
```

## Example Plans

### Example 1: Simple Query
**Query:** "Get shipments from last week"

**Plan:**
```json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-04",
        "date_to": "2025-10-11"
      },
      "parallel": false
    }
  ],
  "metadata": {
    "query": "Get shipments from last week",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 500
  }
}
```

### Example 2: Nested Query
**Query:** "Get contaminated shipments from last week and their contaminant details"

**Plan:**
```json
{
  "steps": [
    {
      "tool": "shipments",
      "params": {
        "date_from": "2025-10-04",
        "date_to": "2025-10-11",
        "has_contaminants": true
      },
      "parallel": false
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "shipment_ids": "${step[0].data.*.id}"
      },
      "depends_on": [0],
      "parallel": false
    }
  ],
  "metadata": {
    "query": "Get contaminated shipments from last week and their contaminant details",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 1500
  }
}
```

### Example 3: Location-Based Query
**Query:** "Analyse today's contaminants in Hannover"

**Plan:**
```json
{
  "steps": [
    {
      "tool": "facilities",
      "params": {
        "location": "Hannover"
      },
      "parallel": false
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "facility_id": "${step[0].data[0].id}",
        "date_from": "2025-10-11",
        "date_to": "2025-10-11"
      },
      "depends_on": [0],
      "parallel": false
    }
  ],
  "metadata": {
    "query": "Analyse today's contaminants in Hannover",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 1200
  }
}
```

### Example 4: Complex Multi-Step Query
**Query:** "From the inspections accepted this week, did we detect any risky contaminants?"

**Plan:**
```json
{
  "steps": [
    {
      "tool": "inspections",
      "params": {
        "status": "accepted",
        "date_from": "2025-10-07",
        "date_to": "2025-10-11"
      },
      "parallel": false
    },
    {
      "tool": "contaminants-detected",
      "params": {
        "shipment_ids": "${step[0].data.*.shipment_id}",
        "risk_level": "high"
      },
      "depends_on": [0],
      "parallel": false
    }
  ],
  "metadata": {
    "query": "From the inspections accepted this week, did we detect any risky contaminants?",
    "timestamp": "2025-10-11T12:00:00Z",
    "estimated_duration_ms": 1800
  }
}
```

## Testing Strategy

```typescript
// src/tests/agents/planner.test.ts
import { PlannerAgent } from '../../agents/planner.js';
import { PlanSchema } from '../../validation/schemas.js';

describe('PlannerAgent', () => {
  let planner: PlannerAgent;
  let mockLLM: any;
  
  beforeEach(() => {
    mockLLM = {
      generate: jest.fn()
    };
    
    planner = new PlannerAgent(mockLLM);
  });
  
  it('should generate valid plan for simple query', async () => {
    mockLLM.generate.mockResolvedValue({
      content: JSON.stringify({
        steps: [{
          tool: 'shipments',
          params: { date_from: '2025-10-04' }
        }],
        metadata: {
          query: 'test',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const plan = await planner.plan('Get shipments from last week');
    
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].tool).toBe('shipments');
    
    // Validate against schema
    expect(() => PlanSchema.parse(plan)).not.toThrow();
  });
  
  it('should handle nested queries with dependencies', async () => {
    mockLLM.generate.mockResolvedValue({
      content: JSON.stringify({
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
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const plan = await planner.plan('Get contaminated shipments and details');
    
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[1].depends_on).toEqual([0]);
  });
  
  it('should retry on invalid JSON', async () => {
    mockLLM.generate
      .mockResolvedValueOnce({ content: 'invalid json' })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          steps: [{ tool: 'shipments', params: {} }],
          metadata: { query: 'test', timestamp: new Date().toISOString() }
        })
      });
    
    const plan = await planner.plan('test');
    
    expect(mockLLM.generate).toHaveBeenCalledTimes(2);
    expect(plan.steps).toHaveLength(1);
  });
  
  it('should extract JSON from markdown code blocks', async () => {
    mockLLM.generate.mockResolvedValue({
      content: '```json\n{"steps":[{"tool":"shipments","params":{}}],"metadata":{"query":"test","timestamp":"2025-10-11T12:00:00Z"}}\n```'
    });
    
    const plan = await planner.plan('test');
    
    expect(plan.steps).toHaveLength(1);
  });
  
  it('should throw after max retries', async () => {
    mockLLM.generate.mockResolvedValue({ content: 'invalid' });
    
    await expect(planner.plan('test')).rejects.toThrow('Failed to generate valid plan');
    expect(mockLLM.generate).toHaveBeenCalledTimes(3); // maxRetries = 3
  });
});
```

## Performance Optimization

### Caching
```typescript
export class PlannerAgent {
  private planCache = new Map<string, Plan>();
  private cacheEnabled = true;
  private maxCacheSize = 100;
  
  async plan(query: string, context?: any): Promise<Plan> {
    // Check cache (only if no context)
    if (this.cacheEnabled && !context) {
      const cached = this.planCache.get(query);
      if (cached) {
        console.log('Returning cached plan');
        return cached;
      }
    }
    
    const plan = await this.generatePlan(query, context);
    
    // Store in cache
    if (this.cacheEnabled && !context) {
      if (this.planCache.size >= this.maxCacheSize) {
        // Remove oldest entry
        const firstKey = this.planCache.keys().next().value;
        this.planCache.delete(firstKey);
      }
      this.planCache.set(query, plan);
    }
    
    return plan;
  }
}
```

## Next Steps

1. Implement basic planner with hardcoded rules first (no LLM)
2. Add LLM integration
3. Add schema validation
4. Add retry logic
5. Add plan caching
6. Add learning from feedback (store successful plans)

