import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Cache directory for Vitest
  cacheDir: 'node_modules/.vitest',
  
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    coverage: {
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 85,
        statements: 95
      },
      exclude: [
        'tests/**',
        'scripts/**',
        'mcp-server/**',
        '**/*.test.ts',
        '**/*.config.*',
        '**/index.ts' // Re-export files
      ]
    },
    benchmark: {
      outputFile: './benchmark-results.json',
      reporters: ['verbose']
    },
    // Optimize test performance
    testTimeout: 10000,
    hookTimeout: 5000,
    // Better error reporting
    reporters: ['verbose'],
    // Cache configuration (updated to use cacheDir)
    // Note: Vitest will write cache to cacheDir/vitest automatically
  },
})
