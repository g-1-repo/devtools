/**
 * Git Store - Workflow-specific Git operations extending @g-1/util GitOperations
 */

import process from 'node:process'
import { GitOperations } from '@g-1/util/node'

export class GitStore extends GitOperations {
  constructor(workingDir: string = process.cwd()) {
    super(workingDir)
  }

  // Repository Info methods inherited from GitOperations

  // Status & Changes methods inherited from GitOperations

  // Commits & History methods inherited from GitOperations

  // Branch Management methods inherited from GitOperations

  // AI-Powered Suggestions methods inherited from GitOperations

  // Git Operations methods inherited from GitOperations

  // GitHub Integration methods inherited from GitOperations

  // =============================================================================
  // Workflow-Specific Version Management Extensions
  // =============================================================================

  async getCurrentVersionFromGit(): Promise<string> {
    try {
      // First try to get version from latest git tag (workflow-specific approach)
      const { execa } = await import('execa')
      const result = await execa('git', ['tag', '--sort=-version:refname', '--merged'])
      const latestTag = result.stdout.split('\n').find(tag => tag.match(/^v?\d+\.\d+\.\d+/))

      if (latestTag) {
        // Remove 'v' prefix if present
        return latestTag.replace(/^v/, '')
      }

      // Fallback to package.json
      const packageJson = await import(`${process.cwd()}/package.json`, {
        assert: { type: 'json' },
      })
      return packageJson.default.version || '0.0.0'
    }
    catch {
      return '0.0.0'
    }
  }

  // Cleanup Operations methods inherited from GitOperations

  // Utilities inherited from GitOperations
}

/**
 * Factory function
 */
export function createGitStore(workingDir?: string): GitStore {
  return new GitStore(workingDir)
}
