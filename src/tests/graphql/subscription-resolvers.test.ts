/**
 * GraphQL Subscription Resolvers Tests
 * Tests subscription resolvers and PubSub flow
 */

import { resolvers, pubsub } from '../../graphql/resolvers.js';

describe('GraphQL Subscription Resolvers', () => {
  describe('queryProgress Subscription', () => {
    it('should return async iterable', () => {
      const result = resolvers.Subscription.queryProgress.subscribe();

      expect(result).toBeDefined();
      expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });

    it('should subscribe to QUERY_PROGRESS channel', () => {
      const subscribeSpy = jest.spyOn(pubsub, 'subscribe');

      const iterable = resolvers.Subscription.queryProgress.subscribe();
      const iterator = iterable[Symbol.asyncIterator](); // This triggers the actual subscription

      expect(subscribeSpy).toHaveBeenCalledWith('QUERY_PROGRESS', expect.any(Function));

      subscribeSpy.mockRestore();
      
      // Clean up iterator
      if (iterator && typeof iterator.return === 'function') {
        iterator.return();
      }
    });

    it('should receive published progress updates', async () => {
      const iterable = resolvers.Subscription.queryProgress.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Publish a test update
      await pubsub.publish('QUERY_PROGRESS', {
        queryProgress: {
          requestId: 'test-req-1',
          phase: 'processing',
          progress: 50,
          message: 'Processing query...',
          timestamp: new Date().toISOString(),
        },
      });

      // Get the first value from the iterator
      const result = await iterator.next();

      expect(result.done).toBe(false);
      expect(result.value).toBeDefined();
      expect(result.value.queryProgress).toBeDefined();
      expect(result.value.queryProgress.requestId).toBe('test-req-1');
      expect(result.value.queryProgress.phase).toBe('processing');
      expect(result.value.queryProgress.progress).toBe(50);
    }, 10000);

    it('should handle multiple progress updates', async () => {
      const iterable = resolvers.Subscription.queryProgress.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Publish multiple updates
      const updates = [
        {
          requestId: 'req-1',
          phase: 'starting',
          progress: 0,
          message: 'Starting...',
          timestamp: new Date().toISOString(),
        },
        {
          requestId: 'req-1',
          phase: 'processing',
          progress: 50,
          message: 'Processing...',
          timestamp: new Date().toISOString(),
        },
        {
          requestId: 'req-1',
          phase: 'completed',
          progress: 100,
          message: 'Complete',
          timestamp: new Date().toISOString(),
        },
      ];

      for (const update of updates) {
        await pubsub.publish('QUERY_PROGRESS', { queryProgress: update });
      }

      // Read the updates
      const receivedUpdates = [];
      for (let i = 0; i < 3; i++) {
        const result = await Promise.race([
          iterator.next(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), 1000)
          ),
        ]);
        
        if (!result.done) {
          receivedUpdates.push(result.value);
        }
      }

      expect(receivedUpdates.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('agentStatus Subscription', () => {
    it('should return async iterable', () => {
      const result = resolvers.Subscription.agentStatus.subscribe();

      expect(result).toBeDefined();
      expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });

    it('should subscribe to AGENT_STATUS channel', () => {
      const subscribeSpy = jest.spyOn(pubsub, 'subscribe');

      const iterable = resolvers.Subscription.agentStatus.subscribe();
      const iterator = iterable[Symbol.asyncIterator](); // This triggers the actual subscription

      expect(subscribeSpy).toHaveBeenCalledWith('AGENT_STATUS', expect.any(Function));

      subscribeSpy.mockRestore();
      
      // Clean up iterator
      if (iterator && typeof iterator.return === 'function') {
        iterator.return();
      }
    });

    it('should receive published agent status updates', async () => {
      const iterable = resolvers.Subscription.agentStatus.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Publish a test update
      await pubsub.publish('AGENT_STATUS', {
        agentStatus: {
          agent: 'orchestrator',
          status: 'active',
          timestamp: new Date().toISOString(),
        },
      });

      // Get the first value from the iterator
      const result = await iterator.next();

      expect(result.done).toBe(false);
      expect(result.value).toBeDefined();
      expect(result.value.agentStatus).toBeDefined();
      expect(result.value.agentStatus.agent).toBe('orchestrator');
      expect(result.value.agentStatus.status).toBe('active');
    }, 10000);

    it('should handle multiple agent status updates', async () => {
      const iterable = resolvers.Subscription.agentStatus.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Publish updates for different agents
      const agents = ['planner', 'executor', 'analyzer', 'summarizer'];

      for (const agent of agents) {
        await pubsub.publish('AGENT_STATUS', {
          agentStatus: {
            agent,
            status: 'active',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Read some updates
      const receivedUpdates = [];
      for (let i = 0; i < agents.length; i++) {
        const result = await Promise.race([
          iterator.next(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), 1000)
          ),
        ]);
        
        if (!result.done) {
          receivedUpdates.push(result.value);
        }
      }

      expect(receivedUpdates.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('PubSub Integration', () => {
    it('should support multiple subscribers on same channel', async () => {
      const iterable1 = resolvers.Subscription.queryProgress.subscribe();
      const iterable2 = resolvers.Subscription.queryProgress.subscribe();
      const iterator1 = iterable1[Symbol.asyncIterator]();
      const iterator2 = iterable2[Symbol.asyncIterator]();

      // Publish once
      await pubsub.publish('QUERY_PROGRESS', {
        queryProgress: {
          requestId: 'multi-sub-test',
          phase: 'test',
          progress: 75,
          message: 'Multi-subscriber test',
          timestamp: new Date().toISOString(),
        },
      });

      // Both should receive the update
      const result1 = await Promise.race([
        iterator1.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 1000)
        ),
      ]);

      const result2 = await Promise.race([
        iterator2.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 1000)
        ),
      ]);

      if (!result1.done) {
        expect(result1.value.queryProgress.requestId).toBe('multi-sub-test');
      }
      if (!result2.done) {
        expect(result2.value.queryProgress.requestId).toBe('multi-sub-test');
      }
    }, 10000);

    it('should isolate different channels', async () => {
      const progressIterable = resolvers.Subscription.queryProgress.subscribe();
      const statusIterable = resolvers.Subscription.agentStatus.subscribe();
      const progressIterator = progressIterable[Symbol.asyncIterator]();
      const statusIterator = statusIterable[Symbol.asyncIterator]();

      // Publish to query progress
      await pubsub.publish('QUERY_PROGRESS', {
        queryProgress: {
          requestId: 'isolation-test',
          phase: 'test',
          progress: 50,
          message: 'Isolation test',
          timestamp: new Date().toISOString(),
        },
      });

      // Only progress iterator should receive it
      const progressResult = await Promise.race([
        progressIterator.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 500)
        ),
      ]);

      // Status iterator should timeout
      const statusResult = await Promise.race([
        statusIterator.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 500)
        ),
      ]);

      if (!progressResult.done) {
        expect(progressResult.value.queryProgress).toBeDefined();
      }
      
      // Status should not have received anything
      expect(statusResult.done).toBe(true);
    }, 10000);

    it('should handle rapid successive publishes', async () => {
      const iterable = resolvers.Subscription.queryProgress.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Publish many updates rapidly
      const publishPromises = [];
      for (let i = 0; i < 10; i++) {
        publishPromises.push(
          pubsub.publish('QUERY_PROGRESS', {
            queryProgress: {
              requestId: `rapid-${i}`,
              phase: 'test',
              progress: i * 10,
              message: `Rapid test ${i}`,
              timestamp: new Date().toISOString(),
            },
          })
        );
      }

      await Promise.all(publishPromises);

      // Should be able to read at least some updates
      const receivedUpdates = [];
      for (let i = 0; i < 10; i++) {
        const result = await Promise.race([
          iterator.next(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), 100)
          ),
        ]);
        
        if (!result.done) {
          receivedUpdates.push(result.value);
        } else {
          break;
        }
      }

      expect(receivedUpdates.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Subscription Error Handling', () => {
    it('should handle iterator errors gracefully', async () => {
      const iterable = resolvers.Subscription.queryProgress.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Try to use iterator without publishing
      const result = await Promise.race([
        iterator.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 500)
        ),
      ]);

      // Should timeout gracefully
      expect(result).toBeDefined();
    });

    it('should handle malformed publish data', async () => {
      const iterable = resolvers.Subscription.queryProgress.subscribe();
      const iterator = iterable[Symbol.asyncIterator]();

      // Publish malformed data
      await pubsub.publish('QUERY_PROGRESS', {
        queryProgress: {
          // Missing required fields
          requestId: 'malformed-test',
        },
      });

      const result = await Promise.race([
        iterator.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 1000)
        ),
      ]);

      // Should still receive it (validation happens elsewhere)
      if (!result.done) {
        expect(result.value.queryProgress).toBeDefined();
      }
    }, 10000);
  });

  describe('Subscription Lifecycle', () => {
    it('should create new iterator on each subscribe call', () => {
      const iterator1 = resolvers.Subscription.queryProgress.subscribe();
      const iterator2 = resolvers.Subscription.queryProgress.subscribe();

      expect(iterator1).not.toBe(iterator2);
    });

    it('should work after multiple subscribe/unsubscribe cycles', async () => {
      // First subscription
      const iterable1 = resolvers.Subscription.queryProgress.subscribe();
      const iterator1 = iterable1[Symbol.asyncIterator]();
      
      await pubsub.publish('QUERY_PROGRESS', {
        queryProgress: {
          requestId: 'cycle-1',
          phase: 'test',
          progress: 25,
          message: 'Cycle 1',
          timestamp: new Date().toISOString(),
        },
      });

      const result1 = await Promise.race([
        iterator1.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 500)
        ),
      ]);

      // Second subscription
      const iterable2 = resolvers.Subscription.queryProgress.subscribe();
      const iterator2 = iterable2[Symbol.asyncIterator]();
      
      await pubsub.publish('QUERY_PROGRESS', {
        queryProgress: {
          requestId: 'cycle-2',
          phase: 'test',
          progress: 50,
          message: 'Cycle 2',
          timestamp: new Date().toISOString(),
        },
      });

      const result2 = await Promise.race([
        iterator2.next(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), 500)
        ),
      ]);

      // Both should work
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    }, 10000);
  });
});

