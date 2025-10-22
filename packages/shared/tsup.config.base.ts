/**
 * Shared TSup Configuration Base
 * Standardized build configuration across all G1 DevTools packages
 */
import type { Options } from 'tsup'

interface BuildOptions {
  entry: string | string[] | Record<string, string>
  external?: string[]
  noExternal?: string[]
  platform?: 'node' | 'neutral' | 'browser'
  target?: string
  dts?: boolean
  cli?: boolean
  splitting?: boolean
}

export function createTsupConfig(options: BuildOptions): Options {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  const baseConfig: Options = {
    entry: options.entry,
    format: ['cjs', 'esm'],
    target: options.target || 'es2022',
    dts: options.dts !== false, // Default to true
    clean: true,
    splitting: options.splitting !== false, // Default to true
    sourcemap: !isProduction, // Only in development/test
    minify: isProduction,
    treeshake: true,
    bundle: true,
    platform: options.platform || 'neutral',
    outDir: 'dist',

    // External dependencies
    external: [
      // Node.js built-ins
      'child_process',
      'crypto',
      'fs', 
      'path',
      'os',
      'readline',
      'url',
      'util',
      'events',
      'stream',
      // Node.js prefixed modules
      'node:crypto',
      'node:fs',
      'node:path',
      'node:os',
      'node:util',
      'node:events',
      'node:stream',
      'node:child_process',
      'node:readline',
      'node:url',
      // Package-specific externals
      ...(options.external || [])
    ],

    // Bundle small dependencies to reduce install size
    noExternal: [
      'nanoid',
      ...(options.noExternal || [])
    ],

    // Enhanced esbuild options
    esbuildOptions: (esbuildOptions) => {
      // Chunk naming for better caching
      esbuildOptions.chunkNames = 'chunks/[name]-[hash]'
      esbuildOptions.mainFields = ['module', 'main']
      
      // Enhanced tree-shaking
      esbuildOptions.treeShaking = true
      esbuildOptions.define = {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
      }

      // Production optimizations
      if (isProduction) {
        esbuildOptions.minifyWhitespace = true
        esbuildOptions.minifyIdentifiers = true
        esbuildOptions.minifySyntax = true
        esbuildOptions.drop = ['console', 'debugger']
        esbuildOptions.mangleProps = /^_/ // Mangle private properties
      }

      // Development optimizations
      if (isDevelopment) {
        esbuildOptions.keepNames = true // Preserve function names for debugging
      }
    }
  }

  return baseConfig
}

// Specialized configurations for different package types
export function createLibraryConfig(options: Omit<BuildOptions, 'cli'>): Options {
  return createTsupConfig({
    ...options,
    splitting: true,
    dts: true
  })
}

export function createCLIConfig(options: Omit<BuildOptions, 'cli'>): Options {
  return createTsupConfig({
    ...options,
    platform: 'node',
    format: ['cjs'], // CLI tools typically use CJS
    splitting: false, // CLI builds shouldn't split
    dts: false // CLI doesn't need type definitions
  })
}

export function createWorkerConfig(options: Omit<BuildOptions, 'cli'>): Options {
  return createTsupConfig({
    ...options,
    platform: 'neutral',
    format: ['esm'], // Workers prefer ESM
    target: 'es2022',
    external: [
      // Cloudflare Worker specific
      'cloudflare:test',
      ...(options.external || [])
    ]
  })
}