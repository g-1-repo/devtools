/**
 * Test suite for init command functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, writeFileSync } from 'node:fs'
import { runInitCommand } from '../cli/init.js'
import * as gitSetup from '../core/git-setup.js'
import * as workflowConfig from '../config/workflow-config.js'

// Mock external dependencies
vi.mock('node:fs')
vi.mock('enquirer')
vi.mock('../core/git-setup.js')
vi.mock('../config/workflow-config.js')

const mockExistsSync = vi.mocked(existsSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockGitSetup = vi.mocked(gitSetup)
const mockWorkflowConfig = vi.mocked(workflowConfig)

describe('Init Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Setup default mocks
    mockGitSetup.detectGitStatus.mockResolvedValue({
      isGitRepository: false,
      currentBranch: null,
      hasRemote: false,
      hasCommits: false,
      hasUncommittedChanges: false,
      error: null
    })

    mockGitSetup.runPreFlightChecks.mockResolvedValue({
      gitRepository: { status: 'success', message: 'Git repository found' },
      packageJson: { status: 'success', message: 'package.json found' },
      nodeModules: { status: 'success', message: 'node_modules found' },
      gitignore: { status: 'success', message: '.gitignore found' },
      overall: { status: 'success', message: 'All checks passed' }
    })

    mockGitSetup.autoFixAllIssues.mockResolvedValue({
      gitInit: { attempted: false, success: false },
      gitignore: { attempted: false, success: false },
      initialCommit: { attempted: false, success: false }
    })

    mockWorkflowConfig.createDefaultConfig.mockReturnValue({
      git: {
        autoInit: false,
        defaultBranch: 'main',
        requireCleanWorkingDirectory: true,
        autoCommit: false
      },
      release: {
        skipTests: false,
        skipLint: false,
        skipBuild: false,
        skipPublish: false,
        versionBumpType: 'patch',
        createGitTag: true,
        pushToRemote: true
      },
      errorHandling: {
        autoFix: false,
        interactive: true,
        maxRetries: 3,
        retryDelay: 1000
      },
      cli: {
        colorOutput: true,
        verbose: false,
        logLevel: 'info'
      },
      hooks: {
        preRelease: [],
        postRelease: [],
        onError: []
      }
    })
  })

  describe('runInitCommand', () => {
    it('should initialize Git repository and create config', async () => {
      mockExistsSync.mockReturnValue(false) // No existing files

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(mockGitSetup.detectGitStatus).toHaveBeenCalled()
      expect(mockGitSetup.runPreFlightChecks).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Workflow initialization completed'))
    })

    it('should skip Git initialization when skipGit is true', async () => {
      mockExistsSync.mockReturnValue(false)

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: true,
        skipConfig: false,
        nonInteractive: true
      })

      expect(mockGitSetup.detectGitStatus).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipping Git setup'))
    })

    it('should skip config creation when skipConfig is true', async () => {
      mockExistsSync.mockReturnValue(false)

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: true,
        nonInteractive: true
      })

      expect(mockWorkflowConfig.createDefaultConfig).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipping configuration setup'))
    })

    it('should auto-fix issues when autoFix is enabled', async () => {
      mockExistsSync.mockReturnValue(false)
      mockGitSetup.runPreFlightChecks.mockResolvedValue({
        gitRepository: { status: 'error', message: 'Not a Git repository' },
        packageJson: { status: 'success', message: 'package.json found' },
        nodeModules: { status: 'success', message: 'node_modules found' },
        gitignore: { status: 'warning', message: '.gitignore missing' },
        overall: { status: 'error', message: 'Issues found' }
      })

      mockGitSetup.autoFixAllIssues.mockResolvedValue({
        gitInit: { attempted: true, success: true },
        gitignore: { attempted: true, success: true },
        initialCommit: { attempted: true, success: true }
      })

      await runInitCommand({
        force: false,
        autoFix: true,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(mockGitSetup.autoFixAllIssues).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Auto-fixing issues'))
    })

    it('should handle existing configuration file without force', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path.toString().includes('.workflow.config.js')
      })

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(mockWriteFileSync).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already exists'))
    })

    it('should overwrite existing configuration with force flag', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path.toString().includes('.workflow.config.js')
      })

      await runInitCommand({
        force: true,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(mockWriteFileSync).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Configuration file created'))
    })

    it('should handle Git repository that already exists', async () => {
      mockGitSetup.detectGitStatus.mockResolvedValue({
        isGitRepository: true,
        currentBranch: 'main',
        hasRemote: true,
        hasCommits: true,
        hasUncommittedChanges: false,
        error: null
      })

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git repository already initialized'))
    })

    it('should handle pre-flight check failures', async () => {
      mockGitSetup.runPreFlightChecks.mockResolvedValue({
        gitRepository: { status: 'error', message: 'Git repository not found' },
        packageJson: { status: 'error', message: 'package.json not found' },
        nodeModules: { status: 'error', message: 'node_modules not found' },
        gitignore: { status: 'error', message: '.gitignore not found' },
        overall: { status: 'error', message: 'Multiple issues found' }
      })

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Pre-flight checks failed'))
    })

    it('should handle auto-fix failures gracefully', async () => {
      mockGitSetup.runPreFlightChecks.mockResolvedValue({
        gitRepository: { status: 'error', message: 'Not a Git repository' },
        packageJson: { status: 'success', message: 'package.json found' },
        nodeModules: { status: 'success', message: 'node_modules found' },
        gitignore: { status: 'success', message: '.gitignore found' },
        overall: { status: 'error', message: 'Git issues found' }
      })

      mockGitSetup.autoFixAllIssues.mockResolvedValue({
        gitInit: { attempted: true, success: false, error: 'Permission denied' },
        gitignore: { attempted: false, success: false },
        initialCommit: { attempted: false, success: false }
      })

      await runInitCommand({
        force: false,
        autoFix: true,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Some auto-fixes failed'))
    })

    it('should create configuration file with proper content', async () => {
      mockExistsSync.mockReturnValue(false)

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.workflow.config.js'),
        expect.stringContaining('module.exports')
      )
    })

    it('should handle errors during initialization', async () => {
      mockGitSetup.detectGitStatus.mockRejectedValue(new Error('Git detection failed'))

      await expect(runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true
      })).rejects.toThrow('Git detection failed')
    })
  })
})