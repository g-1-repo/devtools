import { defineConfig } from 'tsup'
import { createWorkerConfig, createCLIConfig } from '../shared/tsup.config.base.js'

export default defineConfig([
  // Main library build (Worker-optimized)
  createWorkerConfig({
    entry: ['src/index.ts'],
    platform: 'neutral',
    target: 'es2022',
    external: [
      'hono',
      'vitest', 
      'drizzle-orm',
      'better-sqlite3',
      'cloudflare:test',
      '@faker-js/faker'
    ],
    // Don't externalize @g-1/util to ensure proper bundling
    noExternal: ['@g-1/util'],
    splitting: true // Enable splitting for better tree-shaking
  }),
  
  // CLI build
  createCLIConfig({
    entry: ['src/cli/test-runner.ts'],
    platform: 'node',
    target: 'node18',
    external: [
      'chalk',
      'cosmiconfig', 
      'execa',
      'listr2',
      'zod',
      'glob',
      'enquirer',
      '@faker-js/faker'
    ],
    // Don't externalize @g-1/util to ensure proper bundling
    noExternal: ['@g-1/util']
  })
])
