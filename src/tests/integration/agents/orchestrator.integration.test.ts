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
    const apiUrl = process.env.WASTEER_API_URL || 'http://localhost:3000/api';
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
});

