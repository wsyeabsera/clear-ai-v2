/**
 * Shared test fixtures and mock data for shared library tests
 */

import { 
  Plan, 
  ToolResult, 
  Analysis,
  EpisodicEvent,
  SemanticRecord 
} from '../../../shared/types/index.js';

// Sample Tool Results
export const mockToolResults: ToolResult[] = [
  {
    success: true,
    tool: 'shipments',
    data: [
      { id: 'S1', name: 'Shipment 1', weight: 100 },
      { id: 'S2', name: 'Shipment 2', weight: 200 },
      { id: 'S3', name: 'Shipment 3', weight: 150 },
    ],
    metadata: {
      executionTime: 150,
      timestamp: '2025-10-11T10:00:00Z',
    },
  },
  {
    success: true,
    tool: 'facilities',
    data: {
      id: 'F1',
      name: 'Facility 1',
      location: 'Hannover',
    },
    metadata: {
      executionTime: 100,
      timestamp: '2025-10-11T10:00:01Z',
    },
  },
  {
    success: false,
    tool: 'contaminants',
    error: {
      code: '500',
      message: 'Internal server error',
    },
    metadata: {
      executionTime: 50,
      timestamp: '2025-10-11T10:00:02Z',
    },
  },
];

// Sample Plans
export const mockPlan: Plan = {
  steps: [
    {
      tool: 'shipments',
      params: {
        date_from: '2025-10-01',
        date_to: '2025-10-11',
      },
    },
    {
      tool: 'contaminants',
      params: {
        shipment_ids: '${step[0].data.*.id}',
      },
      depends_on: [0],
    },
  ],
  metadata: {
    query: 'Get contaminated shipments',
    timestamp: '2025-10-11T10:00:00Z',
  },
};

// Sample Analysis
export const mockAnalysis: Analysis = {
  summary: 'Found 3 shipments with 2 contaminants detected',
  insights: [
    {
      type: 'trend',
      description: 'Contamination rate is increasing',
      confidence: 0.85,
      supporting_data: [100, 120, 150],
    },
  ],
  entities: [
    {
      id: 'S1',
      type: 'shipment',
      name: 'Shipment 1',
      attributes: { weight: 100 },
    },
  ],
  anomalies: [
    {
      type: 'outlier',
      description: 'Unusually high weight',
      severity: 'medium',
      affected_entities: ['S2'],
      data: { weight: 500 },
    },
  ],
  metadata: {
    tool_results_count: 2,
    successful_results: 2,
    analysis_time_ms: 250,
  },
};

// Sample Episodic Event
export const mockEpisodicEvent: EpisodicEvent = {
  id: 'evt_123',
  type: 'request',
  timestamp: '2025-10-11T10:00:00Z',
  data: {
    query: 'Get shipments',
    results: mockToolResults,
  },
  relationships: {
    led_to: ['evt_456'],
  },
};

// Sample Semantic Record
export const mockSemanticRecord: SemanticRecord = {
  id: 'sem_123',
  text: 'Found 3 contaminated shipments in Hannover facility',
  embedding: new Array(1536).fill(0).map(() => Math.random()),
  metadata: {
    type: 'summary',
    timestamp: '2025-10-11T10:00:00Z',
    entities: ['S1', 'S2', 'S3', 'F1'],
  },
};

// Sample numerical datasets for statistics tests
export const sampleDatasets = {
  simple: [1, 2, 3, 4, 5],
  withOutliers: [10, 12, 11, 13, 12, 100, 11, 13],
  increasing: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  decreasing: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  stable: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  normal: [23, 25, 24, 26, 25, 24, 23, 25, 26, 24],
};

// Helper to create a mock ToolResult
export function createMockToolResult(
  overrides?: Partial<ToolResult>
): ToolResult {
  return {
    success: true,
    tool: 'test-tool',
    data: { test: 'data' },
    metadata: {
      executionTime: 100,
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

// Helper to create a mock failed operation
export function createFailedOperation(): () => Promise<never> {
  return async () => {
    throw new Error('Operation failed');
  };
}

// Helper to create a mock successful operation
export function createSuccessfulOperation<T>(result: T): () => Promise<T> {
  return async () => result;
}

