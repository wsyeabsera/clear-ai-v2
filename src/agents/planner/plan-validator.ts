/**
 * Plan Validator
 * Validates plan completeness, correctness, and feasibility
 */

import { Plan, PlanStep } from '../../shared/types/agent.js';
import { Intent } from '../../shared/types/agent.js';
import { ToolRegistry } from '../../shared/tool-registry.js';
import { ValidationResult } from '../../shared/types/tool-registry.js';

export class PlanValidator {
  private toolRegistry: ToolRegistry;
  
  constructor(toolRegistry: ToolRegistry) {
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
      if (step) {
        const stepErrors = this.validateStep(step, i);
        errors.push(...stepErrors.map(error => `Step ${i}: ${error}`));
      }
    }
    
    // Check plan completeness
    const completenessErrors = this.checkPlanCompleteness(plan, intent);
    errors.push(...completenessErrors);
    
    // Check plan structure
    const structureErrors = this.checkPlanStructure(plan);
    errors.push(...structureErrors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private validateStep(step: PlanStep, stepIndex: number): string[] {
    const errors: string[] = [];
    
    // Check if tool exists
    const schema = this.toolRegistry.getToolSchema(step.tool);
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
    if (step.depends_on) {
      for (const dep of step.depends_on) {
        if (dep >= stepIndex) {
          errors.push(`Dependency ${dep} is invalid (must be less than current step ${stepIndex})`);
        }
        if (dep < 0) {
          errors.push(`Dependency ${dep} is invalid (must be non-negative)`);
        }
      }
    }
    
    // Check for circular dependencies
    const circularDeps = this.checkCircularDependencies(stepIndex, step.depends_on || []);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependency detected: ${circularDeps.join(' -> ')}`);
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
        if (intent.entities.includes('facility') && !tools.includes('facilities_create')) {
          errors.push('Plan cannot create facility without facilities_create tool');
        }
        break;
        
      case 'READ':
        if (intent.entities.includes('shipment') && !tools.some(t => t.includes('shipments'))) {
          errors.push('Plan cannot read shipments without shipment-related tools');
        }
        if (intent.entities.includes('facility') && !tools.some(t => t.includes('facilities'))) {
          errors.push('Plan cannot read facilities without facility-related tools');
        }
        if (intent.entities.includes('contaminant') && !tools.some(t => t.includes('contaminants'))) {
          errors.push('Plan cannot read contaminants without contaminant-related tools');
        }
        break;
        
      case 'UPDATE':
        if (!tools.some(t => t.includes('update'))) {
          errors.push('Plan cannot update without update tools');
        }
        break;
        
      case 'DELETE':
        if (!tools.some(t => t.includes('delete'))) {
          errors.push('Plan cannot delete without delete tools');
        }
        break;
        
      case 'ANALYZE':
        // Analysis plans should have data retrieval and analytics tools
        const hasDataTools = tools.some(t => t.includes('list') || t.includes('get'));
        const hasAnalyticsTools = tools.some(t => t.includes('analytics'));
        
        if (!hasDataTools) {
          errors.push('Analysis plan needs data retrieval tools');
        }
        if (!hasAnalyticsTools && intent.entities.includes('contaminant')) {
          errors.push('Contaminant analysis plan needs analytics tools');
        }
        break;
        
      case 'MONITOR':
        // Monitoring plans should have data retrieval tools
        if (!tools.some(t => t.includes('list') || t.includes('get'))) {
          errors.push('Monitoring plan needs data retrieval tools');
        }
        break;
    }
    
    // Check if operations are supported
    for (const operation of intent.operations) {
      if (operation === 'filter_high_risk') {
        const hasContaminantTools = tools.some(t => t.includes('contaminants'));
        if (!hasContaminantTools) {
          errors.push('High-risk filtering requires contaminant tools');
        }
      }
      
      if (operation === 'check_capacity') {
        const hasFacilityTools = tools.some(t => t.includes('facilities'));
        if (!hasFacilityTools) {
          errors.push('Capacity checking requires facility tools');
        }
      }
    }
    
    return errors;
  }
  
  private checkPlanStructure(plan: Plan): string[] {
    const errors: string[] = [];
    
    // Check for proper dependency ordering
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (step?.depends_on) {
        for (const dep of step.depends_on) {
          if (dep >= i) {
            errors.push(`Step ${i} depends on future step ${dep}`);
          }
        }
      }
    }
    
    // Check for orphaned steps (steps that no other step depends on)
    const hasDependencies = new Set<number>();
    for (const step of plan.steps) {
      if (step.depends_on) {
        for (const dep of step.depends_on) {
          hasDependencies.add(dep);
        }
      }
    }
    
    // All steps except the first should either be independent or have dependencies
    for (let i = 1; i < plan.steps.length; i++) {
      if (!hasDependencies.has(i)) {
        // This step is not depended upon by any other step
        // This might be intentional for parallel execution, so we just log a warning
        const stepTool = plan.steps[i]?.tool || 'unknown';
        console.warn(`Step ${i} (${stepTool}) is not depended upon by any other step`);
      }
    }
    
    return errors;
  }
  
  private checkCircularDependencies(_stepIndex: number, dependencies: number[]): number[] {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    const hasCycle = (node: number): number[] => {
      visited.add(node);
      recursionStack.add(node);
      
      const step = this.getStepByIndex(node);
      if (step?.depends_on) {
        for (const dep of step.depends_on) {
          if (!visited.has(dep)) {
            const cycle = hasCycle(dep);
            if (cycle.length > 0) {
              return cycle;
            }
          } else if (recursionStack.has(dep)) {
            return [dep, node]; // Found cycle
          }
        }
      }
      
      recursionStack.delete(node);
      return [];
    };
    
    for (const dep of dependencies) {
      const cycle = hasCycle(dep);
      if (cycle.length > 0) {
        return cycle;
      }
    }
    
    return [];
  }
  
  private getStepByIndex(_index: number): PlanStep | undefined {
    // This is a simplified implementation
    // In a real scenario, we'd need access to the full plan context
    return undefined;
  }
  
  /**
   * Validate that a plan can be executed successfully
   */
  validateExecutionFeasibility(plan: Plan): ValidationResult {
    const errors: string[] = [];
    
    // Check if all required tools are available
    for (const step of plan.steps) {
      const schema = this.toolRegistry.getToolSchema(step.tool);
      if (!schema) {
        errors.push(`Tool ${step.tool} is not available`);
      }
    }
    
    // Check parameter feasibility
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (step) {
        const feasibilityErrors = this.checkParameterFeasibility(step, i);
        errors.push(...feasibilityErrors.map(error => `Step ${i}: ${error}`));
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private checkParameterFeasibility(step: PlanStep, _stepIndex: number): string[] {
    const errors: string[] = [];
    
    // Check for template references that might not resolve
    const paramsStr = JSON.stringify(step.params);
    const templateMatches = paramsStr.match(/\$\{step\[(\d+)\]\./g);
    
        if (templateMatches) {
          for (const match of templateMatches) {
            const stepRefMatch = match.match(/\$\{step\[(\d+)\]/);
            if (stepRefMatch && stepRefMatch[1]) {
              const referencedStep = parseInt(stepRefMatch[1]);
              if (referencedStep >= _stepIndex) {
                errors.push(`Template references future step ${referencedStep}`);
              }
            }
          }
        }
    
    // Check for impossible parameter combinations
    if (step.tool === 'contaminants_list') {
      if (step.params.shipment_ids && step.params.facility_id) {
        errors.push('Cannot specify both shipment_ids and facility_id for contaminants_list');
      }
    }
    
    return errors;
  }
  
  /**
   * Get suggestions for improving a plan
   */
  getPlanSuggestions(plan: Plan, intent: Intent): string[] {
    const suggestions: string[] = [];
    
    // Suggest missing tools based on intent
    const tools = plan.steps.map(step => step.tool);
    const availableTools = this.getToolsForIntent(intent.type, intent.entities);
    
    for (const tool of availableTools) {
      if (!tools.includes(tool)) {
        suggestions.push(`Consider adding ${tool} for better intent fulfillment`);
      }
    }
    
    // Suggest parameter improvements
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (step) {
        const stepSuggestions = this.getStepSuggestions(step, i);
        suggestions.push(...stepSuggestions.map(s => `Step ${i}: ${s}`));
      }
    }
    
    return suggestions;
  }
  
  private getStepSuggestions(step: PlanStep, _stepIndex: number): string[] {
    const suggestions: string[] = [];
    
    // Suggest adding useful optional parameters
    const schema = this.toolRegistry.getToolSchema(step.tool);
    if (schema) {
      for (const param of schema.parameters) {
        if (!param.required && !(param.name in step.params)) {
          if (param.name === 'limit' && step.tool.includes('list')) {
            suggestions.push(`Consider adding limit parameter to control result size`);
          }
          if (param.name === 'date_from' && step.tool.includes('list')) {
            suggestions.push(`Consider adding date_from parameter to filter by date range`);
          }
        }
      }
    }
    
    // Suggest parallel execution for independent steps
    if (!step.depends_on || step.depends_on.length === 0) {
      suggestions.push(`This step can potentially run in parallel with other independent steps`);
    }
    
    return suggestions;
  }

  /**
   * Get tools suitable for a given intent
   */
  private getToolsForIntent(intentType: string, entities: string[]): string[] {
    const allTools = this.toolRegistry.getAllToolSchemas();
    const suitableTools: string[] = [];

    for (const tool of allTools) {
      // Simple matching logic based on tool name and intent
      if (this.isToolSuitableForIntent(tool.name, intentType, entities)) {
        suitableTools.push(tool.name);
      }
    }

    return suitableTools;
  }

  /**
   * Check if a tool is suitable for a given intent
   */
  private isToolSuitableForIntent(toolName: string, intentType: string, entities: string[]): boolean {
    // Simple matching based on tool name patterns
    const toolLower = toolName.toLowerCase();
    const intentLower = intentType.toLowerCase();

    // Match by intent type
    if (intentLower === 'create' && toolLower.includes('create')) return true;
    if (intentLower === 'read' && (toolLower.includes('list') || toolLower.includes('get'))) return true;
    if (intentLower === 'update' && toolLower.includes('update')) return true;
    if (intentLower === 'delete' && toolLower.includes('delete')) return true;

    // Match by entities
    for (const entity of entities) {
      if (toolLower.includes(entity.toLowerCase())) return true;
    }

    return false;
  }
}
