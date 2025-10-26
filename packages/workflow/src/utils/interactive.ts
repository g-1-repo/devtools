/**
 * Interactive CLI utilities for user prompts and selections
 */

import { confirm, multiselect } from '@clack/prompts'
import chalk from 'chalk'
import {
  detectSmartPublishablePackages,
  formatPackageDetectionSummary,
} from './smart-package-detection.js'

/**
 * Prompts user to select packages to skip from npm publishing using checkboxes
 * Uses smart detection to only show packages that can actually be published
 * @returns Promise<string[]> - Array of selected package names to skip
 */
export async function promptSkipNpmPackages(): Promise<string[]> {
  console.log(chalk.blue('🔍 Analyzing packages and checking NPM registry...'))

  // Use smart detection to get packages that can actually be published
  const result = await detectSmartPublishablePackages(true)

  // Display summary of package detection
  console.log(`\n${formatPackageDetectionSummary(result)}`)

  if (result.publishable.length === 0) {
    console.log(chalk.yellow('\n⚠️  No packages available for publishing.'))
    return []
  }

  if (result.publishable.length === 1) {
    console.log(chalk.cyan(`\n📦 Only one package ready for publishing: ${result.publishable[0]}`))
    const skipSingle = await confirm({
      message: `Skip npm publishing for ${result.publishable[0]}?`,
      initialValue: false,
    })

    if (skipSingle === true) {
      return result.publishable
    } else if (skipSingle === false) {
      return []
    } else {
      // User cancelled
      console.warn('Interactive prompts cancelled. Please use --skip-npm-packages option.')
      return []
    }
  }

  // Multiple packages - use checkbox selection
  console.log(chalk.cyan(`\n📦 ${result.publishable.length} packages ready for publishing:`))

  const selectedPackages = await multiselect({
    message: 'Select packages to SKIP from npm publishing:',
    options: result.publishable.map((pkg) => ({
      label: pkg,
      value: pkg,
      hint: `Skip publishing ${pkg} to npm`,
    })),
    initialValues: [], // None selected by default
  })

  if (Array.isArray(selectedPackages)) {
    return selectedPackages
  } else {
    // User cancelled
    console.warn('Interactive prompts cancelled. Please use --skip-npm-packages option.')
    return []
  }
}

/**
 * Prompts user to confirm an action
 * @param message - The confirmation message
 * @param defaultValue - Default value if user just presses enter
 * @returns Promise<boolean> - True if confirmed
 */
export async function promptConfirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const confirmed = await confirm({
    message,
    initialValue: defaultValue,
  })

  if (typeof confirmed === 'boolean') {
    return confirmed
  } else {
    // User cancelled
    console.warn('Interactive prompts cancelled.')
    return defaultValue
  }
}
