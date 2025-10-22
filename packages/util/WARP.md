# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Install dependencies
bun install

# Build the library (builds both main library and MCP server)
bun run build

# Development mode with file watching
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint
bun run lint:fix

# Code formatting
bun run format
bun run format:check
```

### Testing
```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage report
bun run test:coverage

# Run tests for CI (single run)
bun run test:ci
```

### MCP Server Development
```bash
# Build the MCP server specifically
bun run build:mcp

# Start the MCP server for testing
bun run mcp:start

# Test MCP server integration
npx g1-util-mcp
```

### Publishing & Releases
```bash
# Automated release with workflow (enterprise-grade)
bun run release        # Complete release workflow: quality gates → git → npm
bun run release:help   # Show detailed release help

# Alternative: Use changesets for version management
bun run changeset
bun run changeset:version
bun run changeset:publish

# Manual publish (after build)
bun run publish:public

# Development workflow utilities
bun run workflow       # Show workflow status
bun run demo          # Show library capabilities demo
```

#### CI Publishing via GitHub Releases
- Create a tag `vX.Y.Z` and publish a GitHub Release
- CI sets package versions to `X.Y.Z` and publishes if new

```bash
# Example using GitHub CLI
gh release create v3.5.0 --title "v3.5.0" --notes "Release notes"
```

## Architecture Overview

### Module Structure
The codebase is organized into domain-specific utility modules:

- **`src/array/`** - Array manipulation utilities (unique, groupBy, chunk, shuffle)
- **`src/async/`** - Async utilities (delay, debounce, throttle, retry with exponential backoff)
- **`src/crypto/`** - Cryptographic utilities and helpers
- **`src/database/`** - Database utilities and connection helpers
- **`src/date/`** - Date formatting, manipulation, and relative time utilities
- **`src/debug/`** - Performance timing, logging, and debugging tools
- **`src/http/`** - HTTP status codes and web request utilities
- **`src/math/`** - Mathematical operations (clamp, random, rounding, conversions)
- **`src/node/`** - Node.js-specific utilities (git operations, CLI prompts)
- **`src/object/`** - Object manipulation (deepClone, pick, omit, isEmpty)
- **`src/string/`** - String transformations (camelCase, kebab-case, slugify, truncate)
- **`src/types/`** - Type guards and TypeScript utilities
- **`src/validation/`** - Input validation (email, URL, phone, UUID)
- **`src/web/`** - Browser/web-specific utilities (clipboard, query params, byte formatting)

### Key Architecture Patterns

1. **Modular Exports**: Each category has its own directory with an `index.ts` that re-exports all utilities
2. **TypeScript-First**: Full TypeScript support with strict type checking and declaration generation
3. **Dual Package**: Supports both CommonJS and ES modules via tsup configuration
4. **Tree-Shakeable**: Individual function exports allow for optimal bundling
5. **Node.js Split**: Server-side utilities are separated into `src/node/` to avoid browser incompatibility

### MCP Server Integration
The repository includes a Model Context Protocol (MCP) server at `mcp-server/server.ts` that:
- Automatically detects if `@g-1/util` is installed in projects
- Provides AI assistants with contextual information about available utilities
- Suggests appropriate utilities based on user tasks (release scripts, CLI tools, git workflows)
- Integrates with Warp terminal's AI features

### Build System
- **tsup**: Primary build tool for library compilation (CJS + ESM)
- **Vitest**: Testing framework with coverage support
- **ESLint**: Uses @antfu/eslint-config with TypeScript support
- **Changesets**: Version management and automated changelog generation

### Testing Strategy
- **Unit Tests**: Located alongside source files with `.test.ts` extension
- **Integration Tests**: In `tests/` directory for cross-module functionality
- **Type Testing**: TypeScript compiler serves as additional validation layer
- **Coverage**: Comprehensive coverage reporting via Vitest + V8

## Development Context

### Target Use Cases
This library is specifically designed for:
- **Release Automation**: Git operations, version bumping, changelog generation
- **Interactive CLI Development**: User prompts, progress indicators, colored output
- **General TypeScript/JavaScript Utilities**: String, date, object, array manipulations
- **Web Development**: URL handling, clipboard operations, data formatting

### Special Considerations
- **Platform-Specific Code**: Node.js utilities are isolated to prevent browser bundle issues
- **External Dependencies**: Minimal dependencies (only nanoid and MCP SDK)
- **Backwards Compatibility**: Supports multiple module systems and maintains semantic versioning

## Shared packages
- @g-1/test: /Users/johnnymathis/Developer/g1/test
- @g-1/workflow: /Users/johnnymathis/Developer/g1/workflow
- @g-1/util: /Users/johnnymathis/Developer/g1/util

## Guidance for Warp
- Before adding utilities/runners/workflows, check these repos for an existing implementation.
- Consolidation rules:
  - @g-1/util: generic helpers/types/logging/config
  - @g-1/test: testing/Vitest helpers, runners, fixtures, factories
  - @g-1/workflow: workflow orchestration/execution, release pipelines
- When duplication is detected, propose an extraction plan and PR outline to move code to the right package.

### Integration Points
- **MCP Protocol**: For AI assistant integration in terminals like Warp
- **Git Workflows**: Direct git command integration for repository management
- **Package Management**: Works with npm, yarn, bun, and other Node.js package managers
