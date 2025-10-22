// Legacy debug utilities
export {
  createTimer as createTimerLegacy,
  logWithTime as logWithTimeLegacy,
  measureTime as measureTimeLegacy,
  prettyPrint as prettyPrintLegacy,
} from './debug-utils.js'

export { ErrorFormatter } from './error-formatter.js'

export type { FormattedError } from './error-formatter.js'
// Structured logger (new comprehensive API)
export {
  createLogger,
  // Primary exports (override legacy)
  createTimer,
  ExitCode,
  formatError,
  type LogEntry,
  logger,
  type LoggerConfig,
  LogLevel,
  logWithTime,
  measureTime,
  prettyPrint,
  setupErrorHandlers,
  StructuredLogger,
  type TelemetryEvent,
} from './structured-logger.js'
