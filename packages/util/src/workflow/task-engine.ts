/**
 * Shared Task Engine - @clack/prompts integration
 */

import { log, spinner } from '@clack/prompts'
import chalk from 'chalk'
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
  concurrent?: boolean
  exitOnError?: boolean
  showTimer?: boolean
  clearOutput?: boolean
  autoRecovery?: boolean
  verbose?: boolean
}

export class TaskEngine {
  constructor(private options: TaskEngineOptions = {}) {}

  /**
   * Execute workflow with @clack/prompts - This is the main entry point
   */
  async execute(steps: WorkflowStep[], context: WorkflowContext = {}): Promise<WorkflowContext> {
    try {
      // Execute steps sequentially with @clack/prompts
      for (const step of steps) {
        await this.executeStep(step, context)
      }

      return context
    } catch (error) {
      if (error instanceof Error) {
        const formattedError = ErrorFormatter.formatPublishingFailure(error.message)
        console.error(formattedError)

        const errorBox = ErrorFormatter.createErrorBox('WORKFLOW EXECUTION FAILED', error.message, [
          'Check the error details above',
          'Run with --verbose for more information',
          'Consider running automated error recovery',
        ])
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
   * Execute a single step with @clack/prompts
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<void> {
    // Check if step should be enabled
    if (typeof step.enabled === 'function' && !step.enabled(context)) {
      return
    }
    if (typeof step.enabled === 'boolean' && !step.enabled) {
      return
    }

    // Check if step should be skipped
    const skipResult = typeof step.skip === 'function' ? await step.skip(context) : step.skip

    if (skipResult === true || typeof skipResult === 'string') {
      if (this.options.verbose) {
        log.info(
          `${chalk.gray('○')} ${chalk.gray(step.title)} ${typeof skipResult === 'string' ? `- ${skipResult}` : '- skipped'}`,
        )
      }
      return
    }

    // Execute subtasks if present
    if (step.subtasks && step.subtasks.length > 0) {
      log.step(`${chalk.blue('●')} ${step.title}`)

      if (step.concurrent && !this.options.concurrent === false) {
        // Execute subtasks concurrently
        await Promise.all(step.subtasks.map((subtask) => this.executeStep(subtask, context)))
      } else {
        // Execute subtasks sequentially
        for (const subtask of step.subtasks) {
          await this.executeStep(subtask, context)
        }
      }
      return
    }

    // Execute the main task
    if (step.task) {
      const s = spinner()
      s.start(`${chalk.blue('●')} ${step.title}`)

      let currentTitle = step.title
      let _currentOutput = ''

      const helpers: TaskHelpers = {
        setOutput: (output: string) => {
          _currentOutput = output
          s.message(`${chalk.blue('●')} ${currentTitle} - ${chalk.gray(output)}`)
        },
        setTitle: (title: string) => {
          currentTitle = title
          s.message(`${chalk.blue('●')} ${title}`)
        },
        setProgress: (current: number, total?: number) => {
          const progress = total ? `${current}/${total}` : `${current}%`
          const percentage = total ? Math.round((current / total) * 100) : current
          const progressBar = this.createProgressBar(percentage)
          s.message(
            `${chalk.blue('●')} ${currentTitle} ${progressBar} ${chalk.gray(`${progress}`)}`,
          )
        },
      }

      try {
        await step.task(context, helpers)
        s.stop(`${chalk.green('✓')} ${currentTitle}`)
      } catch (error) {
        s.stop(`${chalk.red('✗')} ${currentTitle}`)

        if (step.retry && step.retry > 0) {
          log.warn(`${chalk.yellow('↻')} Retrying ${step.title} (${step.retry} attempts remaining)`)
          const retryStep = { ...step, retry: step.retry - 1 }
          await this.executeStep(retryStep, context)
        } else {
          if (this.options.exitOnError !== false) {
            throw error
          } else {
            log.error(
              `${chalk.red('✗')} ${step.title} failed: ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }
      }
    }
  }

  private createProgressBar(percentage: number): string {
    const width = 20
    const filled = Math.round((percentage / 100) * width)
    const empty = width - filled

    return `[${chalk.green('█'.repeat(filled))}${chalk.gray('░'.repeat(empty))}]`
  }
}

/**
 * Factory function
 */
export function createTaskEngine(options?: TaskEngineOptions): TaskEngine {
  return new TaskEngine(options)
}
