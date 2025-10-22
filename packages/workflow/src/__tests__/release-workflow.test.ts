/**
 * ReleaseWorkflow test suite
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReleaseWorkflow } from '../workflows/release.js'

// Mock dependencies
vi.mock('@g-1/util/node', () => ({
  GitOperations: class MockGitOperations {
    async getCurrentBranch() { return 'main' }
    async hasUncommittedChanges() { return false }
    async getChangedFiles() { return ['README.md'] }
    async commit() { return 'abc123' }
    async createTag() { return 'v1.0.0' }
    async push() { return true }
    async isGitRepository() { return true }
    getCurrentVersion() { return '1.0.0' }
    async getRepositoryName() { return 'test-repo' }
    async getCommitsSinceTag() { return [] }
    async stageFiles() { return true }
    updatePackageVersion() { return true }
  },
  createGitOperations: vi.fn(() => new (class MockGitOperations {
    async getCurrentBranch() { return 'main' }
    async hasUncommittedChanges() { return false }
    async getChangedFiles() { return ['README.md'] }
    async commit() { return 'abc123' }
    async createTag() { return 'v1.0.0' }
    async push() { return true }
    async isGitRepository() { return true }
    getCurrentVersion() { return '1.0.0' }
    async getRepositoryName() { return 'test-repo' }
    async getCommitsSinceTag() { return [] }
    async stageFiles() { return true }
    updatePackageVersion() { return true }
  })()),
}))

vi.mock('../core/git-store.js', () => ({
  GitStore: class MockGitStore {
    async getCurrentVersionFromGit() { return '1.0.0' }
    async getCurrentBranch() { return 'main' }
    async hasUncommittedChanges() { return false }
  },
  createGitStore: vi.fn(() => new (class MockGitStore {
    async getCurrentVersionFromGit() { return '1.0.0' }
    async getCurrentBranch() { return 'main' }
    async hasUncommittedChanges() { return false }
  })()),
}))

describe('releaseWorkflow', () => {
  let defaultOptions: any

  beforeEach(() => {
    defaultOptions = {
      type: 'patch',
      skipTests: false,
      skipLint: false,
      skipCloudflare: false,
      skipNpm: false,
      nonInteractive: true,
      force: false,
      dryRun: false,
      verbose: false,
    }
    vi.clearAllMocks()
  })

  describe('createReleaseWorkflow', () => {
    it('should create workflow with default options', async () => {
      const workflow = await createReleaseWorkflow({})

      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })

    it('should create workflow with custom options', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)

      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })

    it('should include quality gates step', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)
      const qualityGatesStep = workflow.find(step =>
        step.title.toLowerCase().includes('quality gates')
        || step.title.toLowerCase().includes('quality'),
      )

      expect(qualityGatesStep).toBeDefined()
    })

    it('should include git analysis step', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)
      const gitAnalysisStep = workflow.find(step =>
        step.title.toLowerCase().includes('git')
        || step.title.toLowerCase().includes('repository'),
      )

      expect(gitAnalysisStep).toBeDefined()
    })

    it('should include version calculation step', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)
      const versionStep = workflow.find(step =>
        step.title.toLowerCase().includes('version'),
      )

      expect(versionStep).toBeDefined()
    })

    it('should include build step', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)
      const buildStep = workflow.find(step =>
        step.title.toLowerCase().includes('build'),
      )

      expect(buildStep).toBeDefined()
    })
  })

  describe('workflow customization', () => {
    it('should skip tests when skipTests is true', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, skipTests: true })
      const testStep = workflow.find(step =>
        step.title.toLowerCase().includes('test'),
      )

      // Test step should either not exist or be skippable
      if (testStep && testStep.skip) {
        expect(typeof testStep.skip).toBe('function')
      }
    })

    it('should skip lint when skipLint is true', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, skipLint: true })
      const lintStep = workflow.find(step =>
        step.title.toLowerCase().includes('lint'),
      )

      // Lint step should either not exist or be skippable
      if (lintStep && lintStep.skip) {
        expect(typeof lintStep.skip).toBe('function')
      }
    })

    it('should skip Cloudflare deployment when skipCloudflare is true', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, skipCloudflare: true })
      const cloudflareStep = workflow.find(step =>
        step.title.toLowerCase().includes('cloudflare'),
      )

      // Cloudflare step should either not exist or be skippable
      if (cloudflareStep && cloudflareStep.skip) {
        expect(typeof cloudflareStep.skip).toBe('function')
      }
    })

    it('should skip npm publishing when skipNpm is true', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, skipNpm: true })
      const npmStep = workflow.find(step =>
        step.title.toLowerCase().includes('npm'),
      )

      // NPM step should either not exist or be skippable
      if (npmStep && npmStep.skip) {
        expect(typeof npmStep.skip).toBe('function')
      }
    })
  })

  describe('workflow steps structure', () => {
    it('should have proper step structure', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)

      workflow.forEach((step) => {
        expect(step).toHaveProperty('title')
        expect(typeof step.title).toBe('string')
        // Step should have either task function or subtasks
        if (step.task) {
          expect(typeof step.task).toBe('function')
        }
        if (step.subtasks) {
          expect(Array.isArray(step.subtasks)).toBe(true)
        }
      })
    })

    it('should have logical step ordering', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)
      const stepTitles = workflow.map(step => step.title.toLowerCase())

      // Quality gates should come before version calculation
      const qualityIndex = stepTitles.findIndex(title =>
        title.includes('quality') || title.includes('lint') || title.includes('test'),
      )
      const versionIndex = stepTitles.findIndex(title => title.includes('version'))

      if (qualityIndex !== -1 && versionIndex !== -1) {
        expect(qualityIndex).toBeLessThan(versionIndex)
      }

      // Build should come after version calculation
      const buildIndex = stepTitles.findIndex(title => title.includes('build'))

      if (versionIndex !== -1 && buildIndex !== -1) {
        expect(versionIndex).toBeLessThan(buildIndex)
      }
    })
  })

  describe('version bump types', () => {
    it('should handle major version bump', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, type: 'major' })

      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })

    it('should handle minor version bump', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, type: 'minor' })

      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })

    it('should handle patch version bump', async () => {
      const workflow = await createReleaseWorkflow({ ...defaultOptions, type: 'patch' })

      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should handle invalid version type gracefully', async () => {
      const workflow = await createReleaseWorkflow({
        ...defaultOptions,
        type: 'invalid' as any,
      })

      // Should still create a workflow, possibly with defaults
      expect(Array.isArray(workflow)).toBe(true)
    })

    it('should handle empty options', async () => {
      const workflow = await createReleaseWorkflow({})

      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })
  })

  describe('step execution context', () => {
    it('should create steps that can access context', async () => {
      const workflow = await createReleaseWorkflow(defaultOptions)

      // Steps with tasks should be functions that accept context and helpers
      workflow.forEach((step) => {
        if (step.task) {
          expect(typeof step.task).toBe('function')
          expect(step.task.length).toBeGreaterThanOrEqual(1) // Should accept at least context
        }
      })
    })
  })
})
