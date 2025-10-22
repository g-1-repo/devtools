import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * Color constants for terminal output
 */
export const COLORS = {
  reset: '\x1B[0m',
  bright: '\x1B[1m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
} as const

/**
 * Options for executing shell commands
 */
export interface ExecOptions {
  silent?: boolean
  ignoreErrors?: boolean
  cwd?: string
}

/**
 * Log message with optional color
 */
export function log(message: string, color: string = ''): void {
  console.log(`${color}${message}${COLORS.reset}`)
}

/**
 * Execute shell command with error handling
 */
export function exec(command: string, options: ExecOptions = {}): string {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd,
    })
    return result ? result.toString().trim() : ''
  }
  catch (error: any) {
    if (!options.ignoreErrors) {
      log(`❌ Command failed: ${command}`, COLORS.red)
      log(error.message || 'Unknown error', COLORS.red)
      throw error
    }
    return ''
  }
}

/**
 * Get current Git branch
 */
export function getCurrentBranch(): string {
  return exec('git branch --show-current', { silent: true })
}

/**
 * Check if repository has uncommitted changes
 */
export function hasUncommittedChanges(): boolean {
  const status = exec('git status --porcelain', { silent: true })
  return status.length > 0
}

/**
 * Get list of changed files
 */
export function getChangedFiles(): string[] {
  const changedFiles = exec('git diff --name-only HEAD', { silent: true }).split('\n').filter(Boolean)
  const stagedFiles = exec('git diff --cached --name-only', { silent: true }).split('\n').filter(Boolean)
  return [...new Set([...changedFiles, ...stagedFiles])]
}

/**
 * Get recent commit messages since last tag
 */
export function getRecentCommits(count: number = 10): string[] {
  const lastTag = exec('git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10"', {
    silent: true,
    ignoreErrors: true,
  })
  const commitMessages = exec(
    `git log ${lastTag}..HEAD --pretty=format:"%s" 2>/dev/null || git log -${count} --pretty=format:"%s"`,
    { silent: true, ignoreErrors: true },
  )
  return commitMessages.split('\n').filter(Boolean)
}

/**
 * Version bump types
 */
export type VersionBumpType = 'major' | 'minor' | 'patch'

/**
 * Increment version string
 */
export function incrementVersion(version: string, type: VersionBumpType): string {
  const parts = version.split('.').map(Number)
  const major = parts[0] ?? 0
  const minor = parts[1] ?? 0
  const patch = parts[2] ?? 0

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

/**
 * Get current version from package.json
 */
export function getCurrentVersion(packagePath: string = 'package.json'): string {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  return packageJson.version
}

/**
 * Update version in package.json
 */
export function updatePackageVersion(newVersion: string, packagePath: string = 'package.json'): void {
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  packageJson.version = newVersion
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

/**
 * Analysis result for version bump determination
 */
export interface VersionAnalysis {
  versionBump: VersionBumpType
  changeType: string
  changesList: string[]
  changedFiles: string[]
  commits: string[]
}

/**
 * Analyze git changes to determine appropriate version bump
 */
export function analyzeChangesForVersionBump(): VersionAnalysis {
  const changedFiles = getChangedFiles()
  const commits = getRecentCommits()

  let versionBump: VersionBumpType = 'patch'
  let changeType = 'Patch Changes'
  const changesList: string[] = []

  // Check for breaking changes (major)
  const breakingIndicators = [
    /BREAKING[\s\-_]*CHANGE/i,
    /^feat!:/i,
    /^fix!:/i,
    /!:/,
    /breaking/i,
  ]

  const majorChanges = commits.some(commit =>
    breakingIndicators.some(pattern => pattern.test(commit)),
  )

  // Check for new features (minor)
  const featureIndicators = [
    /^feat[(:]|^feature[(:]|^add[(:]|new feature/i,
    /^enhancement/i,
  ]

  const minorChanges = commits.some(commit =>
    featureIndicators.some(pattern => pattern.test(commit)),
  )

  if (majorChanges) {
    versionBump = 'major'
    changeType = 'Major Changes'
    changesList.push('**BREAKING CHANGES**: Major updates that may require code changes')
  }
  else if (minorChanges) {
    versionBump = 'minor'
    changeType = 'Minor Changes'
  }

  // Analyze file changes
  const fileChanges = analyzeFileChanges(changedFiles)
  changesList.push(...fileChanges)

  // Analyze commit messages
  const commitChanges = analyzeCommitMessages(commits)
  changesList.push(...commitChanges)

  // If no specific changes identified, create generic entry
  if (changesList.length === 0) {
    changesList.push('General improvements and bug fixes')
  }

  return {
    versionBump,
    changeType,
    changesList: [...new Set(changesList)], // Remove duplicates
    changedFiles,
    commits,
  }
}

/**
 * Analyze file changes for changelog
 */
function analyzeFileChanges(files: string[]): string[] {
  const changes: string[] = []

  const patterns = [
    { pattern: /src\/.*\.(ts|js|tsx|jsx)$/, desc: 'Update source code and functionality' },
    { pattern: /src\/.*\.css$|src\/.*\.scss$/, desc: 'Update styling and design' },
    { pattern: /package\.json$/, desc: 'Update dependencies and package configuration' },
    { pattern: /tsconfig\.json$/, desc: 'Update TypeScript configuration' },
    { pattern: /README\.md$/, desc: 'Update documentation' },
    { pattern: /test|spec/i, desc: 'Improve testing coverage' },
    { pattern: /config/i, desc: 'Update configuration files' },
  ]

  for (const pattern of patterns) {
    if (files.some(file => pattern.pattern.test(file))) {
      changes.push(pattern.desc)
    }
  }

  return changes
}

/**
 * Analyze commit messages for changelog
 */
function analyzeCommitMessages(commits: string[]): string[] {
  const changes: string[] = []

  const patterns = [
    { pattern: /^fix[(:]|bug|error|issue/i, desc: 'Fix bugs and resolve issues' },
    { pattern: /^feat[(:]|feature|add/i, desc: 'Add new features and functionality' },
    { pattern: /^style[(:]|css|design|ui|ux/i, desc: 'Improve visual design and user experience' },
    { pattern: /^perf[(:]|performance|optimization|speed/i, desc: 'Enhance performance and optimization' },
    { pattern: /^refactor[(:]|cleanup|reorganize/i, desc: 'Refactor code for better maintainability' },
    { pattern: /^docs[(:]|documentation|readme/i, desc: 'Update documentation' },
    { pattern: /^test[(:]|testing|spec/i, desc: 'Improve testing coverage' },
    { pattern: /^chore[(:]|maintenance|update/i, desc: 'General maintenance and updates' },
    { pattern: /security|vulnerability|cve/i, desc: 'Address security improvements' },
  ]

  const matchedPatterns = new Set()

  for (const commit of commits) {
    for (const pattern of patterns) {
      if (pattern.pattern.test(commit) && !matchedPatterns.has(pattern.desc)) {
        changes.push(pattern.desc)
        matchedPatterns.add(pattern.desc)
        break // Only match first pattern per commit
      }
    }
  }

  return changes
}

/**
 * Update CHANGELOG.md with new version entry
 */
export function updateChangelog(version: string, changeType: string, changesList: string[], changelogPath: string = 'CHANGELOG.md'): void {
  let changelog: string

  if (existsSync(changelogPath)) {
    changelog = readFileSync(changelogPath, 'utf8')
  }
  else {
    // Create new changelog if it doesn't exist
    changelog = '# Changelog\n\n'
  }

  const newEntry = `## ${version}\n\n### ${changeType}\n\n${changesList.map(change => `- ${change}`).join('\n')}\n\n`

  // Insert new entry after the first heading
  const lines = changelog.split('\n')
  const firstHeadingIndex = lines.findIndex(line => line.startsWith('# '))

  if (firstHeadingIndex !== -1) {
    // Find the next heading or end of existing entries
    let insertIndex = firstHeadingIndex + 1
    while (insertIndex < lines.length && lines[insertIndex]?.trim() === '') {
      insertIndex++
    }

    lines.splice(insertIndex, 0, newEntry)
    changelog = lines.join('\n')
  }
  else {
    changelog = `# Changelog\n\n${newEntry}${changelog}`
  }

  writeFileSync(changelogPath, changelog)
}

/**
 * Create and push a git commit
 */
export function commitAndPush(commitMessage: string, push: boolean = true): void {
  exec('git add .')
  exec(`git commit -m "${commitMessage}"`)

  if (push) {
    exec('git push')
  }
}

/**
 * Check if we're in a git repository
 */
export function isGitRepository(): boolean {
  try {
    exec('git status', { silent: true })
    return true
  }
  catch {
    return false
  }
}
