/**
 * HTTP Exception factory functions for Cloudflare Workers
 *
 * These functions create HTTP exceptions with standard status codes and messages.
 * Compatible with Hono's HTTPException class and other web frameworks.
 */

// Note: We avoid importing HTTPException directly to keep this framework-agnostic
// Users can create their own HTTPException or use these with any framework

import {
  BAD_REQUEST,
  CONFLICT,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from '../http/index.js'

/**
 * Generic HTTP error creator
 */
export function createHttpError(
  statusCode: number,
  message: string,
  details?: unknown,
): { statusCode: number, message: string, details?: unknown } {
  return { statusCode, message, details }
}

/**
 * Bad Request (400) error
 */
export function createBadRequest(message: string = 'Bad Request', details?: unknown) {
  return createHttpError(BAD_REQUEST, message, details)
}

/**
 * Unauthorized (401) error
 */
export function createUnauthorized(message: string = 'Unauthorized', details?: unknown) {
  return createHttpError(UNAUTHORIZED, message, details)
}

/**
 * Forbidden (403) error
 */
export function createForbidden(message: string = 'Forbidden', details?: unknown) {
  return createHttpError(FORBIDDEN, message, details)
}

/**
 * Not Found (404) error
 */
export function createNotFound(message: string = 'Not Found', details?: unknown) {
  return createHttpError(NOT_FOUND, message, details)
}

/**
 * Conflict (409) error
 */
export function createConflict(message: string = 'Already exists', details?: unknown) {
  return createHttpError(CONFLICT, message, details)
}

/**
 * Too Many Requests (429) error
 */
export function createTooManyRequests(message: string = 'Too many requests', details?: unknown) {
  return createHttpError(TOO_MANY_REQUESTS, message, details)
}

/**
 * Internal Server Error (500) error
 */
export function createInternalError(message: string = 'Internal Error', details?: unknown) {
  return createHttpError(INTERNAL_SERVER_ERROR, message, details)
}

/**
 * Factory function to create HTTP error from status code
 */
export function createErrorFromStatus(
  statusCode: number,
  message?: string,
  details?: unknown,
) {
  const defaultMessages: Record<number, string> = {
    [BAD_REQUEST]: 'Bad Request',
    [UNAUTHORIZED]: 'Unauthorized',
    [FORBIDDEN]: 'Forbidden',
    [NOT_FOUND]: 'Not Found',
    [CONFLICT]: 'Conflict',
    [TOO_MANY_REQUESTS]: 'Too Many Requests',
    [INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  }

  const defaultMessage = defaultMessages[statusCode] || 'Unknown Error'
  return createHttpError(statusCode, message || defaultMessage, details)
}
