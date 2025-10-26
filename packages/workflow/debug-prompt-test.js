#!/usr/bin/env node

import { select, isCancel } from '@clack/prompts';

console.log('Testing @clack/prompts select function in isolation...\n');

async function testPrompt() {
  try {
    const approval = await select({
      message: 'Test prompt - does this work?',
      options: [
        { value: 'yes', label: 'Yes - I can see this prompt' },
        { value: 'no', label: 'No - This is not visible' },
      ],
    });

    if (isCancel(approval)) {
      console.log('User cancelled the prompt');
      process.exit(0);
    }

    console.log(`Selected: ${approval}`);
  } catch (error) {
    console.error('Error with prompt:', error);
  }
}

testPrompt();