#!/usr/bin/env node

/**
 * Interactive Demo for G1 Workflow CLI - NPM Skip Functionality
 *
 * This script allows you to test different npm skip scenarios with the CLI.
 * All commands use --dry-run and --non-interactive for safety.
 */

const { spawn } = require('node:child_process')
const readline = require('node:readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// ANSI color codes
const colors = {
  cyan: '\x1B[36m',
  yellow: '\x1B[33m',
  green: '\x1B[32m',
  red: '\x1B[31m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  white: '\x1B[37m',
  gray: '\x1B[90m',
  bold: '\x1B[1m',
  reset: '\x1B[0m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function showMenu() {
  console.log(
    `\n${colorize('╔══════════════════════════════════════════════════════════╗', 'cyan')}`
  )
  console.log(colorize('║           G1 WORKFLOW CLI - INTERACTIVE DEMO             ║', 'cyan'))
  console.log(colorize('║              NPM Skip Functionality Test                 ║', 'cyan'))
  console.log(colorize('╚══════════════════════════════════════════════════════════╝', 'cyan'))

  console.log(`\n${colorize('Available Test Scenarios:', 'bold')}`)
  console.log(colorize('  1. Normal release (no npm skipping)', 'white'))
  console.log(colorize('  2. Skip ALL npm publishing', 'yellow'))
  console.log(colorize('  3. Interactive package selection (CHECKBOXES)', 'green'))
  console.log(colorize('  4. Skip specific packages (comma-separated)', 'blue'))
  console.log(colorize('  5. Show CLI help', 'magenta'))
  console.log(colorize('  6. Exit', 'red'))

  console.log(`\n${colorize('Instructions:', 'gray')}`)
  console.log(colorize('• All commands use --dry-run (no actual changes)', 'gray'))
  console.log(colorize('• All commands use the built CLI (node dist/cli.js)', 'gray'))
  console.log(colorize('• Option 3 will show interactive checkboxes for package selection', 'gray'))

  console.log(`\n${colorize('Suggested Test Flow:', 'yellow')}`)
  console.log(colorize('1. Try option 5 to see available CLI options', 'yellow'))
  console.log(colorize('2. Try option 3 to test the new checkbox interface', 'yellow'))
  console.log(colorize('3. Compare with option 4 (old comma-separated method)', 'yellow'))
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(colorize(`\n🚀 Executing: ${command} ${args.join(' ')}`, 'cyan'))
    console.log(colorize('─'.repeat(60), 'gray'))

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })

    child.on('close', (code) => {
      console.log(colorize('─'.repeat(60), 'gray'))
      if (code === 0) {
        console.log(colorize('✅ Command completed successfully', 'green'))
      } else {
        console.log(colorize(`❌ Command failed with exit code ${code}`, 'red'))
      }
      resolve(code)
    })

    child.on('error', (error) => {
      console.error(colorize(`❌ Error: ${error.message}`, 'red'))
      reject(error)
    })
  })
}

async function handleChoice(choice) {
  switch (choice) {
    case '1':
      console.log(colorize('\n📦 Testing: Normal release (no npm skipping)', 'white'))
      await runCommand('node', ['dist/cli.js', 'release', '--dry-run', '--non-interactive'])
      break

    case '2':
      console.log(colorize('\n🚫 Testing: Skip ALL npm publishing', 'yellow'))
      await runCommand('node', [
        'dist/cli.js',
        'release',
        '--dry-run',
        '--non-interactive',
        '--skip-npm',
      ])
      break

    case '3':
      console.log(colorize('\n✅ Testing: Interactive package selection (CHECKBOXES)', 'green'))
      console.log(colorize('This will show checkboxes for selecting packages to skip!', 'green'))
      await runCommand('node', ['dist/cli.js', 'release', '--dry-run', '--skip-npm-packages'])
      break

    case '4':
      console.log(colorize('\n📝 Testing: Skip specific packages (comma-separated)', 'blue'))
      console.log(colorize('Example: Skipping @g-1/util and @g-1/workflow packages', 'blue'))
      await runCommand('node', [
        'dist/cli.js',
        'release',
        '--dry-run',
        '--non-interactive',
        '--skip-npm-packages',
        '@g-1/util,@g-1/workflow',
      ])
      break

    case '5':
      console.log(colorize('\n📖 Showing CLI help', 'magenta'))
      await runCommand('node', ['dist/cli.js', 'release', '--help'])
      break

    case '6':
      console.log(colorize('\n👋 Goodbye!', 'cyan'))
      rl.close()
      return false

    default:
      console.log(colorize('\n❌ Invalid choice. Please select 1-6.', 'red'))
  }

  return true
}

async function main() {
  showMenu()

  while (true) {
    const choice = await new Promise((resolve) => {
      rl.question(colorize('\nSelect an option (1-6): ', 'bold'), resolve)
    })

    const shouldContinue = await handleChoice(choice.trim())
    if (!shouldContinue) break

    // Wait for user to press enter before showing menu again
    await new Promise((resolve) => {
      rl.question(colorize('\nPress Enter to continue...', 'gray'), resolve)
    })

    showMenu()
  }
}

main().catch(console.error)
