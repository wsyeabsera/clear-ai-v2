/**
 * Orchestrator Agent
 * Main entry point and coordinator for the entire agent system
 */

import { PlannerAgent } from './planner.js';
import { ExecutorAgent } from './executor.js';
import { AnalyzerAgent } from './analyzer.js';
import { SummarizerAgent } from './summarizer.js';
import { MemoryManager } from '../shared/memory/manager.js';
import { FinalResponse } from '../shared/types/agent.js';
import { randomUUID } from 'crypto';

export interface ProgressUpdate {
  requestId: string;
  phase: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface OrchestratorConfig {
  enableMemory: boolean;
  maxRetries: number;
  timeout: number;
  enableContextLoading: boolean;
}

export class OrchestratorAgent {
  private config: OrchestratorConfig;

  constructor(
    private planner: PlannerAgent,
    private executor: ExecutorAgent,
    private analyzer: AnalyzerAgent,
    private summarizer: SummarizerAgent,
    private memory: MemoryManager,
    config?: Partial<OrchestratorConfig>
  ) {
    this.config = {
      enableMemory: true,
      maxRetries: 3,
      timeout: 60000,
      enableContextLoading: true,
      ...config,
    };
  }

  async handleQuery(
    query: string, 
    progressCallback?: (update: ProgressUpdate) => void
  ): Promise<FinalResponse> {
    const requestId = randomUUID();
    const startTime = Date.now();

    console.log(`🎯 [Orchestrator][${requestId}] Processing query: ${query}`);

    const emitProgress = (phase: string, progress: number, message: string) => {
      const update = {
        requestId,
        phase,
        progress,
        message,
        timestamp: new Date().toISOString(),
      };
      console.log(`📊 [Progress] ${phase} - ${progress}% - ${message}`);
      progressCallback?.(update);
    };

    try {
      // 1. Load relevant context from memory (if enabled)
      emitProgress('context-loading', 10, 'Loading relevant context...');
      let context = {};
      if (this.config.enableMemory && this.config.enableContextLoading) {
        context = await this.loadContext(query);
        console.log(`🔍 [Orchestrator][${requestId}] Loaded context`);
      }

      // 2. Generate execution plan
      emitProgress('planning', 20, 'Generating execution plan...');
      console.log(`🗺️  [Orchestrator][${requestId}] Planning...`);
      const plan = await this.planner.plan(query, context);
      console.log(`✅ [Orchestrator][${requestId}] Plan generated: ${plan.steps.length} steps`);

      // 3. Execute plan
      emitProgress('executing', 40, `Executing plan with ${plan.steps.length} steps...`);
      console.log(`⚡ [Orchestrator][${requestId}] Executing plan...`);
      
      // Create executor progress callback
      const executorProgress = (stepIndex: number, total: number, stepName: string) => {
        const stepProgress = 40 + Math.floor((stepIndex / total) * 30);
        emitProgress('executing', stepProgress, `Executing step ${stepIndex}/${total}: ${stepName}`);
      };
      
      const results = await this.executor.execute(plan, executorProgress);
      console.log(`✅ [Orchestrator][${requestId}] Execution complete. Results: ${results.length}`);

      // 4. Analyze results
      emitProgress('analyzing', 70, 'Analyzing results...');
      console.log(`📊 [Orchestrator][${requestId}] Analyzing results...`);
      const analysis = await this.analyzer.analyze(results);
      console.log(`✅ [Orchestrator][${requestId}] Analysis complete`);

      // 5. Generate summary
      emitProgress('summarizing', 85, 'Generating summary...');
      console.log(`📝 [Orchestrator][${requestId}] Generating summary...`);
      const toolsUsed = results.map(r => r.tool);
      const response = await this.summarizer.summarize(
        query,
        analysis,
        toolsUsed
      );

      // 6. Store in memory (if enabled)
      emitProgress('storing', 95, 'Storing in memory...');
      if (this.config.enableMemory) {
        await this.storeInMemory({
          requestId,
          query,
          plan,
          results,
          analysis,
          response,
        });
      }

      // 7. Update metadata
      response.metadata = {
        request_id: requestId,
        total_duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      emitProgress('complete', 100, 'Query processing complete!');
      console.log(`✅ [Orchestrator][${requestId}] Complete in ${response.metadata.total_duration_ms}ms`);

      return response;

    } catch (error: any) {
      console.error(`[OrchestratorAgent][${requestId}] Error:`, error);

      // Store error in memory for learning
      if (this.config.enableMemory) {
        await this.memory.storeEpisodic({
          id: requestId,
          type: 'error',
          timestamp: new Date().toISOString(),
          data: {
            query,
            error: {
              message: error.message,
              stack: error.stack,
            },
          },
        });
      }

      // Return error response
      return {
        message: `I encountered an error processing your request: ${error.message}`,
        tools_used: [],
        metadata: {
          request_id: requestId,
          total_duration_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: true,
        },
      };
    }
  }

  private async loadContext(query: string): Promise<any> {
    try {
      // Load semantic context (similar past queries)
      const semanticContext = await this.memory.querySemantic({
        query,
        top_k: 3,
      });

      // Extract entities from query
      const entities = this.extractEntities(query);

      // Load episodic context (related events)
      const episodicContext = await this.memory.queryEpisodic({
        entity_ids: entities,
        limit: 5,
      });

      return {
        semantic: semanticContext,
        episodic: episodicContext,
        entities,
      };
    } catch (error) {
      console.error('[OrchestratorAgent] Failed to load context:', error);
      return {};
    }
  }

  private async storeInMemory(data: any): Promise<void> {
    try {
      // Store episodic event
      await this.memory.storeEpisodic({
        id: data.requestId,
        type: 'request',
        timestamp: new Date().toISOString(),
        data: {
          query: data.query,
          plan: data.plan,
          results: data.results,
        },
      });

      // Store semantic embedding of summary
      console.log('[OrchestratorAgent] Storing semantic memory...');
      await this.memory.storeSemantic(
        data.response.message,
        {
          type: 'summary',
          requestId: data.requestId,
          query: data.query,
          toolsUsed: data.response.tools_used,
        }
      );

      console.log(`[OrchestratorAgent] ✅ Stored request ${data.requestId} in memory (episodic + semantic)`);
    } catch (error: any) {
      console.error('[OrchestratorAgent] ❌ Failed to store in memory:', error);
      console.error('  Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      // Don't fail the request if memory storage fails
    }
  }

  private extractEntities(query: string): string[] {
    // Simple entity extraction
    // In production, use NER model
    const entities: string[] = [];

    // Extract dates
    if (query.match(/last week|this week|yesterday|today/)) {
      entities.push('temporal:week');
    }

    // Extract locations
    const locationMatch = query.match(/in ([A-Z][a-z]+)/);
    if (locationMatch) {
      entities.push(`location:${locationMatch[1]}`);
    }

    // Extract domain entities
    if (query.includes('shipment')) entities.push('entity:shipment');
    if (query.includes('facility')) entities.push('entity:facility');
    if (query.includes('inspection')) entities.push('entity:inspection');

    return entities;
  }
}

