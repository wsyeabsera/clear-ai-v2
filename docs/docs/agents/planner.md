---
sidebar_position: 2
---

# Planner Agent

The Planner Agent converts natural language queries into structured, executable plans using Large Language Models. It selects appropriate tools, generates parameters, and creates dependency chains for complex multi-step operations.

## What It Does

The Planner Agent is the first stage of the agent pipeline:

```
Natural Language Query → PLANNER → Structured Execution Plan
```

**Input**: Natural language query (e.g., "Get contaminated shipments from last week")  
**Output**: Structured plan with tools, parameters, and dependencies

## How It Works

### 1. Query Analysis

The Planner analyzes the query to understand:
- **Intent**: What the user wants to accomplish
- **Entities**: Facilities, shipments, contaminants mentioned
- **Temporal references**: "last week", "today", "this month"
- **Filters**: Status, risk level, location, etc.
- **Complexity**: Single-step vs multi-step requirements

###  2. Tool Selection

Based on available tools, the Planner selects:
- **Primary tools**: Main data sources needed
- **Secondary tools**: Supporting data for enrichment
- **Tool combinations**: Multiple tools for complex queries

**Available Tools**:
- `shipments_list` - Query shipments with filters
- `facilities_list` - Query facilities by location/type
- `contaminants_list` - Query detected contaminants
- `inspections_list` - Query inspection records

### 3. Parameter Generation

The Planner generates parameters using:
- **Direct extraction**: Explicit values from query
- **Temporal resolution**: Convert "last week" to dates
- **Context integration**: Use memory context for implied parameters
- **Template syntax**: Reference previous step results

### 4. Dependency Analysis

The Planner creates dependencies when:
- **Data flow needed**: Step 2 needs results from Step 1
- **Sequential required**: Operations must occur in order
- **Conditional logic**: Execution depends on previous success

### 5. Plan Validation

Before returning, the Planner validates:
- **Tool availability**: All tools exist and are accessible
- **Dependency validity**: No circular dependencies
- **Parameter completeness**: Required parameters provided
- **Schema compliance**: Plan matches expected structure

## Configuration Options

```typescript
interface PlannerConfig {
  temperature: number;              // LLM temperature (0-1)
  maxRetries: number;              // Max retry attempts
  validateToolAvailability: boolean; // Check tools before execution
}

// Create with custom config
const planner = new PlannerAgent(llm, mcpServer, {
  temperature: 0.1,        // Low = deterministic
  maxRetries: 3,
  validateToolAvailability: true
});
```

### Temperature Settings

- **0.0-0.2**: Deterministic, consistent plans (recommended)
- **0.3-0.5**: Some variation, creative routing
- **0.6-1.0**: High variation, experimental (not recommended)

### Retry Strategy

```typescript
// Retries occur when:
// 1. Invalid JSON response
// 2. Schema validation fails
// 3. Tool validation fails

// Each retry includes error feedback to LLM
// After maxRetries, throws error with details
```

## Template Syntax Reference

### Basic Templates

```typescript
// Access field from previous step
"${step[0].data.field}"

// Access array element
"${step[0].data[0].field}"

// Access nested object
"${step[0].data[0].facility.name}"
```

### Array Mapping Templates

```typescript
// Map over all array elements
"${step[0].data.*.id}"
// → ["S1", "S2", "S3"]

// Map nested field from array
"${step[0].data.*.facility.id}"
// → ["F1", "F2", "F1"]
```

### Common Patterns

```typescript
// Get IDs from previous results
{
  tool: "contaminants_list",
  params: {
    shipment_ids: "${step[0].data.*.id}"  // Array of shipment IDs
  },
  depends_on: [0]
}

// Get single ID from first result
{
  tool: "facilities_get",
  params: {
    id: "${step[0].data[0].facility_id}"  // Single facility ID
  },
  depends_on: [0]
}
```

## Example Queries → Plans

### Example 1: Simple Query

**Query**: `"Get shipments from last week"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "shipments_list",
      "params": {
        "date_from": "2025-10-05",
        "date_to": "2025-10-12",
        "limit": 100
      },
      "depends_on": [],
      "parallel": false
    }
  ],
  "metadata": {
    "query": "Get shipments from last week",
    "timestamp": "2025-10-12T06:00:00.000Z",
    "estimated_duration_ms": 1500
  }
}
```

### Example 2: Filtered Query

**Query**: `"Show me contaminated shipments that were rejected"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "shipments_list",
      "params": {
        "has_contaminants": true,
        "status": "rejected",
        "limit": 100
      },
      "depends_on": [],
      "parallel": false
    }
  ]
}
```

### Example 3: Location-Based Query

**Query**: `"Get facilities in Berlin"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "facilities_list",
      "params": {
        "location": "Berlin"
      },
      "depends_on": [],
      "parallel": false
    }
  ]
}
```

### Example 4: Multi-Step with Dependencies

**Query**: `"Get contaminated shipments and their contaminant details"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "shipments_list",
      "params": {
        "has_contaminants": true,
        "limit": 100
      },
      "depends_on": [],
      "parallel": false
    },
    {
      "tool": "contaminants_list",
      "params": {
        "shipment_ids": "${step[0].data.*.id}"
      },
      "depends_on": [0],
      "parallel": false
    }
  ]
}
```

### Example 5: Location-Based with Nested Data

**Query**: `"Analyse today's contaminants in Hannover"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "facilities_list",
      "params": {
        "location": "Hannover"
      },
      "depends_on": [],
      "parallel": false
    },
    {
      "tool": "contaminants_list",
      "params": {
        "facility_id": "${step[0].data.*.id}",
        "date_from": "2025-10-12",
        "date_to": "2025-10-12"
      },
      "depends_on": [0],
      "parallel": false
    }
  ]
}
```

### Example 6: Parallel Execution

**Query**: `"Get shipments, facilities, and inspections"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "shipments_list",
      "params": { "limit": 100 },
      "parallel": true
    },
    {
      "tool": "facilities_list",
      "params": {},
      "parallel": true
    },
    {
      "tool": "inspections_list",
      "params": { "limit": 100 },
      "parallel": true
    }
  ]
}
```

### Example 7: Complex 3-Step Chain

**Query**: `"Get facilities in Berlin, then their shipments, then check for contaminants"`

**Generated Plan**:
```json
{
  "steps": [
    {
      "tool": "facilities_list",
      "params": { "location": "Berlin" },
      "depends_on": []
    },
    {
      "tool": "shipments_list",
      "params": {
        "facility_id": "${step[0].data.*.id}"
      },
      "depends_on": [0]
    },
    {
      "tool": "contaminants_list",
      "params": {
        "shipment_ids": "${step[1].data.*.id}"
      },
      "depends_on": [1]
    }
  ]
}
```

## Temporal Reference Resolution

The Planner understands natural temporal references:

| Reference | Interpretation | Example |
|-----------|---------------|---------|
| "today" | Current date | `2025-10-12` to `2025-10-12` |
| "yesterday" | Previous day | `2025-10-11` to `2025-10-11` |
| "last week" | 7 days ago to today | `2025-10-05` to `2025-10-12` |
| "this week" | Monday to today | `2025-10-07` to `2025-10-12` |
| "this month" | First of month to today | `2025-10-01` to `2025-10-12` |
| "last 30 days" | 30 days ago to today | `2025-09-12` to `2025-10-12` |

### Temporal Examples

```typescript
// Query: "Get shipments from last week"
// → date_from: "2025-10-05", date_to: "2025-10-12"

// Query: "Show me this week's inspections"
// → date_from: "2025-10-07", date_to: "2025-10-12"

// Query: "Contaminants detected today"
// → date_from: "2025-10-12", date_to: "2025-10-12"
```

## Dependency Resolution Algorithm

```typescript
// Pseudocode for dependency detection

function analyzeDependencies(steps: PlanStep[]): void {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Check if step params reference previous steps
    for (const [key, value] of Object.entries(step.params)) {
      if (value.includes('${step[')) {
        const match = value.match(/\${step\[(\d+)\]/);
        if (match) {
          const depIndex = parseInt(match[1]);
          step.depends_on = step.depends_on || [];
          step.depends_on.push(depIndex);
        }
      }
    }
  }
}

// Validation ensures:
// 1. No circular dependencies
// 2. Dependencies reference valid step indices
// 3. Dependencies come before dependent steps
```

## API Reference

### PlannerAgent Class

```typescript
class PlannerAgent {
  constructor(
    llm: LLMProvider,
    mcpServer?: MCPServer,
    config?: Partial<PlannerConfig>
  );

  async plan(query: string, context?: any): Promise<Plan>;
}
```

### Methods

#### `plan(query, context?)`

Generates an execution plan from a natural language query.

**Parameters**:
- `query` (string): Natural language query
- `context` (any, optional): Memory context for context-aware planning

**Returns**: `Promise<Plan>`

**Throws**:
- `Error`: If plan generation fails after all retries
- `ZodError`: If generated plan doesn't match schema

**Example**:
```typescript
const plan = await planner.plan(
  'Get contaminated shipments from last week'
);

// With context
const plan = await planner.plan(
  'Show me the same for Munich',
  { 
    semantic: [{ text: 'Previous: Berlin facilities', score: 0.9 }],
    entities: ['location:Berlin']
  }
);
```

### Configuration

```typescript
interface PlannerConfig {
  temperature: number;              // LLM temperature (default: 0.1)
  maxRetries: number;              // Max retry attempts (default: 3)
  validateToolAvailability: boolean; // Validate tools (default: true)
}
```

## Code Examples

### Basic Usage

```typescript
import { PlannerAgent } from './agents/planner.js';
import { LLMProvider } from './shared/llm/provider.js';
import { getLLMConfigs } from './shared/llm/config.js';

// Initialize
const llm = new LLMProvider(getLLMConfigs());
const planner = new PlannerAgent(llm);

// Generate plan
const plan = await planner.plan('Get shipments');

console.log(plan);
// {
//   steps: [{ tool: 'shipments_list', params: {...}, ... }],
//   metadata: { query: '...', timestamp: '...', ... }
// }
```

### With Custom Configuration

```typescript
// High creativity planner (not recommended for production)
const creativePlanner = new PlannerAgent(llm, mcpServer, {
  temperature: 0.5,
  maxRetries: 5,
  validateToolAvailability: true
});

const plan = await creativePlanner.plan(
  'Find interesting patterns in the data'
);
```

### Error Handling

```typescript
try {
  const plan = await planner.plan(userQuery);
  console.log('Plan generated successfully');
} catch (error) {
  if (error.message.includes('Failed to generate valid plan')) {
    console.error('LLM could not generate valid plan:', error);
    // Fallback: use default plan or prompt user for clarification
  } else if (error.message.includes('Tool not available')) {
    console.error('Requested tool is not registered');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### With MCP Server for Tool Discovery

```typescript
import { MCPServer } from './mcp/server.js';
import { registerAllTools } from './tools/index.js';

// Initialize MCP server with tools
const mcpServer = new MCPServer('my-app', '1.0.0');
registerAllTools(mcpServer, 'http://localhost:4000/api');

// Planner can discover tools from MCP server
const planner = new PlannerAgent(llm, mcpServer, {
  validateToolAvailability: true  // Will check against MCP server
});

const plan = await planner.plan('Get data');
```

### Context-Aware Planning

```typescript
// Load context from memory
const context = {
  semantic: [
    { text: 'User previously asked about Berlin facilities', score: 0.95 }
  ],
  episodic: [
    { query: 'Get facilities in Berlin', timestamp: '...' }
  ],
  entities: ['location:Berlin', 'facility:F1']
};

// Plan with context
const plan = await planner.plan('Show me their shipments', context);
// Planner understands "their" refers to Berlin facilities
```

## Advanced Features

### Multi-Step Planning

The Planner automatically creates multi-step plans for complex queries:

```typescript
// Query: "Get contaminated shipments from Berlin facilities"
// 
// The Planner recognizes this requires:
// 1. Find facilities in Berlin
// 2. Get shipments from those facilities
// 3. Filter for contaminated ones
//
// Generated plan:
{
  steps: [
    { 
      tool: "facilities_list", 
      params: { location: "Berlin" } 
    },
    { 
      tool: "shipments_list", 
      params: { 
        facility_id: "${step[0].data.*.id}",
        has_contaminants: true
      },
      depends_on: [0]
    }
  ]
}
```

### Parallel Optimization

The Planner identifies opportunities for parallel execution:

```typescript
// Query: "Get shipments, facilities, and inspections"
//
// All three are independent → can run in parallel

{
  steps: [
    { tool: "shipments_list", params: {}, parallel: true },
    { tool: "facilities_list", params: {}, parallel: true },
    { tool: "inspections_list", params: {}, parallel: true }
  ]
}

// Executor will run these simultaneously
```

### Intelligent Parameter Extraction

```typescript
// Query: "Get shipments from October 1st to October 10th going to Hannover"
//
// Planner extracts:
{
  steps: [{
    tool: "shipments_list",
    params: {
      date_from: "2025-10-01",      // Extracted from "October 1st"
      date_to: "2025-10-10",        // Extracted from "October 10th"
      destination: "Hannover"       // Extracted destination filter
    }
  }]
}
```

## Tool Selection Logic

### Selection Criteria

1. **Query keywords** → Tool mapping
   - "shipments" → `shipments_list`
   - "facilities" → `facilities_list`
   - "contaminants" → `contaminants_list`
   - "inspections" → `inspections_list`

2. **Filters mentioned** → Tool parameters
   - "contaminated" → `has_contaminants: true`
   - "rejected" → `status: "rejected"`
   - "high-risk" → `risk_level: "high"`
   - "Berlin" → `location: "Berlin"`

3. **Temporal references** → Date parameters
   - "last week" → `date_from`, `date_to`
   - "today" → `date_from: today, date_to: today`

4. **Aggregation intent** → Multiple tools
   - "compare" → Multiple queries with analysis
   - "trends" → Time-series data
   - "by facility/carrier" → Grouping logic

### Example Tool Selection

```typescript
// Query: "Which carriers have the highest contamination rates?"
//
// Analysis:
// - Need shipment data (has carrier info)
// - Need contamination info (has_contaminants field)
// - Need aggregation (implicit in "highest rates")
//
// Selected tool: shipments_list
// Parameters: { has_contaminants: true }
// Post-processing: Analysis agent will calculate rates by carrier
```

## Validation & Error Handling

### Plan Validation

```typescript
// Validation checks performed:

1. Schema Validation (Zod)
   - steps is array with >=1 items
   - Each step has required fields
   - Types match expected schema

2. Tool Availability
   - All referenced tools exist in MCP server
   - Tool names match exactly

3. Dependency Validation
   - No circular dependencies
   - Dependency indices are valid (0 to steps.length-1)
   - Dependencies reference earlier steps

4. Parameter Validation
   - Template syntax is valid
   - Required parameters present
   - Enum values are valid
```

### Error Messages

```typescript
// Common errors and their meanings:

"Failed to generate valid plan after 3 attempts"
// → LLM couldn't generate valid JSON or plan
// → Check query clarity, try rephrasing

"Tool not available: shipments"
// → Tool name mismatch or not registered
// → Verify tool registration in MCP server

"Invalid dependency index: 5"
// → Plan references non-existent step
// → Usually LLM error, will retry

"Could not extract valid JSON from response"
// → LLM returned non-JSON content
// → Will retry with error feedback
```

## Best Practices

### Writing Effective Queries

✅ **Good Queries**:
```typescript
"Get contaminated shipments from last week"
// Clear intent, specific filters, temporal reference

"Show me high-risk contaminants in Berlin facilities"
// Location specified, risk level clear, entities identified

"Which facilities are near capacity?"
// Clear question, measurable criteria
```

❌ **Problematic Queries**:
```typescript
"Show me stuff"
// Too vague, no clear intent

"Get the data from that thing we talked about"
// Requires context that may not be loaded

"Run analysis on everything"
// Too broad, no specific tools
```

### Optimizing Plans

```typescript
// 1. Be specific about filters
"Get shipments" 
// → might return 1000s of results

"Get shipments from last week with limit 50"
// → returns manageable dataset

// 2. Use temporal references
"Get shipments from 2025-10-01 to 2025-10-12"
// → exact dates

"Get shipments from last week"
// → automatically resolves dates

// 3. Leverage dependencies for efficiency
"Get contaminated shipments, then get their contaminants"
// → Planner creates dependency automatically
```

## Integration Examples

### With Executor

```typescript
// Complete planning + execution flow
const plan = await planner.plan('Get contaminated shipments');
const results = await executor.execute(plan);

console.log('Executed', plan.steps.length, 'steps');
console.log('Results:', results);
```

### With Orchestrator

```typescript
// Planner is used internally by Orchestrator
const response = await orchestrator.handleQuery('Get shipments');

// Orchestrator internally calls:
// 1. planner.plan(query, context)
// 2. executor.execute(plan)
// 3. analyzer.analyze(results)
// 4. summarizer.summarize(analysis)
```

### Custom Tool Registration

```typescript
// Add custom tools that Planner can use
import { BaseTool } from './tools/base-tool.js';

class CustomAnalyticsTool extends BaseTool {
  name = "custom_analytics";
  description = "Custom analytics for specific use case";
  schema = { params: { ... }, returns: { ... } };
  
  async execute(params: any): Promise<ToolResult> {
    // Custom logic
    return this.success(data, executionTime);
  }
}

// Register with MCP server
mcpServer.registerTool(new CustomAnalyticsTool(apiUrl));

// Planner will now include this tool in planning
const plan = await planner.plan('Run custom analytics');
// → plan.steps[0].tool === "custom_analytics"
```

## Testing

### Unit Tests

```typescript
import { PlannerAgent } from './agents/planner.js';
import { LLMProvider } from './shared/llm/provider.js';

describe('PlannerAgent', () => {
  it('should generate valid plan', async () => {
    const mockLLM = {
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          steps: [{ tool: 'shipments_list', params: {} }]
        })
      })
    };

    const planner = new PlannerAgent(mockLLM as any);
    const plan = await planner.plan('test');

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].tool).toBe('shipments_list');
  });
});
```

### Integration Tests

See actual test outputs in [Testing Guide](./testing.md).

## Troubleshooting

### Plan Generation Fails

**Issue**: `Failed to generate valid plan after 3 attempts`

**Solutions**:
1. Check OPENAI_API_KEY is set correctly
2. Verify LLM provider is accessible
3. Try rephrasing query to be more specific
4. Check LLM rate limits
5. Increase `maxRetries` configuration

### Wrong Tools Selected

**Issue**: Plan uses incorrect tools for query

**Solutions**:
1. Be more specific in query
2. Mention explicit tool names if needed
3. Provide context for ambiguous queries
4. Check tool descriptions are clear

### Missing Parameters

**Issue**: Generated plan missing required parameters

**Solutions**:
1. Include all necessary info in query
2. Provide context with missing details
3. Use explicit dates instead of references
4. Verify tool schema has correct required fields

## Performance Considerations

- **Planning Time**: 800-1500ms (mostly LLM call)
- **Retries Add**: ~1s per retry
- **Context Loading**: +100-300ms when loading memory
- **Validation**: Negligible (under 10ms)

**Optimization Tips**:
1. Use low temperature (0.1) for consistent planning
2. Cache common query patterns
3. Provide context to reduce planning complexity
4. Use specific queries to avoid retry loops

## Related Documentation

- [Executor Agent](./executor.md) - Execute plans generated by Planner
- [Orchestrator Agent](./orchestrator.md) - See how Planner fits in pipeline
- [Testing Guide](./testing.md) - See Planner integration test outputs
- [Integration Guide](./integration.md) - Set up Planner in your app

