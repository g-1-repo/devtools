/**
 * Error Formatting Utility - Enhanced error styling for workflow failures
 */

import { log, note, outro } from '@clack/prompts'
import chalk from 'chalk'

export interface FormattedError {
  message: string
  type: 'critical' | 'warning' | 'info'
  context?: string
}

// Custom G1 Workflow Icons
export const G1_ICONS = {
  // Status Icons
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),

  // Process Icons
  rocket: chalk.magenta('🚀'),
  gear: chalk.cyan('⚙'),
  lightning: chalk.yellow('⚡'),
  fire: chalk.red('🔥'),

  // G1 Branded Icons
  g1: chalk.bold.blue('G1'),
  workflow: chalk.cyan('⟲'),
  release: chalk.green('📦'),
  build: chalk.blue('🔨'),

  // Action Icons
  fix: chalk.green('🔧'),
  search: chalk.blue('🔍'),
  deploy: chalk.magenta('🌐'),
  test: chalk.yellow('🧪'),

  // Monorepo Icons
  list: chalk.cyan('📋'),
  graph: chalk.magenta('🕸'),
  check: chalk.green('✅'),
  run: chalk.blue('▶'),

  // AI Icons
  ai: chalk.magenta('🤖'),

  // Framework Icons
  optimize: chalk.yellow('⚡'),
  health: chalk.green('💚'),
  monitor: chalk.blue('📊'),
} as const

/**
 * Enhanced logging with custom G1 icons
 */
export const g1Log = {
  success: (message: string) => log.message(message, { symbol: G1_ICONS.success }),
  error: (message: string) => log.message(message, { symbol: G1_ICONS.error }),
  warning: (message: string) => log.message(message, { symbol: G1_ICONS.warning }),
  info: (message: string) => log.message(message, { symbol: G1_ICONS.info }),

  // G1 Workflow specific messages
  workflow: (message: string) => log.message(message, { symbol: G1_ICONS.workflow }),
  release: (message: string) => log.message(message, { symbol: G1_ICONS.release }),
  build: (message: string) => log.message(message, { symbol: G1_ICONS.build }),
  deploy: (message: string) => log.message(message, { symbol: G1_ICONS.deploy }),

  // Process indicators
  processing: (message: string) => log.message(message, { symbol: G1_ICONS.gear }),
  fixing: (message: string) => log.message(message, { symbol: G1_ICONS.fix }),
  searching: (message: string) => log.message(message, { symbol: G1_ICONS.search }),
  testing: (message: string) => log.message(message, { symbol: G1_ICONS.test }),

  // Special branded message
  g1Brand: (message: string) => log.message(message, { symbol: G1_ICONS.g1 }),
}

/**
 * Format error messages using @clack/prompts
 */
export function formatError(
  error: Error | string,
  type: 'critical' | 'warning' | 'info' = 'critical'
): FormattedError {
  const message = error instanceof Error ? error.message : error

  return {
    message,
    type,
    context: error instanceof Error ? error.stack : undefined,
  }
}

/**
 * Display formatted error using @clack/prompts with custom icons
 */
export function displayError(error: FormattedError): void {
  switch (error.type) {
    case 'critical':
      g1Log.error(error.message)
      break
    case 'warning':
      g1Log.warning(error.message)
      break
    case 'info':
      g1Log.info(error.message)
      break
  }
}

/**
 * Format workflow step failures with enhanced visibility
 */
export function formatWorkflowFailure(stepTitle: string, error: Error | string): string {
  const message = error instanceof Error ? error.message : error
  return `${stepTitle}: ${message}`
}

/**
 * Format publishing failures
 */
export function formatPublishingFailure(error: Error | string): string {
  return error instanceof Error ? error.message : error
}

/**
 * Display error box using @clack/prompts with enhanced styling
 */
export function createErrorBox(title: string, message: string, suggestions?: string[]): void {
  outro(title)
  g1Log.error(message)

  if (suggestions && suggestions.length > 0) {
    note(suggestions.map((s) => `${G1_ICONS.fix} ${s}`).join('\n'), 'Suggestions')
  }
}

/**
 * Format error logs for display
 */
export function formatErrorLogs(logs: string): string {
  return logs
}

/**
 * Display error logs using @clack/prompts with custom icons
 */
export function displayErrorLogs(logs: string): void {
  const lines = logs.split('\n')
  lines.forEach((line) => {
    if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
      g1Log.error(line)
    } else if (line.includes('warn') || line.includes('Warning') || line.includes('WARN')) {
      g1Log.warning(line)
    } else {
      g1Log.info(line)
    }
  })
}
