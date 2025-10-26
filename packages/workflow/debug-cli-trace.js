#!/usr/bin/env node

// Simple script to trace what happens when we run the CLI
import { spawn } from 'child_process'

console.log('🔍 Running CLI with debug tracing...\n')

const child = spawn('node', ['-e', `
// Add debug logging to the CLI
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('createReleaseWorkflow')) {
    originalConsoleLog('🔍 DEBUG:', ...args);
  } else {
    originalConsoleLog(...args);
  }
};

// Import and run CLI
import('./src/cli.js').then(() => {
  console.log('CLI loaded');
}).catch(console.error);
`, 'release', '--dry-run'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

child.on('close', (code) => {
  console.log(`\n🏁 CLI process exited with code: ${code}`)
})