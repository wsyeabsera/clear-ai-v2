// GraphQL Types matching backend schema

export interface ExecutionResult {
  requestId: string;
  message: string;
  toolsUsed: string[];
  data?: any;
  analysis?: Analysis;
  metadata: ResponseMetadata;
}

export interface Analysis {
  summary: string;
  insights: Insight[];
  entities: Entity[];
  anomalies: Anomaly[];
  metadata: AnalysisMetadata;
}

export interface Insight {
  type: string;
  description: string;
  confidence: number;
  supportingData: any[];
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
  relationships?: Relationship[];
}

export interface Relationship {
  type: string;
  targetEntityId?: string;
  strength?: number;
}

export interface Anomaly {
  type: string;
  description: string;
  severity: string;
  affectedEntities: string[];
  data: any;
}

export interface AnalysisMetadata {
  toolResultsCount: number;
  successfulResults?: number;
  failedResults?: number;
  analysisTimeMs: number;
}

export interface ResponseMetadata {
  requestId: string;
  totalDurationMs: number;
  timestamp: string;
  error?: boolean;
}

export interface RequestRecord {
  requestId: string;
  query: string;
  response: ExecutionResult;
  timestamp: string;
  userId?: string;
}

export interface SystemMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgDuration: number;
  uptime: number;
}

