/**
 * Standardized API response utilities for Go Corp projects
 * Provides consistent response formats across all APIs and services
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  data: T
  status: number
  message?: string
  timestamp: string
  requestId?: string
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string | Record<string, any>
  status: number
  code?: string
  details?: any
  timestamp: string
  requestId?: string
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Paginated API response structure
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationMeta
}

/**
 * Creates a standardized success API response
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @param message - Optional success message
 * @param requestId - Optional request identifier
 * @returns Formatted API response
 */
export function createApiResponse<T>(
  data: T,
  status: number = 200,
  message?: string,
  requestId?: string,
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    data,
    status,
    timestamp: new Date().toISOString(),
  }

  if (message !== undefined) {
    response.message = message
  }

  if (requestId !== undefined) {
    response.requestId = requestId
  }

  return response
}

/**
 * Creates a standardized error API response
 * @param error - Error message or object
 * @param status - HTTP status code (default: 400)
 * @param code - Optional error code
 * @param details - Optional error details
 * @param requestId - Optional request identifier
 * @returns Formatted API error response
 */
export function createErrorResponse(
  error: string | Record<string, any>,
  status: number = 400,
  code?: string,
  details?: any,
  requestId?: string,
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    error,
    status,
    timestamp: new Date().toISOString(),
  }

  if (code !== undefined) {
    response.code = code
  }

  if (details !== undefined) {
    response.details = details
  }

  if (requestId !== undefined) {
    response.requestId = requestId
  }

  return response
}

/**
 * Creates a paginated API response with metadata
 * @param data - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param message - Optional message
 * @param requestId - Optional request identifier
 * @returns Formatted paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string,
  requestId?: string,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)

  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }

  const response: PaginatedResponse<T> = {
    data,
    status: 200,
    timestamp: new Date().toISOString(),
    pagination,
  }

  if (message !== undefined) {
    response.message = message
  }

  if (requestId !== undefined) {
    response.requestId = requestId
  }

  return response
}

/**
 * Common HTTP status codes for API responses
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

/**
 * Common error codes for Go Corp APIs
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_REQUEST_FORMAT: 'INVALID_REQUEST_FORMAT',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

/**
 * Creates common error responses with standard codes
 */
export const CommonErrors = {
  badRequest: (message: string, details?: any, requestId?: string) =>
    createErrorResponse(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details, requestId),

  unauthorized: (message: string = 'Authentication required', requestId?: string) =>
    createErrorResponse(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTHENTICATION_FAILED, undefined, requestId),

  forbidden: (message: string = 'Access denied', requestId?: string) =>
    createErrorResponse(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.AUTHORIZATION_FAILED, undefined, requestId),

  notFound: (resource: string = 'Resource', requestId?: string) =>
    createErrorResponse(`${resource} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND, undefined, requestId),

  conflict: (message: string, requestId?: string) =>
    createErrorResponse(message, HTTP_STATUS.CONFLICT, ERROR_CODES.RESOURCE_CONFLICT, undefined, requestId),

  rateLimited: (message: string = 'Rate limit exceeded', requestId?: string) =>
    createErrorResponse(message, HTTP_STATUS.RATE_LIMITED, ERROR_CODES.RATE_LIMIT_EXCEEDED, undefined, requestId),

  internalError: (message: string = 'Internal server error', details?: any, requestId?: string) =>
    createErrorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, details, requestId),
}

/**
 * Type guard to check if response is an error response
 * @param response - The response to check
 * @returns true if the response is an error response
 */
export function isErrorResponse(response: any): response is ApiErrorResponse {
  return Boolean(response && typeof response === 'object' && 'error' in response)
}

/**
 * Type guard to check if response is a paginated response
 * @param response - The response to check
 * @returns true if the response is a paginated response
 */
export function isPaginatedResponse(response: any): response is PaginatedResponse {
  return Boolean(response && typeof response === 'object' && 'pagination' in response)
}
