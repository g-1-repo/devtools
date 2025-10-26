/**
 * Git Setup and Pre-flight Checks - Enhanced Git Repository Management
 *
 * This module provides comprehensive git repository setup, detection, and auto-fix
 * functionality as specified in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import { confirm, intro, log } from '@clack/prompts'
import { createGitOperations } from '@g-1/util/node'
import chalk from 'chalk'
import { execa } from 'execa'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * Git repository status information
 */
export interface GitStatus {
  hasGitRepo: boolean
  hasCommits: boolean
  hasUncommittedChanges: boolean
  hasUntrackedFiles: boolean
  currentBranch: string | null
  gitRoot?: string
  hasNestedGitRepo?: boolean
  parentGitRoot?: string
  isInMonorepo?: boolean
  untrackedFiles?: string[]
}

/**
 * Pre-flight check result
 */
export interface PreFlightCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  autoFixAvailable: boolean
  autoFixAction?: () => Promise<void>
}

/**
 * Git setup options
 */
export interface GitSetupOptions {
  autoFix?: boolean
  interactive?: boolean
  commitMessage?: string
  includeAll?: boolean
  createGitignore?: boolean
}

/**
 * Detects comprehensive git repository status
 */
export async function detectGitStatus(workingDir: string = process.cwd()): Promise<GitStatus> {
  const git = createGitOperations(workingDir)

  try {
    // Check for .git directory
    const hasGitRepo = await git.isGitRepository()

    if (!hasGitRepo) {
      // Check if we're inside a parent git repository (monorepo scenario)
      const parentGitInfo = await detectParentGitRepository(workingDir)

      return {
        hasGitRepo: false,
        hasCommits: false,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        currentBranch: null,
        hasNestedGitRepo: false,
        parentGitRoot: parentGitInfo.parentGitRoot,
        isInMonorepo: parentGitInfo.isInMonorepo,
      }
    }

    // Check for commits
    let hasCommits = false
    let currentBranch: string | null = null

    try {
      const result = await execa('git', ['log', '--oneline', '-1'], {
        cwd: workingDir,
        stdio: 'pipe',
      })
      hasCommits = result.stdout.trim().length > 0
    } catch {
      hasCommits = false
    }

    // Get current branch
    try {
      currentBranch = await git.getCurrentBranch()
    } catch {
      currentBranch = null
    }

    // Check for uncommitted changes
    const hasUncommittedChanges = await git.hasUncommittedChanges()

    // Check for untracked files
    let hasUntrackedFiles = false
    let untrackedFiles: string[] = []
    try {
      const statusResult = await execa('git', ['status', '--porcelain'], {
        cwd: workingDir,
        stdio: 'pipe',
      })
      const statusLines = statusResult.stdout.split('\n').filter(line => line.trim())
      untrackedFiles = statusLines
        .filter(line => line.startsWith('??'))
        .map(line => line.substring(3).trim())
      hasUntrackedFiles = untrackedFiles.length > 0
    } catch {
      hasUntrackedFiles = false
      untrackedFiles = []
    }

    // Get git root
    let gitRoot: string | undefined
    try {
      const result = await execa('git', ['rev-parse', '--show-toplevel'], {
        cwd: workingDir,
        stdio: 'pipe',
      })
      gitRoot = result.stdout.trim()
    } catch {
      gitRoot = workingDir
    }

    // Check for nested git repository scenario
    const parentGitInfo = await detectParentGitRepository(workingDir)
    const hasNestedGitRepo = parentGitInfo.isInMonorepo && gitRoot !== parentGitInfo.parentGitRoot

    return {
      hasGitRepo,
      hasCommits,
      hasUncommittedChanges,
      hasUntrackedFiles,
      currentBranch,
      gitRoot,
      hasNestedGitRepo,
      parentGitRoot: parentGitInfo.parentGitRoot,
      isInMonorepo: parentGitInfo.isInMonorepo,
      untrackedFiles,
    }
  } catch (error) {
    throw new Error(
      `Failed to detect git status: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Detects if the current directory is inside a parent git repository (monorepo scenario)
 */
async function detectParentGitRepository(workingDir: string): Promise<{
  isInMonorepo: boolean
  parentGitRoot?: string
}> {
  let currentDir = workingDir
  const rootDir = path.parse(currentDir).root

  while (currentDir !== rootDir) {
    const parentDir = path.dirname(currentDir)

    // Skip if we're checking the same directory
    if (parentDir === currentDir) {
      break
    }

    try {
      const result = await execa('git', ['rev-parse', '--show-toplevel'], {
        cwd: parentDir,
        stdio: 'pipe',
      })

      const parentGitRoot = result.stdout.trim()

      // Make sure we found a different git repository
      if (parentGitRoot && parentGitRoot !== workingDir) {
        return {
          isInMonorepo: true,
          parentGitRoot,
        }
      }
    } catch {
      // No git repository in this parent directory, continue searching
    }

    currentDir = parentDir
  }

  return {
    isInMonorepo: false,
  }
}

/**
 * Initializes a git repository with optional .gitignore creation
 */
export async function initializeGitRepo(options: GitSetupOptions = {}): Promise<void> {
  const { createGitignore = true } = options

  console.log(chalk.blue('Initializing git repository...'))

  try {
    await execa('git', ['init'], { stdio: 'inherit' })

    // Create .gitignore if it doesn't exist and option is enabled
    if (createGitignore && !existsSync('.gitignore')) {
      await createDefaultGitignore()
    }

    console.log(chalk.green('Git repository initialized'))
  } catch (error) {
    throw new Error(
      `Failed to initialize git repository: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Creates a default .gitignore file with common patterns
 */
export async function createDefaultGitignore(): Promise<void> {
  if (existsSync('.gitignore')) {
    console.log(chalk.gray('.gitignore already exists, skipping'))
    return
  }

  const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
.nuxt/
.svelte-kit/

# Environment variables
.env
.env.local
.env.*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
.nyc_output/

# Temporary folders
tmp/
temp/
`

  writeFileSync('.gitignore', gitignoreContent)
  console.log(chalk.gray('Created default .gitignore file'))
}

/**
 * Creates an initial commit with all current files
 */
export async function createInitialCommit(options: GitSetupOptions = {}): Promise<void> {
  const { includeAll = true, commitMessage = 'Initial commit: Project setup' } = options

  console.log(chalk.blue('Creating initial commit...'))

  try {
    if (includeAll) {
      await execa('git', ['add', '.'], { stdio: 'inherit' })
    }

    await execa('git', ['commit', '-m', commitMessage], { stdio: 'inherit' })
    console.log(chalk.green('Initial commit created'))
  } catch (error) {
    throw new Error(
      `Failed to create initial commit: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Stages and commits uncommitted changes
 */
export async function stageAndCommitChanges(options: GitSetupOptions = {}): Promise<void> {
  const { commitMessage } = options

  console.log(chalk.blue('Staging uncommitted changes...'))

  try {
    // Show what will be committed
    const statusResult = await execa('git', ['status', '--porcelain'], { stdio: 'pipe' })

    if (statusResult.stdout.trim()) {
      console.log(chalk.gray('Files to be committed:'))
      console.log(statusResult.stdout)

      // Get list of changed files for AI analysis
      const changedFiles = statusResult.stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.substring(3).trim()) // Remove git status prefix

      // Separate untracked files for better messaging
      const untrackedFiles = statusResult.stdout
        .split('\n')
        .filter((line) => line.startsWith('??'))
        .map((line) => line.substring(3).trim())

      if (untrackedFiles.length > 0) {
        console.log(chalk.yellow(`Found ${untrackedFiles.length} untracked file(s):`))
        untrackedFiles.forEach(file => console.log(chalk.gray(`  ${file}`)))
      }

      let finalCommitMessage = commitMessage

      // Try to use AI to suggest a better commit message if not provided
      if (!commitMessage) {
        try {
          const { loadWorkflowConfig } = await import('../config/workflow-config.js')
          const { AIService } = await import('./ai-service.js')

          const config = await loadWorkflowConfig()
          if (config.ai?.enabled && config.ai?.suggestCommitMessages) {
            const aiService = new AIService(config.ai)
            finalCommitMessage = await aiService.suggestCommitMessage(changedFiles)
            console.log(chalk.cyan(`AI suggested commit message: ${finalCommitMessage}`))
          } else {
            finalCommitMessage = 'chore: stage changes for release'
          }
        } catch (error) {
          console.log(chalk.yellow('Failed to get AI commit suggestion, using fallback'))
          finalCommitMessage = 'chore: stage changes for release'
        }
      }

      // Use git add -A to include untracked files
      await execa('git', ['add', '-A'], { stdio: 'inherit' })

      // Verify we have staged changes before committing
      const stagedResult = await execa('git', ['diff', '--cached', '--name-only'], { stdio: 'pipe' })
      if (!stagedResult.stdout.trim()) {
        console.log(chalk.yellow('No staged changes to commit after git add'))
        return
      }

      await execa('git', ['commit', '-m', finalCommitMessage!], { stdio: 'inherit' })
      console.log(chalk.green('Changes staged and committed'))
    } else {
      console.log(chalk.yellow('No changes to commit'))
    }
  } catch (error) {
    throw new Error(
      `Failed to stage and commit changes: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Runs comprehensive pre-flight checks for git repository
 */
export async function runPreFlightChecks(
  workingDir: string = process.cwd()
): Promise<PreFlightCheck[]> {
  const gitStatus = await detectGitStatus(workingDir)
  const checks: PreFlightCheck[] = []

  // Git Repository Check
  if (!gitStatus.hasGitRepo) {
    checks.push({
      name: 'Git Repository',
      status: 'fail',
      message: 'No git repository found',
      autoFixAvailable: true,
      autoFixAction: async () => await initializeGitRepo(),
    })
  } else {
    checks.push({
      name: 'Git Repository',
      status: 'pass',
      message: 'Git repository exists',
      autoFixAvailable: false,
    })
  }

  // Initial Commit Check
  if (gitStatus.hasGitRepo && !gitStatus.hasCommits) {
    checks.push({
      name: 'Initial Commit',
      status: 'fail',
      message: 'No commits found in repository',
      autoFixAvailable: true,
      autoFixAction: async () => await createInitialCommit(),
    })
  } else if (gitStatus.hasCommits) {
    checks.push({
      name: 'Initial Commit',
      status: 'pass',
      message: `Repository has commits on branch: ${gitStatus.currentBranch}`,
      autoFixAvailable: false,
    })
  }

  // Working Directory Check
  if (gitStatus.hasUncommittedChanges || gitStatus.hasUntrackedFiles) {
    const issues = []
    if (gitStatus.hasUncommittedChanges) issues.push('uncommitted changes')
    if (gitStatus.hasUntrackedFiles) issues.push(`untracked files (${gitStatus.untrackedFiles?.length || 0})`)

    checks.push({
      name: 'Working Directory',
      status: 'warning',
      message: `${issues.join(' and ')} detected`,
      autoFixAvailable: true,
      autoFixAction: async () => await stageAndCommitChanges(),
    })
  } else if (gitStatus.hasGitRepo) {
    checks.push({
      name: 'Working Directory',
      status: 'pass',
      message: 'Working directory is clean',
      autoFixAvailable: false,
    })
  }

  // Nested Git Repository Check
  if (gitStatus.hasNestedGitRepo) {
    checks.push({
      name: 'Git Repository Structure',
      status: 'fail',
      message: `Nested git repository detected. Current: ${gitStatus.gitRoot}, Parent: ${gitStatus.parentGitRoot}. This can cause conflicts in monorepo workflows.`,
      autoFixAvailable: true,
      autoFixAction: async () => {
        // Remove the nested .git directory
        const nestedGitPath = path.join(workingDir, '.git')
        if (existsSync(nestedGitPath)) {
          await execa('rm', ['-rf', nestedGitPath], { cwd: workingDir })
          console.log(chalk.yellow(`Removed nested git repository at ${nestedGitPath}`))
          console.log(chalk.blue(`Now using parent monorepo at ${gitStatus.parentGitRoot}`))
        }
      },
    })
  } else if (gitStatus.isInMonorepo && !gitStatus.hasGitRepo) {
    checks.push({
      name: 'Git Repository Structure',
      status: 'pass',
      message: `Using monorepo git repository at ${gitStatus.parentGitRoot}`,
      autoFixAvailable: false,
    })
  } else if (gitStatus.hasGitRepo && !gitStatus.hasNestedGitRepo) {
    checks.push({
      name: 'Git Repository Structure',
      status: 'pass',
      message: 'Git repository structure is correct',
      autoFixAvailable: false,
    })
  }

  return checks
}

/**
 * Displays pre-flight check results in a formatted way
 */
export function displayPreFlightResults(checks: PreFlightCheck[]): void {
  intro('Pre-flight Checks')

  for (const check of checks) {
    switch (check.status) {
      case 'pass':
        log.success(`${check.name} - ${check.message}`)
        break
      case 'fail':
        log.error(`${check.name} - ${check.message}`)
        break
      case 'warning':
        log.warn(`${check.name} - ${check.message}`)
        break
    }
  }
}

/**
 * Automatically fixes all available issues
 */
export async function autoFixAllIssues(checks: PreFlightCheck[]): Promise<void> {
  const fixableChecks = checks.filter((check) => check.autoFixAvailable && check.autoFixAction)

  if (fixableChecks.length === 0) {
    console.log(chalk.green('No issues to fix'))
    return
  }

  console.log(chalk.blue(`Auto-fixing ${fixableChecks.length} issue(s)...`))
  console.log()

  for (const check of fixableChecks) {
    try {
      console.log(chalk.gray(`Fixing: ${check.name}...`))
      await check.autoFixAction!()
    } catch (error) {
      console.log(
        chalk.red(
          `Failed to fix ${check.name}: ${error instanceof Error ? error.message : String(error)}`
        )
      )
      throw error
    }
  }

  console.log()
  console.log(chalk.green('All issues fixed successfully'))
}

/**
 * Interactive prompt for fixing issues one by one
 */
export async function interactiveFixIssues(checks: PreFlightCheck[]): Promise<void> {
  const fixableChecks = checks.filter((check) => check.autoFixAvailable && check.autoFixAction)

  if (fixableChecks.length === 0) {
    console.log(chalk.green('No issues to fix'))
    return
  }

  for (const check of fixableChecks) {
    const shouldFix = await confirm({
      message: `Fix ${check.name}? (${check.message})`,
      initialValue: true,
    })

    if (shouldFix === true) {
      try {
        console.log(chalk.gray(`Fixing: ${check.name}...`))
        await check.autoFixAction!()
      } catch (error) {
        console.log(
          chalk.red(
            `Failed to fix ${check.name}: ${error instanceof Error ? error.message : String(error)}`
          )
        )

        const continueAnyway = await confirm({
          message: 'Continue with remaining fixes?',
          initialValue: false,
        })

        if (continueAnyway !== true) {
          throw error
        }
      }
    } else if (shouldFix === false) {
    } else {
      // User cancelled, exit
      console.log(chalk.yellow('Interactive fixing cancelled'))
      return
    }
  }
}

/**
 * Shows manual fix instructions for issues
 */
export function showManualFixInstructions(checks: PreFlightCheck[]): void {
  const failedChecks = checks.filter(
    (check) => check.status === 'fail' || check.status === 'warning'
  )

  if (failedChecks.length === 0) {
    log.success('No issues found')
    return
  }

  intro('Manual Fix Instructions')

  for (const check of failedChecks) {
    log.error(`${check.name}: ${check.message}`)

    switch (check.name) {
      case 'Git Repository':
        console.log(chalk.gray('   Fix: Run `git init` to initialize a git repository'))
        break
      case 'Initial Commit':
        console.log(chalk.gray('   Fix: Run `git add .` then `git commit -m "Initial commit"`'))
        break
      case 'Working Directory':
        console.log(chalk.gray('   Fix: Run `git add .` then `git commit -m "Commit changes"`'))
        break
    }
    console.log()
  }
}
