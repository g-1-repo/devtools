#!/usr/bin/env node

/**
 * g1-warp CLI - WARP Development Workflow Enhancement
 *
 * Command-line interface for WARP workflow enhancement utilities.
 * Provides commands for enhancing development environments across G1 projects.
 */

import process from 'node:process'
import { enhanceWorkflow, getProjectStatus, quickTypecheck } from './integration'

if (typeof import.meta !== 'undefined' && import.meta.url) {
  // ESM environment
  const isMain = import.meta.url === `file://${process.argv[1]}`
  if (isMain) {
    main().catch((error) => {
      console.error('Error:', error.message)
      process.exit(1)
    })
  }
}
else {
  // CommonJS fallback
  if (require.main === module) {
    main().catch((error) => {
      console.error('Error:', error.message)
      process.exit(1)
    })
  }
}

async function main() {
  const command = process.argv[2]
  const projectRoot = process.argv[3]

  switch (command) {
    case 'enhance':
    {
      const options = projectRoot ? { projectRoot } : {}
      const result = await enhanceWorkflow(options)
      console.log(result.message)
      process.exit(result.success ? 0 : 1)
    }
    // eslint-disable-next-line no-fallthrough
    case 'status':
      {
        const status = await getProjectStatus(projectRoot)
        console.log(JSON.stringify(status, null, 2))
      }
      break

    case 'typecheck':
    {
      const passes = await quickTypecheck(projectRoot)
      console.log(passes ? 'TypeScript checks pass' : 'TypeScript checks fail')
      process.exit(passes ? 0 : 1)
    }
    // eslint-disable-next-line no-fallthrough
    case '--help':
    case '-h':
    case 'help':
      showHelp()
      return

    default:
      console.error(`Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

function showHelp() {
  console.log(`
g1-warp - WARP Development Workflow Enhancement

Usage: g1-warp <command> [projectRoot]

Commands:
  enhance     Run full workflow enhancement (typecheck, linking, fixes)
  status      Check project status and enhancement needs  
  typecheck   Quick TypeScript validation
  help        Show this help message

Options:
  projectRoot   Optional path to project root (defaults to current directory)

Examples:
  g1-warp enhance                    # Enhance current directory
  g1-warp status /path/to/project    # Check project status
  g1-warp typecheck                  # Quick typecheck

For more information, visit: https://github.com/g-1-repo/util
`)
}
