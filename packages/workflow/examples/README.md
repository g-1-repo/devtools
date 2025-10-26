# Usage Examples

This directory contains comprehensive examples for using `@g-1/workflow`'s AI-powered and framework detection features.

## 📚 Available Examples

### [AI Usage Examples](./ai-usage.md)
Learn how to leverage AI-powered features for intelligent development workflows:
- **AI Changelog Generation** - Automatically generate meaningful changelogs from commits
- **Version Bump Suggestions** - Get intelligent version recommendations based on changes
- **Impact Analysis** - Understand the scope and risk of your changes
- **Programmatic Usage** - Integrate AI features into your own tools
- **Best Practices** - Tips for optimal AI-assisted development

### [Framework Detection Examples](./framework-detection.md)
Discover how to detect and analyze frameworks across your projects:
- **CLI Usage** - Command-line framework detection and analysis
- **Supported Frameworks** - React, Vue, Svelte, Angular, and more
- **Deployment Recommendations** - Get framework-specific deployment strategies
- **Monorepo Support** - Detect frameworks across complex project structures
- **Programmatic API** - Build custom tools with framework detection

### [Integration Examples](./integration-examples.md)
See how to combine AI and framework features for powerful workflows:
- **Smart Release Pipeline** - AI-powered releases with framework awareness
- **Framework-Aware Deployment** - Deploy based on detected frameworks and AI analysis
- **Monorepo Management** - Intelligent package updates across multiple frameworks
- **CI/CD Integration** - Complete GitHub Actions workflows
- **Monitoring & Analytics** - Track deployment health and performance

## 🚀 Quick Start

1. **Install the package:**
   ```bash
   npm install -g @g-1/workflow
   ```

2. **Try AI features:**
   ```bash
   # Generate changelog from recent commits
   workflow ai changelog
   
   # Get version suggestions
   workflow ai version
   
   # Analyze impact of changes
   workflow ai impact
   ```

3. **Detect frameworks:**
   ```bash
   # Detect frameworks in current directory
   workflow framework detect
   
   # Get detailed analysis with deployment recommendations
   workflow framework detect --detailed
   
   # Output as JSON for programmatic use
   workflow framework detect --json
   ```

4. **Combine features:**
   ```bash
   # Smart release with AI analysis and framework detection
   workflow release --ai-enhanced
   ```

## 🎯 Use Cases

### For Individual Developers
- **Smart Commits**: Use AI to generate meaningful commit messages and changelogs
- **Version Management**: Get intelligent version bump suggestions
- **Framework Setup**: Quickly understand and configure detected frameworks

### For Teams
- **Consistent Releases**: Standardize release processes with AI-generated changelogs
- **Risk Assessment**: Analyze impact before deploying changes
- **Framework Standards**: Ensure consistent framework usage across projects

### For Organizations
- **Monorepo Management**: Handle complex multi-framework repositories
- **Automated Pipelines**: Build intelligent CI/CD workflows
- **Deployment Strategies**: Framework-aware deployment automation

## 🔧 Configuration

Most examples can be customized through the `.go-workflow.config.js` file:

```javascript
export default {
  // AI Configuration
  features: {
    aiAssistance: {
      enabled: true,
      provider: 'openai', // or 'anthropic'
      model: 'gpt-4',
      features: {
        changelog: true,
        versionSuggestions: true,
        impactAnalysis: true
      }
    },
    frameworkDetection: {
      enabled: true,
      workspacePatterns: [
        'packages/*',
        'apps/*',
        'services/*'
      ]
    }
  }
}
```

## 📖 Additional Resources

- [Main README](../README.md) - Complete package documentation
- [API Documentation](../docs/api.md) - Detailed API reference
- [Configuration Guide](../docs/configuration.md) - Advanced configuration options
- [Contributing](../CONTRIBUTING.md) - How to contribute to the project

## 💡 Tips

1. **Start Simple**: Begin with basic CLI commands before moving to programmatic usage
2. **Combine Features**: The real power comes from combining AI analysis with framework detection
3. **Customize Patterns**: Adjust workspace patterns to match your project structure
4. **Monitor Performance**: Use the analytics examples to track and optimize your workflows
5. **Iterate**: Use AI suggestions as starting points and refine based on your needs

## 🤝 Community

- Share your own examples and use cases
- Report issues or request new features
- Contribute improvements to existing examples

Happy coding with intelligent workflows! 🚀