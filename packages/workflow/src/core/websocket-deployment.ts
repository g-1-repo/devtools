/**
 * WebSocket Deployment Service
 *
 * Provides real-time deployment monitoring, health checks, and status updates
 * Supports multiple deployment targets and live progress tracking
 */

import { EventEmitter } from 'events'
import { createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'
import type { FrameworkInfo } from '../types'

export interface DeploymentTarget {
  id: string
  name: string
  platform: string
  url?: string
  healthCheckUrl?: string
  status: 'idle' | 'deploying' | 'success' | 'failed' | 'unhealthy'
  lastDeployment?: Date
  version?: string
  framework?: FrameworkInfo
}

export interface DeploymentEvent {
  type:
    | 'deployment_started'
    | 'deployment_progress'
    | 'deployment_completed'
    | 'deployment_failed'
    | 'health_check'
  targetId: string
  timestamp: Date
  data: any
  message?: string
}

export interface DeploymentProgress {
  targetId: string
  stage: string
  progress: number // 0-100
  message: string
  logs?: string[]
}

export interface HealthCheckResult {
  targetId: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime?: number
  statusCode?: number
  error?: string
  timestamp: Date
}

export class WebSocketDeploymentService extends EventEmitter {
  private wss: WebSocketServer | null = null
  private server: any = null
  private port: number
  private targets = new Map<string, DeploymentTarget>()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private clients = new Set<WebSocket>()

  constructor(port: number = 8080) {
    super()
    this.port = port
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer()
        this.wss = new WebSocketServer({ server: this.server })

        this.wss.on('connection', (ws: WebSocket) => {
          this.clients.add(ws)
          console.log('Client connected to deployment WebSocket')

          // Send current targets status
          ws.send(
            JSON.stringify({
              type: 'targets_status',
              data: Array.from(this.targets.values()),
            })
          )

          ws.on('close', () => {
            this.clients.delete(ws)
            console.log('Client disconnected from deployment WebSocket')
          })

          ws.on('error', (error) => {
            console.error('WebSocket client error:', error)
            this.clients.delete(ws)
          })

          ws.on('message', (message) => {
            try {
              const data = JSON.parse(message.toString())
              this.handleClientMessage(ws, data)
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error)
            }
          })
        })

        this.server.listen(this.port, () => {
          console.log(`WebSocket deployment server started on port ${this.port}`)
          this.startHealthChecks()
          resolve()
        })

        this.server.on('error', reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('WebSocket deployment server stopped')
          resolve()
        })
      })
    }
  }

  /**
   * Register a deployment target
   */
  registerTarget(target: DeploymentTarget): void {
    this.targets.set(target.id, target)
    this.broadcast({
      type: 'target_registered',
      data: target,
    })
  }

  /**
   * Update target status
   */
  updateTargetStatus(targetId: string, status: DeploymentTarget['status'], data?: any): void {
    const target = this.targets.get(targetId)
    if (!target) {
      console.warn(`Target ${targetId} not found`)
      return
    }

    target.status = status
    if (data?.version) target.version = data.version
    if (data?.url) target.url = data.url

    this.targets.set(targetId, target)
    this.broadcast({
      type: 'target_status_updated',
      data: { targetId, status, ...data },
    })
  }

  /**
   * Start a deployment
   */
  async startDeployment(
    targetId: string,
    options: {
      version?: string
      buildCommand?: string
      framework?: FrameworkInfo
    } = {}
  ): Promise<void> {
    const target = this.targets.get(targetId)
    if (!target) {
      throw new Error(`Target ${targetId} not found`)
    }

    target.status = 'deploying'
    target.lastDeployment = new Date()
    if (options.version) target.version = options.version
    if (options.framework) target.framework = options.framework

    this.targets.set(targetId, target)

    const event: DeploymentEvent = {
      type: 'deployment_started',
      targetId,
      timestamp: new Date(),
      data: options,
      message: `Starting deployment to ${target.name}`,
    }

    this.emit('deployment_started', event)
    this.broadcast({ type: 'deployment_event', data: event })

    // Simulate deployment progress
    await this.simulateDeploymentProgress(targetId, options)
  }

  /**
   * Report deployment progress
   */
  reportProgress(progress: DeploymentProgress): void {
    const event: DeploymentEvent = {
      type: 'deployment_progress',
      targetId: progress.targetId,
      timestamp: new Date(),
      data: progress,
      message: progress.message,
    }

    this.emit('deployment_progress', event)
    this.broadcast({ type: 'deployment_event', data: event })
  }

  /**
   * Complete a deployment
   */
  completeDeployment(targetId: string, success: boolean, data?: any): void {
    const target = this.targets.get(targetId)
    if (!target) {
      console.warn(`Target ${targetId} not found`)
      return
    }

    target.status = success ? 'success' : 'failed'
    if (data?.url) target.url = data.url

    this.targets.set(targetId, target)

    const event: DeploymentEvent = {
      type: success ? 'deployment_completed' : 'deployment_failed',
      targetId,
      timestamp: new Date(),
      data,
      message: success
        ? `Deployment to ${target.name} completed successfully`
        : `Deployment to ${target.name} failed`,
    }

    this.emit(success ? 'deployment_completed' : 'deployment_failed', event)
    this.broadcast({ type: 'deployment_event', data: event })
  }

  /**
   * Perform health check on a target
   */
  async performHealthCheck(targetId: string): Promise<HealthCheckResult> {
    const target = this.targets.get(targetId)
    if (!target || !target.healthCheckUrl) {
      return {
        targetId,
        status: 'unknown',
        timestamp: new Date(),
        error: 'No health check URL configured',
      }
    }

    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(target.healthCheckUrl, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      const isHealthy = response.ok

      const result: HealthCheckResult = {
        targetId,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        statusCode: response.status,
        timestamp: new Date(),
      }

      // Update target status based on health check
      if (target.status !== 'deploying') {
        target.status = isHealthy ? 'success' : 'unhealthy'
        this.targets.set(targetId, target)
      }

      const event: DeploymentEvent = {
        type: 'health_check',
        targetId,
        timestamp: new Date(),
        data: result,
      }

      this.emit('health_check', event)
      this.broadcast({ type: 'health_check', data: event })

      return result
    } catch (error) {
      const result: HealthCheckResult = {
        targetId,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      }

      // Update target status
      if (target.status !== 'deploying') {
        target.status = 'unhealthy'
        this.targets.set(targetId, target)
      }

      const event: DeploymentEvent = {
        type: 'health_check',
        targetId,
        timestamp: new Date(),
        data: result,
      }

      this.emit('health_check', event)
      this.broadcast({ type: 'health_check', data: event })

      return result
    }
  }

  /**
   * Get all targets
   */
  getTargets(): DeploymentTarget[] {
    return Array.from(this.targets.values())
  }

  /**
   * Get target by ID
   */
  getTarget(targetId: string): DeploymentTarget | undefined {
    return this.targets.get(targetId)
  }

  /**
   * Remove a target
   */
  removeTarget(targetId: string): boolean {
    const removed = this.targets.delete(targetId)
    if (removed) {
      this.broadcast({
        type: 'target_removed',
        data: { targetId },
      })
    }
    return removed
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message)

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data)
        } catch (error) {
          console.error('Failed to send message to client:', error)
          this.clients.delete(client)
        }
      }
    })
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'get_targets':
        ws.send(
          JSON.stringify({
            type: 'targets_status',
            data: Array.from(this.targets.values()),
          })
        )
        break

      case 'health_check':
        if (message.targetId) {
          this.performHealthCheck(message.targetId)
        }
        break

      case 'deploy':
        if (message.targetId) {
          this.startDeployment(message.targetId, message.options || {})
        }
        break

      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const targets = Array.from(this.targets.values())
      const healthyTargets = targets.filter((t) => t.status === 'success' && t.healthCheckUrl)

      for (const target of healthyTargets) {
        await this.performHealthCheck(target.id)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Simulate deployment progress for demo purposes
   */
  private async simulateDeploymentProgress(targetId: string, options: any): Promise<void> {
    const stages = [
      { stage: 'Building', progress: 20, message: 'Building application...' },
      { stage: 'Testing', progress: 40, message: 'Running tests...' },
      { stage: 'Packaging', progress: 60, message: 'Creating deployment package...' },
      { stage: 'Uploading', progress: 80, message: 'Uploading to platform...' },
      { stage: 'Finalizing', progress: 100, message: 'Finalizing deployment...' },
    ]

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      this.reportProgress({
        targetId,
        ...stage,
      })
    }

    // Complete deployment
    await new Promise((resolve) => setTimeout(resolve, 500))
    this.completeDeployment(targetId, true, {
      url: `https://${targetId}.example.com`,
      version: options.version || '1.0.0',
    })
  }
}

export default WebSocketDeploymentService
