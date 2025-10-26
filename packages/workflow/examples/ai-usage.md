# AI-Powered Development Examples

This document provides comprehensive examples of using the AI-powered features in @g-1/workflow.

## 🤖 AI Changelog Generation

### Basic Usage

Generate a changelog from recent commits:

```bash
# Analyze recent commits and generate changelog
workflow ai changelog

# Analyze specific number of commits
workflow ai changelog --since HEAD~10

# Generate changelog in JSON format
workflow ai changelog --format json

# Preview changelog without writing to file
workflow ai changelog --dry-run
```

### Example Output

**Markdown Format:**
```markdown
# Changelog

## [Unreleased]

### ✨ Features
- Add AI-powered changelog generation
- Implement framework detection system
- Add WebSocket deployment service

### 🐛 Bug Fixes
- Fix initialization error in AI service
- Resolve framework detection method calls

### 🔧 Improvements
- Update CLI command structure
- Enhance error handling in deployment service
```

**JSON Format:**
```json
[
  {
    "type": "feature",
    "description": "Add AI-powered changelog generation",
    "commit": "abc123",
    "breaking": false
  },
  {
    "type": "fix", 
    "description": "Fix initialization error in AI service",
    "commit": "def456",
    "breaking": false
  }
]
```

## 📊 Version Bump Suggestions

### Basic Usage

Get AI recommendations for version bumps:

```bash
# Analyze changes and suggest version bump
workflow ai version

# Preview suggestions without applying
workflow ai version --dry-run
```

### Example Output

```
🤖 AI Version Analysis

Current Version: 1.2.3
Recommended Bump: minor → 1.3.0
Confidence: 85.0%

Reasoning: New features added

Detected Changes:
  ✨ 3 new features
  🐛 2 bug fixes
  📝 1 documentation update

Recommendation: This release introduces new functionality 
without breaking existing APIs. A minor version bump is appropriate.
```

## 🔍 Impact Analysis

### Basic Usage

Analyze the impact of changes across packages:

```bash
# Analyze impact of recent changes
workflow ai impact

# Analyze specific commit range
workflow ai impact --since HEAD~5
```

### Example Output

```
🔍 Cross-Package Impact Analysis

Risk Level: MEDIUM

Analysis Summary:
- Analyzed 3 commits since HEAD~1
- Detected changes in core services
- Potential impact on dependent packages

Recommendations:
- Review breaking changes in AI service
- Update dependent package versions
- Run integration tests before release
```

## 🛠️ Programmatic Usage

### Using AI Service in Code

```typescript
import { AIService } from '@g-1/workflow'
import { simpleGit } from 'simple-git'

const aiService = new AIService()
const git = simpleGit()

// Generate changelog
const commits = await git.log({ from: 'HEAD~10', to: 'HEAD' })
const changelogEntries = commits.all.map(commit => ({
  hash: commit.hash,
  message: commit.message,
  author: commit.author_name,
  date: commit.date
}))

const changelog = await aiService.generateChangelog(changelogEntries)
console.log('Generated changelog:', changelog)

// Get version suggestions
const packages = [{ name: 'my-package', version: '1.0.0' }]
const suggestions = await aiService.suggestVersionBumps(changelogEntries, packages)
console.log('Version suggestions:', suggestions)

// Analyze impact
const impact = await aiService.analyzeImpact(changelogEntries, packages)
console.log('Impact analysis:', impact)
```

### Custom Changelog Processing

```typescript
import { AIService } from '@g-1/workflow'
import fs from 'fs/promises'

const aiService = new AIService()

// Custom commit processing
const processCommits = async (commits) => {
  const changelog = await aiService.generateChangelog(commits)
  
  // Custom formatting
  const formattedChangelog = changelog.map(entry => ({
    ...entry,
    formattedDate: new Date(entry.date).toLocaleDateString(),
    category: entry.type.toUpperCase()
  }))
  
  // Write to custom location
  await fs.writeFile('RELEASE_NOTES.md', JSON.stringify(formattedChangelog, null, 2))
  
  return formattedChangelog
}
```

## 🎯 Best Practices

### 1. Commit Message Conventions

For best AI analysis results, use conventional commit messages:

```bash
feat: add new user authentication system
fix: resolve memory leak in data processing
docs: update API documentation
refactor: simplify error handling logic
test: add unit tests for user service
```

### 2. Regular Analysis

Run AI analysis regularly during development:

```bash
# Daily changelog review
workflow ai changelog --since HEAD~5 --dry-run

# Pre-release version check
workflow ai version --dry-run

# Impact assessment before merging
workflow ai impact --since feature-branch
```

### 3. Integration with CI/CD

Add AI analysis to your CI/CD pipeline:

```yaml
# .github/workflows/ai-analysis.yml
name: AI Analysis
on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install -g @g-1/workflow
      - name: Run AI analysis
        run: |
          workflow ai changelog --dry-run
          workflow ai version --dry-run
          workflow ai impact
```

### 4. Configuration Optimization

Optimize AI features in your workflow config:

```javascript
// .go-workflow.config.js
export default {
  features: {
    aiAssistance: {
      enabled: true,
      provider: 'openai',
      model: 'gpt-4',
      features: {
        changelog: true,
        versionSuggestions: true,
        impactAnalysis: true
      }
    }
  }
}
```

## 🚀 Advanced Usage

### Custom AI Prompts

Extend AI functionality with custom analysis:

```typescript
import { AIService } from '@g-1/workflow'

const aiService = new AIService()

// Custom analysis prompt
const customAnalysis = await aiService.analyzeCustom(
  commits,
  'Analyze these commits for security implications and suggest security improvements'
)
```

### Batch Processing

Process multiple projects:

```typescript
const projects = ['project-a', 'project-b', 'project-c']

for (const project of projects) {
  const projectPath = `./packages/${project}`
  const git = simpleGit(projectPath)
  const commits = await git.log({ from: 'HEAD~5', to: 'HEAD' })
  
  const changelog = await aiService.generateChangelog(commits.all)
  await fs.writeFile(`${projectPath}/CHANGELOG.md`, changelog)
}
```

## 📈 Monitoring and Analytics

Track AI analysis effectiveness:

```typescript
// Track suggestion accuracy
const trackSuggestions = async (suggestions) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    suggestions: suggestions.length,
    confidence: suggestions.reduce((acc, s) => acc + s.confidence, 0) / suggestions.length,
    applied: 0 // Track manually
  }
  
  await fs.appendFile('ai-metrics.json', JSON.stringify(metrics) + '\n')
}
```