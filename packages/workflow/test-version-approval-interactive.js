#!/usr/bin/env node

/**
 * Test script to verify version approval functionality
 * This creates a simple test scenario to trigger the version approval prompt
 */

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

console.log('🧪 Testing version approval functionality...\n')

// Start the workflow in interactive mode
const child = spawn('bunx', ['workflow', 'release', '--dry-run'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd(),
})

let output = ''

child.stdout.on('data', (data) => {
  const text = data.toString()
  output += text
  process.stdout.write(text)

  // Look for version approval prompt
  if (text.includes('Approve version') || text.includes('version approval')) {
    console.log('\n✅ Version approval prompt detected!')
    // Send "confirm" response
    child.stdin.write('\n')
  }
})

child.stderr.on('data', (data) => {
  process.stderr.write(data)
})

child.on('close', (code) => {
  console.log(`\n🏁 Process exited with code: ${code}`)

  if (output.includes('Version approval')) {
    console.log('✅ Version approval step was executed')
  } else {
    console.log('❌ Version approval step was NOT found in output')
    console.log('\nSearching for version-related steps in output...')
    const lines = output.split('\n')
    const versionLines = lines.filter(
      (line) => line.includes('version') || line.includes('Version') || line.includes('approval')
    )
    for (const line of versionLines) {
      console.log(`  ${line.trim()}`)
    }
  }
})

// Timeout after 30 seconds
setTimeout(30000).then(() => {
  if (!child.killed) {
    console.log('\n⏰ Test timed out, killing process...')
    child.kill()
  }
})
