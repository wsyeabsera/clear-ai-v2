/**
 * Enhanced GraphQL Client with WebSocket Support
 * Combines HTTP client with WebSocket subscriptions for real-time updates
 */

import { GraphQLClient, ExecuteQueryInput } from './graphql-client.js';
import { SubscriptionClient, ProgressUpdate } from './subscription-client.js';
import type { ExecutionResult, TestMetrics } from '../types/scenario.js';

export interface EnhancedGraphQLClientConfig {
  httpEndpoint: string;
  wsEndpoint: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  enableSubscriptions?: boolean;
}

export interface ExecutionWithProgress {
  result: ExecutionResult;
  metrics: TestMetrics;
  progressUpdates: ProgressUpdate[];
}

export class EnhancedGraphQLClient extends GraphQLClient {
  private subscriptionClient?: SubscriptionClient;
  private enableSubscriptions: boolean;

  constructor(config: EnhancedGraphQLClientConfig) {
    super({
      httpEndpoint: config.httpEndpoint,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      headers: config.headers,
    });

    this.enableSubscriptions = config.enableSubscriptions !== false;

    if (this.enableSubscriptions && config.wsEndpoint) {
      this.subscriptionClient = new SubscriptionClient({
        wsEndpoint: config.wsEndpoint,
        timeout: config.timeout,
        reconnect: true,
      });
    }
  }

  /**
   * Execute query with progress tracking
   */
  async executeQueryWithProgress(
    input: ExecuteQueryInput,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<ExecutionWithProgress> {
    const startTime = Date.now();
    const progressUpdates: ProgressUpdate[] = [];

    // Start query execution
    const executionPromise = super.executeQuery(input);

    // If subscriptions enabled and callback provided, track progress
    if (this.subscriptionClient && onProgress) {
      // Wait a bit for the query to start and get a requestId
      const initialResult = await executionPromise;
      const requestId = initialResult.result.requestId;

      // Subscribe to progress updates (but don't wait for them)
      (async () => {
        try {
          for await (const update of this.subscriptionClient!.subscribeToProgress(requestId)) {
            progressUpdates.push(update);
            if (onProgress) {
              onProgress(update);
            }

            // Stop if complete
            if (update.phase === 'completed' || update.progress >= 100) {
              break;
            }
          }
        } catch (error: any) {
          // Silent fail on subscription errors
          console.debug('Progress subscription ended:', error.message);
        }
      })();

      return {
        ...initialResult,
        progressUpdates,
      };
    }

    // No subscriptions, just return result
    const result = await executionPromise;
    return {
      ...result,
      progressUpdates,
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.subscriptionClient) {
      await this.subscriptionClient.close();
    }
  }
}

