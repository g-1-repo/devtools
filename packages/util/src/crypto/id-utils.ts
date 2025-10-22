/**
 * Enhanced ID generation and validation utilities using CUID2
 *
 * CUID2s are collision resistant, URL-safe, and horizontally scalable.
 * Perfect for database records, API keys, and distributed systems.
 */

import { createId } from '@paralleldrive/cuid2'

/**
 * Generate a new CUID2 ID for database records
 *
 * CUID2s are:
 * - URL-safe
 * - Collision resistant
 * - Horizontally scalable
 * - Case sensitive
 * - Around 24 characters long
 *
 * @returns A new CUID2 string
 */
export function generateDatabaseId(): string {
  return createId()
}

/**
 * Generate a CUID2 with a custom prefix for easier identification
 *
 * @param prefix - Optional prefix to add before the CUID2 (e.g., 'user_', 'org_')
 * @returns A prefixed CUID2 string
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}${createId()}`
}

/**
 * Generate multiple unique IDs at once
 *
 * @param count - Number of IDs to generate
 * @returns Array of unique CUID2 strings
 */
export function generateMultipleIds(count: number): string[] {
  return Array.from({ length: count }, () => createId())
}

/**
 * Generate a short ID (10 characters) for less critical use cases
 *
 * @returns A shorter CUID2 string (10 characters)
 */
export function generateShortId(): string {
  return createId().slice(0, 10)
}

/**
 * Generate a CUID2 with custom length
 *
 * @param length - Desired length (min 2, max 24)
 * @returns A CUID2 string of specified length
 */
export function generateIdWithLength(length: number): string {
  if (length < 2)
    length = 2
  if (length > 24)
    length = 24

  const fullId = createId()
  return fullId.slice(0, length)
}

/**
 * Validate that a string looks like a CUID2
 *
 * Note: This is a basic format check, not cryptographic validation
 *
 * @param id - The string to validate
 * @returns True if the string appears to be a valid CUID2
 */
export function isValidCuid2(id: string): boolean {
  if (typeof id !== 'string')
    return false

  // CUID2s are 2-24 characters, start with a letter, and contain only a-z, A-Z, 0-9
  const cuid2Pattern = /^[a-z][a-z0-9]{1,23}$/i
  return cuid2Pattern.test(id)
}

/**
 * Validate a prefixed CUID2
 *
 * @param id - The prefixed ID to validate
 * @param prefix - The expected prefix
 * @returns True if the ID has the correct prefix and valid CUID2 suffix
 */
export function isValidPrefixedCuid2(id: string, prefix: string): boolean {
  if (typeof id !== 'string' || !id.startsWith(prefix)) {
    return false
  }

  const cuid2Part = id.slice(prefix.length)
  return isValidCuid2(cuid2Part)
}

/**
 * Extract the CUID2 part from a prefixed ID
 *
 * @param prefixedId - The prefixed ID
 * @param prefix - The prefix to remove
 * @returns The CUID2 part without prefix, or null if invalid
 */
export function extractCuid2FromPrefixed(prefixedId: string, prefix: string): string | null {
  if (!isValidPrefixedCuid2(prefixedId, prefix)) {
    return null
  }

  return prefixedId.slice(prefix.length)
}

/**
 * Generate a time-based sortable ID (timestamp + CUID2)
 * Useful for IDs that need to be chronologically sortable
 *
 * @returns A sortable ID string (timestamp-cuid2)
 */
export function generateSortableId(): string {
  const timestamp = Date.now().toString(36) // Base36 timestamp
  const id = createId()
  return `${timestamp}-${id}`
}

/**
 * Parse a sortable ID to extract timestamp and ID parts
 *
 * @param sortableId - The sortable ID to parse
 * @returns Object with timestamp and id, or null if invalid
 */
export function parseSortableId(sortableId: string): { timestamp: number, id: string } | null {
  if (typeof sortableId !== 'string')
    return null

  const parts = sortableId.split('-')
  if (parts.length !== 2)
    return null

  const timestampStr = parts[0]
  const id = parts[1]

  if (!timestampStr || !id)
    return null

  const timestamp = Number.parseInt(timestampStr, 36)

  if (Number.isNaN(timestamp) || !isValidCuid2(id)) {
    return null
  }

  return { timestamp, id }
}

/**
 * Batch ID generation with validation
 * Useful for bulk operations
 *
 * @param count - Number of IDs to generate
 * @param prefix - Optional prefix for all IDs
 * @returns Object with generated IDs and metadata
 */
export function generateBatchIds(count: number, prefix?: string): {
  ids: string[]
  count: number
  prefix: string | undefined
  generatedAt: string
} {
  const ids = Array.from({ length: count }, () =>
    prefix ? generatePrefixedId(prefix) : createId())

  return {
    ids,
    count: ids.length,
    prefix,
    generatedAt: new Date().toISOString(),
  }
}
