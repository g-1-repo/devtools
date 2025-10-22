/**
 * Simplified GitStore test suite
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { GitStore } from '../core/git-store.js'

describe('gitStore', () => {
  let gitStore: GitStore

  beforeEach(() => {
    gitStore = new GitStore()
  })

  describe('constructor', () => {
    it('should create GitStore with default working directory', () => {
      const store = new GitStore()
      expect(store).toBeInstanceOf(GitStore)
    })

    it('should create GitStore with custom working directory', () => {
      const customDir = '/custom/path'
      const store = new GitStore(customDir)
      expect(store).toBeInstanceOf(GitStore)
    })
  })

  describe('workflow-specific methods', () => {
    it('should have getCurrentVersionFromGit method', () => {
      expect(typeof gitStore.getCurrentVersionFromGit).toBe('function')
    })

    it('should return version string', async () => {
      // This will fallback to 0.0.0 since no git setup
      const version = await gitStore.getCurrentVersionFromGit()
      expect(typeof version).toBe('string')
      expect(version).toMatch(/^\d+\.\d+\.\d+$/) // Should be semver format
    })

    it('should have basic workflow methods', () => {
      expect(typeof gitStore.getCurrentVersionFromGit).toBe('function')
    })
  })

  describe('basic functionality', () => {
    it('should be a functional GitStore instance', () => {
      expect(gitStore).toBeDefined()
      expect(['GitStore', 'MockGitStore']).toContain(gitStore.constructor.name)
    })
  })
})
