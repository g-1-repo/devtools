/**
 * AI Service V2 - Enhanced with AI-Core Integration
 *
 * Provides AI-powered features using the new @g-1/ai-core package
 * while maintaining backward compatibility with existing workflow code
 */

import { 
  CloudflareWorkersAI, 
  ChangelogGenerator, 
  CodeAnalyzer,
  createAIConfigFromEnv,
  type AIProvider,
  type ChangelogEntry as AIChangelogEntry,
  type VersionSuggestion as AIVersionSuggestion,
  type CommitInfo as AICommitInfo
} from '@g-1/ai-core'
import type { CommitInfo } from '../types/index.js'

// Re-export types for backward compatibility
export type { 
  ChangelogEntry as AIChangelogEntry,
  VersionSuggestion as AIVersionSuggestion 
} from '@g-1/ai-core'

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
  private rootPath: string
  private aiProvider?: AIProvider
  private changelogGenerator?: ChangelogGenerator
  private codeAnalyzer?: CodeAnalyzer

  constructor(config: AIConfig, rootPath: string = process.cwd()) {
    this.config = config
    this.rootPath = rootPath
    this.initializeAIServices()
  }

  /**
   * Initialize AI services based on configuration
   */
  private initializeAIServices(): void {
    if (!this.config.enabled) return

    try {
      // Try to create AI provider based on config
      if (this.config.provider === 'cloudflare' || !this.config.provider) {
        // Use environment-based configuration for Cloudflare
        const aiConfig = createAIConfigFromEnv()
        const providerConfig = aiConfig.getProviderConfig('cloudflare')
        
        if (providerConfig) {
          this.aiProvider = new CloudflareWorkersAI(providerConfig)
          
          // Initialize services
          this.changelogGenerator = new ChangelogGenerator({
            provider: this.aiProvider,
            defaultFormat: 'markdown',
            includeBreaking: this.config.features?.changelog?.includeBreakingChanges ?? true,
            groupByType: this.config.features?.changelog?.categorizeCommits ?? true
          })

          this.codeAnalyzer = new CodeAnalyzer({
            provider: this.aiProvider,
            maxFileSize: 1024 * 1024, // 1MB
            supportedExtensions: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte']
          })
        }
      }
    } catch (error) {
      console.warn('Failed to initialize AI services, falling back to legacy implementation:', error)
    }
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
      if (this.changelogGenerator) {
        // Convert workflow CommitInfo to AI CommitInfo
        const aiCommits: AICommitInfo[] = commits.map(commit => ({
          hash: commit.hash,
          message: commit.message,
          author: commit.author,
          date: commit.date,
          body: commit.body || '',
          files: commit.files || [],
          additions: 0, // Default values for missing properties
          deletions: 0
        }))

        // Use AI-powered changelog generation
        const aiEntries = await this.changelogGenerator.analyzeCommits(aiCommits)
        
        // Convert AI entries back to workflow format
        return aiEntries.map(entry => ({
          type: entry.type,
          scope: entry.scope,
          description: entry.description,
          breaking: entry.breaking,
          impact: entry.impact,
          affectedPackages: entry.affectedPackages,
          originalCommit: entry.originalCommit as CommitInfo
        }))
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
      if (this.changelogGenerator) {
        // Use AI-powered version suggestions
        for (const pkg of packages) {
          const relevantChanges = changes.filter(
            (change) =>
              change.affectedPackages.includes(pkg.name) || change.affectedPackages.length === 0
          )

          if (relevantChanges.length === 0) continue

          // Convert to AI CommitInfo format
          const aiCommits: AICommitInfo[] = relevantChanges.map(change => ({
            hash: change.originalCommit.hash,
            message: change.originalCommit.message,
            author: change.originalCommit.author,
            date: change.originalCommit.date,
            body: change.originalCommit.body || '',
            files: change.originalCommit.files || [],
            additions: 0,
            deletions: 0
          }))

          const aiSuggestion = await this.changelogGenerator.suggestVersionBump(
            aiCommits,
            pkg.version
          )

          suggestions.push({
            package: pkg.name,
            currentVersion: aiSuggestion.currentVersion,
            suggestedVersion: aiSuggestion.suggestedVersion,
            bumpType: aiSuggestion.bumpType,
            reasoning: aiSuggestion.reasoning,
            confidence: aiSuggestion.confidence
          })
        }

        return suggestions
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
      testingRecommendations
    }
  }

  /**
   * Analyze code quality using AI
   */
  async analyzeCode(filePath: string): Promise<any> {
    if (!this.codeAnalyzer) {
      throw new Error('Code analyzer not available - AI services not initialized')
    }

    return this.codeAnalyzer.analyzeFile(filePath)
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
          temperature: 0.3
        })

        const branchName = result.trim().replace(/[^a-zA-Z0-9\-\/]/g, '')
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
          temperature: 0.3
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
    return commits.map(commit => {
      const parsed = this.parseConventionalCommit(commit.message)
      const affectedPackages = packageName ? [packageName] : []

      return {
        type: (parsed.type as any) || 'chore',
        scope: parsed.scope,
        description: parsed.description,
        breaking: parsed.breaking,
        impact: this.determineImpact(parsed.type, parsed.breaking),
        affectedPackages,
        originalCommit: commit
      }
    })
  }

  private fallbackChangelogGeneration(commits: CommitInfo[]): ChangelogEntry[] {
    return commits.map(commit => {
      const parsed = this.parseConventionalCommit(commit.message)
      
      return {
        type: (parsed.type as any) || 'chore',
        scope: parsed.scope,
        description: parsed.description,
        breaking: parsed.breaking,
        impact: this.determineImpact(parsed.type, parsed.breaking),
        affectedPackages: [],
        originalCommit: commit
      }
    })
  }

  private fallbackVersionSuggestions(
    changes: ChangelogEntry[],
    packages: Array<{ name: string; version: string; path: string }>
  ): VersionSuggestion[] {
    return packages.map(pkg => {
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
        confidence
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
        description: description.trim()
      }
    }

    return {
      breaking: message.includes('BREAKING CHANGE') || message.includes('!:'),
      description: message.split('\n')[0].trim()
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
    const [major, minor, patch] = currentVersion.split('.').map(Number)
    
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
    
    const hasFeatures = changes.some(c => c.type === 'feat')
    if (hasFeatures) {
      recommendations.push('Test new feature functionality')
    }

    const hasFixes = changes.some(c => c.type === 'fix')
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
    const fileTypes = stagedFiles.map(f => f.split('.').pop()).filter(Boolean)
    const uniqueTypes = [...new Set(fileTypes)]
    
    if (uniqueTypes.includes('ts') || uniqueTypes.includes('js')) {
      return 'feat: update code functionality'
    }
    if (uniqueTypes.includes('md')) {
      return 'docs: update documentation'
    }
    if (uniqueTypes.includes('json')) {
      return 'chore: update configuration'
    }
    
    return 'chore: update files'
  }
}

// Export for backward compatibility
export default AIServiceV2