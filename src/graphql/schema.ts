/**
 * GraphQL Schema Definition
 */

export const typeDefs = `#graphql
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

  type ProgressUpdate {
    requestId: ID!
    phase: String!
    progress: Float!
    message: String!
    timestamp: String!
  }

  type AgentStatusUpdate {
    agent: String!
    status: String!
    timestamp: String!
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

  type SemanticResult {
    id: ID!
    text: String!
    score: Float!
    metadata: JSON!
  }

  type EpisodicEvent {
    id: ID!
    type: String!
    timestamp: String!
    data: JSON!
  }

  type SystemMetrics {
    totalRequests: Int!
    successfulRequests: Int!
    failedRequests: Int!
    avgDuration: Float!
    uptime: Float!
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
    supportingData: [JSON!]!
  }

  type Entity {
    id: ID!
    type: String!
    name: String!
    attributes: JSON!
    relationships: [Relationship!]
  }

  type Relationship {
    type: String!
    targetEntityId: ID!
    strength: Float
  }

  type Anomaly {
    type: String!
    description: String!
    severity: String!
    affectedEntities: [ID!]!
    data: JSON!
  }

  type AnalysisMetadata {
    toolResultsCount: Int!
    successfulResults: Int
    failedResults: Int
    analysisTimeMs: Int!
  }

  type ResponseMetadata {
    requestId: ID!
    totalDurationMs: Int!
    timestamp: String!
    error: Boolean
  }

  scalar JSON
`;

