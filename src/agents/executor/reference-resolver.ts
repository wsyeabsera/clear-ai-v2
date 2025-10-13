/**
 * Step Reference Resolver
 * Resolves template references like ${step[N].data.field} from cached step results
 */

import { StepResultCache } from './step-cache.js';

export interface ResolveResult {
  resolved: any;
  success: boolean;
  error?: string;
}

export class StepReferenceResolver {
  private static readonly REFERENCE_PATTERN = /\$\{step\[(\d+)\]\.([^}]+)\}/g;
  
  /**
   * Resolve all step references in parameters
   */
  resolveReferences(params: any, cache: StepResultCache): ResolveResult {
    try {
      const resolved = this.resolveValue(params, cache);
      return { resolved, success: true };
    } catch (error: any) {
      return { 
        resolved: params, 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * Recursively resolve references in any value type
   */
  private resolveValue(value: any, cache: StepResultCache): any {
    if (typeof value === 'string') {
      return this.resolveStringReferences(value, cache);
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.resolveValue(item, cache));
    }
    
    if (typeof value === 'object' && value !== null) {
      const resolved: any = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveValue(val, cache);
      }
      return resolved;
    }
    
    return value;
  }
  
  /**
   * Resolve step references in string templates
   */
  private resolveStringReferences(str: string, cache: StepResultCache): any {
    // Check if string contains any step references
    if (!str.includes('${step[')) {
      return str;
    }
    
    return str.replace(StepReferenceResolver.REFERENCE_PATTERN, (_, stepIndex, path) => {
      const index = parseInt(stepIndex);
      
      if (!cache.has(index)) {
        throw new Error(`Step ${index} not found in cache. Available steps: ${cache.getAvailableSteps().join(', ')}`);
      }
      
      const stepResult = cache.get(index)!;
      
      if (!stepResult.success) {
        throw new Error(`Step ${index} failed: ${stepResult.error || 'Unknown error'}`);
      }
      
      return this.getNestedValue(stepResult.data, path);
    });
  }
  
  /**
   * Navigate nested object/array path and extract value
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path || path === '') return obj;
    
    // Parse path into tokens: .field, [index], .*
    const tokens: Array<{ type: 'field' | 'index' | 'wildcard'; value: string | number }> = [];
    
    // Match .field, [index], or .*
    const tokenRegex = /\.([a-zA-Z_][a-zA-Z0-9_]*|\*)|(\[(\d+)\])/g;
    let match;
    
    while ((match = tokenRegex.exec(path)) !== null) {
      if (match[1] !== undefined) {
        // .field or .*
        if (match[1] === '*') {
          tokens.push({ type: 'wildcard', value: '*' });
        } else {
          tokens.push({ type: 'field', value: match[1] });
        }
      } else if (match[3] !== undefined) {
        // [index]
        tokens.push({ type: 'index', value: parseInt(match[3]) });
      }
    }
    
    let current = obj;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      
      if (token.type === 'wildcard') {
        // Wildcard: collect from all array elements
        if (!Array.isArray(current)) {
          throw new Error(`Wildcard used on non-array at path: ${path}`);
        }
        
        // Get remaining tokens
        const remainingTokens = tokens.slice(i + 1);
        if (remainingTokens.length === 0) {
          return current;
        }
        
        // Apply remaining path to each element
        return current.map((item: any) => {
          let result = item;
          for (const t of remainingTokens) {
            if (!t) continue;
            if (t.type === 'field') {
              result = result?.[t.value as string];
            } else if (t.type === 'index') {
              result = result?.[t.value as number];
            }
          }
          return result;
        });
      } else if (token.type === 'field') {
        if (current && typeof current === 'object' && token.value in current) {
          current = current[token.value as string];
        } else {
          throw new Error(`Path not found: ${path} at field '${token.value}'`);
        }
      } else if (token.type === 'index') {
        if (Array.isArray(current)) {
          const index = token.value as number;
          if (index >= 0 && index < current.length) {
            current = current[index];
          } else {
            throw new Error(`Array index ${index} out of bounds (array length: ${current.length})`);
          }
        } else {
          throw new Error(`Trying to index non-array with [${token.value}] at path: ${path}`);
        }
      }
    }
    
    return current;
  }
  
  /**
   * Validate that all step references in parameters can be resolved
   */
  validateReferences(params: any, cache: StepResultCache): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      this.validateValue(params, cache, errors);
    } catch (error: any) {
      errors.push(error.message);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Recursively validate references in any value type
   */
  private validateValue(value: any, cache: StepResultCache, errors: string[]): void {
    if (typeof value === 'string') {
      this.validateStringReferences(value, cache, errors);
    } else if (Array.isArray(value)) {
      value.forEach(item => this.validateValue(item, cache, errors));
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(val => this.validateValue(val, cache, errors));
    }
  }
  
  /**
   * Validate step references in string templates
   */
  private validateStringReferences(str: string, cache: StepResultCache, errors: string[]): void {
    const matches = [...str.matchAll(StepReferenceResolver.REFERENCE_PATTERN)];
    
    for (const match of matches) {
      if (!match[1] || !match[2]) {
        errors.push('Invalid step reference format');
        continue;
      }
      
      const stepIndex = parseInt(match[1]);
      const path = match[2];
      
      if (!cache.has(stepIndex)) {
        errors.push(`Step ${stepIndex} not found in cache. Available steps: ${cache.getAvailableSteps().join(', ')}`);
        continue;
      }
      
      const stepResult = cache.get(stepIndex)!;
      
      if (!stepResult.success) {
        errors.push(`Step ${stepIndex} failed: ${stepResult.error || 'Unknown error'}`);
        continue;
      }
      
      try {
        this.getNestedValue(stepResult.data, path);
      } catch (error: any) {
        errors.push(`Invalid path in step ${stepIndex}: ${error.message}`);
      }
    }
  }
}
