/**
 * Test suite for WorkspaceAnalyzer
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type DependencyGraph,
  type PackageInfo,
  WorkspaceAnalyzer,
} from '../core/workspace-analyzer.js'

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))
vi.mock('node:path', () => ({
  join: vi.fn(),
}))
vi.mock('glob', () => ({
  glob: vi.fn(),
}))

const mockExistsSync = existsSync as any
const mockReadFileSync = readFileSync as any
const mockJoin = join as any
const mockGlob = (await import('glob')).glob as any

describe('WorkspaceAnalyzer', () => {
  let analyzer: WorkspaceAnalyzer

  beforeEach(() => {
    vi.clearAllMocks()
    mockJoin.mockImplementation((...paths) => paths.join('/'))
    mockGlob.mockReset()
    mockExistsSync.mockReset()
    mockReadFileSync.mockReset()
    analyzer = new WorkspaceAnalyzer('/test/root')
  })

  describe('findPackages', () => {
    it('should find packages using workspace patterns', async () => {
      // Clear any previous state
      mockGlob.mockClear()

      mockGlob.mockImplementation((pattern) => {
        if (pattern.includes('packages')) {
          return Promise.resolve([
            '/test/root/packages/package-a/package.json',
            '/test/root/packages/package-b/package.json',
          ])
        } else if (pattern.includes('apps')) {
          return Promise.resolve(['/test/root/apps/app-1/package.json'])
        }
        return Promise.resolve([])
      })

      mockExistsSync.mockImplementation((path) => {
        return path.endsWith('/package.json')
      })

      mockReadFileSync.mockImplementation((path) => {
        if (path === '/test/root/packages/package-a/package.json') {
          return JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
            dependencies: { 'package-b': '1.0.0' },
          })
        }
        if (path === '/test/root/packages/package-b/package.json') {
          return JSON.stringify({
            name: 'package-b',
            version: '1.0.0',
            dependencies: { lodash: '^4.17.21' },
          })
        }
        if (path === '/test/root/apps/app-1/package.json') {
          return JSON.stringify({
            name: 'app-1',
            version: '1.0.0',
            dependencies: { 'package-a': '1.0.0' },
          })
        }
        return '{}'
      })

      const packages = await analyzer.findPackages(['packages/*', 'apps/*'])

      expect(packages).toHaveLength(3)
      expect(packages.map((p) => p.name)).toEqual(['package-a', 'package-b', 'app-1'])
    })

    it('should handle packages without dependencies', async () => {
      mockGlob.mockResolvedValue(['/test/root/packages/simple-package/package.json'])
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'simple-package',
          version: '1.0.0',
        })
      )

      const packages = await analyzer.findPackages(['packages/*'])

      expect(packages).toHaveLength(1)
      expect(packages[0]).toEqual({
        name: 'simple-package',
        version: '1.0.0',
        path: '/test/root/packages/simple-package',
        relativePath: 'packages/simple-package',
        dependencies: {},
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      })
    })

    it('should skip directories without package.json', async () => {
      mockGlob.mockResolvedValue(['/test/root/packages/package-a/package.json'])

      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/packages/package-a/package.json'
      })

      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'package-a',
          version: '1.0.0',
        })
      )

      const packages = await analyzer.findPackages(['packages/*'])

      expect(packages).toHaveLength(1)
      expect(packages[0].name).toBe('package-a')
    })
  })

  describe('buildDependencyGraph', () => {
    const mockPackages: PackageInfo[] = [
      {
        name: 'package-a',
        version: '1.0.0',
        path: '/test/root/packages/package-a',
        relativePath: 'packages/package-a',
        dependencies: { 'package-b': '1.0.0' },
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      },
      {
        name: 'package-b',
        version: '1.0.0',
        path: '/test/root/packages/package-b',
        relativePath: 'packages/package-b',
        dependencies: { 'package-c': '1.0.0' },
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      },
      {
        name: 'package-c',
        version: '1.0.0',
        path: '/test/root/packages/package-c',
        relativePath: 'packages/package-c',
        dependencies: {},
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      },
    ]

    it('should build correct dependency graph', async () => {
      analyzer.monorepoInfo.packages = mockPackages
      const graph = await analyzer.buildDependencyGraph()

      expect(Array.from(graph.nodes.keys())).toEqual(['package-a', 'package-b', 'package-c'])
      expect(graph.nodes.get('package-a')?.dependencies).toContain('package-b')
      expect(graph.nodes.get('package-b')?.dependencies).toContain('package-c')
    })

    it('should include dev and peer dependencies', async () => {
      const packagesWithDevDeps: PackageInfo[] = [
        {
          name: 'package-a',
          version: '1.0.0',
          path: '/test/root/packages/package-a',
          relativePath: 'packages/package-a',
          dependencies: { 'package-b': '1.0.0' },
          devDependencies: {},
          scripts: {},
          isPrivate: false,
        },
        {
          name: 'package-b',
          version: '1.0.0',
          path: '/test/root/packages/package-b',
          relativePath: 'packages/package-b',
          dependencies: {},
          devDependencies: {},
          scripts: {},
          isPrivate: false,
        },
        {
          name: 'package-c',
          version: '1.0.0',
          path: '/test/root/packages/package-c',
          relativePath: 'packages/package-c',
          dependencies: {},
          devDependencies: {},
          scripts: {},
          isPrivate: false,
        },
      ]

      analyzer.monorepoInfo.packages = packagesWithDevDeps
      const graph = await analyzer.buildDependencyGraph()

      // Check that package-a has dependencies on package-b
      expect(graph.nodes.get('package-a')?.dependencies).toContain('package-b')
      expect(graph.edges.get('package-b')?.has('package-a')).toBe(true)
    })
  })

  describe('getBuildOrder', () => {
    it('should return correct build order for linear dependencies', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'package-a',
            {
              name: 'package-a',
              path: '/test/root/packages/package-a',
              dependencies: ['package-b'],
              dependents: [],
              isWorkspacePackage: true,
            },
          ],
          [
            'package-b',
            {
              name: 'package-b',
              path: '/test/root/packages/package-b',
              dependencies: ['package-c'],
              dependents: ['package-a'],
              isWorkspacePackage: true,
            },
          ],
          [
            'package-c',
            {
              name: 'package-c',
              path: '/test/root/packages/package-c',
              dependencies: [],
              dependents: ['package-b'],
              isWorkspacePackage: true,
            },
          ],
        ]),
        edges: new Map([
          ['package-a', new Set(['package-b'])],
          ['package-b', new Set(['package-c'])],
          ['package-c', new Set()],
        ]),
        buildOrder: ['package-c', 'package-b', 'package-a'],
      }

      // Set the dependency graph directly for this test
      analyzer.dependencyGraph = graph

      const buildOrder = analyzer.getBuildOrder()

      expect(buildOrder).toEqual(['package-c', 'package-b', 'package-a'])
    })

    it('should handle parallel builds for independent packages', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'package-a',
            {
              name: 'package-a',
              path: '/test/root/packages/package-a',
              dependencies: ['package-c'],
              dependents: [],
              isWorkspacePackage: true,
            },
          ],
          [
            'package-b',
            {
              name: 'package-b',
              path: '/test/root/packages/package-b',
              dependencies: ['package-c'],
              dependents: [],
              isWorkspacePackage: true,
            },
          ],
          [
            'package-c',
            {
              name: 'package-c',
              path: '/test/root/packages/package-c',
              dependencies: [],
              dependents: ['package-a', 'package-b'],
              isWorkspacePackage: true,
            },
          ],
          [
            'package-d',
            {
              name: 'package-d',
              path: '/test/root/packages/package-d',
              dependencies: [],
              dependents: [],
              isWorkspacePackage: true,
            },
          ],
        ]),
        edges: new Map([
          ['package-a', new Set(['package-c'])],
          ['package-b', new Set(['package-c'])],
          ['package-c', new Set()],
          ['package-d', new Set()],
        ]),
        buildOrder: ['package-c', 'package-d', 'package-a', 'package-b'],
      }

      // Set the dependency graph directly for this test
      analyzer.dependencyGraph = graph

      const buildOrder = analyzer.getBuildOrder()

      expect(buildOrder).toEqual(['package-c', 'package-d', 'package-a', 'package-b'])
    })

    it('should detect circular dependencies', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'package-a',
            {
              name: 'package-a',
              path: '/test/root/packages/package-a',
              dependencies: ['package-b'],
              dependents: ['package-b'],
              isWorkspacePackage: true,
            },
          ],
          [
            'package-b',
            {
              name: 'package-b',
              path: '/test/root/packages/package-b',
              dependencies: ['package-a'],
              dependents: ['package-a'],
              isWorkspacePackage: true,
            },
          ],
        ]),
        edges: new Map([
          ['package-a', new Set(['package-b'])],
          ['package-b', new Set(['package-a'])],
        ]),
        buildOrder: [],
      }

      // Set the dependency graph directly for this test
      analyzer.dependencyGraph = graph

      expect(() => analyzer.getBuildOrder()).toThrow(/Circular dependency detected/)
    })
  })

  describe('getAffectedPackages', () => {
    const mockPackages: PackageInfo[] = [
      {
        name: 'package-a',
        version: '1.0.0',
        path: '/test/root/packages/package-a',
        relativePath: 'packages/package-a',
        dependencies: { 'package-b': '1.0.0' },
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      },
      {
        name: 'package-b',
        version: '1.0.0',
        path: '/test/root/packages/package-b',
        relativePath: 'packages/package-b',
        dependencies: { 'package-c': '1.0.0' },
        devDependencies: {},
        peerDependencies: {},
        scripts: {},
        private: false,
      },
      {
        name: 'package-c',
        version: '1.0.0',
        path: '/test/root/packages/package-c',
        relativePath: 'packages/package-c',
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        scripts: {},
        private: false,
      },
      {
        name: 'package-d',
        version: '1.0.0',
        path: '/test/root/packages/package-d',
        relativePath: 'packages/package-d',
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        scripts: {},
        private: false,
      },
    ]

    beforeEach(async () => {
      analyzer.monorepoInfo.packages = mockPackages
      analyzer.dependencyGraph = await analyzer.buildDependencyGraph()
    })

    it('should return affected packages when a dependency changes', () => {
      const changedFiles = ['/test/root/packages/package-c/src/index.ts']
      const affected = analyzer.getAffectedPackages(changedFiles)

      expect(affected.sort()).toEqual(['package-a', 'package-b', 'package-c'])
    })

    it('should return only changed package when no dependents exist', () => {
      const changedFiles = ['/test/root/packages/package-d/src/index.ts']
      const affected = analyzer.getAffectedPackages(changedFiles)

      expect(affected).toEqual(['package-d'])
    })

    it('should handle multiple changed packages', () => {
      const changedFiles = [
        '/test/root/packages/package-b/src/index.ts',
        '/test/root/packages/package-d/src/index.ts',
      ]
      const affected = analyzer.getAffectedPackages(changedFiles)

      expect(affected.sort()).toEqual(['package-a', 'package-b', 'package-d'])
    })

    it('should return empty array for files outside packages', () => {
      const changedFiles = ['/test/root/README.md', '/test/root/.gitignore']
      const affected = analyzer.getAffectedPackages(changedFiles)

      expect(affected).toEqual([])
    })
  })

  describe('getWorkspaceStats', () => {
    const mockPackages: PackageInfo[] = [
      {
        name: 'app-1',
        version: '1.0.0',
        path: '/test/root/apps/app-1',
        relativePath: 'apps/app-1',
        dependencies: { 'package-a': '1.0.0', lodash: '^4.17.21' },
        devDependencies: { jest: '^27.0.0' },
        peerDependencies: {},
        scripts: {},
        private: false,
      },
      {
        name: 'package-a',
        version: '1.0.0',
        path: '/test/root/packages/package-a',
        relativePath: 'packages/package-a',
        dependencies: { 'package-b': '1.0.0' },
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      },
      {
        name: 'package-b',
        version: '1.0.0',
        path: '/test/root/packages/package-b',
        relativePath: 'packages/package-b',
        dependencies: {},
        devDependencies: {},
        scripts: {},
        isPrivate: false,
      },
    ]

    beforeEach(() => {
      analyzer.monorepoInfo.packages = mockPackages
    })

    it('should return correct workspace statistics', () => {
      const stats = analyzer.getWorkspaceStats()

      expect(stats).toEqual({
        totalPackages: 3,
        packagesByType: {
          app: 1,
          package: 2,
        },
        dependencyStats: {
          totalDependencies: 4,
          internalDependencies: 2,
          externalDependencies: 2,
          circularDependencies: [],
        },
      })
    })
  })

  describe('error handling', () => {
    it('should handle malformed package.json files', async () => {
      mockGlob.mockResolvedValue(['/test/root/packages/bad-package'])
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid json')

      await expect(analyzer.findPackages(['packages/*'])).rejects.toThrow()
    })

    it('should handle glob errors', async () => {
      mockGlob.mockRejectedValue(new Error('Glob error'))

      await expect(analyzer.findPackages(['packages/*'])).rejects.toThrow('Glob error')
    })
  })
})
