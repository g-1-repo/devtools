/**
 * Monorepo CLI Commands
 *
 * Provides CLI commands for monorepo operations including detection,
 * selective builds, tests, and deployments.
 */

import { confirm, intro, log, multiselect, note, outro, select } from '@clack/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { loadWorkflowConfig, mergeConfigWithFlags } from '../config/workflow-config'
import { G1_ICONS, g1Log } from '../core/error-formatter'
import { MonorepoManager } from '../core/monorepo-manager'
import type { SelectiveOperationOptions } from '../core/selective-operations'

export interface MonorepoCommandOptions {
  config?: string
  verbose?: boolean
  dryRun?: boolean
  force?: boolean
  since?: string
  scope?: string[]
  ignore?: string[]
  parallel?: boolean
  maxParallel?: number
  nonInteractive?: boolean
}

/**
 * Create monorepo command group
 */
export function createMonorepoCommand(): Command {
  const monorepoCmd = new Command('monorepo')
    .description('Monorepo operations and management')
    .alias('mono')

  // Common options for all monorepo commands
  monorepoCmd
    .option('--config <path>', 'Path to configuration file')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without executing')
    .option('--force', 'Force operation on all packages')
    .option('--since <ref>', 'Compare changes since git reference (commit/branch/tag)')
    .option('--scope <packages...>', 'Run only on specified packages')
    .option('--ignore <packages...>', 'Ignore specified packages')
    .option('--parallel', 'Run operations in parallel where possible')
    .option('--max-parallel <number>', 'Maximum number of parallel operations', '4')
    .option('--non-interactive', 'Run in non-interactive mode')

  // Detect command
  monorepoCmd
    .command('detect')
    .description('Detect and analyze monorepo structure')
    .action(async (options: MonorepoCommandOptions) => {
      await runDetectCommand(options)
    })

  // Status command
  monorepoCmd
    .command('status')
    .description('Show monorepo status and statistics')
    .action(async (options: MonorepoCommandOptions) => {
      await runStatusCommand(options)
    })

  // List packages command
  monorepoCmd
    .command('list')
    .description('List all packages in the workspace')
    .alias('ls')
    .option('--json', 'Output as JSON')
    .action(async (options: MonorepoCommandOptions & { json?: boolean }) => {
      await runListCommand(options)
    })

  // Build command
  monorepoCmd
    .command('build')
    .description('Build packages selectively based on changes')
    .action(async (options: MonorepoCommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runBuildCommand(mergedOptions)
    })

  // Test command
  monorepoCmd
    .command('test')
    .description('Test packages selectively based on changes')
    .action(async (options: MonorepoCommandOptions) => {
      await runTestCommand(options)
    })

  // Deploy command
  monorepoCmd
    .command('deploy')
    .description('Deploy packages selectively based on changes')
    .argument('[target]', 'Deployment target (e.g., staging, production)')
    .action(async (target: string, options: MonorepoCommandOptions) => {
      await runDeployCommand(target, options)
    })

  // Run script command
  monorepoCmd
    .command('run')
    .description('Run script on packages selectively based on changes')
    .argument('<script>', 'Script name to run')
    .action(async (script: string, options: MonorepoCommandOptions) => {
      await runScriptCommand(script, options)
    })

  // Affected command
  monorepoCmd
    .command('affected')
    .description('Show packages affected by changes')
    .option('--json', 'Output as JSON')
    .action(async (options: MonorepoCommandOptions & { json?: boolean }) => {
      await runAffectedCommand(options)
    })

  // Graph command
  monorepoCmd
    .command('graph')
    .description('Show dependency graph')
    .option('--format <format>', 'Output format (text, json, dot)', 'text')
    .action(async (options: MonorepoCommandOptions & { format?: string }) => {
      await runGraphCommand(options)
    })

  // Validate command
  monorepoCmd
    .command('validate')
    .description('Validate monorepo structure and dependencies')
    .action(async (options: MonorepoCommandOptions) => {
      await runValidateCommand(options)
    })

  return monorepoCmd
}

/**
 * Run detect command
 */
async function runDetectCommand(options: MonorepoCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.search} Monorepo Detection`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()
    const info = manager.getMonorepoInfo()

    if (!info) {
      g1Log.error('No monorepo structure detected')
      outro('Detection failed')
      process.exit(1)
    }

    g1Log.success(`Detected ${info.type} monorepo`)
    g1Log.info(`Package Manager: ${info.packageManager}`)
    g1Log.info(`Root Path: ${info.rootPath}`)

    if (info.workspacePatterns.length > 0) {
      note(info.workspacePatterns.join('\n'), 'Workspace Patterns')
    }

    if (info.packages.length > 0) {
      note(`Found ${info.packages.length} packages:\n${info.packages.join('\n')}`, 'Packages')
    }

    outro(`${G1_ICONS.success} Detection complete`)
  } catch (error) {
    outro('Detection failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run status command
 */
async function runStatusCommand(options: MonorepoCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.info} Monorepo Status`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()
    const stats = await manager.getWorkspaceStats()
    const validation = await manager.validate()

    g1Log.info(`Total Packages: ${stats.totalPackages}`)

    if (Object.keys(stats.packagesByType).length > 0) {
      const typeInfo = Object.entries(stats.packagesByType)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ')
      g1Log.info(`Package Types: ${typeInfo}`)
    }

    g1Log.info(`Dependencies: ${stats.dependencyStats.totalDependencies} total`)
    g1Log.info(
      `Internal: ${stats.dependencyStats.internalDependencies}, External: ${stats.dependencyStats.externalDependencies}`
    )

    if (stats.dependencyStats.circularDependencies.length > 0) {
      g1Log.warning(`Circular Dependencies: ${stats.dependencyStats.circularDependencies.length}`)
    }

    // Show validation results
    if (validation.valid) {
      g1Log.success('Validation: Passed')
    } else {
      g1Log.error('Validation: Failed')
      if (validation.issues.length > 0) {
        note(validation.issues.join('\n'), 'Issues')
      }
    }

    if (validation.warnings.length > 0) {
      note(validation.warnings.join('\n'), 'Warnings')
    }

    outro(`${G1_ICONS.success} Status complete`)
  } catch (error) {
    outro('Status check failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run list command
 */
async function runListCommand(options: MonorepoCommandOptions & { json?: boolean }): Promise<void> {
  try {
    if (!options.json) {
      intro(`${G1_ICONS.list} Package List`)
    }

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()
    const packages = await manager.getPackages()

    if (options.json) {
      console.log(JSON.stringify(packages, null, 2))
      return
    }

    if (packages.length === 0) {
      g1Log.warning('No packages found')
    } else {
      note(packages.join('\n'), `Found ${packages.length} packages`)
    }

    outro(`${G1_ICONS.success} List complete`)
  } catch (error) {
    if (!options.json) {
      outro('List failed')
    }
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run build command
 */
async function runBuildCommand(options: MonorepoCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.build} Selective Build`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()

    const buildOptions: SelectiveOperationOptions = {
      since: options.since,
      scope: options.scope,
      ignore: options.ignore,
      parallel: options.parallel,
      force: options.force,
      dryRun: options.dryRun,
      verbose: options.verbose,
    }

    const result = await manager.build(buildOptions)

    if (result.success) {
      g1Log.success(`Build completed in ${result.duration}ms`)
      if (result.affectedPackages.length > 0) {
        note(result.affectedPackages.join('\n'), 'Built Packages')
      }
    } else {
      g1Log.error('Build failed')
      if (result.errors && result.errors.length > 0) {
        note(result.errors.join('\n'), 'Errors')
      }
    }

    outro(result.success ? `${G1_ICONS.success} Build complete` : 'Build failed')
    if (!result.success) process.exit(1)
  } catch (error) {
    outro('Build failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run test command
 */
async function runTestCommand(options: MonorepoCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.test} Selective Test`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()

    const testOptions: SelectiveOperationOptions = {
      since: options.since,
      scope: options.scope,
      ignore: options.ignore,
      parallel: options.parallel,
      force: options.force,
      dryRun: options.dryRun,
      verbose: options.verbose,
    }

    const result = await manager.test(testOptions)

    if (result.success) {
      g1Log.success(`Tests completed in ${result.duration}ms`)
      if (result.affectedPackages.length > 0) {
        note(result.affectedPackages.join('\n'), 'Tested Packages')
      }
    } else {
      g1Log.error('Tests failed')
      if (result.errors && result.errors.length > 0) {
        note(result.errors.join('\n'), 'Errors')
      }
    }

    outro(result.success ? `${G1_ICONS.success} Tests complete` : 'Tests failed')
    if (!result.success) process.exit(1)
  } catch (error) {
    outro('Tests failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run deploy command
 */
async function runDeployCommand(target: string, options: MonorepoCommandOptions): Promise<void> {
  try {
    const deployTarget = target || 'production'
    intro(`${G1_ICONS.deploy} Selective Deploy to ${deployTarget}`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()

    const deployOptions: SelectiveOperationOptions = {
      since: options.since,
      scope: options.scope,
      ignore: options.ignore,
      parallel: options.parallel,
      force: options.force,
      dryRun: options.dryRun,
      verbose: options.verbose,
    }

    const result = await manager.deploy(deployTarget, deployOptions)

    if (result.success) {
      g1Log.success(`Deployment completed in ${result.duration}ms`)
      if (result.affectedPackages.length > 0) {
        note(result.affectedPackages.join('\n'), 'Deployed Packages')
      }
    } else {
      g1Log.error('Deployment failed')
      if (result.errors && result.errors.length > 0) {
        note(result.errors.join('\n'), 'Errors')
      }
    }

    outro(result.success ? `${G1_ICONS.success} Deployment complete` : 'Deployment failed')
    if (!result.success) process.exit(1)
  } catch (error) {
    outro('Deployment failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run script command
 */
async function runScriptCommand(script: string, options: MonorepoCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.run} Running Script: ${script}`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()

    const runOptions: SelectiveOperationOptions = {
      since: options.since,
      scope: options.scope,
      ignore: options.ignore,
      parallel: options.parallel,
      force: options.force,
      dryRun: options.dryRun,
      verbose: options.verbose,
    }

    const result = await manager.run(script, runOptions)

    if (result.success) {
      g1Log.success(`Script completed in ${result.duration}ms`)
      if (result.affectedPackages.length > 0) {
        note(result.affectedPackages.join('\n'), 'Executed on Packages')
      }
    } else {
      g1Log.error('Script execution failed')
      if (result.errors && result.errors.length > 0) {
        note(result.errors.join('\n'), 'Errors')
      }
    }

    outro(result.success ? `${G1_ICONS.success} Script complete` : 'Script failed')
    if (!result.success) process.exit(1)
  } catch (error) {
    outro('Script execution failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run affected command
 */
async function runAffectedCommand(
  options: MonorepoCommandOptions & { json?: boolean }
): Promise<void> {
  try {
    if (!options.json) {
      intro(`${G1_ICONS.search} Affected Packages`)
    }

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()
    const affectedPackages = await manager.getAffectedPackages()

    if (options.json) {
      console.log(JSON.stringify(affectedPackages, null, 2))
      return
    }

    if (affectedPackages.length === 0) {
      g1Log.info('No packages affected by recent changes')
    } else {
      note(affectedPackages.join('\n'), `${affectedPackages.length} affected packages`)
    }

    outro(`${G1_ICONS.success} Analysis complete`)
  } catch (error) {
    if (!options.json) {
      outro('Analysis failed')
    }
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run graph command
 */
async function runGraphCommand(
  options: MonorepoCommandOptions & { format?: string }
): Promise<void> {
  try {
    const format = options.format || 'text'

    if (format !== 'json') {
      intro(`${G1_ICONS.graph} Dependency Graph`)
    }

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()
    const buildOrder = await manager.getBuildOrder()

    if (format === 'json') {
      console.log(JSON.stringify(buildOrder, null, 2))
      return
    }

    if (format === 'text') {
      buildOrder.forEach((batch, index) => {
        note(batch.join('\n'), `Build Order - Batch ${index + 1}`)
      })
    }

    outro(`${G1_ICONS.success} Graph complete`)
  } catch (error) {
    if (options.format !== 'json') {
      outro('Graph generation failed')
    }
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run validate command
 */
async function runValidateCommand(options: MonorepoCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.check} Monorepo Validation`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)
    const manager = new MonorepoManager({
      rootPath: process.cwd(),
      config: config.monorepo,
      verbose: options.verbose,
    })

    await manager.initialize()
    const validation = await manager.validate()

    if (validation.valid) {
      g1Log.success('Validation passed')
    } else {
      g1Log.error('Validation failed')
      if (validation.issues.length > 0) {
        note(validation.issues.join('\n'), 'Issues')
      }
    }

    if (validation.warnings.length > 0) {
      note(validation.warnings.join('\n'), 'Warnings')
    }

    outro(validation.valid ? `${G1_ICONS.success} Validation complete` : 'Validation failed')
    if (!validation.valid) process.exit(1)
  } catch (error) {
    outro('Validation failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
