/**
 * Web-specific validation utilities
 * These utilities use browser/Node.js APIs and may not work in all environments
 */

/**
 * Validates a URL using the URL constructor
 * @param url - The URL string to validate
 * @returns true if URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    // Using new URL() for validation only
    void new URL(url)
    return true
  }
  catch {
    return false
  }
}

/**
 * Validates a domain name
 * @param domain - The domain name to validate
 * @returns true if domain is valid, false otherwise
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
  return domainRegex.test(domain)
}

/**
 * Validates a slug (URL-friendly string)
 * @param slug - The slug to validate
 * @returns true if slug is valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug)
}

/**
 * Validates a JSON string
 * @param jsonString - The JSON string to validate
 * @returns true if valid JSON, false otherwise
 */
export function isValidJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString)
    return true
  }
  catch {
    return false
  }
}

/**
 * Validates a base64 encoded string
 * @param base64String - The base64 string to validate
 * @returns true if valid base64, false otherwise
 */
export function isValidBase64(base64String: string): boolean {
  const base64Regex = /^[A-Z0-9+/]*={0,2}$/i
  return base64Regex.test(base64String)
}

/**
 * Validates a semantic version string (semver)
 * @param version - The version string to validate
 * @returns true if valid semver, false otherwise
 */
export function isValidSemver(version: string): boolean {
  const semverRegex = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9a-z-]+(?:\.[0-9a-z-]+)*)?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i
  return semverRegex.test(version)
}
