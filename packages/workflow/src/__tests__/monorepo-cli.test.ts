/**
 * Test suite for Monorepo CLI Commands
 */

import type { Command } from 'commander'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMonorepoCommand } from '../cli/monorepo.js'
import { loadWorkflowConfig } from '../config/workflow-config.js'
import { MonorepoManager } from '../core/monorepo-manager.js'

// Mock dependencies
vi.mock('../core/monorepo-manager.js', () => ({
  MonorepoManager: vi.fn(),
}))
vi.mock('../config/workflow-config.js', () => ({
  loadWorkflowConfig: vi.fn(),
}))
vi.mock('@clack/prompts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    confirm: vi.fn(),
    select: vi.fn(),
    multiselect: vi.fn(),
    isCancel: vi.fn(),
    outro: vi.fn(),
  }
})

const mockMonorepoManager = MonorepoManager as any
const mockLoadWorkflowConfig = loadWorkflowConfig as any

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

describe('Monorepo CLI Commands', () => {
  let command: Command
  let mockManagerInstance: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset console and process mocks
    mockConsoleLog.mockClear()
    mockProcessExit.mockClear()

    // Mock manager instance
    mockManagerInstance = {
      initialize: vi.fn(),
      getMonorepoInfo: vi.fn(),
      getPackages: vi.fn(),
      getAffectedPackages: vi.fn(),
      getBuildOrder: vi.fn(),
      getWorkspaceStats: vi.fn(),
      build: vi.fn(),
      test: vi.fn(),
      deploy: vi.fn(),
      run: vi.fn(),
      validate: vi.fn(),
    }
    mockMonorepoManager.mockImplementation(() => mockManagerInstance)

    // Mock config loading
    mockLoadWorkflowConfig.mockResolvedValue({
      monorepo: {
        enabled: true,
        type: 'auto',
        packageManager: 'auto',
        workspacePatterns: ['packages/*'],
        ignorePatterns: ['**/node_modules/**'],
        selectiveOperations: {
          enabled: true,
          since: 'HEAD~1',
          parallel: true,
          maxParallel: 4,
        },
        dependencyAnalysis: {
          enabled: true,
          includeDevDependencies: false,
          includePeerDependencies: true,
        },
        buildOrder: {
          respectDependencies: true,
          parallel: true,
        },
        packageFilters: {
          includePrivate: false,
          scope: [],
          ignore: [],
        },
      },
    } as any)

    command = createMonorepoCommand()
  })

  describe('detect command', () => {
    it('should detect monorepo successfully', async () => {
      mockManagerInstance.getMonorepoInfo.mockReturnValue({
        type: 'lerna',
        packageManager: 'npm',
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: ['package-a', 'package-b'],
      })

      // Execute detect command
      await command.parseAsync(['detect'], { from: 'user' })

      expect(mockManagerInstance.initialize).toHaveBeenCalled()
      expect(mockManagerInstance.getMonorepoInfo).toHaveBeenCalled()
    })

    it('should handle detection failure', async () => {
      mockManagerInstance.getMonorepoInfo.mockReturnValue(null)

      await command.parseAsync(['detect'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle initialization errors', async () => {
      mockManagerInstance.initialize.mockRejectedValue(new Error('Init error'))

      await command.parseAsync(['detect'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe('status command', () => {
    it('should show status successfully', async () => {
      mockManagerInstance.getWorkspaceStats.mockResolvedValue({
        totalPackages: 3,
        packagesByType: { app: 1, package: 2 },
        dependencyStats: {
          totalDependencies: 5,
          internalDependencies: 2,
          externalDependencies: 3,
          circularDependencies: [],
        },
      })

      mockManagerInstance.validate.mockResolvedValue({
        valid: true,
        issues: [],
        warnings: [],
      })

      await command.parseAsync(['status'], { from: 'user' })

      expect(mockManagerInstance.initialize).toHaveBeenCalled()
      expect(mockManagerInstance.getWorkspaceStats).toHaveBeenCalled()
      expect(mockManagerInstance.validate).toHaveBeenCalled()
    })

    it('should show validation issues', async () => {
      mockManagerInstance.getWorkspaceStats.mockResolvedValue({
        totalPackages: 2,
        packagesByType: { package: 2 },
        dependencyStats: {
          totalDependencies: 2,
          internalDependencies: 2,
          externalDependencies: 0,
          circularDependencies: ['package-a -> package-b -> package-a'],
        },
      })

      mockManagerInstance.validate.mockResolvedValue({
        valid: false,
        issues: ['Circular dependency detected'],
        warnings: ['Missing peer dependency'],
      })

      await command.parseAsync(['status'], { from: 'user' })

      expect(mockManagerInstance.validate).toHaveBeenCalled()
    })
  })

  describe('list command', () => {
    it('should list packages in text format', async () => {
      mockManagerInstance.getPackages.mockResolvedValue(['package-a', 'package-b', 'app-1'])

      await command.parseAsync(['list'], { from: 'user' })

      expect(mockManagerInstance.initialize).toHaveBeenCalled()
      expect(mockManagerInstance.getPackages).toHaveBeenCalled()
    })

    it('should list packages in JSON format', async () => {
      mockManagerInstance.getPackages.mockResolvedValue(['package-a', 'package-b'])

      await command.parseAsync(['list', '--json'], { from: 'user' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify(['package-a', 'package-b'], null, 2)
      )
    })

    it('should handle empty package list', async () => {
      mockManagerInstance.getPackages.mockResolvedValue([])

      await command.parseAsync(['list'], { from: 'user' })

      expect(mockManagerInstance.getPackages).toHaveBeenCalled()
    })
  })

  describe('build command', () => {
    it('should execute build successfully', async () => {
      mockManagerInstance.build.mockResolvedValue({
        success: true,
        affectedPackages: ['package-a', 'package-b'],
        duration: 5000,
        errors: [],
      })

      await command.parseAsync(['build'], { from: 'user' })

      expect(mockManagerInstance.initialize).toHaveBeenCalled()
      expect(mockManagerInstance.build).toHaveBeenCalledWith({
        since: undefined,
        scope: undefined,
        ignore: undefined,
        parallel: undefined,
        force: undefined,
        dryRun: undefined,
        verbose: undefined,
      })
    })

    it('should handle build failure', async () => {
      mockManagerInstance.build.mockResolvedValue({
        success: false,
        affectedPackages: [],
        duration: 1000,
        errors: ['Build failed for package-a'],
      })

      await command.parseAsync(['build'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should pass build options correctly', async () => {
      mockManagerInstance.build.mockResolvedValue({
        success: true,
        affectedPackages: ['package-a'],
        duration: 2000,
        errors: [],
      })

      await command.parseAsync(
        ['build', '--since', 'HEAD~2', '--scope', 'package-a', '--parallel', '--dry-run'],
        { from: 'user' }
      )

      expect(mockManagerInstance.build).toHaveBeenCalledWith({
        since: 'HEAD~2',
        scope: ['package-a'],
        ignore: undefined,
        parallel: true,
        force: undefined,
        dryRun: true,
        verbose: undefined,
      })
    })
  })

  describe('test command', () => {
    it('should execute tests successfully', async () => {
      mockManagerInstance.test.mockResolvedValue({
        success: true,
        affectedPackages: ['package-a'],
        duration: 3000,
        errors: [],
      })

      await command.parseAsync(['test'], { from: 'user' })

      expect(mockManagerInstance.test).toHaveBeenCalled()
    })

    it('should handle test failure', async () => {
      mockManagerInstance.test.mockResolvedValue({
        success: false,
        affectedPackages: ['package-a'],
        duration: 2000,
        errors: ['Test failed in package-a'],
      })

      await command.parseAsync(['test'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe('deploy command', () => {
    it('should deploy to production by default', async () => {
      mockManagerInstance.deploy.mockResolvedValue({
        success: true,
        affectedPackages: ['app-1'],
        duration: 10000,
        errors: [],
      })

      await command.parseAsync(['deploy'], { from: 'user' })

      expect(mockManagerInstance.deploy).toHaveBeenCalledWith('production', expect.any(Object))
    })

    it('should deploy to specified target', async () => {
      mockManagerInstance.deploy.mockResolvedValue({
        success: true,
        affectedPackages: ['app-1'],
        duration: 8000,
        errors: [],
      })

      await command.parseAsync(['deploy', 'staging'], { from: 'user' })

      expect(mockManagerInstance.deploy).toHaveBeenCalledWith('staging', expect.any(Object))
    })
  })

  describe('run command', () => {
    it('should run script on packages', async () => {
      mockManagerInstance.run.mockResolvedValue({
        success: true,
        affectedPackages: ['package-a', 'package-b'],
        duration: 4000,
        errors: [],
      })

      await command.parseAsync(['run', 'lint'], { from: 'user' })

      expect(mockManagerInstance.run).toHaveBeenCalledWith('lint', expect.any(Object))
    })

    it('should handle script execution failure', async () => {
      mockManagerInstance.run.mockResolvedValue({
        success: false,
        affectedPackages: ['package-a'],
        duration: 1000,
        errors: ['Script failed'],
      })

      await command.parseAsync(['run', 'build'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe('affected command', () => {
    it('should show affected packages in text format', async () => {
      mockManagerInstance.getAffectedPackages.mockResolvedValue(['package-a', 'package-b'])

      await command.parseAsync(['affected'], { from: 'user' })

      expect(mockManagerInstance.getAffectedPackages).toHaveBeenCalled()
    })

    it('should show affected packages in JSON format', async () => {
      mockManagerInstance.getAffectedPackages.mockResolvedValue(['package-a'])

      await command.parseAsync(['affected', '--json'], { from: 'user' })

      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(['package-a'], null, 2))
    })
  })

  describe('graph command', () => {
    it('should show dependency graph in text format', async () => {
      mockManagerInstance.getBuildOrder.mockResolvedValue([
        ['package-c'],
        ['package-b'],
        ['package-a'],
      ])

      await command.parseAsync(['graph'], { from: 'user' })

      expect(mockManagerInstance.getBuildOrder).toHaveBeenCalled()
    })

    it('should show dependency graph in JSON format', async () => {
      const buildOrder = [['package-c'], ['package-b'], ['package-a']]
      mockManagerInstance.getBuildOrder.mockResolvedValue(buildOrder)

      await command.parseAsync(['graph', '--format', 'json'], { from: 'user' })

      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(buildOrder, null, 2))
    })
  })

  describe('validate command', () => {
    it('should validate successfully', async () => {
      mockManagerInstance.validate.mockResolvedValue({
        valid: true,
        issues: [],
        warnings: [],
      })

      await command.parseAsync(['validate'], { from: 'user' })

      expect(mockManagerInstance.validate).toHaveBeenCalled()
    })

    it('should handle validation failure', async () => {
      mockManagerInstance.validate.mockResolvedValue({
        valid: false,
        issues: ['Circular dependency detected'],
        warnings: [],
      })

      await command.parseAsync(['validate'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe('error handling', () => {
    it('should handle manager initialization errors', async () => {
      mockManagerInstance.initialize.mockRejectedValue(new Error('Manager error'))

      await command.parseAsync(['detect'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle config loading errors', async () => {
      mockLoadWorkflowConfig.mockRejectedValue(new Error('Config error'))

      await command.parseAsync(['status'], { from: 'user' })

      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })
})
