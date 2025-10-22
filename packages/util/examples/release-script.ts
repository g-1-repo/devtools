#!/usr/bin/env bun
/**
 * Example Release Script using @g-1/util
 *
 * This demonstrates how to use the Node.js utilities for automated releases
 */

import {
  analyzeChangesForVersionBump,
  COLORS,
  commitAndPush,
  // Prompt utilities
  confirm,
  getCurrentVersion,
  hasUncommittedChanges,
  incrementVersion,
  // Git utilities
  isGitRepository,
  log,
  ProgressIndicator,
  select,
  updateChangelog,
  updatePackageVersion,
} from '../src/index.js'

async function main() {
  log('🚀 Automated Release Tool', COLORS.bright)
  log('========================\n', COLORS.bright)

  // Check if we're in a git repository
  if (!isGitRepository()) {
    log('❌ Not in a git repository', COLORS.red)
    process.exit(1)
  }

  // Check for uncommitted changes
  if (!hasUncommittedChanges()) {
    log('ℹ️  No changes detected. Nothing to release.', COLORS.yellow)
    process.exit(0)
  }

  const currentVersion = getCurrentVersion()
  log(`📋 Current version: ${currentVersion}`, COLORS.cyan)

  // Analyze changes
  log('\n🔍 Analyzing changes...', COLORS.blue)
  const analysis = analyzeChangesForVersionBump()
  const newVersion = incrementVersion(currentVersion, analysis.versionBump)

  log(`📈 Detected ${analysis.versionBump} release`, COLORS.magenta)
  log(`📋 New version: ${newVersion}`, COLORS.cyan)
  log(`📝 Changes detected:`, COLORS.cyan)
  analysis.changesList.forEach(change => log(`   - ${change}`, COLORS.cyan))

  // Confirm version type
  // Import VersionBumpType from the correct location if not already imported
  // import type { VersionBumpType } from '../src/index.js'
  const versionType: import('../src/index.js').VersionBumpType = await select({
    message: 'Confirm the version bump type:',
    options: [
      { value: 'patch', label: `🔧 Patch - ${analysis.versionBump === 'patch' ? '(recommended)' : ''}` },
      { value: 'minor', label: `✨ Minor - ${analysis.versionBump === 'minor' ? '(recommended)' : ''}` },
      { value: 'major', label: `💥 Major - ${analysis.versionBump === 'major' ? '(recommended)' : ''}` },
    ],
    default: analysis.versionBump,
  })

  const finalVersion = incrementVersion(currentVersion, versionType)

  // Final confirmation
  const proceed = await confirm({
    message: `Proceed with ${versionType} release to v${finalVersion}?`,
    default: true,
  })

  if (!proceed) {
    log('❌ Release cancelled', COLORS.red)
    process.exit(0)
  }

  // Progress indicator demo
  const progress = new ProgressIndicator('Processing release')

  try {
    progress.start()

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 2000))
    progress.update('Updating version...')
    updatePackageVersion(finalVersion)

    await new Promise(resolve => setTimeout(resolve, 1000))
    progress.update('Updating changelog...')
    updateChangelog(finalVersion, analysis.changeType, analysis.changesList)

    await new Promise(resolve => setTimeout(resolve, 1000))
    progress.update('Committing changes...')
    commitAndPush(`Release v${finalVersion}: ${analysis.changesList[0] || 'General improvements'}`)

    progress.stop(`Release v${finalVersion} completed successfully!`)

    log('\n🎉 Success!', COLORS.bright + COLORS.green)
    log(`✅ Version updated: ${currentVersion} → ${finalVersion}`, COLORS.green)
    log(`✅ Changelog updated with ${analysis.changesList.length} changes`, COLORS.green)
    log(`✅ Changes committed and pushed`, COLORS.green)
  }
  catch (error: any) {
    progress.stop('❌ Release failed')
    log(`Error: ${error.message}`, COLORS.red)
    process.exit(1)
  }
}

// Run the script
main().catch((error) => {
  log(`❌ Script failed: ${error.message}`, COLORS.red)
  process.exit(1)
})
