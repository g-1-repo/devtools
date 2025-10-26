/**
 * Test suite for Git setup and pre-flight checks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  detectGitStatus,
  initializeGitRepository,
  createDefaultGitignore,
  createInitialCommit,
  runPreFlightChecks,
  autoFixAllIssues,
  type GitStatus,
  type PreFlightResult
} from '../core/git-setup.js'

// Mock external dependencies
vi.mock('node:child_process')
vi.mock('node:fs')
vi.mock('enquirer')

const mockExecSync = vi.mocked(execSync)
const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)

describe('Git Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectGitStatus', () => {
    it('should detect initialized git repository', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync.mockReturnValue(Buffer.from('main'))

      const status = await detectGitStatus('/test/path')

      expect(status.isGitRepository).toBe(true)
      expect(status.currentBranch).toBe('main')
      expect(status.hasRemote).toBe(false)
      expect(status.hasCommits).toBe(false)
    })

    it('should detect non-git directory', async () => {
      mockExistsSync.mockReturnValue(false)

      const status = await detectGitStatus('/test/path')

      expect(status.isGitRepository).toBe(false)
      expect(status.currentBranch).toBeNull()
      expect(status.hasRemote).toBe(false)
      expect(status.hasCommits).toBe(false)
    })

    it('should detect git repository with remote and commits', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync
        .mockReturnValueOnce(Buffer.from('main')) // branch
        .mockReturnValueOnce(Buffer.from('origin')) // remote
        .mockReturnValueOnce(Buffer.from('abc123 Initial commit')) // commits

      const status = await detectGitStatus('/test/path')

      expect(status.isGitRepository).toBe(true)
      expect(status.currentBranch).toBe('main')
      expect(status.hasRemote).toBe(true)
      expect(status.hasCommits).toBe(true)
    })

    it('should handle git command errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed')
      })

      const status = await detectGitStatus('/test/path')

      expect(status.isGitRepository).toBe(false)
      expect(status.error).toContain('Git command failed')
    })
  })

  describe('initializeGitRepository', () => {
    it('should initialize git repository successfully', async () => {
      mockExecSync.mockReturnValue(Buffer.from('Initialized empty Git repository'))

      const result = await initializeGitRepository('/test/path')

      expect(result.success).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith('git init', { cwd: '/test/path' })
    })

    it('should handle git init failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git init failed')
      })

      const result = await initializeGitRepository('/test/path')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Git init failed')
    })
  })

  describe('createDefaultGitignore', () => {
    it('should create default .gitignore file', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await createDefaultGitignore('/test/path')

      expect(result.success).toBe(true)
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        join('/test/path', '.gitignore'),
        expect.stringContaining('node_modules/')
      )
    })

    it('should not overwrite existing .gitignore', async () => {
      mockExistsSync.mockReturnValue(true)

      const result = await createDefaultGitignore('/test/path')

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })
  })

  describe('createInitialCommit', () => {
    it('should create initial commit successfully', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''))

      const result = await createInitialCommit('/test/path')

      expect(result.success).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith('git add .', { cwd: '/test/path' })
      expect(mockExecSync).toHaveBeenCalledWith(
        'git commit -m "Initial commit"',
        { cwd: '/test/path' }
      )
    })

    it('should handle commit failure', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd === 'git commit -m "Initial commit"') {
          throw new Error('Nothing to commit')
        }
        return Buffer.from('')
      })

      const result = await createInitialCommit('/test/path')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Nothing to commit')
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

      expect(results.gitRepository.status).toBe('success')
      expect(results.packageJson.status).toBe('success')
      expect(results.overall.status).toBe('success')
    })

    it('should detect missing git repository', async () => {
      mockExistsSync.mockReturnValue(false)

      const results = await runPreFlightChecks('/test/path')

      expect(results.gitRepository.status).toBe('error')
      expect(results.gitRepository.message).toContain('not a Git repository')
      expect(results.overall.status).toBe('error')
    })

    it('should detect missing package.json', async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path.toString().endsWith('.git')) return true
        if (path.toString().endsWith('package.json')) return false
        return true
      })
      mockExecSync.mockReturnValue(Buffer.from('main'))
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      const results = await runPreFlightChecks('/test/path')

      expect(results.packageJson.status).toBe('error')
      expect(results.packageJson.message).toContain('package.json not found')
      expect(results.overall.status).toBe('error')
    })
  })

  describe('autoFixAllIssues', () => {
    it('should auto-fix git repository initialization', async () => {
      mockExistsSync.mockReturnValue(false)
      mockExecSync.mockReturnValue(Buffer.from(''))

      const results = await autoFixAllIssues('/test/path')

      expect(results.gitInit.attempted).toBe(true)
      expect(results.gitInit.success).toBe(true)
    })

    it('should handle auto-fix failures gracefully', async () => {
      mockExistsSync.mockReturnValue(false)
      mockExecSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const results = await autoFixAllIssues('/test/path')

      expect(results.gitInit.attempted).toBe(true)
      expect(results.gitInit.success).toBe(false)
      expect(results.gitInit.error).toContain('Permission denied')
    })
  })
})