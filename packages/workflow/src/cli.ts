/**
 * G1 Workflow CLI - Enterprise release automation
 */

import process from 'node:process'
import { confirm, intro, log, note, outro } from '@clack/prompts'
import chalk from 'chalk'
import { program } from 'commander'
import { createAICommand } from './cli/ai.js'
import { createFrameworkCommand } from './cli/framework.js'
import { runInitCommand, showInitHelp } from './cli/init.js'
import { createMonorepoCommand } from './cli/monorepo.js'
import { loadWorkflowConfig, mergeConfigWithFlags } from './config/workflow-config.js'
import { G1_ICONS, g1Log } from './core/error-formatter.js'
import { handleError } from './core/error-handler.js'
import {
  autoFixAllIssues,
  detectGitStatus,
  displayPreFlightResults,
  interactiveFixIssues,
  runPreFlightChecks,
} from './core/git-setup.js'
import { createTaskEngine } from './core/task-engine.js'
import type { ReleaseOptions, WorkflowContext } from './types/index.js'
import { analyzeGitContext, validateWorkflowContext } from './utils/git-context.js'
import { promptSkipNpmPackages } from './utils/interactive.js'
import {
  createReleaseWorkflow,
  deployToCloudflare,
  detectCloudflareSetup,
  hasNpmPublishingWorkflow,
  watchGitHubActions,
} from './workflows/release.js'

// Load version from package.json
function getVersion(): string {
  try {
    // eslint-disable-next-line ts/no-require-imports
    const fs = require('node:fs')
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    return packageJson.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

const version = getVersion()

program
  .name('workflow')
  .description('Enterprise release automation and workflow orchestration')
  .version(version)

// Global options
program
  .option('--config <path>', 'Path to configuration file')
  .option('--auto-fix', 'Automatically fix common issues')
  .option('--no-interactive', 'Disable interactive prompts')
  .option('--log-level <level>', 'Set log level (silent, error, warn, info, debug)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--verbose', 'Show detailed output')

// Release command
program
  .command('release')
  .description(
    'Execute complete release workflow: quality gates → git → cloudflare → GitHub release'
  )
  .option('-t, --type <type>', 'Version bump type', /^(patch|minor|major)$/)
  .option('--skip-tests', 'Skip running tests')
  .option('--skip-lint', 'Skip linting')
  .option('--skip-build', 'Skip build step')
  .option('--skip-publish', 'Skip publishing to npm')
  .option('--skip-cloudflare', 'Skip Cloudflare deployment')
  .option('--skip-npm', 'Skip npm publishing for all packages')
  .option(
    '--skip-npm-packages [packages]',
    'Skip npm publishing for specific packages (interactive selection if no packages specified)',
    (value) => (value ? value.split(',').map((pkg) => pkg.trim()) : true)
  )
  .option('--non-interactive', 'Run in non-interactive mode (skip prompts)')
  .option('--dry-run', 'Show what would be done without executing')
  .option('--verbose', 'Show detailed output')
  .option('--force', 'Skip uncommitted changes check (use with caution)')
  .action(async (options: ReleaseOptions) => {
    try {
      // Load configuration
      const globalOptions = program.opts()
      const config = await loadWorkflowConfig(process.cwd(), globalOptions.config)
      const mergedConfig = mergeConfigWithFlags(config, { ...globalOptions, ...options })

      // Enhanced monorepo context validation
      const gitContext = await analyzeGitContext()
      const contextValidation = await validateWorkflowContext()

      if (!contextValidation.isValid) {
        g1Log.error('Workflow context validation failed:')
        contextValidation.issues.forEach((issue) => {
          g1Log.error(`  • ${issue}`)
        })

        if (contextValidation.recommendations.length > 0) {
          g1Log.info('\nRecommendations:')
          contextValidation.recommendations.forEach((recommendation) => {
            g1Log.info(`  • ${recommendation}`)
          })
        }

        process.exit(1)
      }

      if (gitContext.isMonorepo && gitContext.relativePath) {
        g1Log.info(`Working in monorepo package: ${gitContext.relativePath}`)
      }

      // Run pre-flight checks if not disabled
      if (!options.force && !globalOptions.noInteractive) {
        g1Log.searching('Running pre-flight checks...')
        const checks = await runPreFlightChecks()
        displayPreFlightResults(checks)

        const failedChecks = checks.filter(
          (check) => check.status === 'fail' || check.status === 'warning'
        )

        if (failedChecks.length > 0) {
          if (globalOptions.autoFix || mergedConfig.errorHandling.autoFix) {
            await autoFixAllIssues(checks)
          } else if (!globalOptions.noInteractive && mergedConfig.errorHandling.interactive) {
            await interactiveFixIssues(checks)
          } else {
            g1Log.error('Pre-flight checks failed. Use --auto-fix to automatically resolve issues.')
            process.exit(1)
          }
        }
      }

      // Handle interactive package selection for --skip-npm-packages
      if (options.skipNpmPackages === true && !options.nonInteractive) {
        // Interactive mode - prompt user to select packages
        const selectedPackages = await promptSkipNpmPackages()
        options.skipNpm = selectedPackages.length > 0 ? selectedPackages : false
      } else if (Array.isArray(options.skipNpmPackages)) {
        // Packages specified via command line
        options.skipNpm = options.skipNpmPackages
      } else if (options.skipNpm === true) {
        options.skipNpm = true
      }

      // Enhanced intro with G1 branding
      intro(`${G1_ICONS.g1} G1 Workflow - Release Automation v${version}`)

      if (options.dryRun) {
        note(`${G1_ICONS.info} DRY RUN MODE - No changes will be made`, 'Dry Run')
      }

      // Map global --no-interactive to command nonInteractive option
      if (globalOptions.noInteractive && !options.nonInteractive) {
        options.nonInteractive = true
      }

      // Create workflow steps (now async for interactive prompts)
      const steps = await createReleaseWorkflow(options)

      // Create task engine with listr2
      const taskEngine = createTaskEngine({
        showTimer: true,
        clearOutput: false,
      })

      // Execute workflow
      const context = (await taskEngine.execute(steps)) as WorkflowContext

      // Clean success message instead of busy box
      // Enhanced success message with G1 branding
      outro(`${G1_ICONS.success} Release completed successfully!`)

      // Enhanced release summary using custom icons
      g1Log.release('Release Summary')

      if (context.version) {
        g1Log.info(`Version: ${context.version.current} → ${context.version.next}`)
      }

      if (context.git) {
        g1Log.info(`Repository: ${context.git.repository}`)
      }

      if (context.deployments?.cloudflare) {
        g1Log.deploy('Cloudflare: Deployed')
      }

      // GitHub Actions monitoring prompt (skip in dry-run mode)
      if (
        !options.dryRun &&
        !options.nonInteractive &&
        context.git?.repository &&
        context.version?.next
      ) {
        // Check if this repository has npm publishing workflows
        const hasPublishing = await hasNpmPublishingWorkflow(context.git.repository)

        if (hasPublishing) {
          const watchActions = await confirm({
            message: `${G1_ICONS.search} Watch GitHub Actions for npm publishing?`,
            initialValue: true,
          })

          if (watchActions === true) {
            const tagName = `v${context.version.next}`
            await watchGitHubActions(context.git.repository, tagName)
          }
        } else {
          g1Log.info('No npm publishing workflows detected - skipping monitoring prompt')
        }
      }

      // Cloudflare deployment prompt (skip in dry-run mode)
      if (!options.dryRun && !options.nonInteractive) {
        // Check if this repository has Cloudflare setup
        const hasCloudflare = await detectCloudflareSetup()

        if (hasCloudflare) {
          const deployToCloudflareConfirm = await confirm({
            message: `${G1_ICONS.deploy} Deploy to Cloudflare Workers?`,
            initialValue: true,
          })

          if (deployToCloudflareConfirm === true) {
            await deployToCloudflare()
          }
        }
      }
    } catch (error) {
      // Clean error handling with outro
      outro('Release failed')

      if (error instanceof Error) {
        log.error(error.message)

        // Provide helpful suggestions based on error type
        if (error.message.includes('Tests failed')) {
          note(
            'Add test files to your project, or skip tests with: workflow release --skip-tests',
            'Suggested Solutions'
          )
        } else if (error.message.includes('Uncommitted changes')) {
          note(
            'Commit your changes with: git add . && git commit -m "your message"\nOr stash them with: git stash',
            'Suggested Solutions'
          )
        } else if (error.message.includes('TypeScript errors')) {
          note(
            'Fix TypeScript errors with: bun run typecheck\nOr skip type checking with: workflow release --skip-lint',
            'Suggested Solutions'
          )
        }

        if (options.verbose && error.stack) {
          log.info('Stack Trace')
          console.log(error.stack)
        }
      }

      process.exit(1)
    }
  })

// Initialize workflow command
program
  .command('init')
  .description('Initialize workflow configuration and Git repository')
  .option('--force', 'Force initialization even if files exist')
  .option('--auto-fix', 'Automatically fix issues without prompting')
  .option('--skip-git', 'Skip Git repository initialization')
  .option('--skip-config', 'Skip workflow configuration setup')
  .option('--non-interactive', 'Run in non-interactive mode')
  .action(async (options) => {
    try {
      await runInitCommand(options)
    } catch (error) {
      await handleError(error as Error, {
        autoFix: options.autoFix,
        interactive: !options.nonInteractive,
        context: 'init',
      })
      process.exit(1)
    }
  })

// Feature branch command (placeholder for future)
program
  .command('feature')
  .description('Create and manage feature branches with AI-powered suggestions')
  .argument('[name]', 'Feature name (optional - will suggest if not provided)')
  .option('-t, --type <type>', 'Branch type', /^(feature|bugfix|hotfix)$/, 'feature')
  .option('--base <branch>', 'Base branch', 'main')
  .option('--auto-merge', 'Enable auto-merge when PR is approved')
  .action(async (_name, _options) => {
    intro('Feature Workflow')
    log.warn('Feature workflow coming soon in V2!')
    note(
      '• AI-powered branch name suggestions\n• Automated PR creation\n• Auto-merge and cleanup',
      'This will include'
    )
    outro('Stay tuned for updates!')
  })

// Test error recovery command
program
  .command('test-error-recovery')
  .description('Test automated error recovery system with sample errors')
  .option('--direct', 'Test error recovery directly without triggering a workflow')
  .action(async (options) => {
    try {
      const { testErrorRecovery, testErrorRecoveryDirectly } = await import(
        './test-error-recovery.js'
      )

      if (options.direct) {
        await testErrorRecoveryDirectly()
      } else {
        await testErrorRecovery()
      }
    } catch (error) {
      outro('Error recovery test failed')
      if (error instanceof Error) {
        log.error(error.message)
      }
      process.exit(1)
    }
  })

// Monorepo command
program.addCommand(createMonorepoCommand())

// AI command
program.addCommand(createAICommand())

// Framework command
program.addCommand(createFrameworkCommand())

// Status command
program
  .command('status')
  .description('Show project and workflow status')
  .action(async () => {
    intro(`${G1_ICONS.g1} G1 Workflow Status`)

    g1Log.success('V2 Core: Task Engine with listr2')
    g1Log.success('V2 Release: Complete Git → Cloudflare → npm pipeline')
    g1Log.success('V2 Error Recovery: Automated error fixing system')
    g1Log.warning('V2 Feature: Branch management (coming soon)')
    g1Log.warning('V2 Config: Smart configuration system (coming soon)')
    g1Log.info(`Version: ${version}`)

    note(
      `${G1_ICONS.test} workflow test-error-recovery     Test error recovery with sample workflow\n${G1_ICONS.test} workflow test-error-recovery --direct    Test error recovery directly`,
      'Test Commands'
    )

    outro(`${G1_ICONS.success} Status check complete`)
  })

// Error handling
program.exitOverride()

try {
  program.parse()
} catch (error) {
  if (error instanceof Error && error.message.includes('outputHelp')) {
    // User asked for help, don't show error
    process.exit(0)
  }

  console.log(chalk.red.bold('❌ Command failed'))
  if (error instanceof Error) {
    console.log(chalk.red(error.message))
  }
  process.exit(1)
}
