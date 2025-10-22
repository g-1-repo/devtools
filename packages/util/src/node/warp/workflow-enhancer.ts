/**
 * WARP Workflow Enhancer
 *
 * This utility automatically handles TypeScript checking and applies common fixes
 * for G1 projects. It's designed to be run by WARP before starting work or
 * generating code to ensure a clean development environment.
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

/**
 * Information about the current project including G1-specific metadata.
 */
export interface ProjectInfo {
  /** The project name from package.json */
  name: string
  /** The project version from package.json */
  version: string
  /** Whether this is a G1 project (has G1 dependencies or naming) */
  isG1Project: boolean
  /** List of G1 dependencies that are present */
  hasG1Dependencies: string[]
  /** List of G1 dependencies that are missing but expected */
  missingG1Dependencies: string[]
}

/**
 * Result of an automated fix operation.
 */
export interface FixResult {
  /** Whether the fix was successful */
  success: boolean
  /** Human-readable message about the fix result */
  message: string
  /** Optional detailed information about what was done */
  details?: string
}

/**
 * WARP Workflow Enhancer - Automated G1 project setup and TypeScript validation.
 *
 * This class provides automated enhancement capabilities for G1 projects, including:
 * - Project analysis and G1 dependency detection
 * - Automatic linking of G1 packages in development
 * - TypeScript validation and error fixing
 * - Common G1 project issue resolution
 *
 * @example
 * ```typescript
 * const enhancer = new WarpWorkflowEnhancer('/path/to/project')
 * const success = await enhancer.enhance()
 *
 * if (success) {
 *   console.log('Project enhanced successfully!')
 * } else {
 *   console.log('Enhancement failed - manual intervention required')
 * }
 * ```
 */
export class WarpWorkflowEnhancer {
  private projectRoot: string
  private projectInfo: ProjectInfo | null = null

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = resolve(projectRoot)
  }

  /**
   * Main enhancement method that analyzes and fixes common G1 project issues.
   *
   * This method performs a comprehensive enhancement workflow:
   * 1. Analyzes the project to detect G1 dependencies and configuration
   * 2. Links missing G1 packages for development
   * 3. Runs TypeScript type checking
   * 4. Attempts automatic fixes for common issues
   * 5. Provides manual fix guidance if automatic fixes fail
   *
   * @returns Promise<boolean> - True if enhancement was successful, false if manual intervention is needed
   *
   * @example
   * ```typescript
   * const enhancer = new WarpWorkflowEnhancer()
   * const success = await enhancer.enhance()
   *
   * if (!success) {
   *   console.log('Manual fixes required - check the guidance above')
   * }
   * ```
   */
  async enhance(): Promise<boolean> {
    console.log('🔧 WARP Workflow Enhancer - Initializing...')

    try {
      // Step 1: Analyze project
      this.projectInfo = await this.analyzeProject()
      console.log(`📊 Detected: ${this.projectInfo.name} v${this.projectInfo.version}`)

      if (!this.projectInfo.isG1Project) {
        console.log('ℹ️  Not a G1 project - running basic typecheck only')
        return await this.runTypecheck()
      }

      // Step 2: Check and fix G1 dependencies
      if (this.projectInfo.missingG1Dependencies.length > 0) {
        console.log(`🔗 Found missing G1 dependencies: ${this.projectInfo.missingG1Dependencies.join(', ')}`)
        const linkResult = await this.linkG1Packages()
        if (!linkResult.success) {
          console.error(`❌ Failed to link packages: ${linkResult.message}`)
          return false
        }
        console.log(`✅ ${linkResult.message}`)
      }

      // Step 3: Run typecheck
      console.log('🔍 Running TypeScript type checking...')
      const typecheckResult = await this.runTypecheck()

      if (typecheckResult) {
        console.log('✅ All TypeScript checks passed!')
        return true
      }

      // Step 4: Attempt automatic fixes
      console.log('🛠️  TypeScript errors detected - attempting automatic fixes...')
      const fixResult = await this.attemptAutomaticFixes()

      if (fixResult.success) {
        console.log('✅ Automatic fixes applied successfully!')
        // Re-run typecheck to confirm
        const recheckResult = await this.runTypecheck()
        if (recheckResult) {
          console.log('✅ All TypeScript checks now pass!')
          return true
        }
      }

      // Step 5: Provide guidance for manual fixes
      console.log('📋 Automatic fixes could not resolve all issues.')
      this.provideManualFixGuidance()
      return false
    }
    catch (error) {
      console.error('💥 Workflow enhancer encountered an error:', error)
      return false
    }
  }

  private async analyzeProject(): Promise<ProjectInfo> {
    const packageJsonPath = join(this.projectRoot, 'package.json')

    if (!existsSync(packageJsonPath)) {
      throw new Error('No package.json found in project root')
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    const g1Dependencies = [
      '@g-1/test',
      '@g-1/workflow',
      '@g-1/util',
    ]

    const hasG1Dependencies = g1Dependencies.filter(dep => allDeps[dep])
    const missingG1Dependencies = g1Dependencies.filter(dep =>
      allDeps[dep] && !this.isPackageLinked(dep),
    )

    return {
      name: packageJson.name || 'unknown',
      version: packageJson.version || '0.0.0',
      isG1Project: packageJson.name?.startsWith('@g-1/') || hasG1Dependencies.length > 0,
      hasG1Dependencies,
      missingG1Dependencies,
    }
  }

  private isPackageLinked(packageName: string): boolean {
    try {
      const result = execSync(`bun pm ls ${packageName}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.projectRoot,
      })
      return result.includes('link:')
    }
    catch {
      return false
    }
  }

  private async linkG1Packages(): Promise<FixResult> {
    const g1Root = resolve(this.projectRoot, '../')
    const packages = ['test', 'workflow', 'util']
    const linkedPackages: string[] = []
    const failedPackages: string[] = []

    for (const pkg of packages) {
      const pkgPath = join(g1Root, pkg)
      if (!existsSync(pkgPath)) {
        console.log(`⚠️  Package ${pkg} not found at ${pkgPath}`)
        continue
      }

      try {
        // Register the package as linkable
        execSync('bun link', {
          cwd: pkgPath,
          stdio: 'pipe',
        })

        // Link it to current project
        execSync(`bun link @g-1/${pkg}`, {
          cwd: this.projectRoot,
          stdio: 'pipe',
        })

        linkedPackages.push(`@g-1/${pkg}`)
      }
      catch (error) {
        failedPackages.push(`@g-1/${pkg}`)
        console.log(`⚠️  Failed to link @g-1/${pkg}:`, (error as Error).message)
      }
    }

    if (linkedPackages.length > 0) {
      const result: FixResult = {
        success: true,
        message: `Linked packages: ${linkedPackages.join(', ')}`,
      }
      if (failedPackages.length > 0) {
        result.details = `Failed: ${failedPackages.join(', ')}`
      }
      return result
    }

    return {
      success: false,
      message: 'No packages could be linked',
      details: `Failed packages: ${failedPackages.join(', ')}`,
    }
  }

  private async runTypecheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('bun', ['run', 'typecheck'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
      })

      let output = ''
      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve(true)
        }
        else {
          if (output.trim()) {
            console.log('📝 TypeScript output:')
            console.log(output)
          }
          resolve(false)
        }
      })

      child.on('error', (error) => {
        console.error('Failed to run typecheck:', error)
        resolve(false)
      })
    })
  }

  private async attemptAutomaticFixes(): Promise<FixResult> {
    const fixes: Array<() => Promise<FixResult>> = [
      () => this.fixMissingDependencies(),
      () => this.fixTypescriptConfig(),
      () => this.regenerateTypes(),
    ]

    const results: FixResult[] = []

    for (const fix of fixes) {
      try {
        const result = await fix()
        results.push(result)
        if (result.success) {
          console.log(`✅ ${result.message}`)
        }
        else {
          console.log(`⚠️  ${result.message}`)
        }
      }
      catch (error) {
        results.push({
          success: false,
          message: `Fix failed: ${(error as Error).message}`,
        })
      }
    }

    const successfulFixes = results.filter(r => r.success)

    return {
      success: successfulFixes.length > 0,
      message: `Applied ${successfulFixes.length} fixes successfully`,
      details: results.map(r => r.message).join('; '),
    }
  }

  private async fixMissingDependencies(): Promise<FixResult> {
    try {
      execSync('bun install', {
        cwd: this.projectRoot,
        stdio: 'pipe',
      })
      return {
        success: true,
        message: 'Reinstalled dependencies',
      }
    }
    catch (error) {
      return {
        success: false,
        message: `Failed to install dependencies: ${(error as Error).message}`,
      }
    }
  }

  private async fixTypescriptConfig(): Promise<FixResult> {
    // Check if tsconfig.json exists and is valid
    const tsconfigPath = join(this.projectRoot, 'tsconfig.json')

    if (!existsSync(tsconfigPath)) {
      return {
        success: false,
        message: 'No tsconfig.json found',
      }
    }

    try {
      JSON.parse(readFileSync(tsconfigPath, 'utf8'))
      return {
        success: true,
        message: 'TypeScript configuration is valid',
      }
    }
    catch {
      return {
        success: false,
        message: 'Invalid tsconfig.json detected',
      }
    }
  }

  private async regenerateTypes(): Promise<FixResult> {
    // Try to regenerate types if this is a G1 Core project with auth
    if (!this.projectInfo?.name.includes('core')) {
      return {
        success: false,
        message: 'Not applicable for this project type',
      }
    }

    try {
      // Check if auth schema regeneration is needed
      const authSchemaPath = join(this.projectRoot, 'src/db/auth.schema.ts')
      if (existsSync(authSchemaPath)) {
        execSync('bun run auth:update', {
          cwd: this.projectRoot,
          stdio: 'pipe',
        })
        return {
          success: true,
          message: 'Regenerated auth schema types',
        }
      }

      // Check if Cloudflare types need regeneration
      const wranglerConfig = existsSync(join(this.projectRoot, 'wrangler.jsonc'))
      if (wranglerConfig) {
        execSync('bun run cf-typegen', {
          cwd: this.projectRoot,
          stdio: 'pipe',
        })
        return {
          success: true,
          message: 'Regenerated Cloudflare types',
        }
      }

      return {
        success: false,
        message: 'No type generation needed',
      }
    }
    catch (error) {
      return {
        success: false,
        message: `Type regeneration failed: ${(error as Error).message}`,
      }
    }
  }

  private provideManualFixGuidance(): void {
    console.log('\n📚 Manual Fix Guidance:')
    console.log('1. Check the TypeScript output above for specific errors')
    console.log('2. Common G1 project fixes:')
    console.log('   • Link missing packages: cd ../[package] && bun link && cd - && bun link @g-1/[package]')
    console.log('   • Regenerate auth schema: bun run auth:update')
    console.log('   • Regenerate CF types: bun run cf-typegen')
    console.log('   • Clean install: rm -rf node_modules bun.lockb && bun install')
    console.log('3. Reference documentation:')
    console.log('   • ARCHITECTURE.md - for system understanding')
    console.log('   • TESTING.md - for test-related issues')
    console.log('   • WARP.md - for development patterns')
  }
}
