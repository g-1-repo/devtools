// AI-powered error analysis

export type {
  AIErrorAnalysis,
  AIErrorAnalyzerConfig,
} from './ai-error-analyzer.js'
export {
  AIErrorAnalyzer,
  analyzeErrorWithAI,
  defaultAIErrorAnalyzer,
  getAICodeSuggestions,
} from './ai-error-analyzer.js'

// Legacy debug utilities
export {
  createTimer as createTimerLegacy,
  logWithTime as logWithTimeLegacy,
  measureTime as measureTimeLegacy,
  prettyPrint as prettyPrintLegacy,
} from './debug-utils.js'
export type { FormattedError } from './error-formatter.js'
export {
  createErrorBox,
  formatError,
  formatErrorLogs,
  formatPublishingFailure,
  formatWorkflowFailure,
} from './error-formatter.js'

// Structured logger (new comprehensive API)
export {
  createLogger,
  // Primary exports (override legacy)
  createTimer,
  ExitCode,
  handleError,
  type LogEntry,
  type LoggerConfig,
  LogLevel,
  logger,
  logWithTime,
  measureTime,
  prettyPrint,
  StructuredLogger,
  setupErrorHandlers,
  type TelemetryEvent,
} from './structured-logger.js'
