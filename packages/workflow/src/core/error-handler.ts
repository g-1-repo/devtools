/**
 * Enhanced Error Handler - Structured Error Display and Recovery
 * 
 * This module provides comprehensive error handling with actionable suggestions,
 * structured display, and recovery mechanisms as specified in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import chalk from 'chalk'
import enquirer from 'enquirer'

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
      'Clone the repository if it exists remotely'
    ])
  }
  
  // NPM-related errors
  if (message.includes('npm ERR!') || message.includes('ENOENT') && message.includes('package.json')) {
    return new WorkflowError(message, 'npm', 'NPM_ERROR', [
      'Run `npm install` to install dependencies',
      'Check if package.json exists',
      'Verify npm registry access'
    ])
  }
  
  // Build errors
  if (message.includes('TypeScript error') || message.includes('Cannot find module')) {
    return new WorkflowError(message, 'build', 'BUILD_ERROR', [
      'Run `npm install` to install dependencies',
      'Check TypeScript configuration',
      'Verify import paths are correct'
    ])
  }
  
  // Network errors
  if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
    return new WorkflowError(message, 'network', 'NETWORK_ERROR', [
      'Check your internet connection',
      'Verify the URL or hostname',
      'Check firewall settings'
    ])
  }
  
  // Authentication errors
  if (message.includes('Permission denied') || message.includes('publickey')) {
    return new WorkflowError(message, 'auth', 'AUTH_ERROR', [
      'Check your SSH key configuration',
      'Verify authentication credentials',
      'Ensure proper permissions are set'
    ])
  }
  
  // Unknown errors
  return new WorkflowError(message, 'unknown', 'UNKNOWN_ERROR', [
    'Check the error message for specific details',
    'Review the documentation',
    'Contact support if the issue persists'
  ])
}

/**
 * Display structured error with formatting
 */
export function displayStructuredError(error: WorkflowError): void {
  console.log()
  console.log(chalk.red.bold('❌ Workflow Error'))
  console.log(chalk.red('─'.repeat(50)))
  console.log()
  
  console.log(chalk.red.bold('Error:'), error.message)
  
  if (error.code) {
    console.log(chalk.gray('Code:'), chalk.yellow(error.code))
  }
  
  console.log(chalk.gray('Category:'), chalk.blue(error.category))
  
  if (error.suggestions.length > 0) {
    console.log()
    console.log(chalk.yellow.bold('💡 Suggestions:'))
    error.suggestions.forEach((suggestion, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${suggestion}`))
    })
  }
  
  if (Object.keys(error.context).length > 0) {
    console.log()
    console.log(chalk.gray.bold('Context:'))
    Object.entries(error.context).forEach(([key, value]) => {
      console.log(chalk.gray(`  ${key}: ${value}`))
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
  const workflowError = error instanceof WorkflowError 
    ? error 
    : analyzeError(error as Error)
  
  displayStructuredError(workflowError)
  
  if (options.autoFix && options.autoFixFunctions?.[workflowError.category]) {
    console.log(chalk.blue('🔧 Attempting auto-fix...'))
    try {
      const result = await options.autoFixFunctions[workflowError.category]()
      if (result.success) {
        console.log(chalk.green('✅ Auto-fix successful'))
        return
      } else {
        console.log(chalk.red('❌ Auto-fix failed:', result.error))
      }
    } catch (fixError) {
      console.log(chalk.red('❌ Auto-fix error:', (fixError as Error).message))
    }
  }
  
  if (options.interactive && workflowError.suggestions.length > 0) {
    try {
      const { action } = await enquirer.prompt({
        type: 'select',
        name: 'action',
        message: 'How would you like to proceed?',
        choices: [
          { name: 'continue', message: 'Continue anyway' },
          { name: 'exit', message: 'Exit and fix manually' },
          ...workflowError.suggestions.map((suggestion, index) => ({
            name: `suggestion-${index}`,
            message: suggestion
          }))
        ]
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
  
  return new WorkflowError(
    error.message,
    category || 'unknown',
    code,
    [],
    { originalError: error }
  )
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