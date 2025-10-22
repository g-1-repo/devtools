/**
 * Parallel Executor - Manages concurrent task execution with resource limits
 */

import type { WorkflowStep } from './task-engine.js'

export interface ParallelExecutorOptions {
  maxConcurrent?: number
  timeout?: number
  continueOnError?: boolean
}

export class ParallelExecutor {
  private maxConcurrent: number
  private timeout: number
  private continueOnError: boolean
  private running: Set<Promise<any>>
  private errors: Error[]

  constructor(options: ParallelExecutorOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 4
    this.timeout = options.timeout || 30000 // 30 seconds default
    this.continueOnError = options.continueOnError || false
    this.running = new Set()
    this.errors = []
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Task execution timeout')), timeout)
    })

    return Promise.race([promise, timeoutPromise])
  }

  async executeAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = []
    const taskQueue = [...tasks]
    this.errors = []

    try {
      while (taskQueue.length > 0 || this.running.size > 0) {
        // Fill up concurrent slots
        while (this.running.size < this.maxConcurrent && taskQueue.length > 0) {
          const task = taskQueue.shift()!
          const execution = this.executeWithTimeout(task(), this.timeout)
            .then((result) => {
              results.push(result)
              this.running.delete(execution)
            })
            .catch((error) => {
              this.running.delete(execution)
              this.errors.push(error as Error)
              if (!this.continueOnError) {
                throw error // Immediately throw if not continuing on error
              }
            })

          this.running.add(execution)
        }

        // Wait for at least one task to complete
        if (this.running.size > 0) {
          try {
            await Promise.race(this.running)
          }
          catch (error) {
            if (!this.continueOnError) {
              throw error // Immediately throw if not continuing on error
            }
          }
        }
      }

      // If we're continuing on error but had errors, throw the first one after all tasks complete
      if (this.errors.length > 0 && !this.continueOnError) {
        throw this.errors[0]
      }

      return results
    }
    finally {
      this.running.clear()
    }
  }

  async executeSteps(steps: WorkflowStep[]): Promise<void> {
    const independentSteps = steps.filter(step => !step.dependencies)
    const dependentSteps = steps.filter(step => step.dependencies)

    // Execute independent steps in parallel
    await this.executeAll(
      independentSteps.map(step => async () => {
        if (step.task) {
          await step.task({}, {
            setOutput: () => { },
            setTitle: () => { },
            setProgress: () => { },
          })
        }
      }),
    )

    // Execute dependent steps sequentially
    for (const step of dependentSteps) {
      if (step.task) {
        await step.task({}, {
          setOutput: () => { },
          setTitle: () => { },
          setProgress: () => { },
        })
      }
    }
  }

  getErrors(): Error[] {
    return [...this.errors]
  }

  clearErrors(): void {
    this.errors = []
  }
}
