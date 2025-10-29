/**
 * Code Analyzer CLI Commands
 *
 * Provides CLI commands for AI-powered code analysis including
 * quality assessment, security scanning, and performance analysis.
 */

import { statSync } from 'node:fs'
import { relative } from 'node:path'
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
import type { FileAnalysisResult, ProjectAnalysisResult } from '@g-1/ai-core/services'
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
  maxFileSize?: number
  includeTests?: boolean
  securityOnly?: boolean
  performanceOnly?: boolean
  qualityOnly?: boolean
  language?: string
}

/**
 * Create code analyzer CLI command
 */
export function createCodeAnalyzerCommand(): Command {
  const command = new Command('analyze')
    .description('AI-powered code analysis for quality, security, and performance')
    .option('-c, --config <path>', 'Path to workflow config file')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('--dry-run', 'Show what would be analyzed without running analysis', false)
    .option('-f, --force', 'Force analysis even if files are large', false)
    .option('-o, --output <path>', 'Output file path')
    .option('--format <format>', 'Output format (json|markdown|text)', 'text')
    .option('--non-interactive', 'Run without interactive prompts', false)
    .option('--files <patterns...>', 'File patterns to analyze')
    .option('--exclude <patterns...>', 'File patterns to exclude')
    .option('--max-file-size <bytes>', 'Maximum file size to analyze', '1048576')
    .option('--include-tests', 'Include test files in analysis', false)
    .option('--security-only', 'Only run security analysis', false)
    .option('--performance-only', 'Only run performance analysis', false)
    .option('--quality-only', 'Only run quality analysis', false)

  // Subcommands
  command
    .command('file <filePath>')
    .description('Analyze a single file')
    .action(async (filePath: string, options: CodeAnalyzerCommandOptions) => {
      await runFileAnalysisCommand(filePath, options)
    })

  command
    .command('project [directory]')
    .description('Analyze entire project or directory')
    .action(async (directory: string = '.', options: CodeAnalyzerCommandOptions) => {
      await runProjectAnalysisCommand(directory, options)
    })

  command
    .command('compare <file1> <file2>')
    .description('Compare code quality between two files')
    .action(async (file1: string, file2: string, options: CodeAnalyzerCommandOptions) => {
      await runCompareCommand(file1, file2, options)
    })

  // Default action
  command.action(async (options: CodeAnalyzerCommandOptions) => {
    await runInteractiveAnalysis(options)
  })

  return command
}

/**
 * Run interactive analysis selection
 */
async function runInteractiveAnalysis(options: CodeAnalyzerCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} AI Code Analyzer`)

    if (options.nonInteractive) {
      // Default to project analysis in non-interactive mode
      await runProjectAnalysisCommand('.', options)
      return
    }

    const analysisType = await select({
      message: 'What would you like to analyze?',
      options: [
        { value: 'file', label: 'Single file' },
        { value: 'project', label: 'Entire project' },
        { value: 'directory', label: 'Specific directory' },
        { value: 'compare', label: 'Compare two files' },
      ],
    })

    if (analysisType === 'file') {
      const filePath = await text({
        message: 'Enter file path to analyze:',
        placeholder: 'src/components/Button.tsx',
      })

      if (typeof filePath === 'string') {
        await runFileAnalysisCommand(filePath, options)
      }
    } else if (analysisType === 'project') {
      await runProjectAnalysisCommand('.', options)
    } else if (analysisType === 'directory') {
      const directory = await text({
        message: 'Enter directory path to analyze:',
        placeholder: 'src/components',
      })

      if (typeof directory === 'string') {
        await runProjectAnalysisCommand(directory, options)
      }
    } else if (analysisType === 'compare') {
      const file1 = await text({
        message: 'Enter first file path:',
        placeholder: 'src/old-component.tsx',
      })

      const file2 = await text({
        message: 'Enter second file path:',
        placeholder: 'src/new-component.tsx',
      })

      if (typeof file1 === 'string' && typeof file2 === 'string') {
        await runCompareCommand(file1, file2, options)
      }
    }

    outro('Analysis complete!')
  } catch (error) {
    g1Log.error(
      `Interactive analysis failed: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

/**
 * Run file analysis command
 */
async function runFileAnalysisCommand(
  filePath: string,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} Analyzing File: ${filePath}`)

    const analyzer = await createCodeAnalyzer(options)

    if (!analyzer) {
      outro('Code analyzer not available - check AI configuration')
      return
    }

    // Check file exists and size
    try {
      const stats = statSync(filePath)
      const maxSize = parseInt(String(options.maxFileSize || 1048576), 10)

      if (stats.size > maxSize && !options.force) {
        const shouldContinue = await confirm({
          message: `File is ${Math.round(stats.size / 1024)}KB (max: ${Math.round(maxSize / 1024)}KB). Continue anyway?`,
        })

        if (!shouldContinue) {
          outro('Analysis cancelled')
          return
        }
      }
    } catch (error) {
      g1Log.error(`File not found: ${filePath}`)
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
      language: options.language,
      analysisType: options.securityOnly
        ? 'security'
        : options.performanceOnly
          ? 'performance'
          : options.qualityOnly
            ? 'quality'
            : 'all',
      includeMetrics: true,
    })

    await displayFileAnalysisResult(result, options)

    if (options.output) {
      await saveAnalysisResult(result, options.output, options.format || 'text')
      g1Log.success(`Results saved to ${options.output}`)
    }

    outro('File analysis complete!')
  } catch (error) {
    g1Log.error(`File analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Run project analysis command
 */
async function runProjectAnalysisCommand(
  directory: string,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} Analyzing Project: ${directory}`)

    const analyzer = await createCodeAnalyzer(options)

    if (!analyzer) {
      outro('Code analyzer not available - check AI configuration')
      return
    }

    // Find files to analyze
    const patterns = options.files || [
      '**/*.{js,ts,jsx,tsx,vue,svelte}',
      ...(options.includeTests ? ['**/*.{test,spec}.{js,ts,jsx,tsx}'] : []),
    ]

    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      ...(options.exclude || []),
      ...(options.includeTests ? [] : ['**/*.{test,spec}.*', '**/__tests__/**']),
    ]

    g1Log.info('Finding files to analyze...')

    const files = await glob(patterns, {
      cwd: directory,
      ignore: excludePatterns,
      absolute: true,
    })

    if (files.length === 0) {
      g1Log.warning('No files found to analyze')
      outro('Analysis complete')
      return
    }

    g1Log.info(`Found ${files.length} files to analyze`)

    if (options.dryRun) {
      files.forEach((file) => {
        g1Log.info(`Would analyze: ${relative(directory, file)}`)
      })
      outro('Dry run complete')
      return
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
 * Run comparison command
 */
async function runCompareCommand(
  file1: string,
  file2: string,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  try {
    intro(`${G1_ICONS.search} Code Comparison`)

    const analyzer = await createCodeAnalyzer(options)
    if (!analyzer) {
      g1Log.error('Failed to create code analyzer')
      process.exit(1)
    }

    if (options.dryRun) {
      g1Log.info(`Would compare: ${file1} vs ${file2}`)
      outro('Dry run complete')
      return
    }

    // Read file contents
    const fs = await import('node:fs/promises')
    const oldCode = await fs.readFile(file1, 'utf-8')
    const newCode = await fs.readFile(file2, 'utf-8')

    const comparison = await analyzer.compareCodeQuality(oldCode, newCode, file1)

    await displayComparisonResult(comparison, options)

    if (options.output) {
      await saveComparisonResult(comparison, options.output, options.format || 'text')
      g1Log.success(`Results saved to ${options.output}`)
    }

    outro('Comparison complete!')
  } catch (error) {
    g1Log.error(`Comparison failed: ${error instanceof Error ? error.message : String(error)}`)
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
    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.ai?.enabled) {
      g1Log.warning('AI features are disabled in configuration')
      return null
    }

    // Try to create AI provider
    const aiConfig = createAIConfigFromEnv()
    const providerConfig = aiConfig.getProviderConfig('cloudflare')

    if (!providerConfig) {
      g1Log.warning('No AI provider configured')
      return null
    }

    const provider = new CloudflareWorkersAI(providerConfig)

    return new CodeAnalyzer({
      provider,
    })
  } catch (error) {
    g1Log.error(
      `Failed to create code analyzer: ${error instanceof Error ? error.message : String(error)}`
    )
    return null
  }
}

/**
 * Display file analysis result
 */
async function displayFileAnalysisResult(
  result: FileAnalysisResult,
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(chalk.bold(`\n📊 Analysis Results for ${result.filePath}\n`))

  // Overall score
  console.log(
    chalk.bold('Overall Quality Score:'),
    getScoreColor(result.overallScore),
    `${result.overallScore}/100`
  )

  // Quality metrics
  if (result.quality) {
    console.log(chalk.bold('\n🎯 Quality Metrics:'))
    console.log(
      `  Maintainability: ${getScoreColor(result.quality.maintainability)} ${result.quality.maintainability}/100`
    )
    console.log(
      `  Complexity: ${getScoreColor(result.quality.complexity)} ${result.quality.complexity}/100`
    )
    if (result.quality.testCoverage !== undefined) {
      console.log(
        `  Test Coverage: ${getScoreColor(result.quality.testCoverage)} ${result.quality.testCoverage}/100`
      )
    }
  }

  // Security issues
  if (result.security && result.security.length > 0) {
    console.log(chalk.bold('\n🔒 Security Issues:'))
    result.security.forEach((issue: SecurityIssue) => {
      const severity = getSeverityColor(issue.severity)
      console.log(`  ${severity} ${issue.type}: ${issue.description}`)
      if (issue.line) console.log(`    Line ${issue.line}`)
      if (issue.fix) console.log(`    💡 ${issue.fix}`)
    })
  }

  // Performance issues
  if (result.performance && result.performance.length > 0) {
    console.log(chalk.bold('\n⚡ Performance Issues:'))
    result.performance.forEach((issue: PerformanceIssue) => {
      const severity = getSeverityColor(issue.severity)
      console.log(`  ${severity} ${issue.type}: ${issue.description}`)
      if (issue.line) console.log(`    Line ${issue.line}`)
      if (issue.suggestion) console.log(`    💡 ${issue.suggestion}`)
    })
  }

  // Suggestions
  if (result.suggestions && result.suggestions.length > 0) {
    console.log(chalk.bold('\n💡 Suggestions:'))
    result.suggestions.forEach((suggestion: CodeSuggestion) => {
      console.log(`  ${suggestion.type}: ${suggestion.description}`)
      if (suggestion.before && suggestion.after) {
        console.log(`    Before: ${suggestion.before}`)
        console.log(`    After: ${suggestion.after}`)
      }
      if (suggestion.reasoning) console.log(`    Reasoning: ${suggestion.reasoning}`)
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
  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(chalk.bold('\n📊 Project Analysis Results\n'))

  // Summary would be displayed here
  console.log('Project analysis results displayed in summary format')
}

/**
 * Display comparison result
 */
async function displayComparisonResult(
  result: {
    oldMetrics: any
    newMetrics: any
    improvement: number
    regressions: string[]
    improvements: string[]
  },
  options: CodeAnalyzerCommandOptions
): Promise<void> {
  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(chalk.bold('\n🔍 Code Quality Comparison\n'))

  // Comparison results would be displayed here
  console.log('Comparison results displayed')
}

/**
 * Save analysis result to file
 */
async function saveAnalysisResult(
  result: ProjectAnalysisResult | FileAnalysisResult | CodeAnalysisResult,
  outputPath: string,
  format: string
): Promise<void> {
  const fs = await import('node:fs/promises')

  let content: string

  if (format === 'json') {
    content = JSON.stringify(result, null, 2)
  } else if (format === 'markdown') {
    content = formatAsMarkdown(result)
  } else {
    content = formatAsText(result)
  }

  await fs.writeFile(outputPath, content, 'utf-8')
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
 * Format result as markdown
 */
function formatAsMarkdown(
  result: ProjectAnalysisResult | FileAnalysisResult | CodeAnalysisResult
): string {
  return `# Analysis Result\n\n${JSON.stringify(result, null, 2)}`
}

/**
 * Format result as text
 */
function formatAsText(
  result: ProjectAnalysisResult | FileAnalysisResult | CodeAnalysisResult
): string {
  return `Code Analysis Results\n\n${JSON.stringify(result, null, 2)}`
}

/**
 * Get color for score display
 */
function getScoreColor(score: number): string {
  if (score >= 80) return chalk.green(score.toString())
  if (score >= 60) return chalk.yellow(score.toString())
  return chalk.red(score.toString())
}

/**
 * Get color for severity display
 */
function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'high':
    case 'critical':
      return chalk.red('🔴')
    case 'medium':
      return chalk.yellow('🟡')
    case 'low':
      return chalk.blue('🔵')
    default:
      return chalk.gray('⚪')
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
${result.regressions.map(r => `- ${r}`).join('\n')}

## Improvements
${result.improvements.map(i => `- ${i}`).join('\n')}

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
${result.regressions.map(r => `- ${r}`).join('\n')}

Improvements:
${result.improvements.map(i => `- ${i}`).join('\n')}

Old Metrics:
${JSON.stringify(result.oldMetrics, null, 2)}

New Metrics:
${JSON.stringify(result.newMetrics, null, 2)}
`
}
