---
sidebar_position: 7
---

# GraphQL API

Access the Agent System through a powerful GraphQL API with queries, mutations, and subscriptions for real-time updates.

## Overview

The GraphQL API provides a flexible interface to the Agent System:

```
GraphQL Client → GraphQL Server → Orchestrator → Agents → Response
```

**Endpoint**: `http://localhost:4001/graphql`  
**WebSocket**: `ws://localhost:4001/graphql` (subscriptions)

## Complete Schema

```graphql
type Query {
  """Get request history for a user or all requests"""
  getRequestHistory(limit: Int, userId: String): [RequestRecord!]!
  
  """Get memory context for a query"""
  getMemoryContext(query: String!): MemoryContext!
  
  """Get system metrics"""
  getMetrics: SystemMetrics!
  
  """Get request by ID"""
  getRequest(requestId: ID!): RequestRecord
}

type Mutation {
  """Execute a query through the agent system"""
  executeQuery(query: String!, userId: String): ExecutionResult!
  
  """Cancel an in-progress query"""
  cancelQuery(requestId: ID!): Boolean!
}

type Subscription {
  """Subscribe to query progress updates"""
  queryProgress(requestId: ID!): ProgressUpdate!
  
  """Subscribe to agent status updates"""
  agentStatus: AgentStatusUpdate!
}

type ExecutionResult {
  requestId: ID!
  message: String!
  toolsUsed: [String!]!
  data: JSON
  analysis: Analysis
  metadata: ResponseMetadata!
}

type Analysis {
  summary: String!
  insights: [Insight!]!
  entities: [Entity!]!
  anomalies: [Anomaly!]!
  metadata: AnalysisMetadata!
}

type Insight {
  type: String!
  description: String!
  confidence: Float!
  supportingData: JSON
}

type Entity {
  id: ID!
  type: String!
  name: String!
  attributes: JSON!
  relationships: [Relationship!]!
}

type Anomaly {
  type: String!
  description: String!
  severity: String!
  affectedEntities: [String!]!
  data: JSON
}

type ResponseMetadata {
  requestId: ID!
  totalDurationMs: Int!
  timestamp: String!
  error: Boolean!
}

type RequestRecord {
  requestId: ID!
  query: String!
  response: ExecutionResult!
  timestamp: String!
  userId: String
}

type MemoryContext {
  semantic: [SemanticResult!]!
  episodic: [EpisodicEvent!]!
  entities: [String!]!
}

type SystemMetrics {
  totalRequests: Int!
  successfulRequests: Int!
  failedRequests: Int!
  avgDuration: Float!
  uptime: Float!
}

scalar JSON
```

## Query Examples

### Execute Query

```graphql
mutation {
  executeQuery(query: "Get contaminated shipments from last week") {
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
      }
      anomalies {
        type
        description
        severity
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
```

**Response**:
```json
{
  "data": {
    "executeQuery": {
      "requestId": "550e8400-e29b-41d4-a716-446655440000",
      "message": "Found 3 contaminated shipments from last week. High contamination rate: 60% of shipments have contaminants.",
      "toolsUsed": ["shipments_list", "contaminants_list"],
      "data": [ /* raw data */ ],
      "analysis": {
        "summary": "Analyzed 2 tool executions. Found 2 insights.",
        "insights": [
          {
            "type": "trend",
            "description": "High contamination rate: 60%",
            "confidence": 0.9
          }
        ],
        "anomalies": []
      },
      "metadata": {
        "requestId": "550e8400-e29b-41d4-a716-446655440000",
        "totalDurationMs": 3245,
        "timestamp": "2025-10-12T06:00:00.000Z",
        "error": false
      }
    }
  }
}
```

### Get Request History

```graphql
query {
  getRequestHistory(limit: 10) {
    requestId
    query
    timestamp
    response {
      message
      toolsUsed
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "getRequestHistory": [
      {
        "requestId": "550e8400-e29b-41d4-a716-446655440000",
        "query": "Get contaminated shipments",
        "timestamp": "2025-10-12T06:00:00.000Z",
        "response": {
          "message": "Found 3 contaminated shipments...",
          "toolsUsed": ["shipments_list"]
        }
      },
      // ... more requests
    ]
  }
}
```

### Get Memory Context

```graphql
query {
  getMemoryContext(query: "Show me Berlin facilities") {
    semantic {
      text
      score
    }
    episodic {
      id
      type
      timestamp
    }
    entities
  }
}
```

**Response**:
```json
{
  "data": {
    "getMemoryContext": {
      "semantic": [
        {
          "text": "Previous query about Berlin",
          "score": 0.95
        }
      ],
      "episodic": [
        {
          "id": "evt_123",
          "type": "query",
          "timestamp": "2025-10-12T05:30:00.000Z"
        }
      ],
      "entities": ["location:Berlin", "facility:F1"]
    }
  }
}
```

### Get System Metrics

```graphql
query {
  getMetrics {
    totalRequests
    successfulRequests
    failedRequests
    avgDuration
    uptime
  }
}
```

**Response**:
```json
{
  "data": {
    "getMetrics": {
      "totalRequests": 150,
      "successfulRequests": 142,
      "failedRequests": 8,
      "avgDuration": 3245.5,
      "uptime": 86400
    }
  }
}
```

## Mutation Examples

### Execute Query with User ID

```graphql
mutation {
  executeQuery(
    query: "Get facilities near capacity",
    userId: "user_123"
  ) {
    requestId
    message
    metadata {
      totalDurationMs
    }
  }
}
```

### Cancel Query

```graphql
mutation {
  cancelQuery(requestId: "550e8400-e29b-41d4-a716-446655440000")
}
```

**Response**:
```json
{
  "data": {
    "cancelQuery": true
  }
}
```

## Subscription Examples

### Query Progress

```graphql
subscription {
  queryProgress(requestId: "550e8400-e29b-41d4-a716-446655440000") {
    requestId
    phase
    progress
    message
    timestamp
  }
}
```

**Stream of Updates**:
```json
{ "phase": "planning", "progress": 20, "message": "Generating plan..." }
{ "phase": "execution", "progress": 50, "message": "Executing tools..." }
{ "phase": "analysis", "progress": 75, "message": "Analyzing results..." }
{ "phase": "summarization", "progress": 90, "message": "Generating summary..." }
{ "phase": "completed", "progress": 100, "message": "Complete" }
```

### Agent Status

```graphql
subscription {
  agentStatus {
    agent
    status
    timestamp
  }
}
```

## Client Integration

### JavaScript/TypeScript

```typescript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4001/graphql',
  cache: new InMemoryCache()
});

// Execute query
const { data } = await client.mutate({
  mutation: gql`
    mutation ExecuteQuery($query: String!) {
      executeQuery(query: $query) {
        requestId
        message
        toolsUsed
        metadata {
          totalDurationMs
        }
      }
    }
  `,
  variables: {
    query: "Get contaminated shipments"
  }
});

console.log(data.executeQuery.message);
```

### Python

```python
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport

transport = RequestsHTTPTransport(
    url='http://localhost:4001/graphql'
)

client = Client(transport=transport, fetch_schema_from_transport=True)

query = gql("""
    mutation {
      executeQuery(query: "Get shipments") {
        requestId
        message
        toolsUsed
      }
    }
""")

result = client.execute(query)
print(result['executeQuery']['message'])
```

### cURL

```bash
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { executeQuery(query: \"Get shipments\") { requestId message toolsUsed } }"
  }'
```

## Error Handling

### GraphQL Errors

```json
{
  "errors": [
    {
      "message": "Failed to generate valid plan",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["executeQuery"]
    }
  ],
  "data": {
    "executeQuery": null
  }
}
```

### Application Errors

```json
{
  "data": {
    "executeQuery": {
      "requestId": "550e8400-...",
      "message": "Error: Tool not found",
      "toolsUsed": [],
      "metadata": {
        "error": true  // ← Application error flag
      }
    }
  }
}
```

## Best Practices

1. **Always check `metadata.error` flag**
2. **Use `requestId` for tracking and debugging**
3. **Handle both GraphQL errors and application errors**
4. **Cache responses when appropriate**
5. **Use subscriptions for long-running queries**
6. **Include only needed fields to reduce payload**

## Related Documentation

- [Orchestrator Agent](./orchestrator.md) - Powers the GraphQL API
- [Integration Guide](./integration.md) - Set up GraphQL server
- [Testing Guide](./testing.md) - Test GraphQL endpoints

