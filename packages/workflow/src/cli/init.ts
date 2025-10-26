/**
 * Workflow Init Command - Guided Setup and Configuration
 *
 * This module provides a guided setup process for initializing workflow
 * configuration and git repository setup as specified in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import { existsSync } from 'node:fs'
import process from 'node:process'
import { confirm, intro, isCancel, log } from '@clack/prompts'
import chalk from 'chalk'
import { createDefaultConfigFile, hasConfigFile } from '../config/workflow-config.js'
import {
  autoFixAllIssues,
  createInitialCommit,
  detectGitStatus,
  displayPreFlightResults,
  initializeGitRepo,
  interactiveFixIssues,
  runPreFlightChecks,
} from '../core/git-setup.js'

/**
 * Init command options
 */
export interface InitOptions {
  force?: boolean
  autoFix?: boolean
  interactive?: boolean
  skipGit?: boolean
  skipConfig?: boolean
}

/**
 * Runs the workflow initialization process
 */
export async function runInitCommand(options: InitOptions = {}): Promise<void> {
  const {
    force = false,
    autoFix = false,
    interactive = true,
    skipGit = false,
    skipConfig = false,
  } = options

  intro('🔧 Workflow Initialization')

  try {
    // Step 1: Check current status
    log.info('Analyzing current project setup...')
    const gitStatus = await detectGitStatus()
    const hasConfig = hasConfigFile()

    console.log()
    console.log(chalk.gray('Current Status:'))
    console.log(
      `  Git Repository: ${gitStatus.hasGitRepo ? chalk.green('✅ Found') : chalk.red('❌ Not found')}`
    )
    console.log(
      `  Git Commits: ${gitStatus.hasCommits ? chalk.green('✅ Found') : chalk.yellow('⚠️  None')}`
    )
    console.log(
      `  Working Directory: ${gitStatus.hasUncommittedChanges ? chalk.yellow('⚠️  Uncommitted changes') : chalk.green('✅ Clean')}`
    )
    console.log(
      `  Workflow Config: ${hasConfig ? chalk.green('✅ Found') : chalk.red('❌ Not found')}`
    )
    console.log(
      `  Package.json: ${existsSync('package.json') ? chalk.green('✅ Found') : chalk.red('❌ Not found')}`
    )
    console.log()

    // Step 2: Git setup
    if (!skipGit) {
      await setupGitRepository(gitStatus, { force, autoFix, interactive })
    }

    // Step 3: Configuration setup
    if (!skipConfig) {
      await setupWorkflowConfig(hasConfig, { force, interactive })
    }

    // Step 4: Final verification
    console.log(chalk.blue('🔍 Running final verification...'))
    const finalChecks = await runPreFlightChecks()
    displayPreFlightResults(finalChecks)

    const failedChecks = finalChecks.filter((check) => check.status === 'fail')
    if (failedChecks.length === 0) {
      console.log()
      console.log(chalk.green.bold('🎉 Workflow initialization completed successfully!'))
      console.log()
      console.log(chalk.cyan('Next steps:'))
      console.log(chalk.gray('  • Run `workflow release` to create your first release'))
      console.log(chalk.gray('  • Edit `.workflow.config.js` to customize your workflow'))
      console.log(chalk.gray('  • Check `workflow status` to see your project status'))
      console.log()
    } else {
      console.log()
      console.log(chalk.yellow('⚠️  Initialization completed with some issues.'))
      console.log(chalk.gray('Use `workflow status` to see remaining issues.'))
      console.log()
    }
  } catch (error) {
    console.log()
    console.log(chalk.red('❌ Initialization failed:'))
    console.log(chalk.red(error instanceof Error ? error.message : String(error)))
    console.log()
    process.exit(1)
  }
}

/**
 * Sets up git repository with guided prompts
 */
async function setupGitRepository(
  gitStatus: Awaited<ReturnType<typeof detectGitStatus>>,
  options: { force: boolean; autoFix: boolean; interactive: boolean }
): Promise<void> {
  const { force, autoFix, interactive } = options

  console.log(chalk.blue('🔧 Setting up Git repository...'))

  // Initialize git if needed
  if (!gitStatus.hasGitRepo) {
    if (autoFix) {
      await initializeGitRepo({ createGitignore: true })
    } else if (interactive) {
      const shouldInit = await confirm({
        message: 'Initialize git repository?',
        initialValue: true,
      })

      if (isCancel(shouldInit)) {
        console.log(chalk.yellow('⚠️  Operation cancelled'))
        process.exit(1)
      }

      if (shouldInit) {
        await initializeGitRepo({ createGitignore: true })
      } else {
        console.log(chalk.yellow('⚠️  Skipping git initialization'))
        return
      }
    } else {
      console.log(chalk.red('❌ Git repository required but not found'))
      throw new Error('Git repository initialization required')
    }
  }

  // Create initial commit if needed
  const updatedGitStatus = await detectGitStatus()
  if (!updatedGitStatus.hasCommits) {
    if (autoFix) {
      await createInitialCommit({
        commitMessage: 'Initial commit: Project setup with workflow',
        includeAll: true,
      })
    } else if (interactive) {
      const shouldCommit = await confirm({
        message: 'Create initial commit with current files?',
        initialValue: true,
      })

      if (isCancel(shouldCommit)) {
        console.log(chalk.yellow('⚠️  Operation cancelled'))
        process.exit(1)
      }

      if (shouldCommit) {
        await createInitialCommit({
          commitMessage: 'Initial commit: Project setup with workflow',
          includeAll: true,
        })
      }
    }
  }

  // Handle uncommitted changes
  if (updatedGitStatus.hasUncommittedChanges && !force) {
    if (autoFix) {
      const { stageAndCommitChanges } = await import('../core/git-setup.js')
      await stageAndCommitChanges({
        commitMessage: 'chore: commit changes during workflow setup',
      })
    } else if (interactive) {
      const shouldCommit = await confirm({
        message: 'Commit uncommitted changes?',
        initialValue: true,
      })

      if (isCancel(shouldCommit)) {
        console.log(chalk.yellow('⚠️  Operation cancelled'))
        process.exit(1)
      }

      if (shouldCommit) {
        const { stageAndCommitChanges } = await import('../core/git-setup.js')
        await stageAndCommitChanges({
          commitMessage: 'chore: commit changes during workflow setup',
        })
      }
    }
  }

  console.log(chalk.green('✅ Git repository setup completed'))
}

/**
 * Sets up workflow configuration with guided prompts
 */
async function setupWorkflowConfig(
  hasExistingConfig: boolean,
  options: { force: boolean; interactive: boolean }
): Promise<void> {
  const { force, interactive } = options

  console.log(chalk.blue('🔧 Setting up workflow configuration...'))

  if (hasExistingConfig && !force) {
    if (interactive) {
      const shouldOverwrite = await confirm({
        message: 'Workflow configuration already exists. Overwrite?',
        initialValue: false,
      })

      if (isCancel(shouldOverwrite)) {
        console.log(chalk.yellow('⚠️  Operation cancelled'))
        process.exit(1)
      }

      if (!shouldOverwrite) {
        console.log(chalk.yellow('⚠️  Keeping existing configuration'))
        return
      }
    } else {
      console.log(chalk.yellow('⚠️  Configuration exists, use --force to overwrite'))
      return
    }
  }

  // Create configuration file
  createDefaultConfigFile('.workflow.config.js')
  console.log(chalk.green('✅ Workflow configuration created'))

  if (interactive) {
    console.log()
    console.log(chalk.cyan('💡 Configuration Tips:'))
    console.log(chalk.gray('  • Edit `.workflow.config.js` to customize your workflow'))
    console.log(chalk.gray('  • Enable auto-fix for common issues: `autoFix: true`'))
    console.log(chalk.gray('  • Configure hooks to run custom commands'))
    console.log(chalk.gray('  • Set up release options like version bumping'))
    console.log()
  }
}

/**
 * Shows initialization help and examples
 */
export function showInitHelp(): void {
  console.log()
  console.log(chalk.cyan.bold('Workflow Initialization Help'))
  console.log()
  console.log(chalk.white('The init command sets up your project for workflow automation:'))
  console.log()
  console.log(chalk.cyan('Basic Usage:'))
  console.log(chalk.gray('  workflow init                    # Interactive setup'))
  console.log(chalk.gray('  workflow init --auto-fix         # Automatic setup'))
  console.log(chalk.gray('  workflow init --force            # Overwrite existing files'))
  console.log()
  console.log(chalk.cyan('Options:'))
  console.log(chalk.gray('  --auto-fix        Automatically fix all issues'))
  console.log(chalk.gray('  --no-interactive  Skip interactive prompts'))
  console.log(chalk.gray('  --force           Overwrite existing configuration'))
  console.log(chalk.gray('  --skip-git        Skip git repository setup'))
  console.log(chalk.gray('  --skip-config     Skip configuration file creation'))
  console.log()
  console.log(chalk.cyan('What it does:'))
  console.log(chalk.gray('  • Initializes git repository if needed'))
  console.log(chalk.gray('  • Creates initial commit'))
  console.log(chalk.gray('  • Generates .workflow.config.js'))
  console.log(chalk.gray('  • Sets up .gitignore file'))
  console.log(chalk.gray('  • Runs pre-flight checks'))
  console.log()
}
