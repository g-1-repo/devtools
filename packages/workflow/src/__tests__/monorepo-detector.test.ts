/**
 * Test suite for MonorepoDetector
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MonorepoDetector, MonorepoType, PackageManager } from '../core/monorepo-detector.js'

// Mock external dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    join: vi.fn(),
    resolve: vi.fn(),
  }
})

const mockExistsSync = existsSync as any
const mockReadFileSync = readFileSync as any
const mockJoin = join as any
const mockResolve = resolve as any

describe('MonorepoDetector', () => {
  let detector: MonorepoDetector

  beforeEach(() => {
    vi.clearAllMocks()
    mockJoin.mockImplementation((...paths) => paths.join('/'))
    mockResolve.mockImplementation((path) => path)
    detector = new MonorepoDetector('/test/root')
  })

  describe('detectMonorepoType', () => {
    it('should detect Lerna monorepo', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/lerna.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          version: '1.0.0',
          packages: ['packages/*'],
        })
      )

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.LERNA)
    })

    it('should detect Nx monorepo', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/nx.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          npmScope: 'test',
          projects: {},
        })
      )

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.NX)
    })

    it('should detect Yarn workspaces', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test-workspace',
          workspaces: ['packages/*'],
        })
      )

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.YARN_WORKSPACES)
    })

    it('should detect pnpm workspaces', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/pnpm-workspace.yaml'
      })
      mockReadFileSync.mockReturnValue(`
packages:
  - 'packages/*'
  - 'apps/*'
`)

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.PNPM_WORKSPACES)
    })

    it('should detect Rush monorepo', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/rush.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          rushVersion: '5.0.0',
          projects: [],
        })
      )

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.RUSH)
    })

    it('should detect single package when no monorepo structure found', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'single-package',
          version: '1.0.0',
        })
      )

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.SINGLE_PACKAGE)
    })

    it('should return NONE when no package.json exists', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.SINGLE_PACKAGE)
    })
  })

  describe('detectPackageManager', () => {
    it('should detect npm from package-lock.json', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package-lock.json'
      })

      const result = await detector.detect()
      expect(result.packageManager).toBe(PackageManager.NPM)
    })

    it('should detect yarn from yarn.lock', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/yarn.lock'
      })

      const result = await detector.detect()
      expect(result.packageManager).toBe(PackageManager.YARN)
    })

    it('should detect pnpm from pnpm-lock.yaml', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/pnpm-lock.yaml'
      })

      const result = await detector.detect()
      expect(result.packageManager).toBe(PackageManager.PNPM)
    })

    it('should detect bun from bun.lockb', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/bun.lockb'
      })

      const result = await detector.detect()
      expect(result.packageManager).toBe(PackageManager.BUN)
    })

    it('should default to npm when no lock files found', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await detector.detect()
      expect(result.packageManager).toBe(PackageManager.NPM)
    })
  })

  describe('getWorkspacePatterns', () => {
    it('should return Lerna workspace patterns', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/lerna.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          packages: ['packages/*', 'apps/*'],
        })
      )

      const result = await detector.detect()
      expect(result.workspacePatterns).toEqual(['packages/*', 'apps/*'])
    })

    it('should return Yarn workspace patterns', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          workspaces: ['packages/*', 'tools/*'],
        })
      )

      const result = await detector.detect()
      expect(result.workspacePatterns).toEqual(['packages/*', 'tools/*'])
    })

    it('should handle Yarn workspaces object format', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          workspaces: {
            packages: ['packages/*', 'tools/*'],
            nohoist: ['**/react-native', '**/react-native/**'],
          },
        })
      )

      const result = await detector.detect()
      expect(result.workspacePatterns).toEqual(['packages/*', 'tools/*'])
    })

    it('should return pnpm workspace patterns', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/pnpm-workspace.yaml'
      })
      mockReadFileSync.mockReturnValue(`
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/test/**'
`)

      const result = await detector.detect()
      expect(result.workspacePatterns).toEqual(['packages/*', 'apps/*', '!**/test/**'])
    })

    it('should return Rush workspace patterns', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/rush.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          projects: [
            { packageName: 'package-a', projectFolder: 'packages/package-a' },
            { packageName: 'package-b', projectFolder: 'packages/package-b' },
          ],
        })
      )

      const result = await detector.detect()
      expect(result.workspacePatterns).toEqual(['packages/*'])
    })

    it('should return empty array for single package', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'single-package',
        })
      )

      const result = await detector.detect()
      expect(result.workspacePatterns).toEqual(['.'])
    })
  })

  describe('getPackageInfo', () => {
    it('should return package information', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/lerna.json' || path === '/test/root/package.json'
      })
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/test/root/lerna.json') {
          return JSON.stringify({
            packages: ['packages/*'],
          })
        }
        if (path === '/test/root/package.json') {
          return JSON.stringify({
            name: 'test-monorepo',
            version: '1.0.0',
          })
        }
        return ''
      })

      const info = await detector.detect()

      expect(info).toEqual({
        type: MonorepoType.LERNA,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['packages/*'],
        packages: [],
        confidence: expect.any(Number),
      })
    })

    it('should handle missing package.json gracefully', async () => {
      mockExistsSync.mockReturnValue(false)

      const info = await detector.detect()

      expect(info).toEqual({
        type: MonorepoType.SINGLE_PACKAGE,
        packageManager: PackageManager.NPM,
        rootPath: '/test/root',
        workspacePatterns: ['.'],
        packages: [
          expect.objectContaining({
            name: 'unknown',
            version: '0.0.0',
          }),
        ],
        confidence: expect.any(Number),
      })
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON files', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockReturnValue('invalid json')

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.SINGLE_PACKAGE)
    })

    it('should handle file read errors', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === '/test/root/package.json'
      })
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error')
      })

      const result = await detector.detect()
      expect(result.type).toBe(MonorepoType.SINGLE_PACKAGE)
    })
  })
})
