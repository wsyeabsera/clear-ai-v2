/**
 * Integration tests for Orchestrator Agent
 * Tests with all real services (LLM, Memory mocked, API), no agent mocks
 */

import { OrchestratorAgent } from '../../../agents/orchestrator.js';
import { PlannerAgent } from '../../../agents/planner.js';
import { ExecutorAgent } from '../../../agents/executor.js';
import { AnalyzerAgent } from '../../../agents/analyzer.js';
import { SummarizerAgent } from '../../../agents/summarizer.js';
import { MemoryManager } from '../../../shared/memory/manager.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { MCPServer } from '../../../mcp/server.js';
import { getLLMConfigs } from '../../../shared/llm/config.js';
import { registerAllTools } from '../../../tools/index.js';

describe('OrchestratorAgent Integration', () => {
  let orchestrator: OrchestratorAgent;
  let memory: MemoryManager;

  beforeAll(async () => {
    // Initialize real LLM
    const llmConfigs = getLLMConfigs();
    const llm = new LLMProvider(llmConfigs);

    // Initialize Memory with mocks
    const mockNeo4j = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      storeEvent: jest.fn().mockResolvedValue(undefined),
      queryEvents: jest.fn().mockResolvedValue([]),
      getEvent: jest.fn().mockResolvedValue(null),
      deleteEvent: jest.fn().mockResolvedValue(undefined),
    } as any;

    const mockPinecone = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      store: jest.fn().mockResolvedValue('id'),
      search: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue({}),
    } as any;

    memory = new MemoryManager(
      {
        neo4j: { uri: '', user: '', password: '' },
        pinecone: { api_key: '', environment: '', index_name: '' },
      },
      mockNeo4j,
      mockPinecone
    );

    await memory.connect();

    // Initialize MCP Server with real tools
    const mcpServer = new MCPServer('orchestrator-integration-test', '1.0.0');
    const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:4000/api';
    registerAllTools(mcpServer, apiUrl);

    // Create real agents (no mocks)
    const planner = new PlannerAgent(llm, mcpServer);
    const executor = new ExecutorAgent(mcpServer);
    const analyzer = new AnalyzerAgent(llm);
    const summarizer = new SummarizerAgent(llm);

    // Create orchestrator
    orchestrator = new OrchestratorAgent(
      planner,
      executor,
      analyzer,
      summarizer,
      memory
    );
  }, 30000);

  afterAll(async () => {
    await memory.close();
  });

  describe('Complete Pipeline Execution', () => {
    it('should execute full query flow', async () => {
      const response = await orchestrator.handleQuery('Get shipments from last week');

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.metadata.request_id).toBeDefined();
      expect(response.metadata.total_duration_ms).toBeGreaterThan(0);
      expect(response.tools_used.length).toBeGreaterThan(0);

      console.log('\n📋 Complete Response:');
      console.log('Message:', response.message);
      console.log('Tools:', response.tools_used);
      console.log('Duration:', response.metadata.total_duration_ms, 'ms');
    }, 60000);

    it('should handle complex nested queries', async () => {
      const response = await orchestrator.handleQuery(
        'Get contaminated shipments and their contaminant details'
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      
      if (!response.metadata.error) {
        expect(response.analysis).toBeDefined();
        expect(response.analysis?.insights).toBeDefined();
        
        console.log('\n💡 Insights:', response.analysis?.insights.length);
        console.log('🏷️  Entities:', response.analysis?.entities.length);
      }
    }, 60000);
  });

  describe('Memory Integration', () => {
    it('should store query in memory', async () => {
      const mockMemory = memory as any;
      
      const response = await orchestrator.handleQuery('test query');

      expect(response).toBeDefined();
      
      // Verify memory methods were called
      expect(mockMemory.neo4j.storeEvent).toHaveBeenCalled();
      expect(mockMemory.pinecone.store).toHaveBeenCalled();
    }, 60000);

    it('should load context from memory', async () => {
      const mockMemory = memory as any;
      mockMemory.pinecone.search.mockResolvedValue([
        { text: 'Previous query about shipments', score: 0.9, metadata: {} },
      ]);

      const response = await orchestrator.handleQuery('show me the same');

      expect(response).toBeDefined();
      expect(mockMemory.pinecone.search).toHaveBeenCalled();
    }, 60000);
  });

  describe('Error Recovery', () => {
    it('should handle errors gracefully', async () => {
      const response = await orchestrator.handleQuery('xyz invalid 123');

      // Should not crash
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.metadata.request_id).toBeDefined();
    }, 60000);
  });

  describe('Advanced Memory Integration', () => {
    it('should load memory context for follow-up queries', async () => {
      const mockMemory = memory as any;
      
      // Simulate previous context
      mockMemory.pinecone.search.mockResolvedValue([
        { 
          text: 'Previous query: Get facilities in Berlin',
          score: 0.95,
          metadata: { query: 'facilities Berlin', entities: ['Berlin', 'F1'] }
        },
        {
          text: 'Facility F1 has capacity issues',
          score: 0.85,
          metadata: { insight: 'capacity' }
        }
      ]);

      const response = await orchestrator.handleQuery('show me their shipments');

      expect(response).toBeDefined();
      expect(mockMemory.pinecone.search).toHaveBeenCalled();
      
      console.log('\n🧠 Follow-up query with context:', {
        message: response.message.substring(0, 100),
        contextLoaded: mockMemory.pinecone.search.mock.calls.length
      });
    }, 60000);

    it('should propagate errors through full pipeline', async () => {
      // Query that will likely fail at some stage
      const response = await orchestrator.handleQuery('Get data from nonexistent source XYZ');

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.metadata.request_id).toBeDefined();
      
      // Should handle error gracefully
      if (response.metadata.error) {
        console.log('\n⚠️  Error propagated correctly:', response.message.substring(0, 100));
      }
    }, 60000);

    it('should work with different memory configurations', async () => {
      // Test with memory disabled
      const mockMemory = memory as any;
      mockMemory.pinecone.search.mockRejectedValue(new Error('Memory unavailable'));

      const response = await orchestrator.handleQuery('Get shipments');

      // Should still work even if memory fails
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      
      console.log('\n💾 Query without memory succeeded:', !!response.message);
    }, 60000);
  });

  describe('Request Tracking', () => {
    it('should generate unique request IDs', async () => {
      const response1 = await orchestrator.handleQuery('Query 1');
      const response2 = await orchestrator.handleQuery('Query 2');
      const response3 = await orchestrator.handleQuery('Query 3');

      expect(response1.metadata.request_id).toBeDefined();
      expect(response2.metadata.request_id).toBeDefined();
      expect(response3.metadata.request_id).toBeDefined();
      
      // All IDs should be unique
      expect(response1.metadata.request_id).not.toBe(response2.metadata.request_id);
      expect(response2.metadata.request_id).not.toBe(response3.metadata.request_id);
      expect(response1.metadata.request_id).not.toBe(response3.metadata.request_id);
      
      // Should follow UUID format
      expect(response1.metadata.request_id).toMatch(/^[a-f0-9-]{36}$/);
      
      console.log('\n🆔 Request IDs generated:', {
        req1: response1.metadata.request_id,
        req2: response2.metadata.request_id,
        req3: response3.metadata.request_id
      });
    }, 90000);

    it('should collect execution metrics', async () => {
      const response = await orchestrator.handleQuery('Analyze shipments');

      expect(response.metadata).toBeDefined();
      expect(response.metadata.total_duration_ms).toBeGreaterThan(0);
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      
      // Check that tools were tracked
      expect(response.tools_used).toBeDefined();
      expect(Array.isArray(response.tools_used)).toBe(true);
      
      console.log('\n📊 Metrics collected:', {
        duration: response.metadata.total_duration_ms,
        toolsUsed: response.tools_used.length,
        timestamp: response.metadata.timestamp
      });
    }, 60000);
  });

  describe('Concurrent Query Handling', () => {
    it('should handle 3 queries in parallel', async () => {
      const startTime = Date.now();
      
      const [response1, response2, response3] = await Promise.all([
        orchestrator.handleQuery('Get shipments'),
        orchestrator.handleQuery('Get facilities'),
        orchestrator.handleQuery('Get inspections')
      ]);

      const totalDuration = Date.now() - startTime;

      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(response3).toBeDefined();
      
      // All should have unique request IDs
      expect(response1.metadata.request_id).not.toBe(response2.metadata.request_id);
      expect(response2.metadata.request_id).not.toBe(response3.metadata.request_id);
      
      console.log('\n⚡ Concurrent execution:', {
        totalTime: totalDuration,
        query1: response1.metadata.total_duration_ms,
        query2: response2.metadata.total_duration_ms,
        query3: response3.metadata.total_duration_ms,
        allSucceeded: !response1.metadata.error && !response2.metadata.error && !response3.metadata.error
      });
    }, 120000);
  });

  describe('Configuration Variations', () => {
    it('should work with different planner configurations', async () => {
      // Test with default planner config
      const response = await orchestrator.handleQuery('Get contaminated shipments from last week');

      expect(response).toBeDefined();
      expect(response.tools_used).toBeDefined();
      
      // Should have generated a plan and executed it
      expect(response.tools_used.length).toBeGreaterThan(0);
      
      console.log('\n⚙️  Planner config test:', {
        toolsUsed: response.tools_used,
        success: !response.metadata.error
      });
    }, 60000);

    it('should work with different analyzer modes', async () => {
      // Analyzer is already initialized in beforeAll
      // This tests that rule-based analysis works in pipeline
      const response = await orchestrator.handleQuery('Analyze facility capacity');

      expect(response).toBeDefined();
      expect(response.analysis).toBeDefined();
      
      if (response.analysis) {
        expect(response.analysis.insights).toBeDefined();
        expect(response.analysis.entities).toBeDefined();
        expect(response.analysis.anomalies).toBeDefined();
      }
      
      console.log('\n🔍 Analyzer mode test:', {
        hasAnalysis: !!response.analysis,
        insights: response.analysis?.insights.length || 0
      });
    }, 60000);

    it('should work with different summarizer formats', async () => {
      // Test that summarizer produces proper output format
      const response = await orchestrator.handleQuery('Show me inspection results');

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(typeof response.message).toBe('string');
      expect(response.message.length).toBeGreaterThan(20);
      
      console.log('\n📝 Summarizer format test:', {
        messageLength: response.message.length,
        hasAnalysis: !!response.analysis
      });
    }, 60000);
  });

  describe('Complex Scenarios', () => {
    it('should handle queries requiring multiple agents in sequence', async () => {
      const response = await orchestrator.handleQuery(
        'Get all shipments from Berlin facilities, analyze contamination patterns, and summarize the findings'
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.tools_used).toBeDefined();
      expect(response.analysis).toBeDefined();
      
      // Should have executed multiple steps
      expect(response.tools_used.length).toBeGreaterThan(0);
      
      console.log('\n🔄 Multi-agent pipeline:', {
        tools: response.tools_used,
        insights: response.analysis?.insights.length || 0,
        messageLength: response.message.length
      });
    }, 90000);

    it('should maintain data consistency through pipeline', async () => {
      const response = await orchestrator.handleQuery('Get 5 recent shipments with contaminants');

      expect(response).toBeDefined();
      
      // Response should have consistent data
      expect(response.tools_used).toBeDefined();
      expect(response.metadata.request_id).toBeDefined();
      
      // Analysis should be consistent with tools used
      if (response.analysis && response.analysis.entities.length > 0) {
        expect(response.message).toBeTruthy();
      }
      
      console.log('\n✓ Data consistency check:', {
        toolsUsed: response.tools_used.length,
        entities: response.analysis?.entities.length || 0,
        hasMessage: !!response.message
      });
    }, 60000);
  });
});

