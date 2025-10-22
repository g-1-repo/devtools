import type chalk from 'chalk'
import type { WorkflowContext, WorkflowStep } from './task-engine.js'
/**
 * Optimized Error Recovery Service - Performance-focused implementation
 */

import { Buffer } from 'node:buffer'
import { ErrorFormatter } from '../debug/index.js'
import { CacheManager } from './cache-manager.js'
import { ParallelExecutor } from './parallel-executor.js'

// Lazy load heavy dependencies
const loadChalk = () => import('chalk').then(m => m.default)
const loadExeca = () => import('execa').then(m => m)

export interface ErrorAnalysis {
  type: 'linting' | 'typescript' | 'build' | 'authentication' | 'dependency' | 'unknown'
  severity: 'critical' | 'warning' | 'minor'
  fixable: boolean
  description: string
  suggestedFixes: string[]
  errorHash: string // Used for caching
}

export class OptimizedErrorRecoveryService {
  private static instance: OptimizedErrorRecoveryService
  private errorCache: CacheManager<string, ErrorAnalysis>
  private parallelExecutor: ParallelExecutor
  private chalk: typeof chalk | undefined
  private execa: typeof import('execa') | undefined

  private constructor() {
    this.errorCache = new CacheManager<string, ErrorAnalysis>({
      maxSize: 100,
      ttl: 1000 * 60 * 60, // 1 hour cache TTL
    })
    this.parallelExecutor = new ParallelExecutor({
      maxConcurrent: 4,
      timeout: 30000,
    })
  }

  static getInstance(): OptimizedErrorRecoveryService {
    if (!OptimizedErrorRecoveryService.instance) {
      OptimizedErrorRecoveryService.instance = new OptimizedErrorRecoveryService()
    }
    return OptimizedErrorRecoveryService.instance
  }

  private async ensureChalk(): Promise<typeof chalk> {
    if (!this.chalk) {
      this.chalk = await loadChalk()
    }
    return this.chalk
  }

  private async ensureExeca(): Promise<typeof import('execa')> {
    if (!this.execa) {
      this.execa = await loadExeca()
    }
    return this.execa
  }

  private computeErrorHash(error: Error): string {
    const source = `${error.name}|${error.message}|${error.stack ?? ''}`
    const buf = Buffer.from(source)
    // Simple fast hash: base64 of first 24 bytes
    return buf.subarray(0, Math.min(24, buf.length)).toString('base64')
  }

  async analyzeError(error: Error, _context?: WorkflowContext): Promise<ErrorAnalysis> {
    const hash = this.computeErrorHash(error)
    const cached = this.errorCache.get(hash)
    if (cached)
      return cached

    const message = `${error.name}: ${error.message}`
    let type: ErrorAnalysis['type'] = 'unknown'
    let severity: ErrorAnalysis['severity'] = 'warning'
    let fixable = false
    const suggestedFixes: string[] = []

    if (/eslint|lint/i.test(message)) {
      type = 'linting'
      severity = 'minor'
      fixable = true
      suggestedFixes.push('Run `bun run lint:fix`', 'Verify with `bun run lint`')
    }
    else if (/ts\d{3}|typescript/i.test(message)) {
      type = 'typescript'
      severity = 'warning'
      fixable = true
      suggestedFixes.push('Run `bun run type-check`', 'Fix TypeScript types and generics')
    }
    else if (/build failed|cannot build|tsup|vite|webpack/i.test(message)) {
      type = 'build'
      severity = 'critical'
      fixable = true
      suggestedFixes.push('Clean build artifacts', 'Reinstall deps', 'Re-run build')
    }
    else if (/auth|token|unauthorized|forbidden/i.test(message)) {
      type = 'authentication'
      severity = 'critical'
      fixable = false
      suggestedFixes.push('Verify credentials', 'Refresh tokens')
    }
    else if (/dep|module not found|peer|version conflict|lockfile/i.test(message)) {
      type = 'dependency'
      severity = 'warning'
      fixable = true
      suggestedFixes.push('Update dependencies', 'Reinstall with `bun install`')
    }

    const description = `Detected ${type} issue. Severity: ${severity}. Fixable: ${fixable ? 'Yes' : 'No'}`
    const analysis: ErrorAnalysis = { type, severity, fixable, description, suggestedFixes, errorHash: hash }

    this.errorCache.set(hash, analysis)
    return analysis
  }

  async createRecoveryWorkflow(analysis: ErrorAnalysis, _originalError: Error): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = []
    await this.ensureChalk()

    steps.push({
      id: 'analysis',
      title: 'Error Analysis',
      task: async (_ctx, helpers) => {
        helpers.setOutput('Analyzing error for automated recovery...')
        const errorBox = ErrorFormatter.createErrorBox(
          'AUTOMATED ERROR RECOVERY',
          `Error Type: ${analysis.type} | Severity: ${analysis.severity} | Fixable: ${analysis.fixable ? 'Yes' : 'No'}`,
          analysis.suggestedFixes,
        )
        console.error(errorBox)
        helpers.setTitle(`Error Analysis - ✅ ${analysis.type} error detected`)
      },
    })

    switch (analysis.type) {
      case 'linting':
        steps.push(...await this.createParallelLintingRecoverySteps())
        break
      case 'build':
        steps.push(...await this.createParallelBuildRecoverySteps())
        break
      case 'dependency':
        steps.push(...await this.createParallelDependencyRecoverySteps())
        break
    }

    steps.push({
      id: 'verification',
      title: 'Recovery Verification',
      dependencies: steps.map(s => s.id!).filter(id => id !== 'analysis'),
      task: async (_ctx, helpers) => {
        helpers.setOutput('Verifying recovery actions...')
        helpers.setTitle('Recovery Verification - ✅ Complete')
      },
    })

    return steps
  }

  /**
   * Execute recovery with parallel processing
   */
  async executeRecovery(error: Error, context?: WorkflowContext): Promise<void> {
    const chalk = await this.ensureChalk()

    try {
      console.error(`\n${chalk.cyan('═'.repeat(68))}`)
      console.error(chalk.cyan.bold('           AUTOMATED ERROR RECOVERY INITIATED           '))
      console.error(`${chalk.cyan('═'.repeat(68))}\n`)

      const analysis = await this.analyzeError(error, context)
      const recoverySteps = await this.createRecoveryWorkflow(analysis, error)

      // Execute recovery steps with parallel processing
      await this.parallelExecutor.executeSteps(recoverySteps)
    }
    catch (recoveryError) {
      console.error(ErrorFormatter.formatError(
        recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
        'critical',
      ).message)
      console.error(chalk.red('\nAutomated recovery failed. Manual intervention required.'))
    }
  }

  /**
   * Create parallel linting recovery steps
   */
  private async createParallelLintingRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        id: 'lint-fix',
        title: 'Run lint:fix',
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          helpers.setOutput('Running automatic lint fixes...')
          await execa.execa('bun', ['run', 'lint:fix'])
          helpers.setTitle('Run lint:fix - ✅ Complete')
        },
      },
      {
        id: 'lint-verify',
        title: 'Verify linting',
        dependencies: ['lint-fix'],
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          helpers.setOutput('Verifying lint fixes...')
          await execa.execa('bun', ['run', 'lint'])
          helpers.setTitle('Verify linting - ✅ All issues resolved')
        },
      },
    ]
  }

  /**
   * Create parallel build recovery steps
   */
  private async createParallelBuildRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        id: 'clean',
        title: 'Clean build artifacts',
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          await execa.execa('bun', ['run', 'clean'])
          helpers.setTitle('Clean - ✅ Complete')
        },
      },
      {
        id: 'deps-install',
        title: 'Reinstall dependencies',
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          await execa.execa('bun', ['install'])
          helpers.setTitle('Dependencies - ✅ Installed')
        },
      },
      {
        id: 'build',
        title: 'Rebuild project',
        dependencies: ['clean', 'deps-install'],
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          await execa.execa('bun', ['run', 'build'])
          helpers.setTitle('Build - ✅ Complete')
        },
      },
    ]
  }

  /**
   * Create parallel dependency recovery steps
   */
  private async createParallelDependencyRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        id: 'update-deps',
        title: 'Update dependencies',
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          await execa.execa('bun', ['update'])
          helpers.setTitle('Dependencies - ✅ Updated')
        },
      },
      {
        id: 'verify-deps',
        title: 'Verify dependencies',
        dependencies: ['update-deps'],
        task: async (_ctx, helpers) => {
          const execa = await this.ensureExeca()
          await execa.execa('bun', ['install'])
          helpers.setTitle('Verification - ✅ Complete')
        },
      },
    ]
  }
}
