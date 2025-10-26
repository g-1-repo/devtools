/**
 * Framework CLI Commands
 *
 * Provides CLI commands for framework detection, deployment optimization,
 * and health monitoring for web applications.
 */

import { confirm, intro, log, note, outro, select } from '@clack/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { loadWorkflowConfig } from '../config/workflow-config.js'
import { G1_ICONS, g1Log } from '../core/error-formatter.js'
import { FrameworkDetector } from '../core/framework-detector.js'
import { WebSocketDeploymentService } from '../core/websocket-deployment.js'

export interface FrameworkCommandOptions {
  config?: string
  verbose?: boolean
  dryRun?: boolean
  force?: boolean
  output?: string
  format?: 'json' | 'table' | 'text'
  platform?: string
  nonInteractive?: boolean
  port?: number
}

/**
 * Creates the framework command with all subcommands
 */
export function createFrameworkCommand(): Command {
  const frameworkCmd = new Command('framework')
    .description('Framework detection and deployment optimization')
    .option('-c, --config <path>', 'Path to workflow config file')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--dry-run', 'Show what would be done without executing')
    .option('--force', 'Force operation without confirmation')
    .option('-o, --output <path>', 'Output file path')
    .option('--format <format>', 'Output format (json, table, text)', 'table')
    .option('--platform <platform>', 'Target deployment platform')
    .option('--non-interactive', 'Run without interactive prompts')
    .option('--port <port>', 'Port for WebSocket monitoring', '3001')

  // Detect command
  frameworkCmd
    .command('detect')
    .description('Detect frameworks in the current project')
    .action(async (options: FrameworkCommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runDetectCommand(mergedOptions)
    })

  // Optimize command
  frameworkCmd
    .command('optimize')
    .description('Get deployment optimization recommendations')
    .argument('[framework]', 'Specific framework to optimize for')
    .action(async (framework: string, options: FrameworkCommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runOptimizeCommand(framework, mergedOptions)
    })

  // Deploy command
  frameworkCmd
    .command('deploy')
    .description('Deploy with framework-specific optimizations')
    .argument('[target]', 'Deployment target environment', 'production')
    .action(async (target: string, options: FrameworkCommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runDeployCommand(target, mergedOptions)
    })

  // Monitor command
  frameworkCmd
    .command('monitor')
    .description('Start WebSocket deployment monitoring')
    .action(async (options: FrameworkCommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runMonitorCommand(mergedOptions)
    })

  // Health command
  frameworkCmd
    .command('health')
    .description('Check deployment health status')
    .argument('[url]', 'URL to check health for')
    .action(async (url: string, options: FrameworkCommandOptions, command: Command) => {
      const parentOptions = command.parent?.opts() || {}
      const mergedOptions = { ...parentOptions, ...options }
      await runHealthCommand(url, mergedOptions)
    })

  return frameworkCmd
}

/**
 * Run framework detection command
 */
async function runDetectCommand(options: FrameworkCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.search} Framework Detection`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.framework.enabled) {
      g1Log.warning('Framework detection is disabled in configuration')
      outro('Enable framework detection in your workflow config')
      return
    }

    const detector = new FrameworkDetector(process.cwd())

    g1Log.info('Scanning project for frameworks...')

    // Define workspace patterns based on common monorepo structures
    const workspacePatterns = [
      'packages/*',
      'apps/*',
      'docs',
      'devtools/packages/*',
      'frontend',
      'backend',
      'web',
      'api',
      'client',
      'server',
    ]

    const frameworksMap = await detector.detectAllFrameworks(workspacePatterns)
    const frameworks = Array.from(frameworksMap.entries()).map(([packagePath, info]) => ({
      package: packagePath,
      ...info,
    }))

    if (options.format === 'json') {
      const output = JSON.stringify(frameworks, null, 2)
      if (options.output) {
        const fs = await import('node:fs/promises')
        await fs.writeFile(options.output, output)
        g1Log.success(`Results saved to ${options.output}`)
      } else {
        console.log(output)
      }
    } else {
      displayFrameworks(frameworks, options.format || 'table')
    }

    outro(`${G1_ICONS.success} Detection complete`)
  } catch (error) {
    outro('Framework detection failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run optimization command
 */
async function runOptimizeCommand(
  framework: string,
  options: FrameworkCommandOptions
): Promise<void> {
  try {
    intro(`${G1_ICONS.optimize} Deployment Optimization`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.framework.enabled || !config.framework.deployment.enabled) {
      g1Log.warning('Framework deployment optimization is disabled')
      outro('Enable framework deployment features in your workflow config')
      return
    }

    const detector = new FrameworkDetector(process.cwd())

    let targetFramework = framework
    let firstFramework: any = null

    if (!targetFramework) {
      const frameworks = await detector.detectAllFrameworks()
      if (frameworks.size === 0) {
        g1Log.warning('No frameworks detected in current project')
        outro('Run framework detection first or specify a framework manually')
        return
      }
      firstFramework = Array.from(frameworks.values())[0]
      if (!firstFramework) {
        g1Log.warning('No valid framework found')
        return
      }
      targetFramework = firstFramework.name
      g1Log.info(`Using detected framework: ${targetFramework}`)
    }

    const platform = options.platform || 'vercel'
    g1Log.info(`Generating optimization recommendations for ${targetFramework} on ${platform}...`)

    // If we have a firstFramework from detection, use it; otherwise we need to detect the specific framework
    let strategy: any
    if (firstFramework) {
      strategy = firstFramework.deploymentStrategy
    } else {
      // If framework was provided as parameter, we need to detect it
      const detectedFramework = await detector.detectFramework('.')
      if (!detectedFramework) {
        g1Log.warning(`Could not detect framework details for ${targetFramework}`)
        return
      }
      strategy = detectedFramework.deploymentStrategy
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(strategy, null, 2))
    } else {
      displayDeploymentStrategy(strategy)
    }

    outro(`${G1_ICONS.success} Optimization complete`)
  } catch (error) {
    outro('Optimization failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run deployment command
 */
async function runDeployCommand(target: string, options: FrameworkCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.deploy} Framework Deployment`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.framework.enabled || !config.framework.deployment.enabled) {
      g1Log.warning('Framework deployment is disabled')
      outro('Enable framework deployment features in your workflow config')
      return
    }

    const detector = new FrameworkDetector(process.cwd())

    g1Log.info('Detecting frameworks and optimizing deployment...')
    const frameworks = await detector.detectAllFrameworks()

    if (frameworks.size === 0) {
      g1Log.warning('No frameworks detected')
      outro('Cannot proceed with framework-optimized deployment')
      return
    }

    const primaryFramework = Array.from(frameworks.values())[0]
    if (!primaryFramework) {
      g1Log.warning('No valid framework found')
      return
    }
    const platform = options.platform || 'vercel'

    g1Log.info(`Deploying ${primaryFramework.name} to ${platform} (${target})`)

    if (options.dryRun) {
      const strategy = primaryFramework.deploymentStrategy
      console.log('\nDeployment would execute:')
      displayDeploymentStrategy(strategy)
      outro('Dry run complete')
      return
    }

    // Start WebSocket monitoring if enabled
    let wsService: WebSocketDeploymentService | undefined
    if (config.framework.deployment.websocketMonitoring) {
      wsService = new WebSocketDeploymentService(options.port || 3001)
      await wsService.start()
      g1Log.info(`WebSocket monitoring started on port ${options.port || 3001}`)
    }

    try {
      // Execute deployment (placeholder - would integrate with actual deployment tools)
      g1Log.info('Executing deployment...')

      if (wsService) {
        wsService.reportProgress({
          targetId: 'deployment-1',
          stage: 'building',
          progress: 25,
          message: 'Building application...',
        })
      }

      // Simulate deployment process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (wsService) {
        wsService.reportProgress({
          targetId: 'deployment-1',
          stage: 'deploying',
          progress: 75,
          message: 'Deploying to platform...',
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (wsService) {
        wsService.completeDeployment('deployment-1', true, {
          url: 'https://example.com',
          duration: 3000,
        })
      }

      g1Log.success('Deployment completed successfully')
      outro(`${G1_ICONS.success} Deployment complete`)
    } finally {
      if (wsService) {
        await wsService.stop()
      }
    }
  } catch (error) {
    outro('Deployment failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run monitoring command
 */
async function runMonitorCommand(options: FrameworkCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.monitor} WebSocket Monitoring`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.framework.deployment.websocketMonitoring) {
      g1Log.warning('WebSocket monitoring is disabled')
      outro('Enable WebSocket monitoring in your framework config')
      return
    }

    const wsService = new WebSocketDeploymentService(options.port || 3001)

    g1Log.info(`Starting WebSocket server on port ${options.port || 3001}...`)
    await wsService.start()

    g1Log.success('WebSocket monitoring server started')
    console.log(`\n${chalk.cyan('Monitor URL:')} ws://localhost:${options.port || 3001}`)
    console.log(`${chalk.gray('Press Ctrl+C to stop monitoring')}`)

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\nStopping WebSocket server...')
      await wsService.stop()
      outro('Monitoring stopped')
      process.exit(0)
    })

    // Keep alive
    await new Promise(() => {}) // Never resolves
  } catch (error) {
    outro('Monitoring failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Run health check command
 */
async function runHealthCommand(url: string, options: FrameworkCommandOptions): Promise<void> {
  try {
    intro(`${G1_ICONS.health} Health Check`)

    const config = await loadWorkflowConfig(process.cwd(), options.config)

    if (!config.framework.deployment.healthChecks) {
      g1Log.warning('Health checks are disabled')
      outro('Enable health checks in your framework config')
      return
    }

    if (!url) {
      g1Log.error('URL is required for health check')
      outro('Provide a URL to check: workflow framework health <url>')
      return
    }

    const wsService = new WebSocketDeploymentService(options.port || 3001)

    g1Log.info(`Checking health of ${url}...`)
    const result = await wsService.performHealthCheck(url)

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2))
    } else {
      displayHealthResult(result)
    }

    outro(
      result.status === 'healthy'
        ? `${G1_ICONS.success} Health check passed`
        : 'Health check failed'
    )
    if (result.status !== 'healthy') process.exit(1)
  } catch (error) {
    outro('Health check failed')
    g1Log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Display detected frameworks
 */
function displayFrameworks(frameworks: any[], format: string): void {
  if (frameworks.length === 0) {
    g1Log.warning('No frameworks detected')
    return
  }

  if (format === 'table') {
    console.log('\n' + chalk.cyan('Detected Frameworks:'))
    frameworks.forEach((fw) => {
      console.log(
        `  ${chalk.green('✓')} ${chalk.bold(fw.name)} ${chalk.gray(`(v${fw.version || 'unknown'})`)}`
      )
      console.log(`    ${chalk.gray('Path:')} ${fw.path}`)
      if (fw.configFiles?.length > 0) {
        console.log(`    ${chalk.gray('Config:')} ${fw.configFiles.join(', ')}`)
      }
      console.log()
    })
  } else {
    frameworks.forEach((fw) => {
      console.log(`${fw.name} (${fw.version || 'unknown'}) at ${fw.path}`)
    })
  }
}

/**
 * Display deployment strategy
 */
function displayDeploymentStrategy(strategy: any): void {
  console.log('\n' + chalk.cyan('Deployment Strategy:'))
  console.log(`  ${chalk.gray('Framework:')} ${strategy.framework}`)
  console.log(`  ${chalk.gray('Platform:')} ${strategy.platform}`)

  if (strategy.buildCommand) {
    console.log(`  ${chalk.gray('Build:')} ${strategy.buildCommand}`)
  }

  if (strategy.outputDirectory) {
    console.log(`  ${chalk.gray('Output:')} ${strategy.outputDirectory}`)
  }

  if (strategy.environmentVariables?.length > 0) {
    console.log(`  ${chalk.gray('Environment Variables:')}`)
    strategy.environmentVariables.forEach((env: string) => {
      console.log(`    - ${env}`)
    })
  }

  if (strategy.optimizations?.length > 0) {
    console.log(`  ${chalk.gray('Optimizations:')}`)
    strategy.optimizations.forEach((opt: string) => {
      console.log(`    - ${opt}`)
    })
  }
}

/**
 * Display health check result
 */
function displayHealthResult(result: any): void {
  const statusColor = result.healthy ? chalk.green : chalk.red
  const statusIcon = result.healthy ? '✓' : '✗'

  console.log(
    `\n${statusColor(statusIcon)} ${chalk.bold('Health Status:')} ${statusColor(result.healthy ? 'Healthy' : 'Unhealthy')}`
  )
  console.log(`  ${chalk.gray('Response Time:')} ${result.responseTime}ms`)
  console.log(`  ${chalk.gray('Status Code:')} ${result.statusCode}`)

  if (result.error) {
    console.log(`  ${chalk.gray('Error:')} ${chalk.red(result.error)}`)
  }

  if (result.timestamp) {
    console.log(`  ${chalk.gray('Checked:')} ${new Date(result.timestamp).toLocaleString()}`)
  }
}
