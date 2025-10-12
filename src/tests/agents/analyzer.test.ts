/**
 * Unit tests for Analyzer Agent
 * All dependencies are mocked
 */

import { AnalyzerAgent } from '../../agents/analyzer.js';
import { ToolResult } from '../../shared/types/agent.js';
import { LLMProvider } from '../../shared/llm/provider.js';

// Mock the LLM provider
jest.mock('../../shared/llm/provider.js');

describe('AnalyzerAgent', () => {
  let analyzer: AnalyzerAgent;
  let mockLLM: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn(),
    } as any;

    // Use rule-based analysis by default (no LLM)
    analyzer = new AnalyzerAgent(mockLLM, { useLLM: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty Results', () => {
    it('should handle empty results array', async () => {
      const results: ToolResult[] = [];
      const analysis = await analyzer.analyze(results);

      expect(analysis.insights).toEqual([]);
      expect(analysis.entities).toEqual([]);
      expect(analysis.anomalies).toEqual([]);
      expect(analysis.summary).toContain('No successful results');
    });

    it('should handle all failed results', async () => {
      const results: ToolResult[] = [
        {
          success: false,
          tool: 'shipments',
          error: { code: 'ERROR', message: 'Failed' },
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
      ];

      const analysis = await analyzer.analyze(results);

      expect(analysis.insights).toEqual([]);
      expect(analysis.summary).toContain('No successful results');
    });
  });

  describe('Shipment Analysis', () => {
    it('should detect high contamination rate', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: Array(10).fill(null).map((_, i) => ({
          id: `S${i}`,
          has_contaminants: i < 8, // 80% contaminated
          status: 'delivered',
        })),
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const contaminationInsight = analysis.insights.find(i => 
        i.description.includes('contamination rate')
      );

      expect(contaminationInsight).toBeDefined();
      expect(contaminationInsight?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect high rejection rate', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: Array(10).fill(null).map((_, i) => ({
          id: `S${i}`,
          has_contaminants: false,
          status: i < 3 ? 'rejected' : 'delivered', // 30% rejected
        })),
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const rejectionInsight = analysis.insights.find(i => 
        i.description.includes('rejection rate')
      );

      expect(rejectionInsight).toBeDefined();
    });

    it('should not generate insights for low contamination', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: Array(10).fill(null).map((_, i) => ({
          id: `S${i}`,
          has_contaminants: i === 0, // Only 10% contaminated
          status: 'delivered',
        })),
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const contaminationInsight = analysis.insights.find(i => 
        i.description.includes('contamination rate')
      );

      expect(contaminationInsight).toBeUndefined();
    });
  });

  describe('Contaminant Analysis', () => {
    it('should detect high-risk contaminants', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', type: 'Lead', risk_level: 'high', shipment_id: 'S1', concentration_ppm: 100 },
          { id: 'C2', type: 'Mercury', risk_level: 'critical', shipment_id: 'S2', concentration_ppm: 200 },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const riskInsight = analysis.insights.find(i => 
        i.description.includes('high-risk contaminants')
      );

      expect(riskInsight).toBeDefined();
      expect(riskInsight?.description).toContain('2');
    });

    it('should identify most common contaminant type', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', type: 'Lead', risk_level: 'high', shipment_id: 'S1', concentration_ppm: 100 },
          { id: 'C2', type: 'Lead', risk_level: 'medium', shipment_id: 'S2', concentration_ppm: 50 },
          { id: 'C3', type: 'Lead', risk_level: 'low', shipment_id: 'S3', concentration_ppm: 25 },
          { id: 'C4', type: 'Mercury', risk_level: 'high', shipment_id: 'S4', concentration_ppm: 80 },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const typeInsight = analysis.insights.find(i => 
        i.description.includes('Most common contaminant')
      );

      expect(typeInsight).toBeDefined();
      expect(typeInsight?.description).toContain('Lead');
      expect(typeInsight?.description).toContain('3');
    });
  });

  describe('Inspection Analysis', () => {
    it('should calculate inspection acceptance rate', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'inspections',
        data: [
          { id: 'I1', status: 'accepted', shipment_id: 'S1', facility_id: 'F1', date: '2025-10-01', inspector: 'John' },
          { id: 'I2', status: 'accepted', shipment_id: 'S2', facility_id: 'F1', date: '2025-10-01', inspector: 'Jane' },
          { id: 'I3', status: 'rejected', shipment_id: 'S3', facility_id: 'F1', date: '2025-10-01', inspector: 'Bob' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const acceptanceInsight = analysis.insights.find(i => 
        i.description.includes('acceptance rate')
      );

      expect(acceptanceInsight).toBeDefined();
      expect(acceptanceInsight?.description).toMatch(/66\.7|67/);
    });
  });

  describe('Facility Analysis', () => {
    it('should detect over-utilized facilities', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'facilities',
        data: [
          { id: 'F1', name: 'Facility 1', capacity_tons: 100, current_load_tons: 95, type: 'processing', location: 'Hannover' },
          { id: 'F2', name: 'Facility 2', capacity_tons: 200, current_load_tons: 50, type: 'processing', location: 'Berlin' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const utilizationInsight = analysis.insights.find(i => 
        i.description.includes('90% capacity')
      );

      expect(utilizationInsight).toBeDefined();
      expect(utilizationInsight?.description).toContain('1');
    });
  });

  describe('Entity Extraction', () => {
    it('should extract entities from shipments', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', facility_id: 'F1', status: 'delivered', has_contaminants: false, weight_kg: 100, date: '2025-10-01' },
          { id: 'S2', facility_id: 'F2', status: 'pending', has_contaminants: true, weight_kg: 200, date: '2025-10-02' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.entities).toHaveLength(2);
      expect(analysis.entities[0].type).toBe('shipment');
      expect(analysis.entities[0].id).toBe('S1');
    });

    it('should extract relationships from entities', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          {
            id: 'C1',
            shipment_id: 'S1',
            facility_id: 'F1',
            type: 'Lead',
            risk_level: 'high',
            concentration_ppm: 100,
            detected_at: '2025-10-01',
          },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.entities).toHaveLength(1);
      expect(analysis.entities[0].relationships).toBeDefined();
      expect(analysis.entities[0].relationships?.length).toBeGreaterThan(0);
    });

    it('should deduplicate entities', async () => {
      const results: ToolResult[] = [
        {
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1', facility_id: 'F1', status: 'delivered', has_contaminants: false, weight_kg: 100, date: '2025-10-01' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1', facility_id: 'F1', status: 'delivered', has_contaminants: false, weight_kg: 100, date: '2025-10-01' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
      ];

      const analysis = await analyzer.analyze(results);

      expect(analysis.entities).toHaveLength(1);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect critical contaminants as anomalies', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          {
            id: 'C1',
            shipment_id: 'S1',
            type: 'Lead',
            risk_level: 'critical',
            concentration_ppm: 500,
            detected_at: '2025-10-01',
          },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.anomalies.length).toBeGreaterThan(0);
      expect(analysis.anomalies[0].severity).toBe('critical');
    });

    it('should detect statistical outliers in contamination levels', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', shipment_id: 'S1', type: 'Lead', risk_level: 'low', concentration_ppm: 10, detected_at: '2025-10-01' },
          { id: 'C2', shipment_id: 'S2', type: 'Lead', risk_level: 'low', concentration_ppm: 12, detected_at: '2025-10-01' },
          { id: 'C3', shipment_id: 'S3', type: 'Lead', risk_level: 'low', concentration_ppm: 11, detected_at: '2025-10-01' },
          { id: 'C4', shipment_id: 'S4', type: 'Lead', risk_level: 'low', concentration_ppm: 13, detected_at: '2025-10-01' },
          { id: 'C5', shipment_id: 'S5', type: 'Lead', risk_level: 'low', concentration_ppm: 9, detected_at: '2025-10-01' },
          { id: 'C6', shipment_id: 'S6', type: 'Lead', risk_level: 'high', concentration_ppm: 1000, detected_at: '2025-10-01' }, // Extreme outlier
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const outlierAnomaly = analysis.anomalies.find(a => a.type === 'outlier');
      expect(outlierAnomaly).toBeDefined();
    });

    it('should detect rejected shipments without contaminants', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', status: 'rejected', has_contaminants: false, facility_id: 'F1', weight_kg: 100, date: '2025-10-01' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      const unexpectedAnomaly = analysis.anomalies.find(a => a.type === 'unexpected');
      expect(unexpectedAnomaly).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use custom anomaly threshold', async () => {
      const customAnalyzer = new AnalyzerAgent(mockLLM, {
        useLLM: false,
        anomalyThreshold: 1.0, // More sensitive
      });

      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', shipment_id: 'S1', type: 'Lead', risk_level: 'low', concentration_ppm: 10, detected_at: '2025-10-01' },
          { id: 'C2', shipment_id: 'S2', type: 'Lead', risk_level: 'low', concentration_ppm: 15, detected_at: '2025-10-01' },
          { id: 'C3', shipment_id: 'S3', type: 'Lead', risk_level: 'low', concentration_ppm: 12, detected_at: '2025-10-01' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await customAnalyzer.analyze(results);
      expect(analysis).toBeDefined();
    });

    it('should filter insights by minimum confidence', async () => {
      const strictAnalyzer = new AnalyzerAgent(mockLLM, {
        useLLM: false,
        minConfidence: 0.95, // Very high threshold
      });

      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: Array(10).fill(null).map((_, i) => ({
          id: `S${i}`,
          has_contaminants: i < 4, // 40% contaminated (medium confidence)
          status: 'delivered',
        })),
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await strictAnalyzer.analyze(results);

      // All insights should have high confidence
      for (const insight of analysis.insights) {
        expect(insight.confidence).toBeGreaterThanOrEqual(0.95);
      }
    });
  });

  describe('Metadata', () => {
    it('should include analysis metadata', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [{ id: 'S1', status: 'delivered', has_contaminants: false, facility_id: 'F1', weight_kg: 100, date: '2025-10-01' }],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.metadata.tool_results_count).toBe(1);
      expect(analysis.metadata.successful_results).toBe(1);
      expect(analysis.metadata.failed_results).toBe(0);
      expect(analysis.metadata.analysis_time_ms).toBeGreaterThan(0);
    });
  });
});

