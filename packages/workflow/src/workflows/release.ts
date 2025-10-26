/**
 * Complete Release Workflow - Git → Cloudflare → GitHub Release (triggers npm via Actions)
 */

import { isCancel, select, text } from '@clack/prompts'
import { createGitOperations } from '@g-1/util/node'
import chalk from 'chalk'
import { execa } from 'execa'
import process from 'node:process'
import * as semver from 'semver'
import { loadWorkflowConfig } from '../config/workflow-config.js'
import { AIService } from '../core/ai-service.js'
import { createErrorBox } from '../core/error-formatter.js'
import type { ReleaseOptions, WorkflowStep } from '../types/index.js'
import { analyzeGitContext, createContextAwareGitOperations } from '../utils/git-context.js'

// Detection functions (detectCloudflareSetup moved to exports below)

// Re-export smart package detection functions for backward compatibility
export {
  detectPublishablePackages,
  detectSmartPublishablePackages,
  formatPackageDetectionSummary
} from '../utils/smart-package-detection.js'

// Import the functions for internal use
import { detectPublishablePackages } from '../utils/smart-package-detection.js'

/**
 * Determines if npm publishing should be skipped for a specific package.
 *
 * @param packageName - The name of the package to check
 * @param skipNpm - The skipNpm option from ReleaseOptions
 * @returns boolean - True if npm publishing should be skipped for this package
 */
export function shouldSkipNpmForPackage(
  packageName: string,
  skipNpm?: boolean | string[]
): boolean {
  if (skipNpm === true) {
    return true // Skip all packages
  }

  if (Array.isArray(skipNpm)) {
    return skipNpm.includes(packageName) // Skip specific packages
  }

  return false // Don't skip
}

/**
 * Checks if the repository has an npm publishing workflow configured in GitHub Actions.
 *
 * This function first checks local .github/workflows directory for workflow files,
 * then falls back to GitHub CLI to query remote workflows if local files aren't found.
 *
 * @param repositoryName - The GitHub repository name in format "owner/repo"
 * @returns Promise<boolean> - True if npm publishing workflow is detected
 *
 * @example
 * ```typescript
 * const hasWorkflow = await hasNpmPublishingWorkflow('g-1-repo/studio')
 * if (hasWorkflow) {
 *   console.log('Repository has npm publishing configured')
 * }
 * ```
 */
export async function hasNpmPublishingWorkflow(repositoryName: string): Promise<boolean> {
  try {
    // First check if .github/workflows directory exists locally
    const fs = await import('node:fs/promises')
    const workflowsPath = '.github/workflows'

    try {
      const files = await fs.readdir(workflowsPath)
      const workflowFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))

      // Check each workflow file for npm publishing patterns
      for (const file of workflowFiles) {
        const content = await fs.readFile(`${workflowsPath}/${file}`, 'utf-8')
        const hasNpmPublish =
          content.toLowerCase().includes('npm publish') ||
          content.toLowerCase().includes('registry.npmjs.org') ||
          content.toLowerCase().includes('npmjs_token') ||
          content.toLowerCase().includes('npm_token')

        if (hasNpmPublish) {
          return true
        }
      }
    } catch {
      // Local .github/workflows doesn't exist, try GitHub API
    }

    // Fallback: Use GitHub CLI to check workflows in the repo
    try {
      const result = await execa(
        'gh',
        ['workflow', 'list', '--repo', repositoryName, '--json', 'name'],
        { stdio: 'pipe' }
      )

      const workflows = JSON.parse(result.stdout)
      return workflows.some((workflow: any) => {
        const name = workflow.name?.toLowerCase() || ''
        return (
          (name.includes('publish') && name.includes('npm')) ||
          name === 'publish to npm' ||
          name === 'npm publish' ||
          name === 'publish npm' ||
          name === 'npm'
        )
      })
    } catch {
      // If GitHub CLI fails, assume no publishing workflows
      return false
    }
  } catch {
    return false
  }
}

/**
 * Detects if Cloudflare Workers configuration is present in the current project.
 *
 * Checks for the presence of wrangler configuration files (wrangler.toml, wrangler.json, or wrangler.jsonc)
 * in the current working directory.
 *
 * @returns Promise<boolean> - True if Cloudflare configuration is found
 *
 * @example
 * ```typescript
 * const hasCloudflare = await detectCloudflareSetup()
 * if (hasCloudflare) {
 *   console.log('Cloudflare Workers configuration detected')
 * }
 * ```
 */
export async function detectCloudflareSetup(): Promise<boolean> {
  try {
    const fs = await import('node:fs/promises')
    // Check for wrangler.toml, wrangler.json, or wrangler.jsonc
    const wranglerFiles = ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']

    for (const file of wranglerFiles) {
      try {
        await fs.access(file)
        return true
      } catch {
        // Continue to next file
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Creates a comprehensive release workflow that handles Git operations, version bumping,
 * changelog generation, building, deployment, and GitHub release creation.
 *
 * The workflow includes quality gates (linting, type checking, testing), Git operations
 * (tagging, pushing), building, optional Cloudflare deployment, and GitHub release creation
 * that triggers npm publishing via GitHub Actions.
 *
 * @param options - Configuration options for the release workflow
 * @param options.skipCloudflare - Skip Cloudflare deployment step
 * @param options.skipLint - Skip linting quality gate
 * @param options.skipTests - Skip test execution
 * @param options.force - Continue with uncommitted changes
 * @param options.dryRun - Execute workflow without making actual changes
 * @param options.nonInteractive - Run without user prompts
 * @param options.type - Version bump type ('major', 'minor', 'patch')
 * @returns Promise<WorkflowStep[]> - Array of workflow steps to execute
 *
 * @example
 * ```typescript
 * const workflow = await createReleaseWorkflow({
 *   skipCloudflare: false,
 *   type: 'minor',
 *   dryRun: false
 * })
 *
 * // Execute with task engine
 * const taskEngine = createTaskEngine()
 * await taskEngine.execute(workflow)
 * ```
 */
export async function createReleaseWorkflow(options: ReleaseOptions = {}): Promise<WorkflowStep[]> {
  // Skip Cloudflare deployment during main workflow - will prompt after completion
  if (options.skipCloudflare === undefined) {
    options.skipCloudflare = true
  }

  // Handle uncommitted changes upfront (before workflow starts) - skip in dry-run mode
  // Skip this check if version approval was already handled (indicated by options.type being set)
  if (!options.force && !options.dryRun && !options.type) {
    const git = createGitOperations()
    const hasChanges = await git.hasUncommittedChanges()

    if (hasChanges) {
      const changedFiles = await git.getChangedFiles()
      const changesList = changedFiles.map((file: string) => `    ${file}`).join('\n')

      const { createStyledBox, createSectionHeader } = await import('../core/ui-components.js')

      createSectionHeader(
        'Uncommitted Changes Detected',
        'The following files have uncommitted changes and need to be handled before proceeding',
        '⚠'
      )

      createStyledBox(
        'Changed Files',
        changedFiles.map((file) => `  ${file}`),
        'warning'
      )

      if (!options.nonInteractive) {
        const action = await select({
          message: 'How would you like to proceed?',
          options: [
            {
              value: 'commit',
              label: `${chalk.green('●')} Commit all changes now`,
              hint: 'Stage and commit all uncommitted changes',
            },
            {
              value: 'stash',
              label: `${chalk.blue('●')} Stash changes for later`,
              hint: 'Save changes to stash and continue',
            },
            {
              value: 'force',
              label: `${chalk.yellow('●')} Continue anyway (--force)`,
              hint: 'Proceed with uncommitted changes (not recommended)',
            },
          ],
        })

        if (isCancel(action)) {
          process.stdout.write('\n\x1B[31mOperation cancelled\x1B[0m\n')
          process.exit(1)
        }

        process.stdout.write('\n')

        if (action === 'commit') {
          const { modernLog } = await import('../core/ui-components.js')

          modernLog.step('Preparing to commit changes', '◆')

          // Get commit message
          const message = await text({
            message: 'Enter commit message:',
            placeholder: 'chore: commit changes before release',
            validate: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Commit message is required'
              }
              if (value.trim().length < 10) {
                return 'Commit message should be at least 10 characters'
              }
              return undefined // Valid input
            },
          })

          if (isCancel(message)) {
            process.stdout.write('\n\x1B[31mOperation cancelled\x1B[0m\n')
            process.exit(1)
          }

          // Commit changes
          modernLog.step('Committing changes...', '●')
          await git.stageFiles(changedFiles)
          await git.commit(message)
          modernLog.success('Changes committed successfully')
        } else if (action === 'stash') {
          const { modernLog } = await import('../core/ui-components.js')

          modernLog.step('Stashing changes...', '●')
          await execa('git', ['stash', 'push', '-m', 'Pre-release stash'], { stdio: 'pipe' })
          modernLog.success('Changes stashed successfully')
        } else if (action === 'force') {
          const { modernLog } = await import('../core/ui-components.js')

          options.force = true
          modernLog.warning('Continuing with uncommitted changes')
        }

        process.stdout.write('\n')
      } else {
        // Non-interactive mode - just show error and exit
        process.stdout.write('Cannot proceed with uncommitted changes in non-interactive mode\n')
        process.stdout.write('Use --force flag to override or commit/stash changes first\n')
        process.exit(1)
      }
    }
  }

  // Set defaults for non-interactive mode
  if (options.nonInteractive && options.skipCloudflare === undefined) {
    options.skipCloudflare = true
  }

  return [
    // Quality Gates
    {
      title: 'Quality Gates',
      subtasks: [
        {
          title: 'Auto-fix linting issues',
          skip: () => options.skipLint || false,
          task: async (ctx, helpers) => {
            helpers.setOutput('Running lint with auto-fix...')

            // Define lint command priority order
            const lintCommands: Array<[string, string[]]> = [
              ['bun', ['run', 'lint:fix']],
              ['npm', ['run', 'lint:fix']],
              ['bunx', ['eslint', '.', '--fix']],
              ['npx', ['eslint', '.', '--fix']],
            ]

            let _lastError: any = null
            let commandWorked = false

            for (const [command, args] of lintCommands) {
              try {
                helpers.setOutput(`Trying ${command} ${args.join(' ')}...`)
                const result = await execa(command, args, { stdio: 'pipe', reject: false })

                if (result.exitCode === 0) {
                  helpers.setTitle(`Auto-fix linting issues - Fixed (${command})`)
                  commandWorked = true
                  break // Success! Exit early
                } else if (result.exitCode === 1) {
                  // ESLint returns 1 when there are linting errors, but the command ran successfully
                  const stderr = result.stderr || ''
                  const stdout = result.stdout || ''
                  const combinedOutput = stderr + stdout

                  // Check if it contains actual ESLint output (means command worked)
                  if (
                    combinedOutput.includes('error') ||
                    combinedOutput.includes('warning') ||
                    combinedOutput.includes('problem')
                  ) {
                    // Extract number of issues if possible
                    const errorMatch = combinedOutput.match(/(\d+)\s+error/)
                    const warningMatch = combinedOutput.match(/(\d+)\s+warning/)
                    const problemMatch = combinedOutput.match(/(\d+)\s+problem/)

                    const errors = errorMatch ? Number.parseInt(errorMatch[1]!, 10) : 0
                    const warnings = warningMatch ? Number.parseInt(warningMatch[1]!, 10) : 0
                    const problems = problemMatch
                      ? Number.parseInt(problemMatch[1]!, 10)
                      : errors + warnings

                    if (problems > 0) {
                      helpers.setTitle(
                        `Auto-fix linting issues - ${problems} issues remain (${command})`
                      )
                      helpers.setOutput(
                        `Found ${problems} linting issues that could not be auto-fixed`
                      )
                    } else {
                      helpers.setTitle(`Auto-fix linting issues - Fixed (${command})`)
                    }
                    commandWorked = true
                    break
                  } else {
                    // Command ran but produced unexpected output - try next command
                    _lastError = new Error(
                      `Unexpected output from ${command}: ${combinedOutput.slice(0, 100)}`
                    )
                  }
                } else {
                  // Non-zero, non-1 exit code - likely command not found or other error
                  const combinedOutput = `${result.stderr} ${result.stdout}`
                  _lastError = new Error(
                    `Command failed with exit code ${result.exitCode}: ${combinedOutput.slice(0, 100)}`
                  )
                }
              } catch (error) {
                // This catches ENOENT and other system errors (command not found, etc.)
                _lastError = error
              }
            }

            if (!commandWorked) {
              helpers.setTitle('Auto-fix linting issues - No lint command available')
              helpers.setOutput('Could not find eslint or lint:fix script')
            }
          },
        },
        {
          title: 'Type checking',
          task: async (ctx, helpers) => {
            helpers.setOutput('Running TypeScript type checking...')

            try {
              await execa('bun', ['run', 'typecheck'], { stdio: 'pipe' })
              helpers.setTitle('Type checking - Passed')
            } catch {
              try {
                await execa('npm', ['run', 'typecheck'], { stdio: 'pipe' })
                helpers.setTitle('Type checking - Passed with npm')
              } catch {
                try {
                  await execa('bunx', ['tsc', '--noEmit'], { stdio: 'pipe' })
                  helpers.setTitle('Type checking - Passed with bunx')
                } catch {
                  throw new Error('TypeScript errors found. Please fix before releasing.')
                }
              }
            }
          },
        },
        {
          title: 'Running tests',
          skip: () => options.skipTests || false,
          task: async (ctx, helpers) => {
            helpers.setOutput('Executing test suite...')

            // Define test command priority order
            const testCommands: Array<[string, string[]]> = [
              ['bun', ['run', 'test:ci']], // CI test command (preferred)
              ['bun', ['run', 'test']], // Standard test command
              ['bun', ['test']], // Direct bun test
              ['npm', ['run', 'test:ci']], // npm CI fallback
              ['npm', ['run', 'test']], // npm standard fallback
              ['npm', ['test']], // npm direct fallback
            ]

            let lastError: any = null

            for (const [command, args] of testCommands) {
              try {
                helpers.setOutput(`Trying ${command} ${args.join(' ')}...`)
                const _result = await execa(command, args, { stdio: 'pipe' })
                ctx.quality = { lintPassed: ctx.quality?.lintPassed ?? true, testsPassed: true }
                helpers.setTitle(`Running tests - All tests passed (${command})`)
                return // Success! Exit early
              } catch (error) {
                const errorOutput = error instanceof Error ? error.message : String(error)

                // Check if it's a "no tests found" or "script not found" error
                if (
                  errorOutput.includes('No tests found') ||
                  errorOutput.includes('no test files') ||
                  errorOutput.includes('script not found') ||
                  errorOutput.includes('Missing script')
                ) {
                  // Try next command
                  lastError = error
                  continue
                }

                // If it's a real test failure (not a missing script), stop trying
                if (errorOutput.includes('fail') || errorOutput.includes('Test')) {
                  const lines = errorOutput.split('\n')
                  const summary = lines.find((line) => line.includes('fail')) || 'Tests failed'
                  ctx.quality = { lintPassed: ctx.quality?.lintPassed ?? true, testsPassed: false }
                  throw new Error(`Test failures detected: ${summary}`)
                }

                // Store error and try next command
                lastError = error
              }
            }

            // If we get here, all commands failed - check if it's because no tests exist
            const lastErrorOutput =
              lastError instanceof Error ? lastError.message : String(lastError)
            if (
              lastErrorOutput.includes('No tests found') ||
              lastErrorOutput.includes('no test files') ||
              lastErrorOutput.includes('script not found') ||
              lastErrorOutput.includes('Missing script')
            ) {
              ctx.quality = { lintPassed: ctx.quality?.lintPassed ?? true, testsPassed: true }
              helpers.setTitle('Running tests - No tests found (skipping)')
              return
            }

            // Real test failure
            ctx.quality = { lintPassed: ctx.quality?.lintPassed ?? true, testsPassed: false }
            throw new Error(`Tests failed: ${lastErrorOutput}`)
          },
        },
      ],
    },

    // Git Operations
    {
      title: 'Git repository analysis',
      task: async (ctx, helpers) => {
        helpers.setOutput('Analyzing git context...')
        const gitContext = await analyzeGitContext()

        if (!gitContext.isValidContext) {
          throw new Error('Invalid git context - no repository found')
        }

        if (gitContext.isMonorepo) {
          helpers.setOutput(`Detected monorepo structure at ${gitContext.gitRoot}`)
          if (gitContext.relativePath) {
            helpers.setOutput(`Working in package: ${gitContext.relativePath}`)
          }
        }

        helpers.setOutput('Initializing Git operations with optimal context...')
        const git = await createContextAwareGitOperations()

        helpers.setOutput('Checking repository status...')
        const isRepo = await git.isGitRepository()
        if (!isRepo) {
          throw new Error('Not a Git repository')
        }

        helpers.setOutput('Getting current branch and version...')
        const currentBranch = await git.getCurrentBranch()
        const currentVersion = await git.getCurrentVersion()
        const repository = await git.getRepositoryName()

        // Uncommitted changes are now handled upfront before workflow starts
        const hasChanges = await git.hasUncommittedChanges()
        if (hasChanges && options.force) {
          helpers.setOutput('⚠️  Uncommitted changes detected but continuing due to --force flag')
        }

        // Store git info in context
        ctx.git = {
          branch: currentBranch,
          hasChanges,
          commits: [],
          remote: 'origin',
          repository,
        }

        ctx.version = {
          current: currentVersion,
          next: '', // Will be calculated next
          type: options.type || 'patch',
          strategy: 'semantic',
        }

        const contextInfo = gitContext.isMonorepo
          ? `${repository} (monorepo) on ${currentBranch}`
          : `${repository} on ${currentBranch}`

        helpers.setTitle(`Git repository analysis - ✅ ${contextInfo}`)
      },
    },

    // Version Analysis
    {
      title: 'Version calculation',
      task: async (ctx, helpers) => {
        const git = await createContextAwareGitOperations()

        helpers.setOutput('Analyzing commits since last release...')
        const commits = await git.getCommitsSinceTag()
        // Map util CommitInfo to workflow CommitInfo by adding files property
        const workflowCommits = commits.map((commit) => ({
          ...commit,
          files: [], // Add empty files array to match workflow CommitInfo interface
        }))
        ctx.git!.commits = workflowCommits

        let versionBump = options.type || 'patch'

        // Check if AI version suggestions are enabled
        const config = await loadWorkflowConfig()
        if (!options.type && config.ai?.enabled && config.ai?.features?.versionBump?.enabled) {
          try {
            helpers.setOutput('Using AI to determine version bump...')
            const aiService = new AIService(config.ai)

            // Generate changelog entries first to analyze for version bump
            const changelogEntries = await aiService.generateChangelog(workflowCommits)
            const suggestions = await aiService.suggestVersionBumps(changelogEntries, [
              { name: 'current-package', version: ctx.version!.current, path: process.cwd() },
            ])

            if (suggestions.length > 0 && suggestions[0]?.bumpType) {
              const suggestion = suggestions[0]
              versionBump = suggestion.bumpType
              helpers.setOutput(
                `AI suggests ${suggestion.bumpType} version bump (${suggestion.confidence}% confidence): ${suggestion.reasoning}`
              )
            } else {
              helpers.setOutput(
                'AI version suggestion unavailable, falling back to semantic analysis...'
              )
              // Fall back to original logic
              const hasBreaking = commits.some((c: any) => c.breaking)
              const hasFeatures = commits.some((c: any) => c.type === 'feat')

              if (hasBreaking) {
                versionBump = 'major'
              } else if (hasFeatures) {
                versionBump = 'minor'
              } else {
                versionBump = 'patch'
              }
            }
          } catch (error) {
            helpers.setOutput('AI version analysis failed, using semantic analysis...')
            // Fall back to original logic
            const hasBreaking = commits.some((c: any) => c.breaking)
            const hasFeatures = commits.some((c: any) => c.type === 'feat')

            if (hasBreaking) {
              versionBump = 'major'
            } else if (hasFeatures) {
              versionBump = 'minor'
            } else {
              versionBump = 'patch'
            }
          }
        } else if (!options.type) {
          helpers.setOutput('Determining semantic version bump...')

          // Analyze commits for version bump
          const hasBreaking = commits.some((c: any) => c.breaking)
          const hasFeatures = commits.some((c: any) => c.type === 'feat')

          if (hasBreaking) {
            versionBump = 'major'
          } else if (hasFeatures) {
            versionBump = 'minor'
          } else {
            versionBump = 'patch'
          }
        }

        const nextVersion = semver.inc(ctx.version!.current, versionBump)
        if (!nextVersion) {
          throw new Error(`Failed to calculate next version from ${ctx.version!.current}`)
        }

        ctx.version!.next = nextVersion
        ctx.version!.type = versionBump

        helpers.setTitle(
          `Version calculation - ✅ ${ctx.version!.current} → ${nextVersion} (${versionBump})`
        )
      },
    },

    // Version Approval
    {
      title: 'Version approval',
      task: async (ctx, helpers) => {
        // Version approval is now handled in CLI before task execution
        // This task just confirms the approved version
        helpers.setTitle(
          `Version approval - ✅ Using ${ctx.version!.type} bump (${ctx.version!.next})`
        )
        helpers.setOutput(
          `Approved version: ${ctx.version!.current} → ${ctx.version!.next} (${ctx.version!.type})`
        )
      },
    },

    // Deployment Summary
    {
      title: 'Deployment configuration',
      task: async (ctx, helpers) => {
        const deployments = []

        if (!options.skipCloudflare) deployments.push('Cloudflare')

        const summary =
          deployments.length > 0
            ? `Will deploy to: ${deployments.join(', ')}`
            : 'Cloudflare deployment skipped'

        helpers.setTitle(`Deployment configuration - ✅ ${summary} | npm: GitHub Actions`)
      },
    },

    // Release Execution
    {
      title: 'Release execution',
      subtasks: [
        {
          title: 'Update package.json version',
          task: async (ctx, helpers) => {
            if (options.dryRun) {
              helpers.setOutput(`[DRY RUN] Would set version to ${ctx.version!.next}...`)
              helpers.setTitle(`Update package.json version - ✅ ${ctx.version!.next} (dry run)`)
              return
            }

            const git = createGitOperations()
            helpers.setOutput(`Setting version to ${ctx.version!.next}...`)

            await git.updatePackageVersion(ctx.version!.next)
            helpers.setTitle(`Update package.json version - ✅ ${ctx.version!.next}`)
          },
        },
        {
          title: 'Generate changelog',
          task: async (ctx, helpers) => {
            if (options.dryRun) {
              helpers.setOutput('[DRY RUN] Would generate changelog entry...')
              helpers.setTitle('Generate changelog - ✅ CHANGELOG.md updated (dry run)')
              return
            }

            helpers.setOutput('Generating changelog entry...')

            const fs = await import('node:fs/promises')
            const changelogPath = 'CHANGELOG.md'

            // Check if AI changelog generation is enabled
            const config = await loadWorkflowConfig()
            let changelogEntry: string

            if (config.ai?.enabled && config.ai?.features?.changelog?.enabled) {
              try {
                helpers.setOutput('Using AI to generate changelog...')
                const aiService = new AIService(config.ai)
                const aiChangelog = await aiService.generateChangelog(ctx.git!.commits)

                if (aiChangelog && aiChangelog.length > 0) {
                  // Format the AI-generated changelog entries
                  const formattedEntries = aiChangelog
                    .map((entry) => {
                      const typeEmoji =
                        entry.type === 'feat' ? '✨' : entry.type === 'fix' ? '🐛' : '📝'
                      const scopeText = entry.scope ? `(${entry.scope})` : ''
                      return `- ${typeEmoji} ${entry.type}${scopeText}: ${entry.description}`
                    })
                    .join('\n')

                  changelogEntry = `## [${ctx.version!.next}] - ${new Date().toISOString().split('T')[0]}\n\n${formattedEntries}\n`
                  helpers.setOutput('AI-generated changelog created successfully')
                } else {
                  helpers.setOutput('AI changelog generation failed, using fallback...')
                  changelogEntry = generateChangelogEntry(ctx.version!.next, ctx.git!.commits)
                }
              } catch (error) {
                helpers.setOutput('AI changelog generation failed, using fallback...')
                changelogEntry = generateChangelogEntry(ctx.version!.next, ctx.git!.commits)
              }
            } else {
              // Use traditional changelog generation
              changelogEntry = generateChangelogEntry(ctx.version!.next, ctx.git!.commits)
            }

            try {
              const existingChangelog = await fs.readFile(changelogPath, 'utf-8')
              const updatedChangelog = insertChangelogEntry(existingChangelog, changelogEntry)
              await fs.writeFile(changelogPath, updatedChangelog)
            } catch {
              // Create new changelog
              const newChangelog = `# Changelog\n\n${changelogEntry}`
              await fs.writeFile(changelogPath, newChangelog)
            }

            helpers.setTitle('Generate changelog - ✅ CHANGELOG.md updated')
          },
        },
        {
          title: 'Commit release changes',
          task: async (ctx, helpers) => {
            if (options.dryRun) {
              const commitMessage = `chore: release v${ctx.version!.next}`
              helpers.setOutput('[DRY RUN] Would stage and commit files...')
              helpers.setTitle(`Commit release changes - ✅ ${commitMessage} (dry run)`)
              return
            }

            const git = createGitOperations()

            helpers.setOutput('Staging files...')
            // Convert working directory relative paths to git-root relative paths
            const path = await import('node:path')
            const cwd = process.cwd()
            const gitRoot = await git.getGitRoot()
            const packageJsonPath = path.relative(gitRoot, path.resolve(cwd, 'package.json'))
            const changelogPath = path.relative(gitRoot, path.resolve(cwd, 'CHANGELOG.md'))
            await git.stageFiles([packageJsonPath, changelogPath])

            helpers.setOutput('Creating release commit...')
            const commitMessage = `chore: release v${ctx.version!.next}`
            await git.commit(commitMessage)

            helpers.setTitle(`Commit release changes - ✅ ${commitMessage}`)
          },
        },
        {
          title: 'Create git tag',
          task: async (ctx, helpers) => {
            const tagName = `v${ctx.version!.next}`

            if (options.dryRun) {
              helpers.setOutput(`[DRY RUN] Would create tag ${tagName}...`)
              helpers.setTitle(`Create git tag - ✅ ${tagName} (dry run)`)
              return
            }

            const git = createGitOperations()

            // Check if tag already exists locally
            try {
              const existingTags = await git.getTags()
              if (existingTags.includes(tagName)) {
                helpers.setTitle(`Create git tag - ✅ ${tagName} (already exists)`)
                ctx.tagAlreadyExists = true
                return
              }
            } catch {
              // If we can't get tags, continue with creation
            }

            helpers.setOutput(`Creating tag ${tagName}...`)
            await git.createTag(tagName, `Release ${ctx.version!.next}`)
            ctx.tagAlreadyExists = false

            helpers.setTitle(`Create git tag - ✅ ${tagName}`)
          },
        },
        {
          title: 'Push to remote',
          task: async (ctx, helpers) => {
            if (options.dryRun) {
              helpers.setOutput('[DRY RUN] Would push commits and tags...')
              helpers.setTitle('Push to remote - ✅ Complete (dry run)')
              return
            }

            const git = createGitOperations()

            let commitsPushed = false
            let tagsPushed = false

            // Push commits
            try {
              helpers.setOutput('Pushing commits...')
              await git.push()
              commitsPushed = true
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              if (
                errorMessage.includes('verify your email') ||
                errorMessage.includes('Could not read from remote')
              ) {
                helpers.setTitle('Push to remote - ⚠️ Failed: Email verification required')
                helpers.setOutput('Please verify your email at https://github.com/settings/emails')
                return
              } else if (
                errorMessage.includes('up-to-date') ||
                errorMessage.includes('Everything up-to-date')
              ) {
                commitsPushed = true // Already up to date is fine
              } else {
                helpers.setTitle('Push to remote - ⚠️ Commit push failed (continuing)')
                helpers.setOutput(`Error: ${errorMessage.slice(0, 100)}...`)
              }
            }

            // Push tags (only if we created a new tag)
            if (ctx.tagAlreadyExists) {
              tagsPushed = true // Tag already exists, no need to push
              helpers.setOutput('Tag already exists on remote, skipping tag push')
            } else {
              try {
                const tagName = `v${ctx.version!.next}`
                helpers.setOutput('Pushing new tag...')
                await git.pushTags('origin', tagName)
                tagsPushed = true
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                if (errorMessage.includes('already exists') || errorMessage.includes('rejected')) {
                  tagsPushed = true // Tag already exists is fine
                  helpers.setOutput('Tag already exists on remote (continuing)')
                } else {
                  helpers.setTitle('Push to remote - ⚠️ Tag push failed (continuing)')
                  helpers.setOutput(`Error: ${errorMessage.slice(0, 100)}...`)
                }
              }
            }

            // Set final status
            if (commitsPushed && tagsPushed) {
              if (ctx.tagAlreadyExists) {
                helpers.setTitle('Push to remote - ✅ Commits pushed (tag already exists)')
              } else {
                helpers.setTitle('Push to remote - ✅ Complete')
              }
            } else if (commitsPushed) {
              if (ctx.tagAlreadyExists) {
                helpers.setTitle('Push to remote - ✅ Commits pushed (tag already exists)')
              } else {
                helpers.setTitle('Push to remote - ✅ Commits pushed (tag failed)')
              }
            } else if (tagsPushed) {
              helpers.setTitle('Push to remote - ✅ Tags pushed (commits up-to-date)')
            } else {
              helpers.setTitle('Push to remote - ⚠️ Push completed with warnings')
            }
          },
        },
      ],
    },

    // Build for deployment
    {
      title: 'Build project',
      task: async (ctx, helpers) => {
        if (options.dryRun) {
          helpers.setOutput('[DRY RUN] Would build project for deployment...')
          helpers.setTitle('Build project - ✅ Build complete (dry run)')
          return
        }

        helpers.setOutput('Building project for deployment...')

        const buildCommands: Array<[string, string[]]> = [
          ['bun', ['run', 'build']],
          ['npm', ['run', 'build']],
        ]

        let lastError: any = null

        for (const [command, args] of buildCommands) {
          try {
            helpers.setOutput(`Trying ${command} ${args.join(' ')}...`)
            await execa(command, args, { stdio: 'pipe' })
            helpers.setTitle(`Build project - ✅ Build complete (${command})`)
            return // Success! Exit early
          } catch (error) {
            const errorOutput = error instanceof Error ? error.message : String(error)

            // Check if it's a missing script error
            if (
              errorOutput.includes('script not found') ||
              errorOutput.includes('Missing script') ||
              errorOutput.includes('npm ERR! missing script') ||
              errorOutput.includes('Script not found')
            ) {
              lastError = error
              continue
            }

            // Real build error - don't continue
            throw new Error(`Build failed: ${errorOutput}`)
          }
        }

        // If we get here, build script wasn't found - that's okay for some projects
        if (lastError) {
          const lastErrorOutput = lastError instanceof Error ? lastError.message : String(lastError)
          if (
            lastErrorOutput.includes('script not found') ||
            lastErrorOutput.includes('Missing script') ||
            lastErrorOutput.includes('npm ERR! missing script') ||
            lastErrorOutput.includes('Script not found')
          ) {
            helpers.setTitle('Build project - ✅ No build script found (skipping)')
            return
          }
        }

        throw new Error('Build failed. Cannot proceed with deployment.')
      },
    },

    // Cloudflare Deployment
    {
      title: 'Deploy to Cloudflare',
      skip: () => options.skipCloudflare || false,
      task: async (ctx, helpers) => {
        helpers.setOutput('Deploying to Cloudflare...')

        try {
          const result = await execa('npx', ['wrangler', 'deploy'], { stdio: 'pipe' })

          // Extract deployment URL from output
          const output = result.stdout
          const urlMatch = output.match(/https?:\/\/\S+/)
          const deploymentUrl = urlMatch?.[0] || 'Deployed successfully'

          ctx.deployments = {
            ...ctx.deployments,
            cloudflare: {
              environment: 'production',
            },
          }

          helpers.setTitle(`Deploy to Cloudflare - ✅ ${deploymentUrl}`)
        } catch (error) {
          // Don't fail the entire workflow if Cloudflare deployment fails
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage.includes('Missing entry-point')) {
            helpers.setTitle('Deploy to Cloudflare - ⚠️ Failed: No wrangler config (continuing)')
          } else if (errorMessage.includes('not authenticated')) {
            helpers.setTitle('Deploy to Cloudflare - ⚠️ Failed: Not authenticated (continuing)')
          } else {
            helpers.setTitle('Deploy to Cloudflare - ⚠️ Failed (continuing)')
          }
        }
      },
    },

    // GitHub Release (triggers npm publishing via GitHub Actions)
    {
      title: 'Create GitHub release',
      skip: async () => {
        // Skip if all npm publishing is disabled
        if (options.skipNpm === true) {
          return 'npm publishing disabled for all packages'
        }

        // Check if there are any packages that should be published
        const publishablePackages = await detectPublishablePackages()
        const packagesToPublish = publishablePackages.filter(
          (pkg) => !shouldSkipNpmForPackage(pkg, options.skipNpm)
        )

        if (packagesToPublish.length === 0) {
          return 'no packages configured for npm publishing'
        }

        return false
      },
      task: async (ctx, helpers) => {
        if (options.dryRun) {
          helpers.setOutput('[DRY RUN] Would create GitHub release...')
          helpers.setTitle(
            `Create GitHub release - ✅ v${ctx.version!.next} → npm via Actions (dry run)`
          )
          return
        }

        // Detect which packages should be published
        const publishablePackages = await detectPublishablePackages()
        const packagesToPublish = publishablePackages.filter(
          (pkg) => !shouldSkipNpmForPackage(pkg, options.skipNpm)
        )
        const packagesToSkip = publishablePackages.filter((pkg) =>
          shouldSkipNpmForPackage(pkg, options.skipNpm)
        )

        let statusMessage = 'Creating GitHub release'
        if (packagesToSkip.length > 0) {
          statusMessage += ` (skipping npm for: ${packagesToSkip.join(', ')})`
        }
        helpers.setOutput(`${statusMessage}...`)

        try {
          const releaseNotes = generateReleaseNotes(ctx.git!.commits, ctx.version!.next)

          // Add package publishing info to release notes
          let enhancedReleaseNotes = releaseNotes
          if (packagesToPublish.length > 0) {
            enhancedReleaseNotes += `\n\n## 📦 NPM Publishing\n\n`
            enhancedReleaseNotes += `**Packages to be published:**\n`
            packagesToPublish.forEach((pkg) => {
              enhancedReleaseNotes += `- ${pkg}\n`
            })

            if (packagesToSkip.length > 0) {
              enhancedReleaseNotes += `\n**Packages skipped:**\n`
              packagesToSkip.forEach((pkg) => {
                enhancedReleaseNotes += `- ${pkg}\n`
              })
            }
          }

          await execa(
            'gh',
            [
              'release',
              'create',
              `v${ctx.version!.next}`,
              '--title',
              `Release v${ctx.version!.next}`,
              '--notes',
              enhancedReleaseNotes,
            ],
            { stdio: 'pipe' }
          )

          let successMessage = `Create GitHub release - ✅ v${ctx.version!.next}`
          if (packagesToPublish.length > 0) {
            successMessage += ` → npm via Actions (${packagesToPublish.length} packages)`
          } else {
            successMessage += ` (no npm publishing)`
          }

          helpers.setTitle(successMessage)

          if (packagesToPublish.length > 0) {
            helpers.setOutput(`GitHub Actions will publish: ${packagesToPublish.join(', ')}`)
          } else {
            helpers.setOutput('No packages will be published to npm')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage.includes('gh: command not found')) {
            helpers.setTitle('Create GitHub release - ⚠️ Failed: GitHub CLI not installed')
            helpers.setOutput('❌ Install: https://cli.github.com/')
          } else if (errorMessage.includes('not authenticated') || errorMessage.includes('401')) {
            helpers.setTitle('Create GitHub release - ⚠️ Failed: Not authenticated')
            helpers.setOutput('❌ Run: gh auth login')
          } else {
            helpers.setTitle('Create GitHub release - ⚠️ Failed (continuing)')
            helpers.setOutput(`Error: ${errorMessage.slice(0, 60)}...`)
          }
        }
      },
    },
  ]
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateChangelogEntry(version: string, commits: any[]): string {
  const date = new Date().toISOString().split('T')[0]
  let entry = `## [${version}] - ${date}\n\n`

  const features = commits.filter((c) => c.type === 'feat')
  const fixes = commits.filter((c) => c.type === 'fix')
  const others = commits.filter((c) => !['feat', 'fix'].includes(c.type))

  if (features.length > 0) {
    entry += '### Features\n\n'
    features.forEach((commit) => {
      entry += `- ${commit.message.replace(/^feat(\([^)]+\))?: /, '')}\n`
    })
    entry += '\n'
  }

  if (fixes.length > 0) {
    entry += '### Bug Fixes\n\n'
    fixes.forEach((commit) => {
      entry += `- ${commit.message.replace(/^fix(\([^)]+\))?: /, '')}\n`
    })
    entry += '\n'
  }

  if (others.length > 0) {
    entry += '### Other Changes\n\n'
    others.forEach((commit) => {
      entry += `- ${commit.message}\n`
    })
    entry += '\n'
  }

  return entry
}

function insertChangelogEntry(existingChangelog: string, newEntry: string): string {
  const lines = existingChangelog.split('\n')
  const headerIndex = lines.findIndex((line) => line.startsWith('# '))

  if (headerIndex === -1) {
    return `# Changelog\n\n${newEntry}\n${existingChangelog}`
  }

  // Insert after header
  lines.splice(headerIndex + 2, 0, newEntry)
  return lines.join('\n')
}

function generateReleaseNotes(commits: any[], version: string): string {
  const features = commits.filter((c) => c.type === 'feat')
  const fixes = commits.filter((c) => c.type === 'fix')

  let notes = `Release v${version}\n\n`

  if (features.length > 0) {
    notes += '## ✨ New Features\n'
    features.forEach((commit) => {
      notes += `- ${commit.message.replace(/^feat(\([^)]+\))?: /, '')}\n`
    })
    notes += '\n'
  }

  if (fixes.length > 0) {
    notes += '## 🐛 Bug Fixes\n'
    fixes.forEach((commit) => {
      notes += `- ${commit.message.replace(/^fix(\([^)]+\))?: /, '')}\n`
    })
    notes += '\n'
  }

  if (commits.length > features.length + fixes.length) {
    const others = commits.length - features.length - fixes.length
    notes += `## 📦 Other Changes\n${others} other commits included in this release.\n\n`
  }

  return notes
}

// =============================================================================
// GitHub Actions Monitoring
// =============================================================================

/**
 * Monitors GitHub Actions workflows triggered by a release tag and tracks npm publishing progress.
 *
 * This function watches for publishing workflows triggered by the release, monitors their execution,
 * and verifies that the package is successfully published to npm. It provides real-time feedback
 * and error recovery suggestions.
 *
 * @param repositoryName - The GitHub repository name in format "owner/repo"
 * @param tagName - The git tag that triggered the release (e.g., "v1.2.3")
 *
 * @example
 * ```typescript
 * // After creating a GitHub release
 * await watchGitHubActions('g-1-repo/studio', 'v1.2.3')
 * ```
 */
export async function watchGitHubActions(repositoryName: string, tagName: string): Promise<void> {
  const { createTaskEngine } = await import('../core/task-engine.js')

  const monitoringSteps = [
    {
      title: 'GitHub Actions Monitoring',
      subtasks: [
        {
          title: 'Find publishing workflow',
          task: async (ctx: any, helpers: any) => {
            helpers.setOutput(`Searching for workflows triggered by ${tagName}...`)

            let foundPublishingWorkflow = false
            const maxAttempts = 30
            let attempts = 0

            // First, check if we have publishing workflows at all
            let hasPublishingWorkflows = false
            try {
              const workflowsResult = await execa(
                'gh',
                ['workflow', 'list', '--repo', repositoryName, '--json', 'name,state'],
                { stdio: 'pipe' }
              )

              const workflows = JSON.parse(workflowsResult.stdout)
              hasPublishingWorkflows = workflows.some((workflow: any) => {
                const name = workflow.name?.toLowerCase() || ''
                return name.includes('publish') || name.includes('npm')
              })

              if (!hasPublishingWorkflows) {
                helpers.setTitle('Find publishing workflow - ⚠️ No publishing workflows found')
                helpers.setOutput(
                  `No GitHub Actions workflows found that publish to npm.\n` +
                  `To enable workflow monitoring, create a workflow file in .github/workflows/\n` +
                  `that includes 'publish' or 'npm' in its name and is triggered on release events.\n` +
                  `Example: .github/workflows/publish-npm.yml\n` +
                  `Visit: https://github.com/${repositoryName}/actions/new`
                )
                return
              }
            } catch (error) {
              helpers.setTitle('Find publishing workflow - ⚠️ Cannot check workflows')
              helpers.setOutput(
                `Failed to check GitHub Actions workflows.\n` +
                `This could be due to:\n` +
                `• GitHub CLI not configured: Run 'gh auth login'\n` +
                `• No repository access: Check permissions\n` +
                `• Network issues: Check internet connection\n` +
                `Error: ${error instanceof Error ? error.message : String(error)}`
              )
              return
            }

            // Now look for recent workflow runs triggered by releases
            while (!foundPublishingWorkflow && attempts < maxAttempts) {
              try {
                helpers.setOutput(
                  `Looking for workflow runs triggered by ${tagName}... (${attempts + 1}/${maxAttempts})`
                )

                const result = await execa(
                  'gh',
                  [
                    'run',
                    'list',
                    '--repo',
                    repositoryName,
                    '--event',
                    'release',
                    '--limit',
                    '10',
                    '--json',
                    'status,name,workflowName,createdAt,number,databaseId,conclusion',
                  ],
                  { stdio: 'pipe' }
                )

                const runs = JSON.parse(result.stdout)
                const recentPublishRun = runs.find((run: any) => {
                  const isPublishWorkflow =
                    run.workflowName?.toLowerCase().includes('publish') ||
                    run.workflowName?.toLowerCase().includes('npm')

                  if (!isPublishWorkflow) return false

                  // Look for runs created in the last 10 minutes (more generous timeframe)
                  const runCreatedAt = new Date(run.createdAt)
                  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
                  return runCreatedAt >= tenMinutesAgo
                })

                if (recentPublishRun) {
                  ctx.publishingWorkflow = recentPublishRun
                  foundPublishingWorkflow = true
                  helpers.setTitle(`Find publishing workflow - ✅ ${recentPublishRun.workflowName}`)
                  return
                }

                await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds between checks
                attempts++
              } catch (error) {
                helpers.setOutput(
                  `Error checking workflow runs: ${error instanceof Error ? error.message : String(error)}`
                )
                await new Promise((resolve) => setTimeout(resolve, 2000))
                attempts++
              }
            }

            if (!foundPublishingWorkflow) {
              helpers.setTitle('Find publishing workflow - ⚠️ No workflow run found')
              helpers.setOutput(
                `No workflow runs triggered by ${tagName} found after ${maxAttempts} attempts.\n` +
                `This could mean:\n` +
                `• The workflow hasn't started yet (GitHub can have delays)\n` +
                `• The workflow isn't triggered by release events\n` +
                `• The workflow name doesn't contain 'publish' or 'npm'\n` +
                `\nCheck manually: https://github.com/${repositoryName}/actions\n` +
                `Or wait a few minutes and try monitoring again.`
              )
            }
          },
        },
        {
          title: 'Monitor workflow execution',
          skip: (ctx: any) => !ctx.publishingWorkflow,
          task: async (ctx: any, helpers: any) => {
            const workflow = ctx.publishingWorkflow
            helpers.setOutput(`Monitoring workflow: ${workflow.workflowName} (#${workflow.number})`)

            if (workflow.status === 'completed') {
              await handleCompletedWorkflow(repositoryName, workflow, helpers)
              return
            }

            // Monitor running workflow
            await monitorRunningWorkflow(repositoryName, workflow.databaseId, helpers)
          },
        },
        {
          title: 'Verify npm package availability',
          skip: (ctx: any) => !ctx.publishingWorkflow || ctx.workflowFailed,
          task: async (ctx: any, helpers: any) => {
            helpers.setOutput('Checking npm package availability...')
            await checkNpmPackageWithHelpers(repositoryName, helpers)
          },
        },
      ],
    },
  ]

  try {
    const taskEngine = createTaskEngine({
      verbose: false,
      showTimer: true,
      clearOutput: false,
      autoRecovery: false, // Don't trigger recovery for monitoring tasks
    })

    await taskEngine.execute(monitoringSteps)
  } catch (error) {
    // If GitHub CLI is not available, show helpful message
    if (error instanceof Error && error.message.includes('gh: command not found')) {
      console.error(chalk.red('✗ GitHub CLI not found'))
      console.error(chalk.gray('Install: https://cli.github.com/'))
    } else {
      console.error(
        chalk.red(
          `✗ GitHub Actions monitoring failed: ${error instanceof Error ? error.message : String(error)}`
        )
      )
    }
  }
}

// Helper functions for listr2-based monitoring
async function handleCompletedWorkflow(
  repositoryName: string,
  workflow: any,
  helpers: any
): Promise<void> {
  if (workflow.conclusion === 'success') {
    helpers.setTitle(
      `Monitor workflow execution - ✅ ${workflow.workflowName} completed successfully`
    )
    helpers.setOutput('Workflow completed successfully')
  } else {
    helpers.setTitle(`Monitor workflow execution - ✗ ${workflow.workflowName} failed`)
    helpers.setOutput(
      `View details: https://github.com/${repositoryName}/actions/runs/${workflow.databaseId}`
    )

    // Enhanced error display using @clack/prompts
    createErrorBox(
      'PUBLISHING WORKFLOW FAILED',
      `GitHub Actions workflow "${workflow.workflowName}" failed`,
      [
        `View logs: https://github.com/${repositoryName}/actions/runs/${workflow.databaseId}`,
        'Check for authentication issues',
        'Verify npm token configuration',
      ]
    )

    // Trigger automated error recovery
    await triggerErrorRecovery(repositoryName, workflow.databaseId)
  }
}

async function monitorRunningWorkflow(
  repositoryName: string,
  runId: string | number,
  helpers: any
): Promise<void> {
  let isCompleted = false
  let lastStatus = ''
  let attempts = 0
  const maxAttempts = 60 // Monitor for up to 5 minutes

  while (!isCompleted && attempts < maxAttempts) {
    try {
      const result = await execa(
        'gh',
        [
          'run',
          'view',
          String(runId),
          '--repo',
          repositoryName,
          '--json',
          'status,conclusion,jobs',
        ],
        { stdio: 'pipe' }
      )

      const runData = JSON.parse(result.stdout)

      if (runData.status !== lastStatus) {
        lastStatus = runData.status

        if (runData.status === 'in_progress') {
          helpers.setOutput('Workflow is running...')

          // Show individual job progress
          if (runData.jobs && runData.jobs.length > 0) {
            const jobSummary = runData.jobs
              .map((job: any) => {
                const icon =
                  job.conclusion === 'success'
                    ? '✓'
                    : job.conclusion === 'failure'
                      ? '✗'
                      : job.status === 'in_progress'
                        ? '⧖'
                        : '-'
                return `${icon} ${job.name}`
              })
              .join(', ')
            helpers.setOutput(`Jobs: ${jobSummary}`)
          }
        } else if (runData.status === 'completed') {
          isCompleted = true

          if (runData.conclusion === 'success') {
            helpers.setTitle('Monitor workflow execution - ✅ Workflow completed successfully')
            helpers.setOutput('All jobs completed successfully')
          } else {
            helpers.setTitle('Monitor workflow execution - ✗ Workflow failed')
            helpers.setOutput(`Conclusion: ${runData.conclusion}`)

            // Set context flag for npm package check to skip
            helpers.setOutput('Workflow failed - skipping package verification')
            // Note: In a real implementation, we'd need to pass this through context
          }
        }
      }

      if (!isCompleted) {
        await new Promise((resolve) => setTimeout(resolve, 5000)) // Check every 5 seconds
        attempts++
      }
    } catch (error) {
      helpers.setTitle('Monitor workflow execution - ⚠️ Monitoring error')
      helpers.setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
      break
    }
  }

  if (!isCompleted && attempts >= maxAttempts) {
    helpers.setTitle('Monitor workflow execution - ⚠️ Monitoring timeout')
    helpers.setOutput('Workflow monitoring timed out after 5 minutes')
  }
}

async function checkNpmPackageWithHelpers(repositoryName: string, helpers: any): Promise<void> {
  try {
    // First try to get the actual package name from package.json
    let packageName: string

    try {
      const fs = await import('node:fs/promises')
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))
      packageName = packageJson.name
    } catch {
      // Fallback: Extract package name from repository name
      // Convert "owner/repo" to "@owner/repo" format
      packageName = repositoryName.includes('/')
        ? `@${repositoryName}` // Don't replace, just add @
        : repositoryName
    }

    helpers.setOutput(`Checking ${packageName}...`)

    const result = await execa('npm', ['view', packageName, 'version'], { stdio: 'pipe' })
    const version = result.stdout.trim()

    helpers.setTitle(`Verify npm package availability - ✅ ${packageName}@${version}`)
    helpers.setOutput(`Package is available! Install with: npm install ${packageName}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Provide more helpful error messages
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      helpers.setTitle('Verify npm package availability - ⚠️ Package not found')
      helpers.setOutput(
        'Package may not be published yet or repository name differs from package name'
      )
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      helpers.setTitle('Verify npm package availability - ⚠️ Network error')
      helpers.setOutput('Could not connect to npm registry')
    } else {
      helpers.setTitle('Verify npm package availability - ⚠️ Verification failed')
      helpers.setOutput(`Error: ${errorMessage}`)
    }
  }
}

async function triggerErrorRecovery(repositoryName: string, runId: string | number): Promise<void> {
  try {
    // Import ErrorRecoveryService dynamically to avoid circular dependencies
    const { ErrorRecoveryService } = await import('../core/error-recovery.js')
    const recoveryService = ErrorRecoveryService.getInstance()

    // Get error logs to create a meaningful error for recovery
    const errorLogs = await getFailureLogs(repositoryName, runId)
    if (errorLogs) {
      const error = new Error(`GitHub Actions workflow failed: ${errorLogs.slice(0, 200)}...`)
      await recoveryService.executeRecovery(error)
    }
  } catch (recoveryError) {
    console.error(
      chalk.red(
        `✗ Error recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`
      )
    )
  }
}

async function getFailureLogs(
  repositoryName: string,
  runId: string | number
): Promise<string | null> {
  try {
    const result = await execa(
      'gh',
      ['run', 'view', String(runId), '--repo', repositoryName, '--log-failed'],
      { stdio: 'pipe' }
    )
    return result.stdout
  } catch {
    return null
  }
}

// =============================================================================
// Cloudflare Deployment
// =============================================================================

/**
 * Deploys the current project to Cloudflare Workers using Wrangler CLI.
 *
 * This function executes the Cloudflare deployment process with proper error handling
 * and user-friendly error messages for common deployment issues like authentication
 * problems or missing configuration.
 *
 * @throws {Error} When deployment fails due to configuration or authentication issues
 *
 * @example
 * ```typescript
 * try {
 *   await deployToCloudflare()
 *   console.log('Deployment successful!')
 * } catch (error) {
 *   console.error('Deployment failed:', error.message)
 * }
 * ```
 */
export async function deployToCloudflare(): Promise<void> {
  try {
    process.stdout.write('\n')
    process.stdout.write(
      chalk.cyan('╔════════════════════════════════════════════════════════════════╗\n')
    )
    process.stdout.write(
      chalk.cyan('║                    CLOUDFLARE DEPLOYMENT                       ║\n')
    )
    process.stdout.write(
      chalk.cyan('╚════════════════════════════════════════════════════════════════╝\n')
    )
    process.stdout.write('\n')
    process.stdout.write('🚀 Deploying to Cloudflare Workers...\n')

    await execa('npx', ['wrangler', 'deploy'], { stdio: 'inherit' })

    process.stdout.write('\n')
    process.stdout.write(
      `🎉 ${chalk.green.bold('Cloudflare deployment completed successfully!')}\n`
    )
    process.stdout.write('\n')
  } catch (error) {
    process.stdout.write('\n')
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('Missing entry-point')) {
      process.stdout.write(`❌ ${chalk.red.bold('Deployment failed: No wrangler config found')}\n`)
      process.stdout.write('📝 Check your wrangler.toml or wrangler.json configuration\n')
    } else if (errorMessage.includes('not authenticated')) {
      process.stdout.write(`❌ ${chalk.red.bold('Deployment failed: Not authenticated')}\n`)
      process.stdout.write('📝 Run: npx wrangler login\n')
    } else if (errorMessage.includes('wrangler: command not found')) {
      process.stdout.write(`❌ ${chalk.red.bold('Deployment failed: Wrangler not installed')}\n`)
      process.stdout.write('📝 Install: npm install -g wrangler\n')
    } else {
      process.stdout.write(`❌ ${chalk.red.bold('Deployment failed')}\n`)
      process.stdout.write(`⚠️  Error: ${errorMessage.slice(0, 100)}...\n`)
    }
    process.stdout.write('\n')
  }
}
