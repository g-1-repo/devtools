/**
 * Converts a string to camelCase by removing hyphens, underscores, and spaces,
 * then capitalizing the first letter of each word except the first.
 *
 * @param str - The input string to convert
 * @returns The camelCase version of the input string
 *
 * @example
 * ```typescript
 * toCamelCase('hello world') // 'helloWorld'
 * toCamelCase('my-awesome-function') // 'myAwesomeFunction'
 * toCamelCase('user_name') // 'userName'
 * ```
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
}

// Shared regex pattern for word boundary detection
const WORD_BOUNDARY_REGEX = /[A-Z]{2,}(?=[A-Z][a-z]+\d|\b)|[A-Z]?[a-z]+\d*|[A-Z]|\d+/g

/**
 * Converts a string to kebab-case by splitting on word boundaries and joining with hyphens.
 * Handles camelCase, PascalCase, snake_case, and regular words.
 *
 * @param str - The input string to convert
 * @returns The kebab-case version of the input string
 *
 * @example
 * ```typescript
 * toKebabCase('helloWorld') // 'hello-world'
 * toKebabCase('MyAwesomeFunction') // 'my-awesome-function'
 * toKebabCase('user_name') // 'user-name'
 * ```
 */
export function toKebabCase(str: string): string {
  return str
    .match(WORD_BOUNDARY_REGEX)
    ?.map(x => x.toLowerCase())
    .join('-') || ''
}

/**
 * Converts a string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .match(WORD_BOUNDARY_REGEX)
    ?.map(x => x.toLowerCase())
    .join('_') || ''
}

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^[a-z]/, char => char.toUpperCase())
}

/**
 * Truncates a string to a specified length, adding a suffix if truncated.
 *
 * @param str - The input string to truncate
 * @param length - The maximum length of the result (including suffix)
 * @param suffix - The suffix to append when truncating (defaults to '...')
 * @returns The truncated string with suffix, or original string if within length
 *
 * @example
 * ```typescript
 * truncate('Hello, world!', 10) // 'Hello, w...'
 * truncate('Short', 10) // 'Short'
 * truncate('Long text here', 15, '…') // 'Long text her…'
 * ```
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length)
    return str
  return str.slice(0, length - suffix.length) + suffix
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str)
    return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generates a random string of specified length using nanoid for better performance
 * Falls back to custom charset generation if custom charset is provided
 */
export async function generateRandomString(length: number, charset?: string): Promise<string> {
  // Use nanoid for default case (better performance and security)
  if (!charset) {
    const { nanoid } = await import('nanoid')
    return nanoid(length)
  }

  // Fallback for custom charset
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return result
}

/**
 * Removes all whitespace from a string
 */
export function removeWhitespace(str: string): string {
  return str.replace(/\s/g, '')
}

/**
 * Slugifies a string for URL-friendly format
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
