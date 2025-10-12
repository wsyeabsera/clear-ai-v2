/**
 * WebSocket Subscription Client
 * Handles real-time progress updates via GraphQL subscriptions
 */

import { createClient, Client } from 'graphql-ws';
import WebSocket from 'ws';

export interface SubscriptionClientConfig {
  wsEndpoint: string;
  timeout?: number;
  reconnect?: boolean;
}

export interface ProgressUpdate {
  requestId: string;
  phase: string;
  progress: number;
  message: string;
  timestamp: string;
}

const QUERY_PROGRESS_SUBSCRIPTION = `
  subscription QueryProgress($requestId: ID!) {
    queryProgress(requestId: $requestId) {
      requestId
      phase
      progress
      message
      timestamp
    }
  }
`;

export class SubscriptionClient {
  private client: Client;
  private config: SubscriptionClientConfig;

  constructor(config: SubscriptionClientConfig) {
    this.config = {
      timeout: 60000,
      reconnect: true,
      ...config,
    };

    this.client = createClient({
      url: this.config.wsEndpoint,
      webSocketImpl: WebSocket,
      connectionParams: {},
      retryAttempts: 3,
      shouldRetry: () => this.config.reconnect || false,
    });
  }

  /**
   * Subscribe to query progress updates
   */
  async *subscribeToProgress(requestId: string): AsyncGenerator<ProgressUpdate> {
    const subscription = this.client.iterate({
      query: QUERY_PROGRESS_SUBSCRIPTION,
      variables: { requestId },
    });

    try {
      for await (const result of subscription) {
        if (result.data?.queryProgress) {
          yield result.data.queryProgress as ProgressUpdate;
        }

        if (result.errors) {
          console.error('Subscription error:', result.errors);
          break;
        }
      }
    } catch (error: any) {
      console.error('Subscription failed:', error.message);
    }
  }

  /**
   * Subscribe to agent status updates
   */
  async *subscribeToAgentStatus(): AsyncGenerator<any> {
    const subscription = this.client.iterate({
      query: `
        subscription AgentStatus {
          agentStatus {
            agent
            status
            timestamp
          }
        }
      `,
    });

    try {
      for await (const result of subscription) {
        if (result.data?.agentStatus) {
          yield result.data.agentStatus;
        }
      }
    } catch (error: any) {
      console.error('Agent status subscription failed:', error.message);
    }
  }

  /**
   * Close subscription client
   */
  async close(): Promise<void> {
    await this.client.dispose();
  }
}

