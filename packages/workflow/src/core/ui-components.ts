/**
 * Modern UI Components for G1 Workflow CLI
 *
 * Provides consistent, modern UI components with improved visual hierarchy
 * and professional styling for terminal interfaces.
 */

import { log, note } from '@clack/prompts'
import chalk from 'chalk'
import { G1_ICONS } from './error-formatter.js'

// Re-export G1_ICONS for convenience
export { G1_ICONS } from './error-formatter.js'

/**
 * Modern box styles for different contexts
 */
export const BOX_STYLES = {
  info: {
    border: chalk.blue('─'),
    corner: chalk.blue('┌┐└┘'),
    title: chalk.blue.bold,
    content: chalk.blue,
  },
  success: {
    border: chalk.green('─'),
    corner: chalk.green('┌┐└┘'),
    title: chalk.green.bold,
    content: chalk.green,
  },
  warning: {
    border: chalk.yellow('─'),
    corner: chalk.yellow('┌┐└┘'),
    title: chalk.yellow.bold,
    content: chalk.yellow,
  },
  error: {
    border: chalk.red('─'),
    corner: chalk.red('┌┐└┘'),
    title: chalk.red.bold,
    content: chalk.red,
  },
  neutral: {
    border: chalk.gray('─'),
    corner: chalk.gray('┌┐└┘'),
    title: chalk.white.bold,
    content: chalk.gray,
  },
} as const

/**
 * Create a modern styled box with improved visual hierarchy
 */
export function createStyledBox(
  title: string,
  content: string | string[],
  style: keyof typeof BOX_STYLES = 'neutral',
  icon?: string
): void {
  const boxStyle = BOX_STYLES[style]
  const lines = Array.isArray(content) ? content : [content]
  const maxWidth = Math.max(title.length, ...lines.map((line) => line.length)) + 4

  const topBorder = boxStyle.corner[0] + boxStyle.border.repeat(maxWidth - 2) + boxStyle.corner[1]
  const bottomBorder =
    boxStyle.corner[2] + boxStyle.border.repeat(maxWidth - 2) + boxStyle.corner[3]

  console.log()
  console.log(topBorder)

  // Title with icon
  const titleIcon = icon || ''
  const titleText = titleIcon ? `${titleIcon} ${title}` : title
  console.log(
    `${chalk.gray('│')} ${boxStyle.title(titleText.padEnd(maxWidth - 4))} ${chalk.gray('│')}`
  )

  if (lines.length > 0) {
    console.log(`${chalk.gray('│')} ${' '.repeat(maxWidth - 4)} ${chalk.gray('│')}`)

    lines.forEach((line) => {
      console.log(
        `${chalk.gray('│')} ${boxStyle.content(line.padEnd(maxWidth - 4))} ${chalk.gray('│')}`
      )
    })
  }

  console.log(bottomBorder)
  console.log()
}

/**
 * Create a status badge with consistent styling
 */
export function createStatusBadge(
  status: 'pending' | 'running' | 'success' | 'error' | 'warning' | 'skipped',
  text?: string
): string {
  const badges = {
    pending: chalk.gray(`${G1_ICONS.info} PENDING`),
    running: chalk.blue(`${G1_ICONS.gear} RUNNING`),
    success: chalk.green(`${G1_ICONS.success} SUCCESS`),
    error: chalk.red(`${G1_ICONS.error} ERROR`),
    warning: chalk.yellow(`${G1_ICONS.warning} WARNING`),
    skipped: chalk.gray(`${G1_ICONS.info} SKIPPED`),
  }

  const badge = badges[status]
  return text ? `${badge} ${text}` : badge
}

/**
 * Create a modern progress indicator
 */
export function createProgressIndicator(current: number, total: number, title?: string): string {
  const percentage = Math.round((current / total) * 100)
  const filled = Math.round((current / total) * 20)
  const empty = 20 - filled

  const progressBar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
  const counter = chalk.gray(`${current}/${total}`)
  const percent = chalk.white(`${percentage}%`)

  const titleText = title ? `${title} ` : ''
  return `${titleText}[${progressBar}] ${counter} ${percent}`
}

/**
 * Create a timeline step indicator
 */
export function createTimelineStep(
  step: number,
  title: string,
  status: 'pending' | 'current' | 'completed' | 'error' = 'pending',
  description?: string
): void {
  const icons = {
    pending: chalk.gray('○'),
    current: chalk.blue('●'),
    completed: chalk.green('●'),
    error: chalk.red('●'),
  }

  const colors = {
    pending: chalk.gray,
    current: chalk.blue,
    completed: chalk.green,
    error: chalk.red,
  }

  const icon = icons[status]
  const color = colors[status]
  const stepNumber = chalk.gray(`${step}.`)

  console.log(`${icon} ${stepNumber} ${color.bold(title)}`)

  if (description) {
    console.log(`   ${chalk.gray(description)}`)
  }
}

/**
 * Create a section header with improved visual hierarchy
 */
export function createSectionHeader(title: string, subtitle?: string, icon?: string): void {
  console.log()

  const headerIcon = icon || G1_ICONS.workflow
  const headerTitle = `${headerIcon} ${chalk.bold.white(title)}`

  console.log(headerTitle)

  if (subtitle) {
    console.log(`   ${chalk.gray(subtitle)}`)
  }

  console.log(chalk.gray('─'.repeat(Math.max(title.length + 4, 50))))
  console.log()
}

/**
 * Create a summary table with improved formatting
 */
export function createSummaryTable(
  title: string,
  items: Array<{ label: string; value: string; status?: 'success' | 'error' | 'warning' | 'info' }>,
  icon?: string
): void {
  createSectionHeader(title, undefined, icon)

  const maxLabelWidth = Math.max(...items.map((item) => item.label.length))

  items.forEach((item) => {
    const label = item.label.padEnd(maxLabelWidth)
    const statusIcon = item.status
      ? item.status === 'success'
        ? G1_ICONS.success
        : item.status === 'error'
          ? G1_ICONS.error
          : item.status === 'warning'
            ? G1_ICONS.warning
            : G1_ICONS.info
      : ''

    const statusColor = item.status
      ? item.status === 'success'
        ? chalk.green
        : item.status === 'error'
          ? chalk.red
          : item.status === 'warning'
            ? chalk.yellow
            : chalk.blue
      : chalk.white

    console.log(`  ${chalk.gray(label)} ${statusIcon} ${statusColor(item.value)}`)
  })

  console.log()
}

/**
 * Enhanced logging functions with consistent styling
 */
export const modernLog = {
  step: (message: string, icon?: string) => {
    const stepIcon = icon || G1_ICONS.run
    log.step(`${stepIcon} ${message}`)
  },

  info: (message: string, icon?: string) => {
    const infoIcon = icon || G1_ICONS.info
    log.info(`${infoIcon} ${message}`)
  },

  success: (message: string, icon?: string) => {
    const successIcon = icon || G1_ICONS.success
    log.success(`${successIcon} ${message}`)
  },

  warning: (message: string, icon?: string) => {
    const warningIcon = icon || G1_ICONS.warning
    log.warn(`${warningIcon} ${message}`)
  },

  error: (message: string, icon?: string) => {
    const errorIcon = icon || G1_ICONS.error
    log.error(`${errorIcon} ${message}`)
  },

  note: (message: string, title?: string, icon?: string) => {
    const noteIcon = icon || G1_ICONS.info
    const noteTitle = title ? `${noteIcon} ${title}` : undefined
    note(message, noteTitle)
  },
}
