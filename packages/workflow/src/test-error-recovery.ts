/**
 * Test Error Recovery - Demonstrates automated error fixing in action
 */

import * as fs from 'node:fs/promises'
import process from 'node:process'
import { intro, log } from '@clack/prompts'
import chalk from 'chalk'
import { execa } from 'execa'
import { ErrorRecoveryService } from './core/error-recovery.js'
import { createTaskEngine } from './core/task-engine.js'
import type { WorkflowStep } from './types/index.js'

export async function testErrorRecovery(): Promise<void> {
  intro('Error Recovery Test Suite')

  const testFile = './test-lint-error.ts'

  try {
    // Step 1: Create a test file with linting errors
    log.info('Creating test file with linting errors...')
    await createTestFileWithLintErrors(testFile)

    // Step 2: Create a workflow that will fail due to linting
    const testWorkflow: WorkflowStep[] = [
      {
        title: 'Test Linting (should fail)',
        task: async (ctx, helpers) => {
          helpers.setOutput('Running lint on test file...')

          try {
            await execa('bun', ['run', 'lint'], { stdio: 'pipe' })
            helpers.setTitle('Test Linting - Unexpected success')
          } catch (error) {
            helpers.setTitle('Test Linting - Expected failure')
            throw new Error(
              `Linting failed: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        },
      },
    ]

    // Step 3: Run the workflow with error recovery enabled
    console.error(chalk.blue('Running workflow with automated error recovery...\\n'))

    const taskEngine = createTaskEngine({
      autoRecovery: true,
      exitOnError: false,
    })

    try {
      await taskEngine.execute(testWorkflow, {})
    } catch {
      console.error(
        chalk.green(
          '\\n✅ Error recovery completed. The workflow failed as expected, but recovery was triggered.'
        )
      )
    }
  } finally {
    // Clean up test file
    try {
      await fs.unlink(testFile)
      console.error(chalk.gray('\\n🧹 Test file cleaned up'))
    } catch {
      // File might not exist, ignore
    }
  }
}

export async function testErrorRecoveryDirectly(): Promise<void> {
  intro('Direct Error Recovery Test')

  const recoveryService = ErrorRecoveryService.getInstance()

  // Test different error types
  const testErrors = [
    new Error('ESLint found 5 errors. Run eslint --fix to fix them.'),
    new Error('TypeScript compilation failed with 3 errors'),
    new Error('Build failed: Cannot resolve module ./missing'),
    new Error('401 Unauthorized: Invalid npm token'),
    new Error('Unknown error occurred'),
  ]

  for (const error of testErrors) {
    console.error(chalk.blue(`\\nTesting error: ${error.message.slice(0, 50)}...`))

    try {
      await recoveryService.executeRecovery(error)
      console.error(chalk.green('Recovery workflow completed'))
    } catch (recoveryError) {
      console.error(
        chalk.red(
          `Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`
        )
      )
    }

    console.error(chalk.gray('─'.repeat(68)))
  }
}

async function createTestFileWithLintErrors(filePath: string): Promise<void> {
  const badCode = `// Test file with intentional linting errors
const unusedVariable = "this will trigger no-unused-vars"

function badFormatting(){
  const mixed=1+2*3; // This will trigger operator precedence warnings
  
  // Missing semicolon and other issues
  const obj={a:1,b:2}
  console.log("Hello world")
  
  return mixed + obj.a
}

export default badFormatting
`

  await fs.writeFile(filePath, badCode)
  console.error(chalk.gray(`  Created ${filePath} with linting errors`))
}

// Command-line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]

  ;(async () => {
    try {
      if (command === 'direct') {
        await testErrorRecoveryDirectly()
      } else {
        await testErrorRecovery()
      }
    } catch (error) {
      console.error(chalk.red('Test failed:'), error)
      process.exit(1)
    }
  })()
}
