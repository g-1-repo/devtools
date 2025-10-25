/**
 * Interactive CLI utilities for user prompts and selections
 */

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
  let enquirer: any
  try {
    const enquirerModule = await import('enquirer')
    enquirer = enquirerModule.default || enquirerModule
  } catch {
    console.warn('Interactive prompts not available. Please use --skip-npm-packages option.')
    return []
  }

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
    const { skipSingle } = await enquirer.prompt({
      type: 'confirm',
      name: 'skipSingle',
      message: `Skip npm publishing for ${result.publishable[0]}?`,
      initial: false,
    })
    return skipSingle ? result.publishable : []
  }

  // Multiple packages - use checkbox selection
  console.log(chalk.cyan(`\n📦 ${result.publishable.length} packages ready for publishing:`))

  const { selectedPackages } = await enquirer.prompt({
    type: 'multiselect',
    name: 'selectedPackages',
    message: 'Select packages to SKIP from npm publishing:',
    choices: result.publishable.map((pkg) => ({
      name: pkg,
      value: pkg,
      hint: `Skip publishing ${pkg} to npm`,
    })),
    initial: [], // None selected by default
    instructions: false,
    footer: () => chalk.dim('(Use ↑/↓ to navigate, space to select, enter to confirm)'),
  })

  return selectedPackages || []
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
  let enquirer: any
  try {
    const enquirerModule = await import('enquirer')
    enquirer = enquirerModule.default || enquirerModule
  } catch {
    console.warn('Interactive prompts not available.')
    return defaultValue
  }

  const { confirmed } = await enquirer.prompt({
    type: 'confirm',
    name: 'confirmed',
    message,
    initial: defaultValue,
  })

  return confirmed
}
