import { defineConfig } from 'tsup'
import { createCLIConfig, createLibraryConfig } from '../shared/tsup.config.base.js'

export default defineConfig([
  // Library build
  createLibraryConfig({
    entry: ['src/index.ts'],
    platform: 'node',
    target: 'node18',
    dts: false, // Temporarily disable DTS to unblock CLI
    external: [
      'listr2',
      'commander',
      'chalk',
      'ora',
      'enquirer',
      'execa',
      'simple-git',
      'semver',
      'conventional-commits-parser',
      'cosmiconfig',
      'zod',
    ],
  }),

  // CLI build
  createCLIConfig({
    entry: ['src/cli.ts'],
    platform: 'node',
    target: 'node18',
    splitting: false, // Ensure single executable file
    dts: false, // Temporarily disable DTS to unblock CLI
    external: [
      'listr2',
      'commander',
      'chalk',
      'ora',
      'enquirer',
      'execa',
      'simple-git',
      'semver',
      'conventional-commits-parser',
      'cosmiconfig',
      'zod',
    ],
  }),
])
