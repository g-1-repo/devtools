# Troubleshooting Guide

This guide helps you resolve common issues with the @g-1/workflow system.

## 🚨 Common Issues

### Git Issues

#### "Not a git repository" Error
```bash
Error: Not a git repository (or any of the parent directories): .git
Category: git
Code: NOT_GIT_REPO
```

**Solutions:**
1. Initialize a Git repository: `git init`
2. Use `workflow init` to set up Git automatically
3. Navigate to the correct project directory

#### "No commits found" Error
```bash
Error: No commits found in repository
Category: git
Code: NO_COMMITS
```

**Solutions:**
1. Make your first commit: `git add . && git commit -m "Initial commit"`
2. Use `workflow init` which handles initial setup
3. Check if you're in the correct branch

#### "Uncommitted changes" Warning
```bash
Warning: Uncommitted changes detected
```

**Solutions:**
1. Commit changes: `git add . && git commit -m "Your message"`
2. Use `workflow release --force` to proceed anyway
3. Use interactive mode to commit changes during workflow

### NPM/Package Issues

#### "Package not found" Error
```bash
Error: Package @your-package/name not found
Category: npm
Code: PACKAGE_NOT_FOUND
```

**Solutions:**
1. Check package name in `package.json`
2. Ensure you're logged into npm: `npm login`
3. Verify package exists: `npm view @your-package/name`

#### "Authentication required" Error
```bash
Error: Authentication required for npm publish
Category: auth
Code: NPM_AUTH_REQUIRED
```

**Solutions:**
1. Login to npm: `npm login`
2. Check npm token: `npm whoami`
3. Verify registry URL: `npm config get registry`

#### "OTP required" Error
```bash
Error: This operation requires a one-time password
Category: auth
Code: OTP_REQUIRED
```

**Solutions:**
1. Use `npm publish --otp=123456` with your OTP
2. Configure npm with OTP: `npm config set otp 123456`
3. Use interactive mode for OTP prompts

### Build Issues

#### "Build failed" Error
```bash
Error: Build command failed with exit code 1
Category: build
Code: BUILD_FAILED
```

**Solutions:**
1. Run build manually: `npm run build` or `bun run build`
2. Check build script in `package.json`
3. Resolve TypeScript errors: `npx tsc --noEmit`
4. Fix linting issues: `npm run lint --fix`

#### "TypeScript errors" Error
```bash
Error: TypeScript compilation failed
Category: build
Code: TYPESCRIPT_ERROR
```

**Solutions:**
1. Fix TypeScript errors: `npx tsc --noEmit`
2. Update TypeScript configuration
3. Install missing type definitions
4. Use `--skip-typecheck` flag to bypass (not recommended)

### Network Issues

#### "Connection timeout" Error
```bash
Error: Request timeout after 30000ms
Category: network
Code: TIMEOUT
```

**Solutions:**
1. Check internet connection
2. Try again later (server might be down)
3. Use VPN if behind corporate firewall
4. Increase timeout in configuration

#### "Registry unreachable" Error
```bash
Error: Cannot reach npm registry
Category: network
Code: REGISTRY_UNREACHABLE
```

**Solutions:**
1. Check npm registry: `npm config get registry`
2. Try different registry: `npm config set registry https://registry.npmjs.org/`
3. Check firewall/proxy settings
4. Use `--registry` flag with alternative registry

### Configuration Issues

#### "Invalid configuration" Error
```bash
Error: Configuration validation failed
Category: config
Code: INVALID_CONFIG
```

**Solutions:**
1. Check `.go-workflow.config.js` syntax
2. Validate against schema using `workflow validate-config`
3. Use `workflow init --force` to recreate configuration
4. Check for typos in configuration keys

#### "Configuration not found" Error
```bash
Error: No configuration file found
Category: config
Code: CONFIG_NOT_FOUND
```

**Solutions:**
1. Create configuration: `workflow init`
2. Use default configuration: `workflow init --skip-config`
3. Check file name: `.go-workflow.config.js`
4. Ensure file is in project root

## 🔧 Auto-Fix Features

The workflow system includes intelligent auto-fix capabilities:

### Automatic Fixes
- **Linting Issues**: Runs `eslint --fix` or equivalent
- **Formatting**: Applies Prettier formatting
- **Dependencies**: Installs missing dependencies
- **Git Setup**: Initializes repository and makes initial commit
- **Configuration**: Creates default configuration files

### Manual Intervention Required
- **TypeScript Errors**: Requires code changes
- **Test Failures**: Requires fixing test logic
- **Authentication**: Requires login credentials
- **Network Issues**: Requires connectivity fixes

## 🐛 Debugging

### Enable Verbose Logging
```bash
workflow release --verbose
```

### Check System Status
```bash
workflow status
```

### Validate Configuration
```bash
workflow validate-config
```

### Debug Mode
```bash
DEBUG=workflow:* workflow release
```

## 📞 Getting Help

### Error Context
When reporting issues, include:
- Full error message with category and code
- Command that caused the error
- Project configuration (`.go-workflow.config.js`)
- Environment details (Node.js version, OS, etc.)

### Support Channels
- 🐛 [Issue Tracker](https://github.com/g-1-repo/workflow/issues)
- 💬 [Discussions](https://github.com/g-1-repo/workflow/discussions)
- 📖 [Documentation](https://github.com/g-1-repo/workflow/wiki)

### Common Environment Issues

#### Node.js Version
Ensure Node.js >= 18.0.0:
```bash
node --version
```

#### Package Manager
Check your package manager:
```bash
bun --version  # Preferred
npm --version  # Fallback
```

#### Git Configuration
Verify Git setup:
```bash
git config --global user.name
git config --global user.email
```

## 🔄 Recovery Procedures

### Reset Workflow State
```bash
# Clean build artifacts
rm -rf dist/ build/ .next/

# Reset Git state (careful!)
git reset --hard HEAD

# Reinstall dependencies
rm -rf node_modules/
bun install  # or npm install
```

### Emergency Release
If workflow is stuck, manual release:
```bash
# 1. Ensure clean state
git status

# 2. Update version
npm version patch  # or minor/major

# 3. Build project
bun run build

# 4. Publish manually
npm publish

# 5. Create GitHub release
gh release create v$(node -p "require('./package.json').version")
```

### Configuration Reset
```bash
# Backup existing config
cp .go-workflow.config.js .go-workflow.config.js.backup

# Create fresh config
workflow init --force

# Restore custom settings from backup
```

## 📊 Performance Issues

### Slow Builds
- Use `--skip-tests` for faster releases
- Enable build caching in your build tool
- Use `--parallel` flag where available

### Memory Issues
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Use `--no-concurrent` to reduce parallel operations
- Close other applications during workflow execution

### Network Timeouts
- Increase timeout in configuration
- Use local npm cache: `npm config set cache ~/.npm`
- Consider using npm proxy/mirror

---

*This troubleshooting guide is continuously updated. If you encounter an issue not covered here, please [open an issue](https://github.com/g-1-repo/workflow/issues) to help improve this guide.*