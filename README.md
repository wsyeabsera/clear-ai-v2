# Clear AI v2

A modular, LangGraph-based AI agent runtime that uses MCP (Model Context Protocol) tools for intelligent task orchestration, execution, and analysis.

## Overview

Clear AI v2 is designed to act like Cursor but for tool execution rather than code assistance. It provides:

- **Multi-Agent Orchestration**: Planner, Executor, Analyzer, and Summarizer agents working together
- **MCP Tool Integration**: Standard protocol for tool discovery and execution
- **Memory Systems**: Both episodic (Neo4j) and semantic (Pinecone) memory
- **Multi-LLM Support**: OpenAI, Anthropic, and local models with fallback
- **Domain Agnostic**: Framework adaptable to any business domain

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd clear-ai-v2

# Install dependencies
yarn install

# Copy environment example
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Running Tests

```bash
# Run all tests
yarn test

# Watch mode for development
yarn test:watch

# With coverage
yarn test:coverage
```

### Building

```bash
# Compile TypeScript
yarn build

# Start MCP server
yarn start
```

### Development

```bash
# Run in development mode with ts-node
yarn dev
```

## Project Structure

```
clear-ai-v2/
├── blueprint/              # Detailed design documents
│   ├── 00-system-architecture.md
│   └── 09-tool-system.md
├── research/              # Research notes and planning
│   └── plan.md
├── src/
│   ├── mcp/              # MCP server implementation
│   │   └── server.ts
│   ├── tools/            # Tool implementations
│   │   ├── types.ts
│   │   ├── shipments.ts
│   │   ├── facilities.ts
│   │   ├── contaminants.ts
│   │   ├── inspections.ts
│   │   └── index.ts
│   ├── tests/            # Test suite
│   │   ├── fixtures/     # Mock data
│   │   ├── tools/        # Tool tests
│   │   └── mcp/          # Server tests
│   └── main.ts           # Entry point
├── jest.config.js
├── tsconfig.json
└── package.json
```

## MCP Tools

### Current Tools (Waste Management Domain)

1. **Shipments Tool** - Query shipments with filters for date, status, contamination
2. **Facilities Tool** - Query facilities by location, type, and capacity
3. **Contaminants Tool** - Query detected contaminants with risk levels
4. **Inspections Tool** - Query inspection records and results

Each tool follows the MCP standard and can be:
- Discovered dynamically
- Executed with typed parameters
- Validated against JSON schemas

## Example Queries

The system can handle complex queries like:

- "Get me last week's shipments that got contaminants"
- "Analyse today's contaminants in Hannover"
- "Give me the inspections rejected this month"
- "From the inspections accepted this week, did we detect any risky contaminants?"

## Architecture

The system uses a multi-agent pipeline:

1. **Orchestrator** - Routes requests and manages context
2. **Planner** - Parses queries and generates execution plans
3. **Executor** - Runs tools in parallel and aggregates results
4. **Analyzer** - Processes data and detects patterns
5. **Summarizer** - Generates human-friendly responses

## Testing

All modules are independently testable:

- **Unit Tests** - Each tool and agent tested in isolation
- **Integration Tests** - Full pipeline testing
- **Mocked Dependencies** - No network calls in tests
- **Deterministic** - Reproducible results

Run tests with:
```bash
yarn test
```

## Development Roadmap

- [x] MCP Server implementation
- [x] Tool system with 4 waste management tools
- [x] Complete test coverage for tools
- [ ] LangGraph agent implementation
- [ ] Neo4j episodic memory
- [ ] Pinecone semantic memory
- [ ] Multi-LLM provider support
- [ ] Full pipeline integration

## Contributing

See the `blueprint/` directory for detailed specifications of each component.

## License

MIT
