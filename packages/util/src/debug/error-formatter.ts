/**
 * Error Formatting Utility - Enhanced error styling for failures
 */

import chalk, { Chalk } from 'chalk'

const noColor = typeof process !== 'undefined' && typeof process.env !== 'undefined' && (process.env.NO_COLOR !== undefined || process.env.FORCE_COLOR === '0')
const ch = new Chalk({ level: noColor ? 0 : chalk.level })

export interface FormattedError {
  message: string
  type: 'critical' | 'warning' | 'info'
  context?: string | undefined
}

export class ErrorFormatter {
  /**
   * Format error messages with red styling and red X
   */
  static formatError(error: Error | string, type: 'critical' | 'warning' | 'info' = 'critical'): FormattedError {
    const message = error instanceof Error ? error.message : error

    let formattedMessage: string
    let icon: string

    switch (type) {
      case 'critical':
        icon = ch.red('✗')
        formattedMessage = ch.red.bold(message)
        break
      case 'warning':
        icon = ch.yellow('⚠️')
        formattedMessage = ch.yellow(message)
        break
      case 'info':
        icon = ch.blue('ℹ')
        formattedMessage = ch.blue(message)
        break
    }

    return {
      message: `${icon} ${formattedMessage}`,
      type,
      context: error instanceof Error ? error.stack : undefined,
    }
  }

  /**
   * Format step failures with enhanced visibility
   */
  static formatWorkflowFailure(stepTitle: string, error: Error | string): string {
    const formattedError = this.formatError(error, 'critical')
    return `${ch.red('✗')} ${ch.red.bold(stepTitle)} - ${formattedError.message.replace(/^✗\s/, '')}`
  }

  /**
   * Format publishing workflow failures specifically
   */
  static formatPublishingFailure(error: Error | string): string {
    const formattedError = this.formatError(error, 'critical')
    return `${ch.red('✗')} ${ch.red.bold('Publishing workflow failed')} - ${formattedError.message.replace(/^✗\s/, '')}`
  }

  /**
   * Create a red error box for critical failures
   */
  static createErrorBox(title: string, message: string, suggestions?: string[]): string {
    const width = 68
    const border = '═'.repeat(width - 2)

    let output = '\n'
    output += ch.red(`╔${border}╗\n`)
    output += ch.red(`║${title.padStart((width + title.length) / 2).padEnd(width - 2)}║\n`)
    output += ch.red(`╚${border}╝\n`)
    output += '\n'
    output += `${ch.red.bold(message)}\n`

    if (suggestions && suggestions.length > 0) {
      output += `\n${ch.yellow.bold('Suggestions:\n')}`
      suggestions.forEach((suggestion) => {
        output += ch.yellow(`  • ${suggestion}\n`)
      })
    }

    output += '\n'
    return output
  }

  /**
   * Format error logs for display
   */
  static formatErrorLogs(logs: string): string {
    return logs
      .split('\n')
      .map((line) => {
        if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
          return ch.red(line)
        }
        if (line.includes('warn') || line.includes('Warning') || line.includes('WARN')) {
          return ch.yellow(line)
        }
        return ch.gray(line)
      })
      .join('\n')
  }
}
