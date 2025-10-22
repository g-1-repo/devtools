/**
 * Database Utilities
 *
 * Generic database utility functions that work with any ORM or database library.
 * These utilities help with common database operations and result handling.
 *
 * @example
 * ```typescript
 * import { takeFirst, takeFirstOrThrow } from '@go-corp/utils/database';
 *
 * // Get first result or null
 * const user = takeFirst(await db.select().from(users));
 *
 * // Get first result or throw error
 * const user = takeFirstOrThrow(
 *   await db.select().from(users).where(eq(users.id, userId)),
 *   'User not found'
 * );
 * ```
 */

/**
 * Generic error class for database query operations
 */
export class DatabaseQueryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'DatabaseQueryError'
  }
}

/**
 * Error thrown when a required database record is not found in query results
 */
export class QueryNotFoundError extends DatabaseQueryError {
  constructor(message: string = 'Record not found') {
    super(message, 'NOT_FOUND')
    this.name = 'QueryNotFoundError'
  }
}

/**
 * Get the first element of an array or return null
 *
 * This is useful when working with database queries that return arrays
 * but you only need the first result.
 *
 * @param values - Array of values from database query
 * @returns First element or null if array is empty
 */
export function takeFirst<T>(values: T[]): T | null {
  return values.length > 0 ? values[0]! : null
}

/**
 * Get the first element of an array or throw an error
 *
 * This is useful when you expect exactly one result from a database query
 * and want to throw an error if no results are found.
 *
 * @param values - Array of values from database query
 * @param errorMessage - Custom error message (optional)
 * @returns First element
 * @throws QueryNotFoundError if array is empty
 */
export function takeFirstOrThrow<T>(
  values: T[],
  errorMessage: string = 'Record not found',
): T {
  const value = takeFirst(values)
  if (value === null) {
    throw new QueryNotFoundError(errorMessage)
  }
  return value
}

/**
 * Get the last element of an array or return null
 *
 * @param values - Array of values from database query
 * @returns Last element or null if array is empty
 */
export function takeLast<T>(values: T[]): T | null {
  return values.length > 0 ? values[values.length - 1]! : null
}

/**
 * Get the last element of an array or throw an error
 *
 * @param values - Array of values from database query
 * @param errorMessage - Custom error message (optional)
 * @returns Last element
 * @throws QueryNotFoundError if array is empty
 */
export function takeLastOrThrow<T>(
  values: T[],
  errorMessage: string = 'Record not found',
): T {
  const value = takeLast(values)
  if (value === null) {
    throw new QueryNotFoundError(errorMessage)
  }
  return value
}

/**
 * Ensure exactly one result or throw an error
 *
 * This is useful when you expect exactly one result and want to throw
 * an error for both empty results and multiple results.
 *
 * @param values - Array of values from database query
 * @param errorMessage - Custom error message (optional)
 * @returns The single element
 * @throws QueryNotFoundError if array is empty
 * @throws DatabaseQueryError if array has more than one element
 */
export function takeExactlyOne<T>(
  values: T[],
  errorMessage: string = 'Record not found',
): T {
  if (values.length === 0) {
    throw new QueryNotFoundError(errorMessage)
  }
  if (values.length > 1) {
    throw new DatabaseQueryError(`Expected exactly one record, but found ${values.length}`)
  }
  return values[0]!
}

/**
 * Check if a database result set is empty
 *
 * @param values - Array of values from database query
 * @returns True if array is empty
 */
export function isEmptyArray<T>(values: T[]): boolean {
  return values.length === 0
}

/**
 * Check if a database result set has exactly one element
 *
 * @param values - Array of values from database query
 * @returns True if array has exactly one element
 */
export function isExactlyOne<T>(values: T[]): boolean {
  return values.length === 1
}

/**
 * Check if a database result set has multiple elements
 *
 * @param values - Array of values from database query
 * @returns True if array has more than one element
 */
export function hasMultiple<T>(values: T[]): boolean {
  return values.length > 1
}

/**
 * Paginate results with offset and limit
 *
 * @param values - Array of values to paginate
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Object with paginated results and metadata
 */
export function paginate<T>(
  values: T[],
  page: number = 1,
  pageSize: number = 10,
): {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
} {
  const total = values.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const data = values.slice(offset, offset + pageSize)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}
