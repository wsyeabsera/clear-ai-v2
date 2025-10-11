# Clear AI v2

A modular, LangGraph-based AI agent runtime that uses MCP (Model Context Protocol) tools for intelligent task orchestration, execution, and analysis.

## 📚 Documentation

**[View the complete documentation →](https://wsyeabsera.github.io/clear-ai-v2/)**

The documentation includes:
- Getting Started guide
- Core Concepts (plain language)
- Architecture overview  
- Complete API reference for all 19 modules
- Real code examples
- Best practices

Or run locally:
```bash
yarn docs:start
```

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
# Run MCP server in development mode
yarn dev

# Run API server in development mode
yarn api:dev

# Seed database with test data
yarn seed
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
│   ├── api/              # Express API server
│   │   ├── server.ts     # Main Express app
│   │   ├── routes/       # API route handlers
│   │   ├── models/       # Mongoose models
│   │   ├── db/           # Database connection & seed
│   │   └── middleware/   # Express middleware
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
│   │   ├── mcp/          # Server tests
│   │   └── api/          # API tests
│   └── main.ts           # MCP Entry point
├── API.md                # API Documentation
├── jest.config.js
├── tsconfig.json
└── package.json
```

## Waste Management API

A standalone Express API server with MongoDB that provides RESTful endpoints for waste management operations.

### Prerequisites

- **MongoDB**: Install and run MongoDB locally
  - macOS: `brew install mongodb-community && brew services start mongodb-community`
  - Ubuntu: `sudo apt-get install mongodb-org && sudo systemctl start mongod`
  - Windows: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### Quick Start

1. **Start MongoDB** (if not already running)
2. **Seed the database:**
   ```bash
   yarn seed
   ```
3. **Start the API server:**
   ```bash
   yarn api:dev
   ```
4. **Test with curl:**
   ```bash
   curl http://localhost:4000/api/shipments
   ```

See **[API.md](./API.md)** for complete API documentation with curl examples.

### Interactive API Documentation (Swagger)

The API includes interactive Swagger documentation:

1. **Start the API server:**
   ```bash
   yarn api:dev
   ```

2. **Open Swagger UI in your browser:**
   ```
   http://localhost:4000/api-docs
   ```

3. **Features:**
   - Interactive API exploration
   - "Try it out" functionality for testing endpoints
   - Complete request/response schemas
   - Built-in parameter validation
   - Execute API calls directly from the browser

4. **Swagger JSON:**
   ```
   http://localhost:4000/swagger.json
   ```

## MCP Tools

### Current Tools (Waste Management Domain)

1. **Shipments Tool** - Query shipments with filters for date, status, contamination
2. **Facilities Tool** - Query facilities by location, type, and capacity
3. **Contaminants Tool** - Query detected contaminants with risk levels
4. **Inspections Tool** - Query inspection records and results

Each tool follows the MCP standard and:
- Connects to the local API server (http://localhost:4000/api)
- Uses GET requests to retrieve data
- Can be discovered dynamically
- Executes with typed parameters
- Validates against JSON schemas

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

### Phase 1: Foundation (Completed ✅)
- [x] MCP Server implementation
- [x] Tool system with 4 waste management tools
- [x] Complete test coverage for tools
- [x] Express API with MongoDB
- [x] Full CRUD operations
- [x] API test suite

### Phase 2: AI Agents (In Progress)
- [ ] LangGraph agent implementation
- [ ] Orchestrator Agent
- [ ] Planner Agent
- [ ] Executor Agent
- [ ] Analyzer Agent
- [ ] Summarizer Agent

### Phase 3: Memory Systems (Planned)
- [ ] Neo4j episodic memory
- [ ] Pinecone semantic memory
- [ ] Multi-LLM provider support
- [ ] Full pipeline integration

## Contributing

See the `blueprint/` directory for detailed specifications of each component.

## License

MIT
# clear-ai-v2
