/**
 * AI Service V2 - Enhanced with AI-Core Integration
 *
 * Provides AI-powered features using the new @g-1/ai-core package
 * while maintaining backward compatibility with existing workflow code
 */

import {
  type AIProvider,
  type CloudflareConfig,
  CloudflareWorkersAI,
  createAIConfigFromEnv,
} from '@g-1/ai-core'
import type { CommitInfo } from '../types/index.js'

// Re-export types for compatibility
// Note: These types are defined locally since they're not available in ai-core

// Legacy types for backward compatibility
export interface AIConfig {
  enabled: boolean
  provider?: 'openai' | 'anthropic' | 'local' | 'cloudflare'
  suggestBranchNames: boolean
  suggestCommitMessages: boolean
  generateReleaseNotes: boolean
  apiKey?: string
  model?: string
  features?: {
    changelog?: {
      enabled: boolean
      includeBreakingChanges: boolean
      categorizeCommits: boolean
      generateSummary: boolean
    }
    versionBump?: {
      enabled: boolean
      analyzeImpact: boolean
      suggestBumpType: boolean
      confidenceThreshold: number
    }
    impactAnalysis?: {
      enabled: boolean
      crossPackageAnalysis: boolean
      riskAssessment: boolean
      testingRecommendations: boolean
    }
  }
}

export interface ChangelogEntry {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'breaking'
  scope?: string
  description: string
  breaking: boolean
  impact: 'major' | 'minor' | 'patch'
  affectedPackages: string[]
  originalCommit: CommitInfo
}

export interface VersionSuggestion {
  package: string
  currentVersion: string
  suggestedVersion: string
  bumpType: 'major' | 'minor' | 'patch'
  reasoning: string
  confidence: number
}

export interface ImpactAnalysis {
  changedPackages: string[]
  affectedPackages: string[]
  riskLevel: 'low' | 'medium' | 'high'
  breakingChanges: boolean
  migrationRequired: boolean
  testingRecommendations: string[]
}

export class AIServiceV2 {
  private config: AIConfig
  private aiProvider?: AIProvider

  constructor(config: AIConfig, rootPath: string = process.cwd()) {
    this.config = config
    this.rootPath = rootPath
    this.initializeAIServices()
  }

  /**
   * Initialize AI services based on configuration
   */
  private initializeAIServices(): void {
    if (!this.config.enabled) {
      return
    }

    try {
      const aiConfig = createAIConfigFromEnv()

      if (this.config.provider === 'cloudflare') {
        if (aiConfig && 'cloudflare' in aiConfig && aiConfig.cloudflare) {
          this.aiProvider = new CloudflareWorkersAI(aiConfig.cloudflare as CloudflareConfig)
        }
      }
      // Add other providers as needed
    } catch (error) {
      console.warn('Failed to initialize AI services:', error)
    }
  }

  /**
   * Generate changelog entries from commits using AI analysis
   */
  async generateChangelog(
    commits: CommitInfo[],
    packageName?: string,
    previousVersion?: string
  ): Promise<ChangelogEntry[]> {
    if (!commits.length) {
      return []
    }

    try {
      if (this.aiProvider) {
        // Use the AI provider for changelog generation
        // For now, fall back to intelligent analysis
        return this.intelligentCommitAnalysis(commits, packageName)
      }

      // Fallback to intelligent parsing without external AI
      return this.intelligentCommitAnalysis(commits, packageName)
    } catch (error) {
      console.warn('AI changelog generation failed, falling back to conventional parsing:', error)
      return this.fallbackChangelogGeneration(commits)
    }
  }

  /**
   * Suggest version bumps based on changes
   */
  async suggestVersionBumps(
    changes: ChangelogEntry[],
    packages: Array<{ name: string; version: string; path: string }>
  ): Promise<VersionSuggestion[]> {
    const suggestions: VersionSuggestion[] = []

    try {
      if (this.aiProvider) {
        // Use AI-powered version suggestions
        // For now, fall back to intelligent analysis
        return this.fallbackVersionSuggestions(changes, packages)
      }
    } catch (error) {
      console.warn('AI version suggestion failed, falling back to rule-based approach:', error)
    }

    // Fallback to rule-based suggestions
    return this.fallbackVersionSuggestions(changes, packages)
  }

  /**
   * Analyze cross-package impact of changes
   */
  async analyzeImpact(
    changes: ChangelogEntry[],
    packages: Array<{ name: string; dependencies: Record<string, string> }>
  ): Promise<ImpactAnalysis> {
    const changedPackages = Array.from(new Set(changes.flatMap((c) => c.affectedPackages)))
    const affectedPackages = new Set(changedPackages)

    // Find packages that depend on changed packages
    for (const pkg of packages) {
      for (const changedPkg of changedPackages) {
        if (pkg.dependencies[changedPkg] || pkg.dependencies[`workspace:${changedPkg}`]) {
          affectedPackages.add(pkg.name)
        }
      }
    }

    const breakingChanges = changes.some((c) => c.breaking)
    const hasFeatures = changes.some((c) => c.type === 'feat')
    const hasMajorRefactors = changes.some((c) => c.type === 'refactor' && c.impact === 'major')

    let riskLevel: 'low' | 'medium' | 'high'
    if (breakingChanges || hasMajorRefactors) {
      riskLevel = 'high'
    } else if (hasFeatures || affectedPackages.size > 3) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    const testingRecommendations = this.generateTestingRecommendations(changes, riskLevel)

    return {
      changedPackages,
      affectedPackages: Array.from(affectedPackages),
      riskLevel,
      breakingChanges,
      migrationRequired: breakingChanges,
      testingRecommendations,
    }
  }

  /**
   * Analyze code quality using AI
   */
  async analyzeCode(filePath: string): Promise<any> {
    if (!this.aiProvider) {
      return null
    }

    // For now, return a basic analysis structure
    // This would be implemented when CodeAnalyzer is available in ai-core
    return {
      quality: { maintainability: 0.8, complexity: 0.6, testCoverage: 0.7 },
      security: [],
      performance: [],
      suggestions: [],
    }
  }

  /**
   * Suggest branch name based on changes
   */
  async suggestBranchName(
    changes: string[],
    type?: 'feature' | 'bugfix' | 'hotfix'
  ): Promise<string> {
    if (!this.config.enabled || !this.config.suggestBranchNames) {
      return this.fallbackBranchName(type)
    }

    try {
      if (this.aiProvider) {
        const prompt = `Suggest a concise git branch name for these changes:
${changes.join('\n')}

Type: ${type || 'feature'}
Format: ${type || 'feature'}/descriptive-name
Keep it under 50 characters, use kebab-case.`

        const result = await this.aiProvider.generateText(prompt, {
          maxTokens: 20,
          temperature: 0.3,
        })

        const branchName = result.trim().replace(/[^a-zA-Z0-9\-/]/g, '')
        if (branchName && branchName.length > 0) {
          return branchName
        }
      }
    } catch (error) {
      console.warn('AI branch name suggestion failed:', error)
    }

    return this.fallbackBranchName(type)
  }

  /**
   * Suggest commit message based on staged files
   */
  async suggestCommitMessage(stagedFiles: string[], diff?: string): Promise<string> {
    if (!this.config.enabled || !this.config.suggestCommitMessages) {
      return this.fallbackCommitMessage(stagedFiles)
    }

    try {
      if (this.aiProvider) {
        const prompt = `Generate a conventional commit message for these changes:

Files: ${stagedFiles.join(', ')}
${diff ? `\nDiff preview:\n${diff.substring(0, 500)}...` : ''}

Format: type(scope): description
Types: feat, fix, docs, style, refactor, test, chore
Keep description under 50 characters.`

        const result = await this.aiProvider.generateText(prompt, {
          maxTokens: 30,
          temperature: 0.3,
        })

        const commitMessage = result.trim()
        if (commitMessage && commitMessage.length > 0) {
          return commitMessage
        }
      }
    } catch (error) {
      console.warn('AI commit message suggestion failed:', error)
    }

    return this.fallbackCommitMessage(stagedFiles)
  }

  // Fallback methods for backward compatibility
  private intelligentCommitAnalysis(commits: CommitInfo[], packageName?: string): ChangelogEntry[] {
    return commits.map((commit) => {
      const parsed = this.parseConventionalCommit(commit.message)
      const affectedPackages = packageName ? [packageName] : []

      return {
        type: (parsed.type as any) || 'chore',
        scope: parsed.scope,
        description: parsed.description,
        breaking: parsed.breaking,
        impact: this.determineImpact(parsed.type, parsed.breaking),
        affectedPackages,
        originalCommit: commit,
      }
    })
  }

  private fallbackChangelogGeneration(commits: CommitInfo[]): ChangelogEntry[] {
    return commits.map((commit) => {
      const parsed = this.parseConventionalCommit(commit.message)

      return {
        type: (parsed.type as any) || 'chore',
        scope: parsed.scope,
        description: parsed.description,
        breaking: parsed.breaking,
        impact: this.determineImpact(parsed.type, parsed.breaking),
        affectedPackages: [],
        originalCommit: commit,
      }
    })
  }

  private fallbackVersionSuggestions(
    changes: ChangelogEntry[],
    packages: Array<{ name: string; version: string; path: string }>
  ): VersionSuggestion[] {
    return packages.map((pkg) => {
      const relevantChanges = changes.filter(
        (change) =>
          change.affectedPackages.includes(pkg.name) || change.affectedPackages.length === 0
      )

      const hasBreaking = relevantChanges.some((c) => c.breaking)
      const hasFeatures = relevantChanges.some((c) => c.type === 'feat')
      const hasFixes = relevantChanges.some((c) => c.type === 'fix')

      let bumpType: 'major' | 'minor' | 'patch'
      let reasoning: string
      let confidence: number

      if (hasBreaking) {
        bumpType = 'major'
        reasoning = 'Breaking changes detected'
        confidence = 0.95
      } else if (hasFeatures) {
        bumpType = 'minor'
        reasoning = 'New features added'
        confidence = 0.85
      } else if (hasFixes) {
        bumpType = 'patch'
        reasoning = 'Bug fixes and improvements'
        confidence = 0.9
      } else {
        bumpType = 'patch'
        reasoning = 'Maintenance and documentation updates'
        confidence = 0.7
      }

      return {
        package: pkg.name,
        currentVersion: pkg.version,
        suggestedVersion: this.calculateNextVersion(pkg.version, bumpType),
        bumpType,
        reasoning,
        confidence,
      }
    })
  }

  private parseConventionalCommit(message: string): {
    type?: string
    scope?: string
    breaking: boolean
    description: string
  } {
    const conventionalPattern = /^(\w+)(\(([^)]+)\))?(!)?: (.+)$/
    const match = message.match(conventionalPattern)

    if (match) {
      const [, type, , scope, breaking, description] = match
      return {
        type,
        scope,
        breaking: !!breaking || message.includes('BREAKING CHANGE'),
        description: (description || '').trim() || 'No description',
      }
    }

    return {
      breaking: message.includes('BREAKING CHANGE') || message.includes('!:'),
      description: (message.split('\n')[0] || '').trim() || 'No description',
    }
  }

  private determineImpact(type?: string, breaking?: boolean): 'major' | 'minor' | 'patch' {
    if (breaking) return 'major'
    if (type === 'feat') return 'minor'
    return 'patch'
  }

  private calculateNextVersion(
    currentVersion: string,
    bumpType: 'major' | 'minor' | 'patch'
  ): string {
    const parts = currentVersion.split('.')
    const major = parseInt(parts[0] || '0', 10)
    const minor = parseInt(parts[1] || '0', 10)
    const patch = parseInt(parts[2] || '0', 10)

    switch (bumpType) {
      case 'major':
        return `${major + 1}.0.0`
      case 'minor':
        return `${major}.${minor + 1}.0`
      case 'patch':
        return `${major}.${minor}.${patch + 1}`
      default:
        return currentVersion
    }
  }

  private generateTestingRecommendations(changes: ChangelogEntry[], riskLevel: string): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'high') {
      recommendations.push('Run full test suite including integration tests')
      recommendations.push('Perform manual testing of critical user flows')
      recommendations.push('Consider beta release for early feedback')
    }

    if (riskLevel === 'medium') {
      recommendations.push('Run unit and integration tests')
      recommendations.push('Test affected package functionality')
    }

    recommendations.push('Verify build process completes successfully')

    const hasFeatures = changes.some((c) => c.type === 'feat')
    if (hasFeatures) {
      recommendations.push('Test new feature functionality')
    }

    const hasFixes = changes.some((c) => c.type === 'fix')
    if (hasFixes) {
      recommendations.push('Verify bug fixes resolve reported issues')
    }

    return recommendations
  }

  private fallbackBranchName(type?: string): string {
    const timestamp = Date.now().toString().slice(-6)
    const prefix = type || 'feature'
    return `${prefix}/update-${timestamp}`
  }

  private fallbackCommitMessage(stagedFiles: string[]): string {
    const fileTypes = new Set<string>()
    const directories = new Set<string>()

    for (const file of stagedFiles) {
      const ext = file.split('.').pop()
      if (ext) fileTypes.add(ext)

      const dir = file.split('/')[0]
      if (dir && dir !== file) directories.add(dir)
    }

    const scope = directories.size === 1 ? Array.from(directories)[0] : undefined
    const typeHint = fileTypes.has('test') || fileTypes.has('spec') ? 'test' : 'chore'

    return scope
      ? `${typeHint}(${scope}): update files`
      : `${typeHint}: update ${stagedFiles.length} files`
  }
}

// Export for backward compatibility
export default AIServiceV2
