/**
 * G1 Workflow Custom Icons Demo
 * 
 * This file demonstrates all available custom icons and their usage
 * with @clack/prompts log.message() function.
 */

import { intro, outro, note } from '@clack/prompts'
import { G1_ICONS, g1Log } from '../src/core/error-formatter.js'

export async function demonstrateCustomIcons() {
  // G1 Branded intro
  intro(`${G1_ICONS.g1} G1 Workflow Custom Icons Demo`)

  // Status Icons
  note('Status Icons', 'Category 1')
  g1Log.success('Operation completed successfully')
  g1Log.error('Critical error occurred')
  g1Log.warning('Warning: potential issue detected')
  g1Log.info('Information message')

  // Process Icons
  note('Process Icons', 'Category 2')
  g1Log.processing('Processing your request...')
  g1Log.fixing('Auto-fixing detected issues...')
  g1Log.searching('Searching for solutions...')
  g1Log.testing('Running test suite...')

  // G1 Workflow Specific Icons
  note('G1 Workflow Specific', 'Category 3')
  g1Log.workflow('Workflow engine started')
  g1Log.release('Release pipeline initiated')
  g1Log.build('Building project artifacts')
  g1Log.deploy('Deploying to production')

  // Special G1 Branding
  note('G1 Branding', 'Category 4')
  g1Log.g1Brand('Powered by G1 Workflow Engine')

  // Raw Icons (for use in prompts and notes)
  note(
    `${G1_ICONS.rocket} Rocket: For launches and deployments
${G1_ICONS.gear} Gear: For processing and configuration
${G1_ICONS.lightning} Lightning: For fast operations
${G1_ICONS.fire} Fire: For critical alerts
${G1_ICONS.search} Search: For discovery operations
${G1_ICONS.fix} Fix: For repair operations`,
    'Raw Icons for Prompts'
  )

  // Success outro
  outro(`${G1_ICONS.success} Custom Icons Demo Complete!`)
}

// Usage Examples for Integration
export const USAGE_EXAMPLES = {
  // In CLI prompts
  confirmPrompt: `${G1_ICONS.deploy} Deploy to production?`,
  
  // In notes and messages
  dryRunNote: `${G1_ICONS.info} DRY RUN MODE - No changes will be made`,
  
  // In error messages
  errorSuggestion: `${G1_ICONS.fix} Run npm install to fix dependencies`,
  
  // In status updates
  statusMessage: `${G1_ICONS.workflow} Workflow Status: Active`,
  
  // In success messages
  completionMessage: `${G1_ICONS.success} All tasks completed successfully!`
}

// Color-coded icon sets for different contexts
export const ICON_CONTEXTS = {
  // Development workflow
  dev: {
    start: G1_ICONS.rocket,
    build: G1_ICONS.build,
    test: G1_ICONS.test,
    deploy: G1_ICONS.deploy
  },
  
  // Error handling
  errors: {
    critical: G1_ICONS.error,
    warning: G1_ICONS.warning,
    fix: G1_ICONS.fix,
    search: G1_ICONS.search
  },
  
  // Status reporting
  status: {
    success: G1_ICONS.success,
    info: G1_ICONS.info,
    processing: G1_ICONS.gear,
    brand: G1_ICONS.g1
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCustomIcons()
}