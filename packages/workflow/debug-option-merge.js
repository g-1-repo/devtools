#!/usr/bin/env node

import { program } from 'commander'

// Set up the same CLI structure as the real CLI
program
  .name('workflow')
  .option('--no-interactive', 'Disable interactive prompts')

program
  .command('release')
  .option('--non-interactive', 'Run in non-interactive mode (skip prompts)')
  .option('--dry-run', 'Show what would be done without executing')
  .action(async (options) => {
    const globalOptions = program.opts()
    
    console.log('🔍 Option merging debug:')
    console.log('Global options:', JSON.stringify(globalOptions, null, 2))
    console.log('Command options:', JSON.stringify(options, null, 2))
    console.log('Merged options:', JSON.stringify({ ...globalOptions, ...options }, null, 2))
    
    // Test the specific scenario
    const merged = { ...globalOptions, ...options }
    console.log('\n🎯 Key values:')
    console.log('  interactive:', merged.interactive)
    console.log('  noInteractive:', merged.noInteractive) 
    console.log('  nonInteractive:', merged.nonInteractive)
    console.log('  dryRun:', merged.dryRun)
    
    // Test the skip condition
    const shouldSkip = merged.type || (merged.nonInteractive && !merged.dryRun)
    console.log('\n🚫 Skip condition result:', shouldSkip)
  })

// Parse the command line arguments
program.parse()