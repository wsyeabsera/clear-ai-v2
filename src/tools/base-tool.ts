// Base Tool Class - Common functionality for all tools
import axios, { AxiosResponse } from "axios";
import { MCPTool, ToolResult } from "../shared/types/tool.js";
import { ToolSchema as RegistryToolSchema } from "../shared/types/tool-registry.js";

export abstract class BaseTool implements MCPTool {
  abstract name: string;
  abstract description: string;
  abstract schema: MCPTool["schema"];

  constructor(protected apiBaseUrl?: string) {}

  abstract execute(params: Record<string, any>): Promise<ToolResult>;

  /**
   * Convert tool schema to registry format
   */
  toRegistrySchema(): RegistryToolSchema {
    const parameters = Object.entries(this.schema.params).map(([name, paramDef]) => ({
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
      name: this.name,
      description: this.description,
      parameters,
      requiredParameters,
      returns: this.schema.returns.description
    };
  }

  // HTTP Methods (only available if apiBaseUrl is provided)
  protected async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<AxiosResponse<T>> {
    if (!this.apiBaseUrl) {
      throw new Error('API base URL not configured for this tool');
    }
    const queryParams = params ? new URLSearchParams(params).toString() : "";
    const url = `${this.apiBaseUrl}${endpoint}${queryParams ? `?${queryParams}` : ""}`;
    return axios.get<T>(url);
  }

  protected async post<T = any>(
    endpoint: string,
    data: any
  ): Promise<AxiosResponse<T>> {
    if (!this.apiBaseUrl) {
      throw new Error('API base URL not configured for this tool');
    }
    return axios.post<T>(`${this.apiBaseUrl}${endpoint}`, data);
  }

  protected async put<T = any>(
    endpoint: string,
    data: any
  ): Promise<AxiosResponse<T>> {
    if (!this.apiBaseUrl) {
      throw new Error('API base URL not configured for this tool');
    }
    return axios.put<T>(`${this.apiBaseUrl}${endpoint}`, data);
  }

  protected async delete<T = any>(
    endpoint: string
  ): Promise<AxiosResponse<T>> {
    if (!this.apiBaseUrl) {
      throw new Error('API base URL not configured for this tool');
    }
    return axios.delete<T>(`${this.apiBaseUrl}${endpoint}`);
  }

  // Response Formatting
  protected success(data: any, executionTime: number): ToolResult {
    return {
      success: true,
      tool: this.name,
      data,
      metadata: {
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };
  }

  protected error(error: any, executionTime: number): ToolResult {
    // Log detailed error for debugging
    console.error(`[${this.name}] Tool execution failed:`, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
    });

    return {
      success: false,
      tool: this.name,
      error: {
        code: error.response?.status?.toString() || error.code || "UNKNOWN",
        message: error.response?.data?.error?.message || error.message,
        details: {
          url: error.config?.url,
          statusCode: error.response?.status,
          apiError: error.response?.data,
        }
      },
      metadata: {
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Validation Helpers
  protected validateRequired(
    params: Record<string, any>,
    requiredFields: string[]
  ): { valid: boolean; missing?: string[] } {
    const missing = requiredFields.filter((field) => !params[field]);
    return missing.length > 0 ? { valid: false, missing } : { valid: true };
  }

  protected validateEnum(
    value: any,
    allowedValues: any[],
    fieldName: string
  ): { valid: boolean; error?: string } {
    if (value && !allowedValues.includes(value)) {
      return {
        valid: false,
        error: `Invalid ${fieldName}. Must be one of: ${allowedValues.join(", ")}`,
      };
    }
    return { valid: true };
  }
}

