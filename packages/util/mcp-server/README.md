# @g-1/util MCP Server

This MCP (Model Context Protocol) server provides AI assistants with context about your available `@g-1/util` utilities and project information.

## What It Does

The MCP server automatically:
- ✅ Detects if `@g-1/util` is installed in the current project
- 📋 Provides detailed information about available utilities
- 🔍 Shows project context (name, directory, git status)
- 💡 Suggests when to use specific utilities
- 🚀 Gives usage examples and import statements

## Setup for Warp Terminal

### 1. Install the Package
```bash
npm install @g-1/util
# or
bun add @g-1/util
```

### 2. Configure Warp MCP
Add to your Warp MCP configuration:

```json
{
  "mcpServers": {
    "g1-util": {
      "command": "g1-util-mcp"
    }
  }
}
```

### 3. Test the Server
```bash
# Test directly
npx g1-util-mcp

# Or from any project with @g-1/util
g1-util-mcp
```

## What the AI Will Know

When you're in a project with `@g-1/util` installed, the AI assistant will automatically know about:

### 🔧 Git & Repository Management
- `analyzeChangesForVersionBump()` - Smart version bump detection
- `updateChangelog()` - Automated changelog generation
- `getCurrentBranch()`, `hasUncommittedChanges()` - Git status
- `commitAndPush()` - Git automation

### 🎯 Interactive CLI Prompts
- `confirm()`, `select()`, `multiselect()` - User input
- `password()` - Secure input
- `ProgressIndicator` - Progress spinners

### 🎨 Terminal Enhancement
- `log()` with `COLORS` - Colored output
- All other utilities (string, date, object, array, etc.)

## Perfect For

The AI will suggest these utilities when you mention:
- **Release scripts** or automated releases
- **CLI tools** or command-line interfaces
- **Git workflows** or version management
- **Interactive prompts** or user input
- **Developer tooling** or build scripts
- **Terminal applications**

## Example AI Suggestions

When you say *"I need to create a release script"*, the AI will suggest:

```typescript
import {
  analyzeChangesForVersionBump,
  confirm,
  ProgressIndicator,
  updateChangelog
} from '@g-1/util'

// Your release automation code here
```

## Troubleshooting

### Server Not Starting
```bash
# Check if MCP SDK is installed
npm ls @modelcontextprotocol/sdk

# Rebuild the server
bun run build:mcp
```

### AI Not Seeing Context
1. Make sure Warp MCP is configured correctly
2. Restart Warp terminal
3. Check that you're in a project with `@g-1/util` installed

### Manual Testing
```bash
# Test the context generation
echo '{"jsonrpc": "2.0", "id": 1, "method": "resources/read", "params": {"uri": "context://g1-util"}}' | g1-util-mcp
```

The server will automatically detect your project setup and provide relevant context to the AI assistant!
