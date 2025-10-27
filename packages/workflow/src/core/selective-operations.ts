import { execSync } from 'node:child_process'
import type { PackageManagerAdapter } from './package-manager-adapters'
import type { WorkspaceAnalyzer } from './workspace-analyzer'

export interface SelectiveOperationOptions {
  since?: string
  scope?: string[]
  ignore?: string[]
  parallel?: boolean
  force?: boolean
  dryRun?: boolean
  verbose?: boolean
}

export interface OperationResult {
  success: boolean
  affectedPackages: string[]
  executedCommands: string[]
  duration: number
  errors?: string[]
}

export class SelectiveOperations {
  constructor(
    private workspaceAnalyzer: WorkspaceAnalyzer,
    private packageManagerAdapter: PackageManagerAdapter,
    private rootPath: string
  ) {}

  /**
   * Perform selective build based on changed packages
   */
  async selectiveBuild(options: SelectiveOperationOptions = {}): Promise<OperationResult> {
    const startTime = Date.now()
    const result: OperationResult = {
      success: true,
      affectedPackages: [],
      executedCommands: [],
      duration: 0,
      errors: [],
    }

    try {
      // Get affected packages
      const affectedPackages = await this.getAffectedPackages(options)
      result.affectedPackages = affectedPackages

      if (affectedPackages.length === 0) {
        console.log('No packages affected by changes. Skipping build.')
        result.duration = Date.now() - startTime
        return result
      }

      console.log(`Building ${affectedPackages.length} affected packages:`, affectedPackages)

      if (options.dryRun) {
        console.log('Dry run mode - would execute build for:', affectedPackages)
        result.duration = Date.now() - startTime
        return result
      }

      // Get build order based on dependencies
      const buildOrder = this.workspaceAnalyzer.getParallelBuildGroups()

      if (options.parallel) {
        // Build packages in parallel where possible
        await this.buildInParallel(buildOrder, options, result)
      } else {
        // Build packages sequentially
        await this.buildSequentially(buildOrder, options, result)
      }
    } catch (error) {
      result.success = false
      result.errors = result.errors || []
      result.errors.push(error instanceof Error ? error.message : String(error))
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Perform selective test based on changed packages
   */
  async selectiveTest(options: SelectiveOperationOptions = {}): Promise<OperationResult> {
    const startTime = Date.now()
    const result: OperationResult = {
      success: true,
      affectedPackages: [],
      executedCommands: [],
      duration: 0,
      errors: [],
    }

    try {
      // Get affected packages
      const affectedPackages = await this.getAffectedPackages(options)
      result.affectedPackages = affectedPackages

      if (affectedPackages.length === 0) {
        console.log('No packages affected by changes. Skipping tests.')
        result.duration = Date.now() - startTime
        return result
      }

      console.log(`Testing ${affectedPackages.length} affected packages:`, affectedPackages)

      if (options.dryRun) {
        console.log('Dry run mode - would execute tests for:', affectedPackages)
        result.duration = Date.now() - startTime
        return result
      }

      // Run tests for affected packages
      const command = `test for packages: ${affectedPackages.join(', ')}`
      result.executedCommands.push(command)

      await this.packageManagerAdapter.test(affectedPackages, {
        parallel: options.parallel,
        scope: options.scope,
        ignore: options.ignore,
      })
    } catch (error) {
      result.success = false
      result.errors = result.errors || []
      result.errors.push(error instanceof Error ? error.message : String(error))
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Perform selective deployment based on changed packages
   */
  async selectiveDeploy(
    deploymentTarget: string,
    options: SelectiveOperationOptions = {}
  ): Promise<OperationResult> {
    const startTime = Date.now()
    const result: OperationResult = {
      success: true,
      affectedPackages: [],
      executedCommands: [],
      duration: 0,
      errors: [],
    }

    try {
      // Get affected packages that are deployable
      const affectedPackages = await this.getDeployablePackages(options)
      result.affectedPackages = affectedPackages

      if (affectedPackages.length === 0) {
        console.log('No deployable packages affected by changes. Skipping deployment.')
        result.duration = Date.now() - startTime
        return result
      }

      console.log(
        `Deploying ${affectedPackages.length} affected packages to ${deploymentTarget}:`,
        affectedPackages
      )

      if (options.dryRun) {
        console.log('Dry run mode - would deploy:', affectedPackages)
        result.duration = Date.now() - startTime
        return result
      }

      // Deploy packages based on their configuration
      for (const packageName of affectedPackages) {
        await this.deployPackage(packageName, deploymentTarget, options, result)
      }
    } catch (error) {
      result.success = false
      result.errors = result.errors || []
      result.errors.push(error instanceof Error ? error.message : String(error))
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Run custom script on affected packages
   */
  async selectiveRun(
    script: string,
    options: SelectiveOperationOptions = {}
  ): Promise<OperationResult> {
    const startTime = Date.now()
    const result: OperationResult = {
      success: true,
      affectedPackages: [],
      executedCommands: [],
      duration: 0,
      errors: [],
    }

    try {
      // Get affected packages
      const affectedPackages = await this.getAffectedPackages(options)
      result.affectedPackages = affectedPackages

      if (affectedPackages.length === 0) {
        console.log(`No packages affected by changes. Skipping script: ${script}`)
        result.duration = Date.now() - startTime
        return result
      }

      console.log(
        `Running script "${script}" on ${affectedPackages.length} affected packages:`,
        affectedPackages
      )

      if (options.dryRun) {
        console.log(`Dry run mode - would run script "${script}" on:`, affectedPackages)
        result.duration = Date.now() - startTime
        return result
      }

      // Run script on affected packages
      const command = `${script} for packages: ${affectedPackages.join(', ')}`
      result.executedCommands.push(command)

      await this.packageManagerAdapter.run(script, affectedPackages, {
        parallel: options.parallel,
        scope: options.scope,
        ignore: options.ignore,
      })
    } catch (error) {
      result.success = false
      result.errors = result.errors || []
      result.errors.push(error instanceof Error ? error.message : String(error))
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Get packages affected by changes
   */
  private async getAffectedPackages(options: SelectiveOperationOptions): Promise<string[]> {
    if (options.force) {
      // Return all packages if force is enabled
      return await this.packageManagerAdapter.getWorkspacePackages()
    }

    if (options.scope && options.scope.length > 0) {
      // Return scoped packages
      return options.scope
    }

    // Get changed files since the specified commit/branch
    const since = options.since || 'HEAD~1'
    const changedFiles = this.getChangedFiles(since)

    if (changedFiles.length === 0) {
      return []
    }

    // Analyze which packages are affected by the changes
    const affectedPackages = await this.workspaceAnalyzer.getAffectedPackages(changedFiles)

    // Apply ignore filter
    if (options.ignore && options.ignore.length > 0) {
      return affectedPackages.filter((pkg) => !options.ignore!.includes(pkg))
    }

    return affectedPackages
  }

  /**
   * Get deployable packages affected by changes
   */
  private async getDeployablePackages(options: SelectiveOperationOptions): Promise<string[]> {
    const affectedPackages = await this.getAffectedPackages(options)
    const deployablePackages: string[] = []

    for (const packageName of affectedPackages) {
      const packageInfo = await this.packageManagerAdapter.getPackageInfo(packageName)

      // Check if package has deployment configuration
      if (packageInfo && this.isPackageDeployable(packageInfo)) {
        deployablePackages.push(packageName)
      }
    }

    return deployablePackages
  }

  /**
   * Check if a package is deployable
   */
  private isPackageDeployable(packageInfo: any): boolean {
    // Check for common deployment indicators
    const scripts = packageInfo.scripts || {}
    const hasDeployScript = scripts.deploy || scripts.build || scripts.start
    const isPrivate = packageInfo.private === true

    // Package is deployable if it has deployment scripts and is not private
    return hasDeployScript && !isPrivate
  }

  /**
   * Deploy a single package
   */
  private async deployPackage(
    packageName: string,
    deploymentTarget: string,
    options: SelectiveOperationOptions,
    result: OperationResult
  ): Promise<void> {
    const command = `deploy ${packageName} to ${deploymentTarget}`
    result.executedCommands.push(command)

    try {
      // This would integrate with the existing deployment workflows
      // For now, we'll run the deploy script if it exists
      await this.packageManagerAdapter.run('deploy', [packageName], {
        scope: [packageName],
      })
    } catch (error) {
      result.errors = result.errors || []
      result.errors.push(`Failed to deploy ${packageName}: ${error}`)
      throw error
    }
  }

  /**
   * Build packages sequentially
   */
  private async buildSequentially(
    buildOrder: string[][],
    options: SelectiveOperationOptions,
    result: OperationResult
  ): Promise<void> {
    for (const batch of buildOrder) {
      const command = `build batch: ${batch.join(', ')}`
      result.executedCommands.push(command)

      await this.packageManagerAdapter.build(batch, {
        parallel: false,
        scope: options.scope,
        ignore: options.ignore,
      })
    }
  }

  /**
   * Build packages in parallel where possible
   */
  private async buildInParallel(
    buildOrder: string[][],
    options: SelectiveOperationOptions,
    result: OperationResult
  ): Promise<void> {
    for (const batch of buildOrder) {
      const command = `build batch (parallel): ${batch.join(', ')}`
      result.executedCommands.push(command)

      // Build all packages in the current batch in parallel
      await this.packageManagerAdapter.build(batch, {
        parallel: true,
        scope: options.scope,
        ignore: options.ignore,
      })
    }
  }

  /**
   * Get changed files since a specific commit/branch
   */
  private getChangedFiles(since: string): string[] {
    try {
      const output = execSync(`git diff --name-only ${since}`, {
        cwd: this.rootPath,
        encoding: 'utf8',
      })

      return output
        .trim()
        .split('\n')
        .filter((file) => file.length > 0)
    } catch (error) {
      console.warn('Failed to get changed files:', error)
      return []
    }
  }
}
