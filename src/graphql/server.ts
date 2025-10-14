/**
 * GraphQL Server with HTTP and WebSocket support
 */

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import cors from 'cors';
import bodyParser from 'body-parser';

import { typeDefs } from './schema.js';
import { resolvers, pubsub } from './resolvers.js';
import { PlannerAgent } from '../agents/planner.js';
import { ExecutorAgent } from '../agents/executor.js';
import { ConfigurableAnalyzer } from '../agents/configurable-analyzer.js';
import { ConfigurableSummarizer } from '../agents/configurable-summarizer.js';
import { TrainerAgent } from '../agents/trainer.js';
import { StrategyRegistry } from '../agents/strategies/registry.js';
import { MemoryManager } from '../shared/memory/manager.js';
import { PlanStorageService } from './services/plan-storage.service.js';
import { ExecutionStorageService } from './services/execution-storage.service.js';
import { AnalysisStorageService } from './services/analysis-storage.service.js';
import { AgentConfigStorageService } from './services/agent-config-storage.service.js';
import { TrainingStorageService } from './services/training-storage.service.js';

export interface GraphQLServerConfig {
  port: number;
  planner: PlannerAgent;
  executor: ExecutorAgent;
  analyzer: ConfigurableAnalyzer;
  summarizer: ConfigurableSummarizer;
  trainer: TrainerAgent;
  memory: MemoryManager;
  planStorage: PlanStorageService;
  executionStorage: ExecutionStorageService;
  analysisStorage: AnalysisStorageService;
  agentConfigStorage: AgentConfigStorageService;
  trainingStorage: TrainingStorageService;
  strategyRegistry: StrategyRegistry;
}

export class GraphQLAgentServer {
  private app: express.Application;
  private httpServer: any;
  private apolloServer?: ApolloServer;
  private config: GraphQLServerConfig;

  constructor(config: GraphQLServerConfig) {
    this.config = config;
    this.app = express();
    this.httpServer = createServer(this.app);
  }

  async start(): Promise<void> {
    // Create GraphQL schema
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Create WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
      server: this.httpServer,
      path: '/graphql',
    });

    // Set up WebSocket server
    const serverCleanup = useServer(
      {
        schema,
        context: () => ({
          planner: this.config.planner,
          executor: this.config.executor,
          analyzer: this.config.analyzer,
          summarizer: this.config.summarizer,
          trainer: this.config.trainer,
          memory: this.config.memory,
          planStorage: this.config.planStorage,
          executionStorage: this.config.executionStorage,
          analysisStorage: this.config.analysisStorage,
          agentConfigStorage: this.config.agentConfigStorage,
          trainingStorage: this.config.trainingStorage,
          strategyRegistry: this.config.strategyRegistry,
          pubsub,
        }),
      },
      wsServer
    );

    console.log('✅ WebSocket server configured for subscriptions');

    // Create Apollo Server with Playground enabled
    const plugins: any[] = [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer: this.httpServer }),
      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ];

    // Enable Apollo Studio Sandbox (playground) for testing
    plugins.push(ApolloServerPluginLandingPageLocalDefault({ embed: true }));

    this.apolloServer = new ApolloServer({
      schema,
      plugins,
      introspection: true, // Enable introspection in production for testing
    });

    // Start Apollo Server
    await this.apolloServer.start();

    // Configure CORS for frontend development
    const corsOptions = {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://192.168.2.216:3000',
        'http://192.168.2.216:3001',
        'https://studio.apollographql.com',  // Add Apollo Studio
      ],
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };

    // Global CORS for WebSocket handshake
    this.app.use(cors(corsOptions));
    
    // Apply CORS and body parser to GraphQL endpoint
    this.app.use('/graphql', cors(corsOptions));
    this.app.use('/graphql', bodyParser.json());

    // GraphQL endpoint - GET for playground, POST for queries
    this.app.get('/graphql', (_req, res) => {
      // Serve Apollo Sandbox
      res.redirect('https://studio.apollographql.com/sandbox/explorer?endpoint=' + 
        encodeURIComponent(`http://localhost:${this.config.port}/graphql`));
    });

    this.app.post('/graphql', async (req, res) => {
      try {
        const { query, variables, operationName } = req.body;

        const result = await this.apolloServer!.executeOperation(
          {
            query,
            variables,
            operationName,
          },
          {
            contextValue: {
              planner: this.config.planner,
              executor: this.config.executor,
              analyzer: this.config.analyzer,
              summarizer: this.config.summarizer,
              trainer: this.config.trainer,
              memory: this.config.memory,
              planStorage: this.config.planStorage,
              executionStorage: this.config.executionStorage,
              analysisStorage: this.config.analysisStorage,
              agentConfigStorage: this.config.agentConfigStorage,
              trainingStorage: this.config.trainingStorage,
              strategyRegistry: this.config.strategyRegistry,
              pubsub,
            },
          }
        );

        res.status(200).json(result.body.kind === 'single' ? result.body.singleResult : result.body);
      } catch (error: any) {
        res.status(500).json({ errors: [{ message: error.message }] });
      }
    });

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Start HTTP server (bind to localhost for development, 0.0.0.0 for production)
    const bindAddress = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    await new Promise<void>((resolve) => {
      this.httpServer.listen(this.config.port, bindAddress, () => {
        const host = process.env.NODE_ENV === 'production'
          ? process.env.PUBLIC_URL || `http://0.0.0.0:${this.config.port}`
          : `http://localhost:${this.config.port}`;
        console.log(`🚀 GraphQL Server ready at ${host}/graphql`);
        console.log(`🔌 WebSocket ready at ${host.replace('http', 'ws')}/graphql`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.apolloServer) {
      await this.apolloServer.stop();
    }
    
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => {
        console.log('GraphQL Server stopped');
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

