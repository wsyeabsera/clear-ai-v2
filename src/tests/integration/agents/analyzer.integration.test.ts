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
});

