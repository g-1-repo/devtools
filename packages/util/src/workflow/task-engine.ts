/**
 * Shared Task Engine - Native listr2 integration
 */

import type { ListrContext, ListrRenderer, ListrTask } from 'listr2'
import chalk from 'chalk'
import { Listr } from 'listr2'
import { ErrorFormatter } from '../debug/index.js'

// Minimal shared workflow types for util module
export interface WorkflowContext {
  [key: string]: unknown
}

export interface TaskHelpers {
  setOutput: (output: string) => void
  setTitle: (title: string) => void
  setProgress: (current: number, total?: number) => void
}

export interface WorkflowStep {
  title: string
  task?: (ctx: WorkflowContext, helpers: TaskHelpers) => Promise<void> | void
  subtasks?: WorkflowStep[]
  enabled?: boolean | ((ctx: WorkflowContext) => boolean)
  skip?: boolean | string | ((ctx: WorkflowContext) => boolean | string | Promise<boolean | string>)
  retry?: number
  concurrent?: boolean
  // Optional extensions
  id?: string
  dependencies?: string[]
  resources?: {
    memory?: number
    cpu?: number
    duration?: number
  }
  hints?: {
    batchable?: boolean
    priority?: number
    cacheable?: boolean
  }
}

export interface TaskEngineOptions {
  renderer?: ListrRenderer
  concurrent?: boolean
  exitOnError?: boolean
  showTimer?: boolean
  clearOutput?: boolean
  autoRecovery?: boolean
}

export class TaskEngine {
  constructor(private options: TaskEngineOptions = {}) {}

  /**
   * Execute workflow with native listr2 - This is the main entry point
   */
  async execute(steps: WorkflowStep[], context: WorkflowContext = {}): Promise<WorkflowContext> {
    const tasks: ListrTask[] = steps.map(step => this.createListrTask(step))

    const listr = new Listr(tasks, {
      concurrent: this.options.concurrent ?? false,
      exitOnError: this.options.exitOnError ?? true,
      rendererOptions: {
        collapseSubtasks: false,
        suffixSkips: true,
        showErrorMessage: true,
        showTimer: this.options.showTimer ?? true,
        clearOutput: this.options.clearOutput ?? false,
        formatOutput: 'wrap',
        removeEmptyLines: false,
        indentation: 2,
        icon: {
          COMPLETED: '✓',
          FAILED: '✗',
          PAUSED: '⏸',
          ROLLING_BACK: '↶',
          SKIPPED: '↷',
          STARTED: '⧖',
        },
      },
      ctx: context as ListrContext,
    })

    try {
      const result = await listr.run()
      return result as WorkflowContext
    }
    catch (error) {
      if (error instanceof Error) {
        const formattedError = ErrorFormatter.formatPublishingFailure(error.message)
        console.error(formattedError)

        const errorBox = ErrorFormatter.createErrorBox(
          'WORKFLOW EXECUTION FAILED',
          error.message,
          [
            'Check the error details above',
            'Run with --verbose for more information',
            'Consider running automated error recovery',
          ],
        )
        console.error(errorBox)

        if (this.options.autoRecovery !== false) {
          console.error(chalk.cyan('\n🔧 Starting automated error recovery...'))
          // Lazy import to avoid hard coupling
          const { ErrorRecoveryService } = await import('./error-recovery.js')
          const recoveryService = ErrorRecoveryService.getInstance()
          await recoveryService.executeRecovery(error, context as WorkflowContext)
        }

        const enhancedError = new Error(error.message)
        enhancedError.name = 'WorkflowExecutionError'
        throw enhancedError
      }
      throw error
    }
  }

  /**
   * Convert WorkflowStep to native listr2 ListrTask
   */
  private createListrTask(step: WorkflowStep): ListrTask {
    const taskObj: any = {
      title: step.title,
      retry: step.retry,
      task: async (ctx: any, task: any) => {
        if (step.subtasks) {
          return task.newListr(
            step.subtasks.map(subtask => this.createListrTask(subtask)),
            {
              concurrent: step.concurrent ?? false,
              rendererOptions: {
                collapseSubtasks: false,
              },
            },
          )
        }

        if (step.task) {
          return await step.task(ctx as WorkflowContext, {
            setOutput: (output: string) => {
              task.output = output
            },
            setTitle: (title: string) => {
              task.title = title
            },
            setProgress: (current: number, total?: number) => {
              task.output = total ? `${current}/${total}` : `${current}%`
            },
          })
        }
      },
    }

    if (typeof step.enabled !== 'undefined') {
      taskObj.enabled = typeof step.enabled === 'function'
        ? (ctx: any) => (step.enabled as (ctx: WorkflowContext) => boolean | Promise<boolean>)(ctx as WorkflowContext)
        : step.enabled
    }

    if (typeof step.skip !== 'undefined') {
      taskObj.skip = typeof step.skip === 'function'
        ? async (ctx: any) => {
          const result = await (step.skip as (ctx: WorkflowContext) => boolean | string | Promise<boolean | string>)(ctx as WorkflowContext)
          return result
        }
        : step.skip
    }

    return taskObj as ListrTask
  }
}

/**
 * Factory function
 */
export function createTaskEngine(options?: TaskEngineOptions): TaskEngine {
  return new TaskEngine(options)
}
