/**
 * Enterprise Structured Logger - Consolidated from go-test-suite
 * Provides comprehensive logging with telemetry, performance monitoring, and multi-level output
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  error?: Error
  source?: string
}

export interface TelemetryEvent {
  name: string
  properties: Record<string, any>
  timestamp: string
  sessionId: string
}

export interface LoggerConfig {
  verbose?: boolean
  source?: string
  telemetry?: {
    enabled?: boolean
    endpoint?: string
    apiKey?: string
  }
}

/**
 * Color constants for terminal output
 */
const COLORS = {
  reset: '\x1B[0m',
  bright: '\x1B[1m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  gray: '\x1B[90m',
} as const

/**
 * Enterprise-level structured logger
 */
export class StructuredLogger {
  private sessionId: string = this.generateSessionId()
  private logLevel: LogLevel = LogLevel.INFO
  private config: LoggerConfig
  private telemetryEvents: TelemetryEvent[] = []

  constructor(config: LoggerConfig = {}) {
    this.config = {
      verbose: false,
      source: 'go-utils',
      telemetry: { enabled: false },
      ...config,
    }
    this.logLevel = this.config.verbose ? LogLevel.DEBUG : LogLevel.INFO
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error)

    if (error) {
      this.trackTelemetry('error', {
        message,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
        ...metadata,
      })
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata)
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata)
  }

  /**
   * Log trace message
   */
  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, metadata)
  }

  /**
   * Log success message
   */
  success(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel >= LogLevel.INFO) {
      const formatted = this.formatMessage(LogLevel.INFO, message, 'success')
      console.log(formatted)
      this.trackTelemetry('success', { message, ...metadata })
    }
  }

  /**
   * Log with timestamp (enhanced version from debug-utils)
   */
  logWithTime(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`, ...args)
  }

  /**
   * Pretty print object
   */
  prettyPrint(obj: any, indent: number = 2): void {
    console.log(JSON.stringify(obj, null, indent))
  }

  /**
   * Track telemetry event
   */
  trackTelemetry(name: string, properties: Record<string, any> = {}): void {
    if (!this.config.telemetry?.enabled)
      return

    const event: TelemetryEvent = {
      name,
      properties: {
        ...properties,
        nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
        platform: typeof process !== 'undefined' ? process.platform : undefined,
        arch: typeof process !== 'undefined' ? process.arch : undefined,
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    }

    this.telemetryEvents.push(event)

    // Send telemetry if endpoint is configured
    if (this.config.telemetry?.endpoint) {
      this.sendTelemetry(event).catch((err) => {
        this.debug('Failed to send telemetry', { error: err.message })
      })
    }
  }

  /**
   * Create a child logger with additional metadata
   */
  child(metadata: Record<string, any>, source?: string): StructuredLogger {
    const child = new StructuredLogger({
      ...this.config,
      source: source || this.config.source || 'go-utils',
    })
    child.sessionId = this.sessionId
    child.logLevel = this.logLevel

    // Override log method to include child metadata
    const originalLog = child.log.bind(child)
    child.log = (level: LogLevel, message: string, childMetadata?: Record<string, any>, error?: Error) => {
      originalLog(level, message, { ...metadata, ...childMetadata }, error)
    }

    return child
  }

  /**
   * Get performance timer (enhanced version)
   */
  timer(label: string): () => number {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.debug(`Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` })
      this.trackTelemetry('performance', { label, duration })
      return duration
    }
  }

  /**
   * Measure function execution time
   */
  async measureTime<T>(
    fn: () => T | Promise<T>,
    label: string = 'Function',
  ): Promise<{ result: T, duration: number }> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    const duration = end - start

    this.info(`${label} completed`, { duration: `${duration.toFixed(2)}ms` })
    this.trackTelemetry('function_timing', { label, duration })

    return { result, duration }
  }

  /**
   * Flush telemetry events
   */
  async flush(): Promise<void> {
    if (!this.config.telemetry?.enabled || this.telemetryEvents.length === 0) {
      return
    }

    if (this.config.telemetry.endpoint) {
      try {
        await this.sendBatchTelemetry(this.telemetryEvents)
        this.telemetryEvents = []
      }
      catch (error) {
        this.debug('Failed to flush telemetry', {
          error: error instanceof Error ? error.message : 'Unknown error',
          eventCount: this.telemetryEvents.length,
        })
      }
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    if (level > this.logLevel)
      return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata }),
      ...(error && { error }),
      source: this.config.source || 'go-utils',
    }

    // Output to console with formatting
    const formatted = this.formatMessage(level, message, undefined, metadata, error)

    if (level === LogLevel.ERROR) {
      console.error(formatted)
      if (error && this.logLevel >= LogLevel.DEBUG) {
        console.error(COLORS.gray + (error.stack || error.message) + COLORS.reset)
      }
    }
    else {
      console.log(formatted)
    }

    // Store for potential export/analysis
    this.storeLogEntry(entry)
  }

  /**
   * Format message for console output
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    type?: 'success' | 'error' | 'warn',
    metadata?: Record<string, any>,
    _error?: Error,
  ): string {
    const timestamp = COLORS.gray + new Date().toISOString() + COLORS.reset
    const levelStr = LogLevel[level].padEnd(5)

    let colorFn = (str: string) => str
    let prefix = ''

    switch (type || LogLevel[level]) {
      case 'success':
        colorFn = (str: string) => COLORS.green + str + COLORS.reset
        prefix = '✅ '
        break
      case 'ERROR':
        colorFn = (str: string) => COLORS.red + str + COLORS.reset
        prefix = '❌ '
        break
      case 'WARN':
        colorFn = (str: string) => COLORS.yellow + str + COLORS.reset
        prefix = '⚠️  '
        break
      case 'INFO':
        colorFn = (str: string) => COLORS.blue + str + COLORS.reset
        prefix = 'ℹ️  '
        break
      case 'DEBUG':
        colorFn = (str: string) => COLORS.magenta + str + COLORS.reset
        prefix = '🔍 '
        break
      case 'TRACE':
        colorFn = (str: string) => COLORS.gray + str + COLORS.reset
        prefix = '🔬 '
        break
    }

    let formatted = `${timestamp} ${COLORS.bright + levelStr + COLORS.reset} ${prefix}${colorFn(message)}`

    if (metadata && Object.keys(metadata).length > 0 && this.logLevel >= LogLevel.DEBUG) {
      const metaStr = Object.entries(metadata)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ')
      formatted += ` ${COLORS.gray}[${metaStr}]${COLORS.reset}`
    }

    return formatted
  }

  /**
   * Store log entry for analysis
   */
  private storeLogEntry(entry: LogEntry): void {
    // Could store to file, database, or memory for analysis
    // For now, just track in telemetry
    if (entry.level <= LogLevel.WARN) {
      this.trackTelemetry('log_event', {
        level: LogLevel[entry.level],
        message: entry.message,
        hasError: !!entry.error,
        metadata: entry.metadata,
      })
    }
  }

  /**
   * Send single telemetry event
   */
  private async sendTelemetry(event: TelemetryEvent): Promise<void> {
    if (!this.config.telemetry?.endpoint)
      return

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.source || 'go-utils',
    }

    if (this.config.telemetry.apiKey) {
      headers.Authorization = `Bearer ${this.config.telemetry.apiKey}`
    }

    await fetch(this.config.telemetry.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    })
  }

  /**
   * Send batch telemetry events
   */
  private async sendBatchTelemetry(events: TelemetryEvent[]): Promise<void> {
    if (!this.config.telemetry?.endpoint)
      return

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.source || 'go-utils',
    }

    if (this.config.telemetry.apiKey) {
      headers.Authorization = `Bearer ${this.config.telemetry.apiKey}`
    }

    await fetch(this.config.telemetry.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
    })
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Exit codes for different error types
 */
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONFIG_ERROR = 2,
  TEST_FAILURE = 3,
  NO_TESTS_FOUND = 4,
  TIMEOUT = 5,
  INTERRUPTED = 6,
  DEPENDENCY_ERROR = 7,
}

/**
 * Format error with proper exit code
 */
export function formatError(error: Error, exitCode: ExitCode = ExitCode.GENERAL_ERROR): never {
  const logger = createLogger({ source: 'error-handler' })
  logger.error(error.message, error)

  if (typeof process !== 'undefined') {
    process.exit(exitCode)
  }
  throw error
}

/**
 * Handle uncaught errors gracefully
 */
export function setupErrorHandlers(logger: StructuredLogger): void {
  if (typeof process === 'undefined')
    return

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error)
    logger.flush().finally(() => process.exit(ExitCode.GENERAL_ERROR))
  })

  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    logger.error('Unhandled rejection', error, { promise: promise.toString() })
    logger.flush().finally(() => process.exit(ExitCode.GENERAL_ERROR))
  })

  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...')
    logger.flush().finally(() => process.exit(ExitCode.INTERRUPTED))
  })

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...')
    logger.flush().finally(() => process.exit(ExitCode.INTERRUPTED))
  })
}

/**
 * Factory function for creating logger instances
 */
export function createLogger(config?: LoggerConfig): StructuredLogger {
  return new StructuredLogger(config)
}

/**
 * Default logger instance
 */
export const logger = createLogger()

/**
 * Simple timer function (backward compatibility)
 */
export function createTimer(label: string = 'Timer') {
  const start = performance.now()

  return {
    stop(): number {
      const end = performance.now()
      const duration = end - start
      logger.info(`${label}: ${duration.toFixed(2)}ms`)
      return duration
    },
  }
}

/**
 * Log with timestamp (backward compatibility)
 */
export function logWithTime(message: string, ...args: any[]): void {
  logger.logWithTime(message, ...args)
}

/**
 * Pretty print (backward compatibility)
 */
export function prettyPrint(obj: any, indent: number = 2): void {
  logger.prettyPrint(obj, indent)
}

/**
 * Measure function execution time (backward compatibility)
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>,
  label: string = 'Function',
): Promise<{ result: T, duration: number }> {
  return logger.measureTime(fn, label)
}
