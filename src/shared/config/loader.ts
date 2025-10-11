/**
 * Centralized configuration loader
 * Loads and validates system configuration from environment variables
 */

import { SystemConfig } from '../types/common.js';
import { getLLMConfigs } from '../llm/config.js';
import {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY,
  MAX_PARALLEL_EXECUTIONS,
  DEFAULT_ANOMALY_THRESHOLD,
  DEFAULT_MIN_CONFIDENCE,
  PLANNING_TEMPERATURE,
} from '../constants/config.js';

/**
 * Load system configuration from environment
 */
export function loadConfig(): SystemConfig {
  return {
    server: loadServerConfig(),
    tools: loadToolsConfig(),
    llm: loadLLMSystemConfig(),
    memory: loadMemorySystemConfig(),
    agents: loadAgentsConfig(),
    features: loadFeaturesConfig(),
  };
}

/**
 * Load server configuration
 */
function loadServerConfig() {
  return {
    name: process.env.SERVER_NAME || 'clear-ai-v2',
    version: process.env.SERVER_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  };
}

/**
 * Load tools configuration
 */
function loadToolsConfig() {
  return {
    api_base_url: process.env.WASTEER_API_URL || 'http://localhost:4000',
    timeout: parseInt(process.env.TOOL_TIMEOUT || String(DEFAULT_TIMEOUT)),
    retries: parseInt(process.env.TOOL_RETRIES || String(DEFAULT_RETRIES)),
    retry_delay: parseInt(process.env.TOOL_RETRY_DELAY || String(DEFAULT_RETRY_DELAY)),
  };
}

/**
 * Load LLM system configuration
 */
function loadLLMSystemConfig() {
  const configs = getLLMConfigs();
  
  if (configs.length === 0) {
    throw new Error('No LLM providers configured. Please set OPENAI_API_KEY, GROQ_API_KEY, or configure Ollama.');
  }
  
  return {
    primary: configs[0]!,
    fallbacks: configs.slice(1),
  };
}

/**
 * Load memory system configuration
 */
function loadMemorySystemConfig() {
  return {
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
    },
    pinecone: {
      api_key: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || '',
      index_name: process.env.PINECONE_INDEX || 'clear-ai-v2',
    },
  };
}

/**
 * Load agents configuration
 */
function loadAgentsConfig() {
  return {
    planner: {
      temperature: parseFloat(process.env.PLANNER_TEMPERATURE || String(PLANNING_TEMPERATURE)),
      max_retries: parseInt(process.env.PLANNER_MAX_RETRIES || String(DEFAULT_RETRIES)),
      validate_tool_availability: process.env.PLANNER_VALIDATE_TOOLS !== 'false',
    },
    executor: {
      max_parallel_executions: parseInt(
        process.env.EXECUTOR_MAX_PARALLEL || String(MAX_PARALLEL_EXECUTIONS)
      ),
      tool_timeout: parseInt(process.env.EXECUTOR_TOOL_TIMEOUT || String(DEFAULT_TIMEOUT)),
      max_retries: parseInt(process.env.EXECUTOR_MAX_RETRIES || String(DEFAULT_RETRIES)),
      retry_delay: parseInt(process.env.EXECUTOR_RETRY_DELAY || String(DEFAULT_RETRY_DELAY)),
      fail_fast: process.env.EXECUTOR_FAIL_FAST === 'true',
    },
    analyzer: {
      anomaly_threshold: parseFloat(
        process.env.ANALYZER_ANOMALY_THRESHOLD || String(DEFAULT_ANOMALY_THRESHOLD)
      ),
      min_confidence: parseFloat(
        process.env.ANALYZER_MIN_CONFIDENCE || String(DEFAULT_MIN_CONFIDENCE)
      ),
      use_llm: process.env.ANALYZER_USE_LLM !== 'false',
      enable_statistical_analysis: process.env.ANALYZER_ENABLE_STATS !== 'false',
    },
    summarizer: {
      max_length: parseInt(process.env.SUMMARIZER_MAX_LENGTH || '500'),
      format: (process.env.SUMMARIZER_FORMAT || 'plain') as 'plain' | 'markdown' | 'json',
      include_details: process.env.SUMMARIZER_INCLUDE_DETAILS !== 'false',
      include_recommendations: process.env.SUMMARIZER_INCLUDE_RECOMMENDATIONS === 'true',
      tone: (process.env.SUMMARIZER_TONE || 'professional') as 'professional' | 'casual' | 'technical',
    },
    orchestrator: {
      enable_memory: process.env.ORCHESTRATOR_ENABLE_MEMORY !== 'false',
      max_retries: parseInt(process.env.ORCHESTRATOR_MAX_RETRIES || String(DEFAULT_RETRIES)),
      timeout: parseInt(process.env.ORCHESTRATOR_TIMEOUT || String(DEFAULT_TIMEOUT * 2)),
      enable_context_loading: process.env.ORCHESTRATOR_ENABLE_CONTEXT !== 'false',
    },
  };
}

/**
 * Load features configuration
 */
function loadFeaturesConfig() {
  return {
    enable_memory: process.env.ENABLE_MEMORY !== 'false',
    enable_context_loading: process.env.ENABLE_CONTEXT_LOADING !== 'false',
    max_parallel_executions: parseInt(
      process.env.MAX_PARALLEL_EXECUTIONS || String(MAX_PARALLEL_EXECUTIONS)
    ),
  };
}

/**
 * Validate required configuration
 * Throws error if critical config is missing
 */
export function validateConfig(config: SystemConfig): void {
  const errors: string[] = [];
  
  // Validate tools config
  if (!config.tools.api_base_url) {
    errors.push('WASTEER_API_URL is required');
  }
  
  // Validate memory config if memory is enabled
  if (config.features.enable_memory) {
    if (!config.memory.neo4j.password) {
      errors.push('NEO4J_PASSWORD is required when memory is enabled');
    }
    
    if (!config.memory.pinecone.api_key) {
      errors.push('PINECONE_API_KEY is required when memory is enabled');
    }
    
    if (!config.memory.pinecone.environment) {
      errors.push('PINECONE_ENVIRONMENT is required when memory is enabled');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Load and validate configuration
 */
export function loadAndValidateConfig(): SystemConfig {
  const config = loadConfig();
  
  // Only validate if not in test environment
  if (config.server.env !== 'test') {
    validateConfig(config);
  }
  
  return config;
}

/**
 * Get configuration value with type safety
 */
export function getConfigValue<T = any>(
  config: SystemConfig,
  path: string,
  defaultValue?: T
): T {
  const keys = path.split('.');
  let current: any = config;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration path not found: ${path}`);
    }
  }
  
  return current as T;
}

