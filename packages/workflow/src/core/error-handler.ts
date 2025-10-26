/**
 * Enhanced Error Handler - Structured Error Display and Recovery
 * 
 * This module provides comprehensive error handling with actionable suggestions,
 * structured display, and recovery mechanisms as specified in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import chalk from 'chalk'
import { existsSync } from 'node:fs'
import { execa } from 'execa'

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info'

/**
 * Structured error information
 */
export interface StructuredError {
  code: string
  title: string
  message: string
  severity: ErrorSeverity
  suggestions: string[]
  autoFixAvailable: boolean
  autoFixAction?: () => Promise<void>
  context?: Record<string, unknown>
  originalError?: Error
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  GIT = 'git',
  NPM = 'npm',
  BUILD = 'build',
  NETWORK = 'network',
  FILESYSTEM = 'filesystem',
  CONFIGURATION = 'configuration',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown',
}

/**
 * Enhanced error class with structured information
 */
export class WorkflowError extends Error {
  public readonly code: string
  public readonly severity: ErrorSeverity
  public readonly suggestions: string[]
  public readonly autoFixAvailable: boolean
  public readonly autoFixAction?: () => Promise<void>
  public readonly context?: Record<string, unknown>
  public readonly category: ErrorCategory

  constructor(options: {
    code: string
    title: string
    message: string
    severity?: ErrorSeverity
    suggestions?: string[]
    autoFixAvailable?: boolean
    autoFixAction?: () => Promise<void>
    context?: Record<string, unknown>
    category?: ErrorCategory
    originalError?: Error
  }) {
    super(options.message)
    this.name = 'WorkflowError'
    this.code = options.code
    this.severity = options.severity ?? 'error'
    this.suggestions = options.suggestions ?? []
    this.autoFixAvailable = options.autoFixAvailable ?? false
    this.autoFixAction = options.autoFixAction
    this.context = options.context
    this.category = options.category ?? ErrorCategory.UNKNOWN

    if (options.originalError) {
      this.stack = options.originalError.stack
      this.cause = options.originalError
    }
  }
}

/**
 * Analyzes an error and returns structured error information
 */
export function analyzeError(error: Error | unknown): StructuredError {
  if (error instanceof WorkflowError) {
    return {
      code: error.code,
      title: error.name,
      message: error.message,
      severity: error.severity,
      suggestions: error.suggestions,
      autoFixAvailable: error.autoFixAvailable,
      autoFixAction: error.autoFixAction,
      context: error.context,
      originalError: error.cause as Error,
    }
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  // Git-related errors
  if (errorMessage.includes('not a git repository')) {
    return {
      code: 'GIT_NOT_INITIALIZED',
      title: 'Git Repository Not Found',
      message: 'This directory is not a git repository',
      severity: 'error',
      suggestions: [
        'Run `git init` to initialize a git repository',
        'Navigate to a directory that contains a git repository',
        'Use the --auto-fix flag to automatically initialize git',
      ],
      autoFixAvailable: true,
      autoFixAction: async () => {
        await execa('git', ['init'], { stdio: 'inherit' })
      },
      originalError: error instanceof Error ? error : undefined,
    }
  }

  if (errorMessage.includes('nothing to commit')) {
    return {
      code: 'GIT_NOTHING_TO_COMMIT',
      title: 'No Changes to Commit',
      message: 'Working directory is clean, nothing to commit',
      severity: 'warning',
      suggestions: [
        'Make some changes to your files',
        'Check if you\'re in the correct directory',
        'Use `git status` to see the current state',
      ],
      autoFixAvailable: false,
      originalError: error instanceof Error ? error : undefined,
    }
  }

  if (errorMessage.includes('uncommitted changes')) {
    return {
      code: 'GIT_UNCOMMITTED_CHANGES',
      title: 'Uncommitted Changes Detected',
      message: 'There are uncommitted changes in the working directory',
      severity: 'warning',
      suggestions: [
        'Commit your changes with `git commit -am "Your message"`',
        'Stash your changes with `git stash`',
        'Use the --auto-fix flag to automatically commit changes',
      ],
      autoFixAvailable: true,
      autoFixAction: async () => {
        await execa('git', ['add', '.'], { stdio: 'inherit' })
        await execa('git', ['commit', '-m', 'chore: commit changes before release'], { stdio: 'inherit' })
      },
      originalError: error instanceof Error ? error : undefined,
    }
  }

  // NPM-related errors
  if (errorMessage.includes('npm ERR!') || errorMessage.includes('ENOENT: no such file or directory, open \'package.json\'')) {
    return {
      code: 'NPM_PACKAGE_JSON_MISSING',
      title: 'Package.json Not Found',
      message: 'No package.json file found in the current directory',
      severity: 'error',
      suggestions: [
        'Run `npm init` to create a package.json file',
        'Navigate to a directory that contains a package.json file',
        'Check if you\'re in the correct project directory',
      ],
      autoFixAvailable: true,
      autoFixAction: async () => {
        await execa('npm', ['init', '-y'], { stdio: 'inherit' })
      },
      originalError: error instanceof Error ? error : undefined,
    }
  }

  if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
    return {
      code: 'NPM_PERMISSION_DENIED',
      title: 'Permission Denied',
      message: 'Insufficient permissions to perform npm operation',
      severity: 'error',
      suggestions: [
        'Try running with sudo (not recommended for npm)',
        'Fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors',
        'Use a Node version manager like nvm',
        'Check your npm configuration',
      ],
      autoFixAvailable: false,
      originalError: error instanceof Error ? error : undefined,
    }
  }

  // Network-related errors
  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return {
      code: 'NETWORK_ERROR',
      title: 'Network Connection Error',
      message: 'Unable to connect to remote services',
      severity: 'error',
      suggestions: [
        'Check your internet connection',
        'Verify proxy settings if behind a corporate firewall',
        'Try again in a few minutes',
        'Check if the remote service is available',
      ],
      autoFixAvailable: false,
      originalError: error instanceof Error ? error : undefined,
    }
  }

  // Build-related errors
  if (errorMessage.includes('build failed') || errorMessage.includes('compilation error')) {
    return {
      code: 'BUILD_FAILED',
      title: 'Build Process Failed',
      message: 'The build process encountered errors',
      severity: 'error',
      suggestions: [
        'Check the build logs for specific error details',
        'Ensure all dependencies are installed',
        'Verify your TypeScript/JavaScript syntax',
        'Run `npm run lint` to check for code issues',
      ],
      autoFixAvailable: false,
      originalError: error instanceof Error ? error : undefined,
    }
  }

  // Authentication errors
  if (errorMessage.includes('authentication failed') || errorMessage.includes('401') || errorMessage.includes('403')) {
    return {
      code: 'AUTH_FAILED',
      title: 'Authentication Failed',
      message: 'Unable to authenticate with remote service',
      severity: 'error',
      suggestions: [
        'Check your authentication credentials',
        'Verify your access tokens are valid',
        'Ensure you have the necessary permissions',
        'Try logging in again',
      ],
      autoFixAvailable: false,
      originalError: error instanceof Error ? error : undefined,
    }
  }

  // Generic error fallback
  return {
    code: 'UNKNOWN_ERROR',
    title: 'Unknown Error',
    message: errorMessage,
    severity: 'error',
    suggestions: [
      'Check the error details above',
      'Try running the command again',
      'Ensure all prerequisites are met',
      'Check the documentation for troubleshooting',
    ],
    autoFixAvailable: false,
    originalError: error instanceof Error ? error : undefined,
  }
}

/**
 * Displays a structured error with formatting and suggestions
 */
export function displayStructuredError(structuredError: StructuredError): void {
  const severityIcon = structuredError.severity === 'error' ? '❌' : 
                      structuredError.severity === 'warning' ? '⚠️' : 'ℹ️'
  const severityColor = structuredError.severity === 'error' ? chalk.red : 
                       structuredError.severity === 'warning' ? chalk.yellow : chalk.blue

  console.log()
  console.log(severityColor.bold('╔══════════════════════════════════════════════════════════╗'))
  console.log(severityColor.bold(`║  ${severityIcon} ${structuredError.title.toUpperCase().padEnd(50)} ║`))
  console.log(severityColor.bold('╚══════════════════════════════════════════════════════════╝'))
  console.log()

  // Error code and message
  console.log(chalk.gray(`Code: ${structuredError.code}`))
  console.log(chalk.white(structuredError.message))
  console.log()

  // Context information
  if (structuredError.context && Object.keys(structuredError.context).length > 0) {
    console.log(chalk.cyan('Context:'))
    for (const [key, value] of Object.entries(structuredError.context)) {
      console.log(chalk.gray(`  ${key}: ${String(value)}`))
    }
    console.log()
  }

  // Suggestions
  if (structuredError.suggestions.length > 0) {
    console.log(chalk.cyan('💡 Suggestions:'))
    for (const suggestion of structuredError.suggestions) {
      console.log(chalk.gray(`  • ${suggestion}`))
    }
    console.log()
  }

  // Auto-fix availability
  if (structuredError.autoFixAvailable) {
    console.log(chalk.green('🔧 Auto-fix available! Use the --auto-fix flag to automatically resolve this issue.'))
    console.log()
  }
}

/**
 * Handles errors with enhanced display and recovery options
 */
export async function handleError(
  error: Error | unknown,
  options: {
    autoFix?: boolean
    interactive?: boolean
    exitOnError?: boolean
  } = {}
): Promise<void> {
  const { autoFix = false, interactive = false, exitOnError = true } = options
  const structuredError = analyzeError(error)

  displayStructuredError(structuredError)

  // Auto-fix if available and requested
  if (autoFix && structuredError.autoFixAvailable && structuredError.autoFixAction) {
    try {
      console.log(chalk.blue('🔧 Attempting auto-fix...'))
      await structuredError.autoFixAction()
      console.log(chalk.green('✅ Auto-fix completed successfully'))
      return
    } catch (fixError) {
      console.log(chalk.red(`❌ Auto-fix failed: ${fixError instanceof Error ? fixError.message : String(fixError)}`))
    }
  }

  // Interactive fix if available and requested
  if (interactive && structuredError.autoFixAvailable && structuredError.autoFixAction) {
    const { prompt } = await import('enquirer')
    const { shouldFix } = await prompt<{ shouldFix: boolean }>({
      type: 'confirm',
      name: 'shouldFix',
      message: 'Would you like to attempt an automatic fix?',
      initial: true,
    })

    if (shouldFix) {
      try {
        console.log(chalk.blue('🔧 Attempting auto-fix...'))
        await structuredError.autoFixAction()
        console.log(chalk.green('✅ Auto-fix completed successfully'))
        return
      } catch (fixError) {
        console.log(chalk.red(`❌ Auto-fix failed: ${fixError instanceof Error ? fixError.message : String(fixError)}`))
      }
    }
  }

  // Exit if requested
  if (exitOnError) {
    process.exit(1)
  }
}

/**
 * Creates a workflow error with predefined patterns
 */
export function createWorkflowError(
  category: ErrorCategory,
  code: string,
  message: string,
  options: Partial<{
    severity: ErrorSeverity
    suggestions: string[]
    autoFixAvailable: boolean
    autoFixAction: () => Promise<void>
    context: Record<string, unknown>
    originalError: Error
  }> = {}
): WorkflowError {
  return new WorkflowError({
    code,
    title: `${category.toUpperCase()} Error`,
    message,
    category,
    ...options,
  })
}

/**
 * Wraps a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    autoFix?: boolean
    interactive?: boolean
    exitOnError?: boolean
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      await handleError(error, options)
      throw error
    }
  }) as T
}