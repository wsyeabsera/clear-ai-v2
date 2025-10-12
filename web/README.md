# Clear AI v2 - Web Application

React + TypeScript web application for interacting with the Clear AI v2 agent system.

## Features

- 🔍 Natural language query interface
- 📊 Rich results display with insights, entities, and anomalies
- 📜 Query history sidebar
- ⚡ Real-time progress updates (WebSocket)
- 📈 System metrics dashboard
- 🎨 Material-UI design

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **GraphQL Client**: Apollo Client
- **Deployment**: Vercel

## Development

### Prerequisites

- Node.js 18+
- Backend services running (GraphQL server)

### Setup

```bash
# Install dependencies
npm install

# Create .env file (copy from env-example.txt)
cp env-example.txt .env.local
# Edit .env.local with your GraphQL endpoint

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Environment Variables

Create `.env.local` file:

```bash
# Production
VITE_GRAPHQL_ENDPOINT=https://clear-ai-v2-production.up.railway.app/graphql

# Or for local development
VITE_GRAPHQL_ENDPOINT=http://localhost:4001/graphql
```

## Building for Production

```bash
# Build
npm run build

# Preview build locally
npm run preview
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variable:
   - `VITE_GRAPHQL_ENDPOINT` = Your GraphQL URL
4. Deploy!

### Manual

```bash
npm run build
# Upload dist/ folder to any static hosting
```

## Project Structure

```
web/
├── src/
│   ├── components/          # React components
│   │   ├── QueryInput.tsx   # Query submission form
│   │   ├── ResultsDisplay.tsx # Results with insights
│   │   └── HistorySidebar.tsx # Query history
│   ├── graphql/             # GraphQL queries/mutations
│   │   └── queries.ts
│   ├── types.ts             # TypeScript types
│   ├── apollo-client.ts     # Apollo Client setup
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── index.html
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features

### Query Interface
- Multi-line text input
- Submit button with loading state
- Example queries for guidance

### Results Display
- Main AI-generated message
- Tools used (as badges)
- Insights with confidence scores
- Entities with relationships
- Anomalies as alerts

### History Sidebar
- List of previous queries
- Click to view details
- Auto-updates every 5 seconds
- Shows success/error status
- Duration for each query

## Backend Connection

This frontend connects to the Clear AI v2 GraphQL server:

**Production**: https://clear-ai-v2-production.up.railway.app/graphql  
**Local**: http://localhost:4001/graphql

The backend provides:
- Agent orchestration (Planner, Executor, Analyzer, Summarizer)
- 30 MCP tools for waste management
- Memory systems (Neo4j + Pinecone)
- Multi-LLM support (OpenAI, Groq, etc.)

## License

MIT
