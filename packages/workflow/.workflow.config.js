/**
 * Workflow Configuration
 *
 * This file configures the @g-1/workflow package behavior.
 * See documentation for all available options.
 */

module.exports = {
  // Git configuration
  git: {
    autoInit: false, // Automatically initialize git repository
    autoCommit: false, // Automatically commit changes before release
    commitMessage: 'chore: automated commit',
    createGitignore: true, // Create .gitignore if it doesn't exist
    requireCleanWorkingDirectory: true,
    allowUncommittedChanges: false,
  },

  // Release configuration
  release: {
    skipTests: false, // Skip running tests during release
    skipLint: false, // Skip linting during release
    skipBuild: false, // Skip build step during release
    skipPublish: false, // Skip publishing to npm
    versionBump: 'auto', // 'major' | 'minor' | 'patch' | 'auto'
    createGitTag: true, // Create git tag for release
    pushToRemote: true, // Push changes to remote repository
    generateChangelog: true, // Generate CHANGELOG.md
    changelogFile: 'CHANGELOG.md',
  },

  // Error handling configuration
  errorHandling: {
    autoFix: false, // Automatically fix common issues
    interactive: true, // Show interactive prompts for fixes
    exitOnError: true, // Exit process on errors
    showSuggestions: true, // Show suggestions for fixing errors
    verboseErrors: false, // Show detailed error information
  },

  // CLI configuration
  cli: {
    colorOutput: true, // Use colored output
    progressBars: true, // Show progress bars
    confirmActions: true, // Ask for confirmation before destructive actions
    logLevel: 'info', // 'silent' | 'error' | 'warn' | 'info' | 'debug'
  },

  // Hooks - run custom commands at specific points
  hooks: {
    preRelease: [], // Commands to run before release
    postRelease: [], // Commands to run after release
    preCommit: [], // Commands to run before commit
    postCommit: [], // Commands to run after commit
    onError: [], // Commands to run when errors occur
  },

  // Plugins to load
  plugins: [],

  // AI configuration
  ai: {
    enabled: true, // Enable AI-powered features
    changelog: {
      enabled: true, // Enable AI changelog generation
      includeCommitDetails: true, // Include detailed commit information
      groupByType: true, // Group changes by type (feat, fix, etc.)
      generateSummary: true, // Generate summary of changes
    },
    versionBump: {
      enabled: true, // Enable AI version bump suggestions
      analyzeBreakingChanges: true, // Analyze for breaking changes
      considerScope: true, // Consider change scope for version bumps
    },
    impactAnalysis: {
      enabled: true, // Enable cross-package impact analysis
      analyzeDependendencies: true, // Analyze dependency impacts
      suggestTestingStrategy: true, // Suggest testing strategies
    },
  },

  // Framework configuration
  framework: {
    enabled: true, // Enable framework detection
    supportedFrameworks: [
      'sveltekit',
      'nextjs',
      'nuxtjs',
      'vite',
      'create-react-app',
      'angular',
      'vue-cli',
    ],
    deployment: {
      enabled: true, // Enable deployment optimization
      platforms: ['cloudflare', 'vercel', 'netlify'],
      websocket: {
        enabled: true, // Enable WebSocket monitoring
        port: 3001, // WebSocket server port
        healthCheckInterval: 30000, // Health check interval (ms)
      },
    },
  },

  // Custom commands
  customCommands: {
    // 'my-command': {
    //   description: 'My custom command',
    //   script: 'echo "Hello World"'
    // }
  },

  // Extend another configuration file
  // extends: './base.workflow.config.js',
}
