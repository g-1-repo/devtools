#!/usr/bin/env node

/**
 * Demo script to show improved progress feedback during test execution
 * This simulates the release workflow test execution with file-level progress
 */

import { createTaskEngine } from '@g-1/util/workflow'
import { execa } from 'execa'
import chalk from 'chalk'

console.log(chalk.cyan('🧪 Testing Improved Progress Feedback\n'))

const engine = createTaskEngine({ 
  concurrent: false, 
  exitOnError: false, 
  showTimer: true,
  verbose: true 
})

const testSteps = [
  {
    title: 'Simulated Test Execution with Progress',
    task: async (_ctx, helpers) => {
      helpers.setOutput('Starting test execution with file-level progress...')

      // Simulate the improved test execution
      try {
        const testProcess = execa('bun', ['run', 'test'], { 
          stdio: ['inherit', 'pipe', 'pipe'],
          buffer: false
        })

        let currentFile = ''
        let testCount = 0
        let passedTests = 0
        let failedTests = 0
        
        // Monitor stdout for file-level progress
        testProcess.stdout?.on('data', (data) => {
          const output = data.toString()
          const lines = output.split('\n')
          
          for (const line of lines) {
            // Detect test file being processed
            if (line.includes('.test.') || line.includes('.spec.')) {
              const fileMatch = line.match(/([^/\s]+\.(?:test|spec)\.[jt]s)/);
              if (fileMatch) {
                currentFile = fileMatch[1]
                helpers.setOutput(`Testing: ${currentFile}`)
              }
            }
            
            // Count tests
            if (line.includes('✓') || line.includes('PASS')) {
              passedTests++
              testCount++
              if (currentFile) {
                helpers.setOutput(`Testing: ${currentFile} (${passedTests}✓/${testCount})`)
              }
            } else if (line.includes('✗') || line.includes('FAIL')) {
              failedTests++
              testCount++
              if (currentFile) {
                helpers.setOutput(`Testing: ${currentFile} (${passedTests}✓/${failedTests}✗)`)
              }
            }
            
            // Show progress for long-running operations
            if (line.includes('Running') || line.includes('Collecting') || line.includes('Test Files')) {
              helpers.setOutput(line.trim())
            }
          }
        })

        // Monitor stderr for errors
        testProcess.stderr?.on('data', (data) => {
          const output = data.toString()
          if (output.includes('FAIL') || output.includes('Error')) {
            helpers.setOutput(`⚠️ ${output.trim()}`)
          }
        })

        await testProcess
        helpers.setTitle(`Test Execution - ✅ Complete (${testCount} tests, ${passedTests} passed)`)
      } catch (error) {
        const errorOutput = error instanceof Error ? error.message : String(error)
        helpers.setOutput(`Test execution completed with issues: ${errorOutput}`)
        helpers.setTitle('Test Execution - ⚠️ Some issues detected')
      }
    },
  },
  {
    title: 'Demonstrate Error Recovery Progress',
    task: async (_ctx, helpers) => {
      helpers.setOutput('Simulating error recovery with detailed feedback...')
      
      // Simulate the improved recovery verification
      helpers.setOutput('Starting recovery verification...')
      
      // Simulate lint verification
      helpers.setOutput('Verifying lint fixes...')
      helpers.setOutput('Checking lint: src/index.ts (1 files)')
      helpers.setOutput('Checking lint: src/utils.ts (2 files)')
      helpers.setOutput('✅ Lint check passed - no issues found')
      
      // Simulate type-check verification
      helpers.setOutput('Verifying TypeScript compilation...')
      helpers.setOutput('Type-checking: src/index.ts (1 files)')
      helpers.setOutput('Type-checking: src/utils.ts (2 files)')
      helpers.setOutput('✅ Type-check passed - no errors found')
      
      // Simulate test verification
      helpers.setOutput('Verifying test execution...')
      helpers.setOutput('Running test: utils.test.ts (1 files)')
      helpers.setOutput('Running test: index.test.ts (2 files)')
      helpers.setOutput('✅ Test verification passed - all tests running')
      
      helpers.setTitle('Error Recovery - ✅ Complete with detailed feedback')
    },
  }
]

try {
  await engine.execute(testSteps, {})
  console.log(chalk.green('\n✅ Progress feedback demonstration complete!'))
  console.log(chalk.gray('The improvements include:'))
  console.log(chalk.gray('• Real-time file-level progress during test execution'))
  console.log(chalk.gray('• Test count tracking (passed/failed)'))
  console.log(chalk.gray('• Streaming output to prevent memory issues'))
  console.log(chalk.gray('• Detailed recovery verification feedback'))
  console.log(chalk.gray('• No more silent "animated dots" - you see exactly what\'s happening'))
} catch (error) {
  console.error(chalk.red('\n❌ Demo failed:'), error.message)
}