/**
 * Integration tests for Analyzer Agent
 * Tests with real LLM and real data, no mocks
 */

import { AnalyzerAgent } from '../../../agents/analyzer.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { getLLMConfigs } from '../../../shared/llm/config.js';
import { ToolResult } from '../../../shared/types/agent.js';

describe('AnalyzerAgent Integration', () => {
  let analyzer: AnalyzerAgent;
  let llm: LLMProvider;

  beforeAll(() => {
    const llmConfigs = getLLMConfigs();
    llm = new LLMProvider(llmConfigs);
    
    // Use rule-based analysis (can also test with LLM)
    analyzer = new AnalyzerAgent(llm, { useLLM: false });
  });

  describe('Real Data Analysis', () => {
    it('should analyze shipment results with contamination', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 100, date: '2025-10-01' },
          { id: 'S2', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 150, date: '2025-10-02' },
          { id: 'S3', has_contaminants: false, status: 'accepted', facility_id: 'F1', weight_kg: 200, date: '2025-10-03' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.insights.length).toBeGreaterThan(0);
      expect(analysis.entities.length).toBe(3);
      expect(analysis.summary).toBeDefined();
    });

    it('should analyze contaminant data with anomalies', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', shipment_id: 'S1', type: 'Lead', risk_level: 'critical', concentration_ppm: 500, detected_at: '2025-10-01' },
          { id: 'C2', shipment_id: 'S2', type: 'Mercury', risk_level: 'high', concentration_ppm: 300, detected_at: '2025-10-02' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.anomalies.length).toBeGreaterThan(0);
      expect(analysis.anomalies[0].severity).toBe('critical');
      expect(analysis.insights.length).toBeGreaterThan(0);
    });
  });

  describe('LLM-Based Analysis', () => {
    it('should generate insights with real LLM', async () => {
      const analyzerWithLLM = new AnalyzerAgent(llm, { useLLM: true });

      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', has_contaminants: true, status: 'delivered', facility_id: 'F1', weight_kg: 100, date: '2025-10-01' },
          { id: 'S2', has_contaminants: true, status: 'delivered', facility_id: 'F1', weight_kg: 150, date: '2025-10-02' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzerWithLLM.analyze(results);

      expect(analysis).toBeDefined();
      expect(analysis.summary).toBeDefined();
      
      // LLM should generate some insights or fall back to rule-based
      expect(analysis.insights).toBeDefined();
    }, 30000);
  });

  describe('Multi-Tool Analysis', () => {
    it('should analyze results from multiple tools', async () => {
      const results: ToolResult[] = [
        {
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1', has_contaminants: true, status: 'delivered', facility_id: 'F1', weight_kg: 100, date: '2025-10-01' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: true,
          tool: 'facilities',
          data: [{ id: 'F1', name: 'Test Facility', type: 'processing', capacity_tons: 100, current_load_tons: 95, location: 'Test' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
      ];

      const analysis = await analyzer.analyze(results);

      expect(analysis.entities.length).toBeGreaterThan(0);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });
  });

  describe('Large Dataset Analysis', () => {
    it('should analyze LLM with large dataset (50+ records)', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: `S${i}`,
        has_contaminants: i % 3 === 0,
        status: i % 4 === 0 ? 'rejected' : 'delivered',
        facility_id: `F${i % 10}`,
        weight_kg: 100 + i * 10,
        date: `2025-10-${String(Math.min(i + 1, 31)).padStart(2, '0')}`
      }));

      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: largeDataset,
        metadata: { executionTime: 200, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.insights.length).toBeGreaterThan(0);
      expect(analysis.entities.length).toBe(50);
      expect(analysis.summary).toBeDefined();
      
      console.log('Large dataset analysis:', {
        insights: analysis.insights.length,
        entities: analysis.entities.length,
        anomalies: analysis.anomalies.length
      });
    }, 40000);

    it('should handle statistical analysis edge case: all same values', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `C${i}`,
          shipment_id: `S${i}`,
          type: 'Lead',
          risk_level: 'medium',
          concentration_ppm: 100, // All same
          detected_at: '2025-10-01'
        })),
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis).toBeDefined();
      // No outliers expected when all values are same
      const outlierAnomalies = analysis.anomalies.filter(a => a.type === 'outlier');
      expect(outlierAnomalies.length).toBe(0);
      
      console.log('Same values analysis:', { anomalies: analysis.anomalies.length });
    }, 30000);

    it('should handle statistical analysis edge case: all different values', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `C${i}`,
          shipment_id: `S${i}`,
          type: 'Lead',
          risk_level: 'medium',
          concentration_ppm: 100 + i * 50, // All different
          detected_at: '2025-10-01'
        })),
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis).toBeDefined();
      expect(analysis.entities.length).toBe(10);
      
      console.log('Different values analysis:', { 
        insights: analysis.insights.length,
        anomalies: analysis.anomalies.length 
      });
    }, 30000);

    it('should detect anomalies with various thresholds', async () => {
      const strictAnalyzer = new AnalyzerAgent(llm, { anomalyThreshold: 1.0 });
      
      const results: ToolResult[] = [{
        success: true,
        tool: 'contaminants-detected',
        data: [
          { id: 'C1', shipment_id: 'S1', type: 'Lead', risk_level: 'medium', concentration_ppm: 100, detected_at: '2025-10-01' },
          { id: 'C2', shipment_id: 'S2', type: 'Lead', risk_level: 'medium', concentration_ppm: 110, detected_at: '2025-10-01' },
          { id: 'C3', shipment_id: 'S3', type: 'Lead', risk_level: 'high', concentration_ppm: 500, detected_at: '2025-10-01' }, // Outlier
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await strictAnalyzer.analyze(results);

      expect(analysis.anomalies.length).toBeGreaterThan(0);
      
      console.log('Anomaly detection:', { anomalies: analysis.anomalies.length });
    }, 30000);

    it('should extract entities from different data types', async () => {
      const results: ToolResult[] = [
        {
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1', facility_id: 'F1', weight_kg: 100, date: '2025-10-01' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: true,
          tool: 'facilities',
          data: [{ id: 'F1', name: 'Test', type: 'processing', capacity_tons: 100, location: 'Berlin' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: true,
          tool: 'contaminants-detected',
          data: [{ id: 'C1', shipment_id: 'S1', type: 'Lead', risk_level: 'high', concentration_ppm: 200, detected_at: '2025-10-01' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
      ];

      const analysis = await analyzer.analyze(results);

      expect(analysis.entities.length).toBe(3);
      
      const shipmentEntity = analysis.entities.find(e => e.type === 'shipment');
      const facilityEntity = analysis.entities.find(e => e.type === 'facility');
      const contaminantEntity = analysis.entities.find(e => e.type === 'contaminant');
      
      expect(shipmentEntity).toBeDefined();
      expect(facilityEntity).toBeDefined();
      expect(contaminantEntity).toBeDefined();
      
      console.log('Entity extraction:', {
        shipment: !!shipmentEntity,
        facility: !!facilityEntity,
        contaminant: !!contaminantEntity
      });
    }, 30000);

    it('should score confidence accurately across different patterns', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 100, date: '2025-10-01' },
          { id: 'S2', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 150, date: '2025-10-02' },
          { id: 'S3', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 200, date: '2025-10-03' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis.insights.length).toBeGreaterThan(0);
      
      // Check that confidence scores are reasonable
      for (const insight of analysis.insights) {
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      }
      
      console.log('Confidence scoring:', analysis.insights.map(i => i.confidence));
    }, 30000);

    it('should handle completely empty dataset', async () => {
      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await analyzer.analyze(results);

      expect(analysis).toBeDefined();
      expect(analysis.insights.length).toBe(0);
      expect(analysis.entities.length).toBe(0);
      expect(analysis.anomalies.length).toBe(0);
      
      console.log('Empty dataset analysis:', analysis.summary);
    }, 30000);

    it('should handle all failed tool results', async () => {
      const results: ToolResult[] = [
        {
          success: false,
          tool: 'shipments',
          error: { code: 'FAILED', message: 'Network error' },
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: false,
          tool: 'facilities',
          error: { code: 'FAILED', message: 'Timeout' },
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
      ];

      const analysis = await analyzer.analyze(results);

      expect(analysis).toBeDefined();
      expect(analysis.summary).toContain('No successful results');
      expect(analysis.insights.length).toBe(0);
      
      console.log('Failed results analysis:', analysis.summary);
    }, 30000);

    it('should handle mixed success/failure results', async () => {
      const results: ToolResult[] = [
        {
          success: true,
          tool: 'shipments',
          data: [{ id: 'S1', has_contaminants: true, status: 'delivered', facility_id: 'F1', weight_kg: 100, date: '2025-10-01' }],
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
        {
          success: false,
          tool: 'facilities',
          error: { code: 'FAILED', message: 'Not found' },
          metadata: { executionTime: 100, timestamp: new Date().toISOString() },
        },
      ];

      const analysis = await analyzer.analyze(results);

      expect(analysis).toBeDefined();
      expect(analysis.entities.length).toBe(1);
      expect(analysis.metadata.successful_results).toBe(1);
      expect(analysis.metadata.failed_results).toBe(1);
      
      console.log('Mixed results analysis:', {
        successful: analysis.metadata.successful_results,
        failed: analysis.metadata.failed_results
      });
    }, 30000);

    it('should generate quality insights with real LLM', async () => {
      const llmAnalyzer = new AnalyzerAgent(llm, { useLLM: true });

      const results: ToolResult[] = [{
        success: true,
        tool: 'shipments',
        data: [
          { id: 'S1', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 100, carrier: 'CarrierA', date: '2025-10-01' },
          { id: 'S2', has_contaminants: true, status: 'rejected', facility_id: 'F1', weight_kg: 150, carrier: 'CarrierA', date: '2025-10-02' },
          { id: 'S3', has_contaminants: false, status: 'delivered', facility_id: 'F2', weight_kg: 200, carrier: 'CarrierB', date: '2025-10-03' },
        ],
        metadata: { executionTime: 100, timestamp: new Date().toISOString() },
      }];

      const analysis = await llmAnalyzer.analyze(results);

      expect(analysis).toBeDefined();
      expect(analysis.insights).toBeDefined();
      expect(analysis.summary).toBeDefined();
      
      console.log('LLM insights:', {
        count: analysis.insights.length,
        summary: analysis.summary.substring(0, 100)
      });
    }, 40000);
  });
});

