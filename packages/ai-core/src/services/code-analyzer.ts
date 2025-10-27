/**
 * CodeAnalyzer Service
 *
 * Provides intelligent code analysis capabilities including:
 * - Code quality assessment
 * - Security vulnerability detection
 * - Performance optimization suggestions
 * - Refactoring recommendations
 */

import type {
  AIProvider,
  CodeAnalysisOptions,
  CodeAnalysisResult,
  CodeSuggestion,
  PerformanceIssue,
  QualityMetrics,
  SecurityIssue,
} from '../types/index.js';

export interface CodeAnalyzerConfig {
  provider: AIProvider;
  defaultLanguage?: string;
  enableCaching?: boolean;
  customRules?: string[];
}

export interface FileAnalysisResult extends CodeAnalysisResult {
  filePath: string;
  language: string;
  analysisTime: number;
}

export interface ProjectAnalysisResult {
  files: FileAnalysisResult[];
  summary: ProjectSummary;
  recommendations: ProjectRecommendation[];
  totalAnalysisTime: number;
}

export interface ProjectSummary {
  totalFiles: number;
  totalLines: number;
  averageComplexity: number;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  criticalIssues: number;
  securityIssues: number;
  performanceIssues: number;
}

export interface ProjectRecommendation {
  type: 'architecture' | 'security' | 'performance' | 'maintainability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedEffort: string;
}

export class CodeAnalyzer {
  private provider: AIProvider;
  private config: CodeAnalyzerConfig;
  private cache = new Map<string, CodeAnalysisResult>();

  constructor(config?: CodeAnalyzerConfig) {
    if (!config) {
      // Default configuration for testing
      this.config = {
        provider: {
          name: 'test-provider',
          version: '1.0.0',
          generateText: async () => 'Generated text',
          generateChangelog: async () => ({
            version: '1.0.0',
            content: 'Generated changelog',
            format: 'markdown',
          }),
          analyzeCode: async () => ({
            quality: {
              complexity: 1,
              maintainability: 1,
              codeSmells: [],
              duplications: [],
            },
            security: [],
            performance: [],
            suggestions: [],
            metrics: {
              linesOfCode: 0,
              cyclomaticComplexity: 0,
              cognitiveComplexity: 0,
              maintainabilityIndex: 0,
              technicalDebt: '0h',
            },
          }),
        } as AIProvider,
        defaultLanguage: 'javascript',
        enableCaching: false,
        customRules: [],
      };
    } else {
      this.config = config;
    }
    this.provider = this.config.provider;
  }

  /**
   * Analyze a single code file
   */
  async analyzeFile(
    code: string,
    filePath: string,
    options: CodeAnalysisOptions = {},
  ): Promise<FileAnalysisResult> {
    const startTime = Date.now();

    // Detect language from file extension if not provided
    const language = options.language || this.detectLanguage(filePath);

    // Check cache if enabled
    const cacheKey = this.getCacheKey(code, options);
    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey)!;
      return {
        ...cachedResult,
        filePath,
        language,
        analysisTime: Date.now() - startTime,
      };
    }

    // Perform AI analysis
    const analysisOptions: CodeAnalysisOptions = {
      language,
      analysisType: 'all',
      includeMetrics: true,
      ...options,
    };

    const result = await this.provider.analyzeCode(code, analysisOptions);

    // Cache result if enabled
    if (this.config.enableCaching) {
      this.cache.set(cacheKey, result);
    }

    return {
      ...result,
      filePath,
      language,
      analysisTime: Date.now() - startTime,
    };
  }

  /**
   * Analyze multiple files in a project
   */
  async analyzeProject(
    files: Array<{ path: string; content: string }>,
    options: CodeAnalysisOptions = {},
  ): Promise<ProjectAnalysisResult> {
    const startTime = Date.now();
    const fileResults: FileAnalysisResult[] = [];

    // Analyze files in parallel (with concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((file) => this.analyzeFile(file.content, file.path, options)),
      );
      fileResults.push(...batchResults);
    }

    // Generate project summary
    const summary = this.generateProjectSummary(fileResults);
    const recommendations =
      await this.generateProjectRecommendations(fileResults);

    return {
      files: fileResults,
      summary,
      recommendations,
      totalAnalysisTime: Date.now() - startTime,
    };
  }

  /**
   * Get security-focused analysis
   */
  async analyzeSecurityIssues(
    code: string,
    filePath: string,
    options: CodeAnalysisOptions = {},
  ): Promise<SecurityIssue[]> {
    const result = await this.analyzeFile(code, filePath, {
      ...options,
      analysisType: 'security',
    });
    return result.security;
  }

  /**
   * Get performance-focused analysis
   */
  async analyzePerformance(
    code: string,
    filePath: string,
    options: CodeAnalysisOptions = {},
  ): Promise<PerformanceIssue[]> {
    const result = await this.analyzeFile(code, filePath, {
      ...options,
      analysisType: 'performance',
    });
    return result.performance;
  }

  /**
   * Get refactoring suggestions
   */
  async getRefactoringSuggestions(
    code: string,
    filePath: string,
    options: CodeAnalysisOptions = {},
  ): Promise<CodeSuggestion[]> {
    const result = await this.analyzeFile(code, filePath, options);
    return result.suggestions.filter((s) => s.type === 'refactor');
  }

  /**
   * Compare code quality between versions
   */
  async compareCodeQuality(
    oldCode: string,
    newCode: string,
    filePath: string,
  ): Promise<{
    oldMetrics: QualityMetrics;
    newMetrics: QualityMetrics;
    improvement: number;
    regressions: string[];
    improvements: string[];
  }> {
    const [oldResult, newResult] = await Promise.all([
      this.analyzeFile(oldCode, filePath, { analysisType: 'quality' }),
      this.analyzeFile(newCode, filePath, { analysisType: 'quality' }),
    ]);

    const improvement =
      newResult.quality.maintainability - oldResult.quality.maintainability;
    const regressions: string[] = [];
    const improvements: string[] = [];

    if (newResult.quality.complexity > oldResult.quality.complexity) {
      regressions.push('Increased complexity');
    } else if (newResult.quality.complexity < oldResult.quality.complexity) {
      improvements.push('Reduced complexity');
    }

    if (
      newResult.quality.codeSmells.length > oldResult.quality.codeSmells.length
    ) {
      regressions.push('More code smells detected');
    } else if (
      newResult.quality.codeSmells.length < oldResult.quality.codeSmells.length
    ) {
      improvements.push('Fewer code smells');
    }

    return {
      oldMetrics: oldResult.quality,
      newMetrics: newResult.quality,
      improvement,
      regressions,
      improvements,
    };
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
    };

    return (
      languageMap[extension || ''] ||
      this.config.defaultLanguage ||
      'typescript'
    );
  }

  private getCacheKey(code: string, options: CodeAnalysisOptions): string {
    const optionsStr = JSON.stringify(options);
    const codeHash = this.simpleHash(code);
    return `${codeHash}-${this.simpleHash(optionsStr)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private generateProjectSummary(
    results: FileAnalysisResult[],
  ): ProjectSummary {
    const totalFiles = results.length;
    const totalLines = results.reduce(
      (sum, r) => sum + (r.metrics?.linesOfCode || 0),
      0,
    );
    const averageComplexity =
      totalFiles > 0
        ? results.reduce(
            (sum, r) => sum + (r.metrics?.cyclomaticComplexity || 0),
            0,
          ) / totalFiles
        : 0;

    const criticalIssues = results.reduce(
      (sum, r) =>
        sum +
        (r.security?.filter((s) => s.severity === 'critical').length || 0) +
        (r.performance?.filter((p) => p.severity === 'critical').length || 0),
      0,
    );

    const securityIssues = results.reduce(
      (sum, r) => sum + (r.security?.length || 0),
      0,
    );
    const performanceIssues = results.reduce(
      (sum, r) => sum + (r.performance?.length || 0),
      0,
    );

    let overallQuality: ProjectSummary['overallQuality'] = 'excellent';
    if (criticalIssues > 0 || averageComplexity > 20) {
      overallQuality = 'poor';
    } else if (
      securityIssues > 5 ||
      performanceIssues > 10 ||
      averageComplexity > 15
    ) {
      overallQuality = 'fair';
    } else if (
      securityIssues > 2 ||
      performanceIssues > 5 ||
      averageComplexity > 10
    ) {
      overallQuality = 'good';
    }

    return {
      totalFiles,
      totalLines,
      averageComplexity,
      overallQuality,
      criticalIssues,
      securityIssues,
      performanceIssues,
    };
  }

  private async generateProjectRecommendations(
    results: FileAnalysisResult[],
  ): Promise<ProjectRecommendation[]> {
    const recommendations: ProjectRecommendation[] = [];

    // Security recommendations
    const criticalSecurityFiles = results.filter(
      (r) => r.security?.some((s) => s.severity === 'critical') || false,
    );
    if (criticalSecurityFiles.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        title: 'Critical Security Vulnerabilities Detected',
        description: `${criticalSecurityFiles.length} files contain critical security issues that need immediate attention.`,
        affectedFiles: criticalSecurityFiles.map((f) => f.filePath),
        estimatedEffort: '1-2 days',
      });
    }

    // Performance recommendations
    const highComplexityFiles = results.filter(
      (r) => r.metrics.cyclomaticComplexity > 15,
    );
    if (highComplexityFiles.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'High Complexity Code Detected',
        description: `${highComplexityFiles.length} files have high cyclomatic complexity and should be refactored.`,
        affectedFiles: highComplexityFiles.map((f) => f.filePath),
        estimatedEffort: '3-5 days',
      });
    }

    // Maintainability recommendations
    const lowMaintainabilityFiles = results.filter(
      (r) => r.metrics.maintainabilityIndex < 50,
    );
    if (lowMaintainabilityFiles.length > 0) {
      recommendations.push({
        type: 'maintainability',
        priority: 'medium',
        title: 'Low Maintainability Index',
        description: `${lowMaintainabilityFiles.length} files have low maintainability scores and could benefit from refactoring.`,
        affectedFiles: lowMaintainabilityFiles.map((f) => f.filePath),
        estimatedEffort: '2-4 days',
      });
    }

    return recommendations;
  }
}
