/**
 * Test suite for MonorepoManager
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonorepoConfig } from '../config/workflow-config.js'
import { MonorepoDetector, MonorepoType, PackageManager } from '../core/monorepo-detector.js'
import { MonorepoManager } from '../core/monorepo-manager.js'
import { PackageManagerAdapterFactory } from '../core/package-manager-adapters.js'
import { SelectiveOperations } from '../core/selective-operations.js'
import { WorkspaceAnalyzer } from '../core/workspace-analyzer.js'

// Mock all dependencies
vi.mock('../core/monorepo-detector.js', () => ({
  MonorepoDetector: vi.fn(),
  MonorepoType: {
    LERNA: 'lerna',
    NX: 'nx',
    YARN_WORKSPACES: 'yarn-workspaces',
    PNPM_WORKSPACES: 'pnpm-workspaces',
    RUSH: 'rush',
    SINGLE_PACKAGE: 'single-package',
  },
  PackageManager: {
    NPM: 'npm',
    YARN: 'yarn',
    PNPM: 'pnpm',
    BUN: 'bun',
  },
}))
vi.mock('../core/workspace-analyzer.js', () => ({
  WorkspaceAnalyzer: vi.fn(),
}))
vi.mock('../core/package-manager-adapters.js', () => ({
  PackageManagerAdapterFactory: vi.fn(),
}))
vi.mock('../core/selective-operations.js', () => ({
  SelectiveOperations: vi.fn(),
}))

const mockMonorepoDetector = MonorepoDetector as any
const mockWorkspaceAnalyzer = WorkspaceAnalyzer as any
const mockPackageManagerAdapterFactory = PackageManagerAdapterFactory as any
const mockSelectiveOperations = SelectiveOperations as any

describe('MonorepoManager', () => {
  let manager: MonorepoManager
  let mockConfig: MonorepoConfig
  let mockDetectorInstance: any
  let mockAnalyzerInstance: any
  let mockAdapterInstance: any
  let mockSelectiveOpsInstance: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockConfig = {
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
        allowCircular: false,
      },
      packageFilters: {
        includePrivate: false,
        scope: [],
        ignore: [],
      },
    }

    // Mock detector instance
    mockDetectorInstance = {
      detect: vi.fn(),
    }
    mockMonorepoDetector.mockImplementation(() => mockDetectorInstance)

    // Mock analyzer instance
    mockAnalyzerInstance = {
      findPackages: vi.fn(),
      buildDependencyGraph: vi.fn(),
      getBuildOrder: vi.fn(),
      getParallelBuildGroups: vi.fn(),
      getAffectedPackages: vi.fn(),
      getWorkspaceStats: vi.fn(),
      detectCircularDependencies: vi.fn(),
    }
    mockWorkspaceAnalyzer.mockImplementation(() => mockAnalyzerInstance)

    // Mock adapter instance
    mockAdapterInstance = {
      install: vi.fn(),
      build: vi.fn(),
      test: vi.fn(),
      run: vi.fn(),
      getWorkspacePackages: vi.fn(),
      getPackageInfo: vi.fn(),
    }
    mockPackageManagerAdapterFactory.create = vi.fn().mockReturnValue(mockAdapterInstance)

    // Mock selective operations instance
    mockSelectiveOpsInstance = {
      selectiveBuild: vi.fn(),
      selectiveTest: vi.fn(),
      selectiveDeploy: vi.fn(),
      selectiveRun: vi.fn(),
    }
    mockSelectiveOperations.mockImplementation(() => mockSelectiveOpsInstance)

    manager = new MonorepoManager({
      rootPath: '/test/root',
      config: mockConfig,
      verbose: false,
    })
  })

  describe('initialization', () => {
    it('should initialize successfully with valid monorepo', async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: ['package-a', 'package-b'],
        confidence: 0.9,
      })

      await manager.initialize()

      expect(mockDetectorInstance.detect).toHaveBeenCalled()
      expect(mockPackageManagerAdapterFactory.create).toHaveBeenCalledWith(
        'auto',
        'auto',
        '/test/root'
      )
      expect(mockSelectiveOperations).toHaveBeenCalled()
    })

    it('should throw error when monorepo is not detected', async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.SINGLE_PACKAGE,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: [],
        packages: [],
        confidence: 0.1,
      })

      await expect(manager.initialize()).resolves.toBeUndefined()
    })

    it('should throw error when monorepo is disabled in config', async () => {
      const disabledConfig = { ...mockConfig, enabled: false }
      manager = new MonorepoManager({
        rootPath: '/test/root',
        config: disabledConfig,
        verbose: false,
      })

      await expect(manager.initialize()).rejects.toThrow(
        'Monorepo support is not enabled in configuration'
      )
    })
  })

  describe('package operations', () => {
    beforeEach(async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: [],
        confidence: 0.9,
      })

      mockAdapterInstance.getWorkspacePackages.mockResolvedValue(['package-a', 'package-b'])

      await manager.initialize()
    })

    it('should return package list', async () => {
      const packages = await manager.getPackages()
      expect(packages).toEqual(['package-a', 'package-b'])
    })

    it('should return affected packages', async () => {
      mockSelectiveOpsInstance.selectiveBuild.mockResolvedValue({
        success: true,
        affectedPackages: ['package-a'],
        executedCommands: [],
      })

      const affected = await manager.getAffectedPackages()
      expect(affected).toEqual(['package-a'])
    })

    it('should return build order', async () => {
      mockAnalyzerInstance.getParallelBuildGroups.mockResolvedValue([['package-b'], ['package-a']])

      const order = await manager.getBuildOrder()
      expect(order).toEqual([['package-b'], ['package-a']])
    })

    it('should return workspace stats', async () => {
      const mockDependencyGraph = {
        nodes: new Map(),
        edges: new Map(),
      }
      mockAnalyzerInstance.buildDependencyGraph.mockResolvedValue(mockDependencyGraph)
      mockAnalyzerInstance.detectCircularDependencies.mockResolvedValue([])
      mockAdapterInstance.getPackageInfo.mockResolvedValue({
        name: 'package-a',
        version: '1.0.0',
        isPrivate: false,
      })

      const stats = await manager.getWorkspaceStats()
      expect(stats).toEqual({
        totalPackages: 2,
        packagesByType: { public: 2 },
        dependencyStats: {
          totalDependencies: 0,
          internalDependencies: 0,
          externalDependencies: 0,
          circularDependencies: [],
        },
      })
    })
  })

  describe('selective operations', () => {
    beforeEach(async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: ['package-a', 'package-b'],
        confidence: 0.9,
      })

      mockAnalyzerInstance.findPackages.mockResolvedValue([
        { name: 'package-a', version: '1.0.0', path: '/test/root/packages/package-a' },
        { name: 'package-b', version: '1.0.0', path: '/test/root/packages/package-b' },
      ])

      mockAnalyzerInstance.buildDependencyGraph.mockReturnValue({
        nodes: ['package-a', 'package-b'],
        edges: [],
      })

      await manager.initialize()
    })

    it('should execute selective build', async () => {
      const mockResult = {
        success: true,
        affectedPackages: ['package-a'],
        executedCommands: [],
        duration: 1000,
        errors: [],
      }
      mockSelectiveOpsInstance.selectiveBuild.mockResolvedValue(mockResult)

      const result = await manager.build({ since: 'HEAD~1' })

      expect(mockSelectiveOpsInstance.selectiveBuild).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('should execute selective test', async () => {
      const mockResult = {
        success: true,
        affectedPackages: ['package-a'],
        executedCommands: [],
        duration: 2000,
        errors: [],
      }
      mockSelectiveOpsInstance.selectiveTest.mockResolvedValue(mockResult)

      const result = await manager.test({ parallel: true })

      expect(mockSelectiveOpsInstance.selectiveTest).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('should execute selective deploy', async () => {
      const mockResult = {
        success: true,
        affectedPackages: ['package-a'],
        executedCommands: [],
        duration: 3000,
        errors: [],
      }
      mockSelectiveOpsInstance.selectiveDeploy.mockResolvedValue(mockResult)

      const result = await manager.deploy('production', { force: true })

      expect(mockSelectiveOpsInstance.selectiveDeploy).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('should execute selective run', async () => {
      const mockResult = {
        success: true,
        affectedPackages: ['package-a', 'package-b'],
        executedCommands: [],
        duration: 1500,
        errors: [],
      }
      mockSelectiveOpsInstance.selectiveRun.mockResolvedValue(mockResult)

      const result = await manager.run('lint', { scope: ['package-a'] })

      expect(mockSelectiveOpsInstance.selectiveRun).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })
  })

  describe('validation', () => {
    beforeEach(async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: [],
        confidence: 0.9,
      })

      mockAdapterInstance.getWorkspacePackages.mockResolvedValue(['package-a', 'package-b'])

      mockAnalyzerInstance.detectCircularDependencies.mockResolvedValue([])

      await manager.initialize()
    })

    it('should validate successfully with no issues', async () => {
      mockAdapterInstance.getPackageInfo.mockResolvedValue({
        name: 'package-a',
        version: '1.0.0',
        path: '/test/root/packages/package-a',
      })

      const result = await manager.validate()

      expect(result).toEqual({
        valid: true,
        issues: [],
        warnings: [],
      })
    })

    it('should detect circular dependencies', async () => {
      mockAnalyzerInstance.detectCircularDependencies.mockResolvedValue([
        ['package-a', 'package-b', 'package-a'],
      ])

      mockAdapterInstance.getPackageInfo.mockResolvedValue({
        name: 'package-a',
        version: '1.0.0',
        path: '/test/root/packages/package-a',
      })

      const result = await manager.validate()

      expect(result.valid).toBe(false)
      expect(result.issues).toContain(
        'Circular dependencies detected: package-a -> package-b -> package-a'
      )
    })

    it('should warn about missing packages', async () => {
      mockAdapterInstance.getWorkspacePackages.mockResolvedValue([])

      const result = await manager.validate()

      expect(result.issues).toContain('No packages found in workspace')
    })
  })

  describe('error handling', () => {
    it('should handle detector initialization errors', async () => {
      mockDetectorInstance.detect.mockRejectedValue(new Error('Detector error'))

      await expect(manager.initialize()).rejects.toThrow('Detector error')
    })

    it('should handle analyzer errors', async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: [],
        confidence: 0.9,
      })

      mockPackageManagerAdapterFactory.create.mockImplementation(() => {
        throw new Error('Analyzer error')
      })

      await expect(manager.initialize()).rejects.toThrow('Analyzer error')
    })

    it('should handle adapter creation errors', async () => {
      mockDetectorInstance.detect.mockResolvedValue({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: [],
        confidence: 0.9,
      })

      mockAnalyzerInstance.findPackages.mockResolvedValue([])
      mockPackageManagerAdapterFactory.create.mockImplementation(() => {
        throw new Error('Adapter error')
      })

      await expect(manager.initialize()).rejects.toThrow('Adapter error')
    })
  })

  describe('getMonorepoInfo', () => {
    it('should return null when not initialized', () => {
      const info = manager.getMonorepoInfo()
      expect(info).toBeNull()
    })

    it('should return monorepo info when initialized', async () => {
      const mockInfo = {
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: ['package-a', 'package-b'],
        confidence: 0.9,
      }

      mockDetectorInstance.detect.mockResolvedValue(mockInfo)
      mockAnalyzerInstance.findPackages.mockResolvedValue([])
      mockAnalyzerInstance.buildDependencyGraph.mockReturnValue({ nodes: [], edges: [] })

      await manager.initialize()

      const info = manager.getMonorepoInfo()
      expect(info).toEqual(mockInfo)
    })
  })
})
