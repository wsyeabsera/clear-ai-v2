/**
 * GraphQL Server with HTTP and WebSocket support
 */

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import bodyParser from 'body-parser';

import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { OrchestratorAgent } from '../agents/orchestrator.js';
import { MemoryManager } from '../shared/memory/manager.js';

export interface GraphQLServerConfig {
  port: number;
  orchestrator: OrchestratorAgent;
  memory: MemoryManager;
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

    // Create WebSocket server for subscriptions (disabled for now)
    // const wsServer = new WebSocketServer({
    //   server: this.httpServer,
    //   path: '/graphql',
    // });

    // Set up WebSocket server (disabled for now)
    // const serverCleanup = useServer(
    //   {
    //     schema,
    //     context: () => ({
    //       orchestrator: this.config.orchestrator,
    //       memory: this.config.memory,
    //     }),
    //   },
    //   wsServer
    // );
    const serverCleanup = { dispose: async () => {} };

    // Create Apollo Server
    this.apolloServer = new ApolloServer({
      schema,
      plugins: [
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
      ],
    });

    // Start Apollo Server
    await this.apolloServer.start();

    // Middleware
    this.app.use('/graphql', cors<cors.CorsRequest>());
    this.app.use('/graphql', bodyParser.json());
    
    // Simple GraphQL endpoint
    this.app.post('/graphql', async (_req, res) => {
      // Handle GraphQL requests manually
      res.json({ message: 'GraphQL endpoint - not fully implemented yet' });
    });

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Start HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        console.log(`🚀 GraphQL Server ready at http://localhost:${this.config.port}/graphql`);
        console.log(`🔌 WebSocket ready at ws://localhost:${this.config.port}/graphql`);
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

