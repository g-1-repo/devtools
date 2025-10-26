#!/usr/bin/env node

/**
 * Debug script to test version approval step execution
 */

import { createReleaseWorkflow } from './dist/index.js';

async function debugStepExecution() {
  console.log('🔍 Testing version approval step execution...\n');
  
  // Test different option combinations
  const testCases = [
    { name: 'Dry run only', options: { dryRun: true } },
    { name: 'Non-interactive only', options: { nonInteractive: true } },
    { name: 'Dry run + non-interactive', options: { dryRun: true, nonInteractive: true } },
    { name: 'Interactive dry run', options: { dryRun: true, nonInteractive: false } },
    { name: 'No options', options: {} },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log(`Options:`, testCase.options);
    
    try {
      const workflow = await createReleaseWorkflow(testCase.options);
      const versionApprovalStep = workflow.find(step => 
        step.title.toLowerCase().includes('version approval')
      );
      
      if (versionApprovalStep) {
        console.log('✅ Version approval step found');
        
        // Mock context and helpers
        const mockCtx = {
          version: {
            current: '3.8.5',
            next: '3.8.6',
            type: 'patch'
          }
        };
        
        const mockHelpers = {
          setTitle: (title) => console.log(`  Title: ${title}`),
          setOutput: (output) => console.log(`  Output: ${output}`)
        };
        
        // Test if the step would be skipped
        console.log('  Testing step execution...');
        
        // Simulate the skip condition
        const shouldSkip = testCase.options.type || 
          (testCase.options.nonInteractive && !testCase.options.dryRun);
        
        if (shouldSkip) {
          console.log('  ❌ Step would be SKIPPED');
          console.log(`    Reason: type=${testCase.options.type}, nonInteractive=${testCase.options.nonInteractive}, dryRun=${testCase.options.dryRun}`);
        } else {
          console.log('  ✅ Step would be EXECUTED');
        }
        
      } else {
        console.log('❌ Version approval step NOT found');
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

debugStepExecution();