/**
 * NPM Registry utilities for version checking and package information
 */

import { execa } from 'execa'

export interface NpmPackageInfo {
  name: string
  localVersion: string
  publishedVersion?: string
  canPublish: boolean
  reason?: string
}

/**
 * Gets the published version of a package from NPM registry
 * @param packageName - The name of the package to check
 * @returns Promise<string | null> - The published version or null if not found
 */
export async function getNpmPackageVersion(packageName: string): Promise<string | null> {
  try {
    const result = await execa('npm', ['view', packageName, 'version'], {
      stdio: 'pipe',
      timeout: 10000, // 10 second timeout
    })
    return result.stdout.trim() || null
  } catch (error: any) {
    // Package doesn't exist on NPM or other error
    if (error.stderr?.includes('404') || error.stderr?.includes('E404')) {
      return null // Package not found - can be published
    }
    // For other errors, assume we can't determine and allow publishing
    return null
  }
}

/**
 * Checks multiple packages against NPM registry and determines which can be published
 * @param packages - Array of package objects with name and version
 * @returns Promise<NpmPackageInfo[]> - Array of package info with publish status
 */
export async function checkNpmPackageVersions(
  packages: Array<{ name: string; version: string }>
): Promise<NpmPackageInfo[]> {
  const results: NpmPackageInfo[] = []

  // Check packages in parallel for better performance
  const checks = packages.map(async (pkg) => {
    const publishedVersion = await getNpmPackageVersion(pkg.name)

    let canPublish = true
    let reason: string | undefined

    if (publishedVersion === pkg.version) {
      canPublish = false
      reason = `Version ${pkg.version} already published`
    } else if (publishedVersion && isVersionLower(pkg.version, publishedVersion)) {
      canPublish = false
      reason = `Local version ${pkg.version} is lower than published ${publishedVersion}`
    }

    return {
      name: pkg.name,
      localVersion: pkg.version,
      publishedVersion,
      canPublish,
      reason,
    }
  })

  const packageInfos = await Promise.all(checks)
  return packageInfos
}

/**
 * Simple version comparison to check if version A is lower than version B
 * @param versionA - First version to compare
 * @param versionB - Second version to compare
 * @returns boolean - True if versionA is lower than versionB
 */
function isVersionLower(versionA: string, versionB: string): boolean {
  // Simple semver comparison - split by dots and compare numerically
  const partsA = versionA.split('.').map(Number)
  const partsB = versionB.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const a = partsA[i] || 0
    const b = partsB[i] || 0

    if (a < b) return true
    if (a > b) return false
  }

  return false // Versions are equal
}

/**
 * Filters packages to only include those that can be published
 * @param packages - Array of package objects with name and version
 * @returns Promise<{ publishable: string[], skipped: NpmPackageInfo[] }> - Filtered results
 */
export async function filterPublishablePackages(
  packages: Array<{ name: string; version: string }>
): Promise<{ publishable: string[]; skipped: NpmPackageInfo[] }> {
  const packageInfos = await checkNpmPackageVersions(packages)

  const publishable = packageInfos.filter((info) => info.canPublish).map((info) => info.name)

  const skipped = packageInfos.filter((info) => !info.canPublish)

  return { publishable, skipped }
}
