/**
 * Test suite for Git setup and pre-flight checks
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createGitOperations } from '@g-1/util/node'
import { execa } from 'execa'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  autoFixAllIssues,
  createDefaultGitignore,
  createInitialCommit,
  detectGitStatus,
  initializeGitRepo,
  type PreFlightCheck,
  runPreFlightChecks,
} from '../core/git-setup.js'

// Mock external dependencies
vi.mock('@g-1/util/node', () => ({
  createGitOperations: vi.fn(() => ({
    isGitRepository: vi.fn(),
    getCurrentBranch: vi.fn(),
    hasUncommittedChanges: vi.fn(),
  })),
}))
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))
vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  isCancel: vi.fn(),
}))
vi.mock('execa', () => ({
  execa: vi.fn(),
}))

const mockExecSync = execSync as any
const mockExistsSync = existsSync as any
const mockReadFileSync = readFileSync as any
const mockWriteFileSync = writeFileSync as any
const mockExeca = execa as any
const mockCreateGitOperations = createGitOperations as any

describe('Git Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default git operations mock
    const mockGitOps = {
      isGitRepository: vi.fn().mockResolvedValue(true),
      getCurrentBranch: vi.fn().mockResolvedValue('main'),
      hasUncommittedChanges: vi.fn().mockResolvedValue(false),
    }
    mockCreateGitOperations.mockReturnValue(mockGitOps)

    // Setup default execa mock
    mockExeca.mockResolvedValue({ stdout: 'abc123 Initial commit' })
  })

  describe('detectGitStatus', () => {
    it('should detect initialized git repository', async () => {
      const mockGitOps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCurrentBranch: vi.fn().mockResolvedValue('main'),
        hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      }
      mockCreateGitOperations.mockReturnValue(mockGitOps)
      mockExeca.mockResolvedValue({ stdout: 'abc123 Initial commit' })

      const status = await detectGitStatus('/test/path')

      expect(status.hasGitRepo).toBe(true)
      expect(status.currentBranch).toBe('main')
      expect(status.hasCommits).toBe(true)
      expect(status.hasUncommittedChanges).toBe(false)
    })

    it('should detect non-git directory', async () => {
      const mockGitOps = {
        isGitRepository: vi.fn().mockResolvedValue(false),
        getCurrentBranch: vi.fn(),
        hasUncommittedChanges: vi.fn(),
      }
      mockCreateGitOperations.mockReturnValue(mockGitOps)

      const status = await detectGitStatus('/test/path')

      expect(status.hasGitRepo).toBe(false)
      expect(status.currentBranch).toBe(null)
      expect(status.hasCommits).toBe(false)
      expect(status.hasUncommittedChanges).toBe(false)
    })

    it('should detect git repository with remote and commits', async () => {
      const mockGitOps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCurrentBranch: vi.fn().mockResolvedValue('main'),
        hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      }
      mockCreateGitOperations.mockReturnValue(mockGitOps)
      mockExeca.mockResolvedValue({ stdout: 'abc123 Initial commit' })

      const status = await detectGitStatus('/test/path')

      expect(status.hasGitRepo).toBe(true)
      expect(status.currentBranch).toBe('main')
      expect(status.hasCommits).toBe(true)
    })

    it('should handle git command errors gracefully', async () => {
      const mockGitOps = {
        isGitRepository: vi.fn().mockRejectedValue(new Error('Git command failed')),
        getCurrentBranch: vi.fn(),
        hasUncommittedChanges: vi.fn(),
      }
      mockCreateGitOperations.mockReturnValue(mockGitOps)

      await expect(detectGitStatus('/test/path')).rejects.toThrow('Failed to detect git status')
    })
  })

  describe('initializeGitRepo', () => {
    it('should initialize git repository successfully', async () => {
      mockExeca.mockResolvedValue({ stdout: 'Initialized empty Git repository' })

      await initializeGitRepo()

      expect(mockExeca).toHaveBeenCalledWith('git', ['init'], expect.any(Object))
    })

    it('should handle git init failure', async () => {
      mockExeca.mockImplementation((cmd, args) => {
        if (args?.includes('init')) {
          throw new Error('Git init failed')
        }
        return Promise.resolve({ stdout: '' })
      })

      await expect(initializeGitRepo()).rejects.toThrow('Failed to initialize git repository')
    })
  })

  describe('createDefaultGitignore', () => {
    it('should create default .gitignore file', async () => {
      mockExistsSync.mockReturnValue(false)

      await createDefaultGitignore()

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '.gitignore',
        expect.stringContaining('node_modules/')
      )
    })

    it('should not create .gitignore if it already exists', async () => {
      mockExistsSync.mockReturnValue(true)

      await createDefaultGitignore()

      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })
  })

  describe('createInitialCommit', () => {
    it('should create initial commit successfully', async () => {
      mockExeca.mockResolvedValue({ stdout: '' })

      await createInitialCommit()

      expect(mockExeca).toHaveBeenCalledWith('git', ['add', '.'], expect.any(Object))
      expect(mockExeca).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'Initial commit: Project setup'],
        expect.any(Object)
      )
    })

    it('should handle commit failure', async () => {
      mockExeca.mockImplementation((cmd, args) => {
        if (args?.includes('commit')) {
          throw new Error('Nothing to commit')
        }
        return Promise.resolve({ stdout: '' })
      })

      await expect(createInitialCommit()).rejects.toThrow('Failed to create initial commit')
    })
  })

  describe('runPreFlightChecks', () => {
    it('should run all pre-flight checks successfully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync
        .mockReturnValueOnce(Buffer.from('main'))
        .mockReturnValueOnce(Buffer.from('origin'))
        .mockReturnValueOnce(Buffer.from('abc123 Initial commit'))
      mockReadFileSync.mockReturnValue('{"name": "test-package"}')

      const results = await runPreFlightChecks('/test/path')

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should detect missing git repository', async () => {
      const mockGitOps = {
        isGitRepository: vi.fn().mockResolvedValue(false),
        getCurrentBranch: vi.fn(),
        hasUncommittedChanges: vi.fn(),
      }
      mockCreateGitOperations.mockReturnValue(mockGitOps)

      const results = await runPreFlightChecks('/test/path')

      expect(Array.isArray(results)).toBe(true)
      const gitCheck = results.find((check) => check.name.includes('Git'))
      expect(gitCheck?.status).toBe('fail')
    })

    it('should detect missing initial commit', async () => {
      const mockGitOps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCurrentBranch: vi.fn().mockResolvedValue('main'),
        hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      }
      mockCreateGitOperations.mockReturnValue(mockGitOps)
      mockExeca.mockResolvedValue({ stdout: '' }) // empty git log (no commits)

      const results = await runPreFlightChecks('/test/path')

      expect(Array.isArray(results)).toBe(true)
      const commitCheck = results.find((check) => check.name.includes('Initial Commit'))
      expect(commitCheck?.status).toBe('fail')
    })
  })

  describe('autoFixAllIssues', () => {
    it('should auto-fix git repository initialization', async () => {
      const mockChecks: PreFlightCheck[] = [
        {
          name: 'Git Repository',
          status: 'fail',
          message: 'No git repository found',
          autoFixAvailable: true,
          autoFixAction: vi.fn().mockResolvedValue(undefined),
        },
      ]

      await autoFixAllIssues(mockChecks)

      expect(mockChecks[0].autoFixAction).toHaveBeenCalled()
    })

    it('should handle auto-fix failures gracefully', async () => {
      const mockChecks: PreFlightCheck[] = [
        {
          name: 'Git Repository',
          status: 'fail',
          message: 'No git repository found',
          autoFixAvailable: true,
          autoFixAction: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      ]

      await expect(autoFixAllIssues(mockChecks)).rejects.toThrow('Permission denied')
    })
  })
})
