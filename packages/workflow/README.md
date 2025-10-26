# @g-1/workflow

🚀 **Enterprise-Grade Workflow Automation System**

A badass, production-ready CLI tool that serves as the backbone for major development organizations. Built for teams that demand reliability, beautiful UX, and enterprise-scale automation.

[![npm version](https://badge.fury.io/js/%40g-1%2Fworkflow.svg)](https://badge.fury.io/js/%40g-1%2Fworkflow)
[![npm downloads](https://img.shields.io/npm/dm/@g-1/workflow.svg)](https://www.npmjs.com/package/@g-1/workflow)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@g-1/workflow?label=bundle%20size)](https://bundlephobia.com/package/@g-1/workflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/g-1-repo/workflow/workflows/CI/badge.svg)](https://github.com/g-1-repo/workflow/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## 🚀 Enterprise-Grade Features

### 📊 **Beautiful UI & Professional Experience**
- **Native listr2 Integration**: Spinners, progress bars, hierarchical tasks with professional styling
- **Enhanced Error Visibility**: Red styling, error boxes, and crystal-clear failure indicators
- **Interactive Workflow**: Upfront configuration prevents mid-workflow crashes
- **Enterprise Logging**: Structured output with timing and context preservation

### 🔧 **Intelligent Automation & Recovery**
- **Intelligent Error Recovery**: Automated detection and fixing of linting, build, and dependency issues
- **Quality Gates**: Automated lint fixing, TypeScript checking, and testing with graceful fallbacks
- **Smart GitHub Actions Monitoring**: Real-time job tracking with automated npm verification
- **Crash-Proof Execution**: Interactive prompts moved upfront, comprehensive error handling

#### Optimized Error Recovery

The optimized error recovery service is centralized in `@g-1/util/workflow` for reusability and performance.

```ts
import { OptimizedErrorRecoveryService } from '@g-1/util/workflow'

const recovery = new OptimizedErrorRecoveryService()
const workflow = recovery.createRecoveryWorkflow('build')
await recovery.executeWorkflow(workflow)
```

### ⚡ **Multi-Platform Support & Compatibility**
- **Bun-First Architecture**: Optimized for bun with npm/npx fallbacks for maximum compatibility
- **Multi-Deployment Pipeline**: GitHub releases, npm publishing, and Cloudflare Workers
- **CI/CD Ready**: Non-interactive mode with proper exit codes and logging
- **Cross-Platform**: Works seamlessly across development environments

### 🛡️ **Enterprise Security & Reliability**
- **Semantic Versioning**: Git analysis with conventional commits and automatic changelog generation
- **Type-Safe**: Full TypeScript with comprehensive type definitions and strict typing
- **Well-Architected**: Clean separation of concerns, modular design patterns
- **Extensible Plugin System**: Ready for custom workflows and enterprise integrations

### 🤖 **AI-Ready Architecture**
- **Future-Proof**: Placeholder integrations for LLM-powered suggestions
- **Smart Suggestions**: Ready for AI-powered branch names and commit messages
- **Intelligent Workflows**: Foundation for machine learning integration

## 💪 Professional Grade

**This workflow tool could easily be the backbone of a major development organization's release process.**

- **⚙️ Crash-Proof Execution**: Interactive prompts moved upfront, comprehensive error handling
- **📊 CI/CD Ready**: Non-interactive mode with proper exit codes and logging for automated environments
- **🔌 Extensible Plugin System**: Ready for custom workflows and enterprise integrations
- **🔒 Type-Safe**: Full TypeScript with comprehensive type definitions and strict mode
- **🏢 Well-Architected**: Clean separation of concerns, modular design patterns
- **📊 Enterprise Logging**: Structured output with timing, context preservation, and professional reliability

> **The combination of automation, error recovery, beautiful UX, and professional reliability makes it production-ready for any scale.**

## 🚀 Quick Start

### Installation

```bash
# Install globally (recommended)
bun install -g @g-1/workflow

# Or use in project
bun add --dev @g-1/workflow

# Also available via npm/yarn/pnpm
npm install -g @g-1/workflow
```

### Basic Usage

```bash
# Interactive release workflow (recommended)
workflow release
# → Prompts for deployment targets (npm, Cloudflare)
# → Handles uncommitted changes interactively
# → Executes complete release pipeline

# Release with specific version bump
workflow release --type minor

# Skip specific deployments via CLI flags
workflow release --skip-cloudflare --skip-npm

# Force release with uncommitted changes
workflow release --force

# Non-interactive mode (for CI/CD)
workflow release --non-interactive --skip-cloudflare --skip-npm

# Show workflow status
workflow status
```

## 📋 Commands

### `workflow release`

Execute the complete release workflow with interactive configuration:

```bash
🔧 Deployment Configuration
----------------------------------------
✔ 📦 Publish to npm registry? (y/N) · true

⚠️  Uncommitted changes detected:
  - README.md

? How would you like to handle uncommitted changes? › 📝 Commit all changes now
✅ Changes committed

✔ Quality Gates
  ✔ Auto-fix linting issues - ✅ Fixed
  ✔ Type checking - ✅ Passed
  ✔ Running tests - ✅ No tests found (skipping)
✔ Git repository analysis - ✅ g-1-repo/workflow on main
✔ Version calculation - ✅ 2.10.1 → 2.11.0 (minor)
✔ Deployment configuration - ✅ Will deploy to: npm
✔ Release execution
  ✔ Update package.json version - ✅ 2.11.0
  ✔ Generate changelog - ✅ CHANGELOG.md updated
  ✔ Commit release changes - ✅ chore: release v2.11.0
  ✔ Create git tag - ✅ v2.11.0
  ✔ Push to remote - ✅ Complete
✔ Build project - ✅ Build complete
↓ Deploy to Cloudflare [SKIPPED]
✔ Publish to npm - ✅ v2.11.0 published (you may need to interact with prompts)
✔ Create GitHub release - ✅ v2.11.0 released

🎉 Release completed successfully!
📦 Version: 2.10.1 → 2.11.0
📂 Repository: g-1-repo/workflow
```

**Options:**
- `--type <patch|minor|major>` - Force specific version bump
- `--skip-tests` - Skip test execution
- `--skip-lint` - Skip linting step
- `--skip-cloudflare` - Skip Cloudflare deployment (or use interactive prompt)
- `--skip-npm` - Skip npm publishing (or use interactive prompt)
- `--non-interactive` - Run without prompts (for CI/CD environments)
- `--force` - Skip uncommitted changes check
- `--dry-run` - Show what would be done without executing *(coming soon)*
- `--verbose` - Show detailed output

### `workflow feature` *(Coming Soon)*

Create and manage feature branches with AI-powered suggestions:

```bash
workflow feature                    # AI suggests branch name
workflow feature "add-user-auth"    # Create specific feature
workflow feature --auto-merge       # Enable auto-merge on PR
```

### `workflow init`

Initialize a new project with Git setup and workflow configuration:

```bash
workflow init                       # Interactive setup
workflow init --skip-git          # Skip Git initialization
workflow init --skip-config       # Skip configuration setup
workflow init --force             # Overwrite existing configuration
```

**Features:**
- **Git Repository Setup**: Initializes Git repository with proper configuration
- **Workflow Configuration**: Creates `.go-workflow.config.js` with project defaults
- **Pre-flight Checks**: Validates environment and dependencies
- **Auto-fix Capabilities**: Automatically resolves common setup issues
- **Interactive Prompts**: Guides through configuration options

### `workflow status`

Show project and workflow status.

## 🏗️ Programmatic Usage

Use as a library in your Node.js applications:

```typescript
import { createReleaseWorkflow, createTaskEngine, createWorkflow, quickRelease } from '@g-1/workflow'

// Quick release with interactive prompts
await quickRelease({ type: 'minor' })

// Custom workflow (note: createReleaseWorkflow is now async)
const steps = await createReleaseWorkflow({
  skipTests: true,
  nonInteractive: true, // Skip prompts for programmatic use
  skipCloudflare: true,
  skipNpm: true
})
const engine = createTaskEngine({ showTimer: true })
const result = await engine.execute(steps)

// Build custom workflows
const customWorkflow = createWorkflow('deploy')
  .step('Build', async (ctx, helpers) => {
    helpers.setOutput('Building application...')
    // Your build logic
  })
  .step('Deploy', async (ctx, helpers) => {
    helpers.setOutput('Deploying to production...')
    // Your deploy logic
  })
  .build()
```

## ⚙️ Configuration

Create `.go-workflow.config.js` in your project root:

```javascript
export default {
  project: {
    type: 'library', // 'library' | 'cli' | 'web-app' | 'api'
    packageManager: 'bun' // 'bun' | 'npm' | 'yarn' | 'pnpm'
  },

  git: {
    defaultBranch: 'main',
    autoInit: true,
    branchNaming: {
      feature: 'feature/{name}',
      bugfix: 'bugfix/{name}',
      hotfix: 'hotfix/{name}'
    }
  },

  deployments: {
    npm: {
      enabled: true,
      access: 'public'
    },
    cloudflare: {
      enabled: true,
      buildCommand: 'npm run build'
    }
  },

  github: {
    autoRelease: true,
    pullRequests: {
      autoMerge: true,
      deleteBranch: true
    }
  },

  errorHandling: {
    autoFix: true,
    interactive: true,
    retryAttempts: 3
  },

  cli: {
    showProgress: true,
    colorOutput: true,
    verboseLogging: false
  },

  hooks: {
    beforeRelease: [],
    afterRelease: [],
    onError: []
  }
}
```

### Configuration Options

**Project Settings**
- `project.type`: Project type for optimized workflows
- `project.packageManager`: Preferred package manager

**Git Configuration**
- `git.defaultBranch`: Default branch name (default: 'main')
- `git.autoInit`: Auto-initialize Git repository (default: true)
- `git.branchNaming`: Branch naming conventions

**Error Handling**
- `errorHandling.autoFix`: Enable automatic error fixes (default: true)
- `errorHandling.interactive`: Show interactive error recovery options (default: true)
- `errorHandling.retryAttempts`: Number of retry attempts for failed operations (default: 3)

**CLI Options**
- `cli.showProgress`: Show progress indicators (default: true)
- `cli.colorOutput`: Enable colored output (default: true)
- `cli.verboseLogging`: Enable verbose logging (default: false)

**Hooks System**
- `hooks.beforeRelease`: Commands to run before release
- `hooks.afterRelease`: Commands to run after release
- `hooks.onError`: Commands to run on error

### Configuration Loading

The workflow system supports multiple configuration formats:

1. **JavaScript**: `.go-workflow.config.js` (ES modules)
2. **TypeScript**: `.go-workflow.config.ts` (with ts-node)
3. **JSON**: `.go-workflow.config.json`
4. **Package.json**: `"workflow"` field in package.json

Configuration files are loaded in order of preference, with later files overriding earlier ones.

## 🔧 Requirements

- **Node.js**: >= 18.0.0
- **Git**: For version control operations
- **GitHub CLI** *(optional)*: For GitHub integrations (`gh` command)
- **Wrangler** *(optional)*: For Cloudflare deployments

## 🏢 Enterprise Features

### **📊 Multi-Project Consistency**
Install once, use everywhere. Same commands and behavior across all your projects with enterprise-grade reliability.

### **🛡️ Quality Gates with Auto-Recovery**
Enforces code quality before any release with intelligent error recovery:
- **Auto-Fix Linting**: Automatically detects and fixes linting issues
- **TypeScript Checking**: Comprehensive type validation with graceful fallbacks
- **Test Execution**: Smart test running with coverage reporting
- **Build Verification**: Automated build validation and error recovery

### **🛡️ Enhanced Error Handling & Recovery**
Comprehensive error handling system with intelligent recovery:
- **Structured Error Display**: Professional error formatting with categories and suggestions
- **Auto-Fix Capabilities**: Automatically detects and fixes common issues (linting, dependencies, build errors)
- **Interactive Recovery**: User-friendly prompts for error resolution
- **Error Categorization**: Git, NPM, build, network, auth, and unknown error types
- **Context Preservation**: Detailed error context for debugging and support

### **📊 Smart Version Management**
- **Semantic Versioning**: Git analysis with conventional commits parsing
- **Automatic Changelog**: Professional changelog generation with categorization
- **Git Tagging**: Proper annotations with release metadata
- **Release Notes**: Automated GitHub release notes with assets

### **🌐 Multi-Platform Deployment Pipeline**
- **npm Registry**: Publishing with OTP support and error recovery
- **Cloudflare Workers/Pages**: Automated deployment with monitoring
- **GitHub Releases**: Professional releases with asset management
- **Extensible Targets**: Plugin system ready for custom deployment platforms

### **🚀 Performance & Reliability**
- **Concurrent Operations**: Optimized parallel processing where safe
- **Lazy Loading**: Heavy dependencies loaded only when needed
- **Error Resilience**: Non-fatal deployment failures with clear guidance
- **Resource Optimization**: Minimal memory footprint and fast startup times

## 🏢 Enterprise Architecture

### **Core System Design**
This is an enterprise-grade TypeScript workflow automation tool with a modular architecture:

**Core Engine (`src/core/`)**
- `TaskEngine` - Native listr2 integration for beautiful progress UI, hierarchical tasks, concurrent execution support
- `GitStore` - Complete Git operations wrapper using simple-git, includes AI-powered suggestions for branch names and commit messages

**Workflow System (`src/workflows/`)**
- `ReleaseWorkflow` - Multi-stage release pipeline: Quality Gates → Git Operations → Deployments
- Declarative workflow definitions using WorkflowStep interface
- Extensible step system with subtasks, skip conditions, retry logic

**Plugin Architecture (`src/plugins/`)**
- Plugin system for custom workflow extensions
- Hook system for workflow events (before/after steps, error handling)

### **Key Architectural Patterns**

**Task Orchestration**
- Workflows are composed of WorkflowSteps with title, task function, subtasks
- TaskEngine converts these to native listr2 ListrTasks
- Context object flows between steps maintaining state

**Git-First Design**
- All operations are Git-aware with repository analysis
- Conventional commit parsing for semantic versioning
- Branch management with naming conventions (feature/, bugfix/, hotfix/)

**Enterprise Features**
- Quality gates enforced before any release (lint, typecheck, tests)
- Multi-platform deployment (npm, Cloudflare, GitHub releases)
- Fallback strategy: bun → npm → direct tools (bunx/npx)
- Interactive workflow with upfront configuration
- Crash-proof execution with error resilience

**Error Handling Strategy**
- **Structured Error System**: Professional error categorization (Git, NPM, build, network, auth, unknown)
- **Interactive Error Recovery**: User-friendly prompts with actionable suggestions
- **Auto-Fix Capabilities**: Automated detection and fixing of common issues
- **Context Preservation**: Detailed error context for debugging and support
- **Graceful Degradation**: Non-fatal deployment failures with clear guidance
- **Crash Prevention**: All interactive prompts moved upfront to prevent mid-workflow freezing
- **Custom Error Types**: WorkflowError with category, code, suggestions, and context
- **Comprehensive Recovery**: Uncommitted changes and deployment failures handled gracefully

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [G1](https://github.com/g-1-repo)

## 🆘 Support

- 📖 [Documentation](https://github.com/g-1-repo/workflow/wiki)
- 🐛 [Issue Tracker](https://github.com/g-1-repo/workflow/issues)
- 💬 [Discussions](https://github.com/g-1-repo/workflow/discussions)
- 🔧 [Troubleshooting Guide](TROUBLESHOOTING.md)

---

## 🔥 Enterprise-Ready Workflow System

**This badass enterprise workflow system represents the pinnacle of release automation technology.**

The combination of:
- 📊 **Beautiful UX** with native listr2 integration
- 🔧 **Intelligent Error Recovery** with automated fixes
- 🔍 **Enhanced Error Visibility** with professional styling
- 📊 **Smart Monitoring** with GitHub Actions integration
- ⚡ **Multi-Platform Support** with bun-first architecture
- 🛡️ **Quality Gates** with comprehensive validation
- 📊 **Professional Reliability** with crash-proof execution

Makes this **production-ready for any scale** and suitable as the backbone of major development organizations.

**Built with ❤️ for enterprise development teams who demand excellence** 🚀
