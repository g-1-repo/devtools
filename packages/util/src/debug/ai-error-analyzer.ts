/**
 * AI-Powered Error Analysis and Code Suggestions
 * 
 * Provides intelligent error analysis and code suggestions using the AI-core package.
 * Integrates with the existing error formatting system to provide enhanced debugging.
 */

import { CodeAnalyzer, CloudflareWorkersAI, AIConfigManager, defaultAIConfig } from '@g-1/ai-core'
import type { CodeAnalysisResult, SecurityIssue, PerformanceIssue, QualityIssue } from '@g-1/ai-core'
import { ErrorFormatter, type FormattedError } from './error-formatter.js'

export interface AIErrorAnalysis {
  originalError: FormattedError
  suggestions: string[]
  codeAnalysis?: CodeAnalysisResult
  confidence: number
  analysisTime: number
}

export interface AIErrorAnalyzerConfig {
  enabled: boolean
  provider: 'cloudflare' | 'openai' | 'ollama'
  maxAnalysisTime: number
  cacheResults: boolean
  includeCodeAnalysis: boolean
}

export class AIErrorAnalyzer {
  private codeAnalyzer: CodeAnalyzer
  private config: AIErrorAnalyzerConfig
  private cache = new Map<string, AIErrorAnalysis>()

  constructor(config: Partial<AIErrorAnalyzerConfig> = {}) {
    this.config = {
      enabled: true,
      provider: 'cloudflare',
      maxAnalysisTime: 10000, // 10 seconds
      cacheResults: true,
      includeCodeAnalysis: false,
      ...config,
    }

    // Initialize AI provider and code analyzer
    const aiConfig = AIConfigManager.getProviderConfig('cloudflare', defaultAIConfig)
    const provider = new CloudflareWorkersAI(aiConfig)
    this.codeAnalyzer = new CodeAnalyzer(provider)
  }

  /**
   * Analyze an error and provide AI-powered suggestions
   */
  async analyzeError(
    error: Error | string,
    context?: {
      filePath?: string
      codeSnippet?: string
      stackTrace?: string
      environment?: string
    }
  ): Promise<AIErrorAnalysis> {
    const startTime = Date.now()
    
    if (!this.config.enabled) {
      return this.createBasicAnalysis(error, startTime)
    }

    try {
      const formattedError = ErrorFormatter.formatError(error, 'critical')
      const cacheKey = this.createCacheKey(formattedError.message, context)

      // Check cache first
      if (this.config.cacheResults && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!
      }

      const analysis = await Promise.race([
        this.performAIAnalysis(formattedError, context),
        this.createTimeoutPromise(this.config.maxAnalysisTime)
      ])

      const result: AIErrorAnalysis = {
        originalError: formattedError,
        suggestions: analysis.suggestions || [],
        codeAnalysis: analysis.codeAnalysis,
        confidence: analysis.confidence || 0.7,
        analysisTime: Date.now() - startTime,
      }

      // Cache the result
      if (this.config.cacheResults) {
        this.cache.set(cacheKey, result)
      }

      return result
    } catch (analysisError) {
      console.warn('AI error analysis failed:', analysisError)
      return this.createBasicAnalysis(error, startTime)
    }
  }

  /**
   * Analyze code for potential issues and suggestions
   */
  async analyzeCode(filePath: string, content?: string): Promise<CodeAnalysisResult | null> {
    if (!this.config.enabled || !this.config.includeCodeAnalysis) {
      return null
    }

    try {
      return await this.codeAnalyzer.analyzeFile(filePath, content)
    } catch (error) {
      console.warn('Code analysis failed:', error)
      return null
    }
  }

  /**
   * Get suggestions for improving code quality
   */
  async getSuggestions(
    codeSnippet: string,
    context: {
      language?: string
      framework?: string
      purpose?: string
    } = {}
  ): Promise<string[]> {
    if (!this.config.enabled) {
      return []
    }

    try {
      const analysis = await this.codeAnalyzer.analyzeCode(codeSnippet, {
        language: context.language || 'typescript',
        includeRefactoring: true,
        includePerformance: true,
        includeSecurity: true,
      })

      const suggestions: string[] = []

      // Extract suggestions from analysis
      if (analysis.refactoringSuggestions) {
        suggestions.push(...analysis.refactoringSuggestions.map(s => s.description))
      }

      if (analysis.securityIssues) {
        suggestions.push(...analysis.securityIssues.map(s => `Security: ${s.description}`))
      }

      if (analysis.performanceIssues) {
        suggestions.push(...analysis.performanceIssues.map(s => `Performance: ${s.description}`))
      }

      return suggestions.slice(0, 5) // Limit to top 5 suggestions
    } catch (error) {
      console.warn('Failed to get AI suggestions:', error)
      return []
    }
  }

  /**
   * Format error with AI analysis for display
   */
  formatErrorWithAI(analysis: AIErrorAnalysis): string {
    let output = analysis.originalError.message

    if (analysis.suggestions.length > 0) {
      output += '\n\n🤖 AI Suggestions:'
      analysis.suggestions.forEach((suggestion, index) => {
        output += `\n  ${index + 1}. ${suggestion}`
      })
    }

    if (analysis.codeAnalysis) {
      const issues = [
        ...(analysis.codeAnalysis.securityIssues || []),
        ...(analysis.codeAnalysis.performanceIssues || []),
        ...(analysis.codeAnalysis.qualityIssues || []),
      ]

      if (issues.length > 0) {
        output += '\n\n🔍 Code Analysis:'
        issues.slice(0, 3).forEach((issue, index) => {
          output += `\n  ${index + 1}. ${issue.description} (${issue.severity})`
        })
      }
    }

    output += `\n\n⏱️  Analysis completed in ${analysis.analysisTime}ms (confidence: ${Math.round(analysis.confidence * 100)}%)`

    return output
  }

  private async performAIAnalysis(
    formattedError: FormattedError,
    context?: any
  ): Promise<{ suggestions: string[]; codeAnalysis?: CodeAnalysisResult; confidence: number }> {
    const errorMessage = formattedError.message
    const stackTrace = formattedError.context || context?.stackTrace || ''

    // Create a prompt for error analysis
    const analysisPrompt = `
Analyze this error and provide helpful suggestions:

Error: ${errorMessage}
Stack Trace: ${stackTrace}
Context: ${JSON.stringify(context || {}, null, 2)}

Please provide:
1. Likely causes of this error
2. Step-by-step solutions
3. Prevention strategies
4. Related best practices

Format as a JSON array of suggestion strings.
`

    try {
      // Use the code analyzer to get suggestions
      const suggestions = await this.getSuggestions(analysisPrompt, {
        language: 'typescript',
        purpose: 'error-analysis',
      })

      let codeAnalysis: CodeAnalysisResult | undefined
      if (this.config.includeCodeAnalysis && context?.filePath) {
        codeAnalysis = await this.analyzeCode(context.filePath, context.codeSnippet)
      }

      return {
        suggestions: suggestions.length > 0 ? suggestions : this.getDefaultSuggestions(errorMessage),
        codeAnalysis,
        confidence: suggestions.length > 0 ? 0.8 : 0.5,
      }
    } catch (error) {
      return {
        suggestions: this.getDefaultSuggestions(errorMessage),
        confidence: 0.3,
      }
    }
  }

  private createBasicAnalysis(error: Error | string, startTime: number): AIErrorAnalysis {
    const formattedError = ErrorFormatter.formatError(error, 'critical')
    return {
      originalError: formattedError,
      suggestions: this.getDefaultSuggestions(formattedError.message),
      confidence: 0.3,
      analysisTime: Date.now() - startTime,
    }
  }

  private getDefaultSuggestions(errorMessage: string): string[] {
    const suggestions: string[] = []

    if (errorMessage.includes('ENOENT') || errorMessage.includes('file not found')) {
      suggestions.push('Check if the file path is correct and the file exists')
      suggestions.push('Verify file permissions and accessibility')
    }

    if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
      suggestions.push('Check file/directory permissions')
      suggestions.push('Run with appropriate user privileges')
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      suggestions.push('Check network connectivity')
      suggestions.push('Verify API endpoints and credentials')
      suggestions.push('Consider implementing retry logic')
    }

    if (errorMessage.includes('timeout')) {
      suggestions.push('Increase timeout values')
      suggestions.push('Optimize performance to reduce execution time')
      suggestions.push('Implement proper error handling for timeouts')
    }

    if (suggestions.length === 0) {
      suggestions.push('Check the error message and stack trace for clues')
      suggestions.push('Review recent code changes that might have caused this issue')
      suggestions.push('Consult documentation for the relevant APIs or libraries')
    }

    return suggestions
  }

  private createCacheKey(message: string, context?: any): string {
    const contextStr = context ? JSON.stringify(context) : ''
    return `${message}:${contextStr}`.slice(0, 100) // Limit key length
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI analysis timeout')), timeout)
    })
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIErrorAnalyzerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Export a default instance for convenience
export const defaultAIErrorAnalyzer = new AIErrorAnalyzer()

/**
 * Convenience function to analyze an error with AI
 */
export async function analyzeErrorWithAI(
  error: Error | string,
  context?: {
    filePath?: string
    codeSnippet?: string
    stackTrace?: string
    environment?: string
  }
): Promise<AIErrorAnalysis> {
  return defaultAIErrorAnalyzer.analyzeError(error, context)
}

/**
 * Convenience function to get AI-powered code suggestions
 */
export async function getAICodeSuggestions(
  codeSnippet: string,
  context: {
    language?: string
    framework?: string
    purpose?: string
  } = {}
): Promise<string[]> {
  return defaultAIErrorAnalyzer.getSuggestions(codeSnippet, context)
}