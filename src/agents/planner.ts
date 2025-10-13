/**
 * Planner Agent
 * Converts natural language queries into structured, executable plans
 */

import { Plan } from '../shared/types/agent.js';
import { LLMProvider } from '../shared/llm/provider.js';
import { PlanSchema } from '../shared/validation/schemas.js';
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
    _mcpServer?: MCPServer,
    config?: Partial<PlannerConfig>
  ) {
    this.config = {
      temperature: 0.1, // Low temperature for deterministic planning
      maxRetries: 3,
      validateToolAvailability: true,
      ...config,
    };

    // Cache available tools
    this.availableTools = new Map();
    this.loadAvailableTools();
  }

  private loadAvailableTools(): void {
    // Hardcode the available tools for now
    // In production, this would be loaded from MCP server
    this.availableTools.set('shipments_list', {
      description: 'Query shipments with filters',
      params: ['date_from', 'date_to', 'facility_id', 'status', 'has_contaminants', 'waste_type', 'carrier', 'limit'],
      paramDetails: {
        facility_id: 'Single facility ID. Use template: ${step[N].data[0].id}',
        date_from: 'Start date in ISO 8601 format (YYYY-MM-DD)',
        date_to: 'End date in ISO 8601 format (YYYY-MM-DD)',
        status: 'Shipment status: pending|in_transit|delivered|rejected',
        has_contaminants: 'Boolean filter for contaminated shipments'
      }
    });
    this.availableTools.set('facilities_list', {
      description: 'Query waste management facilities',
      params: ['location', 'type', 'min_capacity', 'ids'],
      paramDetails: {
        location: 'Location name for partial matching (e.g., "Hannover")',
        type: 'Facility type: sorting|processing|disposal',
        min_capacity: 'Minimum capacity in tons',
        ids: 'Comma-separated facility IDs'
      }
    });
    this.availableTools.set('contaminants_list', {
      description: 'Query detected contaminants. Use shipment_ids (comma-separated) or facility_id (single)',
      params: ['shipment_ids', 'facility_id', 'date_from', 'date_to', 'type', 'risk_level'],
      paramDetails: {
        shipment_ids: 'Comma-separated shipment IDs. Use template: ${step[N].data.*.id}',
        facility_id: 'Single facility ID. Use template: ${step[N].data[0].id}',
        date_from: 'Start date for detection in ISO 8601 format',
        date_to: 'End date for detection in ISO 8601 format',
        type: 'Contaminant type (Lead, Mercury, Plastic, etc.)',
        risk_level: 'Risk level: low|medium|high|critical'
      }
    });
    this.availableTools.set('inspections_list', {
      description: 'Query inspection records',
      params: ['date_from', 'date_to', 'status', 'facility_id', 'shipment_id', 'has_risk_contaminants', 'limit'],
      paramDetails: {
        facility_id: 'Single facility ID. Use template: ${step[N].data[0].id}',
        shipment_id: 'Single shipment ID. Use template: ${step[N].data[0].id}',
        date_from: 'Start date in ISO 8601 format',
        date_to: 'End date in ISO 8601 format',
        status: 'Inspection status: accepted|rejected|pending',
        has_risk_contaminants: 'Boolean filter for high-risk contaminants'
      }
    });
  }

  async plan(query: string, context?: any): Promise<Plan> {
    console.log('[PlannerAgent] Planning for query:', query);

    // Build system prompt with tool descriptions
    const systemPrompt = this.buildSystemPrompt();

    // Add context if available
    let userPrompt = `Query: ${query}`;
    if (context && Object.keys(context).length > 0) {
      userPrompt += `\n\nContext: ${JSON.stringify(context, null, 2)}`;
    }

    // Call LLM to generate plan
    let attempts = 0;

    while (attempts < this.config.maxRetries) {
      try {
        const response = await this.llm.generate({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          config: {
            temperature: this.config.temperature,
            max_tokens: 1000,
          },
        });

        // Extract JSON from response
        const planJson = this.extractJSON(response.content);

        // Validate plan
        const plan = PlanSchema.parse(planJson);

        // Additional validation
        if (this.config.validateToolAvailability) {
          this.validateToolsAvailable(plan);
        }

        // Quality validation for common mistakes
        this.validatePlanQuality(plan, query);

        console.log('[PlannerAgent] Plan generated successfully');
        return plan;

      } catch (error: any) {
        attempts++;
        console.error(`[PlannerAgent] Attempt ${attempts}/${this.config.maxRetries} failed:`, error.message);

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
        const paramDetails = info.paramDetails ?
          '\n  Parameter Details:\n' + Object.entries(info.paramDetails)
            .map(([param, detail]) => `    - ${param}: ${detail}`)
            .join('\n') : '';
        return `- ${name}: ${info.description}\n  Parameters: ${info.params.join(', ')}${paramDetails}`;
      })
      .join('\n\n');

    return `You are a planning agent for a waste management analysis system.

Your task is to convert user queries into structured execution plans using available tools.

AVAILABLE TOOLS:
${toolDescriptions}

IMPORTANT: Tool names use underscores like shipments_list, facilities_list, contaminants_list, inspections_list

TEMPLATE SYNTAX RULES:
✓ CORRECT: "\${step[0].data.*.id}" - Maps all IDs from array
✗ WRONG: "\${step[0].data.ids}" - Field doesn't exist
✓ CORRECT: "\${step[0].data[0].facility_id}" - Single value from first element
✗ WRONG: "\${step[0].data.facility_id}" - Missing array index
✓ CORRECT: "\${step[0].data.*.facility_id}" - Maps facility_id from all array elements

MULTI-STEP PATTERNS:

Pattern A: Entity + Related Data
Query: "Get [entity] and their [related data]"
Examples:
- "Get sorting facilities and their contaminants"
- "Get contaminated shipments and inspection details"
- "Get rejected shipments and their contaminant details"
Plan: Step 1 queries entity, Step 2 queries related with dependency

Pattern B: Location-Based Nested Query
Query: "Get [data] in [location]"
Examples:
- "Get contaminants in Hannover"
- "Get inspections at Berlin facility"
- "Get contaminants in Hannover facilities"
Plan: Step 1 queries facilities by location, Step 2 queries data by facility_id

Pattern C: Filtered + Details
Query: "Get [filtered items] and show [details]"
Examples:
- "Get rejected shipments and their contaminant details"
- "Get high-risk contaminants and their inspection records"
Plan: Step 1 applies filter, Step 2 fetches related details

TOOL PARAMETERS (use exact names):

facilities_list:
- location (string): partial match
- type (string): sorting|processing|disposal
- min_capacity (number)
- ids (string): comma-separated

shipments_list:
- date_from, date_to (ISO 8601)
- facility_id (string): single ID
- status (string): pending|in_transit|delivered|rejected
- has_contaminants (boolean)
- waste_type, carrier (string)

contaminants_list:
- shipment_ids (string): comma-separated IDs ← USE THIS, NOT "ids"
- facility_id (string): single ID
- date_from, date_to (ISO 8601)
- type (string): contaminant type
- risk_level (string): low|medium|high|critical

inspections_list:
- date_from, date_to (ISO 8601)
- status (string): accepted|rejected|pending
- facility_id (string): single ID
- shipment_id (string): single ID
- has_risk_contaminants (boolean)

RULES:
1. Return ONLY valid JSON, no additional text
2. Use ISO 8601 date format (YYYY-MM-DD)
3. Set "depends_on" array for steps that need data from previous steps
4. Set "parallel: true" for steps that can run simultaneously
5. Use template syntax \${step[N].data.field} to reference previous results
6. Tool names must match exactly: shipments_list, facilities_list, contaminants_list, inspections_list
7. Use correct parameter names: "shipment_ids" not "ids" for contaminants_list
8. Use correct template syntax: "\${step[0].data.*.id}" not "\${step[0].data.ids}"

TEMPORAL REFERENCES:
- "last week" = 7 days ago to today
- "this week" = Monday to today
- "this month" = first day of month to today
- "today" = today's date

ENHANCED EXAMPLES:

EXAMPLE 1: Multi-Step with Array Mapping
Query: "Get sorting facilities and their contaminants"
{
  "steps": [
    {
      "tool": "facilities_list",
      "params": { "type": "sorting" },
      "depends_on": [],
      "parallel": false
    },
    {
      "tool": "contaminants_list",
      "params": {
        "facility_id": "\${step[0].data[0].id}"
      },
      "depends_on": [0],
      "parallel": false
    }
  ]
}

EXAMPLE 2: Shipments to Contaminants
Query: "Get contaminated shipments and their contaminant details"
{
  "steps": [
    {
      "tool": "shipments_list",
      "params": { "has_contaminants": true },
      "depends_on": [],
      "parallel": false
    },
    {
      "tool": "contaminants_list",
      "params": {
        "shipment_ids": "\${step[0].data.*.id}"
      },
      "depends_on": [0],
      "parallel": false
    }
  ]
}

EXAMPLE 3: Location-Based Query
Query: "Get contaminants in Hannover facilities"
{
  "steps": [
    {
      "tool": "facilities_list",
      "params": { "location": "Hannover" },
      "depends_on": [],
      "parallel": false
    },
    {
      "tool": "contaminants_list",
      "params": {
        "facility_id": "\${step[0].data[0].id}"
      },
      "depends_on": [0],
      "parallel": false
    }
  ]
}

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
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to find JSON object in text
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch && objectMatch[0]) {
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

  private validatePlanQuality(plan: Plan, query: string): void {
    for (const step of plan.steps) {
      // Check for common template syntax errors
      const paramsStr = JSON.stringify(step.params);
      // Error: Using .ids instead of .*.id
      if (paramsStr.includes('.ids}')) {
        throw new Error('Invalid template: use ${step[N].data.*.id} not .ids');
      }
      // Error: contaminants_list with wrong parameter
      if (step.tool === 'contaminants_list') {
        if (step.params.ids) {
          throw new Error('contaminants_list uses "shipment_ids" not "ids"');
        }
      }
      // Error: Using wrong template syntax for single values
      if (paramsStr.includes('${step[') && paramsStr.includes('.data.') && !paramsStr.includes('.data.*') && !paramsStr.includes('.data[')) {
        console.warn(`[Planner] Step ${step.tool} may have incorrect template syntax - check if array indexing is needed`);
      }
      // Warning: Query suggests multi-step but only one step
      const needsMultiStep = /and (their|its|the)/.test(query.toLowerCase());
      if (needsMultiStep && plan.steps.length === 1) {
        console.warn('[Planner] Query suggests multi-step plan but only 1 step generated');
      }
      // Warning: Missing dependency when using template
      if (paramsStr.includes('${step[') && (!step.depends_on || step.depends_on.length === 0)) {
        console.warn(`[Planner] Step ${step.tool} uses template but has no dependencies`);
      }
    }
  }

}

