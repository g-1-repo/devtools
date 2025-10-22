# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Monorepo Management
```bash
# Install dependencies across all packages
bun install

# Build all packages
bun run build

# Run all tests
bun run test

# Run CI tests (single run)
bun run test:ci

# Type check all packages
bun run typecheck

# Lint all packages
bun run lint
bun run lint:fix

# Clean all build outputs
bun run clean

# Development mode (watch all packages)
bun run dev
```

### Package-Specific Commands
```bash
# Work with specific packages
bun --cwd packages/util run build
bun --cwd packages/workflow run test
bun --cwd packages/test run dev

# Single test execution examples
bun --cwd packages/test run test-runner  # Interactive test runner
npx vitest run path/to/file.test.ts      # Single test file
npx vitest run -t "test name"            # Single test by name
```

### Release Management
```bash
# Changeset-based release workflow (recommended)
bun run changeset                # Add changeset for changes
bun run changeset:version        # Version packages based on changesets
bun run release                  # Publish packages

# Individual package releases (uses @g-1/workflow)
bun --cwd packages/util run release
bun --cwd packages/workflow run release
bun --cwd packages/test run release
```

#### CI Publishing via GitHub Releases
- Create a tag `vX.Y.Z` and publish a GitHub Release
- CI sets `@g-1/util` and `@g-1/workflow` versions to `X.Y.Z` and publishes if new

```bash
# Example using GitHub CLI
gh release create v3.5.0 --title "v3.5.0" --notes "Release notes"
```

## Architecture Overview

### Monorepo Structure
This is an enterprise-grade TypeScript monorepo containing three core development packages:

**Package Dependencies (dependency graph)**:
```
@g-1/test
├── @g-1/util (workspace:*)
└── @g-1/workflow (workspace:*)

@g-1/workflow  
└── @g-1/util (workspace:*)

@g-1/util
└── (no internal dependencies - foundation package)
```

### Package Responsibilities

**[@g-1/util](./packages/util/)** - Foundation utilities library
- **Purpose**: Core TypeScript/JavaScript utilities for enterprise development
- **Key modules**: array, async, crypto, database, date, debug, http, math, node, object, string, types, validation, web
- **Special features**: MCP server integration, dual package support (CJS/ESM), tree-shakeable exports
- **Architecture**: Modular domain-specific utilities with TypeScript-first design

**[@g-1/workflow](./packages/workflow/)** - Release automation system  
- **Purpose**: Enterprise-grade workflow orchestration and release pipelines
- **Key components**: TaskEngine (listr2), GitStore, ReleaseWorkflow, Plugin architecture
- **Special features**: Interactive CLI, AI integration points, multi-platform deployments, quality gates
- **Architecture**: Declarative workflow definitions with task orchestration and error recovery

**[@g-1/test](./packages/test/)** - Testing framework and tools
- **Purpose**: Comprehensive testing utilities with multi-runtime support  
- **Key components**: Database adapters, data factories, test store, Vitest integration, interactive test runner
- **Special features**: Runtime detection (Node/Bun/Cloudflare Workers), environment-specific optimizations
- **Architecture**: Adapter pattern for databases, isolated test environments, CLI + framework exports

### Build System
- **Package Manager**: Bun (primary) with npm fallbacks
- **Build Tool**: tsup for TypeScript compilation (dual output: CJS + ESM)
- **Testing**: Vitest with coverage reporting
- **Linting**: ESLint with @antfu/eslint-config
- **Release Management**: Changesets for coordinated version management

### Cross-Package Integration Points
1. **Workspace Dependencies**: Packages use `workspace:*` references for internal dependencies
2. **Shared Build Configuration**: Common tsup, ESLint, and TypeScript configurations
3. **Unified Release Process**: Changesets coordinates releases across all packages
4. **MCP Integration**: @g-1/util provides MCP server for AI assistant integration
5. **Testing Infrastructure**: @g-1/test provides testing utilities used by other packages

## Development Context

### Key Architectural Patterns
1. **Domain-Driven Module Organization**: Each package organizes code by functional domain
2. **TypeScript-First Development**: Strict typing with comprehensive declaration generation  
3. **Multi-Runtime Support**: Code compatible with Node.js, Bun, and Cloudflare Workers
4. **Plugin Architecture**: Extensible systems in workflow and test packages
5. **Enterprise Error Handling**: Comprehensive error recovery and user guidance

### Package-Specific Guidance

**When working with @g-1/util:**
- Utilities are organized by domain (array, async, crypto, etc.)
- Node.js-specific code is isolated in `src/node/` to prevent browser bundle issues
- Use MCP server integration for AI assistant contextual suggestions

**When working with @g-1/workflow:**
- Workflow steps are declarative with WorkflowStep interface
- TaskEngine converts workflows to listr2 tasks for beautiful UI
- Interactive prompts are moved upfront to prevent mid-workflow hanging
- Support both interactive and CI modes (`--non-interactive` flag)

**When working with @g-1/test:**
- Framework exports from `src/index.ts`, CLI from `src/cli/test-runner.ts`  
- Database adapters support memory, SQLite, D1, and Drizzle variants
- Runtime detection automatically optimizes for current environment
- Import only from main index in Cloudflare Workers contexts

### Shared Package Consolidation Rules
Before adding new utilities, check existing implementations:
- **@g-1/util**: Generic helpers, types, logging, configuration
- **@g-1/test**: Testing frameworks, Vitest helpers, runners, fixtures, factories  
- **@g-1/workflow**: Workflow orchestration, execution engines, release pipelines

When duplication is detected, propose extraction plan and PR outline to move code to appropriate package.

## Release Strategy

### Changesets Workflow (Recommended)
1. Make changes in appropriate package(s)
2. Run `bun run changeset` to document changes
3. Changesets automatically calculates semantic versions
4. Run `bun run changeset:version` to update package.json versions
5. Run `bun run release` to publish all changed packages

### Individual Package Releases  
Each package includes @g-1/workflow-powered release automation with:
- Quality gates (lint, typecheck, test) with auto-fixing
- Git analysis with conventional commit parsing
- Multi-platform publishing (npm, GitHub releases, Cloudflare Workers)
- Interactive OTP support for npm 2FA
- Non-fatal deployment error handling

## Package Manager Strategy
Following enterprise Bun-first approach:
1. All scripts default to `bun run` commands
2. CLI tools prefer `bun` with npm fallbacks for compatibility  
3. Publishing uses `bun publish` where available
4. Installation documentation shows `bun install` first

---

**Part of [G1 Studio](../README.md)** - Enterprise development tools for the G1 ecosystem.