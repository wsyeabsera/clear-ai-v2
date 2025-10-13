/**
 * Centralized Tool Registry
 * Discovers, registers, and manages all tools in the system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BaseTool } from '../tools/base-tool.js';
import { ToolSchema, ValidationResult, ParameterDefinition } from './types/tool-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, BaseTool> = new Map();
  private schemas: Map<string, ToolSchema> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Discover and register all tools from the tools directory
   */
  async discoverTools(toolsPath: string, apiBaseUrl?: string): Promise<void> {
    if (this.initialized) {
      console.log('[ToolRegistry] Already initialized, skipping discovery');
      return;
    }

    console.log(`[ToolRegistry] Discovering tools from: ${toolsPath}`);
    
    try {
      await this.scanToolsDirectory(toolsPath, apiBaseUrl);
      this.initialized = true;
      console.log(`[ToolRegistry] ✓ Discovered and registered ${this.tools.size} tools`);
    } catch (error: any) {
      console.error('[ToolRegistry] Failed to discover tools:', error.message);
      throw error;
    }
  }

  /**
   * Recursively scan the tools directory and register all tools
   */
  private async scanToolsDirectory(dirPath: string, apiBaseUrl?: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Tools directory not found: ${dirPath}`);
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await this.scanToolsDirectory(fullPath, apiBaseUrl);
      } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
        // Import and register tool classes
        await this.registerToolFromFile(fullPath, apiBaseUrl);
      }
    }
  }

  /**
   * Register a tool from a TypeScript file
   */
  private async registerToolFromFile(filePath: string, apiBaseUrl?: string): Promise<void> {
    try {
      // Convert file path to module path relative to dist/shared/
      const relativePath = path.relative(path.join(__dirname, '../'), filePath);
      const modulePath = '../' + relativePath;
      
      // Import the module
      const module = await import(modulePath);
      
      // Find tool classes (classes that extend BaseTool)
      for (const [_, exportedClass] of Object.entries(module)) {
        if (this.isToolClass(exportedClass)) {
          // Try to instantiate with API URL if provided
          let toolInstance: BaseTool;
          try {
            if (apiBaseUrl) {
              toolInstance = new (exportedClass as any)(apiBaseUrl) as BaseTool;
            } else {
              // Try without parameters first
              toolInstance = new (exportedClass as any)() as BaseTool;
            }
          } catch (error: any) {
            console.warn(`[ToolRegistry] Failed to instantiate tool from ${filePath}:`, error.message);
            continue;
          }
          
          await this.registerTool(toolInstance);
        }
      }
    } catch (error: any) {
      console.warn(`[ToolRegistry] Failed to register tool from ${filePath}:`, error.message);
      // Don't throw - continue with other tools
    }
  }

  /**
   * Check if a class is a tool class (extends BaseTool)
   */
  private isToolClass(exportedClass: any): boolean {
    return (
      typeof exportedClass === 'function' &&
      exportedClass.prototype &&
      (exportedClass.prototype instanceof BaseTool || 
       exportedClass.name?.includes('Tool'))
    );
  }

  /**
   * Register a single tool instance
   */
  private async registerTool(tool: BaseTool): Promise<void> {
    const toolName = tool.name;
    
    if (this.tools.has(toolName)) {
      console.warn(`[ToolRegistry] Tool ${toolName} already registered, skipping`);
      return;
    }

    // Store tool instance
    this.tools.set(toolName, tool);

    // Extract and store schema
    const schema = this.extractToolSchema(tool);
    this.schemas.set(toolName, schema);

    console.log(`[ToolRegistry] Registered tool: ${toolName}`);
  }

  /**
   * Extract schema from a tool instance
   */
  private extractToolSchema(tool: BaseTool): ToolSchema {
    const toolSchema = tool.schema;
    
    const parameters: ParameterDefinition[] = Object.entries(toolSchema.params).map(([name, paramDef]) => ({
      name,
      type: paramDef.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
      required: paramDef.required || false,
      description: paramDef.description,
      enum: paramDef.enum || undefined,
      min: paramDef.min || undefined,
      max: paramDef.max || undefined
    }));

    const requiredParameters = parameters
      .filter(p => p.required)
      .map(p => p.name);

    return {
      name: tool.name,
      description: tool.description,
      parameters,
      requiredParameters,
      returns: toolSchema.returns.description
    };
  }

  /**
   * Get tool schema by name
   */
  getToolSchema(name: string): ToolSchema | undefined {
    return this.schemas.get(name);
  }

  /**
   * Get tool instance by name
   */
  getToolInstance(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool schemas
   */
  getAllToolSchemas(): ToolSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Validate parameters against tool schema
   */
  validateParameters(toolName: string, params: Record<string, any>): ValidationResult {
    const schema = this.getToolSchema(toolName);
    if (!schema) {
      return {
        valid: false,
        errors: [`Tool not found: ${toolName}`]
      };
    }

    const errors: string[] = [];

    // Check required parameters
    for (const requiredParam of schema.requiredParameters) {
      if (!(requiredParam in params)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
      }
    }

    // Validate parameter types and constraints
    for (const param of schema.parameters) {
      const value = params[param.name];
      
      if (value !== undefined) {
        // Type validation
        if (!this.validateParameterType(value, param.type)) {
          errors.push(`Parameter ${param.name} must be of type ${param.type}, got ${typeof value}`);
        }

        // Enum validation
        if (param.enum && !param.enum.includes(value)) {
          errors.push(`Parameter ${param.name} must be one of: ${param.enum.join(', ')}`);
        }

        // Range validation for numbers
        if (param.type === 'number' && typeof value === 'number') {
          if (param.min !== undefined && value < param.min) {
            errors.push(`Parameter ${param.name} must be >= ${param.min}`);
          }
          if (param.max !== undefined && value > param.max) {
            errors.push(`Parameter ${param.name} must be <= ${param.max}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Get tools by category/type
   */
  getToolsByCategory(category: string): ToolSchema[] {
    return this.getAllToolSchemas().filter(schema => 
      schema.name.includes(category.toLowerCase())
    );
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalTools: this.tools.size,
      initialized: this.initialized,
      toolNames: this.getToolNames()
    };
  }
}
