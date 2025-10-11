/**
 * Default configuration values
 */

import {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY,
  PLANNING_TEMPERATURE,
  DEFAULT_ANOMALY_THRESHOLD,
  DEFAULT_MIN_CONFIDENCE,
  MAX_PARALLEL_EXECUTIONS
} from './config.js';

export const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    env: 'development' as const
  },
  tools: {
    timeout: DEFAULT_TIMEOUT,
    retries: DEFAULT_RETRIES,
    retry_delay: DEFAULT_RETRY_DELAY
  },
  agents: {
    planner: {
      temperature: PLANNING_TEMPERATURE,
      max_retries: DEFAULT_RETRIES,
      validate_tool_availability: true
    },
    executor: {
      max_parallel_executions: MAX_PARALLEL_EXECUTIONS,
      tool_timeout: DEFAULT_TIMEOUT,
      max_retries: DEFAULT_RETRIES,
      retry_delay: DEFAULT_RETRY_DELAY,
      fail_fast: false
    },
    analyzer: {
      anomaly_threshold: DEFAULT_ANOMALY_THRESHOLD,
      min_confidence: DEFAULT_MIN_CONFIDENCE,
      use_llm: true,
      enable_statistical_analysis: true
    },
    summarizer: {
      max_length: 1000,
      format: 'plain' as const,
      include_details: true,
      include_recommendations: true,
      tone: 'professional' as const
    },
    orchestrator: {
      enable_memory: true,
      max_retries: DEFAULT_RETRIES,
      timeout: DEFAULT_TIMEOUT,
      enable_context_loading: true
    }
  }
};

