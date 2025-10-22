# @g-1/util

## [2.1.1] - 2025-10-21

### Other Changes

- chore: commit changes before release


## [2.1.0] - 2025-10-21

### Features

- centralize optimized error recovery in util/workflow; add cache/parallel helpers\ndocs: add publishing guidance and prepare docs optimization

### Other Changes

- chore: commit changes before release
- docs: add comprehensive JSDoc comments to key functions and classes
- docs: update changelog for v1.2.0 documentation improvements
- docs: streamline publishing via GitHub Releases; document optimized error recovery usage
- Merge branch 'feature/shared-utils-migration'


## 2.0.0

### Major Changes

- # 🚀 Initial Production Release

  This marks the first stable release of the G1 DevTools packages:

  ## 📦 What's New

  - **@g-1/util**: Complete utility library with Cloudflare Workers compatibility
  - **@g-1/workflow**: Enterprise-grade release automation system
  - **@g-1/test**: Unified test framework with factory patterns

  ## 💥 Breaking Changes

  This is the initial release, so there are no breaking changes from previous versions.

  ## 🛠 Migration Guide

  For new users:

  ```bash
  npm install @g-1/util @g-1/workflow @g-1/test
  ```

  ## 🔧 Key Features

  - Tree-shakeable ESM/CJS dual exports
  - Full TypeScript support
  - Production-ready with comprehensive test coverage
  - Optimized bundle sizes with monitoring

## [1.9.1] - 2025-10-19

### Bug Fixes

- Add workers-safe crypto module to build output

### Other Changes

- test: Fix flaky sortable ID test with proper timing

## [1.9.0] - 2025-10-19

### Features

- Add Cloudflare Workers-safe crypto utilities

### Other Changes

- chore: commit changes before release

## [1.8.0] - 2025-10-19

### Features

- add NPM publish workflow
- rebrand to G1 and update package name to @g-1/util

### Other Changes

- chore(ci): add CI and release workflows; update repository metadata to g-1-repo/util (#1)

## [1.7.2] - 2025-10-18

## [1.7.1] - 2025-10-18

### Other Changes

- chore: commit changes before release
- chore: release v1.7.0

## 1.7.0

### Minor Changes

- Add new features and functionality

## 1.6.0

### Minor Changes

- **CONSOLIDATION MILESTONE**: Major code consolidation across Go Corp shared packages
- Add comprehensive `GitOperations` class consolidating @g-1/workflow and @g-1/util git utilities
- Add enterprise `StructuredLogger` class consolidated from go-test-suite with telemetry support
- Add runtime detection utilities: `detectRuntime`, `detectDatabaseProvider`, `getRuntimeCapabilities`
- Add enhanced environment utilities: `getEnvironmentInfo`, `setupTestEnvironment`, `isTestEnvironment`, `isCIEnvironment`
- Export comprehensive Git API with SimpleGit integration and execSync fallback
- Export structured logging with performance monitoring and telemetry
- Maintain backward compatibility with legacy function exports
- Consolidate ~800+ lines of duplicate code from dependent packages

### Breaking Changes

- Some internal Git utility functions renamed with "Legacy" suffix to avoid conflicts
- Debug utility functions renamed with "Legacy" suffix, new structured logger is primary export

### Migration Guide

For existing users, imports remain the same, but new consolidated APIs are recommended:

```ts
// Old way (still works)
import { getCurrentBranch, hasUncommittedChanges } from "@g-1/util/node";

// New recommended way
import { GitOperations, createGitOperations } from "@g-1/util/node";
const git = createGitOperations();
await git.getCurrentBranch();
await git.hasUncommittedChanges();
```

```ts
// Old way (still works)
import { createTimer, logWithTime } from "@g-1/util/debug";

// New recommended way
import { StructuredLogger, createLogger } from "@g-1/util/debug";
const logger = createLogger();
const timer = logger.timer("operation");
logger.logWithTime("message");
```

## 1.5.0

### Minor Changes

- **Major Performance & Feature Update** - Comprehensive optimizations and new utility modules

  ### 🚀 **New Modules**

  - **API Response Utilities** (`@g-1/util/api`) - Standardized API response formats
    - `createApiResponse()`, `createErrorResponse()`, `createPaginatedResponse()`
    - Common HTTP status codes and error codes for G1 projects
    - Type guards for response validation
  - **Environment Utilities** (`@g-1/util/env`) - Cross-platform environment handling
    - `getEnv()`, `requireEnv()`, `getEnvNumber()`, `getEnvBoolean()`, `getEnvJson()`
    - `loadEnvConfig()` with type validation
    - Works in Node.js and edge environments (Cloudflare Workers)
  - **Enhanced Validation** - Better tree-shaking with core/web split
    - `@g-1/util/validation/core` - Universal validation (email, UUID, phone, etc.)
    - `@g-1/util/validation/web` - Web-specific validation (URL, JSON, semver, etc.)
    - New validators: IP addresses, hex colors, credit cards, domains, slugs

  ### ⚡ **Performance Optimizations**

  - **String Utilities** - Shared regex patterns reduce bundle size by ~15%
  - **Object Utilities** - Enhanced `deepClone()` with RegExp support and better type safety
  - **Async Utilities** - Fixed Cloudflare Workers compatibility (removed NodeJS.Timeout)
  - **Bundle Optimization** - Enhanced tree-shaking and code splitting

  ### 🔧 **Developer Experience**

  - **Performance Benchmarking** - Added comprehensive performance tests
  - **Enhanced Build Config** - Optimized tsup and vitest configurations
  - **Better Type Safety** - Full compatibility with `exactOptionalPropertyTypes`
  - **Improved Linting** - Resolved all ESLint issues with modern patterns

  ### 📊 **Bundle Impact**

  - Main bundle: 1.52KB gzipped (under 25KB target) ✅
  - Individual modules: All under 5KB gzipped ✅
  - 167 tests passing with 100% compatibility

  Perfect for modern G1 projects requiring standardized APIs and cross-platform compatibility!

## 1.3.0

### Minor Changes

- **Production-Ready Package** - Comprehensive improvements and optimizations
  - Add npm badges for better visibility
  - Implement comprehensive JSDoc documentation for enhanced IDE support
  - Expand test coverage from 81 to 133 tests (64% increase)
  - Fix all lint warnings and errors for clean codebase
  - Add GitHub issue templates for bug reports and feature requests
  - Include essential documentation (LICENSE, SECURITY.md, PERFORMANCE.md)
  - Optimize bundle analysis and CI workflows
  - Improve TypeScript strict compliance
  - Perfect for production use with excellent performance metrics

## 1.2.5

### Patch Changes

- General maintenance and updates

## 1.2.4

### Patch Changes

- General maintenance and updates

## 1.2.3

### Patch Changes

- Update source code and functionality
- Update dependencies and package configuration
- Update TypeScript configuration
- Update documentation
- Improve testing coverage
- Update configuration files
- General maintenance and updates

## 1.2.2

### Patch Changes

- Update dependencies and package configuration
- Update configuration files
- General maintenance and updates

## 1.2.1

### Patch Changes

- General maintenance and updates

## 1.2.0

### Minor Changes

- Update source code and functionality
- Update dependencies and package configuration
- Update TypeScript configuration
- Update documentation
- Improve testing coverage
- Update configuration files
- Fix bugs and resolve issues
- General maintenance and updates
- Add new features and functionality

## 1.1.2

### Patch Changes

- fixed analyzeChangesForVersionBump()

## 1.1.1

### Patch Changes

- Transfer package to @g-1 organization
  - Move from personal scope to G1 organization
  - Update repository URLs and metadata
  - No functional changes to utilities

## 1.1.0

### Minor Changes

- # Add Node.js utilities and MCP server integration

  Major expansion of the utility library with server-side tools and AI integration:

  ## New Features

  ### 🔧 Node.js Git & Repository Management

  - `analyzeChangesForVersionBump()` - Intelligent version bump analysis
  - `updateChangelog()` - Automated changelog generation
  - `getCurrentBranch()`, `hasUncommittedChanges()` - Git status utilities
  - `incrementVersion()`, `commitAndPush()` - Release automation
  - `exec()` with colored logging - Safe shell command execution

  ### 🎯 Interactive CLI Prompts

  - `confirm()`, `select()`, `multiselect()` - User input prompts
  - `password()` - Secure password input with masking
  - `text()` - Text input with validation
  - `ProgressIndicator` - Animated progress spinners

  ### 🤖 MCP Server Integration

  - **AI Context Awareness** - Automatically tells AI assistants about available utilities
  - **Smart Suggestions** - AI knows when to suggest utilities for specific tasks
  - **Project Detection** - Detects @g-1/util installation automatically
  - **Warp Terminal Integration** - Works seamlessly with MCP protocol

  ### 📚 Enhanced Documentation

  - Comprehensive API documentation with examples
  - MCP server setup instructions
  - Example release script demonstrating utilities
  - Complete TypeScript definitions

  ## Perfect For

  - **Release Automation** - Automated version bumping and changelog generation
  - **CLI Development** - Interactive terminal applications with beautiful UX
  - **Git Workflows** - Repository management and automation
  - **Developer Tooling** - Build scripts and development utilities

  Based on battle-tested automation scripts from livemercial-website project.

## 1.0.0

### Major Changes

- 8e426d9: # @g-1/util v1.0.0

  Initial release of @g-1/util - a comprehensive collection of utility functions for TypeScript/JavaScript projects.

  ## Features

  ✨ **Comprehensive Utilities**: String, date, object, array, validation, async, type, math, web, and debug utilities

  🚀 **TypeScript First**: Written in TypeScript with full type support and IntelliSense

  📦 **Dual Package**: ESM and CommonJS support for maximum compatibility

  🧪 **Well Tested**: Complete test suite with Vitest

  📚 **Fully Documented**: Comprehensive API documentation and usage examples

  ## Installation

  ```bash
  npm install @g-1/util
  # or
  yarn add @g-1/util
  # or
  bun add @g-1/util
  ```

  ## Quick Start

  ```typescript
  import { toCamelCase, formatDate, deepClone } from "@g-1/util";

  // String utilities
  const camelCased = toCamelCase("hello world"); // 'helloWorld'

  // Date utilities
  const formatted = formatDate(new Date(), "medium"); // 'Jan 1, 2024'

  // Object utilities
  const cloned = deepClone({ a: { b: 1 } });
  ```
