/**
 * Standard error and success messages
 */

export const ERROR_MESSAGES = {
  TOOL_NOT_FOUND: (tool: string) => `Tool not found: ${tool}`,
  PLAN_INVALID: 'Generated plan is invalid',
  NO_RESULTS: 'No results found',
  ALL_PROVIDERS_FAILED: 'All LLM providers failed',
  MEMORY_UNAVAILABLE: 'Memory system unavailable',
  TIMEOUT: (operation: string) => `${operation} timed out`,
  MAX_RETRIES: (operation: string) => `${operation} failed after maximum retries`,
  INVALID_CONFIG: (field: string) => `Invalid configuration: ${field}`,
  MISSING_API_KEY: (provider: string) => `Missing API key for ${provider}`,
  NETWORK_ERROR: (operation: string) => `Network error during ${operation}`,
};

export const SUCCESS_MESSAGES = {
  PLAN_GENERATED: 'Plan generated successfully',
  EXECUTION_COMPLETE: 'Execution completed successfully',
  ANALYSIS_COMPLETE: 'Analysis completed successfully',
  MEMORY_STORED: 'Data stored in memory',
  PROVIDER_AVAILABLE: (provider: string) => `${provider} provider is available`,
  FALLBACK_SUCCESS: (provider: string) => `Fallback to ${provider} successful`,
};

