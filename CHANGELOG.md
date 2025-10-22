# Changelog

## [1.2.0] - 2025-10-21

### Documentation

- **CI Publishing**: Added comprehensive GitHub Releases-driven publishing documentation across all packages
- **Error Recovery**: Documented optimized error recovery centralization in `@g-1/util/workflow` with usage examples
- **Development Workflow**: Streamlined development commands and publishing guidance in WARP documentation
- **Cross-Package Integration**: Updated README files with CI publishing examples using GitHub CLI
- **Architecture Clarity**: Enhanced documentation for shared utilities migration and performance optimizations

### Improvements

- Consolidated publishing workflow documentation from manual Changesets to automated CI via GitHub Releases
- Added TypeScript usage examples for `OptimizedErrorRecoveryService` import and execution
- Standardized development command references across all package documentation
- Enhanced monorepo-level documentation with clear CI publishing paths

## [1.1.0] - 2025-10-19

### Features

- standardize build optimization across all packages
- implement comprehensive test suites for @g-1/workflow and @g-1/test
- Phase 1 - G1 Studio DevTools Monorepo Foundation

### Bug Fixes

- resolve test failures with temporary mocks and syntax fixes

### Other Changes

- Temporarily disable DTS generation for util package
- Fix util package build config for Node.js platform
- Temporarily disable prepublish checks for initial release
- Fix build issues for publishing
- Version packages for release\n\n- @g-1/util@2.0.0\n- @g-1/workflow@3.0.0\n- @g-1/test@2.0.0
- Merge feature/add-test-suites - resolve conflicts by keeping current versions
- Fix deprecated faker method and prepare for release
- refactor: consolidate Git operations between @g-1/util and @g-1/workflow (#2)
- docs: add devtools documentation and analysis files (#1)

