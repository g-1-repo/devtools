/**
 * Shared Automated Error Recovery Service - Intelligent workflow error fixing
 */

import chalk from 'chalk'
import { execa } from 'execa'
import { ErrorFormatter } from '../debug/index.js'
import type { WorkflowContext, WorkflowStep } from './task-engine.js'
import { createTaskEngine } from './task-engine.js'

/**
 * Represents the analysis result of a workflow error, including classification,
 * severity assessment, and suggested recovery actions.
 */
export interface ErrorAnalysis {
  /** The category of error detected */
  type: 'linting' | 'typescript' | 'build' | 'authentication' | 'dependency' | 'test' | 'unknown'
  /** The severity level of the error */
  severity: 'critical' | 'warning' | 'minor'
  /** Whether the error can be automatically fixed */
  fixable: boolean
  /** Human-readable description of the error */
  description: string
  /** Array of suggested fix actions */
  suggestedFixes: string[]
}

/**
 * Singleton service for automated error recovery in G1 workflows.
 *
 * This service analyzes workflow errors, classifies them by type and severity,
 * and provides automated recovery workflows to fix common development issues
 * like linting errors, TypeScript issues, build failures, and dependency problems.
 *
 * @example
 * ```typescript
 * const recovery = ErrorRecoveryService.getInstance()
 *
 * try {
 *   // Some workflow operation that might fail
 *   await runWorkflow()
 * } catch (error) {
 *   // Analyze and recover from the error
 *   await recovery.executeRecovery(error)
 * }
 * ```
 */
export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService

  private constructor() {}

  /**
   * Gets the singleton instance of the ErrorRecoveryService.
   *
   * @returns The singleton ErrorRecoveryService instance
   */
  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService()
    }
    return ErrorRecoveryService.instance
  }

  /**
   * Analyzes an error to determine its type, severity, and potential fixes.
   *
   * This method examines the error message and stack trace to classify the error
   * into categories like linting, TypeScript, build, authentication, or dependency issues.
   *
   * @param error - The error to analyze
   * @param _context - Optional workflow context (currently unused)
   * @returns Promise<ErrorAnalysis> - Detailed analysis of the error
   *
   * @example
   * ```typescript
   * const recovery = ErrorRecoveryService.getInstance()
   * const analysis = await recovery.analyzeError(new Error('ESLint found 3 errors'))
   * console.log(analysis.type) // 'linting'
   * console.log(analysis.fixable) // true
   * ```
   */
  async analyzeError(error: Error, _context?: any): Promise<ErrorAnalysis> {
    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''

    if (
      errorMessage.includes('eslint') ||
      errorMessage.includes('lint') ||
      errorStack.includes('eslint') ||
      errorMessage.includes('style')
    ) {
      return {
        type: 'linting',
        severity: 'warning',
        fixable: true,
        description: 'ESLint or style-related errors detected',
        suggestedFixes: [
          'Run lint:fix to automatically fix issues',
          'Apply common lint pattern fixes',
          'Add eslint-disable comments for unfixable issues',
        ],
      }
    }

    if (
      errorMessage.includes('typescript') ||
      errorMessage.includes('tsc') ||
      errorMessage.includes('type') ||
      errorStack.includes('typescript')
    ) {
      return {
        type: 'typescript',
        severity: 'critical',
        fixable: false,
        description: 'TypeScript compilation errors',
        suggestedFixes: [
          'Fix type annotations',
          'Add missing imports',
          'Update tsconfig.json if needed',
        ],
      }
    }

    if (
      errorMessage.includes('build') ||
      errorMessage.includes('compile') ||
      errorMessage.includes('bundl')
    ) {
      return {
        type: 'build',
        severity: 'critical',
        fixable: true,
        description: 'Build or compilation errors',
        suggestedFixes: ['Clean and rebuild project', 'Update dependencies', 'Fix import paths'],
      }
    }

    if (
      errorMessage.includes('401') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('token')
    ) {
      return {
        type: 'authentication',
        severity: 'critical',
        fixable: false,
        description: 'Authentication or authorization errors',
        suggestedFixes: [
          'Check npm token',
          'Re-authenticate with npm login',
          'Verify repository permissions',
        ],
      }
    }

    if (
      errorMessage.includes('test') ||
      errorMessage.includes('spec') ||
      errorMessage.includes('jest') ||
      errorMessage.includes('vitest') ||
      errorMessage.includes('mocha') ||
      errorMessage.includes('cypress') ||
      errorMessage.includes('test:ci') ||
      errorMessage.includes('test failures detected') ||
      errorStack.includes('test')
    ) {
      return {
        type: 'test',
        severity: 'warning',
        fixable: true,
        description: 'Test execution failures detected',
        suggestedFixes: [
          'Run tests individually to identify failing tests',
          'Check test setup and configuration',
          'Review recent code changes that might affect tests',
          'Update test snapshots if needed',
          'Fix failing assertions and test logic',
        ],
      }
    }

    if (
      errorMessage.includes('module') ||
      errorMessage.includes('package') ||
      errorMessage.includes('dependency') ||
      errorMessage.includes('import')
    ) {
      return {
        type: 'dependency',
        severity: 'warning',
        fixable: true,
        description: 'Missing or incompatible dependencies',
        suggestedFixes: [
          'Install missing dependencies',
          'Update package versions',
          'Clear node_modules and reinstall',
        ],
      }
    }

    return {
      type: 'unknown',
      severity: 'critical',
      fixable: false,
      description: 'Unknown error type',
      suggestedFixes: [
        'Check error logs manually',
        'Search for similar issues online',
        'Contact support if needed',
      ],
    }
  }

  async createRecoveryWorkflow(
    analysis: ErrorAnalysis,
    _originalError: Error,
  ): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = []

    steps.push({
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
        steps.push(...(await this.createLintingRecoverySteps()))
        break
      case 'build':
        steps.push(...(await this.createBuildRecoverySteps()))
        break
      case 'dependency':
        steps.push(...(await this.createDependencyRecoverySteps()))
        break
      case 'typescript':
        steps.push({
          title: 'TypeScript Error Advisory',
          task: async (_ctx, helpers) => {
            helpers.setOutput('TypeScript errors require manual intervention')
            console.error(chalk.yellow('⚠️  TypeScript errors cannot be automatically fixed'))
            console.error(chalk.gray('Please review and fix type errors manually'))
            helpers.setTitle('TypeScript Error Advisory - ✅ Manual intervention required')
          },
        })
        break
      case 'authentication':
        steps.push({
          title: 'Authentication Error Advisory',
          task: async (_ctx, helpers) => {
            helpers.setOutput('Authentication errors require manual setup')
            console.error(chalk.yellow('⚠️  Authentication errors require manual intervention'))
            console.error(chalk.gray('Please check your npm token or run: npm login'))
            helpers.setTitle('Authentication Error Advisory - ✅ Manual intervention required')
          },
        })
        break
      case 'test':
        steps.push(...(await this.createTestRecoverySteps()))
        break
      default:
        steps.push({
          title: 'Unknown Error Advisory',
          task: async (_ctx, helpers) => {
            helpers.setOutput('Unknown error requires manual investigation')
            console.error(chalk.yellow('⚠️  Unknown error type - manual investigation needed'))
            helpers.setTitle('Unknown Error Advisory - ✅ Manual intervention required')
          },
        })
    }

    steps.push({
      title: 'Recovery Verification',
      task: async (_ctx, helpers) => {
        helpers.setOutput('Starting recovery verification...')

        if (analysis.fixable) {
          // Lint verification
          helpers.setOutput('Verifying lint fixes...')
          try {
            const lintProcess = execa('bun', ['run', 'lint'], { 
              stdio: ['inherit', 'pipe', 'pipe'],
              buffer: false
            })

            let lintFileCount = 0
            lintProcess.stdout?.on('data', (data) => {
              const output = data.toString()
              const lines = output.split('\n')
              
              for (const line of lines) {
                if (line.includes('.ts') || line.includes('.js')) {
                  lintFileCount++
                  helpers.setOutput(`Checking lint: ${line.trim()} (${lintFileCount} files)`)
                }
                if (line.includes('✓') || line.includes('All files pass')) {
                  helpers.setOutput(`Lint verification: ${line.trim()}`)
                }
              }
            })

            await lintProcess
            helpers.setOutput('✅ Lint check passed - no issues found')
          } catch (error) {
            const errorOutput = error instanceof Error ? error.message : String(error)
            if (errorOutput.includes('issues found')) {
              helpers.setOutput('⚠️ Lint issues may still exist - manual review needed')
            } else {
              helpers.setOutput('⚠️ Lint check failed - command may not be available')
            }
          }

          // Type-check verification
          helpers.setOutput('Verifying TypeScript compilation...')
          try {
            const typecheckProcess = execa('bun', ['run', 'typecheck'], { 
              stdio: ['inherit', 'pipe', 'pipe'],
              buffer: false
            })

            let typeFileCount = 0
            typecheckProcess.stdout?.on('data', (data) => {
              const output = data.toString()
              const lines = output.split('\n')
              
              for (const line of lines) {
                if (line.includes('.ts') && !line.includes('error')) {
                  typeFileCount++
                  helpers.setOutput(`Type-checking: ${line.trim()} (${typeFileCount} files)`)
                }
                if (line.includes('Found 0 errors')) {
                  helpers.setOutput(`Type-check: ${line.trim()}`)
                }
              }
            })

            await typecheckProcess
            helpers.setOutput('✅ Type-check passed - no errors found')
          } catch (error) {
            const errorOutput = error instanceof Error ? error.message : String(error)
            if (errorOutput.includes('error')) {
              helpers.setOutput('⚠️ Type-check issues may still exist - manual review needed')
            } else {
              helpers.setOutput('⚠️ Type-check failed - command may not be available')
            }
          }

          // Test verification for test-related errors
          if (analysis.type === 'test') {
            helpers.setOutput('Verifying test execution...')
            try {
              const testProcess = execa('bun', ['run', 'test', '--reporter=verbose'], { 
                stdio: ['inherit', 'pipe', 'pipe'],
                buffer: false
              })

              let testFileCount = 0
              testProcess.stdout?.on('data', (data) => {
                const output = data.toString()
                const lines = output.split('\n')
                
                for (const line of lines) {
                  if (line.includes('.test.') || line.includes('.spec.')) {
                    testFileCount++
                    helpers.setOutput(`Running test: ${line.trim()} (${testFileCount} files)`)
                  }
                  if (line.includes('Test Files') && line.includes('passed')) {
                    helpers.setOutput(`Test verification: ${line.trim()}`)
                  }
                }
              })

              await testProcess
              helpers.setOutput('✅ Test verification passed - all tests running')
            } catch {
              helpers.setOutput('⚠️ Some tests may still be failing - manual review needed')
            }
          }
        } else {
          helpers.setOutput('⚠️ Error marked as non-fixable - manual intervention required')
        }

        helpers.setTitle('Recovery Verification - ✅ Complete')
      },
    })

    return steps
  }

  async executeRecovery(error: Error, context?: WorkflowContext): Promise<void> {
    try {
      console.error(`\n${chalk.cyan('═'.repeat(68))}`)
      console.error(chalk.cyan.bold('           AUTOMATED ERROR RECOVERY INITIATED           '))
      console.error(`${chalk.cyan('═'.repeat(68))}\n`)

      const analysis = await this.analyzeError(error, context)
      const recoverySteps = await this.createRecoveryWorkflow(analysis, error)

      const engine = createTaskEngine({ concurrent: false, exitOnError: true, showTimer: true })
      await engine.execute(recoverySteps, context)
    } catch (recoveryError) {
      console.error(
        ErrorFormatter.formatError(
          recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
          'critical',
        ).message,
      )
      console.error(chalk.red('\nAutomated recovery failed. Manual intervention required.'))
    }
  }

  private async createLintingRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        title: 'Run lint:fix',
        task: async (_ctx, helpers) => {
          helpers.setOutput('Running automatic lint fixes...')
          await execa('bun', ['run', 'lint:fix'])
          helpers.setTitle('Run lint:fix - ✅ Complete')
        },
      },
      {
        title: 'Verify linting',
        task: async (_ctx, helpers) => {
          helpers.setOutput('Verifying lint fixes...')
          await execa('bun', ['run', 'lint'])
          helpers.setTitle('Verify linting - ✅ All issues resolved')
        },
      },
    ]
  }

  private async createBuildRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        title: 'Clean build artifacts',
        task: async (_ctx, helpers) => {
          await execa('bun', ['run', 'clean'])
          helpers.setTitle('Clean - ✅ Complete')
        },
      },
      {
        title: 'Build project',
        task: async (_ctx, helpers) => {
          await execa('bun', ['run', 'build'])
          helpers.setTitle('Build - ✅ Complete')
        },
      },
    ]
  }

  private async createDependencyRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        title: 'Install dependencies',
        task: async (_ctx, helpers) => {
          await execa('bun', ['install'])
          helpers.setTitle('Install dependencies - ✅ Complete')
        },
      },
      {
        title: 'Update dependencies',
        task: async (_ctx, helpers) => {
          await execa('bun', ['update'])
          helpers.setTitle('Update dependencies - ✅ Complete')
        },
      },
    ]
  }

  private async createTestRecoverySteps(): Promise<WorkflowStep[]> {
    return [
      {
        title: 'Run individual tests',
        task: async (_ctx, helpers) => {
          helpers.setOutput('Running tests to identify specific failures...')
          try {
            const testProcess = execa('bun', ['run', 'test', '--reporter=verbose'], { 
              stdio: ['inherit', 'pipe', 'pipe'],
              buffer: false
            })

            let currentTestFile = ''
            let testCount = 0
            let passedTests = 0
            let failedTests = 0

            testProcess.stdout?.on('data', (data) => {
              const output = data.toString()
              const lines = output.split('\n')
              
              for (const line of lines) {
                // Detect test file being processed
                if (line.includes('.test.') || line.includes('.spec.')) {
                  const fileMatch = line.match(/([^/\s]+\.(?:test|spec)\.[jt]s)/);
                  if (fileMatch) {
                    currentTestFile = fileMatch[1]
                    helpers.setOutput(`Testing: ${currentTestFile}`)
                  }
                }
                
                // Count test results
                if (line.includes('✓') || line.includes('PASS')) {
                  passedTests++
                  testCount++
                  helpers.setOutput(`Testing: ${currentTestFile} (${passedTests}✓/${failedTests}✗)`)
                } else if (line.includes('✗') || line.includes('FAIL')) {
                  failedTests++
                  testCount++
                  helpers.setOutput(`Testing: ${currentTestFile} (${passedTests}✓/${failedTests}✗)`)
                }
                
                // Show test summary
                if (line.includes('Test Files') && (line.includes('passed') || line.includes('failed'))) {
                  helpers.setOutput(line.trim())
                }
              }
            })

            testProcess.stderr?.on('data', (data) => {
              const output = data.toString()
              if (output.includes('FAIL') || output.includes('Error')) {
                helpers.setOutput(`⚠️ ${output.trim()}`)
              }
            })

            await testProcess
            helpers.setTitle(`Run individual tests - ✅ All tests passed (${testCount} tests)`)
          } catch (error) {
            const errorOutput = error instanceof Error ? error.message : String(error)
            helpers.setOutput(`Some tests are still failing: ${errorOutput}`)
            helpers.setTitle('Run individual tests - ⚠️ Tests still failing')
          }
        },
      },
      {
        title: 'Check test configuration',
        task: async (_ctx, helpers) => {
          helpers.setOutput('Verifying test configuration files...')
          try {
            // Check for common test config files
            const configFiles = ['vitest.config.ts', 'vitest.config.js', 'jest.config.js', 'test.config.js']
            let foundConfig = false
            
            for (const file of configFiles) {
              try {
                helpers.setOutput(`Checking for ${file}...`)
                await execa('ls', [file], { stdio: 'pipe' })
                helpers.setOutput(`✅ Found test config: ${file}`)
                foundConfig = true
                break
              } catch {
                helpers.setOutput(`❌ ${file} not found`)
              }
            }
            
            if (!foundConfig) {
              helpers.setOutput('⚠️ No test configuration file found - using defaults')
            }
            
            helpers.setTitle('Check test configuration - ✅ Complete')
          } catch {
            helpers.setTitle('Check test configuration - ⚠️ Issues found')
          }
        },
      },
      {
        title: 'Test environment check',
        task: async (_ctx, helpers) => {
          helpers.setOutput('Checking test environment and dependencies...')
          
          // Check for test dependencies
          helpers.setOutput('Verifying test dependencies...')
          try {
            const packageJson = await import(process.cwd() + '/package.json')
            const testDeps = ['vitest', 'jest', '@testing-library', 'mocha', 'chai']
            const foundDeps = testDeps.filter(dep => 
              packageJson.dependencies?.[dep] || 
              packageJson.devDependencies?.[dep] ||
              Object.keys(packageJson.devDependencies || {}).some(key => key.includes(dep))
            )
            
            if (foundDeps.length > 0) {
              helpers.setOutput(`✅ Found test dependencies: ${foundDeps.join(', ')}`)
            } else {
              helpers.setOutput('⚠️ No common test dependencies found')
            }
          } catch {
            helpers.setOutput('⚠️ Could not read package.json')
          }
          
          console.error(chalk.yellow('⚠️  Test failures detected'))
          console.error(chalk.gray('Consider the following actions:'))
          console.error(chalk.gray('• Review failing test output for specific errors'))
          console.error(chalk.gray('• Check if recent code changes broke existing functionality'))
          console.error(chalk.gray('• Update test snapshots if UI/output has changed'))
          console.error(chalk.gray('• Verify test data and mock configurations'))
          helpers.setTitle('Test environment check - ✅ Advisory provided')
        },
      },
    ]
  }
}
