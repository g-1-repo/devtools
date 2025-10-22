# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Workflow
```bash
# Install dependencies
bun install

# Build the CLI and workflow library
bun run build

# Development mode with file watching
bun run dev

# Type checking
bun run typecheck

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

### Publishing & Releases
```bash
# Interactive release workflow
yarn workflow release

# Non-interactive (CI) flags
workflow release --non-interactive --skip-cloudflare --skip-npm
```

#### CI Publishing via GitHub Releases
- Create a tag `vX.Y.Z` and publish a GitHub Release
- CI sets package versions to `X.Y.Z` and publishes if new

```bash
# Example using GitHub CLI
gh release create v3.5.0 --title "v3.5.0" --notes "Release notes"
```

**Interactive Workflow Features**
- **Upfront Configuration**: Deployment targets selected before workflow starts
- **Uncommitted Changes Handling**: Interactive prompts for commit, stash, or force options
- **npm OTP Support**: Interactive terminal access for 2FA/OTP authentication
- **Error Recovery**: Non-fatal failures with clear guidance and workflow continuation
- **CI/CD Mode**: `--non-interactive` flag for automated environments

**AI Integration Points**
- Branch name suggestions based on changed files and commit history

...

**Enjoy using your badass enterprise workflow system! 🔥**
