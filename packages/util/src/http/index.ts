/**
 * HTTP Status Codes and Phrases
 *
 * Provides commonly used HTTP status codes and their corresponding phrases.
 * This module is tree-shakeable - only imported values will be included in your bundle.
 *
 * @example
 * ```typescript
 * import { OK, NOT_FOUND, HTTP_STATUS_PHRASES } from '@go-corp/utils/http-status';
 *
 * // Use status codes
 * response.status(OK);
 *
 * // Use phrases
 * console.log(HTTP_STATUS_PHRASES.NOT_FOUND); // "Not Found"
 * ```
 */

// HTTP Status Codes
export const HTTP_STATUS_CODES = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // 4xx Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500,
} as const

// HTTP Status Phrases
export const HTTP_STATUS_PHRASES = {
  // 2xx Success
  OK: 'OK',
  CREATED: 'Created',
  NO_CONTENT: 'No Content',

  // 4xx Client Error
  BAD_REQUEST: 'Bad Request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not Found',
  CONFLICT: 'Conflict',
  UNPROCESSABLE_ENTITY: 'Unprocessable Entity',
  TOO_MANY_REQUESTS: 'Too Many Requests',

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
} as const

// Individual exports for tree-shaking
export const {
  OK,
  CREATED,
  NO_CONTENT,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS,
  INTERNAL_SERVER_ERROR,
} = HTTP_STATUS_CODES

// Type definitions for better TypeScript support
export type HttpStatusCode = typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
export type HttpStatusPhrase = typeof HTTP_STATUS_PHRASES[keyof typeof HTTP_STATUS_PHRASES]

/**
 * Check if a status code indicates success (2xx)
 */
export function isSuccess(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300
}

/**
 * Check if a status code indicates client error (4xx)
 */
export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500
}

/**
 * Check if a status code indicates server error (5xx)
 */
export function isServerError(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600
}

/**
 * Get the phrase for a given status code
 */
export function getStatusPhrase(statusCode: HttpStatusCode): HttpStatusPhrase | undefined {
  const key = Object.keys(HTTP_STATUS_CODES).find(
    k => HTTP_STATUS_CODES[k as keyof typeof HTTP_STATUS_CODES] === statusCode,
  ) as keyof typeof HTTP_STATUS_PHRASES | undefined

  return key ? HTTP_STATUS_PHRASES[key] : undefined
}
