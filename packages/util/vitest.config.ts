import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Cache directory for Vitest
  cacheDir: 'node_modules/.vitest',

  resolve: {
    alias: {
      '@g-1/ai-core': '../ai-core/dist/index.js',
    },
  },

  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    isolate: true,
    coverage: {
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 85,
        statements: 95,
      },
      exclude: [
        'tests/**',
        'scripts/**',
        'mcp-server/**',
        '**/*.test.ts',
        '**/*.config.*',
        '**/index.ts', // Re-export files
      ],
    },
    benchmark: {
      outputFile: './benchmark-results.json',
      reporters: ['verbose'],
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
