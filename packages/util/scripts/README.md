# Scripts

This directory contains utility scripts for development workflow management and automated release processes.

## Scripts

### `release.js`
Automated release management script with intelligent version detection.

```bash
bun run release        # Interactive release with automatic analysis
bun run release:help   # Show detailed help
```

Features:
- Automatic git analysis and version bump recommendations
- Interactive version selection (patch/minor/major)
- Automatic changelog generation
- Git tagging and pushing
- Semantic versioning compliance
- Integration with @g-1/util

### `workflow.ts` 
Development workflow utilities powered by `@g-1/util`.

```bash
bun run workflow
```

Provides:
- Branch management utilities
- Release automation
- Build and test shortcuts
- Development task orchestration
- Git status and version information

### `demo.ts`
Library demo and showcase script.

```bash
bun run demo
```

Demonstrates:
- @g-1/util library capabilities
- Utility function categories and examples
- MCP server integration features
- Development commands and workflows
- Usage examples and best practices

### Quick Commands

```bash
# Finish current branch and merge
bun run finish-branch

# Run workflow utilities  
bun run workflow

# Show library demo
bun run demo

# Create automated release
bun run release

# Show release help
bun run release:help
```

## TypeScript Library Specific

These scripts are tailored for the @g-1/util TypeScript utility library:

- **Release Management**: Handles dual package builds (CJS/ESM), TypeScript declarations
- **MCP Integration**: Considers MCP server builds and testing
- **Semantic Versioning**: Perfect for library releases with breaking change detection
- **Changelog Automation**: Generates formatted changelogs for npm package releases

## Dependencies

These scripts use `@g-1/util` for workflow automation and utilities. Since this is the same package being developed, they demonstrate real-world usage of the library's capabilities.
