/**
 * Query Cache System with LRU Eviction
 * 
 * Provides intelligent in-memory caching for tool results to improve performance
 * and reduce redundant API calls. Implements LRU eviction policy and TTL-based expiration.
 */

export interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  enableStats?: boolean; // Enable statistics tracking
}

export class QueryCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[]; // LRU tracking
  private ttl: number;
  private maxSize: number;
  private enableStats: boolean;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.accessOrder = [];
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // 1000 entries default
    this.enableStats = options.enableStats !== false; // true by default
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Get cached data by key
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.enableStats) this.stats.misses++;
      return null;
    }

    // Check TTL expiration
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.delete(key);
      if (this.enableStats) this.stats.misses++;
      return null;
    }

    // Update access tracking for LRU
    this.updateAccessOrder(key);
    entry.hits++;
    entry.lastAccessed = now;

    if (this.enableStats) this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached data with key
   */
  set(key: string, data: any): void {
    const now = Date.now();
    
    // If key already exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.data = data;
      entry.timestamp = now;
      entry.lastAccessed = now;
      this.updateAccessOrder(key);
      return;
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry = {
      data,
      timestamp: now,
      hits: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  /**
   * Delete entry by key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidate(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    if (this.enableStats) {
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.evictions = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.stats.evictions,
      ttl: this.ttl
    };
  }

  /**
   * Check if cache has key (without updating access)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL expiration
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if cache is full
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      // Move to end (most recently used)
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    if (lruKey) {
      this.delete(lruKey);
      
      if (this.enableStats) {
        this.stats.evictions++;
      }
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Generate cache key from tool name and parameters
   */
  static generateKey(toolName: string, params: Record<string, any>): string {
    // Sort params to ensure consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const paramsHash = JSON.stringify(sortedParams);
    return `${toolName}:${Buffer.from(paramsHash).toString('base64')}`;
  }

  /**
   * Check if cache should be used for this tool
   */
  static shouldCache(toolName: string): boolean {
    // Only cache list operations for now
    return toolName.endsWith('_list') || toolName.endsWith('_get');
  }
}

// Singleton instance for global use
let globalCache: QueryCache | null = null;

export function getGlobalCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache({
      ttl: parseInt(process.env.CACHE_TTL_MS || '300000'),
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      enableStats: true
    });
  }
  return globalCache;
}

export function clearGlobalCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
}

export function getCacheStats(): CacheStats {
  return getGlobalCache().getStats();
}
