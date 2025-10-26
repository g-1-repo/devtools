#!/usr/bin/env node

// Monkey patch the createReleaseWorkflow function to log what options are passed
import { createReleaseWorkflow as originalCreateReleaseWorkflow } from './dist/index.js'

// Override the function to log options
const createReleaseWorkflow = async (options) => {
  console.log('\n🔍 createReleaseWorkflow called with options:')
  console.log(JSON.stringify(options, null, 2))
  
  const steps = await originalCreateReleaseWorkflow(options)
  
  console.log('\n📋 Workflow steps created:')
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step.title}`)
    if (step.title === 'Version approval') {
      console.log(`     Has skip function: ${!!step.skip}`)
      if (step.skip) {
        console.log(`     Skip condition: type=${options.type}, nonInteractive=${options.nonInteractive}, dryRun=${options.dryRun}`)
        console.log(`     Should skip: ${options.type || (options.nonInteractive && !options.dryRun)}`)
      }
    }
  })
  
  return steps
}

// Patch the module
import * as workflowModule from './dist/index.js'
workflowModule.createReleaseWorkflow = createReleaseWorkflow

// Now import and run the CLI
import('./src/cli.js').catch(console.error)