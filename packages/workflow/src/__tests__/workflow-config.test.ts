/**
 * Test suite for workflow configuration system
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadWorkflowConfig,
  mergeConfigWithFlags,
  validateConfig,
  type WorkflowConfig
} from '../config/workflow-config.js'

// Mock external dependencies
vi.mock('node:fs')
vi.mock('node:path')

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)
const mockJoin = vi.mocked(join)

describe('Workflow Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJoin.mockImplementation((...paths) => paths.join('/'))
  })

  describe('loadWorkflowConfig', () => {
    it('should load configuration from .workflow.config.js', async () => {
      const mockConfig = {
        git: { autoInit: true },
        release: { skipTests: false }
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`module.exports = ${JSON.stringify(mockConfig)}`)

      const config = await loadWorkflowConfig('/test/path')

      expect(config.git.autoInit).toBe(true)
      expect(config.release.skipTests).toBe(false)
    })

    it('should return default config when no config file exists', async () => {
      mockExistsSync.mockReturnValue(false)

      const config = await loadWorkflowConfig('/test/path')

      expect(config).toBeDefined()
      expect(config.git).toBeDefined()
      expect(config.release).toBeDefined()
      expect(config.errorHandling).toBeDefined()
    })

    it('should handle invalid config file gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid javascript')

      const config = await loadWorkflowConfig('/test/path')

      // Should fall back to default config
      expect(config).toBeDefined()
      expect(config.git).toBeDefined()
    })

    it('should load config from custom path', async () => {
      const customConfig = { git: { autoInit: false } }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`module.exports = ${JSON.stringify(customConfig)}`)

      const config = await loadWorkflowConfig('/test/path', '/custom/config.js')

      expect(config.git.autoInit).toBe(false)
    })
  })

  describe('mergeConfigs', () => {
    it('should merge two configurations deeply', () => {
      const base: Partial<WorkflowConfig> = {
        git: { autoInit: true, defaultBranch: 'main' },
        release: { skipTests: false }
      }

      const override: Partial<WorkflowConfig> = {
        git: { autoInit: false },
        errorHandling: { autoFix: true }
      }

      const merged = mergeConfigs(base, override)

      expect(merged.git.autoInit).toBe(false) // Overridden
      expect(merged.git.defaultBranch).toBe('main') // Preserved
      expect(merged.release.skipTests).toBe(false) // Preserved
      expect(merged.errorHandling.autoFix).toBe(true) // Added
    })

    it('should handle empty configurations', () => {
      const merged = mergeConfigs({}, {})
      expect(merged).toEqual({})
    })

    it('should handle null/undefined values', () => {
      const base = { git: { autoInit: true } }
      const override = { git: { autoInit: null } }

      const merged = mergeConfigs(base, override as any)
      expect(merged.git.autoInit).toBeNull()
    })
  })

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig: WorkflowConfig = {
        git: {
          autoInit: true,
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
      }

      const result = validateConfig(validConfig)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validConfig)
    })

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        git: {
          autoInit: 'not-boolean', // Should be boolean
          defaultBranch: 123 // Should be string
        },
        release: {
          versionBumpType: 'invalid' // Should be patch|minor|major
        }
      }

      const result = validateConfig(invalidConfig as any)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle partial configurations', () => {
      const partialConfig = {
        git: { autoInit: true }
      }

      const result = validateConfig(partialConfig as any)
      expect(result.success).toBe(false) // Missing required fields
    })
  })

  describe('createDefaultConfig', () => {
    it('should create valid default configuration', () => {
      const defaultConfig = createDefaultConfig()

      expect(defaultConfig.git).toBeDefined()
      expect(defaultConfig.release).toBeDefined()
      expect(defaultConfig.errorHandling).toBeDefined()
      expect(defaultConfig.cli).toBeDefined()
      expect(defaultConfig.hooks).toBeDefined()

      // Validate that default config is valid
      const validation = validateConfig(defaultConfig)
      expect(validation.success).toBe(true)
    })

    it('should have sensible defaults', () => {
      const config = createDefaultConfig()

      expect(config.git.autoInit).toBe(false)
      expect(config.git.defaultBranch).toBe('main')
      expect(config.release.skipTests).toBe(false)
      expect(config.errorHandling.autoFix).toBe(false)
      expect(config.cli.colorOutput).toBe(true)
    })
  })

  describe('mergeConfigWithFlags', () => {
    it('should merge CLI flags with configuration', () => {
      const config = createDefaultConfig()
      const flags = {
        autoFix: true,
        skipTests: true,
        verbose: true,
        logLevel: 'debug' as const
      }

      const merged = mergeConfigWithFlags(config, flags)

      expect(merged.errorHandling.autoFix).toBe(true)
      expect(merged.release.skipTests).toBe(true)
      expect(merged.cli.verbose).toBe(true)
      expect(merged.cli.logLevel).toBe('debug')
    })

    it('should handle empty flags', () => {
      const config = createDefaultConfig()
      const merged = mergeConfigWithFlags(config, {})

      expect(merged).toEqual(config)
    })

    it('should prioritize flags over config', () => {
      const config = createDefaultConfig()
      config.errorHandling.autoFix = false
      config.release.skipTests = false

      const flags = {
        autoFix: true,
        skipTests: true
      }

      const merged = mergeConfigWithFlags(config, flags)

      expect(merged.errorHandling.autoFix).toBe(true)
      expect(merged.release.skipTests).toBe(true)
    })

    it('should handle boolean flag variations', () => {
      const config = createDefaultConfig()
      const flags = {
        interactive: false, // Should set to false
        color: false // Should set colorOutput to false
      }

      const merged = mergeConfigWithFlags(config, flags)

      expect(merged.errorHandling.interactive).toBe(false)
      expect(merged.cli.colorOutput).toBe(false)
    })
  })

  describe('configuration file formats', () => {
    it('should handle CommonJS export format', async () => {
      const config = { git: { autoInit: true } }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`module.exports = ${JSON.stringify(config)}`)

      const loaded = await loadWorkflowConfig('/test/path')
      expect(loaded.git.autoInit).toBe(true)
    })

    it('should handle object export format', async () => {
      const config = { git: { autoInit: true } }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`exports.default = ${JSON.stringify(config)}`)

      const loaded = await loadWorkflowConfig('/test/path')
      expect(loaded.git.autoInit).toBe(true)
    })

    it('should handle function export format', async () => {
      mockExistsSync.mockReturnValue(true)
      mockJoin.mockReturnValue('/test/path/.workflow.config.js')

      // Mock the dynamic import to return a function
      vi.doMock('/test/path/.workflow.config.js', () => ({
        default: () => ({ git: { autoInit: true } })
      }))

      const loaded = await loadWorkflowConfig('/test/path')
      expect(loaded.git.autoInit).toBe(true)

      vi.doUnmock('/test/path/.workflow.config.js')
    })
  })
})