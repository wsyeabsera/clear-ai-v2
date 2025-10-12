/**
 * GraphQL Client for Agent Tester
 * Handles communication with the Clear AI v2 GraphQL API
 */

import { GraphQLClient as RequestClient } from 'graphql-request';
import type { ExecutionResult, TestMetrics } from '../types/scenario.js';

export interface GraphQLClientConfig {
  httpEndpoint: string;
  wsEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ExecuteQueryInput {
  query: string;
  userId?: string;
}

const EXECUTE_QUERY_MUTATION = `
  mutation ExecuteQuery($query: String!, $userId: String) {
    executeQuery(query: $query, userId: $userId) {
      requestId
      message
      toolsUsed
      data
      analysis {
        summary
        insights {
          type
          description
          confidence
          supportingData
        }
        entities {
          id
          type
          name
          attributes
          relationships {
            type
            targetEntityId
            strength
          }
        }
        anomalies {
          type
          description
          severity
          affectedEntities
          data
        }
        metadata {
          toolResultsCount
          successfulResults
          failedResults
          analysisTimeMs
        }
      }
      metadata {
        requestId
        totalDurationMs
        timestamp
        error
      }
    }
  }
`;

export class GraphQLClient {
  private client: RequestClient;
  private config: GraphQLClientConfig;

  constructor(config: GraphQLClientConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = new RequestClient(this.config.httpEndpoint, {
      headers: this.config.headers || {},
    });
  }

  /**
   * Execute a query through the agent system
   */
  async executeQuery(input: ExecuteQueryInput): Promise<{
    result: ExecutionResult;
    metrics: TestMetrics;
  }> {
    const startTime = Date.now();

    try {
      const response: any = await this.executeWithRetry(async () => {
        return await this.client.request(EXECUTE_QUERY_MUTATION, {
          query: input.query,
          userId: input.userId,
        });
      });

      const totalLatencyMs = Date.now() - startTime;
      const executionResult = response.executeQuery as ExecutionResult;

      // Extract metrics
      const metrics: TestMetrics = {
        totalLatencyMs,
        responseSizeBytes: JSON.stringify(executionResult).length,
      };

      return {
        result: executionResult,
        metrics,
      };
    } catch (error: any) {
      const totalLatencyMs = Date.now() - startTime;
      throw new Error(`GraphQL execution failed after ${totalLatencyMs}ms: ${error.message}`);
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt >= (this.config.maxRetries || 3)) {
        throw error;
      }

      // Check if error is retryable
      if (this.isRetryable(error)) {
        const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.executeWithRetry(operation, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Network request failed',
      'timeout',
    ];

    return retryableErrors.some((msg) =>
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const endpoint = this.config.httpEndpoint.replace('/graphql', '/health');
      const response = await fetch(endpoint) as Response;
      return response.ok;
    } catch {
      return false;
    }
  }
}

