# Framework Detection Examples

This document provides comprehensive examples of using the framework detection features in @g-1/workflow.

## 🔍 Framework Detection

### Basic Usage

Detect frameworks in your project:

```bash
# Detect frameworks in current directory
workflow framework detect

# Output results in JSON format
workflow framework detect --json

# Detect frameworks from specific directory
cd /path/to/project && workflow framework detect
```

### Example Output

**Table Format:**
```
┌  🔍 Framework Detection
│
ℹ  Scanning project for frameworks...

Detected Frameworks:
  ✓ SvelteKit (v^2.8.1)
    Path: docs
    Config: svelte.config.js, vite.config.ts
    
  ✓ React (v^18.2.0)
    Path: packages/frontend
    Config: vite.config.ts, tsconfig.json
    
  ✓ Next.js (v^14.0.0)
    Path: apps/web
    Config: next.config.js, tsconfig.json

│
└  ✓ Detection complete
```

**JSON Format:**
```json
[
  {
    "package": "docs",
    "framework": {
      "name": "SvelteKit",
      "version": "^2.8.1",
      "type": "hybrid",
      "buildCommand": "vite build",
      "outputDir": "build",
      "devCommand": "vite dev",
      "configFiles": ["svelte.config.js", "vite.config.ts"],
      "dependencies": ["@sveltejs/kit", "svelte"],
      "deploymentStrategy": {
        "type": "static",
        "platforms": ["vercel", "netlify", "cloudflare"],
        "buildOutputs": ["build"],
        "environmentVariables": ["PUBLIC_*"],
        "healthCheckPath": "/",
        "previewCommand": "vite preview"
      }
    }
  }
]
```

## 🏗️ Supported Frameworks

### React Ecosystem

**Create React App:**
```bash
# Detects CRA projects
npx create-react-app my-app
cd my-app
workflow framework detect
# Output: React (Create React App) detected
```

**Vite + React:**
```bash
# Detects Vite React projects
npm create vite@latest my-react-app -- --template react
cd my-react-app
workflow framework detect
# Output: React (Vite) detected
```

**Next.js:**
```bash
# Detects Next.js projects
npx create-next-app@latest my-next-app
cd my-next-app
workflow framework detect
# Output: Next.js detected with deployment recommendations
```

### Vue Ecosystem

**Vue CLI:**
```bash
# Detects Vue CLI projects
vue create my-vue-app
cd my-vue-app
workflow framework detect
# Output: Vue (CLI) detected
```

**Nuxt.js:**
```bash
# Detects Nuxt projects
npx nuxi@latest init my-nuxt-app
cd my-nuxt-app
workflow framework detect
# Output: Nuxt.js detected with SSR configuration
```

**Vite + Vue:**
```bash
# Detects Vite Vue projects
npm create vite@latest my-vue-app -- --template vue
cd my-vue-app
workflow framework detect
# Output: Vue (Vite) detected
```

### Svelte Ecosystem

**SvelteKit:**
```bash
# Detects SvelteKit projects
npm create svelte@latest my-sveltekit-app
cd my-sveltekit-app
workflow framework detect
# Output: SvelteKit detected with adapter information
```

### Angular

**Angular CLI:**
```bash
# Detects Angular projects
ng new my-angular-app
cd my-angular-app
workflow framework detect
# Output: Angular detected with CLI configuration
```

## 🚀 Deployment Recommendations

### Platform-Specific Recommendations

**Static Site Deployment:**
```json
{
  "deploymentStrategy": {
    "type": "static",
    "platforms": ["vercel", "netlify", "cloudflare", "github-pages"],
    "buildOutputs": ["dist", "build"],
    "environmentVariables": ["VITE_*", "REACT_APP_*"],
    "healthCheckPath": "/",
    "previewCommand": "npm run preview"
  }
}
```

**Server-Side Rendering:**
```json
{
  "deploymentStrategy": {
    "type": "serverless",
    "platforms": ["vercel", "netlify", "railway"],
    "buildOutputs": [".next", ".nuxt", "build"],
    "environmentVariables": ["NODE_ENV", "DATABASE_URL"],
    "healthCheckPath": "/api/health",
    "previewCommand": "npm run start"
  }
}
```

**Full-Stack Applications:**
```json
{
  "deploymentStrategy": {
    "type": "server",
    "platforms": ["railway", "render", "digitalocean"],
    "buildOutputs": ["dist", "build"],
    "environmentVariables": ["PORT", "DATABASE_URL", "JWT_SECRET"],
    "healthCheckPath": "/health",
    "previewCommand": "npm run start"
  }
}
```

## 🛠️ Programmatic Usage

### Using Framework Detector in Code

```typescript
import { FrameworkDetector } from '@g-1/workflow'

const detector = new FrameworkDetector()

// Detect frameworks in current directory
const frameworks = await detector.detectAllFrameworks()

// Detect framework in specific package
const framework = await detector.detectFramework('./packages/frontend')

// Get deployment recommendations
const recommendations = detector.getDeploymentRecommendations(frameworks)

console.log('Detected frameworks:', frameworks)
console.log('Deployment recommendations:', recommendations)
```

### Custom Workspace Patterns

```typescript
import { FrameworkDetector } from '@g-1/workflow'

const detector = new FrameworkDetector('/path/to/monorepo')

// Custom workspace patterns
const workspacePatterns = [
  'packages/*',
  'apps/*',
  'services/*',
  'frontend',
  'backend',
  'docs'
]

const frameworks = await detector.detectAllFrameworks(workspacePatterns)
```

### Framework-Specific Logic

```typescript
import { FrameworkDetector } from '@g-1/workflow'

const detector = new FrameworkDetector()
const frameworks = await detector.detectAllFrameworks()

for (const [packagePath, framework] of frameworks) {
  switch (framework.name) {
    case 'Next.js':
      console.log(`Next.js app at ${packagePath}`)
      console.log(`Build command: ${framework.buildCommand}`)
      console.log(`Recommended platforms: ${framework.deploymentStrategy.platforms.join(', ')}`)
      break
      
    case 'SvelteKit':
      console.log(`SvelteKit app at ${packagePath}`)
      console.log(`Adapter type: ${framework.deploymentStrategy.type}`)
      break
      
    case 'React':
      console.log(`React app at ${packagePath}`)
      console.log(`Framework type: ${framework.type}`)
      break
  }
}
```

## 🎯 Monorepo Support

### Workspace Detection

The framework detector automatically scans common monorepo patterns:

```
my-monorepo/
├── packages/
│   ├── frontend/          # React app
│   ├── backend/           # Node.js API
│   └── shared/            # Shared utilities
├── apps/
│   ├── web/               # Next.js app
│   ├── mobile/            # React Native
│   └── admin/             # Vue admin panel
├── docs/                  # SvelteKit docs
└── services/
    ├── api/               # Express API
    └── worker/            # Cloudflare Worker
```

### Configuration for Monorepos

```javascript
// .go-workflow.config.js
export default {
  features: {
    frameworkDetection: {
      enabled: true,
      workspacePatterns: [
        'packages/*',
        'apps/*',
        'services/*',
        'docs',
        'frontend',
        'backend'
      ]
    }
  }
}
```

## 🔧 Advanced Configuration

### Custom Framework Detection

```typescript
import { FrameworkDetector, FrameworkInfo } from '@g-1/workflow'

class CustomFrameworkDetector extends FrameworkDetector {
  async detectCustomFramework(packagePath: string): Promise<FrameworkInfo | null> {
    const packageJson = this.getPackageJson(packagePath)
    
    if (packageJson?.dependencies?.['my-custom-framework']) {
      return {
        name: 'Custom Framework',
        version: packageJson.dependencies['my-custom-framework'],
        type: 'spa',
        buildCommand: 'npm run build',
        outputDir: 'dist',
        devCommand: 'npm run dev',
        configFiles: ['custom.config.js'],
        dependencies: ['my-custom-framework'],
        deploymentStrategy: {
          type: 'static',
          platforms: ['custom-platform'],
          buildOutputs: ['dist'],
          healthCheckPath: '/'
        }
      }
    }
    
    return null
  }
}
```

### Integration with CI/CD

```yaml
# .github/workflows/framework-detection.yml
name: Framework Detection
on: [push, pull_request]

jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install workflow CLI
        run: npm install -g @g-1/workflow
      - name: Detect frameworks
        run: workflow framework detect --json > frameworks.json
      - name: Upload framework info
        uses: actions/upload-artifact@v3
        with:
          name: framework-detection
          path: frameworks.json
```

### Deployment Automation

```typescript
import { FrameworkDetector } from '@g-1/workflow'

const detector = new FrameworkDetector()
const frameworks = await detector.detectAllFrameworks()
const recommendations = detector.getDeploymentRecommendations(frameworks)

// Auto-generate deployment configs
for (const rec of recommendations) {
  const { package: pkg, framework, recommendations: recs } = rec
  
  if (framework.name === 'Next.js') {
    // Generate Vercel config
    const vercelConfig = {
      name: pkg,
      buildCommand: framework.buildCommand,
      outputDirectory: framework.outputDir,
      framework: 'nextjs'
    }
    
    await fs.writeFile(`${pkg}/vercel.json`, JSON.stringify(vercelConfig, null, 2))
  }
  
  if (framework.name === 'SvelteKit') {
    // Generate Netlify config
    const netlifyConfig = {
      build: {
        command: framework.buildCommand,
        publish: framework.outputDir
      }
    }
    
    await fs.writeFile(`${pkg}/netlify.toml`, toml.stringify(netlifyConfig))
  }
}
```

## 📊 Analytics and Reporting

### Framework Usage Analytics

```typescript
import { FrameworkDetector } from '@g-1/workflow'

const detector = new FrameworkDetector()
const frameworks = await detector.detectAllFrameworks()

// Generate usage report
const report = {
  totalPackages: frameworks.size,
  frameworkBreakdown: {},
  deploymentTypes: {},
  timestamp: new Date().toISOString()
}

for (const [pkg, framework] of frameworks) {
  // Count frameworks
  report.frameworkBreakdown[framework.name] = 
    (report.frameworkBreakdown[framework.name] || 0) + 1
    
  // Count deployment types
  report.deploymentTypes[framework.deploymentStrategy.type] = 
    (report.deploymentTypes[framework.deploymentStrategy.type] || 0) + 1
}

console.log('Framework Usage Report:', report)
```

### Health Check Generation

```typescript
// Generate health checks for detected frameworks
for (const [pkg, framework] of frameworks) {
  const healthCheck = `
#!/bin/bash
# Health check for ${framework.name} in ${pkg}

if curl -f ${framework.deploymentStrategy.healthCheckPath || '/'}; then
  echo "✅ ${pkg} is healthy"
  exit 0
else
  echo "❌ ${pkg} is unhealthy"
  exit 1
fi
`
  
  await fs.writeFile(`${pkg}/health-check.sh`, healthCheck)
  await fs.chmod(`${pkg}/health-check.sh`, '755')
}
```