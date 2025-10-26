import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { glob } from 'glob'
import { join, resolve } from 'path'

export interface MonorepoInfo {
  type: MonorepoType
  rootPath: string
  packageManager: PackageManager
  workspacePatterns: string[]
  packages: PackageInfo[]
  confidence: number
}

export interface PackageInfo {
  name: string
  path: string
  relativePath: string
  version: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  scripts: Record<string, string>
  isPrivate: boolean
}

export enum MonorepoType {
  LERNA = 'lerna',
  NX = 'nx',
  YARN_WORKSPACES = 'yarn-workspaces',
  PNPM_WORKSPACES = 'pnpm-workspaces',
  RUSH = 'rush',
  SINGLE_PACKAGE = 'single-package',
}

export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
}

export class MonorepoDetector {
  private rootPath: string

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = resolve(rootPath)
  }

  /**
   * Detect the monorepo type and gather information
   */
  async detect(): Promise<MonorepoInfo> {
    const detectionResults = await Promise.all([
      this.detectLerna(),
      this.detectNx(),
      this.detectYarnWorkspaces(),
      this.detectPnpmWorkspaces(),
      this.detectRush(),
    ])

    // Find the detection with highest confidence
    const bestMatch = detectionResults
      .filter((result) => (result.confidence || 0) > 0)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]

    if (!bestMatch) {
      return this.createSinglePackageInfo()
    }

    // Gather packages for the best match
    const packages = await this.gatherPackages(bestMatch.workspacePatterns || [])

    return {
      type: bestMatch.type || MonorepoType.SINGLE_PACKAGE,
      rootPath: bestMatch.rootPath || this.rootPath,
      packageManager: bestMatch.packageManager || this.detectPackageManager(),
      workspacePatterns: bestMatch.workspacePatterns || ['.'],
      packages,
      confidence: bestMatch.confidence || 0,
    }
  }

  /**
   * Detect Lerna monorepo
   */
  private async detectLerna(): Promise<Partial<MonorepoInfo>> {
    const lernaConfigPath = join(this.rootPath, 'lerna.json')

    if (!existsSync(lernaConfigPath)) {
      return { confidence: 0 }
    }

    try {
      const lernaConfig = JSON.parse(readFileSync(lernaConfigPath, 'utf-8'))
      const workspacePatterns = lernaConfig.packages || ['packages/*']

      return {
        type: MonorepoType.LERNA,
        rootPath: this.rootPath,
        workspacePatterns,
        confidence: 0.9,
      }
    } catch (error) {
      return { confidence: 0 }
    }
  }

  /**
   * Detect Nx monorepo
   */
  private async detectNx(): Promise<Partial<MonorepoInfo>> {
    const nxConfigPath = join(this.rootPath, 'nx.json')
    const workspaceConfigPath = join(this.rootPath, 'workspace.json')

    if (!existsSync(nxConfigPath) && !existsSync(workspaceConfigPath)) {
      return { confidence: 0 }
    }

    try {
      let workspacePatterns = ['apps/*', 'libs/*']

      // Try to read workspace patterns from nx.json
      if (existsSync(nxConfigPath)) {
        const nxConfig = JSON.parse(readFileSync(nxConfigPath, 'utf-8'))
        if (nxConfig.workspaceLayout) {
          workspacePatterns = [
            `${nxConfig.workspaceLayout.appsDir || 'apps'}/*`,
            `${nxConfig.workspaceLayout.libsDir || 'libs'}/*`,
          ]
        }
      }

      return {
        type: MonorepoType.NX,
        rootPath: this.rootPath,
        workspacePatterns,
        confidence: 0.9,
      }
    } catch (error) {
      return { confidence: 0 }
    }
  }

  /**
   * Detect Yarn Workspaces
   */
  private async detectYarnWorkspaces(): Promise<Partial<MonorepoInfo>> {
    const packageJsonPath = join(this.rootPath, 'package.json')

    if (!existsSync(packageJsonPath)) {
      return { confidence: 0 }
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

      if (!packageJson.workspaces) {
        return { confidence: 0 }
      }

      const workspacePatterns: string[] = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces
        : packageJson.workspaces.packages || []

      return {
        type: MonorepoType.YARN_WORKSPACES,
        rootPath: this.rootPath,
        workspacePatterns,
        confidence: 0.8,
      }
    } catch (error) {
      return { confidence: 0 }
    }
  }

  /**
   * Detect pnpm Workspaces
   */
  private async detectPnpmWorkspaces(): Promise<Partial<MonorepoInfo>> {
    const pnpmWorkspacePath = join(this.rootPath, 'pnpm-workspace.yaml')

    if (!existsSync(pnpmWorkspacePath)) {
      return { confidence: 0 }
    }

    try {
      const workspaceContent = readFileSync(pnpmWorkspacePath, 'utf-8')

      // Simple YAML parsing for packages array
      const packagesMatch = workspaceContent.match(/packages:\s*\n((?:\s*-\s*.+\n?)+)/)
      if (!packagesMatch) {
        return { confidence: 0 }
      }

      const workspacePatterns =
        packagesMatch?.[1]
          ?.split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('-'))
          .map((line) => line.substring(1).trim().replace(/['"]/g, ''))
          .filter(Boolean) || []

      return {
        type: MonorepoType.PNPM_WORKSPACES,
        rootPath: this.rootPath,
        workspacePatterns,
        confidence: 0.9,
      }
    } catch (error) {
      return { confidence: 0 }
    }
  }

  /**
   * Detect Rush monorepo
   */
  private async detectRush(): Promise<Partial<MonorepoInfo>> {
    const rushConfigPath = join(this.rootPath, 'rush.json')

    if (!existsSync(rushConfigPath)) {
      return { confidence: 0 }
    }

    try {
      const rushConfig = JSON.parse(readFileSync(rushConfigPath, 'utf-8'))

      if (!rushConfig.projects) {
        return { confidence: 0 }
      }

      // Extract unique directory patterns from project paths
      const projectPaths = rushConfig.projects.map((p: any) => p.projectFolder)
      const workspacePatterns: string[] = Array.from(
        new Set(
          projectPaths.map((path: string) => {
            const parts = path.split('/')
            return parts.length > 1 ? `${parts[0]}/*` : path
          })
        )
      )

      return {
        type: MonorepoType.RUSH,
        rootPath: this.rootPath,
        workspacePatterns,
        confidence: 0.9,
      }
    } catch (error) {
      return { confidence: 0 }
    }
  }

  /**
   * Create single package info when no monorepo is detected
   */
  private createSinglePackageInfo(): MonorepoInfo {
    const packageJsonPath = join(this.rootPath, 'package.json')
    let packageInfo: PackageInfo

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
        packageInfo = {
          name: packageJson.name || 'unknown',
          path: this.rootPath,
          relativePath: '.',
          version: packageJson.version || '0.0.0',
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          scripts: packageJson.scripts || {},
          isPrivate: packageJson.private || false,
        }
      } catch (error) {
        packageInfo = this.createDefaultPackageInfo()
      }
    } else {
      packageInfo = this.createDefaultPackageInfo()
    }

    return {
      type: MonorepoType.SINGLE_PACKAGE,
      rootPath: this.rootPath,
      packageManager: this.detectPackageManager(),
      workspacePatterns: ['.'],
      packages: [packageInfo],
      confidence: 1.0,
    }
  }

  /**
   * Create default package info
   */
  private createDefaultPackageInfo(): PackageInfo {
    return {
      name: 'unknown',
      path: this.rootPath,
      relativePath: '.',
      version: '0.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {},
      isPrivate: false,
    }
  }

  /**
   * Gather packages based on workspace patterns
   */
  private async gatherPackages(patterns: string[]): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = []

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: this.rootPath,
        })

        for (const match of matches) {
          const packagePath = join(this.rootPath, match)
          const packageJsonPath = join(packagePath, 'package.json')

          if (existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

              packages.push({
                name: packageJson.name || match,
                path: packagePath,
                relativePath: match,
                version: packageJson.version || '0.0.0',
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
                scripts: packageJson.scripts || {},
                isPrivate: packageJson.private || false,
              })
            } catch (error) {}
          }
        }
      } catch (error) {}
    }

    return packages
  }

  /**
   * Detect the package manager being used
   */
  private detectPackageManager(): PackageManager {
    // Check for lock files in order of preference
    if (existsSync(join(this.rootPath, 'bun.lockb'))) {
      return PackageManager.BUN
    }

    if (existsSync(join(this.rootPath, 'pnpm-lock.yaml'))) {
      return PackageManager.PNPM
    }

    if (existsSync(join(this.rootPath, 'yarn.lock'))) {
      return PackageManager.YARN
    }

    if (existsSync(join(this.rootPath, 'package-lock.json'))) {
      return PackageManager.NPM
    }

    // Default to npm if no lock file is found
    return PackageManager.NPM
  }

  /**
   * Get package manager command
   */
  getPackageManagerCommand(packageManager: PackageManager): string {
    const commands = {
      [PackageManager.NPM]: 'npm',
      [PackageManager.YARN]: 'yarn',
      [PackageManager.PNPM]: 'pnpm',
      [PackageManager.BUN]: 'bun',
    }

    return commands[packageManager]
  }
}
