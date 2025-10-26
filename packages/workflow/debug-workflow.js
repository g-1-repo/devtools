#!/usr/bin/env node

/**
 * Debug script to inspect the workflow steps
 */

import { createReleaseWorkflow } from './dist/index.js';

async function debugWorkflow() {
  console.log('🔍 Debugging workflow steps...\n');
  
  // Test with dry-run options
  const options = { dryRun: true };
  
  try {
    const workflow = await createReleaseWorkflow(options);
    
    console.log(`Total workflow steps: ${workflow.length}\n`);
    
    workflow.forEach((step, index) => {
      console.log(`${index + 1}. ${step.title}`);
      
      if (step.subtasks) {
        step.subtasks.forEach((subtask, subIndex) => {
          console.log(`   ${index + 1}.${subIndex + 1}. ${subtask.title}`);
        });
      }
    });
    
    // Look specifically for version approval
    const versionApprovalStep = workflow.find(step => 
      step.title.toLowerCase().includes('version approval') ||
      step.title.toLowerCase().includes('approval')
    );
    
    if (versionApprovalStep) {
      console.log('\n✅ Version approval step found!');
      console.log(`Title: "${versionApprovalStep.title}"`);
    } else {
      console.log('\n❌ Version approval step NOT found!');
    }
    
  } catch (error) {
    console.error('Error creating workflow:', error);
  }
}

debugWorkflow();