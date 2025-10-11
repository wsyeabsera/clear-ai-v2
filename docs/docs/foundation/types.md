---
sidebar_position: 1
---

# Types

TypeScript type definitions for the entire Clear AI v2 system. Strict typing ensures compile-time safety, better IDE support, and self-documenting code.

## What Problem Does This Solve?

**Problem:** Runtime errors, unclear contracts, poor developer experience
**Solution:** Strict TypeScript types throughout

## Core Type Categories

### Agent Types (`types/agent.ts`)

```typescript
interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

interface ToolResult {
  success: boolean;
  tool: string;
  data?: any;
  error?: ToolError;
  metadata: {
    executionTime: number;
    timestamp: string;
  };
}
```

### LLM Types (`types/llm.ts`)

```typescript
type LLMProvider = 'openai' | 'groq' | 'ollama';

interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  max_tokens?: number;
}
```

### Memory Types (`types/memory.ts`)

```typescript
interface Memory {
  id: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

type EmbeddingProvider = 'ollama' | 'openai';
```

### Tool Types (`types/tool.ts`)

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: ToolSchema;
  execute: (params: any) => Promise<ToolResult>;
}
```

## Usage

```typescript
import type {
  AgentMessage,
  LLMConfig,
  Memory,
  ToolResult
} from 'clear-ai-v2/shared';

function processMessage(msg: AgentMessage): void {
  // TypeScript knows msg.role is 'system' | 'user' | 'assistant'
  // Autocomplete works perfectly
  // Catches errors at compile time
}
```

## Benefits

✅ Compile-time type checking  
✅ IDE autocomplete  
✅ Self-documenting code  
✅ Refactoring safety  
✅ Prevents runtime errors  

---

**Next:** [Validation](./validation.md)
