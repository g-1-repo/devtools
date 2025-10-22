/**
 * Shared Bundle Size Configuration
 * Monitors build output sizes across all packages
 */

// Standard size limits for different types of packages
const SIZE_LIMITS = {
  // Utility libraries should be small and tree-shakeable
  UTIL_MAIN: '30kb',
  UTIL_MODULE: '8kb', 
  
  // Workflow tools can be larger due to dependencies
  WORKFLOW_MAIN: '50kb',
  WORKFLOW_CLI: '100kb',
  
  // Test frameworks can be larger but should remain reasonable
  TEST_MAIN: '40kb', 
  TEST_CLI: '80kb',

  // Chunk files should be small for optimal loading
  CHUNK: '15kb'
}

/**
 * Generate bundlesize config for a package
 * @param {string} packageType - 'util' | 'workflow' | 'test'
 * @param {string[]} additionalPatterns - Additional file patterns to monitor
 */
function createBundleSizeConfig(packageType, additionalPatterns = []) {
  const basePatterns = [
    {
      path: './dist/index.js',
      maxSize: SIZE_LIMITS[`${packageType.toUpperCase()}_MAIN`],
      compression: 'gzip'
    },
    {
      path: './dist/chunks/*.js',
      maxSize: SIZE_LIMITS.CHUNK,
      compression: 'gzip'
    }
  ]

  // Add package-specific patterns
  const specificPatterns = []
  
  if (packageType === 'util') {
    specificPatterns.push(
      {
        path: './dist/*/index.js',
        maxSize: SIZE_LIMITS.UTIL_MODULE,
        compression: 'gzip'
      }
    )
  }
  
  if (packageType === 'workflow') {
    specificPatterns.push(
      {
        path: './dist/cli.js',
        maxSize: SIZE_LIMITS.WORKFLOW_CLI,
        compression: 'gzip'
      }
    )
  }
  
  if (packageType === 'test') {
    specificPatterns.push(
      {
        path: './dist/cli/test-runner.js',
        maxSize: SIZE_LIMITS.TEST_CLI,
        compression: 'gzip'
      }
    )
  }

  // Add any additional custom patterns
  const customPatterns = additionalPatterns.map(pattern => 
    typeof pattern === 'string' 
      ? { path: pattern, maxSize: SIZE_LIMITS.CHUNK, compression: 'gzip' }
      : pattern
  )

  return [...basePatterns, ...specificPatterns, ...customPatterns]
}

module.exports = {
  SIZE_LIMITS,
  createBundleSizeConfig
}