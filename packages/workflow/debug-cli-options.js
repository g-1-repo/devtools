#!/usr/bin/env node

import { createReleaseWorkflow } from './dist/index.js'

// Simulate different CLI scenarios
const scenarios = [
  {
    name: 'Dry run only',
    options: { dryRun: true }
  },
  {
    name: 'Non-interactive only', 
    options: { nonInteractive: true }
  },
  {
    name: 'Dry run + non-interactive',
    options: { dryRun: true, nonInteractive: true }
  },
  {
    name: 'Interactive dry run (explicit)',
    options: { dryRun: true, nonInteractive: false }
  },
  {
    name: 'Default options',
    options: {}
  }
]

console.log('🔍 Testing CLI option processing...\n')

for (const scenario of scenarios) {
  console.log(`--- ${scenario.name} ---`)
  console.log(`Options:`, JSON.stringify(scenario.options, null, 2))
  
  try {
    const steps = await createReleaseWorkflow(scenario.options)
    const versionApprovalStep = steps.find(step => step.title === 'Version approval')
    
    if (versionApprovalStep) {
      console.log('✅ Version approval step found')
      
      // Test the skip condition directly
      const { type, nonInteractive, dryRun } = scenario.options
      const shouldSkip = type || (nonInteractive && !dryRun)
      
      console.log(`  Skip condition: type=${type}, nonInteractive=${nonInteractive}, dryRun=${dryRun}`)
      console.log(`  Should skip: ${shouldSkip}`)
      
      if (versionApprovalStep.skip) {
        try {
          const skipResult = await versionApprovalStep.skip()
          console.log(`  Skip function result: ${skipResult}`)
        } catch (error) {
          console.log(`  Skip function error: ${error.message}`)
        }
      }
    } else {
      console.log('❌ Version approval step NOT found')
    }
  } catch (error) {
    console.log(`❌ Error creating workflow: ${error.message}`)
  }
  
  console.log('')
}