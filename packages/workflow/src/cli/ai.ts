/**
 * AI CLI Commands
 *
 * Provides CLI commands for AI-powered workflow features including
 * changelog generation, version suggestions, and impact analysis.
 */

import { confirm, intro, log, note, outro, select } from '@clack/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { loadWorkflowConfig } from '../config/workflow-config.js'
import { AIService } from '../core/ai-service.js'
import { G1_ICONS, g1Log } from '../core/error-formatter.js'

export interface AICommandOptions {
  config?: string
  verbose?: boolean
  dryRun?: boolean
  force?: boolean
  since?: string
  output?: string
  format?: 'json' | 'markdown' | 'text'
  nonInteractive?: boolean
}

/**
 * Creates the AI command with all subcommands
 */
export function createAICommand(): Command {
  const aiCmd = new Command('ai')
    .description('AI-powered workflow features')
    .option('-c, --config <path>', 'Path to workflow config file')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--dry-run', 'Show what would be done without executing')
    .option('--force', 'Force operation without confirmation')
    .option('--since <ref>', 'Analyze changes since git reference', 'HEAD~1')
    .option('-o, --output <path>', 'Output file path')
    .option('--format <format>', 'Output format (json, markdown, text)', 'markdown')
    .option('--non-interactive', 'Run without interactive prompts')

  // Changelog command
  aiCmd
    .command('changelog')
    .description('Generate AI-powered changelog from commits')
    .action(async (options: AICommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runChangelogCommand(mergedOptions)
    })

  // Version command
  aiCmd
    .command('version')
    .description('Get AI-powered version bump suggestions')
    .action(async (options: AICommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runVersionCommand(mergedOptions)
    })

  // Impact command
  aiCmd
    .command('impact')
    .description('Analyze cross-package impact of changes')
    .action(async (options: AICommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runImpactCommand(mergedOptions)
    })

  // Suggest command
  aiCmd
    .command('suggest')
    .description('Get AI suggestions for branch names and commit messages')
    .argument('[type]', 'Suggestion type (branch, commit)', 'commit')
    .action(async (type: string, options: AICommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runSuggestCommand(type, mergedOptions)
    })

  return aiCmd
}

/**
 * Run changelog generation command
 */
async function runChangelogCommand(options: AICommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} AI Changelog Generation`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.ai.enabled) {
      g1Log.warning('AI features are disabled in configuration')
      outro('Enable AI features in your workflow config to use this command')
      return
    }

    const aiService = new AIService(config.ai)

    g1Log.info(`Analyzing commits since ${options.since || 'HEAD~1'}...`)

    // For now, we'll use a simple implementation that gets recent commits
    const simpleGit = (await import('simple-git')).default()
    const commits = await simpleGit.log({ from: options.since || 'HEAD~10', to: 'HEAD' })

    const changelogEntries = await aiService.generateChangelog(
      commits.all.map((commit) => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name || 'Unknown',
        date: new Date(commit.date),
        body: commit.body || '',
        files: [], // Add empty files array to match CommitInfo interface
      }))
    )

    if (options.format === 'json') {
      const output = JSON.stringify(changelogEntries, null, 2)
      if (options.output) {
        const fs = await import('node:fs/promises')
        await fs.writeFile(options.output, output)
        g1Log.success(`Changelog saved to ${options.output}`)
      } else {
        console.log(output)
      }
    } else {
      const formattedChangelog = formatChangelog(changelogEntries, options.format || 'markdown')

      if (options.output) {
        const fs = await import('node:fs/promises')
        await fs.writeFile(options.output, formattedChangelog)
        g1Log.success(`Changelog saved to ${options.output}`)
      } else {
        console.log('\n' + formattedChangelog)
      }
    }

    outro(`${G1_ICONS.success} Changelog generated successfully`)
  } catch (error) {
    outro('Changelog generation failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run version suggestion command
 */
async function runVersionCommand(options: AICommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} AI Version Analysis`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.ai.enabled || !config.ai.features.versionBump.enabled) {
      g1Log.warning('AI version bump features are disabled in configuration')
      outro('Enable AI version bump features in your workflow config')
      return
    }

    const aiService = new AIService(config.ai)

    g1Log.info(`Analyzing changes since ${options.since}...`)

    // Get commits using simple-git
    const git = (await import('simple-git')).default(process.cwd())
    const commits = await git.log({ from: options.since || 'HEAD~1', to: 'HEAD' })

    // Convert commits to ChangelogEntry format
    const changelogEntries = commits.all.map((commit) => ({
      type: 'feat' as const,
      description: commit.message,
      breaking: commit.message.includes('BREAKING CHANGE'),
      impact: 'minor' as const,
      affectedPackages: [],
      originalCommit: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name || 'Unknown',
        date: new Date(commit.date),
        files: [],
      },
    }))

    // Get package information (simplified for demo)
    const packages = [{ name: 'workflow', version: '1.0.0', path: process.cwd() }]

    const suggestions = await aiService.suggestVersionBumps(changelogEntries, packages)

    if (options.format === 'json') {
      console.log(JSON.stringify(suggestions, null, 2))
    } else {
      suggestions.forEach((suggestion) => {
        console.log('\n' + formatVersionSuggestion(suggestion))
      })
    }

    outro(`${G1_ICONS.success} Version analysis complete`)
  } catch (error) {
    outro('Version analysis failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run impact analysis command
 */
async function runImpactCommand(options: AICommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} AI Impact Analysis`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.ai.enabled || !config.ai.features.impactAnalysis.enabled) {
      g1Log.warning('AI impact analysis features are disabled in configuration')
      outro('Enable AI impact analysis features in your workflow config')
      return
    }

    const aiService = new AIService(config.ai)

    g1Log.info(`Analyzing cross-package impact since ${options.since}...`)

    // Get commits using simple-git
    const git = (await import('simple-git')).default(process.cwd())
    const commits = await git.log({ from: options.since || 'HEAD~1', to: 'HEAD' })

    // Convert commits to ChangelogEntry format
    const changelogEntries = commits.all.map((commit) => ({
      type: 'feat' as const,
      description: commit.message,
      breaking: commit.message.includes('BREAKING CHANGE'),
      impact: 'minor' as const,
      affectedPackages: [],
      originalCommit: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name || 'Unknown',
        date: new Date(commit.date),
        files: [],
      },
    }))

    // Get package information (simplified for demo)
    const packages = [{ name: 'workflow', dependencies: {} }]

    const analysis = await aiService.analyzeImpact(changelogEntries, packages)

    if (options.format === 'json') {
      console.log(JSON.stringify(analysis, null, 2))
    } else {
      console.log('\n' + formatImpactAnalysis(analysis))
    }

    outro(`${G1_ICONS.success} Impact analysis complete`)
  } catch (error) {
    outro('Impact analysis failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run suggestion command
 */
async function runSuggestCommand(type: string, options: AICommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.ai} AI Suggestions`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.ai.enabled) {
      g1Log.warning('AI features are disabled in configuration')
      outro('Enable AI features in your workflow config')
      return
    }

    const aiService = new AIService(config.ai)

    if (type === 'branch' && config.ai.suggestBranchNames) {
      const suggestion = await aiService.suggestBranchName([], 'feature')
      console.log(`\n${chalk.cyan('Suggested branch name:')} ${suggestion}`)
    } else if (type === 'commit' && config.ai.suggestCommitMessages) {
      const suggestion = await aiService.suggestCommitMessage([])
      console.log(`\n${chalk.cyan('Suggested commit message:')} ${suggestion}`)
    } else {
      g1Log.warning(`Suggestion type '${type}' is not enabled or supported`)
      outro('Check your AI configuration settings')
      return
    }

    outro(`${G1_ICONS.success} Suggestion generated`)
  } catch (error) {
    outro('Suggestion generation failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Format changelog entries for display
 */
function formatChangelog(entries: any[], format: string): string {
  if (format === 'text') {
    return entries
      .map(
        (entry) =>
          `${entry.type.toUpperCase()}: ${entry.description}${entry.breaking ? ' (BREAKING)' : ''}`
      )
      .join('\n')
  }

  // Markdown format
  let output = '# Changelog\n\n'

  const grouped = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.type]) acc[entry.type] = []
      acc[entry.type].push(entry)
      return acc
    },
    {} as Record<string, any[]>
  )

  for (const [type, typeEntries] of Object.entries(grouped)) {
    output += `## ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`
    for (const entry of typeEntries as any[]) {
      output += `- ${entry.description}${entry.breaking ? ' **BREAKING CHANGE**' : ''}\n`
    }
    output += '\n'
  }

  return output
}

/**
 * Format version suggestion for display
 */
function formatVersionSuggestion(suggestion: any): string {
  let output = `${chalk.cyan('Recommended version bump:')} ${chalk.bold(suggestion.suggestedBump)}\n`
  output += `${chalk.cyan('Confidence:')} ${(suggestion.confidence * 100).toFixed(1)}%\n`

  if (suggestion.reasoning) {
    output += `${chalk.cyan('Reasoning:')} ${suggestion.reasoning}\n`
  }

  if (suggestion.breakingChanges?.length > 0) {
    output += `\n${chalk.red('Breaking changes detected:')}\n`
    suggestion.breakingChanges.forEach((change: string) => {
      output += `  - ${change}\n`
    })
  }

  return output
}

/**
 * Format impact analysis for display
 */
function formatImpactAnalysis(analysis: any): string {
  let output = `${chalk.cyan('Impact Analysis Results')}\n\n`

  if (analysis.affectedPackages?.length > 0) {
    output += `${chalk.yellow('Affected Packages:')}\n`
    analysis.affectedPackages.forEach((pkg: string) => {
      output += `  - ${pkg}\n`
    })
    output += '\n'
  }

  if (analysis.riskLevel) {
    const riskColor =
      analysis.riskLevel === 'high'
        ? chalk.red
        : analysis.riskLevel === 'medium'
          ? chalk.yellow
          : chalk.green
    output += `${chalk.cyan('Risk Level:')} ${riskColor(analysis.riskLevel.toUpperCase())}\n\n`
  }

  if (analysis.recommendations?.length > 0) {
    output += `${chalk.cyan('Recommendations:')}\n`
    analysis.recommendations.forEach((rec: string) => {
      output += `  - ${rec}\n`
    })
  }

  return output
}
