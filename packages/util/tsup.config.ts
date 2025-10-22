import { defineConfig } from 'tsup'
import { createLibraryConfig } from '../shared/tsup.config.base.js'

export default defineConfig(
  createLibraryConfig({
    entry: {
      // Main entry point
      index: 'src/index.ts',
      // Individual module entry points for tree-shaking
      'array/index': 'src/array/index.ts',
      'async/index': 'src/async/index.ts', 
      'date/index': 'src/date/index.ts',
      'string/index': 'src/string/index.ts',
      'object/index': 'src/object/index.ts',
      'math/index': 'src/math/index.ts',
      'validation/index': 'src/validation/index.ts',
      'web/index': 'src/web/index.ts',
      'node/index': 'src/node/index.ts',
      'node/git-utils': 'src/node/git-utils.ts',
      'node/git-operations': 'src/node/git-operations.ts',
      'node/prompt-utils': 'src/node/prompt-utils.ts',
      'node/warp/index': 'src/node/warp/index.ts',
      'node/warp/cli': 'src/node/warp/cli.ts',
      'types/index': 'src/types/index.ts',
      'crypto/index': 'src/crypto/index.ts',
      'crypto/workers-safe': 'src/crypto/workers-safe.ts',
      'database/index': 'src/database/index.ts',
      'debug/index': 'src/debug/index.ts',
      'http/index': 'src/http/index.ts',
      'api/index': 'src/api/index.ts',
      'env/index': 'src/env/index.ts',
      'validation/core': 'src/validation/core.ts',
      'validation/web': 'src/validation/web.ts',
      'workflow/index': 'src/workflow/index.ts'
    },
    platform: 'node', // Change to node for better built-in handling
    target: 'node18',
    external: ['execa'], // Keep optional deps external
    noExternal: ['nanoid', '@paralleldrive/cuid2'], // Bundle small dependencies
    dts: true, // Enable TypeScript declarations
    splitting: true // Enable aggressive code splitting for tree-shaking
  })
)
