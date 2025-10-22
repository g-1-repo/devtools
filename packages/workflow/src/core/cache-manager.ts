/**
 * Cache Manager - Optimizes performance by caching expensive operations
 */

export interface CacheOptions {
  maxSize?: number
  ttl?: number // Time to live in milliseconds
}

export class CacheManager<K, V> {
  private cache: Map<K, { value: V, timestamp: number }>
  private maxSize: number
  private ttl: number

  constructor(options: CacheOptions = {}) {
    this.cache = new Map()
    this.maxSize = options.maxSize || 1000
    this.ttl = options.ttl || 1000 * 60 * 60 // 1 hour default TTL
  }

  set(key: K, value: V): void {
    // Implement LRU eviction if needed
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry)
      return undefined
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  prune(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}
