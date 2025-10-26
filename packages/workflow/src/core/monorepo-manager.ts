import type { MonorepoConfig } from '../config/workflow-config'
import { MonorepoDetector, type MonorepoInfo } from './monorepo-detector'
import {
  type PackageManagerAdapter,
  PackageManagerAdapterFactory,
} from './package-manager-adapters'
import {
  type OperationResult,
  type SelectiveOperationOptions,
  SelectiveOperations,
} from './selective-operations'
import { WorkspaceAnalyzer } from './workspace-analyzer'

export interface MonorepoManagerOptions {
  rootPath: string
  config: MonorepoConfig
  verbose?: boolean
}

export class MonorepoManager {
  private detector: MonorepoDetector
  private analyzer: WorkspaceAnalyzer
  private adapter: PackageManagerAdapter | null = null
  private selectiveOps: SelectiveOperations | null = null
  private monorepoInfo: MonorepoInfo | null = null

  constructor(private options: MonorepoManagerOptions) {
    this.detector = new MonorepoDetector(options.rootPath)
    this.analyzer = new WorkspaceAnalyzer(options.rootPath)
  }

  /**
   * Initialize the monorepo manager
   */
  async initialize(): Promise<void> {
    if (!this.options.config.enabled) {
      throw new Error('Monorepo support is not enabled in configuration')
    }

    // Detect monorepo structure
    this.monorepoInfo = await this.detector.detect()

    if (this.options.verbose) {
      console.log('Detected monorepo structure:', this.monorepoInfo)
    }

    // Override detected values with config if specified
    if (this.options.config.type) {
      this.monorepoInfo.type = this.options.config.type as any
    }
    if (this.options.config.packageManager) {
      this.monorepoInfo.packageManager = this.options.config.packageManager as any
    }

    // Create package manager adapter
    this.adapter = PackageManagerAdapterFactory.create(
      this.monorepoInfo.type,
      this.monorepoInfo.packageManager,
      this.options.rootPath
    )

    // Create selective operations handler
    this.selectiveOps = new SelectiveOperations(this.analyzer, this.adapter, this.options.rootPath)
  }

  /**
   * Get monorepo information
   */
  getMonorepoInfo(): MonorepoInfo | null {
    return this.monorepoInfo
  }

  /**
   * Get workspace packages
   */
  async getPackages(): Promise<string[]> {
    this.ensureInitialized()
    return await this.adapter!.getWorkspacePackages()
  }

  /**
   * Get package information
   */
  async getPackageInfo(packageName: string): Promise<any> {
    this.ensureInitialized()
    return await this.adapter!.getPackageInfo(packageName)
  }

  /**
   * Get affected packages based on changes
   */
  async getAffectedPackages(changedFiles?: string[]): Promise<string[]> {
    this.ensureInitialized()

    if (changedFiles) {
      return await this.analyzer.getAffectedPackages(changedFiles)
    }

    // Use selective operations to determine affected packages
    const options: SelectiveOperationOptions = {
      since: this.options.config.selectiveOperations.since,
      scope: this.options.config.packageFilters.scope,
      ignore: this.options.config.packageFilters.ignore,
      force: this.options.config.selectiveOperations.forceAll,
    }

    const result = await this.selectiveOps!.selectiveBuild({ ...options, dryRun: true })
    return result.affectedPackages
  }

  /**
   * Get build order for packages
   */
  async getBuildOrder(packages?: string[]): Promise<string[][]> {
    this.ensureInitialized()

    return this.analyzer.getParallelBuildGroups()
  }

  /**
   * Install dependencies
   */
  async install(options: { frozen?: boolean; production?: boolean } = {}): Promise<void> {
    this.ensureInitialized()

    if (this.options.verbose) {
      console.log('Installing dependencies...')
    }

    await this.adapter!.install({
      frozen: options.frozen,
      production: options.production,
      cwd: this.options.rootPath,
    })
  }

  /**
   * Build packages selectively
   */
  async build(options: SelectiveOperationOptions = {}): Promise<OperationResult> {
    this.ensureInitialized()

    const buildOptions = this.mergeWithConfigOptions(options)

    if (this.options.verbose) {
      console.log('Starting selective build with options:', buildOptions)
    }

    return await this.selectiveOps!.selectiveBuild(buildOptions)
  }

  /**
   * Test packages selectively
   */
  async test(options: SelectiveOperationOptions = {}): Promise<OperationResult> {
    this.ensureInitialized()

    const testOptions = this.mergeWithConfigOptions(options)

    if (this.options.verbose) {
      console.log('Starting selective test with options:', testOptions)
    }

    return await this.selectiveOps!.selectiveTest(testOptions)
  }

  /**
   * Deploy packages selectively
   */
  async deploy(
    deploymentTarget: string,
    options: SelectiveOperationOptions = {}
  ): Promise<OperationResult> {
    this.ensureInitialized()

    const deployOptions = this.mergeWithConfigOptions(options)

    if (this.options.verbose) {
      console.log(
        `Starting selective deployment to ${deploymentTarget} with options:`,
        deployOptions
      )
    }

    return await this.selectiveOps!.selectiveDeploy(deploymentTarget, deployOptions)
  }

  /**
   * Run custom script on packages selectively
   */
  async run(script: string, options: SelectiveOperationOptions = {}): Promise<OperationResult> {
    this.ensureInitialized()

    const runOptions = this.mergeWithConfigOptions(options)

    if (this.options.verbose) {
      console.log(`Running script "${script}" with options:`, runOptions)
    }

    return await this.selectiveOps!.selectiveRun(script, runOptions)
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(): Promise<{
    totalPackages: number
    packagesByType: Record<string, number>
    dependencyStats: {
      totalDependencies: number
      internalDependencies: number
      externalDependencies: number
      circularDependencies: string[][]
    }
  }> {
    this.ensureInitialized()

    const packages = await this.getPackages()
    const dependencyGraph = await this.analyzer.buildDependencyGraph()

    // Analyze package types
    const packagesByType: Record<string, number> = {}
    for (const packageName of packages) {
      const packageInfo = await this.getPackageInfo(packageName)
      const type = packageInfo?.private ? 'private' : 'public'
      packagesByType[type] = (packagesByType[type] || 0) + 1
    }

    // Analyze dependencies
    let totalDependencies = 0
    let internalDependencies = 0
    let externalDependencies = 0

    for (const [, deps] of dependencyGraph.edges.entries()) {
      totalDependencies += deps.size
      for (const dep of deps) {
        if (packages.includes(dep)) {
          internalDependencies++
        } else {
          externalDependencies++
        }
      }
    }

    // Detect circular dependencies - simplified implementation
    const circularDependencies: string[][] = []

    return {
      totalPackages: packages.length,
      packagesByType,
      dependencyStats: {
        totalDependencies,
        internalDependencies,
        externalDependencies,
        circularDependencies,
      },
    }
  }

  /**
   * Validate monorepo structure
   */
  async validate(): Promise<{
    valid: boolean
    issues: string[]
    warnings: string[]
  }> {
    const issues: string[] = []
    const warnings: string[] = []

    try {
      // Check if monorepo is properly initialized
      if (!this.monorepoInfo) {
        await this.initialize()
      }

      // Validate package manager consistency
      const packages = await this.getPackages()
      if (packages.length === 0) {
        issues.push('No packages found in workspace')
      }

      // Check for circular dependencies
      const circularDeps = await this.analyzer.detectCircularDependencies()
      if (circularDeps.length > 0 && this.options.config.buildOrder?.allowCircular === false) {
        issues.push(
          `Circular dependencies detected: ${circularDeps.map((cycle: string[]) => cycle.join(' -> ')).join(', ')}`
        )
      }

      // Validate workspace patterns
      const workspacePatterns = this.options.config.workspacePatterns
      if (workspacePatterns.length === 0) {
        warnings.push('No workspace patterns configured')
      }

      // Check for missing package.json files
      for (const packageName of packages) {
        const packageInfo = await this.getPackageInfo(packageName)
        if (!packageInfo) {
          issues.push(`Package ${packageName} has no valid package.json`)
        }
      }
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.adapter || !this.selectiveOps || !this.monorepoInfo) {
      throw new Error('MonorepoManager must be initialized before use. Call initialize() first.')
    }
  }

  /**
   * Merge operation options with configuration defaults
   */
  private mergeWithConfigOptions(options: SelectiveOperationOptions): SelectiveOperationOptions {
    const config = this.options.config

    return {
      since: options.since || config.selectiveOperations.since,
      scope: options.scope || config.packageFilters.scope,
      ignore: options.ignore || config.packageFilters.ignore,
      parallel:
        options.parallel !== undefined ? options.parallel : config.selectiveOperations.parallel,
      force: options.force !== undefined ? options.force : config.selectiveOperations.forceAll,
      dryRun: options.dryRun || false,
      verbose: options.verbose !== undefined ? options.verbose : this.options.verbose,
    }
  }
}
