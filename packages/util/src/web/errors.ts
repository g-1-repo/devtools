/**
 * Structured error classes for Cloudflare Workers applications
 *
 * These classes provide consistent error handling with structured data,
 * JSON serialization, and proper HTTP status codes.
 */

import {
  BAD_REQUEST,
  CONFLICT,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
} from '../http/index.js'

/**
 * HTTP Status Code type (compatible with various frameworks)
 */
export type StatusCode = number

/**
 * Base application error class with structured error handling
 */
export class AppError extends Error {
  public readonly isOperational: boolean = true
  public readonly timestamp: string = new Date().toISOString()

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: StatusCode,
    public readonly details?: unknown,
    isOperational: boolean = true,
  ) {
    super(message)
    this.name = this.constructor.name
    this.isOperational = isOperational

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * Convert to JSON-serializable format for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    }
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', BAD_REQUEST, details)
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, details?: Record<string, unknown>) {
    super(
      message,
      'DATABASE_ERROR',
      INTERNAL_SERVER_ERROR,
      {
        originalError: originalError?.message,
        ...(details || {}),
      },
    )
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`

    super(message, 'NOT_FOUND', NOT_FOUND, { resource, identifier })
  }
}

/**
 * Resource conflict error (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', CONFLICT, details)
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', UNAUTHORIZED)
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', FORBIDDEN)
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429 as StatusCode)
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(
      `External service error from ${service}: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      INTERNAL_SERVER_ERROR,
      { service, ...(details || {}) },
    )
  }
}

/**
 * Type guard to check if error is an operational error
 */
export function isOperationalError(error: Error): error is AppError {
  return error instanceof AppError && error.isOperational
}

/**
 * Utility to safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error occurred'
}

/**
 * Utility to safely extract error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Utility to get appropriate HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): StatusCode {
  if (error instanceof AppError) {
    return error.statusCode
  }
  return INTERNAL_SERVER_ERROR
}
