/**
 * Enhanced Error Handler - Structured Error Display and Recovery
 *
 * This module provides comprehensive error handling with actionable suggestions,
 * structured display, and recovery mechanisms as specified in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import { select } from '@clack/prompts'

/**
 * Error categories for better organization
 */
export type ErrorCategory = 'git' | 'npm' | 'build' | 'network' | 'auth' | 'unknown'

/**
 * Enhanced error class with structured information
 */
export class WorkflowError extends Error {
  public readonly category: ErrorCategory
  public readonly code?: string
  public readonly suggestions: string[]
  public readonly context: Record<string, unknown>

  constructor(
    message: string,
    category: ErrorCategory = 'unknown',
    code?: string,
    suggestions: string[] = [],
    context: Record<string, unknown> = {}
  ) {
    super(message)
    this.name = 'WorkflowError'
    this.category = category
    this.code = code
    this.suggestions = suggestions
    this.context = context
  }
}

/**
 * Analyze error and categorize it with suggestions
 */
export function analyzeError(error: Error | string): WorkflowError {
  const message = typeof error === 'string' ? error : error.message

  // Git-related errors
  if (message.includes('not a git repository') || message.includes('fatal: not a git repository')) {
    return new WorkflowError(message, 'git', 'GIT_NOT_REPOSITORY', [
      'Initialize a Git repository with `git init`',
      'Navigate to the correct project directory',
      'Clone the repository if it exists remotely',
    ])
  }

  // Git repository structure issues (monorepo conflicts)
  if (message.includes('pathspec') && message.includes('did not match any files')) {
    return new WorkflowError(message, 'git', 'GIT_PATHSPEC_ERROR', [
      'You may be running the command from the wrong directory',
      'In a monorepo, run workflow commands from the repository root',
      'Check if you have nested .git directories causing conflicts',
      'Use `git status` to verify your current repository context',
    ])
  }

  // Nested git repository detection
  if (
    message.includes('nested git repository') ||
    message.includes('conflicting git repositories')
  ) {
    return new WorkflowError(message, 'git', 'GIT_NESTED_REPO', [
      'Remove the nested .git directory to resolve conflicts',
      'Run workflow commands from the monorepo root directory',
      'Use --auto-fix to automatically resolve nested repository issues',
      'Ensure only the monorepo root has a .git directory',
    ])
  }

  // Git working directory context issues
  if (message.includes('Invalid git context') || message.includes('no repository found')) {
    return new WorkflowError(message, 'git', 'GIT_INVALID_CONTEXT', [
      'Ensure you are in a valid Git repository',
      'Check if the .git directory exists in the current or parent directories',
      'Initialize a Git repository if needed with `git init`',
      'Verify the repository structure is correct for monorepo setups',
    ])
  }

  // NPM-related errors
  if (
    message.includes('npm ERR!') ||
    (message.includes('ENOENT') && message.includes('package.json'))
  ) {
    return new WorkflowError(message, 'npm', 'NPM_ERROR', [
      'Run `npm install` to install dependencies',
      'Check if package.json exists',
      'Verify npm registry access',
    ])
  }

  // Build errors
  if (message.includes('TypeScript error') || message.includes('Cannot find module')) {
    return new WorkflowError(message, 'build', 'BUILD_ERROR', [
      'Run `npm install` to install dependencies',
      'Check TypeScript configuration',
      'Verify import paths are correct',
    ])
  }

  // Network errors
  if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
    return new WorkflowError(message, 'network', 'NETWORK_ERROR', [
      'Check your internet connection',
      'Verify the URL or hostname',
      'Check firewall settings',
    ])
  }

  // Authentication errors
  if (message.includes('Permission denied') || message.includes('publickey')) {
    return new WorkflowError(message, 'auth', 'AUTH_ERROR', [
      'Check your SSH key configuration',
      'Verify authentication credentials',
      'Ensure proper permissions are set',
    ])
  }

  // Unknown errors
  return new WorkflowError(message, 'unknown', 'UNKNOWN_ERROR', [
    'Check the error message for specific details',
    'Review the documentation',
    'Contact support if the issue persists',
  ])
}

/**
 * Display structured error with formatting
 */
export function displayStructuredError(error: WorkflowError): void {
  console.log()
  console.log('\x1b[31m\x1b[1mWorkflow Error\x1b[0m')
  console.log('\x1b[31m' + '─'.repeat(50) + '\x1b[0m')
  console.log()

  console.log('\x1b[31m\x1b[1mError:\x1b[0m', error.message)

  if (error.code) {
    console.log('\x1b[90mCode:\x1b[0m', '\x1b[33m' + error.code + '\x1b[0m')
  }

  console.log('\x1b[90mCategory:\x1b[0m', '\x1b[34m' + error.category + '\x1b[0m')

  if (error.suggestions.length > 0) {
    console.log()
    console.log('\x1b[33m\x1b[1mSuggestions:\x1b[0m')
    error.suggestions.forEach((suggestion, index) => {
      console.log('\x1b[33m' + `  ${index + 1}. ${suggestion}` + '\x1b[0m')
    })
  }

  if (Object.keys(error.context).length > 0) {
    console.log()
    console.log('\x1b[90m\x1b[1mContext:\x1b[0m')
    Object.entries(error.context).forEach(([key, value]) => {
      console.log('\x1b[90m' + `  ${key}: ${value}` + '\x1b[0m')
    })
  }

  console.log()
}

/**
 * Handle error with auto-fix and interactive options
 */
export async function handleError(
  error: Error | unknown,
  options: {
    autoFix?: boolean
    interactive?: boolean
    context?: string
    autoFixFunctions?: Record<string, () => Promise<{ success: boolean; error?: string }>>
  } = {}
): Promise<void> {
  const workflowError = error instanceof WorkflowError ? error : analyzeError(error as Error)

  displayStructuredError(workflowError)

  if (options.autoFix && options.autoFixFunctions?.[workflowError.category]) {
    console.log('\x1b[34mAttempting auto-fix...\x1b[0m')
    try {
      const autoFixFunction = options.autoFixFunctions[workflowError.category]
      if (autoFixFunction) {
        const result = await autoFixFunction()
        if (result.success) {
          console.log('\x1b[32mAuto-fix successful\x1b[0m')
          return
        } else {
          console.log('\x1b[31mAuto-fix failed:\x1b[0m', result.error)
        }
      }
    } catch (fixError) {
      console.log('\x1b[31mAuto-fix error:\x1b[0m', (fixError as Error).message)
    }
  }

  if (options.interactive && workflowError.suggestions.length > 0) {
    try {
      const action = await select({
        message: 'How would you like to proceed?',
        options: [
          { label: 'Continue anyway', value: 'continue' },
          { label: 'Exit and fix manually', value: 'exit' },
          ...workflowError.suggestions.map((suggestion, index) => ({
            label: suggestion,
            value: `suggestion-${index}`,
          })),
        ],
      })

      if (action === 'exit') {
        process.exit(1)
      }
    } catch {
      // User cancelled or error in prompt
      process.exit(1)
    }
  }
}

/**
 * Create a WorkflowError from a regular error
 */
export function createWorkflowError(
  error: Error | WorkflowError,
  category?: ErrorCategory,
  code?: string
): WorkflowError {
  if (error instanceof WorkflowError) {
    return error
  }

  return new WorkflowError(error.message, category || 'unknown', code, [], { originalError: error })
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    autoFix?: boolean
    interactive?: boolean
    context?: string
  } = {}
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      await handleError(error, options)
      throw error
    }
  }) as T
}
