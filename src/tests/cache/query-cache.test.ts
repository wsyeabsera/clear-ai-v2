/**
 * Unit tests for QueryCache
 */

import { QueryCache, CacheStats } from '../../shared/cache/query-cache.js';

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache({
      ttl: 1000, // 1 second for testing
      maxSize: 3, // Small size for testing
      enableStats: true
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    test('should set and get data', () => {
      const key = 'test-key';
      const data = { result: 'test data' };

      cache.set(key, data);
      const result = cache.get(key);

      expect(result).toEqual(data);
    });

    test('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    test('should update existing key', () => {
      const key = 'test-key';
      const data1 = { result: 'data1' };
      const data2 = { result: 'data2' };

      cache.set(key, data1);
      cache.set(key, data2);
      const result = cache.get(key);

      expect(result).toEqual(data2);
    });

    test('should delete key', () => {
      const key = 'test-key';
      const data = { result: 'test data' };

      cache.set(key, data);
      expect(cache.has(key)).toBe(true);

      cache.delete(key);
      expect(cache.has(key)).toBe(false);
      expect(cache.get(key)).toBeNull();
    });

    test('should clear all entries', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL Expiration', () => {
    test('should expire entries after TTL', async () => {
      const key = 'test-key';
      const data = { result: 'test data' };

      cache.set(key, data);
      expect(cache.get(key)).toEqual(data);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get(key)).toBeNull();
      expect(cache.has(key)).toBe(false);
    });

    test('should not expire entries before TTL', async () => {
      const key = 'test-key';
      const data = { result: 'test data' };

      cache.set(key, data);
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(cache.get(key)).toEqual(data);
    });

    test('should clean expired entries', async () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const cleaned = cache.cleanExpired();
      expect(cleaned).toBe(2);
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used when full', () => {
      // Fill cache to max size
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');
      expect(cache.size()).toBe(3);

      // Access key1 to make it recently used
      cache.get('key1');

      // Add new key, should evict key2 (least recently used)
      cache.set('key4', 'data4');
      
      expect(cache.size()).toBe(3);
      expect(cache.has('key1')).toBe(true); // Recently used
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    test('should track access order correctly', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');

      // Access in different order
      cache.get('key2'); // key2 becomes most recent
      cache.get('key1'); // key1 becomes most recent
      cache.get('key3'); // key3 becomes most recent

      // key2 should be evicted next
      cache.set('key4', 'data4');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });
  });

  describe('Pattern Invalidation', () => {
    test('should invalidate entries matching pattern', () => {
      cache.set('shipments_list:abc123', 'data1');
      cache.set('shipments_list:def456', 'data2');
      cache.set('facilities_list:ghi789', 'data3');

      const invalidated = cache.invalidate('shipments_list:.*');
      
      expect(invalidated).toBe(2);
      expect(cache.has('shipments_list:abc123')).toBe(false);
      expect(cache.has('shipments_list:def456')).toBe(false);
      expect(cache.has('facilities_list:ghi789')).toBe(true);
    });

    test('should handle invalid pattern gracefully', () => {
      cache.set('key1', 'data1');
      
      const invalidated = cache.invalidate('invalid[pattern');
      expect(invalidated).toBe(0);
      expect(cache.has('key1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should track hits and misses', () => {
      cache.set('key1', 'data1');
      
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.67);
    });

    test('should track evictions', () => {
      // Fill cache
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');
      
      // Force eviction
      cache.set('key4', 'data4');
      
      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    test('should provide correct cache stats', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.ttl).toBe(1000);
    });
  });

  describe('Utility Methods', () => {
    test('should generate consistent cache keys', () => {
      const toolName = 'shipments_list';
      const params1 = { limit: 10, date_from: '2023-01-01' };
      const params2 = { date_from: '2023-01-01', limit: 10 }; // Different order
      
      const key1 = QueryCache.generateKey(toolName, params1);
      const key2 = QueryCache.generateKey(toolName, params2);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^shipments_list:/);
    });

    test('should determine if tool should be cached', () => {
      expect(QueryCache.shouldCache('shipments_list')).toBe(true);
      expect(QueryCache.shouldCache('facilities_get')).toBe(true);
      expect(QueryCache.shouldCache('shipments_create')).toBe(false);
      expect(QueryCache.shouldCache('analytics_contamination_rate')).toBe(false);
    });

    test('should check if cache is full', () => {
      expect(cache.isFull()).toBe(false);
      
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');
      
      expect(cache.isFull()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty cache gracefully', () => {
      expect(cache.size()).toBe(0);
      expect(cache.get('any-key')).toBeNull();
      expect(cache.has('any-key')).toBe(false);
    });

    test('should handle null/undefined data', () => {
      cache.set('null-key', null);
      cache.set('undefined-key', undefined);
      
      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });

    test('should handle very large data', () => {
      const largeData = { data: 'x'.repeat(10000) };
      cache.set('large-key', largeData);
      
      expect(cache.get('large-key')).toEqual(largeData);
    });
  });
});
