/**
 * Workflow Configuration System - .workflow.config.js Support
 *
 * This module provides comprehensive configuration management with support for
 * .workflow.config.js files and flexible configuration options as specified
 * in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

/**
 * Workflow Configuration System - Enhanced type safety and validation
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { cosmiconfig } from 'cosmiconfig'
import { z } from 'zod'

/**
 * Git configuration schema
 */
const GitConfigSchema = z.object({
  autoInit: z.boolean().default(false),
  autoCommit: z.boolean().default(false),
  commitMessage: z.string().default('chore: automated commit'),
  createGitignore: z.boolean().default(true),
  requireCleanWorkingDirectory: z.boolean().default(true),
  allowUncommittedChanges: z.boolean().default(false),
})

/**
 * Release configuration schema
 */
const ReleaseConfigSchema = z.object({
  skipTests: z.boolean().default(false),
  skipLint: z.boolean().default(false),
  skipBuild: z.boolean().default(false),
  skipPublish: z.boolean().default(false),
  versionBump: z.enum(['major', 'minor', 'patch', 'auto']).default('auto'),
  createGitTag: z.boolean().default(true),
  pushToRemote: z.boolean().default(true),
  generateChangelog: z.boolean().default(true),
  changelogFile: z.string().default('CHANGELOG.md'),
})

/**
 * Error handling configuration schema
 */
const ErrorHandlingConfigSchema = z.object({
  autoFix: z.boolean().default(false),
  interactive: z.boolean().default(true),
  exitOnError: z.boolean().default(true),
  showSuggestions: z.boolean().default(true),
  verboseErrors: z.boolean().default(false),
})

/**
 * CLI configuration schema
 */
const CliConfigSchema = z.object({
  colorOutput: z.boolean().default(true),
  progressBars: z.boolean().default(true),
  confirmActions: z.boolean().default(true),
  logLevel: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
})

/**
 * Hooks configuration schema
 */
const HooksConfigSchema = z.object({
  preRelease: z.array(z.string()).default([]),
  postRelease: z.array(z.string()).default([]),
  preCommit: z.array(z.string()).default([]),
  postCommit: z.array(z.string()).default([]),
  onError: z.array(z.string()).default([]),
})

/**
 * Monorepo configuration schema
 */
const MonorepoConfigSchema = z.object({
  enabled: z.boolean().default(false),
  type: z
    .enum(['lerna', 'nx', 'yarn-workspaces', 'pnpm-workspaces', 'rush', 'single-package'])
    .optional(),
  packageManager: z.enum(['npm', 'yarn', 'pnpm', 'bun']).optional(),
  workspacePatterns: z.array(z.string()).default(['packages/*', 'apps/*']),
  ignorePatterns: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/.git/**']),
  selectiveOperations: z
    .object({
      enabled: z.boolean().default(true),
      since: z.string().default('HEAD~1'),
      parallel: z.boolean().default(true),
      maxParallel: z.number().default(4),
      forceAll: z.boolean().default(false),
    })
    .default(() => ({
      enabled: true,
      since: 'HEAD~1',
      parallel: true,
      maxParallel: 4,
      forceAll: false,
    })),
  dependencyAnalysis: z
    .object({
      enabled: z.boolean().default(true),
      includeDevDependencies: z.boolean().default(false),
      includeExternal: z.boolean().default(false),
      cacheResults: z.boolean().default(true),
    })
    .default(() => ({
      enabled: true,
      includeDevDependencies: false,
      includeExternal: false,
      cacheResults: true,
    })),
  buildOrder: z
    .object({
      respectDependencies: z.boolean().default(true),
      allowCircular: z.boolean().default(false),
      topologicalSort: z.boolean().default(true),
    })
    .default(() => ({
      respectDependencies: true,
      allowCircular: false,
      topologicalSort: true,
    })),
  packageFilters: z
    .object({
      scope: z.array(z.string()).default([]),
      ignore: z.array(z.string()).default([]),
      includePrivate: z.boolean().default(false),
      onlyChanged: z.boolean().default(false),
    })
    .default(() => ({
      scope: [],
      ignore: [],
      includePrivate: false,
      onlyChanged: false,
    })),
})

/**
 * AI configuration schema
 */
const AIConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['openai', 'anthropic', 'local']).default('local'),
  suggestBranchNames: z.boolean().default(true),
  suggestCommitMessages: z.boolean().default(true),
  generateReleaseNotes: z.boolean().default(true),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  features: z
    .object({
      changelog: z
        .object({
          enabled: z.boolean().default(true),
          includeBreakingChanges: z.boolean().default(true),
          categorizeCommits: z.boolean().default(true),
          generateSummary: z.boolean().default(true),
        })
        .default(() => ({
          enabled: true,
          includeBreakingChanges: true,
          categorizeCommits: true,
          generateSummary: true,
        })),
      versionBump: z
        .object({
          enabled: z.boolean().default(true),
          analyzeImpact: z.boolean().default(true),
          suggestBumpType: z.boolean().default(true),
          confidenceThreshold: z.number().min(0).max(1).default(0.8),
        })
        .default(() => ({
          enabled: true,
          analyzeImpact: true,
          suggestBumpType: true,
          confidenceThreshold: 0.8,
        })),
      impactAnalysis: z
        .object({
          enabled: z.boolean().default(true),
          crossPackageAnalysis: z.boolean().default(true),
          riskAssessment: z.boolean().default(true),
          testingRecommendations: z.boolean().default(true),
        })
        .default(() => ({
          enabled: true,
          crossPackageAnalysis: true,
          riskAssessment: true,
          testingRecommendations: true,
        })),
    })
    .default(() => ({
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
      impactAnalysis: {
        enabled: true,
        crossPackageAnalysis: true,
        riskAssessment: true,
        testingRecommendations: true,
      },
    })),
})

/**
 * Framework detection configuration schema
 */
const FrameworkConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoDetect: z.boolean().default(true),
  supportedFrameworks: z
    .array(z.string())
    .default(['sveltekit', 'nextjs', 'nuxt', 'vite', 'create-react-app', 'angular', 'vue-cli']),
  deployment: z
    .object({
      enabled: z.boolean().default(true),
      autoOptimize: z.boolean().default(true),
      platforms: z.array(z.string()).default(['vercel', 'netlify', 'cloudflare']),
      healthChecks: z.boolean().default(true),
      websocketMonitoring: z.boolean().default(false),
    })
    .default(() => ({
      enabled: true,
      autoOptimize: true,
      platforms: ['vercel', 'netlify', 'cloudflare'],
      healthChecks: true,
      websocketMonitoring: false,
    })),
})

/**
 * Main workflow configuration schema
 */
const WorkflowConfigSchema = z.object({
  git: GitConfigSchema.default(() => ({
    autoInit: false,
    autoCommit: false,
    commitMessage: 'chore: automated commit',
    createGitignore: true,
    requireCleanWorkingDirectory: true,
    allowUncommittedChanges: false,
  })),
  release: ReleaseConfigSchema.default(() => ({
    skipTests: false,
    skipLint: false,
    skipBuild: false,
    skipPublish: false,
    versionBump: 'auto' as const,
    createGitTag: true,
    pushToRemote: true,
    generateChangelog: true,
    changelogFile: 'CHANGELOG.md',
  })),
  errorHandling: ErrorHandlingConfigSchema.default(() => ({
    autoFix: false,
    interactive: true,
    exitOnError: true,
    showSuggestions: true,
    verboseErrors: false,
  })),
  cli: CliConfigSchema.default(() => ({
    colorOutput: true,
    progressBars: true,
    confirmActions: true,
    logLevel: 'info' as const,
  })),
  hooks: HooksConfigSchema.default(() => ({
    preRelease: [],
    postRelease: [],
    preCommit: [],
    postCommit: [],
    onError: [],
  })),
  monorepo: MonorepoConfigSchema.default(() => ({
    enabled: false,
    workspacePatterns: ['packages/*', 'apps/*'],
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    selectiveOperations: {
      enabled: true,
      since: 'HEAD~1',
      parallel: true,
      maxParallel: 4,
      forceAll: false,
    },
    dependencyAnalysis: {
      enabled: true,
      includeDevDependencies: false,
      includeExternal: false,
      cacheResults: true,
    },
    buildOrder: {
      respectDependencies: true,
      allowCircular: false,
      topologicalSort: true,
    },
    packageFilters: {
      scope: [],
      ignore: [],
      includePrivate: false,
      onlyChanged: false,
    },
  })),
  ai: AIConfigSchema.default(() => ({
    enabled: false,
    provider: 'local' as const,
    suggestBranchNames: true,
    suggestCommitMessages: true,
    generateReleaseNotes: true,
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
      impactAnalysis: {
        enabled: true,
        crossPackageAnalysis: true,
        riskAssessment: true,
        testingRecommendations: true,
      },
    },
  })),
  framework: FrameworkConfigSchema.default(() => ({
    enabled: true,
    autoDetect: true,
    supportedFrameworks: [
      'sveltekit',
      'nextjs',
      'nuxt',
      'vite',
      'create-react-app',
      'angular',
      'vue-cli',
    ],
    deployment: {
      enabled: true,
      autoOptimize: true,
      platforms: ['vercel', 'netlify', 'cloudflare'],
      healthChecks: true,
      websocketMonitoring: false,
    },
  })),
  extends: z.string().optional(),
  plugins: z.array(z.string()).default([]),
  customCommands: z.record(z.string(), z.any()).default({}),
})

/**
 * Workflow configuration type
 */
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>
export type GitConfig = z.infer<typeof GitConfigSchema>
export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>
export type ErrorHandlingConfig = z.infer<typeof ErrorHandlingConfigSchema>
export type CliConfig = z.infer<typeof CliConfigSchema>
export type HooksConfig = z.infer<typeof HooksConfigSchema>
export type MonorepoConfig = z.infer<typeof MonorepoConfigSchema>
export type AIConfig = z.infer<typeof AIConfigSchema>
export type FrameworkConfig = z.infer<typeof FrameworkConfigSchema>

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: WorkflowConfig = {
  git: {
    autoInit: false,
    autoCommit: false,
    commitMessage: 'chore: automated commit',
    createGitignore: true,
    requireCleanWorkingDirectory: true,
    allowUncommittedChanges: false,
  },
  release: {
    skipTests: false,
    skipLint: false,
    skipBuild: false,
    skipPublish: false,
    versionBump: 'auto',
    createGitTag: true,
    pushToRemote: true,
    generateChangelog: true,
    changelogFile: 'CHANGELOG.md',
  },
  errorHandling: {
    autoFix: false,
    interactive: true,
    exitOnError: true,
    showSuggestions: true,
    verboseErrors: false,
  },
  cli: {
    colorOutput: true,
    progressBars: true,
    confirmActions: true,
    logLevel: 'info',
  },
  hooks: {
    preRelease: [],
    postRelease: [],
    preCommit: [],
    postCommit: [],
    onError: [],
  },
  monorepo: {
    enabled: false,
    workspacePatterns: ['packages/*', 'apps/*'],
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    selectiveOperations: {
      enabled: true,
      since: 'HEAD~1',
      parallel: true,
      maxParallel: 4,
      forceAll: false,
    },
    dependencyAnalysis: {
      enabled: true,
      includeDevDependencies: false,
      includeExternal: false,
      cacheResults: true,
    },
    buildOrder: {
      respectDependencies: true,
      allowCircular: false,
      topologicalSort: true,
    },
    packageFilters: {
      scope: [],
      ignore: [],
      includePrivate: false,
      onlyChanged: false,
    },
  },
  ai: {
    enabled: false,
    provider: 'local',
    suggestBranchNames: true,
    suggestCommitMessages: true,
    generateReleaseNotes: true,
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
      impactAnalysis: {
        enabled: true,
        crossPackageAnalysis: true,
        riskAssessment: true,
        testingRecommendations: true,
      },
    },
  },
  framework: {
    enabled: true,
    autoDetect: true,
    supportedFrameworks: [
      'sveltekit',
      'nextjs',
      'nuxt',
      'vite',
      'create-react-app',
      'angular',
      'vue-cli',
    ],
    deployment: {
      enabled: true,
      autoOptimize: true,
      platforms: ['vercel', 'netlify', 'cloudflare'],
      healthChecks: true,
      websocketMonitoring: false,
    },
  },
  plugins: [],
  customCommands: {},
}

/**
 * Configuration file names to search for
 */
const CONFIG_FILE_NAMES = [
  '.workflow.config.js',
  '.workflow.config.mjs',
  '.workflow.config.cjs',
  '.workflow.config.json',
  'workflow.config.js',
  'workflow.config.mjs',
  'workflow.config.cjs',
  'workflow.config.json',
]

/**
 * Loads configuration from various sources
 */
export async function loadWorkflowConfig(
  searchFrom: string = process.cwd(),
  configPath?: string
): Promise<WorkflowConfig> {
  let config: Partial<WorkflowConfig> = {}

  // Load from specific config path if provided
  if (configPath) {
    const resolvedPath = resolve(configPath)
    if (existsSync(resolvedPath)) {
      config = await loadConfigFromFile(resolvedPath)
    } else {
      throw new Error(`Configuration file not found: ${resolvedPath}`)
    }
  } else {
    // Search for config files using cosmiconfig
    const explorer = cosmiconfig('workflow', {
      searchPlaces: CONFIG_FILE_NAMES,
      loaders: {
        '.js': loadJavaScriptConfig,
        '.mjs': loadJavaScriptConfig,
        '.cjs': loadJavaScriptConfig,
      },
    })

    const result = await explorer.search(searchFrom)
    if (result) {
      config = result.config
    }
  }

  // Handle extends property
  if (config.extends) {
    const baseConfig = await loadWorkflowConfig(searchFrom, config.extends)
    config = mergeConfigs(baseConfig, config)
  }

  // Merge with defaults and validate
  const mergedConfig = mergeConfigs(DEFAULT_CONFIG, config)
  return WorkflowConfigSchema.parse(mergedConfig)
}

/**
 * Loads configuration from a specific file
 */
async function loadConfigFromFile(filePath: string): Promise<Partial<WorkflowConfig>> {
  const ext = filePath.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'json':
      return JSON.parse(readFileSync(filePath, 'utf-8'))
    case 'js':
    case 'mjs':
    case 'cjs':
      return await loadJavaScriptConfig(filePath)
    default:
      throw new Error(`Unsupported configuration file format: ${ext}`)
  }
}

/**
 * Loads JavaScript configuration files
 */
async function loadJavaScriptConfig(filePath: string): Promise<Partial<WorkflowConfig>> {
  try {
    // Use dynamic import for ES modules and CommonJS
    const module = await import(filePath)
    let config = module.default || module

    // If the config is a function, call it to get the actual config
    if (typeof config === 'function') {
      config = config()
    }

    return config
  } catch (error) {
    throw new Error(
      `Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Merges two configuration objects deeply
 */
function mergeConfigs(base: WorkflowConfig, override: Partial<WorkflowConfig>): WorkflowConfig {
  const result = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const baseValue = result[key as keyof WorkflowConfig] as Record<string, any>
        result[key as keyof WorkflowConfig] = {
          ...baseValue,
          ...value,
        } as any
      } else {
        result[key as keyof WorkflowConfig] = value as any
      }
    }
  }

  return result
}

/**
 * Creates a default configuration file
 */
export function createDefaultConfigFile(filePath: string = '.workflow.config.js'): void {
  const configContent = `/**
 * Workflow Configuration
 * 
 * This file configures the @g-1/workflow package behavior.
 * See documentation for all available options.
 */

module.exports = {
  // Git configuration
  git: {
    autoInit: false,              // Automatically initialize git repository
    autoCommit: false,            // Automatically commit changes before release
    commitMessage: 'chore: automated commit',
    createGitignore: true,        // Create .gitignore if it doesn't exist
    requireCleanWorkingDirectory: true,
    allowUncommittedChanges: false,
  },

  // Release configuration
  release: {
    skipTests: false,             // Skip running tests during release
    skipLint: false,              // Skip linting during release
    skipBuild: false,             // Skip build step during release
    skipPublish: false,           // Skip publishing to npm
    versionBump: 'auto',          // 'major' | 'minor' | 'patch' | 'auto'
    createGitTag: true,           // Create git tag for release
    pushToRemote: true,           // Push changes to remote repository
    generateChangelog: true,      // Generate CHANGELOG.md
    changelogFile: 'CHANGELOG.md',
  },

  // Error handling configuration
  errorHandling: {
    autoFix: false,               // Automatically fix common issues
    interactive: true,            // Show interactive prompts for fixes
    exitOnError: true,            // Exit process on errors
    showSuggestions: true,        // Show suggestions for fixing errors
    verboseErrors: false,         // Show detailed error information
  },

  // CLI configuration
  cli: {
    colorOutput: true,            // Use colored output
    progressBars: true,           // Show progress bars
    confirmActions: true,         // Ask for confirmation before destructive actions
    logLevel: 'info',             // 'silent' | 'error' | 'warn' | 'info' | 'debug'
  },

  // Hooks - run custom commands at specific points
  hooks: {
    preRelease: [],               // Commands to run before release
    postRelease: [],              // Commands to run after release
    preCommit: [],                // Commands to run before commit
    postCommit: [],               // Commands to run after commit
    onError: [],                  // Commands to run when errors occur
  },

  // Plugins to load
  plugins: [],

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
`

  writeFileSync(filePath, configContent)
  console.log(`Created configuration file: ${filePath}`)
}

/**
 * Validates a configuration object
 */
export function validateConfig(config: unknown): WorkflowConfig {
  return WorkflowConfigSchema.parse(config)
}

/**
 * Gets configuration for a specific section
 */
export function getConfigSection<T extends keyof WorkflowConfig>(
  config: WorkflowConfig,
  section: T
): WorkflowConfig[T] {
  return config[section]
}

/**
 * Merges CLI flags with configuration
 */
export function mergeConfigWithFlags(
  config: WorkflowConfig,
  flags: Record<string, any>
): WorkflowConfig {
  const overrides: Partial<WorkflowConfig> = {}

  // Handle nested flag paths (e.g., 'errorHandling.interactive')
  for (const [key, value] of Object.entries(flags)) {
    if (key.includes('.')) {
      const [section, property] = key.split('.')
      if (section && property && value !== undefined) {
        if (!overrides[section as keyof WorkflowConfig]) {
          const configSection = config[section as keyof WorkflowConfig] as Record<string, any>
          overrides[section as keyof WorkflowConfig] = {
            ...configSection,
          } as any
        }
        ;(overrides[section as keyof WorkflowConfig] as any)[property] = value
      }
    }
  }

  // Map CLI flags to configuration options
  if (flags.autoFix !== undefined) {
    overrides.errorHandling = { ...config.errorHandling, autoFix: flags.autoFix }
  }

  if (flags.interactive !== undefined) {
    overrides.errorHandling = { ...config.errorHandling, interactive: flags.interactive }
  }

  if (flags.skipTests !== undefined) {
    overrides.release = { ...config.release, skipTests: flags.skipTests }
  }

  if (flags.skipLint !== undefined) {
    overrides.release = { ...config.release, skipLint: flags.skipLint }
  }

  if (flags.skipBuild !== undefined) {
    overrides.release = { ...config.release, skipBuild: flags.skipBuild }
  }

  if (flags.skipPublish !== undefined) {
    overrides.release = { ...config.release, skipPublish: flags.skipPublish }
  }

  if (flags.logLevel !== undefined) {
    overrides.cli = { ...config.cli, logLevel: flags.logLevel }
  }

  if (flags.noColor !== undefined) {
    overrides.cli = { ...config.cli, colorOutput: !flags.noColor }
  }

  if (flags.color !== undefined) {
    overrides.cli = { ...config.cli, colorOutput: flags.color }
  }

  return mergeConfigs(config, overrides)
}

/**
 * Finds the nearest configuration file
 */
export async function findConfigFile(searchFrom: string = process.cwd()): Promise<string | null> {
  const explorer = cosmiconfig('workflow', {
    searchPlaces: CONFIG_FILE_NAMES,
  })

  const result = await explorer.search(searchFrom)
  return result?.filepath || null
}

/**
 * Checks if a configuration file exists
 */
export function hasConfigFile(searchFrom: string = process.cwd()): boolean {
  return CONFIG_FILE_NAMES.some((name) => existsSync(join(searchFrom, name)))
}
