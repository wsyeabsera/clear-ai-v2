import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResultsDisplay from '../components/ResultsDisplay';
import type { ExecutionResult } from '../types';

const mockResult: ExecutionResult = {
  requestId: 'req-123',
  message: 'Found 5 shipments in transit.',
  toolsUsed: ['shipments_list', 'facilities_get'],
  data: {},
  analysis: {
    summary: 'Analysis summary',
    insights: [
      {
        type: 'trend',
        description: 'Increasing contamination rate',
        confidence: 0.85,
        source: 'shipments_list',
      },
    ],
    entities: [
      {
        id: 'ship-1',
        type: 'shipment',
        name: 'Shipment 1',
        properties: {},
        relationships: [],
      },
    ],
    anomalies: [
      {
        type: 'contamination',
        description: 'High contaminant levels detected',
        severity: 'high',
        affectedEntities: ['ship-1'],
        confidence: 0.9,
      },
    ],
    metadata: {
      toolResultsCount: 2,
      successfulResults: 2,
      failedResults: 0,
      analysisTimeMs: 150,
    },
  },
  metadata: {
    requestId: 'req-123',
    totalDurationMs: 2500,
    timestamp: '2025-10-12T12:00:00Z',
    error: null,
  },
};

describe('ResultsDisplay Component', () => {
  it('should render main message', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText('Found 5 shipments in transit.')).toBeInTheDocument();
  });

  it('should display tools used', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText('shipments_list')).toBeInTheDocument();
    expect(screen.getByText('facilities_get')).toBeInTheDocument();
  });

  it('should show duration in seconds', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText(/Duration: 2.50s/i)).toBeInTheDocument();
  });

  it('should display request ID', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText(/Request ID: req-123/i)).toBeInTheDocument();
  });

  it('should render insights section', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText('Insights (1)')).toBeInTheDocument();
    expect(screen.getByText('Increasing contamination rate')).toBeInTheDocument();
  });

  it('should render entities section', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText('Entities (1)')).toBeInTheDocument();
  });

  it('should render anomalies section', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText('Anomalies (1)')).toBeInTheDocument();
    expect(screen.getByText('High contaminant levels detected')).toBeInTheDocument();
  });

  it('should display confidence percentage for insights', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText('85% confident')).toBeInTheDocument();
  });

  it('should handle result without analysis', () => {
    const resultNoAnalysis = {
      ...mockResult,
      analysis: {
        ...mockResult.analysis!,
        insights: [],
        entities: [],
        anomalies: [],
      },
    };
    render(<ResultsDisplay result={resultNoAnalysis} />);
    expect(screen.getByText('Found 5 shipments in transit.')).toBeInTheDocument();
    expect(screen.queryByText(/Insights/i)).not.toBeInTheDocument();
  });

  it('should show anomaly severity correctly', () => {
    render(<ResultsDisplay result={mockResult} />);
    const anomalyCard = screen.getByText('High contaminant levels detected').closest('.MuiAlert-root');
    expect(anomalyCard).toHaveClass('MuiAlert-standardError');
  });

  it('should truncate entity list when more than 10 entities', () => {
    const manyEntities = Array.from({ length: 15 }, (_, i) => ({
      id: `entity-${i}`,
      type: 'shipment',
      name: `Entity ${i}`,
      properties: {},
      relationships: [],
    }));

    const resultManyEntities = {
      ...mockResult,
      analysis: {
        ...mockResult.analysis!,
        entities: manyEntities,
      },
    };

    render(<ResultsDisplay result={resultManyEntities} />);
    expect(screen.getByText('... and 5 more entities')).toBeInTheDocument();
  });
});



