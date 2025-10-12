/**
 * Planner Agent
 * Converts natural language queries into structured, executable plans
 */

import { Plan, PlanStep } from '../shared/types/agent.js';
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
    private mcpServer?: MCPServer,
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
    this.availableTools.set('shipments', {
      description: 'Query shipments with filters',
      params: ['date_from', 'date_to', 'facility_id', 'status', 'has_contaminants', 'waste_type', 'carrier'],
    });
    this.availableTools.set('facilities', {
      description: 'Query waste management facilities',
      params: ['location', 'type', 'min_capacity', 'ids'],
    });
    this.availableTools.set('contaminants-detected', {
      description: 'Query detected contaminants',
      params: ['shipment_ids', 'facility_id', 'date_from', 'date_to', 'type', 'risk_level'],
    });
    this.availableTools.set('inspections', {
      description: 'Query inspection records',
      params: ['date_from', 'date_to', 'status', 'facility_id', 'shipment_id', 'has_risk_contaminants'],
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
          date_to: formatDate(today),
        };

      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          date_from: formatDate(yesterday),
          date_to: formatDate(yesterday),
        };

      case 'last week':
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return {
          date_from: formatDate(lastWeek),
          date_to: formatDate(today),
        };

      case 'this week':
        const monday = new Date(today);
        monday.setDate(monday.getDate() - monday.getDay() + 1);
        return {
          date_from: formatDate(monday),
          date_to: formatDate(today),
        };

      case 'this month':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          date_from: formatDate(firstDay),
          date_to: formatDate(today),
        };

      default:
        throw new Error(`Unknown temporal reference: ${reference}`);
    }
  }
}

