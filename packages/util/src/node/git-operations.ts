/**
 * Comprehensive Git Operations API - Consolidation of @g-1/workflow and @g-1/util
 * Combines SimpleGit power with execSync reliability
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// Optional simple-git import
type SimpleGit = any

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
 * Branch creation options
 */
export interface BranchOptions {
  name?: string
  type: 'feature' | 'bugfix' | 'hotfix' | 'release'
  autoSuggest?: boolean
  baseBranch?: string
}

/**
 * Pull request options
 */
export interface PullRequestOptions {
  title?: string
  body?: string
  labels?: string[]
  assignees?: string[]
  reviewers?: string[]
  autoMerge?: boolean
}

/**
 * Commit information structure
 */
export interface CommitInfo {
  hash: string
  message: string
  author: string
  date: Date
  type?: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore'
  scope?: string
  breaking?: boolean
}

/**
 * Git error interface
 */
export interface GitError extends Error {
  name: 'GitError'
  code: string
}

/**
 * Version bump types
 */
export type VersionBumpType = 'major' | 'minor' | 'patch'

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
    // Only trim trailing whitespace to preserve git status format
    return result ? result.toString().replace(/\s+$/, '') : ''
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
 * Comprehensive Git Operations Class
 */
export class GitOperations {
  private git?: SimpleGit
  private workingDir: string
  private gitRoot?: string

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir
    // Lazy load SimpleGit to avoid dependency issues
    this.initializeSimpleGit()
  }

  async getGitRoot(): Promise<string> {
    if (this.gitRoot) {
      return this.gitRoot
    }
    try {
      this.gitRoot = exec('git rev-parse --show-toplevel', { silent: true, cwd: this.workingDir })
      return this.gitRoot
    }
    catch {
      this.gitRoot = this.workingDir
      return this.gitRoot
    }
  }

  private async getRelativePathFromGitRoot(filePath: string): Promise<string> {
    const gitRoot = await this.getGitRoot()
    const path = await import('node:path')
    const absolutePath = path.resolve(this.workingDir, filePath)
    return path.relative(gitRoot, absolutePath)
  }

  private async initializeSimpleGit(): Promise<void> {
    try {
      // @ts-ignore - Dynamic import of optional dependency
      const simpleGitModule = await import('simple-git')
      this.git = simpleGitModule.simpleGit(this.workingDir)
    }
    catch {
      // SimpleGit not available, fallback to exec methods only
      // Only show warning in verbose mode to avoid noise
      if (process.env.WORKFLOW_VERBOSE === 'true') {
        console.warn('SimpleGit not available, using exec fallbacks only')
      }
    }
  }

  // =============================================================================
  // Repository Info
  // =============================================================================

  async isGitRepository(): Promise<boolean> {
    try {
      if (this.git) {
        await this.git.status()
        return true
      }
      exec('git status', { silent: true })
      return true
    }
    catch {
      return false
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      if (this.git) {
        const status = await this.git.status()
        return status.current || 'main'
      }
      return exec('git branch --show-current', { silent: true })
    }
    catch (error) {
      throw this.createGitError('Failed to get current branch', error)
    }
  }

  async getRemoteUrl(): Promise<string> {
    try {
      if (this.git) {
        const remotes = await this.git.getRemotes(true)
        const origin = remotes.find((remote: any) => remote.name === 'origin')
        return origin?.refs?.push || ''
      }
      return exec('git config --get remote.origin.url', { silent: true })
    }
    catch (error) {
      throw this.createGitError('Failed to get remote URL', error)
    }
  }

  async getRepositoryName(): Promise<string> {
    const remoteUrl = await this.getRemoteUrl()
    const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)
    return match?.[1] || ''
  }

  // =============================================================================
  // Status & Changes
  // =============================================================================

  async hasUncommittedChanges(): Promise<boolean> {
    try {
      if (this.git) {
        const status = await this.git.status()
        return status.files.length > 0
      }
      const status = exec('git status --porcelain', { silent: true })
      return status.length > 0
    }
    catch (error) {
      throw this.createGitError('Failed to check uncommitted changes', error)
    }
  }

  async getChangedFiles(): Promise<string[]> {
    try {
      if (this.git) {
        const status = await this.git.status()
        const gitRoot = await this.getGitRoot()
        const path = await import('node:path')
        // Convert SimpleGit paths (relative to working dir) to git-root-relative paths
        return status.files.map((file: any) => {
          const absolutePath = path.resolve(this.workingDir, file.path)
          return path.relative(gitRoot, absolutePath)
        })
      }
      // Use git status --porcelain which consistently returns git-root-relative paths
      const status = exec('git status --porcelain', { silent: true })
      return status.split('\n')
        .filter(Boolean)
        .map((line) => {
          // Handle different status formats: "M  ", " M ", "??", "MM", etc.
          // Status codes are in first 2 chars, filename starts at position 3
          return line.slice(3).trim()
        })
    }
    catch (error) {
      throw this.createGitError('Failed to get changed files', error)
    }
  }

  async getStagedFiles(): Promise<string[]> {
    try {
      if (this.git) {
        const status = await this.git.status()
        return status.staged
      }
      return exec('git diff --cached --name-only', { silent: true }).split('\n').filter(Boolean)
    }
    catch (error) {
      throw this.createGitError('Failed to get staged files', error)
    }
  }

  // =============================================================================
  // Commits & History
  // =============================================================================

  async getCommits(since?: string, limit = 50): Promise<CommitInfo[]> {
    try {
      if (this.git) {
        const options = {
          from: since,
          to: 'HEAD',
          maxCount: limit,
        }
        const log = await this.git.log(options)
        return log.all.map((commit: any) => this.parseCommit(commit))
      }

      // Fallback to exec
      const sinceFlag = since ? `${since}..HEAD` : `-${limit}`
      const commitData = exec(`git log ${sinceFlag} --pretty=format:"%H|%s|%an|%ad" --date=iso`, { silent: true })
      return commitData.split('\n').filter(Boolean).map((line) => {
        const [hash, message, author, dateStr] = line.split('|')
        return this.parseCommit({ hash, message, author_name: author, date: dateStr })
      })
    }
    catch (error) {
      throw this.createGitError('Failed to get commits', error)
    }
  }

  async getCommitsSinceTag(tagPattern = 'v*'): Promise<CommitInfo[]> {
    try {
      // Get latest tag
      const latestTag = exec(
        `git tag --sort=-version:refname --merged | grep -E "${tagPattern.replace('*', '.*')}" | head -1`,
        { silent: true, ignoreErrors: true },
      )

      if (!latestTag) {
        // No tags, get all commits
        return this.getCommits()
      }

      return this.getCommits(latestTag)
    }
    catch (error) {
      throw this.createGitError('Failed to get commits since tag', error)
    }
  }

  getRecentCommits(count: number = 10): string[] {
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

  private parseCommit(commit: any): CommitInfo {
    const message = commit.message
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/)

    return {
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: new Date(commit.date),
      type: conventionalMatch?.[1] as any,
      scope: conventionalMatch?.[2],
      breaking: !!conventionalMatch?.[3],
    }
  }

  // =============================================================================
  // Branch Management
  // =============================================================================

  async createBranch(options: BranchOptions): Promise<string> {
    try {
      let branchName = options.name

      if (!branchName && options.autoSuggest) {
        branchName = await this.suggestBranchName(options.type)
      }

      if (!branchName) {
        throw new Error('Branch name is required')
      }

      // Format branch name according to convention
      const formattedName = this.formatBranchName(options.type, branchName)

      if (this.git) {
        await this.git.checkoutBranch(formattedName, options.baseBranch || 'main')
      }
      else {
        exec(`git checkout -b ${formattedName} ${options.baseBranch || 'main'}`)
      }

      return formattedName
    }
    catch (error) {
      throw this.createGitError(`Failed to create ${options.type} branch`, error)
    }
  }

  async switchBranch(branchName: string): Promise<void> {
    try {
      if (this.git) {
        await this.git.checkout(branchName)
      }
      else {
        exec(`git checkout ${branchName}`)
      }
    }
    catch (error) {
      throw this.createGitError(`Failed to switch to branch: ${branchName}`, error)
    }
  }

  async deleteBranch(branchName: string, force = false): Promise<void> {
    try {
      const flag = force ? '-D' : '-d'
      exec(`git branch ${flag} ${branchName}`)
    }
    catch (error) {
      throw this.createGitError(`Failed to delete branch: ${branchName}`, error)
    }
  }

  async getBranches(): Promise<string[]> {
    try {
      if (this.git) {
        const branches = await this.git.branchLocal()
        return branches.all
      }
      return exec('git branch --format="%(refname:short)"', { silent: true }).split('\n').filter(Boolean)
    }
    catch (error) {
      throw this.createGitError('Failed to get branches', error)
    }
  }

  private formatBranchName(type: string, name: string): string {
    const cleanName = name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return `${type}/${cleanName}`
  }

  // =============================================================================
  // AI-Powered Suggestions
  // =============================================================================

  async suggestBranchName(type: string): Promise<string> {
    try {
      const recentCommits = await this.getCommits(undefined, 5)
      const changedFiles = await this.getChangedFiles()
      return this.generateBranchSuggestion(type, changedFiles, recentCommits)
    }
    catch {
      return `${type}-${Date.now()}`
    }
  }

  async suggestCommitMessage(): Promise<string> {
    try {
      const changedFiles = await this.getChangedFiles()
      return this.generateCommitSuggestion(changedFiles)
    }
    catch {
      return 'chore: update files'
    }
  }

  private generateBranchSuggestion(type: string, files: string[], _commits: CommitInfo[]): string {
    if (files.some(f => f.includes('test')))
      return 'improve-testing'
    if (files.some(f => f.includes('config')))
      return 'update-configuration'
    if (files.some(f => f.includes('README')))
      return 'update-documentation'
    return 'feature-enhancement'
  }

  private generateCommitSuggestion(files: string[]): string {
    if (files.some(f => f.includes('test')))
      return 'test: improve test coverage'
    if (files.some(f => f.includes('.md')))
      return 'docs: update documentation'
    if (files.length === 1)
      return `feat: update ${files[0]}`
    return `feat: update ${files.length} files`
  }

  // =============================================================================
  // Git Operations
  // =============================================================================

  async stageFiles(files?: string[]): Promise<void> {
    try {
      if (files) {
        if (this.git) {
          // Convert git-root-relative paths to working-dir-relative for SimpleGit
          const gitRoot = await this.getGitRoot()
          const path = await import('node:path')
          const workingDirRelativePaths = files.map((f) => {
            const absolutePath = path.resolve(gitRoot, f)
            return path.relative(this.workingDir, absolutePath)
          })
          await this.git.add(workingDirRelativePaths)
        }
        else {
          const gitRoot = await this.getGitRoot()
          exec(`git -C "${gitRoot}" add ${files.map(f => `"${f}"`).join(' ')}`)
        }
      }
      else {
        if (this.git) {
          await this.git.add('.')
        }
        else {
          exec('git add .')
        }
      }
    }
    catch (error) {
      throw this.createGitError('Failed to stage files', error)
    }
  }

  async commit(message: string): Promise<string> {
    try {
      if (this.git) {
        const result = await this.git.commit(message)
        return result.commit
      }
      const gitRoot = await this.getGitRoot()
      exec(`git -C "${gitRoot}" commit -m "${message}"`)
      return exec('git rev-parse HEAD', { silent: true })
    }
    catch (error) {
      throw this.createGitError('Failed to commit changes', error)
    }
  }

  async push(branch?: string, remote = 'origin'): Promise<void> {
    try {
      const currentBranch = branch || await this.getCurrentBranch()
      if (this.git) {
        await this.git.push(remote, currentBranch)
      }
      else {
        exec(`git push ${remote} ${currentBranch}`)
      }
    }
    catch (error) {
      throw this.createGitError('Failed to push changes', error)
    }
  }

  commitAndPush(commitMessage: string, push: boolean = true): void {
    exec('git add .')
    exec(`git commit -m "${commitMessage}"`)

    if (push) {
      exec('git push')
    }
  }

  // =============================================================================
  // Version Management
  // =============================================================================

  getCurrentVersion(packagePath: string = 'package.json'): string {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    return packageJson.version
  }

  updatePackageVersion(newVersion: string, packagePath: string = 'package.json'): void {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    packageJson.version = newVersion
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }

  incrementVersion(version: string, type: VersionBumpType): string {
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

  analyzeChangesForVersionBump(): VersionAnalysis {
    const changedFiles = exec('git diff --name-only HEAD', { silent: true }).split('\n').filter(Boolean)
    const stagedFiles = exec('git diff --cached --name-only', { silent: true }).split('\n').filter(Boolean)
    const allChangedFiles = [...new Set([...changedFiles, ...stagedFiles])]
    const commits = this.getRecentCommits()

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
    const fileChanges = this.analyzeFileChanges(allChangedFiles)
    changesList.push(...fileChanges)

    // Analyze commit messages
    const commitChanges = this.analyzeCommitMessages(commits)
    changesList.push(...commitChanges)

    // If no specific changes identified, create generic entry
    if (changesList.length === 0) {
      changesList.push('General improvements and bug fixes')
    }

    return {
      versionBump,
      changeType,
      changesList: [...new Set(changesList)], // Remove duplicates
      changedFiles: allChangedFiles,
      commits,
    }
  }

  private analyzeFileChanges(files: string[]): string[] {
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

  private analyzeCommitMessages(commits: string[]): string[] {
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
          break
        }
      }
    }

    return changes
  }

  updateChangelog(version: string, changeType: string, changesList: string[], changelogPath: string = 'CHANGELOG.md'): void {
    let changelog: string

    if (existsSync(changelogPath)) {
      changelog = readFileSync(changelogPath, 'utf8')
    }
    else {
      changelog = '# Changelog\n\n'
    }

    const newEntry = `## ${version}\n\n### ${changeType}\n\n${changesList.map(change => `- ${change}`).join('\n')}\n\n`

    // Insert new entry after the first heading
    const lines = changelog.split('\n')
    const firstHeadingIndex = lines.findIndex(line => line.startsWith('# '))

    if (firstHeadingIndex !== -1) {
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

  // =============================================================================
  // Tag Management
  // =============================================================================

  async getTags(): Promise<string[]> {
    try {
      const tags = exec('git tag -l', { silent: true })
      return tags ? tags.split('\n').filter(Boolean) : []
    }
    catch (error) {
      throw this.createGitError('Failed to get tags', error)
    }
  }

  async createTag(tagName: string, message?: string): Promise<void> {
    try {
      // Check if tag already exists
      const existingTags = await this.getTags()
      if (existingTags.includes(tagName)) {
        throw new Error(`Tag ${tagName} already exists. Please use a different version or delete the existing tag.`)
      }

      if (message) {
        exec(`git tag -a ${tagName} -m "${message}"`)
      }
      else {
        exec(`git tag ${tagName}`)
      }
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error
      }
      throw this.createGitError(`Failed to create tag: ${tagName}`, error)
    }
  }

  async pushTags(remote = 'origin', specificTag?: string): Promise<void> {
    try {
      if (specificTag) {
        // Push only the specific tag to avoid conflicts with existing tags
        exec(`git push ${remote} ${specificTag}`, { silent: true })
      }
      else if (this.git) {
        await this.git.pushTags(remote)
      }
      else {
        exec(`git push ${remote} --tags`, { silent: true })
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // If tags already exist on remote, that's okay - just log and continue
      if (errorMessage.includes('already exists') || errorMessage.includes('rejected')) {
        if (process.env.WORKFLOW_VERBOSE === 'true') {
          console.warn('Some tags already exist on remote, continuing...')
        }
        return
      }

      throw this.createGitError('Failed to push tags', error)
    }
  }

  // =============================================================================
  // GitHub Integration (via CLI)
  // =============================================================================

  async createPullRequest(options: PullRequestOptions): Promise<string> {
    try {
      const currentBranch = await this.getCurrentBranch()
      const title = options.title || `${currentBranch}: Ready for review`

      // Use dynamic import for execa to avoid bundling issues
      const { execa } = await import('execa')

      const args = [
        'pr',
        'create',
        '--title',
        title,
        '--body',
        options.body || '',
      ]

      if (options.labels?.length) {
        args.push('--label', options.labels.join(','))
      }

      if (options.assignees?.length) {
        args.push('--assignee', options.assignees.join(','))
      }

      if (options.reviewers?.length) {
        args.push('--reviewer', options.reviewers.join(','))
      }

      const result = await execa('gh', args)
      const prUrl = result.stdout.trim()

      // Enable auto-merge if requested
      if (options.autoMerge) {
        await execa('gh', ['pr', 'merge', '--auto', '--squash'])
      }

      return prUrl
    }
    catch (error) {
      throw this.createGitError('Failed to create pull request', error)
    }
  }

  async mergePullRequest(prNumber: string, method = 'squash'): Promise<void> {
    try {
      const { execa } = await import('execa')
      await execa('gh', ['pr', 'merge', prNumber, `--${method}`])
    }
    catch (error) {
      throw this.createGitError(`Failed to merge PR #${prNumber}`, error)
    }
  }

  async closePullRequest(prNumber: string): Promise<void> {
    try {
      const { execa } = await import('execa')
      await execa('gh', ['pr', 'close', prNumber])
    }
    catch (error) {
      throw this.createGitError(`Failed to close PR #${prNumber}`, error)
    }
  }

  // =============================================================================
  // Cleanup Operations
  // =============================================================================

  async cleanupFeatureBranch(branchName: string, deleteBranch = true): Promise<void> {
    try {
      // Switch to main branch
      await this.switchBranch('main')

      // Pull latest changes
      if (this.git) {
        await this.git.pull('origin', 'main')
      }
      else {
        exec('git pull origin main')
      }

      // Delete feature branch if requested
      if (deleteBranch) {
        await this.deleteBranch(branchName)

        // Delete remote branch
        try {
          if (this.git) {
            await this.git.push('origin', branchName, ['--delete'])
          }
          else {
            exec(`git push origin --delete ${branchName}`, { ignoreErrors: true })
          }
        }
        catch {
          // Ignore if remote branch doesn't exist
        }
      }
    }
    catch (error) {
      throw this.createGitError(`Failed to cleanup branch: ${branchName}`, error)
    }
  }

  // =============================================================================
  // Utilities
  // =============================================================================

  private createGitError(message: string, error: unknown): GitError {
    const gitError: GitError = {
      name: 'GitError',
      message: `${message}: ${error instanceof Error ? error.message : String(error)}`,
      code: 'GIT_ERROR',
    }
    return gitError
  }
}

/**
 * Factory function
 */
export function createGitOperations(workingDir?: string): GitOperations {
  return new GitOperations(workingDir)
}

// Re-export commonly used functions as standalone
export const getCurrentBranch = () => exec('git branch --show-current', { silent: true })
export function hasUncommittedChanges() {
  const status = exec('git status --porcelain', { silent: true })
  return status.length > 0
}
export function getChangedFiles() {
  const changedFiles = exec('git diff --name-only HEAD', { silent: true }).split('\n').filter(Boolean)
  const stagedFiles = exec('git diff --cached --name-only', { silent: true }).split('\n').filter(Boolean)
  return [...new Set([...changedFiles, ...stagedFiles])]
}
export function isGitRepository() {
  try {
    exec('git status', { silent: true })
    return true
  }
  catch {
    return false
  }
}
