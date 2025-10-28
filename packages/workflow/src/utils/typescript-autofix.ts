/**
 * TypeScript Auto-Fix Utilities
 * Provides interactive TypeScript error handling with multiple resolution options
 */

import { isCancel, select, confirm } from '@clack/prompts'
import { execa } from 'execa'
import chalk from 'chalk'
import { G1_ICONS } from '../core/ui-components.js'

export interface TypeScriptError {
  file: string
  line: number
  column: number
  message: string
  code: string
}

export interface TypeScriptCheckResult {
  hasErrors: boolean
  errors: TypeScriptError[]
  output: string
}

export type TypeScriptFixOption = 'auto' | 'manual' | 'continue' | 'exit'

export interface TypeScriptCheckOptions {
  nonInteractive?: boolean
  autoFixMode?: TypeScriptFixOption
}

/**
 * Runs TypeScript checking and returns detailed error information
 */
export async function runTypeScriptCheck(): Promise<TypeScriptCheckResult> {
  const commands = [
    ['bun', ['run', 'typecheck']],
    ['npm', ['run', 'typecheck']],
    ['bunx', ['tsc', '--noEmit']],
  ] as const

  let lastError: any = null
  let output = ''

  for (const [cmd, args] of commands) {
    try {
      const result = await execa(cmd, args, { stdio: 'pipe' })
      return {
        hasErrors: false,
        errors: [],
        output: result.stdout || result.stderr || '',
      }
    } catch (error: any) {
      lastError = error
      output = error.stdout || error.stderr || error.message || ''
      
      // If this is a TypeScript error (not command not found), parse it
      if (error.exitCode && error.exitCode > 0 && output.includes('error TS')) {
        break
      }
    }
  }

  // Parse TypeScript errors from output
  const errors = parseTypeScriptErrors(output)
  
  return {
    hasErrors: true,
    errors,
    output,
  }
}

/**
 * Parses TypeScript error output into structured error objects
 */
function parseTypeScriptErrors(output: string): TypeScriptError[] {
  const errors: TypeScriptError[] = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    // Match TypeScript error format: file(line,column): error TSxxxx: message
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/)
    if (match) {
      const [, file, lineNum, column, code, message] = match
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        column: parseInt(column, 10),
        message: message.trim(),
        code: code.trim(),
      })
    }
  }
  
  return errors
}

/**
 * Runs auto-fix commands to resolve TypeScript and linting issues
 */
export async function runAutoFix(): Promise<{ success: boolean; output: string }> {
  const fixCommands = [
    // Biome auto-fix (linting, formatting, imports)
    ['bunx', ['@biomejs/biome', 'check', '--write', 'src/']],
    ['bunx', ['@biomejs/biome', 'format', '--write', 'src/']],
    
    // Package-specific lint:fix
    ['bun', ['run', 'lint:fix']],
    ['npm', ['run', 'lint:fix']],
    
    // ESLint fallback
    ['bunx', ['eslint', '.', '--fix']],
  ]

  let allOutput = ''
  let anySuccess = false

  for (const [cmd, args] of fixCommands) {
    try {
      const result = await execa(cmd, args, { stdio: 'pipe' })
      allOutput += `✅ ${cmd} ${args.join(' ')}\n${result.stdout || result.stderr || ''}\n\n`
      anySuccess = true
    } catch (error: any) {
      // Only log if it's not a "command not found" error
      if (!error.message?.includes('ENOENT') && !error.message?.includes('command not found')) {
        allOutput += `❌ ${cmd} ${Array.isArray(args) ? args.join(' ') : args}\n${error.stdout || error.stderr || error.message || ''}\n\n`
      }
    }
  }

  return {
    success: anySuccess,
    output: allOutput,
  }
}

/**
 * Prompts user for TypeScript error handling choice
 */
export async function promptTypeScriptFixOption(
  errors: TypeScriptError[],
  nonInteractive = false
): Promise<TypeScriptFixOption> {
  if (nonInteractive) {
    return 'auto' // Default to auto-fix in non-interactive mode
  }

  console.log(chalk.red(`\n${G1_ICONS.error} TypeScript errors found:`))
  
  // Show first few errors as preview
  const previewErrors = errors.slice(0, 3)
  for (const error of previewErrors) {
    console.log(chalk.gray(`  ${error.file}:${error.line}:${error.column} - ${error.message}`))
  }
  
  if (errors.length > 3) {
    console.log(chalk.gray(`  ... and ${errors.length - 3} more errors`))
  }

  const choice = await select({
    message: 'How would you like to handle these TypeScript errors?',
    options: [
      {
        value: 'auto',
        label: `${G1_ICONS.fix} Auto-fix (recommended)`,
        hint: 'Run auto-fix tools and continue if successful',
      },
      {
        value: 'manual',
        label: `${G1_ICONS.gear} Manual fix`,
        hint: 'Exit to fix manually, then re-run release',
      },
      {
        value: 'continue',
        label: `${G1_ICONS.warning} Continue anyway`,
        hint: 'Skip TypeScript checks (not recommended)',
      },
      {
        value: 'exit',
        label: `${G1_ICONS.error} Exit release`,
        hint: 'Cancel the release process',
      },
    ],
    initialValue: 'auto',
  })

  if (isCancel(choice)) {
    return 'exit'
  }

  return choice as TypeScriptFixOption
}

/**
 * Handles TypeScript errors based on user choice
 */
export async function handleTypeScriptErrors(
  checkResult: TypeScriptCheckResult,
  nonInteractive = false,
  autoFixMode?: TypeScriptFixOption
): Promise<{ shouldContinue: boolean; wasFixed: boolean }> {
  if (!checkResult.hasErrors) {
    return { shouldContinue: true, wasFixed: false }
  }

  const choice = autoFixMode || await promptTypeScriptFixOption(checkResult.errors, nonInteractive)

  switch (choice) {
    case 'auto': {
      console.log(chalk.blue(`\n${G1_ICONS.gear} Running auto-fix tools...`))
      
      const fixResult = await runAutoFix()
      
      if (fixResult.success) {
        console.log(chalk.green(`${G1_ICONS.success} Auto-fix completed`))
        
        // Re-check TypeScript after auto-fix
        console.log(chalk.blue(`${G1_ICONS.gear} Re-checking TypeScript...`))
        const recheckResult = await runTypeScriptCheck()
        
        if (!recheckResult.hasErrors) {
          console.log(chalk.green(`${G1_ICONS.success} TypeScript errors resolved!`))
          return { shouldContinue: true, wasFixed: true }
        } else {
          console.log(chalk.yellow(`${G1_ICONS.warning} Some TypeScript errors remain`))
          
          // Ask if they want to continue anyway or fix manually
          if (!nonInteractive) {
            const continueAnyway = await confirm({
              message: 'Continue with remaining TypeScript errors?',
              initialValue: false,
            })
            
            if (isCancel(continueAnyway)) {
              return { shouldContinue: false, wasFixed: false }
            }
            
            return { shouldContinue: continueAnyway, wasFixed: true }
          } else {
            return { shouldContinue: false, wasFixed: false }
          }
        }
      } else {
        console.log(chalk.red(`${G1_ICONS.error} Auto-fix failed`))
        return { shouldContinue: false, wasFixed: false }
      }
    }

    case 'manual': {
      console.log(chalk.blue(`\n${G1_ICONS.info} Manual fix mode selected`))
      console.log(chalk.gray('Fix the TypeScript errors and re-run the release command.'))
      
      // Show the first error file for quick access
      if (checkResult.errors.length > 0) {
        const firstError = checkResult.errors[0]
        if (firstError) {
          console.log(chalk.gray(`First error: ${firstError.file}:${firstError.line}`))
        }
      }
      
      return { shouldContinue: false, wasFixed: false }
    }

    case 'continue': {
      console.log(chalk.yellow(`\n${G1_ICONS.warning} Continuing with TypeScript errors (not recommended)`))
      return { shouldContinue: true, wasFixed: false }
    }

    case 'exit': {
      console.log(chalk.gray(`\n${G1_ICONS.error} Release cancelled`))
      return { shouldContinue: false, wasFixed: false }
    }

    default: {
      return { shouldContinue: false, wasFixed: false }
    }
  }
}

/**
 * Enhanced TypeScript checking with auto-fix integration
 * This replaces the simple TypeScript check in the workflow
 */
export async function enhancedTypeScriptCheck(
  options: TypeScriptCheckOptions | boolean = {}
): Promise<{ success: boolean; wasFixed: boolean }> {
  // Handle backward compatibility with boolean parameter
  const opts = typeof options === 'boolean' 
    ? { nonInteractive: options } 
    : options

  const checkResult = await runTypeScriptCheck()
  
  if (!checkResult.hasErrors) {
    return { success: true, wasFixed: false }
  }

  const handleResult = await handleTypeScriptErrors(
    checkResult, 
    opts.nonInteractive || false,
    opts.autoFixMode
  )
  
  return {
    success: handleResult.shouldContinue,
    wasFixed: handleResult.wasFixed,
  }
}