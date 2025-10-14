/**
 * System configuration constants
 */

// Timeouts and retries
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_RETRIES = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PARALLEL_EXECUTIONS = 5;

// LLM configuration
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 1000;
export const PLANNING_TEMPERATURE = 0.1; // Lower for deterministic plans
export const ANALYZING_TEMPERATURE = 0.5; // Medium for structured analysis
export const SUMMARIZING_TEMPERATURE = 0.7; // Higher for creative summaries
export const CHAIN_OF_THOUGHT_TEMPERATURE = 0.4; // Between planning and summarizing

// Enhanced agent configuration
export const ANALYZER_MAX_REASONING_STEPS = 5;
export const SUMMARIZER_MAX_REASONING_STEPS = 5;

// Memory configuration
export const DEFAULT_SEMANTIC_TOP_K = 5;
export const DEFAULT_EPISODIC_LIMIT = 10;

// Analysis configuration
export const DEFAULT_ANOMALY_THRESHOLD = 2.0; // Standard deviations
export const DEFAULT_MIN_CONFIDENCE = 0.7; // 70% confidence minimum

