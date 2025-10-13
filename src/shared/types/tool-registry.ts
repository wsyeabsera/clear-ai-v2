/**
 * Tool Registry Types
 * Defines interfaces for the centralized tool registry system
 */

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  enum?: string[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: ParameterDefinition[];
  requiredParameters: string[];
  returns: string;
  examples?: ToolExample[];
}

export interface ToolExample {
  input: Record<string, any>;
  output: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
