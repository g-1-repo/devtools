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
  createAIConfigFromEnv,
} from '@g-1/ai-core'
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

    g1Log.info('Running AI analysis...')

    const code = fs.readFileSync(filePath, 'utf-8')
    const result = await analyzer.analyzeFile(code, filePath, {
      language: path.extname(filePath).slice(1),
      analysisType: 'all',
      includeMetrics: true,
    })

    await displayAnalysisResult(result, options)

    if (options.output) {
      await saveAnalysisResult(result, options.output, options.format || 'text')
    }
  } catch (error: any) {
    g1Log.error(`Analysis failed: ${error.message}`)
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

    g1Log.info('Project analysis complete')
  } catch (error: any) {
    g1Log.error(`Project analysis failed: ${error.message}`)
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
    const analyzer = await createCodeAnalyzer(options)
    if (!analyzer) {
      g1Log.error('Failed to create code analyzer')
      return
    }

    const code1 = fs.readFileSync(file1, 'utf-8')
    const code2 = fs.readFileSync(file2, 'utf-8')

    const result = await analyzer.compareCodeQuality(code1, code2, file1)

    g1Log.info(`Comparison complete:`)
    g1Log.info(`Improvement: ${result.improvement}%`)
    g1Log.info(`Improvements: ${result.improvements.join(', ')}`)
    g1Log.info(`Regressions: ${result.regressions.join(', ')}`)
  } catch (error: any) {
    g1Log.error(`Comparison failed: ${error.message}`)
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
  } catch (error: any) {
    g1Log.error(`Failed to create analyzer: ${error.message}`)
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
  if (result.security.length > 0) {
    g1Log.info(`\n${G1_ICONS.security} Security Issues:`)
    result.security.forEach((issue: any) => {
      const color = getSeverityColor(issue.severity)
      g1Log.info(`  ${color}${issue.severity.toUpperCase()}: ${issue.description}`)
    })
  }

  // Performance issues
  if (result.performance.length > 0) {
    g1Log.info(`\n${G1_ICONS.performance} Performance Issues:`)
    result.performance.forEach((issue: any) => {
      const color = getSeverityColor(issue.severity)
      g1Log.info(`  ${color}${issue.severity.toUpperCase()}: ${issue.description}`)
    })
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    g1Log.info(`\n${G1_ICONS.info} Suggestions:`)
    result.suggestions.forEach((suggestion: any) => {
      g1Log.info(`  ${suggestion.type?.toUpperCase() || 'SUGGESTION'}: ${suggestion.description}`)
    })
  }
}

/**
 * Save analysis result to file
 */
async function saveAnalysisResult(
  result: CodeAnalysisResult,
  outputPath: string,
  format: string
): Promise<void> {
  let content: string

  switch (format) {
    case 'json':
      content = JSON.stringify(result, null, 2)
      break
    case 'markdown':
      content = formatAsMarkdown(result)
      break
    default:
      content = formatAsText(result)
  }

  fs.writeFileSync(outputPath, content)
  g1Log.info(`Results saved to ${outputPath}`)
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
