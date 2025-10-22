/**
 * Extended Workflow Types - Additional type definitions for optimized workflow system
 */

declare module 'index.js' {
  interface WorkflowStep {
    /** Unique identifier for the step */
    id?: string

    /** IDs of steps that must complete before this one */
    dependencies?: string[]

    /** Resource requirements for the step */
    resources?: {
      /** Estimated memory usage in bytes */
      memory?: number
      /** Estimated CPU usage (0-1) */
      cpu?: number
      /** Estimated duration in milliseconds */
      duration?: number
    }

    /** Performance hints for execution */
    hints?: {
      /** Can this step be batched with others? */
      batchable?: boolean
      /** Priority level (higher = more important) */
      priority?: number
      /** Should this step be cached? */
      cacheable?: boolean
    }
  }

  interface WorkflowContext {
    /** Performance metrics */
    metrics?: {
      /** Step execution times */
      stepDurations: Record<string, number>
      /** Memory usage peaks */
      memoryPeaks: Record<string, number>
      /** Cache hit rates */
      cacheHits: number
      /** Cache miss rates */
      cacheMisses: number
    }

    /** Resource monitoring */
    resources?: {
      /** Available memory */
      availableMemory: number
      /** CPU usage */
      cpuUsage: number
      /** Active workers */
      activeWorkers: number
    }
  }
}
