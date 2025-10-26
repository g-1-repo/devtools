/**
 * Smart package detection that checks NPM registry before suggesting packages for publishing
 */

import { filterPublishablePackages, type NpmPackageInfo } from './npm-registry.js'
import { G1_ICONS } from '../core/ui-components.js'

export interface SmartPackageDetectionResult {
  publishable: string[]
  alreadyPublished: NpmPackageInfo[]
  private: string[]
  notFound: string[]
}

/**
 * Detects packages in the workspace and intelligently filters them based on NPM registry status
 * @param checkNpm - Whether to check NPM registry for version conflicts (default: true)
 * @returns Promise<SmartPackageDetectionResult> - Categorized package information
 */
export async function detectSmartPublishablePackages(
  checkNpm: boolean = true
): Promise<SmartPackageDetectionResult> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const result: SmartPackageDetectionResult = {
    publishable: [],
    alreadyPublished: [],
    private: [],
    notFound: [],
  }

  try {
    // Check if this is a workspace (has package.json with workspaces)
    const rootPackageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))
    const workspaces = rootPackageJson.workspaces

    const packagesWithVersions: Array<{ name: string; version: string }> = []

    if (!workspaces) {
      // Single package project
      if (rootPackageJson.name) {
        if (rootPackageJson.private) {
          result.private.push(rootPackageJson.name)
        } else {
          packagesWithVersions.push({
            name: rootPackageJson.name,
            version: rootPackageJson.version,
          })
        }
      }
    } else {
      // Handle workspace patterns
      const workspacePatterns = Array.isArray(workspaces) ? workspaces : workspaces.packages || []

      for (const pattern of workspacePatterns) {
        if (pattern.includes('*')) {
          // Handle glob patterns like "packages/*"
          const baseDir = pattern.replace('/*', '')
          try {
            const dirs = await fs.readdir(baseDir)
            for (const dir of dirs) {
              const packagePath = path.join(baseDir, dir, 'package.json')
              try {
                const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'))
                if (packageJson.name) {
                  if (packageJson.private) {
                    result.private.push(packageJson.name)
                  } else {
                    packagesWithVersions.push({
                      name: packageJson.name,
                      version: packageJson.version,
                    })
                  }
                }
              } catch {
                // Skip if package.json doesn't exist or is invalid
                result.notFound.push(`${baseDir}/${dir}`)
              }
            }
          } catch {
            // Skip if directory doesn't exist
            result.notFound.push(baseDir)
          }
        } else {
          // Handle direct paths
          const packagePath = path.join(pattern, 'package.json')
          try {
            const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'))
            if (packageJson.name) {
              if (packageJson.private) {
                result.private.push(packageJson.name)
              } else {
                packagesWithVersions.push({
                  name: packageJson.name,
                  version: packageJson.version,
                })
              }
            }
          } catch {
            // Skip if package.json doesn't exist or is invalid
            result.notFound.push(pattern)
          }
        }
      }
    }

    // If NPM checking is disabled, return all non-private packages as publishable
    if (!checkNpm) {
      result.publishable = packagesWithVersions.map((pkg) => pkg.name)
      return result
    }

    // Check NPM registry for version conflicts
    if (packagesWithVersions.length > 0) {
      const { publishable, skipped } = await filterPublishablePackages(packagesWithVersions)
      result.publishable = publishable
      result.alreadyPublished = skipped
    }

    return result
  } catch (error) {
    console.warn('Error detecting packages:', error)
    return result
  }
}

/**
 * Legacy function for backward compatibility - returns only publishable package names
 * @returns Promise<string[]> - Array of package names that can be published
 */
export async function detectPublishablePackages(): Promise<string[]> {
  const result = await detectSmartPublishablePackages(false) // Don't check NPM for backward compatibility
  return result.publishable
}

/**
 * Formats a summary message about package detection results
 * @param result - The smart package detection result
 * @returns string - Formatted summary message
 */
export function formatPackageDetectionSummary(result: SmartPackageDetectionResult): string {
  const messages: string[] = []

  if (result.publishable.length > 0) {
    messages.push(
      `${G1_ICONS.success} ${result.publishable.length} package(s) ready for publishing: ${result.publishable.join(', ')}`
    )
  }

  if (result.alreadyPublished.length > 0) {
    messages.push(`⏭️  ${result.alreadyPublished.length} package(s) skipped (already published):`)
    result.alreadyPublished.forEach((pkg) => {
      messages.push(`   • ${pkg.name}: ${pkg.reason}`)
    })
  }

  if (result.private.length > 0) {
    messages.push(
      `🔒 ${result.private.length} private package(s) excluded: ${result.private.join(', ')}`
    )
  }

  if (result.notFound.length > 0) {
    messages.push(
      `❌ ${result.notFound.length} package(s) not found: ${result.notFound.join(', ')}`
    )
  }

  if (messages.length === 0) {
    return '❌ No packages found for publishing'
  }

  return messages.join('\n')
}
