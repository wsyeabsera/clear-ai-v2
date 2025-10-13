/**
 * Planner Agent
 * Converts natural language queries into structured, executable plans
 */

import { Plan, Intent } from '../shared/types/agent.js';
import { LLMProvider } from '../shared/llm/provider.js';
import { PlanSchema } from '../shared/validation/schemas.js';
import { ToolRegistry } from '../shared/tool-registry.js';
import { IntentRecognizer } from './planner/intent-recognizer.js';
import { PlanValidator } from './planner/plan-validator.js';

export interface PlannerConfig {
  temperature: number;
  maxRetries: number;
  validateToolAvailability: boolean;
}

export class PlannerAgent {
  private config: PlannerConfig;
  private availableTools: Map<string, any>;
  private intentRecognizer: IntentRecognizer;
  private planValidator: PlanValidator;
  private enableEnhancedPlanner: boolean;

  constructor(
    private llm: LLMProvider,
    private toolRegistry: ToolRegistry,
    config?: Partial<PlannerConfig>
  ) {
    this.config = {
      temperature: 0.1, // Low temperature for deterministic planning
      maxRetries: 3,
      validateToolAvailability: true,
      ...config,
    };

    // Initialize enhanced planner components
    this.intentRecognizer = new IntentRecognizer();
    this.planValidator = new PlanValidator(this.toolRegistry);
    this.enableEnhancedPlanner = process.env.ENABLE_ENHANCED_PLANNER === 'true';

    // Cache available tools from registry
    this.availableTools = new Map();
    this.loadAvailableTools();
    
    if (this.enableEnhancedPlanner) {
      console.log('[PlannerAgent] Enhanced planner intelligence enabled');
    }
  }

  private loadAvailableTools(): void {
    // Load tools from the centralized registry
    // This ensures consistency between planning and validation
    const schemas = this.toolRegistry.getAllToolSchemas();
    
    for (const schema of schemas) {
      this.availableTools.set(schema.name, {
        description: schema.description,
        params: schema.parameters.map(p => p.name),
        paramDetails: schema.parameters.reduce((details, param) => {
          details[param.name] = param.description + (param.required ? ' (REQUIRED)' : ' (optional)');
          return details;
        }, {} as Record<string, string>)
      });
    }
  }

  async plan(query: string, context?: any): Promise<Plan> {
    console.log('[PlannerAgent] Planning for query:', query);

    let intent: Intent | undefined;
    
    // Enhanced planning with intent recognition and validation
    if (this.enableEnhancedPlanner) {
      try {
        // Step 1: Recognize intent
        intent = await this.intentRecognizer.recognizeIntent(query);
        console.log('[PlannerAgent] Recognized intent:', intent);
        
        // Step 2: Generate plan using enhanced approach
        const plan = await this.generateEnhancedPlan(query, intent, context);
        
        // Step 3: Validate plan
        const validation = this.planValidator.validatePlan(plan, intent);
        if (!validation.valid) {
          console.warn('[PlannerAgent] Plan validation warnings:', validation.errors);
          // Continue with warnings for now, but could implement plan fixing
        }
        
        // Step 4: Get suggestions for improvement
        const suggestions = this.planValidator.getPlanSuggestions(plan, intent);
        if (suggestions.length > 0) {
          console.log('[PlannerAgent] Plan suggestions:', suggestions);
        }
        
        return plan;
        
      } catch (error: any) {
        console.error('[PlannerAgent] Enhanced planning failed, falling back to legacy:', error.message);
        // Fall through to legacy planning
      }
    }
    
    // Legacy planning approach
    return this.generateLegacyPlan(query, context);
  }
  
  private async generateEnhancedPlan(query: string, intent: Intent, context?: any): Promise<Plan> {
    // Build enhanced system prompt with intent context
    const systemPrompt = this.buildEnhancedSystemPrompt(intent);
    
    // Add intent context to user prompt
    let userPrompt = `Query: ${query}`;
    userPrompt += `\n\nIntent: ${intent.type}`;
    userPrompt += `\nEntities: ${intent.entities.join(', ')}`;
    userPrompt += `\nOperations: ${intent.operations.join(', ')}`;
    userPrompt += `\nConfidence: ${intent.confidence}`;
    
    if (context && Object.keys(context).length > 0) {
      userPrompt += `\n\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    // Call LLM with enhanced prompt
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
            max_tokens: 1500, // Increased for more detailed plans
          },
        });

        // Extract JSON from response
        const planJson = this.extractJSON(response.content);

        // Validate plan structure
        const plan = PlanSchema.parse(planJson);

        // Enhanced validation
        this.validateEnhancedPlan(plan, intent);

        console.log('[PlannerAgent] Enhanced plan generated successfully');
        return plan;

      } catch (error: any) {
        attempts++;
        console.error(`[PlannerAgent] Enhanced attempt ${attempts}/${this.config.maxRetries} failed:`, error.message);

        if (attempts >= this.config.maxRetries) {
          throw new Error(`Failed to generate enhanced plan after ${attempts} attempts: ${error.message}`);
        }

        // Add error feedback to next attempt
        userPrompt += `\n\n[Previous attempt failed: ${error.message}. Please fix and try again.]`;
      }
    }

    throw new Error('Failed to generate enhanced plan');
  }
  
  private async generateLegacyPlan(query: string, context?: any): Promise<Plan> {
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

        console.log('[PlannerAgent] Legacy plan generated successfully');
        return plan;

      } catch (error: any) {
        attempts++;
        console.error(`[PlannerAgent] Legacy attempt ${attempts}/${this.config.maxRetries} failed:`, error.message);

        if (attempts >= this.config.maxRetries) {
          throw new Error(`Failed to generate valid plan after ${attempts} attempts: ${error.message}`);
        }

        // Add error feedback to next attempt
        userPrompt += `\n\n[Previous attempt failed: ${error.message}. Please fix and try again.]`;
      }
    }

    throw new Error('Failed to generate plan');
  }

  private buildEnhancedSystemPrompt(intent: Intent): string {
    const basePrompt = this.buildSystemPrompt();
    
    // Add intent-specific guidance
    const intentGuidance = this.getIntentGuidance(intent);
    
    return `${basePrompt}

ENHANCED PLANNING MODE:
You are operating in enhanced planning mode with the following context:

INTENT: ${intent.type}
ENTITIES: ${intent.entities.join(', ')}
OPERATIONS: ${intent.operations.join(', ')}
CONFIDENCE: ${intent.confidence}

${intentGuidance}

Generate a plan that fully addresses the intent with high confidence.
Use the most appropriate tools for the entities and operations identified.
Ensure all required parameters are included and step dependencies are correctly set.`;
  }
  
  private getIntentGuidance(intent: Intent): string {
    switch (intent.type) {
      case 'CREATE':
        return `CREATE INTENT GUIDANCE:
- For shipment creation: Use facilities_list first to get facility_id, then shipments_create
- For facility creation: Use facilities_create with all required parameters
- Ensure all required parameters are provided with appropriate values
- Set proper step dependencies for data retrieval before creation`;
        
      case 'READ':
        return `READ INTENT GUIDANCE:
- Use appropriate list tools (shipments_list, facilities_list, contaminants_list, inspections_list)
- Apply filters based on entities and operations mentioned
- For multi-entity queries, create separate steps for each entity
- Use step references to connect related data (e.g., facility_id from facilities to shipments)`;
        
      case 'UPDATE':
        return `UPDATE INTENT GUIDANCE:
- First retrieve current data with appropriate list tools
- Use update tools with proper parameters
- Ensure step dependencies are set correctly`;
        
      case 'DELETE':
        return `DELETE INTENT GUIDANCE:
- First identify items to delete with list tools
- Use delete tools with proper identifiers
- Set step dependencies for identification before deletion`;
        
      case 'ANALYZE':
        return `ANALYZE INTENT GUIDANCE:
- Start with data retrieval using list tools
- Add analytics tools for analysis operations
- For contamination analysis: Use contaminants_list with appropriate filters
- For performance analysis: Use facilities_list and related tools
- Ensure comprehensive data collection for meaningful analysis`;
        
      case 'MONITOR':
        return `MONITOR INTENT GUIDANCE:
- Use list tools to gather current status
- Apply appropriate filters for monitoring scope
- Consider adding date ranges for temporal monitoring
- Use analytics tools for trend analysis if needed`;
        
      default:
        return `Use appropriate tools based on the identified entities and operations.`;
    }
  }
  
  private validateEnhancedPlan(plan: Plan, intent: Intent): void {
    // Use the plan validator for comprehensive validation
    const validation = this.planValidator.validatePlan(plan, intent);
    if (!validation.valid) {
      console.warn('[PlannerAgent] Enhanced plan validation issues:', validation.errors);
    }
    
    // Additional enhanced validations
    this.validateIntentAlignment(plan, intent);
    this.validateOperationSupport(plan, intent);
  }
  
  private validateIntentAlignment(plan: Plan, intent: Intent): void {
    const tools = plan.steps.map(step => step.tool);
    
    // Check if plan tools align with intent using simple pattern matching
    const allTools = this.toolRegistry.getAllToolSchemas();
    const recommendedTools = allTools
      .filter(tool => this.isToolSuitableForIntent(tool.name, intent.type, intent.entities))
      .map(tool => tool.name);
    
    const missingTools = recommendedTools.filter(tool => !tools.includes(tool));
    
    if (missingTools.length > 0) {
      console.warn(`[PlannerAgent] Consider adding these tools for better intent fulfillment: ${missingTools.join(', ')}`);
    }
  }

  private isToolSuitableForIntent(toolName: string, intentType: string, entities: string[]): boolean {
    const toolLower = toolName.toLowerCase();
    const intentLower = intentType.toLowerCase();

    if (intentLower === 'create' && toolLower.includes('create')) return true;
    if (intentLower === 'read' && (toolLower.includes('list') || toolLower.includes('get'))) return true;
    if (intentLower === 'update' && toolLower.includes('update')) return true;
    if (intentLower === 'delete' && toolLower.includes('delete')) return true;

    for (const entity of entities) {
      if (toolLower.includes(entity.toLowerCase())) return true;
    }

    return false;
  }
  
  private validateOperationSupport(plan: Plan, intent: Intent): void {
    const tools = plan.steps.map(step => step.tool);
    
    // Check if plan supports required operations
    for (const operation of intent.operations) {
      if (operation === 'filter_high_risk' && !tools.some(t => t.includes('contaminants'))) {
        console.warn('[PlannerAgent] High-risk filtering requires contaminant tools');
      }
      
      if (operation === 'check_capacity' && !tools.some(t => t.includes('facilities'))) {
        console.warn('[PlannerAgent] Capacity checking requires facility tools');
      }
      
      if (operation === 'analyze_contamination' && !tools.some(t => t.includes('contaminants'))) {
        console.warn('[PlannerAgent] Contamination analysis requires contaminant tools');
      }
    }
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

