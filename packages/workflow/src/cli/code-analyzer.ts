/**
 * Code Analyzer CLI Command
 *
 * Provides code analysis capabilities using AI-powered analysis
 */

import fs, { statSync } from 'node:fs'
import path from 'node:path'
import { confirm, intro, outro, select, text } from '@clack/prompts'
import {
  CloudflareWorkersAI,
  type CodeAnalysisResult,
  CodeAnalyzer,
  type CodeSuggestion,
  createAIConfigFromEnv,
  type PerformanceIssue,
  type SecurityIssue,
} from '@g-1/ai-core'
import type { ProjectAnalysisResult } from '@g-1/ai-core/services'
import chalk from 'chalk'
import { Command } from 'commander'
import { glob } from 'glob'
import { loadWorkflowConfig } from '../config/workflow-config.js'
import { G1_ICONS, g1Log } from '../core/error-formatter.js'

export interface CodeAnalyzerCommandOptions {
  config?: string
  verbose?: boolean
  dryRun?: boolean
  force?: boolean
  output?: string
  format?: 'json' | 'markdown' | 'text'
  nonInteractive?: boolean
  files?: string[]
  exclude?: string[]
  maxFileSize?: string
  includeTests?: boolean
  securityOnly?: boolean
  performanceOnly?: boolean
  qualityOnly?: boolean
  language?: string
}

/**
 * Creates the code analyzer command
 */
export function createCodeAnalyzerCommand(): Command {
  const command = new Command('analyze')
    .description('Analyze code quality, security, and performance')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--dry-run', 'Show what would be analyzed without running')
    .option('-f, --force', 'Force analysis of large files')
    .option('-o, --output <path>', 'Output file path')
    .option('--format <format>', 'Output format (json, markdown, text)', 'text')
    .option('--non-interactive', 'Run in non-interactive mode')
    .option('--files <patterns...>', 'File patterns to analyze')
    .option('--exclude <patterns...>', 'File patterns to exclude')
    .option('--max-file-size <size>', 'Maximum file size in bytes', '1048576')
    .option('--include-tests', 'Include test files in analysis')
    .option('--security-only', 'Only run security analysis')
    .option('--performance-only', 'Only run performance analysis')
    .option('--quality-only', 'Only run quality analysis')

  command
    .command('file <filePath>')
    .description('Analyze a single file')
    .action(async (filePath: string) => {
      const options = command.opts() as CodeAnalyzerCommandOptions
      await runFileAnalysisCommand(filePath, options)
    })

  command
    .command('project [directory]')
    .description('Analyze an entire project')
    .action(async (directory: string = process.cwd()) => {
      const options = command.opts() as CodeAnalyzerCommandOptions
      await runProjectAnalysisCommand(directory, options)
    })

  command
    .command('compare <file1> <file2>')
    .description('Compare code quality between two files')
    .action(async (file1: string, file2: string) => {
      const options = command.opts() as CodeAnalyzerCommandOptions
      await runCompareCommand(file1, file2, options)
    })

  command.action(async () => {
    const options = command.opts() as CodeAnalyzerCommandOptions
    if (options.nonInteractive) {
      await runProjectAnalysisCommand(process.cwd(), options)
    } else {
      await runInteractiveAnalysis(options)
    }
  })

  return command
}

/**
 * Run interactive analysis workflow
 */
async function runInteractiveAnalysis(options: CodeAnalyzerCommandOptions): Promise<void> {
  intro(chalk.cyan('🔍 G1 Code Analyzer'))

  const analysisType = await select({
    message: 'What would you like to analyze?',
    options: [
      { value: 'file', label: 'Single file' },
      { value: 'project', label: 'Entire project' },
      { value: 'compare', label: 'Compare two files' },
    ],
  })

  if (analysisType === 'file') {
    const filePath = await text({
      message: 'Enter file path:',
      placeholder: './src/index.ts',
    })

    if (typeof filePath === 'string') {
      await runFileAnalysisCommand(filePath, options)
    }
  } else if (analysisType === 'project') {
    const directory = await text({
      message: 'Enter project directory:',
      placeholder: process.cwd(),
    })

    const dir = typeof directory === 'string' ? directory : process.cwd()
    await runProjectAnalysisCommand(dir, options)
  } else if (analysisType === 'compare') {
    const file1 = await text({
      message: 'Enter first file path:',
      placeholder: './src/old.ts',
    })

    const file2 = await text({
      message: 'Enter second file path:',
      placeholder: './src/new.ts',
    })

    if (typeof file1 === 'string' && typeof file2 === 'string') {
      await runCompareCommand(file1, file2, options)
    }
  }

  outro(chalk.green('Analysis complete!'))
}

/**
 * Run file analysis command
 */
async function runFileAnalysisCommand(
  filePath: string,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  try {
    // Check file exists and size
    const stats = statSync(filePath)
    const maxSize = parseInt(options.maxFileSize || '1048576', 10)

    if (stats.size > maxSize && !options.force) {
      const shouldContinue = await confirm({
        message: `File is ${Math.round(stats.size / 1024)}KB (max: ${Math.round(maxSize / 1024)}KB). Continue anyway?`,
      })

      if (!shouldContinue) {
        g1Log.info('Analysis cancelled')
        return
      }
    }

    const analyzer = await createCodeAnalyzer(options)
    if (!analyzer) {
      g1Log.error('Failed to create code analyzer')
      return
    }

    if (options.dryRun) {
      g1Log.info(`Would analyze: ${filePath}`)
      outro('Dry run complete')
      return
    }

    g1Log.info('Running AI analysis...')

    // Read file content
    const { readFile } = await import('node:fs/promises')
    const fileContent = await readFile(filePath, 'utf-8')

    const result = await analyzer.analyzeFile(fileContent, filePath, {
      language: options.language || path.extname(filePath).slice(1),
      analysisType: options.securityOnly
        ? 'security'
        : options.performanceOnly
          ? 'performance'
          : options.qualityOnly
            ? 'quality'
            : 'all',
      includeMetrics: true,
    })

    await displayAnalysisResult(result, options)

    if (options.output) {
      await saveAnalysisResult(result, options.output, options.format || 'text')
    }

    outro('File analysis complete!')
  } catch (error) {
    g1Log.error(`File analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Run project analysis command (simplified)
 */
async function runProjectAnalysisCommand(
  directory: string,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  try {
    g1Log.info(`Analyzing project in ${directory}...`)

    // For now, just analyze individual files since the project analysis API is different
    const patterns = options.files || ['**/*.{js,ts,jsx,tsx,py,java,cpp,c,cs}']
    const files = await glob(patterns, {
      cwd: directory,
      ignore: options.exclude || ['node_modules/**', 'dist/**', 'build/**'],
    })

    const analyzer = await createCodeAnalyzer(options)
    if (!analyzer) {
      g1Log.error('Failed to create code analyzer')
      return
    }

    for (const file of files.slice(0, 5)) {
      // Limit to 5 files for demo
      const filePath = path.join(directory, file)
      g1Log.info(`Analyzing ${file}...`)

      try {
        const code = fs.readFileSync(filePath, 'utf-8')
        const result = await analyzer.analyzeFile(code, filePath, {
          language: path.extname(filePath).slice(1),
          analysisType: 'all',
          includeMetrics: true,
        })

        g1Log.info(
          `${file}: Quality ${result.quality.complexity}/10, ${result.security.length} security issues`
        )
      } catch (error: any) {
        g1Log.error(`Failed to analyze ${file}: ${error.message}`)
      }
    }

    const results = await analyzer.analyzeProject(
      await Promise.all(
        files.map(async (filePath) => {
          const { readFile } = await import('node:fs/promises')
          const content = await readFile(filePath, 'utf-8')
          return { path: filePath, content }
        })
      ),
      {
        language: options.language,
        analysisType: options.securityOnly
          ? 'security'
          : options.performanceOnly
            ? 'performance'
            : options.qualityOnly
              ? 'quality'
              : 'all',
        includeMetrics: true,
      }
    )

    await displayProjectAnalysisResult(results, options)

    if (options.output) {
      await saveAnalysisResult(results, options.output, options.format || 'text')
      g1Log.success(`Results saved to ${options.output}`)
    }

    outro('Project analysis complete!')
  } catch (error) {
    g1Log.error(
      `Project analysis failed: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

/**
 * Run compare command (simplified)
 */
async function runCompareCommand(
  file1: string,
  file2: string,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  try {
    intro(`$G1_ICONS.searchCodeComparison`)

    const analyzer = await createCodeAnalyzer(options)
    if (!analyzer) {
      g1Log.error('Failed to create code analyzer')
      process.exit(1)
    }

    if (options.dryRun) {
      g1Log.info(`Would compare: $file1vs $file2`)
      outro('Dry run complete')
      return
    }

    // Read file contents
    const fs = await import('node:fs/promises')
    const oldCode = await fs.readFile(file1, 'utf-8')
    const newCode = await fs.readFile(file2, 'utf-8')

    const comparison = await analyzer.compareCodeQuality(oldCode, newCode, file1)

    g1Log.info(`Comparison complete:`)
    g1Log.info(`Improvement: $comparison.improvement%`)
    g1Log.info(`Improvements: $comparison.improvements.join(', ')`)
    g1Log.info(`Regressions: $comparison.regressions.join(', ')`)

    if (options.output) {
      await saveComparisonResult(comparison, options.output, options.format || 'text')
      g1Log.success(`Results saved to $options.output`)
    }

    outro('Comparison complete!')
  } catch (error) {
    g1Log.error(`Comparison failed: $error instanceof Error ? error.message : String(error)`)
    process.exit(1)
  }
}

/**
 * Create code analyzer instance
 */
async function createCodeAnalyzer(
  options: CodeAnalyzerCommandOptions
): Promise<CodeAnalyzer | null> {
  try {
    const config = await loadWorkflowConfig(options.config)
    const aiConfig = createAIConfigFromEnv()

    if (!aiConfig) {
      g1Log.error('AI configuration not found. Please set up your AI provider.')
      return null
    }

    const cloudflareConfig = aiConfig.getProviderConfig('cloudflare')
    if (!cloudflareConfig) {
      g1Log.error('Cloudflare configuration not found.')
      return null
    }

    const provider = new CloudflareWorkersAI(cloudflareConfig)

    const analyzer = new CodeAnalyzer({
      provider,
      defaultLanguage: 'typescript',
      enableCaching: true,
    })

    return analyzer
  } catch (error) {
    g1Log.error(
      `Failed to create code analyzer: $error instanceof Error ? error.message : String(error)`
    )
    return null
  }
}

/**
 * Display analysis result
 */
async function displayAnalysisResult(
  result: CodeAnalysisResult,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  g1Log.info('\n📊 Analysis Results:')

  // Quality metrics
  g1Log.info(`\n${G1_ICONS.quality} Quality:`)
  g1Log.info(`  Complexity: ${result.quality.complexity}/10`)
  g1Log.info(`  Maintainability: ${result.quality.maintainability}/10`)
  g1Log.info(`  Code smells: ${result.quality.codeSmells.length}`)

  // Security issues
  if (result.security && result.security.length > 0) {
    g1Log.info(`\n${G1_ICONS.security} Security Issues:`)
    result.security.forEach((issue: SecurityIssue) => {
      const severity = getSeverityColor(issue.severity)
      g1Log.info(`  ${severity(issue.severity.toUpperCase())}: ${issue.description}`)
      if (issue.line) g1Log.info(`    Line ${issue.line}`)
      if (issue.fix) g1Log.info(`    💡 ${issue.fix}`)
    })
  }

  // Performance issues
  if (result.performance && result.performance.length > 0) {
    g1Log.info(`\n${G1_ICONS.performance} Performance Issues:`)
    result.performance.forEach((issue: PerformanceIssue) => {
      const severity = getSeverityColor(issue.severity)
      g1Log.info(`  ${severity(issue.severity.toUpperCase())}: ${issue.description}`)
      if (issue.line) g1Log.info(`    Line ${issue.line}`)
      if (issue.suggestion) g1Log.info(`    💡 ${issue.suggestion}`)
    })
  }

  // Suggestions
  if (result.suggestions && result.suggestions.length > 0) {
    g1Log.info(`\n${G1_ICONS.info} Suggestions:`)
    result.suggestions.forEach((suggestion: CodeSuggestion) => {
      g1Log.info(`  ${suggestion.type?.toUpperCase() || 'SUGGESTION'}: ${suggestion.description}`)
      if (suggestion.before && suggestion.after) {
        g1Log.info(`    Before: ${suggestion.before}`)
        g1Log.info(`    After: ${suggestion.after}`)
      }
      if (suggestion.reasoning) g1Log.info(`    Reasoning: ${suggestion.reasoning}`)
    })
  }
}

/**
 * Display project analysis result
 */
async function displayProjectAnalysisResult(
  result: ProjectAnalysisResult,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  g1Log.info('\n📊 Project Analysis Results:')

  // Project summary
  g1Log.info(`\n${G1_ICONS.info} Project Summary:`)
  g1Log.info(`  Total files: ${result.summary.totalFiles}`)
  g1Log.info(`  Total lines: ${result.summary.totalLines}`)
  g1Log.info(`  Average complexity: ${result.summary.averageComplexity.toFixed(2)}`)
  g1Log.info(
    `  Overall quality: ${getScoreColor(result.summary.overallQuality === 'excellent' ? 90 : result.summary.overallQuality === 'good' ? 75 : result.summary.overallQuality === 'fair' ? 50 : 25)(result.summary.overallQuality.toUpperCase())}`
  )
  g1Log.info(`  Critical issues: ${result.summary.criticalIssues}`)
  g1Log.info(`  Security issues: ${result.summary.securityIssues}`)
  g1Log.info(`  Performance issues: ${result.summary.performanceIssues}`)

  // File results summary
  if (result.files.length > 0) {
    g1Log.info(`\n${G1_ICONS.quality} File Analysis Summary:`)
    result.files.forEach((file) => {
      const score = getScoreColor(file.overallScore)
      g1Log.info(`  ${file.filePath}: ${score(file.overallScore.toFixed(1))}/10`)
    })
  }

  // Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    g1Log.info(`\n${G1_ICONS.info} Recommendations:`)
    result.recommendations.forEach((rec) => {
      const priority = getSeverityColor(rec.priority)
      g1Log.info(`  ${priority(rec.priority.toUpperCase())}: ${rec.title}`)
      g1Log.info(`    ${rec.description}`)
      g1Log.info(`    Estimated effort: ${rec.estimatedEffort}`)
      if (rec.affectedFiles.length > 0) {
        g1Log.info(
          `    Affected files: ${rec.affectedFiles.slice(0, 3).join(', ')}${rec.affectedFiles.length > 3 ? ` and ${rec.affectedFiles.length - 3} more` : ''}`
        )
      }
    })
  }

  g1Log.info(`\n⏱️  Analysis completed in ${result.totalAnalysisTime}ms`)
}

/**
 * Save analysis result to file
 */
async function saveAnalysisResult(
  result: CodeAnalysisResult | ProjectAnalysisResult,
  outputPath: string,
  format: string
): Promise<void> {
  let content: string

  switch (format) {
    case 'json':
      content = JSON.stringify(result, null, 2)
      break
    case 'markdown':
      content = isProjectAnalysisResult(result)
        ? formatProjectAsMarkdown(result)
        : formatAsMarkdown(result)
      break
    default:
      content = isProjectAnalysisResult(result) ? formatProjectAsText(result) : formatAsText(result)
  }

  fs.writeFileSync(outputPath, content)
  g1Log.info(`Results saved to ${outputPath}`)
}

async function saveComparisonResult(
  result: {
    oldMetrics: any
    newMetrics: any
    improvement: number
    regressions: string[]
    improvements: string[]
  },
  outputPath: string,
  format: string
): Promise<void> {
  const fs = await import('node:fs/promises')

  let content: string

  if (format === 'json') {
    content = JSON.stringify(result, null, 2)
  } else if (format === 'markdown') {
    content = formatComparisonAsMarkdown(result)
  } else {
    content = formatComparisonAsText(result)
  }

  await fs.writeFile(outputPath, content, 'utf-8')
}

/**
 * Type guard to check if result is ProjectAnalysisResult
 */
function isProjectAnalysisResult(
  result: CodeAnalysisResult | ProjectAnalysisResult
): result is ProjectAnalysisResult {
  return 'files' in result && 'summary' in result && 'recommendations' in result
}

/**
 * Format result as markdown
 */
function formatAsMarkdown(result: CodeAnalysisResult): string {
  return `# Code Analysis Report

## Quality Metrics
- Complexity: ${result.quality.complexity}/10
- Maintainability: ${result.quality.maintainability}/10

## Issues
- Security: ${result.security.length}
- Performance: ${result.performance.length}
- Suggestions: ${result.suggestions.length}
`
}

/**
 * Format project result as markdown
 */
function formatProjectAsMarkdown(result: ProjectAnalysisResult): string {
  return `# Project Analysis Report

## Project Summary
- Total files: ${result.summary.totalFiles}
- Total lines: ${result.summary.totalLines}
- Average complexity: ${result.summary.averageComplexity.toFixed(2)}
- Overall quality: ${result.summary.overallQuality}
- Critical issues: ${result.summary.criticalIssues}
- Security issues: ${result.summary.securityIssues}
- Performance issues: ${result.summary.performanceIssues}

## File Analysis
${result.files.map((file) => `- ${file.filePath}: ${file.overallScore.toFixed(1)}/10`).join('\n')}

## Recommendations
${result.recommendations
  .map(
    (rec) => `### ${rec.title} (${rec.priority})
${rec.description}
- Estimated effort: ${rec.estimatedEffort}
- Affected files: ${rec.affectedFiles.length}`
  )
  .join('\n\n')}

Analysis completed in ${result.totalAnalysisTime}ms
`
}

/**
 * Format result as text
 */
function formatAsText(result: CodeAnalysisResult): string {
  return `Code Analysis Report
===================

Quality: ${result.quality.complexity}/10
Security Issues: ${result.security.length}
Performance Issues: ${result.performance.length}
Suggestions: ${result.suggestions.length}
`
}

/**
 * Format project result as text
 */
function formatProjectAsText(result: ProjectAnalysisResult): string {
  return `Project Analysis Report
======================

Total files: ${result.summary.totalFiles}
Total lines: ${result.summary.totalLines}
Average complexity: ${result.summary.averageComplexity.toFixed(2)}
Overall quality: ${result.summary.overallQuality}
Critical issues: ${result.summary.criticalIssues}
Security issues: ${result.summary.securityIssues}
Performance issues: ${result.summary.performanceIssues}

Analysis completed in ${result.totalAnalysisTime}ms
`
}

/**
 * Get color for score
 */
function getScoreColor(score: number): (text: string) => string {
  if (score >= 8) return chalk.green
  if (score >= 6) return chalk.yellow
  return chalk.red
}

/**
 * Get color for severity
 */
function getSeverityColor(severity: string): (text: string) => string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return chalk.red
    case 'high':
      return chalk.red
    case 'medium':
      return chalk.yellow
    case 'low':
      return chalk.blue
    default:
      return chalk.gray
  }
}

/**
 * Format comparison result as markdown
 */
function formatComparisonAsMarkdown(result: {
  oldMetrics: any
  newMetrics: any
  improvement: number
  regressions: string[]
  improvements: string[]
}): string {
  return `# Code Quality Comparison

## Summary
- **Improvement Score**: ${result.improvement}
- **Regressions**: ${result.regressions.length}
- **Improvements**: ${result.improvements.length}

## Regressions
${result.regressions.map((r) => `- ${r}`).join('\n')}

## Improvements
${result.improvements.map((i) => `- ${i}`).join('\n')}

## Detailed Metrics
### Old Metrics
\`\`\`json
${JSON.stringify(result.oldMetrics, null, 2)}
\`\`\`

### New Metrics
\`\`\`json
${JSON.stringify(result.newMetrics, null, 2)}
\`\`\`
`
}

/**
 * Format comparison result as text
 */
function formatComparisonAsText(result: {
  oldMetrics: any
  newMetrics: any
  improvement: number
  regressions: string[]
  improvements: string[]
}): string {
  return `Code Quality Comparison

Summary:
- Improvement Score: ${result.improvement}
- Regressions: ${result.regressions.length}
- Improvements: ${result.improvements.length}

Regressions:
${result.regressions.map((r) => `- ${r}`).join('\n')}

Improvements:
${result.improvements.map((i) => `- ${i}`).join('\n')}

Old Metrics:
${JSON.stringify(result.oldMetrics, null, 2)}

New Metrics:
${JSON.stringify(result.newMetrics, null, 2)}
`
}
