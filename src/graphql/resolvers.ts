/**
 * GraphQL Resolvers
 */

import { PubSub } from 'graphql-subscriptions';
import { OrchestratorAgent } from '../agents/orchestrator.js';
import { MemoryManager } from '../shared/memory/manager.js';
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
  orchestrator: OrchestratorAgent;
  memory: MemoryManager;
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
  },

  Mutation: {
    executeQuery: async (
      _: any,
      { query, userId }: { query: string; userId?: string },
      context: Context
    ) => {
      const startTime = Date.now();
      metrics.totalRequests++;

      try {
        // Create progress callback that publishes to pubsub
        const progressCallback = (update: any) => {
          console.log(`🔔 [GraphQL] Publishing progress: ${update.phase} - ${update.progress}% (requestId: ${update.requestId})`);
          pubsub.publish('QUERY_PROGRESS', { queryProgress: update });
        };

        // Execute query through orchestrator with progress tracking
        const response = await context.orchestrator.handleQuery(query, progressCallback);

        const duration = Date.now() - startTime;
        metrics.totalDuration += duration;

        if (!response.metadata.error) {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
        }

        // Store in history
        const record = {
          requestId: response.metadata.request_id,
          query,
          response,
          timestamp: response.metadata.timestamp,
          userId,
        };
        requestHistory.set(response.metadata.request_id, record);

        // Convert analysis to GraphQL format
        const result = {
          requestId: response.metadata.request_id,
          message: response.message,
          toolsUsed: response.tools_used,
          data: response.data || null,
          analysis: response.analysis ? {
            summary: response.analysis.summary,
            insights: response.analysis.insights.map(i => ({
              type: i.type,
              description: i.description,
              confidence: i.confidence,
              supportingData: Array.isArray(i.supporting_data) ? i.supporting_data : [i.supporting_data],
            })),
            entities: response.analysis.entities.map(e => ({
              id: e.id,
              type: e.type,
              name: e.name,
              attributes: e.attributes,
              relationships: e.relationships || [],
            })),
            anomalies: response.analysis.anomalies.map(a => ({
              type: a.type,
              description: a.description,
              severity: a.severity,
              affectedEntities: a.affected_entities,
              data: a.data,
            })),
            metadata: {
              toolResultsCount: response.analysis.metadata.tool_results_count,
              successfulResults: response.analysis.metadata.successful_results,
              failedResults: response.analysis.metadata.failed_results,
              analysisTimeMs: response.analysis.metadata.analysis_time_ms,
            },
          } : null,
          metadata: {
            requestId: response.metadata.request_id,
            totalDurationMs: response.metadata.total_duration_ms,
            timestamp: response.metadata.timestamp,
            error: response.metadata.error || false,
          },
        };

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        metrics.totalDuration += duration;
        metrics.failedRequests++;

        console.error('Error executing query:', error);

        return {
          requestId: '',
          message: `Error: ${error.message}`,
          toolsUsed: [],
          data: null,
          analysis: null,
          metadata: {
            requestId: '',
            totalDurationMs: duration,
            timestamp: new Date().toISOString(),
            error: true,
          },
        };
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
  },
};

export { pubsub };

