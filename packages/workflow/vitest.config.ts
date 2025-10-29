import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@g-1/ai-core': path.resolve(__dirname, '../ai-core/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['dist', 'build', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['coverage/**', 'dist/**', '**/*.d.ts', '**/*.config.*', 'src/**/*.test.*'],
    },
    testTimeout: 15000,
    setupFiles: [],
  },
})
