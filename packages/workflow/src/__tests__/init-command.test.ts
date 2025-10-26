/**
 * Test suite for init command functionality
 */

import { existsSync, writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runInitCommand } from '../cli/init.js'
import * as workflowConfig from '../config/workflow-config.js'
import * as gitSetup from '../core/git-setup.js'

// Mock external dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
}))
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
vi.mock('../core/git-setup.js', () => ({
  detectGitStatus: vi.fn(),
  initializeGitRepo: vi.fn(),
  createInitialCommit: vi.fn(),
  runPreFlightChecks: vi.fn(),
  displayPreFlightResults: vi.fn(),
  autoFixAllIssues: vi.fn(),
  interactiveFixIssues: vi.fn(),
}))
vi.mock('../config/workflow-config.js', () => ({
  createDefaultConfigFile: vi.fn(),
  hasConfigFile: vi.fn(),
}))

// Mock process.exit to prevent actual exit during tests
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

const mockExistsSync = existsSync as any
const mockWriteFileSync = writeFileSync as any
const mockGitSetup = gitSetup as any
const mockWorkflowConfig = workflowConfig as any

describe('Init Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Setup default mocks
    mockGitSetup.detectGitStatus.mockResolvedValue({
      hasGitRepo: false,
      currentBranch: null,
      hasCommits: false,
      hasUncommittedChanges: false,
      gitRoot: process.cwd(),
    })

    mockGitSetup.runPreFlightChecks.mockResolvedValue([
      {
        name: 'Git Repository',
        status: 'pass',
        message: 'Git repository found',
        autoFixAvailable: false,
      },
      {
        name: 'Package.json',
        status: 'pass',
        message: 'package.json found',
        autoFixAvailable: false,
      },
    ])

    mockGitSetup.autoFixAllIssues.mockResolvedValue(undefined)

    mockWorkflowConfig.createDefaultConfigFile.mockReturnValue(undefined)
    mockWorkflowConfig.hasConfigFile.mockReturnValue(false)
  })

  describe('runInitCommand', () => {
    it('should initialize Git repository and create config', async () => {
      mockExistsSync.mockReturnValue(false) // No existing files

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true,
      })

      expect(mockGitSetup.detectGitStatus).toHaveBeenCalled()
      expect(mockGitSetup.runPreFlightChecks).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Workflow initialization completed')
      )
    })

    it('should skip Git initialization when skipGit is true', async () => {
      mockExistsSync.mockReturnValue(true)
      mockWorkflowConfig.hasConfigFile.mockReturnValue(true)
      mockGitSetup.detectGitStatus.mockResolvedValue({
        hasGitRepo: true,
        hasCommits: true,
        hasUncommittedChanges: false,
        currentBranch: 'main',
      })
      mockGitSetup.runPreFlightChecks.mockResolvedValue([])

      await runInitCommand({
        skipGit: true,
        skipConfig: false,
        nonInteractive: true,
      })

      expect(mockGitSetup.initializeGitRepo).not.toHaveBeenCalled()
      expect(mockGitSetup.createInitialCommit).not.toHaveBeenCalled()
    })

    it('should skip config creation when skipConfig is true', async () => {
      mockExistsSync.mockReturnValue(true)
      mockWorkflowConfig.hasConfigFile.mockReturnValue(false)
      mockGitSetup.detectGitStatus.mockResolvedValue({
        hasGitRepo: true,
        hasCommits: true,
        hasUncommittedChanges: false,
        currentBranch: 'main',
      })
      mockGitSetup.runPreFlightChecks.mockResolvedValue([])

      await runInitCommand({
        skipGit: false,
        skipConfig: true,
        nonInteractive: true,
      })

      expect(mockWorkflowConfig.createDefaultConfigFile).not.toHaveBeenCalled()
    })

    it('should auto-fix issues when autoFix is enabled', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWorkflowConfig.hasConfigFile.mockReturnValue(false)
      mockGitSetup.detectGitStatus.mockResolvedValue({
        hasGitRepo: false,
        hasCommits: false,
        hasUncommittedChanges: false,
        currentBranch: null,
      })
      mockGitSetup.runPreFlightChecks.mockResolvedValue([])

      await runInitCommand({
        force: false,
        autoFix: true,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true,
      })

      expect(mockGitSetup.initializeGitRepo).toHaveBeenCalled()
      expect(mockWorkflowConfig.createDefaultConfigFile).toHaveBeenCalled()
    })

    it('should skip creating configuration if it already exists', async () => {
      mockExistsSync.mockReturnValue(true)
      mockWorkflowConfig.hasConfigFile.mockReturnValue(true)
      mockGitSetup.detectGitStatus.mockResolvedValue({
        hasGitRepo: true,
        hasCommits: true,
        hasUncommittedChanges: false,
        currentBranch: 'main',
      })
      mockGitSetup.runPreFlightChecks.mockResolvedValue([])

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true,
      })

      expect(mockWriteFileSync).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Workflow initialization completed successfully')
      )
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
        nonInteractive: true,
      })

      expect(mockWorkflowConfig.createDefaultConfigFile).toHaveBeenCalled()
    })

    it('should handle Git repository that already exists', async () => {
      mockGitSetup.detectGitStatus.mockResolvedValue({
        isGitRepository: true,
        currentBranch: 'main',
        hasRemote: true,
        hasCommits: true,
        hasUncommittedChanges: false,
        error: null,
      })

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true,
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Workflow initialization completed successfully')
      )
    })

    it('should handle pre-flight check failures', async () => {
      mockExistsSync.mockReturnValue(true)
      mockWorkflowConfig.hasConfigFile.mockReturnValue(true)
      mockGitSetup.detectGitStatus.mockResolvedValue({
        hasGitRepo: true,
        hasCommits: true,
        hasUncommittedChanges: false,
        currentBranch: 'main',
      })
      mockGitSetup.runPreFlightChecks.mockResolvedValue([
        {
          name: 'Test Check',
          status: 'fail',
          message: 'Test failure',
          autoFixAvailable: false,
        },
      ])

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: true,
        skipConfig: true,
        nonInteractive: true,
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Initialization completed with some issues')
      )
    })

    it('should handle auto-fix failures gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockGitSetup.detectGitStatus.mockResolvedValue({
        hasGitRepo: false,
        hasCommits: false,
        hasUncommittedChanges: false,
        currentBranch: null,
      })

      mockGitSetup.initializeGitRepo.mockRejectedValue(new Error('Permission denied'))

      await expect(
        runInitCommand({
          force: false,
          autoFix: true,
          skipGit: false,
          skipConfig: false,
          nonInteractive: true,
        })
      ).rejects.toThrow('process.exit called')
    })

    it('should create configuration file with proper content', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWorkflowConfig.hasConfigFile.mockReturnValue(false)

      await runInitCommand({
        force: false,
        autoFix: false,
        skipGit: false,
        skipConfig: false,
        nonInteractive: true,
      })

      expect(mockWorkflowConfig.createDefaultConfigFile).toHaveBeenCalled()
    })

    it('should handle errors during initialization', async () => {
      mockGitSetup.detectGitStatus.mockRejectedValue(new Error('Git detection failed'))

      await expect(
        runInitCommand({
          force: false,
          autoFix: false,
          skipGit: false,
          skipConfig: false,
          nonInteractive: true,
        })
      ).rejects.toThrow('process.exit called')
    })
  })
})
