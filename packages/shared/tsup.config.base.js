/**
 * Shared tsup configuration base for G1 DevTools packages
 * Provides optimized, consistent build configurations across all packages
 */

/**
 * Base configuration with enterprise-grade optimizations
 */
const createBaseConfig = (options = {}) => ({
  // Core options
  format: ['cjs', 'esm'],
  target: options.target || 'es2022',
  platform: options.platform || 'neutral',
  
  // TypeScript
  dts: true,
  clean: true,
  sourcemap: true,
  
  // Optimization
  minify: process.env.NODE_ENV === 'production',
  splitting: options.splitting ?? true,
  treeshake: true,
  
  // Bundle analysis
  metafile: process.env.NODE_ENV === 'production',
  
  // Error handling
  onSuccess: options.onSuccess,
  
  // External dependencies
  external: options.external || [],
  noExternal: options.noExternal || [],
  
  // Entry points
  entry: options.entry || ['src/index.ts'],
  
  ...options
})

/**
 * Library configuration for packages that export utilities
 */
export const createLibraryConfig = (options = {}) => createBaseConfig({
  // Library-specific optimizations
  splitting: true, // Enable code splitting for tree-shaking
  treeshake: true,
  
  // Format configuration
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    }
  },
  
  // Bundle size monitoring
  onSuccess: options.onSuccess || (process.env.NODE_ENV === 'production' 
    ? 'echo "📦 Library build complete - check bundle sizes with: bun run size-check"'
    : undefined),
    
  ...options
})

/**
 * CLI configuration for command-line tools
 */
export const createCLIConfig = (options = {}) => createBaseConfig({
  // CLI-specific settings
  format: ['cjs'], // CLI tools typically use CommonJS
  platform: 'node',
  target: 'node18',
  
  // No splitting for CLI (single executable)
  splitting: false,
  
  // Shebang for executable files
  banner: options.banner || {
    js: '#!/usr/bin/env node'
  },
  
  // Minification for smaller CLI bundles
  minify: true,
  
  onSuccess: options.onSuccess || 'echo "🔧 CLI build complete"',
  
  ...options
})

/**
 * Worker configuration for Cloudflare Workers and edge environments
 */
export const createWorkerConfig = (options = {}) => createBaseConfig({
  // Worker-specific settings
  format: ['esm'], // Workers prefer ESM
  platform: 'neutral',
  target: 'es2022',
  
  // Aggressive tree-shaking for minimal bundle size
  splitting: true,
  treeshake: true,
  
  // No Node.js APIs
  noExternal: options.noExternal || [],
  
  // Bundle size is critical for edge
  minify: true,
  
  onSuccess: options.onSuccess || 'echo "⚡ Worker build complete - optimized for edge runtime"',
  
  ...options
})

/**
 * Test configuration for test packages and utilities
 */
export const createTestConfig = (options = {}) => createBaseConfig({
  // Test-specific settings
  format: ['esm'], // Modern test frameworks prefer ESM
  platform: options.platform || 'node',
  target: 'node18',
  
  // Code splitting for test utilities
  splitting: options.splitting ?? true,
  
  // Source maps for debugging
  sourcemap: true,
  
  // External test frameworks
  external: [
    'vitest',
    'hono',
    '@vitest/coverage-v8',
    ...(options.external || [])
  ],
  
  onSuccess: options.onSuccess || 'echo "🧪 Test build complete"',
  
  ...options
})

/**
 * Development configuration with fast rebuilds
 */
export const createDevConfig = (options = {}) => createBaseConfig({
  // Development optimizations
  minify: false,
  sourcemap: true,
  clean: false, // Faster incremental builds
  
  // Fast builds over optimization
  splitting: false,
  treeshake: false,
  
  onSuccess: options.onSuccess || 'echo "🔄 Dev build complete"',
  
  ...options
})

/**
 * Production configuration with maximum optimization
 */
export const createProdConfig = (options = {}) => createBaseConfig({
  // Production optimizations
  minify: true,
  sourcemap: false, // Smaller bundle size
  
  // Maximum optimization
  splitting: true,
  treeshake: true,
  
  // Bundle analysis
  metafile: true,
  
  onSuccess: options.onSuccess || 'echo "🚀 Production build complete - bundle analyzed"',
  
  ...options
})

/**
 * Multi-target configuration for packages that support multiple environments
 */
export const createMultiTargetConfig = (targets = []) => {
  return targets.map(target => createBaseConfig({
    outDir: `dist/${target.name}`,
    ...target.config
  }))
}

