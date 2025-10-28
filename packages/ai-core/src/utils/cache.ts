/**
 * AI Response Cache
 *
 * Simple in-memory cache for AI responses to reduce API calls
 * and improve performance for repeated requests
 */

import { createHash } from 'node:crypto';

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class AICache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 3600000; // 1 hour default
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Generate cache key from input data
   */
  private generateKey(data: unknown): string {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return createHash('sha256')
      .update(serialized)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Ensure cache doesn't exceed max size
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxSize) return;

    // Remove oldest entries first
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, this.cache.size - this.maxSize);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cached data
   */
  get<T>(key: string | unknown): T | undefined {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string | unknown, data: T, ttl?: number): void {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(cacheKey, entry);
    this.enforceMaxSize();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string | unknown): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete cached entry
   */
  delete(key: string | unknown): boolean {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    return this.cache.delete(cacheKey);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    this.cleanup();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need hit/miss tracking for accurate rate
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry).length * 2;
    }

    return totalSize;
  }

  /**
   * Get or set with a factory function
   */
  async getOrSet<T>(
    key: string | unknown,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Wrap a function with caching
   */
  wrap<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: {
      keyGenerator?: (...args: TArgs) => string;
      ttl?: number;
    } = {},
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : this.generateKey(args);

      return this.getOrSet(key, () => fn(...args), options.ttl);
    };
  }
}

/**
 * Default cache instance
 */
export const defaultCache = new AICache();

/**
 * Create a cache key for AI requests
 */
export function createAIRequestKey(
  provider: string,
  method: string,
  params: unknown,
): string {
  return `${provider}:${method}:${createHash('sha256').update(JSON.stringify(params)).digest('hex').substring(0, 16)}`;
}

/**
 * Cache decorator for AI methods
 */
export function cached(ttl?: number) {
  return (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const cache = new AICache({ ttl });

    descriptor.value = async function (
      this: { constructor: { name: string } },
      ...args: unknown[]
    ) {
      const key = createAIRequestKey(this.constructor.name, propertyKey, args);

      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}
