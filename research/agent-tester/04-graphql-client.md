# Agent Tester - GraphQL Client

## Overview

The GraphQL Client is the communication layer between the Agent Tester and the Clear AI v2 system. It handles queries, mutations, subscriptions, and connection management.

## Client Architecture

```typescript
class GraphQLClient {
  private httpClient: HTTPClient;
  private wsClient: WebSocketClient;
  private config: ClientConfig;
  
  constructor(config: ClientConfig) {
    this.config = config;
    this.httpClient = new HTTPClient(config.endpoint);
    this.wsClient = new WebSocketClient(config.wsEndpoint);
  }
  
  // Query execution
  async query<T>(query: string, variables?: any): Promise<T>;
  
  // Mutation execution
  async mutate<T>(mutation: string, variables?: any): Promise<T>;
  
  // Subscription handling
  subscribe<T>(subscription: string, variables?: any): AsyncIterator<T>;
  
  // High-level test execution
  async executeTest(scenario: Scenario): Promise<TestResult>;
}
```

## HTTP Queries and Mutations

### Execute Query Mutation

```typescript
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

// Usage
async function executeQuery(query: string, userId?: string): Promise<ExecutionResult> {
  const response = await client.mutate(EXECUTE_QUERY_MUTATION, {
    query,
    userId
  });
  
  return response.data.executeQuery;
}
```

### Query Request History

```typescript
const GET_REQUEST_HISTORY_QUERY = `
  query GetRequestHistory($limit: Int, $userId: String) {
    getRequestHistory(limit: $limit, userId: $userId) {
      requestId
      query
      response {
        message
        toolsUsed
      }
      timestamp
      userId
    }
  }
`;
```

### Query Metrics

```typescript
const GET_METRICS_QUERY = `
  query GetMetrics {
    getMetrics {
      totalRequests
      successfulRequests
      failedRequests
      avgDuration
      uptime
    }
  }
`;
```

## WebSocket Subscriptions

### Progress Subscription

```typescript
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

// Usage
async function* subscribeToProgress(requestId: string) {
  const subscription = client.subscribe(QUERY_PROGRESS_SUBSCRIPTION, {
    requestId
  });
  
  for await (const update of subscription) {
    yield update.data.queryProgress;
  }
}
```

### Agent Status Subscription

```typescript
const AGENT_STATUS_SUBSCRIPTION = `
  subscription AgentStatus {
    agentStatus {
      agent
      status
      timestamp
    }
  }
`;
```

## Complete Test Execution Flow

```typescript
interface TestExecutionOptions {
  trackProgress: boolean;
  timeout: number;
  retries: number;
}

async function executeTest(
  scenario: Scenario,
  options: TestExecutionOptions
): Promise<TestResult> {
  const startTime = Date.now();
  const metrics: TestMetrics = {};
  const progressUpdates: ProgressUpdate[] = [];
  
  try {
    // 1. Execute mutation
    const executionPromise = client.mutate(EXECUTE_QUERY_MUTATION, {
      query: scenario.query,
      userId: scenario.userId
    });
    
    // 2. Subscribe to progress (if enabled)
    let progressSubscription;
    if (options.trackProgress) {
      executionPromise.then(async (result) => {
        const requestId = result.data.executeQuery.requestId;
        progressSubscription = subscribeToProgress(requestId);
        
        for await (const update of progressSubscription) {
          progressUpdates.push(update);
          console.log(`[${update.phase}] ${update.progress}% - ${update.message}`);
        }
      });
    }
    
    // 3. Wait for completion with timeout
    const result = await Promise.race([
      executionPromise,
      timeout(options.timeout)
    ]);
    
    // 4. Collect metrics
    metrics.totalLatencyMs = Date.now() - startTime;
    metrics.responseSizeBytes = JSON.stringify(result).length;
    
    // 5. Close subscription
    if (progressSubscription) {
      progressSubscription.return?.();
    }
    
    return {
      scenario,
      result: result.data.executeQuery,
      metrics,
      progressUpdates,
      success: true
    };
    
  } catch (error: any) {
    return {
      scenario,
      result: null,
      metrics,
      error: error.message,
      success: false
    };
  }
}
```

## Connection Management

### Connection Pooling

```typescript
class ConnectionPool {
  private connections: GraphQLClient[] = [];
  private maxConnections: number;
  private queue: PendingRequest[] = [];
  
  constructor(config: PoolConfig) {
    this.maxConnections = config.maxConnections || 5;
    this.initializePool();
  }
  
  async acquire(): Promise<GraphQLClient> {
    if (this.connections.length > 0) {
      return this.connections.pop()!;
    }
    
    if (this.activeCount < this.maxConnections) {
      return this.createConnection();
    }
    
    // Wait for available connection
    return new Promise((resolve) => {
      this.queue.push({ resolve, timestamp: Date.now() });
    });
  }
  
  release(client: GraphQLClient): void {
    if (this.queue.length > 0) {
      const pending = this.queue.shift()!;
      pending.resolve(client);
    } else {
      this.connections.push(client);
    }
  }
}
```

### Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if retryable
      if (!isRetryable(error, config.retryableErrors)) {
        throw error;
      }
      
      // Log and wait
      console.log(`Attempt ${attempt}/${config.maxRetries} failed: ${error.message}`);
      
      if (attempt < config.maxRetries) {
        const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

function isRetryable(error: Error, retryableErrors: string[]): boolean {
  return retryableErrors.some(e => error.message.includes(e));
}
```

## Error Handling

### Error Types

```typescript
enum GraphQLErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  GRAPHQL_ERROR = 'GRAPHQL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

class GraphQLError extends Error {
  type: GraphQLErrorType;
  statusCode?: number;
  details?: any;
  
  constructor(type: GraphQLErrorType, message: string, details?: any) {
    super(message);
    this.type = type;
    this.details = details;
  }
}
```

### Error Handling Strategy

```typescript
async function handleGraphQLError(error: any): Promise<void> {
  if (error.networkError) {
    // Network issues
    throw new GraphQLError(
      GraphQLErrorType.NETWORK_ERROR,
      'Network connection failed',
      error.networkError
    );
  }
  
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    // GraphQL execution errors
    throw new GraphQLError(
      GraphQLErrorType.GRAPHQL_ERROR,
      error.graphQLErrors[0].message,
      error.graphQLErrors
    );
  }
  
  if (error.message.includes('timeout')) {
    throw new GraphQLError(
      GraphQLErrorType.TIMEOUT,
      'Request timed out'
    );
  }
  
  throw error;
}
```

## Request Tracking

### Correlation IDs

```typescript
class RequestTracker {
  private requests: Map<string, RequestInfo> = new Map();
  
  startRequest(scenario: Scenario): string {
    const correlationId = generateId();
    
    this.requests.set(correlationId, {
      scenarioId: scenario.id,
      startTime: Date.now(),
      status: 'in_progress'
    });
    
    return correlationId;
  }
  
  completeRequest(correlationId: string, result: any): void {
    const info = this.requests.get(correlationId);
    if (info) {
      info.endTime = Date.now();
      info.duration = info.endTime - info.startTime;
      info.status = 'completed';
      info.result = result;
    }
  }
  
  failRequest(correlationId: string, error: Error): void {
    const info = this.requests.get(correlationId);
    if (info) {
      info.endTime = Date.now();
      info.duration = info.endTime - info.startTime;
      info.status = 'failed';
      info.error = error.message;
    }
  }
  
  getMetrics(): RequestMetrics {
    const requests = Array.from(this.requests.values());
    
    return {
      total: requests.length,
      completed: requests.filter(r => r.status === 'completed').length,
      failed: requests.filter(r => r.status === 'failed').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      avgDuration: average(requests.map(r => r.duration || 0))
    };
  }
}
```

## Metrics Collection

```typescript
interface ClientMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  bytesReceived: number;
  bytesSent: number;
}

class MetricsCollector {
  private latencies: number[] = [];
  private metrics: ClientMetrics;
  
  recordRequest(latencyMs: number, sizeBytes: number, success: boolean): void {
    this.latencies.push(latencyMs);
    this.metrics.requestCount++;
    this.metrics.totalLatencyMs += latencyMs;
    this.metrics.bytesReceived += sizeBytes;
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
    
    this.updatePercentiles();
  }
  
  private updatePercentiles(): void {
    const sorted = this.latencies.sort((a, b) => a - b);
    this.metrics.p50LatencyMs = percentile(sorted, 50);
    this.metrics.p95LatencyMs = percentile(sorted, 95);
    this.metrics.p99LatencyMs = percentile(sorted, 99);
    this.metrics.avgLatencyMs = average(sorted);
  }
}
```

## Configuration

```typescript
interface GraphQLClientConfig {
  // Endpoints
  httpEndpoint: string;
  wsEndpoint: string;
  
  // Authentication
  apiKey?: string;
  headers?: Record<string, string>;
  
  // Timeouts
  queryTimeout: number;
  mutationTimeout: number;
  connectionTimeout: number;
  
  // Retry
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  
  // Connection
  maxConnections: number;
  keepAlive: boolean;
  
  // Logging
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
}

const defaultConfig: GraphQLClientConfig = {
  httpEndpoint: 'http://localhost:4001/graphql',
  wsEndpoint: 'ws://localhost:4001/graphql',
  queryTimeout: 30000,
  mutationTimeout: 60000,
  connectionTimeout: 5000,
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxConnections: 5,
  keepAlive: true,
  logRequests: true,
  logResponses: false,
  logErrors: true
};
```

---

**Next Document:** [05-validation-engine.md](./05-validation-engine.md) - Result validation

