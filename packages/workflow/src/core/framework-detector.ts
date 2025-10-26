/**
 * Framework Detection Service
 *
 * Detects web frameworks and provides deployment optimization strategies
 * Supports: SvelteKit, Next.js, Nuxt.js, Vite, Create React App, and more
 */

import { existsSync, readFileSync } from 'fs'
import { glob } from 'glob'
import { join } from 'path'

export interface FrameworkInfo {
  name: string
  version?: string
  type: 'ssr' | 'spa' | 'static' | 'hybrid'
  buildCommand?: string
  outputDir?: string
  devCommand?: string
  configFiles: string[]
  dependencies: string[]
  deploymentStrategy: DeploymentStrategy
}

export interface DeploymentStrategy {
  type: 'static' | 'serverless' | 'server' | 'edge'
  platforms: string[]
  buildOutputs: string[]
  environmentVariables?: string[]
  healthCheckPath?: string
  previewCommand?: string
}

export interface PackageJson {
  name?: string
  version?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  type?: 'module' | 'commonjs'
}

export class FrameworkDetector {
  private rootPath: string
  private packageJsonCache = new Map<string, PackageJson>()

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath
  }

  /**
   * Detect framework in a specific package directory
   */
  async detectFramework(packagePath: string): Promise<FrameworkInfo | null> {
    const fullPath = join(this.rootPath, packagePath)

    if (!existsSync(fullPath)) {
      return null
    }

    const packageJson = this.getPackageJson(fullPath)
    if (!packageJson) {
      return null
    }

    // Check for SvelteKit
    const svelteKitInfo = this.detectSvelteKit(fullPath, packageJson)
    if (svelteKitInfo) return svelteKitInfo

    // Check for Next.js
    const nextJsInfo = this.detectNextJs(fullPath, packageJson)
    if (nextJsInfo) return nextJsInfo

    // Check for Nuxt.js
    const nuxtInfo = this.detectNuxt(fullPath, packageJson)
    if (nuxtInfo) return nuxtInfo

    // Check for Vite
    const viteInfo = this.detectVite(fullPath, packageJson)
    if (viteInfo) return viteInfo

    // Check for Create React App
    const craInfo = this.detectCreateReactApp(fullPath, packageJson)
    if (craInfo) return craInfo

    // Check for Angular
    const angularInfo = this.detectAngular(fullPath, packageJson)
    if (angularInfo) return angularInfo

    // Check for Vue CLI
    const vueInfo = this.detectVueCli(fullPath, packageJson)
    if (vueInfo) return vueInfo

    return null
  }

  /**
   * Detect all frameworks in monorepo packages
   */
  async detectAllFrameworks(
    workspacePatterns: string[] = ['packages/*']
  ): Promise<Map<string, FrameworkInfo>> {
    const frameworks = new Map<string, FrameworkInfo>()

    // First, check the current directory itself
    const currentFramework = await this.detectFramework('.')
    if (currentFramework) {
      frameworks.set('.', currentFramework)
    }

    // Then check workspace patterns for monorepo packages
    for (const pattern of workspacePatterns) {
      const packages = await glob(pattern, { cwd: this.rootPath })

      for (const packagePath of packages) {
        const framework = await this.detectFramework(packagePath)
        if (framework) {
          frameworks.set(packagePath, framework)
        }
      }
    }

    return frameworks
  }

  /**
   * Get deployment recommendations for detected frameworks
   */
  getDeploymentRecommendations(frameworks: Map<string, FrameworkInfo>): {
    package: string
    framework: FrameworkInfo
    recommendations: string[]
  }[] {
    const recommendations: {
      package: string
      framework: FrameworkInfo
      recommendations: string[]
    }[] = []

    for (const [packagePath, framework] of frameworks) {
      const recs: string[] = []

      // Platform-specific recommendations
      if (framework.deploymentStrategy.platforms.includes('vercel')) {
        recs.push('Consider Vercel for optimal performance and zero-config deployment')
      }

      if (framework.deploymentStrategy.platforms.includes('netlify')) {
        recs.push('Netlify provides excellent static site hosting with edge functions')
      }

      if (framework.deploymentStrategy.platforms.includes('cloudflare')) {
        recs.push('Cloudflare Pages offers global edge deployment with Workers integration')
      }

      // Build optimization recommendations
      if (framework.name === 'SvelteKit') {
        recs.push('Use adapter-auto for automatic platform detection')
        recs.push('Enable prerendering for static routes to improve performance')
        recs.push('Consider using SvelteKit service workers for offline functionality')
      }

      if (framework.type === 'ssr') {
        recs.push('Ensure server-side rendering is properly configured for SEO benefits')
        recs.push('Implement proper error boundaries for SSR failures')
      }

      if (framework.type === 'static') {
        recs.push('Enable aggressive caching for static assets')
        recs.push('Consider using a CDN for global content distribution')
      }

      recommendations.push({
        package: packagePath,
        framework,
        recommendations: recs,
      })
    }

    return recommendations
  }

  /**
   * Detect SvelteKit framework
   */
  private detectSvelteKit(packagePath: string, packageJson: PackageJson): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['@sveltejs/kit']) {
      return null
    }

    const configFiles = this.findConfigFiles(packagePath, [
      'svelte.config.js',
      'svelte.config.ts',
      'vite.config.js',
      'vite.config.ts',
    ])

    // Detect adapter type for deployment strategy
    let deploymentType: 'static' | 'serverless' | 'server' | 'edge' = 'serverless'
    let platforms = ['vercel', 'netlify', 'cloudflare']

    if (deps['@sveltejs/adapter-static']) {
      deploymentType = 'static'
    } else if (deps['@sveltejs/adapter-node']) {
      deploymentType = 'server'
      platforms = ['railway', 'render', 'digitalocean']
    } else if (deps['@sveltejs/adapter-cloudflare']) {
      deploymentType = 'edge'
      platforms = ['cloudflare']
    }

    return {
      name: 'SvelteKit',
      version: deps['@sveltejs/kit'],
      type: 'hybrid', // SvelteKit supports SSR, SSG, and SPA
      buildCommand: packageJson.scripts?.build || 'svelte-kit build',
      outputDir: 'build',
      devCommand: packageJson.scripts?.dev || 'svelte-kit dev',
      configFiles,
      dependencies: ['@sveltejs/kit', 'svelte'],
      deploymentStrategy: {
        type: deploymentType,
        platforms,
        buildOutputs: ['build'],
        environmentVariables: ['PUBLIC_*'],
        healthCheckPath: '/',
        previewCommand: packageJson.scripts?.preview || 'svelte-kit preview',
      },
    }
  }

  /**
   * Detect Next.js framework
   */
  private detectNextJs(packagePath: string, packageJson: PackageJson): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['next']) {
      return null
    }

    const configFiles = this.findConfigFiles(packagePath, [
      'next.config.js',
      'next.config.ts',
      'next.config.mjs',
    ])

    return {
      name: 'Next.js',
      version: deps['next'],
      type: 'hybrid',
      buildCommand: packageJson.scripts?.build || 'next build',
      outputDir: '.next',
      devCommand: packageJson.scripts?.dev || 'next dev',
      configFiles,
      dependencies: ['next', 'react'],
      deploymentStrategy: {
        type: 'serverless',
        platforms: ['vercel', 'netlify'],
        buildOutputs: ['.next'],
        environmentVariables: ['NEXT_PUBLIC_*'],
        healthCheckPath: '/',
        previewCommand: packageJson.scripts?.start || 'next start',
      },
    }
  }

  /**
   * Detect Nuxt.js framework
   */
  private detectNuxt(packagePath: string, packageJson: PackageJson): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['nuxt'] && !deps['@nuxt/kit']) {
      return null
    }

    const configFiles = this.findConfigFiles(packagePath, ['nuxt.config.js', 'nuxt.config.ts'])

    return {
      name: 'Nuxt.js',
      version: deps['nuxt'] || deps['@nuxt/kit'],
      type: 'hybrid',
      buildCommand: packageJson.scripts?.build || 'nuxt build',
      outputDir: '.output',
      devCommand: packageJson.scripts?.dev || 'nuxt dev',
      configFiles,
      dependencies: ['nuxt', 'vue'],
      deploymentStrategy: {
        type: 'serverless',
        platforms: ['vercel', 'netlify', 'cloudflare'],
        buildOutputs: ['.output'],
        environmentVariables: ['NUXT_*'],
        healthCheckPath: '/',
        previewCommand: packageJson.scripts?.preview || 'nuxt preview',
      },
    }
  }

  /**
   * Detect Vite framework
   */
  private detectVite(packagePath: string, packageJson: PackageJson): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['vite']) {
      return null
    }

    const configFiles = this.findConfigFiles(packagePath, ['vite.config.js', 'vite.config.ts'])

    // Determine if it's React, Vue, or vanilla
    let frameworkName = 'Vite'
    if (deps['react']) frameworkName = 'Vite + React'
    else if (deps['vue']) frameworkName = 'Vite + Vue'
    else if (deps['svelte']) frameworkName = 'Vite + Svelte'

    return {
      name: frameworkName,
      version: deps['vite'],
      type: 'spa',
      buildCommand: packageJson.scripts?.build || 'vite build',
      outputDir: 'dist',
      devCommand: packageJson.scripts?.dev || 'vite',
      configFiles,
      dependencies: ['vite'],
      deploymentStrategy: {
        type: 'static',
        platforms: ['vercel', 'netlify', 'cloudflare', 'github-pages'],
        buildOutputs: ['dist'],
        environmentVariables: ['VITE_*'],
        healthCheckPath: '/',
        previewCommand: packageJson.scripts?.preview || 'vite preview',
      },
    }
  }

  /**
   * Detect Create React App
   */
  private detectCreateReactApp(
    packagePath: string,
    packageJson: PackageJson
  ): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['react-scripts']) {
      return null
    }

    return {
      name: 'Create React App',
      version: deps['react-scripts'],
      type: 'spa',
      buildCommand: packageJson.scripts?.build || 'react-scripts build',
      outputDir: 'build',
      devCommand: packageJson.scripts?.start || 'react-scripts start',
      configFiles: ['public/index.html'],
      dependencies: ['react-scripts', 'react'],
      deploymentStrategy: {
        type: 'static',
        platforms: ['vercel', 'netlify', 'cloudflare', 'github-pages'],
        buildOutputs: ['build'],
        environmentVariables: ['REACT_APP_*'],
        healthCheckPath: '/',
        previewCommand: 'serve -s build',
      },
    }
  }

  /**
   * Detect Angular framework
   */
  private detectAngular(packagePath: string, packageJson: PackageJson): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['@angular/core']) {
      return null
    }

    const configFiles = this.findConfigFiles(packagePath, ['angular.json', 'angular.config.js'])

    return {
      name: 'Angular',
      version: deps['@angular/core'],
      type: 'spa',
      buildCommand: packageJson.scripts?.build || 'ng build',
      outputDir: 'dist',
      devCommand: packageJson.scripts?.start || 'ng serve',
      configFiles,
      dependencies: ['@angular/core'],
      deploymentStrategy: {
        type: 'static',
        platforms: ['vercel', 'netlify', 'cloudflare', 'github-pages'],
        buildOutputs: ['dist'],
        environmentVariables: [],
        healthCheckPath: '/',
        previewCommand: 'ng serve --prod',
      },
    }
  }

  /**
   * Detect Vue CLI framework
   */
  private detectVueCli(packagePath: string, packageJson: PackageJson): FrameworkInfo | null {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps['@vue/cli-service']) {
      return null
    }

    const configFiles = this.findConfigFiles(packagePath, ['vue.config.js', 'vue.config.ts'])

    return {
      name: 'Vue CLI',
      version: deps['@vue/cli-service'],
      type: 'spa',
      buildCommand: packageJson.scripts?.build || 'vue-cli-service build',
      outputDir: 'dist',
      devCommand: packageJson.scripts?.serve || 'vue-cli-service serve',
      configFiles,
      dependencies: ['@vue/cli-service', 'vue'],
      deploymentStrategy: {
        type: 'static',
        platforms: ['vercel', 'netlify', 'cloudflare', 'github-pages'],
        buildOutputs: ['dist'],
        environmentVariables: ['VUE_APP_*'],
        healthCheckPath: '/',
        previewCommand: 'vue-cli-service serve --mode production',
      },
    }
  }

  /**
   * Get package.json from a directory
   */
  private getPackageJson(packagePath: string): PackageJson | null {
    if (this.packageJsonCache.has(packagePath)) {
      return this.packageJsonCache.get(packagePath)!
    }

    const packageJsonPath = join(packagePath, 'package.json')

    if (!existsSync(packageJsonPath)) {
      return null
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(content) as PackageJson
      this.packageJsonCache.set(packagePath, packageJson)
      return packageJson
    } catch (error) {
      console.warn(`Failed to parse package.json at ${packageJsonPath}:`, error)
      return null
    }
  }

  /**
   * Find configuration files in a directory
   */
  private findConfigFiles(packagePath: string, configFiles: string[]): string[] {
    return configFiles.filter((file) => existsSync(join(packagePath, file)))
  }

  /**
   * Clear package.json cache
   */
  clearCache(): void {
    this.packageJsonCache.clear()
  }
}

export default FrameworkDetector
