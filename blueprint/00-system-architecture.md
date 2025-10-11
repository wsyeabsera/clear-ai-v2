# System Architecture - Clear AI v2

## Overview
Clear AI v2 is a modular, LangGraph-based AI agent system that orchestrates tool execution, analysis, and summarization with episodic and semantic memory.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Query                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                            │
│  - Request routing                                               │
│  - Error handling & retries                                      │
│  - Memory context injection                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Planner Agent                               │
│  - Parse query intent                                            │
│  - Generate execution plan (JSON)                                │
│  - Select tools & parameters                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Executor Agent                               │
│  - Parallel tool execution                                       │
│  - Result aggregation                                            │
│  - Error handling per tool                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Analyzer Agent                               │
│  - Data analysis                                                 │
│  - Anomaly detection                                             │
│  - Entity extraction                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Summarizer Agent                              │
│  - Generate human-friendly summary                               │
│  - Format results                                                │
│  - Include metadata & sources                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Final Response                              │
│  {                                                               │
│    message: string,                                              │
│    tools_used: string[],                                         │
│    data: any,                                                    │
│    metadata: {...}                                               │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Supporting Infrastructure

### MCP Server & Tools
```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Tool Registry                          │  │
│  │  - Tool discovery                                         │  │
│  │  - Version management                                     │  │
│  │  - Schema validation                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Shipments │  │Facilities│  │Contamin- │  │Inspec-   │       │
│  │  Tool    │  │   Tool   │  │ants Tool │  │tions Tool│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Systems
```
┌─────────────────────────────────────────────────────────────────┐
│                      Memory Manager                              │
│                                                                  │
│  ┌───────────────────────┐      ┌──────────────────────────┐   │
│  │   Neo4j (Episodic)    │      │  Pinecone (Semantic)     │   │
│  │  - Request history    │      │  - Summary embeddings    │   │
│  │  - Tool call graph    │      │  - Finding vectors       │   │
│  │  - Entity relations   │      │  - Similarity search     │   │
│  └───────────────────────┘      └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### LLM Provider Layer
```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Provider Manager                          │
│                                                                  │
│  Primary: OpenAI GPT-4  →  Fallback: Anthropic Claude           │
│                         →  Fallback: Local Ollama               │
│                                                                  │
│  - Rate limiting                                                 │
│  - Token counting                                                │
│  - Retry logic                                                   │
│  - Cost tracking                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Request Lifecycle

1. **Query Reception** (Orchestrator)
   - Receive user query
   - Load relevant memory context
   - Initialize request tracking

2. **Planning** (Planner Agent)
   - Parse query using LLM
   - Generate structured plan
   - Validate plan schema

3. **Execution** (Executor Agent)
   - Execute tools in parallel where possible
   - Aggregate results
   - Handle individual tool failures

4. **Analysis** (Analyzer Agent)
   - Process tool results
   - Detect patterns/anomalies
   - Extract entities

5. **Summarization** (Summarizer Agent)
   - Generate human-readable summary
   - Include tool metadata
   - Format final response

6. **Memory Storage**
   - Store episodic data (Neo4j)
   - Store semantic embeddings (Pinecone)

## Example Use Cases

### Use Case 1: "Get me last week's shipments that got contaminants"

**Flow:**
1. Planner generates:
   ```json
   {
     "steps": [
       {
         "tool": "shipments",
         "params": { "date_from": "2025-10-04", "date_to": "2025-10-11" }
       },
       {
         "tool": "contaminants-detected",
         "params": { "shipment_ids": "${step[0].results.*.id}" }
       }
     ]
   }
   ```

2. Executor runs both tools (second depends on first)
3. Analyzer identifies contamination patterns
4. Summarizer creates readable report

### Use Case 2: "Analyse today's contaminants in Hannover"

**Flow:**
1. Planner generates plan for facilities + contaminants in Hannover
2. Executor fetches data
3. Analyzer detects anomalies, trends
4. Summarizer provides analysis report

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **Agent Framework**: LangGraph
- **MCP**: @modelcontextprotocol/sdk
- **Memory**: Neo4j + Pinecone
- **LLM**: OpenAI, Anthropic, Local (Ollama)
- **Testing**: Jest + ts-jest, nock, supertest
- **Validation**: Zod
- **HTTP**: axios

## Design Principles

1. **Modularity**: Each agent/tool is independently testable
2. **Type Safety**: Strict TypeScript contracts
3. **Testability**: Mock external dependencies, deterministic tests
4. **Observability**: Rich logging and tracing
5. **Resilience**: Graceful degradation, retry logic
6. **Domain Agnostic**: Framework adaptable to any domain

