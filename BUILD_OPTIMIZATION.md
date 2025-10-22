# Build Optimization Guide

This guide documents the standardized build optimizations implemented across all G1 DevTools packages.

## Overview

All packages now use standardized, optimized build configurations that provide:
- **Tree-shaking** for smaller bundle sizes
- **Code splitting** for better caching
- **Minification** in production
- **Bundle size monitoring** to prevent bloat
- **Bundle analysis** for optimization insights

## Build Configuration Standards

### Shared Configuration Base

All packages use the shared configuration from `packages/shared/tsup.config.base.ts`:

```typescript
// Example usage
import { createLibraryConfig } from '../shared/tsup.config.base.js'

export default defineConfig(
  createLibraryConfig({
    entry: ['src/index.ts'],
    platform: 'node',
    external: ['external-deps']
  })
)
```

### Package-Specific Configurations

**@g-1/util** - Library with aggressive tree-shaking:
- Multiple entry points for granular imports
- Platform: `neutral` (works everywhere)  
- Code splitting enabled
- Individual module exports for tree-shaking

**@g-1/workflow** - Dual library + CLI build:
- Library build with ESM/CJS output
- Separate CLI build optimized for Node.js
- Platform: `node` with Node.js-specific optimizations

**@g-1/test** - Worker-optimized + CLI build:
- Main build optimized for Cloudflare Workers
- Separate CLI build for Node.js tooling
- ESM-first for modern environments

## Bundle Size Monitoring

### Size Limits

| Package Type | Main Bundle | CLI Bundle | Modules | Chunks |
|--------------|-------------|------------|---------|--------|
| Util         | 30kb        | -          | 8kb     | 15kb   |
| Workflow     | 50kb        | 100kb      | -       | 15kb   |
| Test         | 40kb        | 80kb       | -       | 15kb   |

### Monitoring Commands

```bash
# Check bundle sizes across all packages
bun run size-check

# Analyze bundle composition 
bun run analyze

# Full optimized CI pipeline
bun run ci:optimized
```

### Size Monitoring Integration

Each package includes `bundlesize2` configuration:

```json
{
  "bundlesize": [
    {
      "path": "./dist/index.js",
      "maxSize": "30kb",
      "compression": "gzip"
    }
  ]
}
```

## Production Optimizations

### Automatic Optimizations

When `NODE_ENV=production`:
- **Minification**: Whitespace, identifiers, syntax
- **Dead code elimination**: Remove `console`, `debugger`
- **Property mangling**: Private properties (prefix `_`)
- **Environment variables**: Compile-time replacement

### Manual Optimizations

**Tree-shaking friendly exports**:
```typescript
// Good - named exports
export { utility1, utility2 }

// Avoid - default exports reduce tree-shaking
export default { utility1, utility2 }
```

**Code splitting**:
```typescript
// Automatic with dynamic imports
const module = await import('./heavy-module.js')

// Manual chunk splitting in tsup config
entry: {
  'core': 'src/core/index.ts',
  'extras': 'src/extras/index.ts' 
}
```

## Build Performance Tips

### Development Mode
- Source maps enabled for debugging
- Fast rebuilds with `--watch`
- Preserve function names for debugging

### Production Mode
- Aggressive minification
- No source maps
- Dead code elimination
- Property mangling

### Dependency Management
- Bundle small dependencies (`nanoid`, `@paralleldrive/cuid2`)
- External large dependencies (framework-specific libs)
- Platform-specific externals (Node.js built-ins)

## Optimization Workflow

### 1. Regular Size Checks
```bash
# Before committing changes
bun run size-check
```

### 2. Bundle Analysis
```bash
# Analyze bundle composition
bun run analyze

# Check for optimization opportunities
```

### 3. Performance Monitoring
- Bundle size limits enforced in CI
- Automatic alerts for size increases
- Regular optimization reviews

## Troubleshooting

### Bundle Size Exceeded
1. Check bundle analysis output
2. Identify large dependencies
3. Consider code splitting
4. Move large deps to `external`

### Build Performance Issues  
1. Check for unnecessary rebuilds
2. Optimize entry points
3. Review external dependencies
4. Enable watch mode for development

### Tree-shaking Not Working
1. Verify ESM exports
2. Check for side effects in code
3. Review dependency bundling
4. Use named exports consistently

## Future Improvements

- [ ] Implement build caching
- [ ] Add performance budgets
- [ ] Monitor runtime performance
- [ ] Optimize chunk loading strategies
- [ ] Add build time monitoring