/**
 * Template resolver for parameter interpolation
 * Resolves template strings like ${step[0].results.*.id} from previous step results
 */

import { ToolResult } from '../types/agent.js';

/**
 * Resolve template parameters using previous step results
 * 
 * Supports:
 * - ${step[0].data} - Access data from step 0
 * - ${step[0].data.*.id} - Map array items to their id property
 * - ${step[1].data[0].name} - Access nested properties
 * 
 * @param params - Parameters object potentially containing template strings
 * @param results - Array of tool results from previous steps
 * @returns Resolved parameters with templates replaced
 */
export function resolveTemplateParams(
  params: Record<string, any>,
  results: ToolResult[]
): Record<string, any> {
  const resolved: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = resolveValue(value, results);
  }
  
  return resolved;
}

/**
 * Resolve a single value (string, array, object, or primitive)
 */
function resolveValue(value: any, results: ToolResult[]): any {
  if (typeof value === 'string') {
    return resolveTemplateString(value, results);
  }
  
  if (Array.isArray(value)) {
    return value.map(item => resolveValue(item, results));
  }
  
  if (value && typeof value === 'object') {
    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveValue(v, results);
    }
    return resolved;
  }
  
  return value;
}

/**
 * Resolve template string like ${step[0].data.*.id}
 */
function resolveTemplateString(template: string, results: ToolResult[]): any {
  // Check if this is a template string
  const templateRegex = /^\$\{(.+)\}$/;
  const match = template.match(templateRegex);
  
  if (!match) {
    return template; // Not a template, return as-is
  }
  
  const expression = match[1]!;
  return evaluateExpression(expression, results);
}

/**
 * Evaluate template expression like step[0].data.*.id
 */
function evaluateExpression(expression: string, results: ToolResult[]): any {
  try {
    // Parse the expression - split on . but preserve array notation
    // e.g., "step[0].data[0].id" becomes ["step[0]", "data", "[0]", "id"]
    const rawParts = expression.split('.');
    const parts: string[] = [];
    
    rawParts.forEach((part, index) => {
      // Don't split the first part (step[N]) even if it has brackets
      if (index === 0 || !part.includes('[')) {
        parts.push(part);
      } else {
        // Split parts like "data[0]" into ["data", "[0]"]
        const arrayMatch = part.match(/^([^\[]+)(\[.+\])$/);
        if (arrayMatch) {
          parts.push(arrayMatch[1]!, arrayMatch[2]!);
        } else {
          parts.push(part);
        }
      }
    });
    
    // First part should be step[N]
    const stepMatch = parts[0]!.match(/^step\[(\d+)\]$/);
    if (!stepMatch) {
      throw new Error(`Invalid expression: ${expression}. Must start with step[N]`);
    }
    
    const stepIndex = parseInt(stepMatch[1]!);
    
    // Check if step exists
    if (stepIndex >= results.length || !results[stepIndex]) {
      throw new Error(`Step ${stepIndex} not found in results`);
    }
    
    const result = results[stepIndex];
    
    // Check if step was successful
    if (!result.success) {
      throw new Error(`Step ${stepIndex} failed, cannot resolve template`);
    }
    
    // Start with the result object itself
    let current: any = result;
    
    // Process remaining parts
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]!;
      
      // Handle wildcard mapping: *.property
      if (part === '*') {
        if (!Array.isArray(current)) {
          throw new Error(`Cannot use wildcard on non-array value at ${parts.slice(0, i + 1).join('.')}`);
        }
        
        // Check if there's a property to map
        if (i + 1 < parts.length) {
          const property = parts[i + 1]!;
          current = current.map(item => {
            if (item && typeof item === 'object') {
              return item[property];
            }
            return undefined;
          }).filter(v => v !== undefined);
          i++; // Skip next part since we processed it
        } else {
          // Just return the array
          return current;
        }
      }
      // Handle array index: [0]
      else if (part.startsWith('[') && part.endsWith(']')) {
        const index = parseInt(part.slice(1, -1));
        if (isNaN(index)) {
          throw new Error(`Invalid array index: ${part}`);
        }
        
        if (!Array.isArray(current)) {
          throw new Error(`Cannot use array index on non-array value`);
        }
        
        current = current[index]!;
      }
      // Handle property access
      else {
        if (!current || typeof current !== 'object') {
          throw new Error(`Cannot access property ${part} on ${typeof current}`);
        }
        current = current[part]!;
      }
      
      // Check if value is undefined
      if (current === undefined) {
        throw new Error(`Property ${part} is undefined at ${parts.slice(0, i + 1).join('.')}`);
      }
    }
    
    return current;
  } catch (error: any) {
    throw new Error(`Failed to resolve template "${expression}": ${error.message}`);
  }
}

/**
 * Check if a value contains any template strings
 */
export function hasTemplates(value: any): boolean {
  if (typeof value === 'string') {
    return /\$\{.+\}/.test(value);
  }
  
  if (Array.isArray(value)) {
    return value.some(item => hasTemplates(item));
  }
  
  if (value && typeof value === 'object') {
    return Object.values(value).some(v => hasTemplates(v));
  }
  
  return false;
}

/**
 * Extract all template references from a value
 * Returns array of expressions like ['step[0].data', 'step[1].results.*.id']
 */
export function extractTemplates(value: any): string[] {
  const templates: string[] = [];
  
  if (typeof value === 'string') {
    const regex = /\$\{(.+?)\}/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      templates.push(match[1]!);
    }
  }
  
  if (Array.isArray(value)) {
    value.forEach(item => {
      templates.push(...extractTemplates(item));
    });
  }
  
  if (value && typeof value === 'object') {
    Object.values(value).forEach(v => {
      templates.push(...extractTemplates(v));
    });
  }
  
  return templates;
}

/**
 * Get step dependencies from template expressions
 * Returns array of step indices that need to be completed first
 */
export function getStepDependencies(params: Record<string, any>): number[] {
  const templates = extractTemplates(params);
  const dependencies = new Set<number>();
  
  templates.forEach(template => {
    const stepMatch = template.match(/^step\[(\d+)\]/);
    if (stepMatch) {
      dependencies.add(parseInt(stepMatch[1]!));
    }
  });
  
  return Array.from(dependencies).sort((a, b) => a - b);
}

