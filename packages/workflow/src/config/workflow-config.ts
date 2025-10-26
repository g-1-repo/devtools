/**
 * Workflow Configuration System - .workflow.config.js Support
 * 
 * This module provides comprehensive configuration management with support for
 * .workflow.config.js files and flexible configuration options as specified
 * in WORKFLOW_IMPROVEMENTS_SPEC.md
 */

import { existsSync, readFileSync } from 'node:fs'
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
 * Main workflow configuration schema
 */
const WorkflowConfigSchema = z.object({
  git: GitConfigSchema.default({}),
  release: ReleaseConfigSchema.default({}),
  errorHandling: ErrorHandlingConfigSchema.default({}),
  cli: CliConfigSchema.default({}),
  hooks: HooksConfigSchema.default({}),
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
    throw new Error(`Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
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
        result[key as keyof WorkflowConfig] = {
          ...result[key as keyof WorkflowConfig],
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
  return CONFIG_FILE_NAMES.some(name => existsSync(join(searchFrom, name)))
}