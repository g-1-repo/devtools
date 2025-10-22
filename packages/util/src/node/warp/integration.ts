/**
 * WARP Integration Utility
 *
 * This module provides functions that WARP can call to automatically enhance
 * the development workflow. It should be imported and used by WARP before
 * performing code generation or other development tasks.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WarpWorkflowEnhancer } from './workflow-enhancer'

export interface WarpIntegrationOptions {
  skipTypecheck?: boolean
  skipLinking?: boolean
  silent?: boolean
  projectRoot?: string
}

export interface WarpIntegrationResult {
  success: boolean
  message: string
  details: {
    projectAnalyzed: boolean
    typecheckPassed: boolean
    packagesLinked: number
    fixesApplied: number
    errorCount: number
  }
}

/**
 * Main integration function for WARP to call
 */
export async function enhanceWorkflow(options: WarpIntegrationOptions = {}): Promise<WarpIntegrationResult> {
  const {
    skipTypecheck: _skipTypecheck = false,
    skipLinking: _skipLinking = false,
    silent = false,
    projectRoot = process.cwd(),
  } = options

  if (!silent) {
    console.log('🔧 WARP Integration: Enhancing development workflow...')
  }

  try {
    const enhancer = new WarpWorkflowEnhancer(projectRoot)
    const success = await enhancer.enhance()

    return {
      success,
      message: success
        ? 'Workflow enhancement completed successfully'
        : 'Workflow enhancement completed with issues',
      details: {
        projectAnalyzed: true,
        typecheckPassed: success,
        packagesLinked: 0, // This would be tracked by the enhancer
        fixesApplied: 0, // This would be tracked by the enhancer
        errorCount: success ? 0 : 1,
      },
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Workflow enhancement failed: ${(error as Error).message}`,
      details: {
        projectAnalyzed: false,
        typecheckPassed: false,
        packagesLinked: 0,
        fixesApplied: 0,
        errorCount: 1,
      },
    }
  }
}

/**
 * Quick typecheck function for WARP to use
 */
export async function quickTypecheck(projectRoot: string = process.cwd()): Promise<boolean> {
  try {
    execSync('bun run typecheck', {
      cwd: projectRoot,
      stdio: 'pipe',
    })
    return true
  }
  catch {
    return false
  }
}

/**
 * Check if this is a G1 project
 */
export function isG1Project(projectRoot: string = process.cwd()): boolean {
  const packageJsonPath = join(projectRoot, 'package.json')

  if (!existsSync(packageJsonPath)) {
    return false
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    return packageJson.name?.startsWith('@g-1/')
      || Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
        .some(dep => dep.startsWith('@g-1/'))
  }
  catch {
    return false
  }
}

/**
 * Get project status for WARP decision making
 */
export async function getProjectStatus(projectRoot: string = process.cwd()): Promise<{
  isG1Project: boolean
  typecheckPasses: boolean
  hasLinkedPackages: boolean
  needsEnhancement: boolean
}> {
  const isG1 = isG1Project(projectRoot)
  const typecheckPasses = await quickTypecheck(projectRoot)

  // Check for linked packages
  let hasLinkedPackages = false
  try {
    const result = execSync('bun pm ls', {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: projectRoot,
    })
    hasLinkedPackages = result.includes('link:@g-1/')
  }
  catch {
    // Ignore errors in package listing
  }

  return {
    isG1Project: isG1,
    typecheckPasses,
    hasLinkedPackages,
    needsEnhancement: isG1 && (!typecheckPasses || !hasLinkedPackages),
  }
}

/**
 * Integration points for WARP workflows
 */
export const WarpIntegrationPoints = {
  /**
   * Run before any code generation or editing
   */
  beforeCodeWork: async (projectRoot?: string): Promise<WarpIntegrationResult> => {
    const status = await getProjectStatus(projectRoot)

    if (status.needsEnhancement) {
      const options: WarpIntegrationOptions = {}
      if (projectRoot) {
        options.projectRoot = projectRoot
      }
      return await enhanceWorkflow(options)
    }

    return {
      success: true,
      message: 'No workflow enhancement needed',
      details: {
        projectAnalyzed: true,
        typecheckPassed: status.typecheckPasses,
        packagesLinked: status.hasLinkedPackages ? 1 : 0,
        fixesApplied: 0,
        errorCount: 0,
      },
    }
  },

  /**
   * Run after code changes to verify everything still works
   */
  afterCodeWork: async (projectRoot?: string): Promise<WarpIntegrationResult> => {
    const typecheckPasses = await quickTypecheck(projectRoot)

    if (!typecheckPasses) {
      const options: WarpIntegrationOptions = {
        skipLinking: true, // Don't re-link packages, just fix types
      }
      if (projectRoot) {
        options.projectRoot = projectRoot
      }
      return await enhanceWorkflow(options)
    }

    return {
      success: true,
      message: 'Post-work validation passed',
      details: {
        projectAnalyzed: true,
        typecheckPassed: true,
        packagesLinked: 0,
        fixesApplied: 0,
        errorCount: 0,
      },
    }
  },

  /**
   * Run when WARP encounters TypeScript errors
   */
  onTypescriptError: async (projectRoot?: string): Promise<WarpIntegrationResult> => {
    const options: WarpIntegrationOptions = {
      silent: false, // Show output to help debug
    }
    if (projectRoot) {
      options.projectRoot = projectRoot
    }
    return await enhanceWorkflow(options)
  },
}
