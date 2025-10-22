/**
 * Task Batcher - Optimizes task execution through intelligent batching
 */

import type { WorkflowContext, WorkflowStep } from '../types/index.js'
import process from 'node:process'

export interface BatchConfig {
  maxBatchSize: number
  batchTimeoutMs: number
  memoryThreshold: number
}

export class TaskBatcher {
  private batchQueue: WorkflowStep[] = []
  private timeoutId: NodeJS.Timeout | null = null
  private config: BatchConfig

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 10,
      batchTimeoutMs: config.batchTimeoutMs || 100,
      memoryThreshold: config.memoryThreshold || 0.8,
    }
  }

  async addTask(step: WorkflowStep): Promise<void> {
    this.batchQueue.push(step)

    if (this.shouldProcessBatch()) {
      await this.processBatch()
    }
    else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.processBatch().catch(console.error)
      }, this.config.batchTimeoutMs)
    }
  }

  private shouldProcessBatch(): boolean {
    if (this.batchQueue.length >= this.config.maxBatchSize) {
      return true
    }

    const memoryUsage = process.memoryUsage()
    const memoryUtilization = memoryUsage.heapUsed / memoryUsage.heapTotal
    if (memoryUtilization >= this.config.memoryThreshold) {
      return true
    }

    return false
  }

  private async processBatch(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.batchQueue.length === 0) {
      return
    }

    const batchTasks = this.batchQueue.splice(0, this.config.maxBatchSize)
    const context: WorkflowContext = {}

    for (const task of batchTasks) {
      try {
        if (task.task) {
          await task.task(context, {
            setOutput: () => { },
            setTitle: () => { },
            setProgress: () => { },
          })
        }
      }
      catch (error) {
        console.error(`Task failed: ${error}`)
        // Continue processing other tasks in the batch
      }
    }
  }

  async flush(): Promise<void> {
    await this.processBatch()
  }

  clear(): void {
    this.batchQueue = []
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}
