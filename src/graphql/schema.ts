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

    """Get analysis results by request ID"""
    getAnalysis(requestId: ID!): AnalysisResult

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

    # Agent Configuration Management
    """Get agent configuration by ID"""
    getAgentConfig(id: ID!): AgentConfig

    """List agent configurations with filters"""
    listAgentConfigs(
      type: AgentType
      isActive: Boolean
      isDefault: Boolean
      limit: Int
      offset: Int
    ): [AgentConfig!]!

    """Get default configuration for an agent type"""
    getDefaultConfig(type: AgentType!): AgentConfig

    """List available analysis strategies"""
    listAnalysisStrategies: [StrategyInfo!]!

    """List available summarization strategies"""
    listSummarizationStrategies: [StrategyInfo!]!

    # Training & Feedback
    """Get training feedback by ID"""
    getTrainingFeedback(id: ID!): TrainingFeedback

    """List training feedback with filters"""
    listTrainingFeedback(
      configId: ID
      agentType: AgentType
      limit: Int
      offset: Int
    ): [TrainingFeedback!]!

    """Get training statistics for a configuration"""
    getTrainingStats(configId: ID!): TrainingStats
  }

  type Mutation {
    # Individual agent calls
    """Generate an execution plan for a query"""
    planQuery(query: String!, context: JSON): PlanResult!

    """Execute tools based on a stored plan"""
    executeTools(requestId: ID!): ExecutionResults!

    """Analyze tool execution results"""
    analyzeResults(requestId: ID!, analyzerConfigId: ID): AnalysisResult!

    """Summarize analysis into a response"""
    summarizeResponse(requestId: ID!, summarizerConfigId: ID): SummaryResult!

    """Cancel an in-progress query"""
    cancelQuery(requestId: ID!): Boolean!

    # Agent Configuration Management
    """Create a new agent configuration"""
    createAgentConfig(input: CreateAgentConfigInput!): AgentConfig!

    """Update an existing agent configuration"""
    updateAgentConfig(id: ID!, input: UpdateAgentConfigInput!): AgentConfig!

    """Delete an agent configuration"""
    deleteAgentConfig(id: ID!): Boolean!

    """Set a configuration as default for its agent type"""
    setDefaultConfig(id: ID!): AgentConfig!

    """Clone an existing configuration"""
    cloneAgentConfig(id: ID!, name: String!): AgentConfig!

    # Training & Feedback
    """Submit feedback for a request"""
    submitFeedback(input: SubmitFeedbackInput!): TrainingFeedback!

    """Train a configuration based on collected feedback"""
    trainConfig(configId: ID!, options: TrainingOptionsInput): TrainingResult!

    """Apply a proposed training update"""
    applyTrainingUpdate(configId: ID!, updateData: JSON!): AgentConfig!
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

  # Agent Configuration Types
  enum AgentType {
    analyzer
    summarizer
  }

  type AgentConfig {
    id: ID!
    name: String!
    version: Int!
    type: AgentType!
    description: String
    isDefault: Boolean!
    isActive: Boolean!
    config: JSON
    metadata: AgentConfigMetadata
    createdAt: String!
    updatedAt: String!
  }

  type AgentConfigMetadata {
    createdBy: String
    description: String
    tags: [String!]
    performanceMetrics: PerformanceMetrics
    version: String
    isSystemDefault: Boolean
  }

  type PerformanceMetrics {
    avgConfidence: Float!
    avgQualityScore: Float!
    totalUsage: Int!
    lastUsed: String
    successRate: Float
  }

  type StrategyInfo {
    name: String!
    description: String!
    version: String
  }

  input CreateAgentConfigInput {
    name: String!
    type: AgentType!
    description: String
    config: JSON
    isDefault: Boolean
    isActive: Boolean
    metadata: AgentConfigMetadataInput
  }

  input UpdateAgentConfigInput {
    name: String
    description: String
    config: JSON
    isActive: Boolean
    metadata: AgentConfigMetadataInput
  }

  input AgentConfigMetadataInput {
    createdBy: String
    description: String
    tags: [String!]
  }

  # Training & Feedback Types
  type TrainingFeedback {
    id: ID!
    requestId: ID!
    configId: ID!
    agentType: AgentType!
    rating: FeedbackRating!
    issues: [FeedbackIssue!]!
    suggestions: [String!]!
    metadata: FeedbackMetadata!
    createdAt: String!
  }

  type FeedbackRating {
    overall: Int!
    accuracy: Int
    relevance: Int
    clarity: Int
    actionability: Int
  }

  type FeedbackIssue {
    type: FeedbackIssueType!
    severity: FeedbackSeverity!
    description: String!
    suggestion: String
  }

  enum FeedbackIssueType {
    accuracy
    relevance
    clarity
    completeness
    actionability
    tone
  }

  enum FeedbackSeverity {
    low
    medium
    high
    critical
  }

  type FeedbackMetadata {
    query: String
    responseTime: Int
    confidence: Float
    qualityScore: Float
    userAgent: String
    sessionId: String
  }

  input SubmitFeedbackInput {
    requestId: ID!
    configId: ID!
    agentType: AgentType!
    rating: FeedbackRatingInput!
    issues: [FeedbackIssueInput!]
    suggestions: [String!]
    metadata: FeedbackMetadataInput
  }

  input FeedbackRatingInput {
    overall: Int!
    accuracy: Int
    relevance: Int
    clarity: Int
    actionability: Int
  }

  input FeedbackIssueInput {
    type: FeedbackIssueType!
    severity: FeedbackSeverity!
    description: String!
    suggestion: String
  }

  input FeedbackMetadataInput {
    query: String
    responseTime: Int
    confidence: Float
    qualityScore: Float
    userAgent: String
    sessionId: String
  }

  type TrainingStats {
    configId: ID!
    totalFeedback: Int!
    avgRating: Float!
    commonIssues: [IssueFrequency!]!
    recentTrend: String!
    performanceMetrics: PerformanceMetrics
    recommendations: [String!]!
  }

  type IssueFrequency {
    type: FeedbackIssueType!
    count: Int!
    percentage: Float!
  }

  type TrainingResult {
    configId: ID!
    updates: [ConfigUpdate!]!
    status: TrainingStatus!
    message: String!
    completedAt: String!
  }

  type ConfigUpdate {
    id: ID!
    type: ConfigUpdateType!
    description: String!
    changes: JSON!
    confidence: Float!
    reasoning: String!
    status: ConfigUpdateStatus!
  }

  enum ConfigUpdateType {
    threshold_adjustment
    prompt_optimization
    strategy_change
    parameter_tuning
  }

  enum ConfigUpdateStatus {
    pending
    approved
    rejected
    applied
  }

  enum TrainingStatus {
    success
    partial
    failed
  }

  input TrainingOptionsInput {
    minSamples: Int
    strategy: TrainingStrategy
    maxIterations: Int
  }

  enum TrainingStrategy {
    conservative
    aggressive
    balanced
  }
`;

