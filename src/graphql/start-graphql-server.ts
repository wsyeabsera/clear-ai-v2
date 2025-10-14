#!/usr/bin/env node

/**
 * Production GraphQL Server Starter
 * Starts the GraphQL server with full agent system
 */

import { GraphQLAgentServer } from './server.js';
import { PlannerAgent } from '../agents/planner.js';
import { ExecutorAgent } from '../agents/executor.js';
import { ConfigurableAnalyzer } from '../agents/configurable-analyzer.js';
import { ConfigurableSummarizer } from '../agents/configurable-summarizer.js';
import { StrategyRegistry } from '../agents/strategies/registry.js';
import { RuleBasedAnalysisStrategy } from '../agents/strategies/analysis/rule-based.strategy.js';
import { LLMBasedAnalysisStrategy } from '../agents/strategies/analysis/llm-based.strategy.js';
import { TemplateBasedSummarizationStrategy } from '../agents/strategies/summarization/template-based.strategy.js';
import { LLMBasedSummarizationStrategy } from '../agents/strategies/summarization/llm-based.strategy.js';
import { TrainerAgent } from '../agents/trainer.js';
import { MemoryManager } from '../shared/memory/manager.js';
import { LLMProvider } from '../shared/llm/provider.js';
import { MCPServer } from '../mcp/server.js';
import { getLLMConfigs } from '../shared/llm/config.js';
import { registerAllTools } from '../tools/index.js';
import { validateProductionEnv } from '../shared/utils/validate-env.js';
import { connectDB } from '../api/db/connection.js';
import { PlanStorageService } from './services/plan-storage.service.js';
import { ExecutionStorageService } from './services/execution-storage.service.js';
import { AnalysisStorageService } from './services/analysis-storage.service.js';
import { AgentConfigStorageService } from './services/agent-config-storage.service.js';
import { TrainingStorageService } from './services/training-storage.service.js';
import { ToolRegistry } from '../shared/tool-registry.js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env in development (Railway injects env vars directly in production)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Validate environment in production
if (process.env.NODE_ENV === 'production') {
  console.log('🔐 Validating production environment variables...');
  validateProductionEnv();
  console.log('✓ Environment validation passed\n');
}

async function main() {
  try {
    console.log('🚀 Starting Clear AI v2 GraphQL Server...\n');

    // 1. Initialize LLM Provider
    console.log('📡 Initializing LLM Provider...');
    const llmConfigs = getLLMConfigs();
    const llm = new LLMProvider(llmConfigs);
    console.log('✓ LLM Provider ready\n');

    // 2. Initialize Memory Manager
    console.log('🧠 Initializing Memory Manager...');
    const isProduction = process.env.NODE_ENV === 'production';

    const memory = new MemoryManager({
      neo4j: {
        uri: isProduction
          ? process.env.NEO4J_CLOUD_URI!
          : (process.env.NEO4J_URI || 'bolt://localhost:7687'),
        user: isProduction
          ? process.env.NEO4J_CLOUD_USERNAME!
          : (process.env.NEO4J_USERNAME || 'neo4j'),
        password: isProduction
          ? process.env.NEO4J_CLOUD_PASSWORD!
          : (process.env.NEO4J_PASSWORD || 'password'),
      },
      pinecone: {
        api_key: process.env.PINECONE_API_KEY || '',
        environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
        index_name: process.env.PINECONE_INDEX_NAME || 'clear-ai',
      },
      autoConnect: false,
    });

    await memory.connect();
    console.log('✓ Memory Manager connected (Neo4j + Pinecone)\n');

    // 3. Initialize MongoDB Connection
    console.log('🗄️  Initializing MongoDB connection...');
    await connectDB();
    console.log('✓ MongoDB connected\n');

    // 4. Initialize MCP Server with Tools
    console.log('🔧 Initializing MCP Tools...');
    const mcpServer = new MCPServer('graphql-server', '1.0.0');
    const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:3001/api';
    console.log(`🔗 Wasteer API URL: ${apiUrl}`);
    registerAllTools(mcpServer, apiUrl);
    console.log('✓ MCP Tools registered\n');

    // 4.5. Initialize Tool Registry
    console.log('🔧 Discovering and registering tools...');
    const toolRegistry = ToolRegistry.getInstance();
    const toolsPath = path.join(__dirname, '../tools');
    await toolRegistry.discoverTools(toolsPath, apiUrl);
    console.log(`✓ Registered ${toolRegistry.getToolNames().length} tools\n`);

    // Verify API connectivity
    console.log('🏥 Checking Wasteer API connectivity...');
    try {
      const healthCheck = await axios.get(`${apiUrl.replace('/api', '')}/health`, {
        timeout: 5000
      });
      console.log('✓ Wasteer API is reachable:', healthCheck.data.message);
    } catch (error: any) {
      console.warn('⚠️  Warning: Cannot reach Wasteer API at', apiUrl);
      console.warn('   Tools will fail until API is available');
      console.warn('   Error:', error.message);
    }

    // 5. Initialize Strategy Registry
    console.log('🔧 Initializing Strategy Registry...');
    const strategyRegistry = new StrategyRegistry();

    // Register built-in strategies
    strategyRegistry.registerAnalysisStrategy(new RuleBasedAnalysisStrategy());
    strategyRegistry.registerAnalysisStrategy(new LLMBasedAnalysisStrategy(llm));
    strategyRegistry.registerSummarizationStrategy(new TemplateBasedSummarizationStrategy());
    strategyRegistry.registerSummarizationStrategy(new LLMBasedSummarizationStrategy(llm));
    console.log('✓ Strategy Registry ready\n');

    // 6. Initialize Storage Services
    console.log('📋 Initializing Storage Services...');
    const planStorage = new PlanStorageService();
    const executionStorage = new ExecutionStorageService();
    const analysisStorage = new AnalysisStorageService();
    const agentConfigStorage = new AgentConfigStorageService();
    const trainingStorage = new TrainingStorageService();
    console.log('✓ Storage Services ready\n');

    // 7. Create Agent Pipeline
    console.log('🤖 Creating Agent Pipeline...');
    const planner = new PlannerAgent(llm, toolRegistry);
    const executor = new ExecutorAgent(toolRegistry);
    const analyzer = new ConfigurableAnalyzer(llm, agentConfigStorage, strategyRegistry);
    const summarizer = new ConfigurableSummarizer(llm, agentConfigStorage, strategyRegistry);
    const trainer = new TrainerAgent(agentConfigStorage, trainingStorage, llm);
    console.log('✓ Agent Pipeline ready\n');

    // 8. Start GraphQL Server
    console.log('🌐 Starting GraphQL Server...');
    const port = parseInt(process.env.PORT || '4001');
    const server = new GraphQLAgentServer({
      port,
      planner,
      executor,
      analyzer,
      summarizer,
      trainer,
      memory,
      planStorage,
      executionStorage,
      analysisStorage,
      agentConfigStorage,
      trainingStorage,
      strategyRegistry,
    });

    await server.start();

    const host = process.env.NODE_ENV === 'production'
      ? process.env.PUBLIC_URL || `https://your-app.railway.app`
      : `http://localhost:${port}`;

    console.log('\n✅ GraphQL Server fully operational!');
    console.log(`   GraphQL endpoint: ${host}/graphql`);
    console.log(`   Health check: ${host}/health`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   WASTEER API URL: ${process.env.WASTEER_API_URL || 'not-set'}`);
    console.log('\nPress Ctrl+C to stop the server\n');
  } catch (error: any) {
    console.error('\n❌ Failed to start GraphQL server:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down GraphQL server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down GraphQL server...');
  process.exit(0);
});

main();

