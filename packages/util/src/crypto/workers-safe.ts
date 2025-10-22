/**
 * Cloudflare Workers-Safe Crypto Utilities
 *
 * These implementations avoid global scope violations by deferring
 * crypto operations until function call time, making them compatible
 * with Cloudflare Workers runtime restrictions.
 *
 * Use these instead of the regular crypto utilities when deploying
 * to Cloudflare Workers or other edge environments with similar
 * global scope restrictions.
 *
 * @example
 * ```typescript
 * import { createWorkerSafeCuid2, generateWorkerSafeId } from '@g-1/util/crypto/workers-safe';
 *
 * // Generate CUID2-compatible ID (Workers-safe)
 * const id = createWorkerSafeCuid2(); // "ckd3j4k2l0000qzrmn831i7rn"
 *
 * // Generate generic ID (Workers-safe)
 * const genericId = generateWorkerSafeId(); // "ckd3j4k2l0000qzrmn831i7rn"
 * ```
 */

// Base alphabets for encoding
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const HEX_ALPHABET = '0123456789abcdef'
const URL_SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/**
 * Generate cryptographically secure random bytes using Web Crypto API
 * This is Workers-safe as it doesn't perform operations at module load time
 */
function getSecureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * Generate a random string using specified alphabet
 */
function randomStringWithAlphabet(alphabet: string, length: number): string {
  const bytes = getSecureRandomBytes(length)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

/**
 * Generate a timestamp component in base36 for chronological sorting
 */
function getTimestampComponent(): string {
  return Date.now().toString(36)
}

/**
 * Generate a CUID2-compatible ID that's safe for Cloudflare Workers
 *
 * This implementation:
 * - Starts with a letter for HTML ID compatibility
 * - Includes timestamp for rough chronological ordering
 * - Uses secure random generation via Web Crypto API
 * - Avoids global scope crypto operations
 *
 * @returns A CUID2-compatible ID string
 */
export function createWorkerSafeCuid2(): string {
  const prefix = 'c' // Start with letter like CUID2
  const timestamp = getTimestampComponent()
  const random = randomStringWithAlphabet(BASE36_ALPHABET, 12)

  return prefix + timestamp + random
}

/**
 * Generate a generic ID using Workers-safe crypto
 * This is a drop-in replacement for generateDatabaseId from id-utils
 *
 * @returns A cryptographically secure ID string
 */
export function generateWorkerSafeId(): string {
  return createWorkerSafeCuid2()
}

/**
 * Generate a prefixed ID using Workers-safe crypto
 *
 * @param prefix - Prefix to add before the ID
 * @returns A prefixed ID string
 */
export function generateWorkerSafePrefixedId(prefix: string): string {
  return `${prefix}${createWorkerSafeCuid2()}`
}

/**
 * Generate multiple unique IDs at once (Workers-safe)
 *
 * @param count - Number of IDs to generate
 * @returns Array of unique ID strings
 */
export function generateWorkerSafeMultipleIds(count: number): string[] {
  return Array.from({ length: count }, () => createWorkerSafeCuid2())
}

/**
 * Generate a hex ID using Workers-safe crypto
 *
 * @param length - Length of the hex ID (default: 16)
 * @returns A hexadecimal ID string
 */
export function generateWorkerSafeHexId(length: number = 16): string {
  return randomStringWithAlphabet(HEX_ALPHABET, length)
}

/**
 * Generate a URL-safe ID using Workers-safe crypto
 *
 * @param length - Length of the URL-safe ID (default: 16)
 * @returns A URL-safe ID string
 */
export function generateWorkerSafeUrlSafeId(length: number = 16): string {
  return randomStringWithAlphabet(URL_SAFE_ALPHABET, length)
}

/**
 * Generate a numeric ID using Workers-safe crypto
 *
 * @param length - Length of the numeric ID (default: 16)
 * @returns A numeric ID string
 */
export function generateWorkerSafeNumericId(length: number = 16): string {
  return randomStringWithAlphabet('0123456789', length)
}

/**
 * Generate an ID with custom alphabet using Workers-safe crypto
 *
 * @param alphabet - Custom alphabet to use
 * @param length - Length of the ID (default: 16)
 * @returns A random ID string using the custom alphabet
 */
export function generateWorkerSafeIdWith(alphabet: string, length: number = 16): string {
  return randomStringWithAlphabet(alphabet, length)
}

/**
 * Generate a time-based sortable ID using Workers-safe crypto
 *
 * @returns A sortable ID string (timestamp-id)
 */
export function generateWorkerSafeSortableId(): string {
  const timestamp = getTimestampComponent()
  const id = createWorkerSafeCuid2()
  return `${timestamp}-${id}`
}

/**
 * Validate that a string looks like a CUID2
 * (Same validation logic as the original, but included for completeness)
 *
 * @param id - The string to validate
 * @returns True if the string appears to be a valid CUID2
 */
export function isValidWorkerSafeCuid2(id: string): boolean {
  if (typeof id !== 'string')
    return false

  // CUID2s are 2-32 characters, start with a letter, and contain only a-z, A-Z, 0-9
  const cuid2Pattern = /^[a-z][a-z0-9]{1,31}$/i
  return cuid2Pattern.test(id)
}

/**
 * Validate a prefixed CUID2
 *
 * @param id - The prefixed ID to validate
 * @param prefix - The expected prefix
 * @returns True if the ID has the correct prefix and valid CUID2 suffix
 */
export function isValidWorkerSafePrefixedCuid2(id: string, prefix: string): boolean {
  if (typeof id !== 'string' || !id.startsWith(prefix)) {
    return false
  }

  const cuid2Part = id.slice(prefix.length)
  return isValidWorkerSafeCuid2(cuid2Part)
}

/**
 * Alphabet constants for Workers-safe crypto operations
 */
export const WORKERS_SAFE_ALPHABETS = {
  /** Base36: 0-9, a-z */
  BASE36: BASE36_ALPHABET,
  /** Hexadecimal: 0-9, a-f */
  HEX: HEX_ALPHABET,
  /** Numeric only: 0-9 */
  NUMERIC: '0123456789',
  /** URL-safe: 0-9, A-Z, a-z, -, _ */
  URL_SAFE: URL_SAFE_ALPHABET,
  /** Alphanumeric: 0-9, A-Z, a-z */
  ALPHANUMERIC: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  /** Lowercase alphanumeric: 0-9, a-z */
  LOWERCASE: '0123456789abcdefghijklmnopqrstuvwxyz',
  /** Uppercase alphanumeric: 0-9, A-Z */
  UPPERCASE: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  /** Alpha only: A-Z, a-z */
  ALPHA: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
} as const
