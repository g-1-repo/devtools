#!/usr/bin/env node

// Test script to debug error recovery service
import { ErrorRecoveryService } from './dist/workflow/index.js'

async function testErrorRecovery() {
  console.log('Testing error recovery service...')
  
  const recoveryService = ErrorRecoveryService.getInstance()
  
  // Create a test error that should be categorized as 'test'
  const testError = new Error('Test failures detected: Command failed with exit code 1: bun run \'test:ci\'')
  
  console.log('Error message:', testError.message)
  
  // Analyze the error
  const analysis = await recoveryService.analyzeError(testError)
  
  console.log('Analysis result:')
  console.log('- Type:', analysis.type)
  console.log('- Severity:', analysis.severity)
  console.log('- Fixable:', analysis.fixable)
  console.log('- Description:', analysis.description)
  console.log('- Suggested fixes:', analysis.suggestedFixes)
  
  if (analysis.type === 'test') {
    console.log('✅ SUCCESS: Test error correctly categorized as "test"')
  } else {
    console.log('❌ FAILURE: Test error incorrectly categorized as "' + analysis.type + '"')
  }
}

testErrorRecovery().catch(console.error)