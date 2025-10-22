/**
 * Memory Manager - Optimizes memory usage during workflow execution
 */

import process from 'node:process'

export interface MemoryStats {
  heapUsed: number
  heapTotal: number
  rss: number
  memoryLimit: number
}

export class MemoryManager {
  private static instance: MemoryManager
  private memoryLimit: number
  private gcThreshold: number

  private constructor() {
    // Default to 80% of available memory
    this.memoryLimit = process.memoryUsage().heapTotal * 0.8
    this.gcThreshold = this.memoryLimit * 0.7 // Trigger GC at 70% of limit
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  getMemoryStats(): MemoryStats {
    const { heapUsed, heapTotal, rss } = process.memoryUsage()
    return {
      heapUsed,
      heapTotal,
      rss,
      memoryLimit: this.memoryLimit,
    }
  }

  async checkMemory(): Promise<void> {
    const { heapUsed } = process.memoryUsage()

    if (heapUsed > this.gcThreshold) {
      // Force garbage collection if available
      if (globalThis.gc) {
        globalThis.gc()
      }

      // Allow event loop to process
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  setMemoryLimit(limitInBytes: number): void {
    this.memoryLimit = limitInBytes
    this.gcThreshold = limitInBytes * 0.7
  }

  isMemoryAvailable(requiredBytes: number): boolean {
    const { heapUsed } = process.memoryUsage()
    return (heapUsed + requiredBytes) < this.memoryLimit
  }
}
