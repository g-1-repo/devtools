// Add workflow step extensions

declare module 'devtools/packages/workflow/src/types/index' {
  interface WorkflowStep {
    /** IDs of steps that must complete before this one */
    dependencies?: string
    /** Unique identifier for the step */
    id?: string
    /** Resource requirements for the step */
    resources?: {
      /** Estimated memory usage in bytes */
      memory?: number
      /** Estimated CPU usage (0-1) */
      cpu?: number
      /** Estimated duration in milliseconds */
      duration?: number
    }
    /** Performance hints */
    hints?: {
      /** Can this step be batched with others? */
      batchable?: boolean
      /** Priority level (higher = more important) */
      priority?: number
      /** Should this step be cached? */
      cacheable?: boolean
    }
  }
}
