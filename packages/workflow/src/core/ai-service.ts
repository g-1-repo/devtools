/**
 * AI Service for Intelligent Workflow Automation
 *
 * Provides AI-powered features including:
 * - Intelligent changelog generation
 * - Commit message analysis and categorization
 * - Version bump suggestions
 * - Cross-package impact analysis
 */

import type { CommitInfo } from '../types'

export interface AIConfig {
  enabled: boolean
  provider?: 'openai' | 'anthropic' | 'local' | 'cloudflare'
  suggestBranchNames: boolean
  suggestCommitMessages: boolean
  generateReleaseNotes: boolean
  apiKey?: string
  model?: string
  cloudflare?: {
    accountId?: string
    apiToken?: string
    model?: string
    baseUrl?: string
  }
  features?: {
    changelog?: {
      enabled?: boolean
      includeBreakingChanges?: boolean
      categorizeCommits?: boolean
      generateSummary?: boolean
    }
    versionBump?: {
      enabled?: boolean
      analyzeImpact?: boolean
      suggestBumpType?: boolean
      confidenceThreshold?: number
    }
    impactAnalysis?: {
      enabled?: boolean
      crossPackageAnalysis?: boolean
      riskAssessment?: boolean
      testingRecommendations?: boolean
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

export class AIService {
  private config: AIConfig
  private rootPath: string

  constructor(config: AIConfig, rootPath: string = process.cwd()) {
    this.config = config
    this.rootPath = rootPath
  }

  /**
   * Generate intelligent changelog from commits
   */
  async generateChangelog(
    commits: CommitInfo[],
    packageName?: string,
    previousVersion?: string
  ): Promise<ChangelogEntry[]> {
    if (!this.config.enabled || !this.config.generateReleaseNotes) {
      return this.fallbackChangelogGeneration(commits)
    }

    try {
      // For now, implement intelligent parsing without external AI
      // This can be enhanced with actual AI providers later
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

    for (const pkg of packages) {
      const relevantChanges = changes.filter(
        (change) =>
          change.affectedPackages.includes(pkg.name) || change.affectedPackages.length === 0 // Global changes affect all packages
      )

      if (relevantChanges.length === 0) {
        continue
      }

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

      const suggestedVersion = this.calculateNextVersion(pkg.version, bumpType)

      suggestions.push({
        package: pkg.name,
        currentVersion: pkg.version,
        suggestedVersion,
        bumpType,
        reasoning,
        confidence,
      })
    }

    return suggestions
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
   * Suggest branch names based on changes
   */
  async suggestBranchName(
    changes: string[],
    type?: 'feature' | 'bugfix' | 'hotfix'
  ): Promise<string> {
    if (!this.config.enabled || !this.config.suggestBranchNames) {
      return this.fallbackBranchName(type)
    }

    // Intelligent branch name generation based on changes
    const keywords = this.extractKeywords(changes.join(' '))
    const primaryKeyword = keywords[0] || 'update'

    const prefix = type || this.inferBranchType(changes)
    return `${prefix}/${primaryKeyword.toLowerCase().replace(/\s+/g, '-')}`
  }

  /**
   * Suggest commit messages based on staged changes
   */
  async suggestCommitMessage(stagedFiles: string[], diff?: string): Promise<string> {
    if (!this.config.enabled || !this.config.suggestCommitMessages) {
      return 'chore: update files'
    }

    // Analyze file patterns to suggest appropriate commit message
    const hasTests = stagedFiles.some((f) => f.includes('.test.') || f.includes('.spec.'))
    const hasDocs = stagedFiles.some((f) => f.includes('.md') || f.includes('README'))
    const hasConfig = stagedFiles.some((f) => f.includes('config') || f.includes('.json'))
    const hasSource = stagedFiles.some(
      (f) => f.includes('.ts') || f.includes('.js') || f.includes('.tsx') || f.includes('.jsx')
    )
    const hasPackageJson = stagedFiles.some((f) => f.includes('package.json'))
    const hasChangelog = stagedFiles.some((f) => f.includes('CHANGELOG.md'))

    // More specific analysis for release-related changes
    if (hasPackageJson && hasChangelog) {
      return 'chore: prepare release with version and changelog updates'
    } else if (hasPackageJson) {
      return 'chore: update package version'
    } else if (hasChangelog) {
      return 'docs: update changelog'
    } else if (hasTests && !hasSource) {
      return 'test: add/update test cases'
    } else if (hasDocs && !hasSource) {
      return 'docs: update documentation'
    } else if (hasConfig && !hasSource) {
      return 'chore: update configuration'
    } else if (hasSource) {
      // Try to infer the type of change based on file patterns
      const hasComponents = stagedFiles.some(
        (f) => f.includes('component') || f.includes('Component')
      )
      const hasUtils = stagedFiles.some((f) => f.includes('util') || f.includes('helper'))
      const hasTypes = stagedFiles.some((f) => f.includes('type') || f.includes('.d.ts'))

      if (hasComponents) {
        return 'feat: update components'
      } else if (hasUtils) {
        return 'feat: update utilities'
      } else if (hasTypes) {
        return 'feat: update type definitions'
      } else {
        return 'feat: implement new functionality'
      }
    }

    return 'chore: update files'
  }

  /**
   * Intelligent commit analysis using conventional commit patterns
   */
  private intelligentCommitAnalysis(commits: CommitInfo[], packageName?: string): ChangelogEntry[] {
    return commits
      .map((commit) => {
        const { type, scope, breaking, description } = this.parseConventionalCommit(commit.message)

        return {
          type: (type as any) || 'chore',
          scope,
          description: description || commit.message,
          breaking: breaking || commit.breaking || false,
          impact: this.determineImpact(type, breaking),
          affectedPackages: packageName ? [packageName] : [],
          originalCommit: commit,
        }
      })
      .filter((entry) => entry.type !== 'chore' || entry.breaking) // Filter out non-essential chores
  }

  /**
   * Fallback changelog generation without AI
   */
  private fallbackChangelogGeneration(commits: CommitInfo[]): ChangelogEntry[] {
    return commits.map((commit) => {
      const parsed = this.parseConventionalCommit(commit.message)
      return {
        type: (parsed.type as ChangelogEntry['type']) || 'chore',
        scope: parsed.scope,
        description: parsed.description || commit.message,
        breaking: parsed.breaking || false,
        impact: parsed.breaking ? 'major' : parsed.type === 'feat' ? 'minor' : 'patch',
        affectedPackages: [],
        originalCommit: commit,
      }
    })
  }

  /**
   * Parse conventional commit format
   */
  private parseConventionalCommit(message: string): {
    type?: string
    scope?: string
    breaking: boolean
    description: string
  } {
    const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?(!?):\s*(.+)$/
    const match = message.match(conventionalRegex)

    if (match) {
      const [, type, scope, breakingMarker, description] = match
      return {
        type,
        scope,
        breaking: breakingMarker === '!',
        description: description || message,
      }
    }

    return {
      breaking: message.toLowerCase().includes('breaking'),
      description: message,
    }
  }

  /**
   * Determine impact level based on commit type
   */
  private determineImpact(type?: string, breaking?: boolean): 'major' | 'minor' | 'patch' {
    if (breaking) return 'major'
    if (type === 'feat') return 'minor'
    return 'patch'
  }

  /**
   * Calculate next version based on current version and bump type
   */
  private calculateNextVersion(
    currentVersion: string,
    bumpType: 'major' | 'minor' | 'patch'
  ): string {
    const versionParts = currentVersion.replace(/^v/, '').split('.').map(Number)
    const major = versionParts[0] || 0
    const minor = versionParts[1] || 0
    const patch = versionParts[2] || 0

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

  /**
   * Generate testing recommendations based on changes and risk level
   */
  private generateTestingRecommendations(changes: ChangelogEntry[], riskLevel: string): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'high') {
      recommendations.push('Run full integration test suite')
      recommendations.push('Perform manual regression testing')
      recommendations.push('Test all affected package combinations')
    }

    if (changes.some((c) => c.breaking)) {
      recommendations.push('Test migration paths for breaking changes')
      recommendations.push('Validate backward compatibility where possible')
    }

    if (changes.some((c) => c.type === 'feat')) {
      recommendations.push('Test new feature functionality thoroughly')
      recommendations.push('Verify feature flags and configuration')
    }

    if (recommendations.length === 0) {
      recommendations.push('Run standard test suite')
      recommendations.push('Verify basic functionality')
    }

    return recommendations
  }

  /**
   * Extract keywords from text for branch naming
   */
  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !['the', 'and', 'for', 'with', 'from', 'this', 'that'].includes(word))

    return Array.from(new Set(words)).slice(0, 3)
  }

  /**
   * Infer branch type from changes
   */
  private inferBranchType(changes: string[]): string {
    const text = changes.join(' ').toLowerCase()

    if (text.includes('fix') || text.includes('bug')) {
      return 'bugfix'
    } else if (text.includes('hotfix') || text.includes('urgent')) {
      return 'hotfix'
    } else {
      return 'feature'
    }
  }

  /**
   * Fallback branch name generation
   */
  private fallbackBranchName(type?: string): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `${type || 'feature'}/update-${timestamp}`
  }
}

export default AIService
