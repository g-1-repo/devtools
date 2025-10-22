/**
 * Crypto Utilities
 *
 * Provides optimized ID generation utilities with caching for better performance.
 * Uses nanoid under the hood for cryptographically secure random ID generation.
 *
 * @example
 * ```typescript
 * import { generateId, generateIdWith } from '@go-corp/utils/crypto';
 *
 * // Generate default ID (16 chars, alphanumeric)
 * const id = generateId(); // "Uakgb_J5m9g-0JDM"
 *
 * // Generate custom length ID
 * const shortId = generateId(8); // "B2n4K7w1"
 *
 * // Generate with custom alphabet
 * const numericId = generateIdWith('0123456789', 10); // "8461039271"
 * ```
 */

import { customAlphabet } from 'nanoid'

// Cache for commonly used alphabet/length combinations
const nanoIdCache = new Map<string, () => string>()

// Default configuration
const DEFAULT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const DEFAULT_LENGTH = 16

// Pre-create the most common generator to avoid cache lookup overhead
const defaultGenerator = customAlphabet(DEFAULT_ALPHABET, DEFAULT_LENGTH)

/**
 * Generate a random ID with default settings (16 chars, alphanumeric)
 *
 * This function is optimized with caching for better performance.
 * Multiple calls with the same parameters will reuse the same generator.
 *
 * @param length - Length of the generated ID (default: 16)
 * @param alphabet - Characters to use for ID generation (default: alphanumeric)
 * @returns A randomly generated ID string
 */
export function generateId(
  length: number = DEFAULT_LENGTH,
  alphabet: string = DEFAULT_ALPHABET,
): string {
  // Fast path for default parameters
  if (length === DEFAULT_LENGTH && alphabet === DEFAULT_ALPHABET) {
    return defaultGenerator()
  }

  // Cache key for custom parameters
  const cacheKey = `${alphabet}:${length}`
  let generator = nanoIdCache.get(cacheKey)

  if (!generator) {
    generator = customAlphabet(alphabet, length)
    nanoIdCache.set(cacheKey, generator)
  }

  return generator()
}

/**
 * Generate a random ID with custom alphabet and length
 *
 * This is a more explicit version of generateId for better readability
 * when using custom parameters.
 *
 * @param alphabet - Characters to use for ID generation
 * @param length - Length of the generated ID
 * @returns A randomly generated ID string
 */
export function generateIdWith(alphabet: string, length: number): string {
  return generateId(length, alphabet)
}

/**
 * Common alphabet presets for convenience
 */
export const ALPHABETS = {
  /** Alphanumeric: 0-9, A-Z, a-z */
  ALPHANUMERIC: DEFAULT_ALPHABET,
  /** Numeric only: 0-9 */
  NUMERIC: '0123456789',
  /** Uppercase alphanumeric: 0-9, A-Z */
  UPPERCASE: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  /** Lowercase alphanumeric: 0-9, a-z */
  LOWERCASE: '0123456789abcdefghijklmnopqrstuvwxyz',
  /** URL-safe: 0-9, A-Z, a-z, -, _ */
  URL_SAFE: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_',
  /** Hexadecimal: 0-9, a-f */
  HEX: '0123456789abcdef',
} as const

/**
 * Generate a numeric-only ID
 *
 * @param length - Length of the generated ID (default: 16)
 * @returns A numeric ID string
 */
export function generateNumericId(length: number = DEFAULT_LENGTH): string {
  return generateId(length, ALPHABETS.NUMERIC)
}

/**
 * Generate a hexadecimal ID
 *
 * @param length - Length of the generated ID (default: 16)
 * @returns A hexadecimal ID string
 */
export function generateHexId(length: number = DEFAULT_LENGTH): string {
  return generateId(length, ALPHABETS.HEX)
}

/**
 * Generate a URL-safe ID (includes hyphens and underscores)
 *
 * @param length - Length of the generated ID (default: 16)
 * @returns A URL-safe ID string
 */
export function generateUrlSafeId(length: number = DEFAULT_LENGTH): string {
  return generateId(length, ALPHABETS.URL_SAFE)
}

/**
 * Clear the internal cache
 *
 * Useful for memory management in long-running processes or tests.
 */
export function clearCache(): void {
  nanoIdCache.clear()
}

/**
 * Get cache statistics for debugging
 *
 * @returns Object with cache size information
 */
export function getCacheStats(): { size: number, keys: string[] } {
  return {
    size: nanoIdCache.size,
    keys: Array.from(nanoIdCache.keys()),
  }
}

// Export CUID2-based ID utilities
export * from './id-utils.js'

// Export Workers-safe crypto utilities
export * from './workers-safe.js'
