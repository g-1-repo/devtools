#!/usr/bin/env node

import { program } from 'commander';

// Simulate the CLI structure
const testProgram = program
  .name('workflow')
  .option('--no-interactive', 'Disable interactive prompts');

testProgram
  .command('release')
  .option('--non-interactive', 'Run in non-interactive mode (skip prompts)')
  .option('--dry-run', 'Show what would be done without executing')
  .action(async (options) => {
    const globalOptions = testProgram.opts();
    
    console.log('🔍 Global vs Command Options Debug:');
    console.log('Global options:', JSON.stringify(globalOptions, null, 2));
    console.log('Command options:', JSON.stringify(options, null, 2));
    
    // This is the issue - no mapping between global noInteractive and command nonInteractive
    console.log('\n🎯 Key values:');
    console.log('  globalOptions.noInteractive:', globalOptions.noInteractive);
    console.log('  options.nonInteractive:', options.nonInteractive);
    
    // The workflow expects nonInteractive, but global --no-interactive sets noInteractive
    console.log('\n🚨 Issue identified:');
    console.log('  - Global --no-interactive sets noInteractive: true');
    console.log('  - Workflow expects nonInteractive option');
    console.log('  - No mapping between these two options!');
    
    // Show what the fix should be
    const shouldBeNonInteractive = globalOptions.noInteractive || options.nonInteractive;
    console.log('\n✅ Fix: nonInteractive should be:', shouldBeNonInteractive);
  });

// Test different scenarios
console.log('=== Testing: release --dry-run ===');
testProgram.parse(['node', 'test', 'release', '--dry-run']);

console.log('\n=== Testing: --no-interactive release --dry-run ===');
testProgram.parse(['node', 'test', '--no-interactive', 'release', '--dry-run']);

console.log('\n=== Testing: release --non-interactive --dry-run ===');
testProgram.parse(['node', 'test', 'release', '--non-interactive', '--dry-run']);