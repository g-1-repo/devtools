/**
 * Git Setup and Pre-flight Checks - Enhanced Git Repository Management
 * 
 * This module provides comprehensive git repository setup, detection, and auto-fix
 * functionality as specified in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import { createGitOperations } from '@g-1/util/node'
import chalk from 'chalk'
import { execa } from 'execa'
import { existsSync, writeFileSync } from 'node:fs'
import process from 'node:process'

/**
 * Git repository status information
 */
export interface GitStatus {
    hasGitRepo: boolean
    hasCommits: boolean
    hasUncommittedChanges: boolean
    currentBranch: string | null
    gitRoot?: string
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
            return {
                hasGitRepo: false,
                hasCommits: false,
                hasUncommittedChanges: false,
                currentBranch: null,
            }
        }

        // Check for commits
        let hasCommits = false
        let currentBranch: string | null = null

        try {
            const result = await execa('git', ['log', '--oneline', '-1'], {
                cwd: workingDir,
                stdio: 'pipe'
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

        // Get git root
        let gitRoot: string | undefined
        try {
            const result = await execa('git', ['rev-parse', '--show-toplevel'], {
                cwd: workingDir,
                stdio: 'pipe'
            })
            gitRoot = result.stdout.trim()
        } catch {
            gitRoot = workingDir
        }

        return {
            hasGitRepo,
            hasCommits,
            hasUncommittedChanges,
            currentBranch,
            gitRoot,
        }
    } catch (error) {
        throw new Error(`Failed to detect git status: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Initializes a git repository with optional .gitignore creation
 */
export async function initializeGitRepo(options: GitSetupOptions = {}): Promise<void> {
    const { createGitignore = true } = options

    console.log(chalk.blue('🔧 Initializing git repository...'))

    try {
        await execa('git', ['init'], { stdio: 'inherit' })

        // Create .gitignore if it doesn't exist and option is enabled
        if (createGitignore && !existsSync('.gitignore')) {
            await createDefaultGitignore()
        }

        console.log(chalk.green('✅ Git repository initialized'))
    } catch (error) {
        throw new Error(`Failed to initialize git repository: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Creates a default .gitignore file with common patterns
 */
export async function createDefaultGitignore(): Promise<void> {
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
    console.log(chalk.gray('📝 Created default .gitignore file'))
}

/**
 * Creates an initial commit with all current files
 */
export async function createInitialCommit(options: GitSetupOptions = {}): Promise<void> {
    const {
        includeAll = true,
        commitMessage = 'Initial commit: Project setup'
    } = options

    console.log(chalk.blue('🔧 Creating initial commit...'))

    try {
        if (includeAll) {
            await execa('git', ['add', '.'], { stdio: 'inherit' })
        }

        await execa('git', ['commit', '-m', commitMessage], { stdio: 'inherit' })
        console.log(chalk.green('✅ Initial commit created'))
    } catch (error) {
        throw new Error(`Failed to create initial commit: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Stages and commits uncommitted changes
 */
export async function stageAndCommitChanges(options: GitSetupOptions = {}): Promise<void> {
    const { commitMessage = 'chore: stage changes for release' } = options

    console.log(chalk.blue('🔧 Staging uncommitted changes...'))

    try {
        // Show what will be committed
        const statusResult = await execa('git', ['status', '--porcelain'], { stdio: 'pipe' })

        if (statusResult.stdout.trim()) {
            console.log(chalk.gray('Files to be committed:'))
            console.log(statusResult.stdout)

            await execa('git', ['add', '.'], { stdio: 'inherit' })
            await execa('git', ['commit', '-m', commitMessage], { stdio: 'inherit' })
            console.log(chalk.green('✅ Changes staged and committed'))
        } else {
            console.log(chalk.yellow('⚠️  No changes to commit'))
        }
    } catch (error) {
        throw new Error(`Failed to stage and commit changes: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Runs comprehensive pre-flight checks for git repository
 */
export async function runPreFlightChecks(workingDir: string = process.cwd()): Promise<PreFlightCheck[]> {
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
    if (gitStatus.hasUncommittedChanges) {
        checks.push({
            name: 'Working Directory',
            status: 'warning',
            message: 'Uncommitted changes detected',
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

    return checks
}

/**
 * Displays pre-flight check results in a formatted way
 */
export function displayPreFlightResults(checks: PreFlightCheck[]): void {
    console.log()
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'))
    console.log(chalk.cyan.bold('║                    PRE-FLIGHT CHECKS                     ║'))
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'))
    console.log()

    for (const check of checks) {
        const statusIcon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
        const statusColor = check.status === 'pass' ? chalk.green : check.status === 'fail' ? chalk.red : chalk.yellow

        console.log(`${statusIcon} ${statusColor(check.name)} - ${check.message}`)
    }
    console.log()
}

/**
 * Automatically fixes all available issues
 */
export async function autoFixAllIssues(checks: PreFlightCheck[]): Promise<void> {
    const fixableChecks = checks.filter(check => check.autoFixAvailable && check.autoFixAction)

    if (fixableChecks.length === 0) {
        console.log(chalk.green('✅ No issues to fix'))
        return
    }

    console.log(chalk.blue(`🔧 Auto-fixing ${fixableChecks.length} issue(s)...`))
    console.log()

    for (const check of fixableChecks) {
        try {
            console.log(chalk.gray(`Fixing: ${check.name}...`))
            await check.autoFixAction!()
        } catch (error) {
            console.log(chalk.red(`❌ Failed to fix ${check.name}: ${error instanceof Error ? error.message : String(error)}`))
            throw error
        }
    }

    console.log()
    console.log(chalk.green('✅ All issues fixed successfully'))
}

/**
 * Interactive prompt for fixing issues one by one
 */
export async function interactiveFixIssues(checks: PreFlightCheck[]): Promise<void> {
    const { prompt } = await import('enquirer')
    const fixableChecks = checks.filter(check => check.autoFixAvailable && check.autoFixAction)

    if (fixableChecks.length === 0) {
        console.log(chalk.green('✅ No issues to fix'))
        return
    }

    for (const check of fixableChecks) {
        const { shouldFix } = await prompt<{ shouldFix: boolean }>({
            type: 'confirm',
            name: 'shouldFix',
            message: `Fix ${check.name}? (${check.message})`,
            initial: true,
        })

        if (shouldFix) {
            try {
                console.log(chalk.gray(`Fixing: ${check.name}...`))
                await check.autoFixAction!()
            } catch (error) {
                console.log(chalk.red(`❌ Failed to fix ${check.name}: ${error instanceof Error ? error.message : String(error)}`))

                const { continueAnyway } = await prompt<{ continueAnyway: boolean }>({
                    type: 'confirm',
                    name: 'continueAnyway',
                    message: 'Continue with remaining fixes?',
                    initial: false,
                })

                if (!continueAnyway) {
                    throw error
                }
            }
        }
    }
}

/**
 * Shows manual fix instructions for issues
 */
export function showManualFixInstructions(checks: PreFlightCheck[]): void {
    const failedChecks = checks.filter(check => check.status === 'fail' || check.status === 'warning')

    if (failedChecks.length === 0) {
        console.log(chalk.green('✅ No issues found'))
        return
    }

    console.log()
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'))
    console.log(chalk.cyan.bold('║                 MANUAL FIX INSTRUCTIONS                  ║'))
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'))
    console.log()

    for (const check of failedChecks) {
        console.log(chalk.red(`❌ ${check.name}: ${check.message}`))

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