/**
 * Main barrel export for shared library
 */

// Types
export * from './types/index.js';

// Utilities
export * from './utils/index.js';

// Constants
export * from './constants/index.js';

// Validation
export * from './validation/index.js';

// Configuration
export * from './config/index.js';

// Memory System
export * from './memory/index.js';

// LLM Provider (with renamed type to avoid conflict)
export type { LLMProviderType } from './llm/index.js';
export { LLMProvider } from './llm/provider.js';
export * from './llm/config.js';
export * from './llm/adapters/openai.js';
export * from './llm/adapters/groq.js';
export * from './llm/adapters/ollama.js';

