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

    """Get stored plan by request ID"""
    getPlan(requestId: ID!): PlanResult

    """Get execution results by request ID"""
    getExecution(requestId: ID!): ExecutionResults

    """List execution results with filters"""
    listExecutions(
      status: String
      limit: Int
      offset: Int
      startDate: String
      endDate: String
    ): ExecutionListResult

    """Get execution statistics"""
    getExecutionStats: ExecutionStats
  }

  type Mutation {
    # Individual agent calls
    """Generate an execution plan for a query"""
    planQuery(query: String!, context: JSON): PlanResult!

    """Execute tools based on a stored plan"""
    executeTools(requestId: ID!): ExecutionResults!

    """Analyze tool execution results"""
    analyzeResults(requestId: ID!): AnalysisResult!

    """Summarize analysis into a response"""
    summarizeResponse(analysis: AnalysisInput!, toolResults: [ToolResultInput!]!, query: String!): SummaryResult!

    """Cancel an in-progress query"""
    cancelQuery(requestId: ID!): Boolean!
  }

  type Subscription {
    # Existing
    """Subscribe to query progress updates"""
    queryProgress(requestId: ID!): ProgressUpdate!

    """Subscribe to agent status updates"""
    agentStatus: AgentStatusUpdate!

    # New - per-agent subscriptions
    """Subscribe to planner progress updates"""
    plannerProgress(requestId: ID!): PlannerUpdate!

    """Subscribe to executor progress updates"""
    executorProgress(requestId: ID!): ExecutorUpdate!

    """Subscribe to analyzer progress updates"""
    analyzerProgress(requestId: ID!): AnalyzerUpdate!

    """Subscribe to summarizer progress updates"""
    summarizerProgress(requestId: ID!): SummarizerUpdate!
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
    targetEntityId: ID
    strength: String
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

  # New types for individual agent endpoints
  type PlanResult {
    requestId: ID!
    plan: Plan!
    metadata: PlanMetadata!
    status: String
  }

  type Plan {
    steps: [PlanStep!]!
  }

  type PlanStep {
    tool: String!
    params: JSON!
    dependsOn: [Int!]
    parallel: Boolean
  }

  type PlanMetadata {
    query: String!
    timestamp: String!
    estimatedDurationMs: Int
  }

  type ExecutionResults {
    requestId: ID!
    results: [ToolResult!]!
    metadata: ExecutionMetadata!
  }

  type ToolResult {
    success: Boolean!
    tool: String!
    data: JSON
    error: ErrorDetails
    metadata: ToolResultMetadata!
  }

  type ErrorDetails {
    code: String!
    message: String!
    details: JSON
  }

  type ToolResultMetadata {
    executionTime: Int!
    timestamp: String!
    retries: Int
  }

  type ExecutionMetadata {
    totalDurationMs: Int!
    successfulSteps: Int!
    failedSteps: Int!
    timestamp: String!
  }

  type ExecutionListResult {
    executions: [ExecutionResults!]!
    total: Int!
    hasMore: Boolean!
  }

  type ExecutionStats {
    total: Int!
    byStatus: JSON!
    averageDuration: Float!
  }

  type AnalysisResult {
    requestId: ID!
    analysis: Analysis!
    metadata: AnalysisMetadata!
  }

  type SummaryResult {
    requestId: ID!
    message: String!
    toolsUsed: [String!]!
    metadata: ResponseMetadata!
  }

  # Input types for mutations
  input PlanInput {
    steps: [PlanStepInput!]!
  }

  input PlanStepInput {
    tool: String!
    params: JSON!
    dependsOn: [Int!]
    parallel: Boolean
  }

  input ToolResultInput {
    success: Boolean!
    tool: String!
    data: JSON
    error: ErrorDetailsInput
    metadata: ToolResultMetadataInput!
  }

  input ErrorDetailsInput {
    code: String!
    message: String!
    details: JSON
  }

  input ToolResultMetadataInput {
    executionTime: Int!
    timestamp: String!
    retries: Int
  }

  input AnalysisInput {
    summary: String!
    insights: [InsightInput!]!
    entities: [EntityInput!]!
    anomalies: [AnomalyInput!]!
    metadata: AnalysisMetadataInput!
  }

  input InsightInput {
    type: String!
    description: String!
    confidence: Float!
    supportingData: [JSON!]!
  }

  input EntityInput {
    id: ID!
    type: String!
    name: String!
    attributes: JSON!
    relationships: [RelationshipInput!]
  }

  input RelationshipInput {
    type: String!
    targetEntityId: ID
    strength: String
  }

  input AnomalyInput {
    type: String!
    description: String!
    severity: String!
    affectedEntities: [ID!]!
    data: JSON!
  }

  input AnalysisMetadataInput {
    toolResultsCount: Int!
    successfulResults: Int
    failedResults: Int
    analysisTimeMs: Int!
  }

  # Per-agent progress update types
  type PlannerUpdate {
    requestId: ID!
    phase: String!
    progress: Float!
    message: String!
    timestamp: String!
  }

  type ExecutorUpdate {
    requestId: ID!
    phase: String!
    progress: Float!
    message: String!
    currentStep: String
    timestamp: String!
  }

  type AnalyzerUpdate {
    requestId: ID!
    phase: String!
    progress: Float!
    message: String!
    timestamp: String!
  }

  type SummarizerUpdate {
    requestId: ID!
    phase: String!
    progress: Float!
    message: String!
    timestamp: String!
  }

  scalar JSON
`;

