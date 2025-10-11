# Shared Library Summary

## Overview

The shared library (`src/shared/`) provides a comprehensive foundation for agent-related code, utilities, and LLM provider integrations for the Clear AI v2 system.

## Structure

```
src/shared/
├── types/              # TypeScript type definitions
│   ├── agent.ts        # Agent types (Plan, ToolResult, Analysis, etc.)
│   ├── llm.ts          # LLM provider types
│   ├── memory.ts       # Memory system types
│   ├── common.ts       # Common/generic types
│   └── index.ts        # Barrel exports
├── utils/              # Utility functions
│   ├── date.ts         # Date/time utilities
│   ├── validation.ts   # Validation helpers
│   ├── formatting.ts   # String/data formatting
│   ├── retry.ts        # Retry logic with backoff
│   ├── errors.ts       # Custom error classes
│   └── index.ts        # Barrel exports
├── constants/          # System constants
│   ├── config.ts       # Configuration constants
│   ├── messages.ts     # Error/success messages
│   ├── defaults.ts     # Default values
│   └── index.ts        # Barrel exports
├── llm/                # LLM provider layer
│   ├── provider.ts     # Main provider with fallback logic
│   ├── adapters/
│   │   ├── openai.ts   # OpenAI adapter
│   │   ├── anthropic.ts# Anthropic adapter
│   │   ├── groq.ts     # Groq adapter
│   │   └── ollama.ts   # Ollama adapter (mistral:latest)
│   ├── config.ts       # LLM configuration setup
│   └── index.ts        # Barrel exports
└── index.ts            # Main barrel export
```

## Type Definitions

### Agent Types (`types/agent.ts`)
- **Plan, PlanStep, PlanMetadata** - Planning structures
- **ToolResult, ToolResultMetadata, ErrorDetails** - Execution results
- **Analysis, Insight, Entity, Relationship, Anomaly** - Analysis outputs
- **FinalResponse, ResponseMetadata** - Final responses

### LLM Types (`types/llm.ts`)
- **LLMProvider** - Union type: 'openai' | 'anthropic' | 'groq' | 'ollama'
- **LLMConfig, LLMRequest, LLMMessage, LLMResponse** - LLM interactions
- **TokenUsage, LLMMetadata, LLMProviderAdapter** - Provider interfaces

### Memory Types (`types/memory.ts`)
- **EpisodicEvent, EventType, EventRelationships** - Neo4j episodic memory
- **SemanticRecord, SemanticMetadata, SemanticQuery** - Pinecone semantic memory

### Common Types (`types/common.ts`)
- **Result<T, E>** - Generic result wrapper
- **PaginationParams, PaginatedResult<T>** - Pagination support
- **DateRange, Metadata** - Common data structures
- **SystemConfig** - Complete system configuration with all sub-configs

## Utilities

### Date Utilities (`utils/date.ts`)
- `formatDate(date: Date): string` - Format to YYYY-MM-DD
- `parseTemporalReference(reference: string): DateRange` - Parse "today", "yesterday", "last week", etc.
- `getDaysAgo(days: number): Date` - Get date N days ago
- `isDateInRange(date: string, range: DateRange): boolean` - Check date in range
- `getCurrentTimestamp(): string` - Get current ISO timestamp

### Validation Utilities (`utils/validation.ts`)
- `validate<T>(schema: ZodSchema<T>, data: unknown): T` - Validate with Zod
- `safeValidate<T>()` - Safe validation returning result object
- `isValidEmail(email: string): boolean` - Email validation
- `isValidUrl(url: string): boolean` - URL validation
- `isValidISODate(date: string): boolean` - ISO date validation
- `isValidUUID(uuid: string): boolean` - UUID validation

### Formatting Utilities (`utils/formatting.ts`)
- `formatNumber(num: number): string` - Format with commas
- `formatPercentage(value: number, decimals?: number): string` - Format percentage
- `formatDuration(ms: number): string` - Human-readable duration
- `truncate(str: string, maxLength: number): string` - Truncate strings
- `capitalize(str: string): string` - Capitalize first letter
- `toTitleCase(str: string): string` - Convert to title case
- `formatBytes(bytes: number): string` - Human-readable bytes
- `prettyJSON(obj: any): string` - Pretty print JSON

### Retry Utilities (`utils/retry.ts`)
- `withRetry<T>(operation, options): Promise<T>` - Retry with exponential backoff
- `sleep(ms: number): Promise<void>` - Sleep utility
- `withTimeout<T>(promise, timeoutMs, errorMessage): Promise<T>` - Timeout wrapper

### Error Utilities (`utils/errors.ts`)
- `ClearAIError` - Base error class with JSON serialization
- `ToolExecutionError` - Tool execution failures
- `PlanGenerationError` - Plan generation failures
- `LLMProviderError` - LLM provider failures
- `MemoryError` - Memory operation failures
- `ValidationError` - Validation failures
- `wrapError(error: unknown): ClearAIError` - Wrap unknown errors

## Constants

### Configuration (`constants/config.ts`)
- Timeouts, retries, delays
- LLM temperature defaults (planning: 0.1, analyzing: 0.5, summarizing: 0.7)
- Memory defaults
- Analysis thresholds

### Messages (`constants/messages.ts`)
- `ERROR_MESSAGES` - Standard error messages
- `SUCCESS_MESSAGES` - Standard success messages

### Defaults (`constants/defaults.ts`)
- `DEFAULT_CONFIG` - Complete default system configuration

## LLM Provider Layer

### Main Provider (`llm/provider.ts`)

The `LLMProvider` class implements automatic fallback logic:

```typescript
const provider = new LLMProvider(configs);
const response = await provider.generate(request);
```

**Fallback Strategy:**
1. Tries each provider in order
2. Checks `isAvailable()` before attempting
3. Automatically falls back on failure
4. Throws `LLMProviderError` if all providers fail

### Adapters

#### OpenAI Adapter (`llm/adapters/openai.ts`)
- Model: `gpt-4-turbo-preview` (default)
- Uses official `openai` package
- Tracks token usage
- Supports temperature, max_tokens, top_p

#### Anthropic Adapter (`llm/adapters/anthropic.ts`)
- Model: `claude-3-5-sonnet-20241022` (default)
- Uses `@anthropic-ai/sdk` package
- Handles system messages separately
- Tracks token usage

#### Groq Adapter (`llm/adapters/groq.ts`)
- Model: `mixtral-8x7b-32768` (default)
- Uses OpenAI-compatible API
- Base URL: `https://api.groq.com/openai/v1`
- Tracks token usage

#### Ollama Adapter (`llm/adapters/ollama.ts`)
- Model: `mistral:latest` (default)
- Uses local Ollama server
- Base URL: `http://localhost:11434` (configurable)
- Checks availability via `/api/tags` endpoint (2s timeout)
- Formats messages into single prompt string

### Configuration (`llm/config.ts`)

```typescript
import { getLLMConfigs } from './shared/llm/config.js';

const configs = getLLMConfigs(); // Returns array based on available API keys
const provider = new LLMProvider(configs);
```

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - Override default model
- `ANTHROPIC_API_KEY` - Anthropic API key
- `ANTHROPIC_MODEL` - Override default model
- `GROQ_API_KEY` - Groq API key
- `GROQ_MODEL` - Override default model
- `OLLAMA_URL` - Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - Override default model (default: `mistral:latest`)

## Testing

### Test Structure

```
src/tests/shared/
├── utils/
│   ├── date.test.ts         # 17 tests
│   ├── validation.test.ts   # 12 tests
│   ├── formatting.test.ts   # 26 tests
│   ├── retry.test.ts        # 10 tests
│   └── errors.test.ts       # 11 tests
└── llm/
    ├── provider.test.ts     # 5 tests
    └── adapters.test.ts     # 18 tests
```

### Test Coverage

**Overall: 84.74% statement coverage, 87.71% function coverage**

| Component | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| **Overall** | 84.74% | 59.09% | 87.71% | 84.82% |
| LLM Provider | 89.28% | 57.14% | 100% | 88.88% |
| Ollama Adapter | 100% | 86.66% | 100% | 100% |
| Utils | 100% | 89.58% | 100% | 100% |

**99 tests, all passing**

### Running Tests

```bash
# Run all shared library tests
yarn test src/tests/shared

# Run with coverage
yarn test src/tests/shared --coverage

# Run specific test file
yarn test src/tests/shared/utils/date.test.ts

# Watch mode
yarn test:watch src/tests/shared
```

## Usage Examples

### Import Types

```typescript
import {
  Plan,
  ToolResult,
  Analysis,
  FinalResponse,
  LLMProvider,
  LLMProviderType
} from './shared/index.js';
```

### Use Utilities

```typescript
import {
  formatDate,
  parseTemporalReference,
  withRetry,
  formatDuration,
  ClearAIError
} from './shared/index.js';

// Parse temporal references
const dateRange = parseTemporalReference('last week');
// { date_from: '2025-10-04', date_to: '2025-10-11' }

// Retry with backoff
const result = await withRetry(
  () => fetchData(),
  { maxRetries: 3, baseDelay: 1000, exponential: true }
);

// Format duration
console.log(formatDuration(1500)); // "1.5s"
```

### Use LLM Provider

```typescript
import { LLMProvider, getLLMConfigs } from './shared/llm/index.js';

// Initialize provider with auto-config
const configs = getLLMConfigs();
const llm = new LLMProvider(configs);

// Generate response (with automatic fallback)
const response = await llm.generate({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ],
  config: {
    temperature: 0.7,
    max_tokens: 500
  }
});

console.log(response.content);
console.log(`Used: ${response.provider} (${response.model})`);
console.log(`Tokens: ${response.usage?.total_tokens}`);
console.log(`Latency: ${response.metadata.latency_ms}ms`);
```

### Custom Error Handling

```typescript
import {
  ClearAIError,
  ToolExecutionError,
  LLMProviderError,
  wrapError
} from './shared/utils/errors.js';

try {
  // Your operation
} catch (error) {
  if (error instanceof ToolExecutionError) {
    console.error('Tool failed:', error.details.tool);
  } else if (error instanceof LLMProviderError) {
    console.error('LLM failed:', error.details.provider);
  } else {
    // Wrap unknown errors
    const wrapped = wrapError(error);
    console.error(wrapped.toJSON());
  }
}
```

## Benefits

1. **Type Safety** - Strict TypeScript types across the entire system
2. **No Circular Dependencies** - All modules import from shared, not each other
3. **Single Source of Truth** - Types defined once, used everywhere
4. **Consistent Behavior** - Same utilities used by all agents
5. **Automatic Fallback** - LLM provider with built-in redundancy
6. **Comprehensive Testing** - 99 tests with 84.74% coverage
7. **Easy to Extend** - Add new utilities, types, or providers easily
8. **Well Documented** - JSDoc comments on all public APIs

## Next Steps

The shared library is ready for use by:
1. **Planner Agent** - Uses types, LLM provider, date parsing
2. **Executor Agent** - Uses types, retry logic, error handling
3. **Analyzer Agent** - Uses types, LLM provider, formatting
4. **Summarizer Agent** - Uses types, LLM provider, formatting
5. **Orchestrator** - Uses all types, error handling, utilities

## Dependencies

**Required npm packages (already installed):**
- `openai` - OpenAI SDK
- `@anthropic-ai/sdk` - Anthropic SDK
- `axios` - HTTP client (for Ollama)
- `zod` - Schema validation

**No additional dependencies needed.**

