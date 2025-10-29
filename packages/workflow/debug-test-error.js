#!/usr/bin/env node

// Debug script to test test failure error categorization
import { ErrorRecoveryService } from './dist/index.js'

async function debugTestError() {
  console.log('🔍 Debugging test failure error categorization...\n')
  
  const recoveryService = ErrorRecoveryService.getInstance()
  const testError = new Error("Test failures detected: Command failed with exit code 1: bun run 'test:ci'")
  
  console.log('Error message:', testError.message)
  console.log('Testing regex patterns...\n')
  
  // Test the regex patterns directly
  const testPattern = /test.*fail|fail.*test|vitest|jest|spec.*fail|expect.*fail|assertion.*fail|test:ci/i
  const match = testPattern.test(testError.message)
  console.log('Regex test result:', match)
  console.log('Regex pattern:', testPattern.toString())
  
  console.log('\n🔧 Running error recovery...\n')
  
  try {
    const result = await recoveryService.executeRecovery(testError)
    console.log('✅ Recovery completed successfully')
    console.log('Result:', result)
  } catch (error) {
    console.error('❌ Recovery failed:', error.message)
  }
}

debugTestError().catch(console.error)