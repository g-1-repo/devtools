/**
 * Workflow configuration for @g-1/util package
 */
module.exports = {
  // Extend the main workflow configuration
  extends: '../workflow/.workflow.config.js',
  
  // Package-specific overrides
  release: {
    generateChangelog: true,
    changelogFile: 'CHANGELOG.md',
  },
  
  // Enable AI features for this package
  ai: {
    enabled: true,
    provider: 'local',
    features: {
      changelog: {
        enabled: true,
        includeBreakingChanges: true,
        categorizeCommits: true,
        generateSummary: true,
      },
      versionBump: {
        enabled: true,
        analyzeImpact: true,
        suggestBumpType: true,
        confidenceThreshold: 0.8,
      },
    },
  },
}