/**
 * GraphQL Resolvers
 */

import { PubSub } from 'graphql-subscriptions';
import { MemoryManager } from '../shared/memory/manager.js';
import { PlanStorageService } from './services/plan-storage.service.js';
import { ExecutionStorageService } from './services/execution-storage.service.js';
import GraphQLJSON from 'graphql-type-json';

const pubsub = new PubSub();

// Helper to create async iterator from PubSub
function createAsyncIterator<T>(pubsub: PubSub, triggers: string | string[]) {
  const triggerArray = Array.isArray(triggers) ? triggers : [triggers];

  return {
    [Symbol.asyncIterator]() {
      const queue: T[] = [];
      const subscriptionIds: Promise<number>[] = [];
      let resolve: ((value: IteratorResult<T>) => void) | null = null;
      let done = false;

      // Subscribe to all triggers
      triggerArray.forEach((trigger) => {
        const id = pubsub.subscribe(trigger, (payload: T) => {
          if (resolve) {
            resolve({ value: payload, done: false });
            resolve = null;
          } else {
            queue.push(payload);
          }
        });
        subscriptionIds.push(id);
      });

      return {
        async next(): Promise<IteratorResult<T>> {
          if (done) {
            return { value: undefined, done: true };
          }

          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }

          return new Promise<IteratorResult<T>>((res) => {
            resolve = res;
          });
        },
        async return(): Promise<IteratorResult<T>> {
          done = true;
          await Promise.all(subscriptionIds.map(async (idPromise) => {
            const id = await idPromise;
            pubsub.unsubscribe(id);
          }));
          return { value: undefined, done: true };
        },
        async throw(error: any): Promise<IteratorResult<T>> {
          done = true;
          await Promise.all(subscriptionIds.map(async (idPromise) => {
            const id = await idPromise;
            pubsub.unsubscribe(id);
          }));
          throw error;
        },
      };
    },
  };
}

interface Context {
  planner: any;
  executor: any;
  analyzer: any;
  summarizer: any;
  memory: MemoryManager;
  planStorage: PlanStorageService;
  executionStorage: ExecutionStorageService;
  pubsub?: PubSub;
}

// Store for request history (in production, use database)
const requestHistory = new Map<string, any>();

// System metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalDuration: 0,
  startTime: Date.now(),
};

export const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    getRequestHistory: async (
      _: any,
      { limit = 10, userId }: { limit?: number; userId?: string }
    ) => {
      const history = Array.from(requestHistory.values());

      let filtered = history;
      if (userId) {
        filtered = history.filter(r => r.userId === userId);
      }

      return filtered
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },

    getMemoryContext: async (
      _: any,
      { query }: { query: string },
      context: Context
    ) => {
      try {
        const [semantic, episodic] = await Promise.all([
          context.memory.querySemantic({ query, top_k: 5 }),
          context.memory.queryEpisodic({ limit: 5 }),
        ]);

        // Simple entity extraction
        const entities: string[] = [];
        if (query.includes('shipment')) entities.push('shipment');
        if (query.includes('facility')) entities.push('facility');
        if (query.includes('contamination')) entities.push('contamination');

        return {
          semantic: semantic || [],
          episodic: episodic || [],
          entities,
        };
      } catch (error) {
        console.error('Error loading memory context:', error);
        return {
          semantic: [],
          episodic: [],
          entities: [],
        };
      }
    },

    getMetrics: () => {
      const uptime = (Date.now() - metrics.startTime) / 1000;
      const avgDuration = metrics.totalRequests > 0
        ? metrics.totalDuration / metrics.totalRequests
        : 0;

      return {
        ...metrics,
        avgDuration,
        uptime,
      };
    },

    getRequest: (_: any, { requestId }: { requestId: string }) => {
      return requestHistory.get(requestId) || null;
    },

    getPlan: async (_: any, { requestId }: { requestId: string }, ctx: Context) => {
      try {
        const plan = await ctx.planStorage.getPlan(requestId);

        if (!plan) {
          return null;
        }

        return {
          requestId: plan.requestId,
          plan: {
            steps: plan.plan.steps.map((step: any) => ({
              tool: step.tool,
              params: step.params,
              dependsOn: step.depends_on || [],
              parallel: step.parallel || false,
            })),
          },
          metadata: {
            query: plan.query,
            timestamp: plan.createdAt.toISOString(),
            estimatedDurationMs: plan.plan.metadata?.estimated_duration_ms || null,
          },
          status: plan.status,
        };
      } catch (error: any) {
        console.error('Error in getPlan:', error);
        throw new Error(`Failed to retrieve plan: ${error.message}`);
      }
    },

    getExecution: async (
      _: any,
      { requestId }: { requestId: string },
      ctx: Context
    ) => {
      try {
        if (!requestId || requestId.trim().length === 0) {
          throw new Error('RequestId cannot be empty');
        }

        const execution = await ctx.executionStorage.getExecution(requestId);
        if (!execution) {
          throw new Error(`Execution not found for requestId: ${requestId}`);
        }

        return {
          requestId: execution.requestId,
          results: execution.results.map((r: any) => ({
            success: r.success,
            tool: r.tool,
            data: r.data || null,
            error: r.error ? {
              code: r.error.code,
              message: r.error.message,
              details: r.error.details || null,
            } : null,
            metadata: {
              executionTime: r.metadata.executionTime,
              timestamp: r.metadata.timestamp,
              retries: r.metadata.retries || 0,
            },
          })),
          metadata: {
            totalDurationMs: execution.metadata.totalDurationMs,
            successfulSteps: execution.metadata.successfulSteps,
            failedSteps: execution.metadata.failedSteps,
            timestamp: execution.metadata.timestamp,
          },
        };
      } catch (error: any) {
        console.error('Error in getExecution:', error);
        throw new Error(`Failed to retrieve execution: ${error.message}`);
      }
    },

    listExecutions: async (
      _: any,
      {
        status,
        limit = 20,
        offset = 0,
        startDate,
        endDate
      }: {
        status?: string;
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
      },
      ctx: Context
    ) => {
      try {
        const filters: any = {};

        if (status) {
          filters.status = status as 'completed' | 'failed' | 'partial';
        }

        if (startDate || endDate) {
          filters.startDate = startDate ? new Date(startDate) : undefined;
          filters.endDate = endDate ? new Date(endDate) : undefined;
        }

        const result = await ctx.executionStorage.listExecutions({
          ...filters,
          limit,
          offset,
        });

        return {
          executions: result.executions.map(execution => ({
            requestId: execution.requestId,
            results: execution.results.map((r: any) => ({
              success: r.success,
              tool: r.tool,
              data: r.data || null,
              error: r.error ? {
                code: r.error.code,
                message: r.error.message,
                details: r.error.details || null,
              } : null,
              metadata: {
                executionTime: r.metadata.executionTime,
                timestamp: r.metadata.timestamp,
                retries: r.metadata.retries || 0,
              },
            })),
            metadata: {
              totalDurationMs: execution.metadata.totalDurationMs,
              successfulSteps: execution.metadata.successfulSteps,
              failedSteps: execution.metadata.failedSteps,
              timestamp: execution.metadata.timestamp,
            },
          })),
          total: result.total,
          hasMore: result.hasMore,
        };
      } catch (error: any) {
        console.error('Error in listExecutions:', error);
        throw new Error(`Failed to list executions: ${error.message}`);
      }
    },

    getExecutionStats: async (
      _: any,
      __: any,
      ctx: Context
    ) => {
      try {
        const stats = await ctx.executionStorage.getExecutionStats();
        return {
          total: stats.total,
          byStatus: stats.byStatus,
          averageDuration: stats.averageDuration,
        };
      } catch (error: any) {
        console.error('Error in getExecutionStats:', error);
        throw new Error(`Failed to get execution stats: ${error.message}`);
      }
    },
  },

  Mutation: {
    // Individual agent mutations
    planQuery: async (
      _: any,
      { query, context: providedContext }: { query: string; context?: any },
      ctx: Context
    ) => {
      const { randomUUID } = await import('crypto');
      const requestId = randomUUID();

      try {
        // Validate query
        if (!query || query.trim().length === 0) {
          throw new Error('Query cannot be empty');
        }

        // Get planner from context
        const planner = ctx.planner;
        if (!planner) {
          throw new Error('Planner not available in context');
        }

        // Load memory context if not provided
        let fullContext = providedContext;
        if (!fullContext || Object.keys(fullContext).length === 0) {
          try {
            const [semantic, episodic] = await Promise.all([
              ctx.memory.querySemantic({ query, top_k: 5 }),
              ctx.memory.queryEpisodic({ limit: 5 }),
            ]);
            fullContext = { semantic, episodic };
          } catch (error) {
            console.warn('Failed to load memory context:', error);
            fullContext = {};
          }
        }

        // Publish progress
        const pubsubInstance = ctx.pubsub || pubsub;
        pubsubInstance.publish('PLANNER_PROGRESS', {
          plannerProgress: {
            requestId,
            phase: 'planning',
            progress: 50,
            message: 'Generating execution plan...',
            timestamp: new Date().toISOString(),
          },
        });

        // Call planner
        const plan = await planner.plan(query, fullContext);

        // Store plan in MongoDB
        await ctx.planStorage.savePlan(requestId, query, plan, fullContext);

        // Publish completion
        pubsubInstance.publish('PLANNER_PROGRESS', {
          plannerProgress: {
            requestId,
            phase: 'completed',
            progress: 100,
            message: 'Plan generated successfully',
            timestamp: new Date().toISOString(),
          },
        });

        return {
          requestId,
          plan: {
            steps: plan.steps.map((step: any) => ({
              tool: step.tool,
              params: step.params,
              dependsOn: step.depends_on || [],
              parallel: step.parallel || false,
            })),
          },
          metadata: {
            query,
            timestamp: new Date().toISOString(),
            estimatedDurationMs: plan.metadata?.estimated_duration_ms || null,
          },
          status: 'pending',
        };
      } catch (error: any) {
        console.error('Error in planQuery:', error);
        throw new Error(`Failed to generate plan: ${error.message}`);
      }
    },

    executeTools: async (
      _: any,
      { requestId }: { requestId: string },
      ctx: Context
    ) => {
      const startTime = Date.now();

      try {
        // Retrieve plan from storage
        const storedPlan = await ctx.planStorage.getPlan(requestId);
        if (!storedPlan) {
          throw new Error(`Plan not found for requestId: ${requestId}`);
        }

        // Update plan status to executing
        await ctx.planStorage.updatePlanStatus(requestId, 'executing');

        // Get executor from context
        const executor = ctx.executor;
        if (!executor) {
          throw new Error('Executor not available in context');
        }

        // Use the stored plan directly (already in internal format)
        const internalPlan = storedPlan.plan;

        // Publish progress
        const pubsubInstance = ctx.pubsub || pubsub;
        pubsubInstance.publish('EXECUTOR_PROGRESS', {
          executorProgress: {
            requestId,
            phase: 'executing',
            progress: 0,
            message: `Executing ${internalPlan.steps.length} steps...`,
            currentStep: null,
            timestamp: new Date().toISOString(),
          },
        });

        // Execute plan with progress callback
        const progressCallback = (stepIndex: number, total: number, stepName: string) => {
          const progress = Math.floor((stepIndex / total) * 100);
          pubsubInstance.publish('EXECUTOR_PROGRESS', {
            executorProgress: {
              requestId,
              phase: 'executing',
              progress,
              message: `Executing step ${stepIndex}/${total}`,
              currentStep: stepName,
              timestamp: new Date().toISOString(),
            },
          });
        };

        const results = await executor.execute(internalPlan, progressCallback);

        // Update plan status based on execution results
        const successfulSteps = results.filter((r: any) => r.success).length;
        const failedSteps = results.filter((r: any) => !r.success).length;
        const finalStatus = failedSteps === 0 ? 'completed' : 'failed';
        await ctx.planStorage.updatePlanStatus(requestId, finalStatus);

        // Publish completion
        pubsubInstance.publish('EXECUTOR_PROGRESS', {
          executorProgress: {
            requestId,
            phase: finalStatus === 'completed' ? 'completed' : 'failed',
            progress: 100,
            message: finalStatus === 'completed' ? 'Execution completed' : 'Execution failed',
            currentStep: null,
            timestamp: new Date().toISOString(),
          },
        });

        const duration = Date.now() - startTime;

        // Save execution results to storage
        await ctx.executionStorage.saveExecution(requestId, results, {
          totalDurationMs: duration,
          successfulSteps,
          failedSteps,
          timestamp: new Date().toISOString()
        });

        return {
          requestId,
          results: results.map((r: any) => ({
            success: r.success,
            tool: r.tool,
            data: r.data || null,
            error: r.error ? {
              code: r.error.code,
              message: r.error.message,
              details: r.error.details || null,
            } : null,
            metadata: {
              executionTime: r.metadata.executionTime,
              timestamp: r.metadata.timestamp,
              retries: r.metadata.retries || 0,
            },
          })),
          metadata: {
            totalDurationMs: duration,
            successfulSteps,
            failedSteps,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error: any) {
        console.error('Error in executeTools:', error);

        // Update plan status to failed
        try {
          await ctx.planStorage.updatePlanStatus(requestId, 'failed');
        } catch (statusError) {
          console.error('Failed to update plan status to failed:', statusError);
        }

        throw new Error(`Failed to execute tools: ${error.message}`);
      }
    },

    analyzeResults: async (
      _: any,
      { requestId }: { requestId: string },
      ctx: Context
    ) => {
      try {
        // Validate inputs
        if (!requestId || requestId.trim().length === 0) {
          throw new Error('RequestId cannot be empty');
        }

        // Fetch plan and execution results from storage
        const [storedPlan, storedExecution] = await Promise.all([
          ctx.planStorage.getPlan(requestId),
          ctx.executionStorage.getExecution(requestId)
        ]);

        if (!storedPlan) {
          throw new Error(`Plan not found for requestId: ${requestId}`);
        }
        if (!storedExecution) {
          throw new Error(`Execution results not found for requestId: ${requestId}`);
        }

        // Extract query from plan and results from execution
        const query = storedPlan.query;
        const toolResults = storedExecution.results;

        // Get analyzer from context
        const analyzer = ctx.analyzer;
        if (!analyzer) {
          throw new Error('Analyzer not available in context');
        }

        // Use results directly from storage (already in internal format)
        const internalResults = toolResults;

        // Publish progress
        const pubsubInstance = ctx.pubsub || pubsub;
        pubsubInstance.publish('ANALYZER_PROGRESS', {
          analyzerProgress: {
            requestId,
            phase: 'analyzing',
            progress: 50,
            message: 'Analyzing tool results...',
            timestamp: new Date().toISOString(),
          },
        });

        // Analyze results
        const analysis = await analyzer.analyze(internalResults, query);

        // Publish completion
        pubsubInstance.publish('ANALYZER_PROGRESS', {
          analyzerProgress: {
            requestId,
            phase: 'completed',
            progress: 100,
            message: 'Analysis completed',
            timestamp: new Date().toISOString(),
          },
        });

        return {
          requestId,
          analysis: {
            summary: analysis.summary,
            insights: analysis.insights.map((i: any) => ({
              type: i.type,
              description: i.description,
              confidence: i.confidence,
              supportingData: Array.isArray(i.supporting_data) ? i.supporting_data : [i.supporting_data],
            })),
            entities: analysis.entities.map((e: any) => ({
              id: e.id,
              type: e.type,
              name: e.name,
              attributes: e.attributes,
              relationships: e.relationships || [],
            })),
            anomalies: analysis.anomalies.map((a: any) => ({
              type: a.type,
              description: a.description,
              severity: a.severity,
              affectedEntities: a.affected_entities,
              data: a.data,
            })),
            metadata: {
              toolResultsCount: analysis.metadata.tool_results_count,
              successfulResults: analysis.metadata.successful_results,
              failedResults: analysis.metadata.failed_results,
              analysisTimeMs: analysis.metadata.analysis_time_ms,
            },
          },
          metadata: {
            toolResultsCount: analysis.metadata.tool_results_count,
            successfulResults: analysis.metadata.successful_results,
            failedResults: analysis.metadata.failed_results,
            analysisTimeMs: analysis.metadata.analysis_time_ms,
          },
        };
      } catch (error: any) {
        console.error('Error in analyzeResults:', error);
        throw new Error(`Failed to analyze results: ${error.message}`);
      }
    },

    summarizeResponse: async (
      _: any,
      { analysis, toolResults, query }: { analysis: any; toolResults: any[]; query: string },
      ctx: Context
    ) => {
      const { randomUUID } = await import('crypto');
      const requestId = randomUUID();

      try {
        // Validate inputs
        if (!analysis) {
          throw new Error('Analysis cannot be null');
        }
        if (!query || query.trim().length === 0) {
          throw new Error('Query cannot be empty');
        }

        // Get summarizer from context
        const summarizer = ctx.summarizer;
        if (!summarizer) {
          throw new Error('Summarizer not available in context');
        }

        // Convert GraphQL input to internal format
        const internalAnalysis = {
          summary: analysis.summary,
          insights: analysis.insights.map((i: any) => ({
            type: i.type,
            description: i.description,
            confidence: i.confidence,
            supporting_data: i.supportingData,
          })),
          entities: analysis.entities.map((e: any) => ({
            id: e.id,
            type: e.type,
            name: e.name,
            attributes: e.attributes,
            relationships: e.relationships,
          })),
          anomalies: analysis.anomalies.map((a: any) => ({
            type: a.type,
            description: a.description,
            severity: a.severity,
            affected_entities: a.affectedEntities,
            data: a.data,
          })),
          metadata: {
            tool_results_count: analysis.metadata.toolResultsCount,
            successful_results: analysis.metadata.successfulResults,
            failed_results: analysis.metadata.failedResults,
            analysis_time_ms: analysis.metadata.analysisTimeMs,
          },
        };

        const internalResults = toolResults.map((r: any) => ({
          success: r.success,
          tool: r.tool,
          data: r.data,
          error: r.error,
          metadata: {
            executionTime: r.metadata.executionTime,
            timestamp: r.metadata.timestamp,
            retries: r.metadata.retries,
          },
        }));

        // Publish progress
        const pubsubInstance = ctx.pubsub || pubsub;
        pubsubInstance.publish('SUMMARIZER_PROGRESS', {
          summarizerProgress: {
            requestId,
            phase: 'summarizing',
            progress: 50,
            message: 'Generating summary...',
            timestamp: new Date().toISOString(),
          },
        });

        // Summarize
        const summary = await summarizer.summarize(internalAnalysis, internalResults, query);

        // Publish completion
        pubsubInstance.publish('SUMMARIZER_PROGRESS', {
          summarizerProgress: {
            requestId,
            phase: 'completed',
            progress: 100,
            message: 'Summary generated',
            timestamp: new Date().toISOString(),
          },
        });

        return {
          requestId,
          message: summary.message,
          toolsUsed: summary.tools_used,
          metadata: {
            requestId: summary.metadata.request_id,
            totalDurationMs: summary.metadata.total_duration_ms,
            timestamp: summary.metadata.timestamp,
            error: summary.metadata.error || false,
          },
        };
      } catch (error: any) {
        console.error('Error in summarizeResponse:', error);
        throw new Error(`Failed to summarize response: ${error.message}`);
      }
    },


    cancelQuery: async (_: any, { requestId }: { requestId: string }) => {
      // In a real implementation, this would cancel the ongoing request
      console.log(`Cancelling request: ${requestId}`);
      return true;
    },
  },

  Subscription: {
    queryProgress: {
      subscribe: (_: any, { requestId }: { requestId: string }) => {
        console.log(`🔔 [Subscription] Client subscribing to progress for request: ${requestId}`);

        // Create async iterator that filters by requestId
        const iterator = createAsyncIterator(pubsub, 'QUERY_PROGRESS');

        return {
          [Symbol.asyncIterator]() {
            const originalIterator = iterator[Symbol.asyncIterator]();
            return {
              async next(): Promise<IteratorResult<any>> {
                while (true) {
                  const result = await originalIterator.next();
                  if (result.done) return result;

                  // Filter: only return updates matching this requestId
                  const value = result.value as any;
                  if (value?.queryProgress?.requestId === requestId) {
                    console.log(`📤 [Subscription] Sending update for ${requestId}: ${value.queryProgress.phase} - ${value.queryProgress.progress}%`);
                    return result;
                  }
                  // Skip updates for other requests
                }
              },
              return: originalIterator.return?.bind(originalIterator),
              throw: originalIterator.throw?.bind(originalIterator),
            };
          },
        };
      },
    },

    agentStatus: {
      subscribe: () => {
        return createAsyncIterator(pubsub, 'AGENT_STATUS');
      },
    },

    // Per-agent subscriptions
    plannerProgress: {
      subscribe: (_: any, { requestId }: { requestId: string }) => {
        console.log(`🔔 [Subscription] Client subscribing to planner progress for request: ${requestId}`);

        const iterator = createAsyncIterator(pubsub, 'PLANNER_PROGRESS');

        return {
          [Symbol.asyncIterator]() {
            const originalIterator = iterator[Symbol.asyncIterator]();
            return {
              async next(): Promise<IteratorResult<any>> {
                while (true) {
                  const result = await originalIterator.next();
                  if (result.done) return result;

                  const value = result.value as any;
                  if (value?.plannerProgress?.requestId === requestId) {
                    console.log(`📤 [Subscription] Sending planner update for ${requestId}: ${value.plannerProgress.phase}`);
                    return result;
                  }
                }
              },
              return: originalIterator.return?.bind(originalIterator),
              throw: originalIterator.throw?.bind(originalIterator),
            };
          },
        };
      },
    },

    executorProgress: {
      subscribe: (_: any, { requestId }: { requestId: string }) => {
        console.log(`🔔 [Subscription] Client subscribing to executor progress for request: ${requestId}`);

        const iterator = createAsyncIterator(pubsub, 'EXECUTOR_PROGRESS');

        return {
          [Symbol.asyncIterator]() {
            const originalIterator = iterator[Symbol.asyncIterator]();
            return {
              async next(): Promise<IteratorResult<any>> {
                while (true) {
                  const result = await originalIterator.next();
                  if (result.done) return result;

                  const value = result.value as any;
                  if (value?.executorProgress?.requestId === requestId) {
                    console.log(`📤 [Subscription] Sending executor update for ${requestId}: ${value.executorProgress.phase}`);
                    return result;
                  }
                }
              },
              return: originalIterator.return?.bind(originalIterator),
              throw: originalIterator.throw?.bind(originalIterator),
            };
          },
        };
      },
    },

    analyzerProgress: {
      subscribe: (_: any, { requestId }: { requestId: string }) => {
        console.log(`🔔 [Subscription] Client subscribing to analyzer progress for request: ${requestId}`);

        const iterator = createAsyncIterator(pubsub, 'ANALYZER_PROGRESS');

        return {
          [Symbol.asyncIterator]() {
            const originalIterator = iterator[Symbol.asyncIterator]();
            return {
              async next(): Promise<IteratorResult<any>> {
                while (true) {
                  const result = await originalIterator.next();
                  if (result.done) return result;

                  const value = result.value as any;
                  if (value?.analyzerProgress?.requestId === requestId) {
                    console.log(`📤 [Subscription] Sending analyzer update for ${requestId}: ${value.analyzerProgress.phase}`);
                    return result;
                  }
                }
              },
              return: originalIterator.return?.bind(originalIterator),
              throw: originalIterator.throw?.bind(originalIterator),
            };
          },
        };
      },
    },

    summarizerProgress: {
      subscribe: (_: any, { requestId }: { requestId: string }) => {
        console.log(`🔔 [Subscription] Client subscribing to summarizer progress for request: ${requestId}`);

        const iterator = createAsyncIterator(pubsub, 'SUMMARIZER_PROGRESS');

        return {
          [Symbol.asyncIterator]() {
            const originalIterator = iterator[Symbol.asyncIterator]();
            return {
              async next(): Promise<IteratorResult<any>> {
                while (true) {
                  const result = await originalIterator.next();
                  if (result.done) return result;

                  const value = result.value as any;
                  if (value?.summarizerProgress?.requestId === requestId) {
                    console.log(`📤 [Subscription] Sending summarizer update for ${requestId}: ${value.summarizerProgress.phase}`);
                    return result;
                  }
                }
              },
              return: originalIterator.return?.bind(originalIterator),
              throw: originalIterator.throw?.bind(originalIterator),
            };
          },
        };
      },
    },
  },
};

export { pubsub };

