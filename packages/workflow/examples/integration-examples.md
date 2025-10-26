# Integration Examples

This document shows how to combine AI-powered features with framework detection for powerful development workflows.

## 🚀 Complete Development Workflow

### Smart Release Pipeline

Combine AI analysis with framework detection for intelligent releases:

```bash
#!/bin/bash
# smart-release.sh - Intelligent release workflow

echo "🤖 Starting AI-powered release workflow..."

# 1. Detect frameworks
echo "🔍 Detecting frameworks..."
FRAMEWORKS=$(workflow framework detect --json)
echo "Detected frameworks: $FRAMEWORKS"

# 2. Generate AI changelog
echo "📝 Generating changelog..."
workflow ai changelog --format json > changelog.json

# 3. Get version suggestions
echo "📊 Analyzing version requirements..."
workflow ai version --dry-run

# 4. Analyze impact
echo "🔍 Analyzing cross-package impact..."
workflow ai impact

# 5. Execute release if everything looks good
echo "🚀 Executing release..."
workflow release --non-interactive
```

### Framework-Aware Deployment

Use framework detection to customize deployment strategies:

```typescript
import { FrameworkDetector, AIService } from '@g-1/workflow'
import { simpleGit } from 'simple-git'

async function smartDeploy() {
  const detector = new FrameworkDetector()
  const aiService = new AIService()
  const git = simpleGit()
  
  // Detect frameworks
  const frameworks = await detector.detectAllFrameworks()
  console.log(`Detected ${frameworks.size} frameworks`)
  
  // Get recent changes
  const commits = await git.log({ from: 'HEAD~5', to: 'HEAD' })
  const changelogEntries = commits.all.map(commit => ({
    hash: commit.hash,
    message: commit.message,
    author: commit.author_name,
    date: commit.date
  }))
  
  // Analyze impact
  const packages = Array.from(frameworks.keys()).map(pkg => ({
    name: pkg,
    version: '1.0.0' // Get from package.json
  }))
  
  const impact = await aiService.analyzeImpact(changelogEntries, packages)
  console.log('Impact analysis:', impact)
  
  // Deploy based on framework and impact
  for (const [packagePath, framework] of frameworks) {
    console.log(`\n🚀 Deploying ${framework.name} at ${packagePath}`)
    
    const strategy = framework.deploymentStrategy
    const riskLevel = impact.riskLevel || 'LOW'
    
    if (riskLevel === 'HIGH') {
      console.log('⚠️  High risk detected - deploying to staging first')
      await deployToStaging(packagePath, framework)
    } else {
      console.log('✅ Low risk - deploying to production')
      await deployToProduction(packagePath, framework)
    }
  }
}

async function deployToStaging(packagePath: string, framework: any) {
  // Staging deployment logic
  console.log(`Deploying ${packagePath} to staging...`)
}

async function deployToProduction(packagePath: string, framework: any) {
  // Production deployment logic
  console.log(`Deploying ${packagePath} to production...`)
}

smartDeploy().catch(console.error)
```

## 🎯 Monorepo Management

### Intelligent Package Updates

Combine AI analysis with framework detection for smart package management:

```typescript
import { FrameworkDetector, AIService } from '@g-1/workflow'
import { execSync } from 'child_process'
import fs from 'fs/promises'

async function intelligentPackageUpdate() {
  const detector = new FrameworkDetector()
  const aiService = new AIService()
  
  // Detect all frameworks in monorepo
  const frameworks = await detector.detectAllFrameworks([
    'packages/*',
    'apps/*',
    'services/*'
  ])
  
  console.log(`Managing ${frameworks.size} packages`)
  
  for (const [packagePath, framework] of frameworks) {
    console.log(`\n📦 Analyzing ${packagePath} (${framework.name})`)
    
    // Get package-specific commits
    const commits = execSync(
      `git log --oneline -10 --pretty=format:"%h|%s|%an|%ad" --date=iso -- ${packagePath}`,
      { encoding: 'utf8' }
    ).split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|')
      return { hash, message, author, date }
    })
    
    if (commits.length === 0) {
      console.log('  No recent changes - skipping')
      continue
    }
    
    // AI analysis for this package
    const changelog = await aiService.generateChangelog(commits)
    const versionSuggestion = await aiService.suggestVersionBumps(commits, [{
      name: packagePath,
      version: '1.0.0' // Read from package.json
    }])
    
    console.log('  📝 Recent changes:', changelog.slice(0, 3))
    console.log('  📊 Version suggestion:', versionSuggestion[0]?.suggestedVersion)
    
    // Framework-specific actions
    switch (framework.name) {
      case 'Next.js':
        await handleNextJsUpdate(packagePath, framework, changelog)
        break
      case 'SvelteKit':
        await handleSvelteKitUpdate(packagePath, framework, changelog)
        break
      case 'React':
        await handleReactUpdate(packagePath, framework, changelog)
        break
    }
  }
}

async function handleNextJsUpdate(packagePath: string, framework: any, changelog: any[]) {
  console.log('  🔧 Next.js specific updates...')
  
  // Check for Next.js version updates
  const hasNextUpdate = changelog.some(entry => 
    entry.message?.toLowerCase().includes('next') ||
    entry.message?.toLowerCase().includes('react')
  )
  
  if (hasNextUpdate) {
    console.log('  📦 Updating Next.js dependencies...')
    execSync(`cd ${packagePath} && npm update next react react-dom`, { stdio: 'inherit' })
  }
}

async function handleSvelteKitUpdate(packagePath: string, framework: any, changelog: any[]) {
  console.log('  🔧 SvelteKit specific updates...')
  
  // Check for SvelteKit updates
  const hasSvelteUpdate = changelog.some(entry =>
    entry.message?.toLowerCase().includes('svelte') ||
    entry.message?.toLowerCase().includes('kit')
  )
  
  if (hasSvelteUpdate) {
    console.log('  📦 Updating SvelteKit dependencies...')
    execSync(`cd ${packagePath} && npm update @sveltejs/kit svelte`, { stdio: 'inherit' })
  }
}

async function handleReactUpdate(packagePath: string, framework: any, changelog: any[]) {
  console.log('  🔧 React specific updates...')
  
  // Check for React updates
  const hasReactUpdate = changelog.some(entry =>
    entry.message?.toLowerCase().includes('react') ||
    entry.message?.toLowerCase().includes('component')
  )
  
  if (hasReactUpdate) {
    console.log('  📦 Updating React dependencies...')
    execSync(`cd ${packagePath} && npm update react react-dom`, { stdio: 'inherit' })
  }
}

intelligentPackageUpdate().catch(console.error)
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

Complete CI/CD pipeline with AI and framework detection:

```yaml
# .github/workflows/intelligent-ci.yml
name: Intelligent CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    outputs:
      frameworks: ${{ steps.detect.outputs.frameworks }}
      changelog: ${{ steps.changelog.outputs.changelog }}
      version: ${{ steps.version.outputs.version }}
      impact: ${{ steps.impact.outputs.impact }}
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install workflow CLI
        run: npm install -g @g-1/workflow
      
      - name: Detect frameworks
        id: detect
        run: |
          FRAMEWORKS=$(workflow framework detect --json)
          echo "frameworks=$FRAMEWORKS" >> $GITHUB_OUTPUT
          echo "Detected frameworks: $FRAMEWORKS"
      
      - name: Generate AI changelog
        id: changelog
        run: |
          CHANGELOG=$(workflow ai changelog --format json --dry-run)
          echo "changelog=$CHANGELOG" >> $GITHUB_OUTPUT
      
      - name: Get version suggestions
        id: version
        run: |
          VERSION=$(workflow ai version --dry-run)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Analyze impact
        id: impact
        run: |
          IMPACT=$(workflow ai impact)
          echo "impact=$IMPACT" >> $GITHUB_OUTPUT

  test:
    needs: analyze
    runs-on: ubuntu-latest
    strategy:
      matrix:
        framework: ${{ fromJson(needs.analyze.outputs.frameworks) }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd ${{ matrix.framework.package }}
          npm ci
      
      - name: Run framework-specific tests
        run: |
          cd ${{ matrix.framework.package }}
          case "${{ matrix.framework.framework.name }}" in
            "Next.js")
              npm run test
              npm run build
              ;;
            "SvelteKit")
              npm run test
              npm run build
              ;;
            "React")
              npm run test
              npm run build
              ;;
            *)
              echo "Unknown framework: ${{ matrix.framework.framework.name }}"
              ;;
          esac

  deploy:
    needs: [analyze, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy based on impact analysis
        run: |
          IMPACT_LEVEL=$(echo '${{ needs.analyze.outputs.impact }}' | jq -r '.riskLevel')
          
          if [ "$IMPACT_LEVEL" = "HIGH" ]; then
            echo "High impact detected - deploying to staging first"
            # Deploy to staging
          else
            echo "Low/Medium impact - deploying to production"
            # Deploy to production
          fi
```

### Custom Deployment Script

Framework-aware deployment with AI insights:

```bash
#!/bin/bash
# intelligent-deploy.sh

set -e

echo "🤖 Starting intelligent deployment..."

# Get AI analysis
echo "📊 Running AI analysis..."
CHANGELOG=$(workflow ai changelog --format json --dry-run)
VERSION_SUGGESTION=$(workflow ai version --dry-run)
IMPACT=$(workflow ai impact)

# Get framework information
echo "🔍 Detecting frameworks..."
FRAMEWORKS=$(workflow framework detect --json)

# Parse impact level
IMPACT_LEVEL=$(echo "$IMPACT" | grep -o 'Risk Level: [A-Z]*' | cut -d' ' -f3)

echo "Impact Level: $IMPACT_LEVEL"

# Deploy based on impact and frameworks
if [ "$IMPACT_LEVEL" = "HIGH" ]; then
  echo "⚠️  High impact deployment detected"
  echo "📋 Changelog preview:"
  echo "$CHANGELOG" | jq -r '.[] | "- \(.type): \(.description)"'
  
  read -p "Continue with high-impact deployment? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
  fi
fi

# Deploy each framework
echo "$FRAMEWORKS" | jq -c '.[]' | while read -r framework; do
  PACKAGE=$(echo "$framework" | jq -r '.package')
  FRAMEWORK_NAME=$(echo "$framework" | jq -r '.framework.name')
  DEPLOYMENT_TYPE=$(echo "$framework" | jq -r '.framework.deploymentStrategy.type')
  PLATFORMS=$(echo "$framework" | jq -r '.framework.deploymentStrategy.platforms[]')
  
  echo "🚀 Deploying $FRAMEWORK_NAME at $PACKAGE"
  echo "   Type: $DEPLOYMENT_TYPE"
  echo "   Platforms: $PLATFORMS"
  
  cd "$PACKAGE"
  
  case "$FRAMEWORK_NAME" in
    "Next.js")
      echo "   Building Next.js app..."
      npm run build
      
      if echo "$PLATFORMS" | grep -q "vercel"; then
        echo "   Deploying to Vercel..."
        npx vercel --prod --yes
      fi
      ;;
      
    "SvelteKit")
      echo "   Building SvelteKit app..."
      npm run build
      
      if echo "$PLATFORMS" | grep -q "netlify"; then
        echo "   Deploying to Netlify..."
        npx netlify deploy --prod --dir=build
      fi
      ;;
      
    "React")
      echo "   Building React app..."
      npm run build
      
      if echo "$PLATFORMS" | grep -q "cloudflare"; then
        echo "   Deploying to Cloudflare Pages..."
        npx wrangler pages publish dist
      fi
      ;;
  esac
  
  cd ..
done

echo "✅ Intelligent deployment complete!"
```

## 📊 Monitoring and Analytics

### Deployment Health Monitoring

Monitor deployments with framework-specific health checks:

```typescript
import { FrameworkDetector } from '@g-1/workflow'
import axios from 'axios'

async function monitorDeployments() {
  const detector = new FrameworkDetector()
  const frameworks = await detector.detectAllFrameworks()
  
  const healthChecks = []
  
  for (const [packagePath, framework] of frameworks) {
    const healthCheckUrl = getHealthCheckUrl(packagePath, framework)
    
    if (healthCheckUrl) {
      healthChecks.push({
        package: packagePath,
        framework: framework.name,
        url: healthCheckUrl,
        expectedStatus: 200
      })
    }
  }
  
  console.log(`Monitoring ${healthChecks.length} deployments...`)
  
  for (const check of healthChecks) {
    try {
      const response = await axios.get(check.url, { timeout: 5000 })
      
      if (response.status === check.expectedStatus) {
        console.log(`✅ ${check.package} (${check.framework}) - Healthy`)
      } else {
        console.log(`⚠️  ${check.package} (${check.framework}) - Unexpected status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${check.package} (${check.framework}) - Error: ${error.message}`)
    }
  }
}

function getHealthCheckUrl(packagePath: string, framework: any): string | null {
  // Map package paths to deployment URLs
  const deploymentUrls = {
    'docs': 'https://docs.example.com',
    'packages/frontend': 'https://app.example.com',
    'apps/web': 'https://web.example.com'
  }
  
  const baseUrl = deploymentUrls[packagePath]
  if (!baseUrl) return null
  
  const healthPath = framework.deploymentStrategy.healthCheckPath || '/'
  return `${baseUrl}${healthPath}`
}

// Run monitoring every 5 minutes
setInterval(monitorDeployments, 5 * 60 * 1000)
monitorDeployments() // Initial run
```

### Performance Analytics

Track framework performance and AI suggestion accuracy:

```typescript
import { FrameworkDetector, AIService } from '@g-1/workflow'
import fs from 'fs/promises'

async function trackPerformanceMetrics() {
  const detector = new FrameworkDetector()
  const aiService = new AIService()
  
  const frameworks = await detector.detectAllFrameworks()
  const startTime = Date.now()
  
  // Track detection performance
  const detectionTime = Date.now() - startTime
  
  // Track AI analysis performance
  const aiStartTime = Date.now()
  const commits = [] // Get recent commits
  const changelog = await aiService.generateChangelog(commits)
  const aiTime = Date.now() - aiStartTime
  
  const metrics = {
    timestamp: new Date().toISOString(),
    detection: {
      frameworksFound: frameworks.size,
      detectionTimeMs: detectionTime,
      frameworkBreakdown: {}
    },
    ai: {
      changelogEntries: changelog.length,
      analysisTimeMs: aiTime
    }
  }
  
  // Count framework types
  for (const [pkg, framework] of frameworks) {
    const name = framework.name
    metrics.detection.frameworkBreakdown[name] = 
      (metrics.detection.frameworkBreakdown[name] || 0) + 1
  }
  
  // Save metrics
  const metricsFile = 'performance-metrics.jsonl'
  await fs.appendFile(metricsFile, JSON.stringify(metrics) + '\n')
  
  console.log('Performance metrics saved:', metrics)
}

// Run daily
setInterval(trackPerformanceMetrics, 24 * 60 * 60 * 1000)
```

This comprehensive integration approach combines the power of AI analysis with framework detection to create intelligent, automated development workflows that adapt to your specific technology stack and deployment requirements.