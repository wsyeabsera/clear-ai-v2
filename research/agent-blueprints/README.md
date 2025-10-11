# Clear AI v2 - Agent Blueprints

**Production-Ready Agent Specifications Built on Shared Library**

Version: 2.0  
Last Updated: October 11, 2025  
Status: Ready for Implementation

---

## 📋 Overview

This directory contains detailed blueprints for the four core agents in the Clear AI v2 system. Unlike the original blueprints, these are **production-ready specifications** that fully leverage the shared library infrastructure already implemented in `src/shared/`.

### What Makes These Different?

1. **Shared Library Integration** - Every code example imports and uses actual shared library modules
2. **Production-Ready** - Real TypeScript implementations, not pseudocode
3. **Type-Safe** - Proper interfaces with Zod validation throughout
4. **Error Handling** - Comprehensive retry logic, timeouts, and fallback strategies
5. **Observable** - Integrated logging, metrics, and tracing
6. **Tested** - Complete unit and integration test examples
7. **Optimized** - Caching, batching, and parallelization strategies

---

## 📚 Agent Blueprints

### [01. Planner Agent](./01-planner-agent.md)
**Converts natural language queries into structured execution plans**

- Query understanding with intent classification
- Temporal reference parsing ("last week" → date ranges)
- LLM-based plan generation with fallback
- Plan validation with Zod schemas
- Plan caching for performance

**Key Shared Library Components:**
- `types/agent.ts` - Plan, PlanStep interfaces
- `llm/provider.ts` - Multi-provider LLM
- `validation/schemas.ts` - PlanSchema
- `utils/date.ts` - parseTemporalReference
- `intent/classifier.ts` - IntentClassifier

---

### [02. Executor Agent](./02-executor-agent.md)
**Executes plans with dependency resolution and parallelization**

- Dependency graph construction and resolution
- Parallel and sequential execution
- Template parameter resolution (`${step[0].data.*.id}`)
- Retry logic with exponential backoff
- Timeout handling and circuit breakers

**Key Shared Library Components:**
- `types/tool.ts` - MCPTool interface
- `utils/template.ts` - resolveTemplateParams
- `utils/retry.ts` - withRetry, withTimeout
- `validation/schemas.ts` - ToolResultSchema
- `workflow/execution/executor.ts` - Execution utilities

---

### [03. Analyzer Agent](./03-analyzer-agent.md)
**Extracts insights, detects anomalies, and identifies patterns**

- Rule-based and LLM-based analysis modes
- Statistical anomaly detection
- Entity extraction with relationships
- Confidence scoring for insights
- Domain-specific analyzers

**Key Shared Library Components:**
- `types/agent.ts` - Analysis, Insight, Anomaly interfaces
- `confidence/scorer.ts` - ConfidenceScorer
- `utils/statistics.ts` - Statistical utilities
- `validation/schemas.ts` - AnalysisSchema
- `context/compression/entity-extractor.ts` - Entity extraction

---

### [04. Orchestrator Agent](./04-orchestrator-agent.md)
**Coordinates the entire agent pipeline**

- Agent pipeline coordination
- Memory integration (episodic + semantic)
- Error recovery and fallback strategies
- Performance monitoring and metrics
- Request lifecycle management

**Key Shared Library Components:**
- `memory/manager.ts` - MemoryManager
- `context/manager.ts` - ContextManager
- `response/builder.ts` - ResponseBuilder
- `observability/langfuse.ts` - Observability
- `progress/tracker.ts` - ProgressTracker
- `utils/errors.ts` - Error handling

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   User Query                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               ORCHESTRATOR AGENT                        │
│  ┌───────────────────────────────────────────────┐     │
│  │  1. Load Context (Memory)                     │     │
│  │  2. Plan (Planner Agent)                      │     │
│  │  3. Execute (Executor Agent)                  │     │
│  │  4. Analyze (Analyzer Agent)                  │     │
│  │  5. Summarize (Summarizer Agent)              │     │
│  │  6. Store Results (Memory)                    │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌─────────┐    ┌────────┐
    │  LLM   │    │ Memory  │    │  MCP   │
    │Provider│    │ Manager │    │ Server │
    └────────┘    └─────────┘    └────────┘
```

---

## 🎯 Implementation Order

Follow this order for implementation:

1. **Start Here:** Review shared library components in `src/shared/`
2. **Planner Agent** - Query understanding and plan generation
3. **Executor Agent** - Plan execution and tool orchestration
4. **Analyzer Agent** - Result processing and insight generation
5. **Summarizer Agent** - Response generation (see blueprint/06-summarizer-agent.md)
6. **Orchestrator Agent** - Full pipeline integration

---

## 🔑 Key Concepts

### For Non-Technical Readers

**Agent**: A specialized software component that performs a specific task. Think of it as a team member with a specific job.

**Planner Agent**: The "strategist" who figures out what steps are needed to answer a question.

**Executor Agent**: The "doer" who carries out the plan by calling tools and gathering data.

**Analyzer Agent**: The "analyst" who looks at the data and finds patterns, insights, and issues.

**Orchestrator Agent**: The "project manager" who coordinates all other agents and ensures everything runs smoothly.

### For Developers

**Plan**: A structured object containing steps, each representing a tool call with parameters.

**Tool Result**: The output from executing a tool, including success status, data, and metadata.

**Analysis**: Structured insights, entities, and anomalies extracted from tool results.

**Template Resolution**: Converting `${step[0].data.*.id}` into actual values from previous steps.

**Dependency Graph**: Determining which steps must run before others based on `depends_on` fields.

---

## 📊 Example Flow

**User Query:** "Get me last week's contaminated shipments"

### Step-by-Step:

1. **Orchestrator** receives query
2. **Planner** creates plan:
   ```typescript
   {
     steps: [
       {
         tool: 'shipments',
         params: {
           date_from: '2025-10-04',
           date_to: '2025-10-11',
           has_contaminants: true
         }
       }
     ]
   }
   ```
3. **Executor** runs the tool and returns results
4. **Analyzer** processes results:
   - Finds 12 contaminated shipments
   - Detects high contamination rate (75%)
   - Identifies critical contaminants
5. **Summarizer** creates response:
   ```
   I found 12 contaminated shipments from last week.
   
   Key findings:
   - 8 were rejected (67%)
   - Most common: Lead in 6 shipments
   - ⚠️ 2 shipments have critical contamination
   ```
6. **Orchestrator** stores in memory and returns response

---

## 🧪 Testing

Each blueprint includes:
- ✅ Unit test examples with mocks
- ✅ Integration test patterns
- ✅ Edge case scenarios
- ✅ Error handling tests

Run tests:
```bash
npm test src/tests/agents/
```

---

## 📖 Reading Guide

### For Developers Starting Implementation:

1. Read [Planner Agent](./01-planner-agent.md) - Start here
2. Read [Executor Agent](./02-executor-agent.md) - Build on planner
3. Read [Analyzer Agent](./03-analyzer-agent.md) - Process results
4. Read [Orchestrator Agent](./04-orchestrator-agent.md) - Tie it all together
5. Review shared library: `src/shared/` directory

### For Product/Business Teams:

1. Read the "Overview" section of each blueprint
2. Focus on "Example Scenarios" sections
3. Review flow diagrams
4. Skip implementation details

### For Code Review:

1. Check shared library imports are correct
2. Verify error handling patterns are followed
3. Ensure Zod schemas are used for validation
4. Confirm retry logic with exponential backoff
5. Validate test coverage

---

## 🔧 Configuration

Each agent can be configured via environment variables:

```bash
# LLM Configuration
LLM_PROVIDER=openai          # openai, groq, ollama
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Memory Configuration
ENABLE_MEMORY=true
NEO4J_URI=bolt://localhost:7687
PINECONE_API_KEY=...

# Agent Configuration
PLANNER_TEMPERATURE=0.1      # Low for deterministic planning
ANALYZER_USE_LLM=true        # Use LLM vs rule-based
EXECUTOR_MAX_PARALLEL=5      # Max parallel tool executions
ORCHESTRATOR_MAX_RETRIES=3   # Retry attempts
```

---

## 🚀 Next Steps

1. ✅ Review these blueprints
2. ✅ Study shared library in `src/shared/`
3. ✅ Implement Planner Agent
4. ✅ Implement Executor Agent
5. ✅ Implement Analyzer Agent
6. ✅ Implement Orchestrator Agent
7. ✅ Write integration tests
8. ✅ Deploy and monitor

---

## 📝 Related Documentation

- **Original Blueprints**: `../blueprint/` - Historical reference
- **Shared Library**: `../docs/docs/foundation/shared-library.md`
- **Implementation Status**: `../STATUS.md`
- **API Documentation**: `../API.md`

---

## 💡 Design Principles

### 1. Fail-Safe Operations
Every external call has retry logic, timeouts, and fallback strategies.

### 2. Type Safety
Zod schemas validate all data at runtime, catching errors early.

### 3. Observable Systems
Comprehensive logging, metrics, and tracing at every layer.

### 4. Modular Design
Each agent is independently testable and replaceable.

### 5. Performance-First
Caching, batching, and parallel execution where possible.

---

**Questions?** Review the individual agent blueprints for detailed implementation guidance.

