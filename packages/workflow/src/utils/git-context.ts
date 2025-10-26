/**
 * Git Context Utilities - Enhanced git repository context detection and management
 */

import path from 'node:path'
import process from 'node:process'
import { execa } from 'execa'
import type { GitStatus } from '../core/git-setup.js'
import { detectGitStatus } from '../core/git-setup.js'

export interface GitContextInfo {
  workingDirectory: string
  gitRoot: string
  isMonorepo: boolean
  monorepoRoot?: string
  relativePath: string
  isValidContext: boolean
  recommendedWorkingDirectory?: string
}

/**
 * Analyzes the git context and provides recommendations for optimal workflow execution
 */
export async function analyzeGitContext(
  workingDir: string = process.cwd()
): Promise<GitContextInfo> {
  const gitStatus = await detectGitStatus(workingDir)

  // Determine the actual git root to use
  let effectiveGitRoot: string
  let isMonorepo = false
  let monorepoRoot: string | undefined

  if (gitStatus.hasNestedGitRepo && gitStatus.parentGitRoot) {
    // Nested git repo scenario - prefer parent monorepo
    effectiveGitRoot = gitStatus.parentGitRoot
    isMonorepo = true
    monorepoRoot = gitStatus.parentGitRoot
  } else if (gitStatus.isInMonorepo && gitStatus.parentGitRoot) {
    // In monorepo without nested git
    effectiveGitRoot = gitStatus.parentGitRoot
    isMonorepo = true
    monorepoRoot = gitStatus.parentGitRoot
  } else if (gitStatus.gitRoot) {
    // Regular git repository
    effectiveGitRoot = gitStatus.gitRoot
  } else {
    // No git repository found
    effectiveGitRoot = workingDir
  }

  const relativePath = path.relative(effectiveGitRoot, workingDir)

  // Determine if current context is valid for workflow operations
  const isValidContext: boolean =
    !gitStatus.hasNestedGitRepo && (!!gitStatus.hasGitRepo || !!gitStatus.isInMonorepo)

  // Recommend working directory for optimal workflow execution
  let recommendedWorkingDirectory: string | undefined
  if (gitStatus.hasNestedGitRepo && gitStatus.parentGitRoot) {
    recommendedWorkingDirectory = gitStatus.parentGitRoot
  } else if (isMonorepo && relativePath) {
    // For monorepos, recommend running from the root for better context
    recommendedWorkingDirectory = effectiveGitRoot
  }

  return {
    workingDirectory: workingDir,
    gitRoot: effectiveGitRoot,
    isMonorepo,
    monorepoRoot,
    relativePath,
    isValidContext,
    recommendedWorkingDirectory,
  }
}

/**
 * Finds the optimal working directory for git operations in a monorepo context
 */
export async function findOptimalWorkingDirectory(
  startDir: string = process.cwd()
): Promise<string> {
  const context = await analyzeGitContext(startDir)

  if (context.recommendedWorkingDirectory) {
    return context.recommendedWorkingDirectory
  }

  return context.gitRoot
}

/**
 * Creates git operations with automatic context detection
 */
export async function createContextAwareGitOperations(workingDir?: string) {
  const { createGitOperations } = await import('@g-1/util/node')
  const optimalDir = workingDir
    ? await findOptimalWorkingDirectory(workingDir)
    : await findOptimalWorkingDirectory()
  return createGitOperations(optimalDir)
}

/**
 * Validates that the current directory is appropriate for workflow operations
 */
export async function validateWorkflowContext(workingDir: string = process.cwd()): Promise<{
  isValid: boolean
  issues: string[]
  recommendations: string[]
}> {
  const context = await analyzeGitContext(workingDir)
  const gitStatus = await detectGitStatus(workingDir)

  const issues: string[] = []
  const recommendations: string[] = []

  if (gitStatus.hasNestedGitRepo) {
    issues.push('Nested git repository detected - this can cause workflow conflicts')
    recommendations.push(
      `Remove nested .git directory and use monorepo at ${gitStatus.parentGitRoot}`
    )
  }

  if (!context.isValidContext) {
    issues.push('No git repository found in current or parent directories')
    recommendations.push('Initialize a git repository or navigate to a directory with git')
  }

  if (context.isMonorepo && context.relativePath && !gitStatus.hasNestedGitRepo) {
    recommendations.push(
      `Consider running workflow commands from monorepo root: ${context.gitRoot}`
    )
  }

  return {
    isValid: context.isValidContext && !gitStatus.hasNestedGitRepo,
    issues,
    recommendations,
  }
}

/**
 * Automatically switches to the optimal working directory for git operations
 */
export async function switchToOptimalContext(workingDir: string = process.cwd()): Promise<{
  originalDir: string
  optimalDir: string
  switched: boolean
}> {
  const originalDir = workingDir
  const optimalDir = await findOptimalWorkingDirectory(workingDir)
  const switched = originalDir !== optimalDir

  if (switched) {
    process.chdir(optimalDir)
  }

  return {
    originalDir,
    optimalDir,
    switched,
  }
}
