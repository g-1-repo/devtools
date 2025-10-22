/**
 * Deep clones an object with support for Date, RegExp, and other types
 * More type-safe and performant implementation
 */
export function deepClone<T>(obj: T): T {
  // Handle primitive types and null
  if (obj === null || typeof obj !== 'object')
    return obj

  // Handle Date objects
  if (obj instanceof Date)
    return new Date(obj.getTime()) as T

  // Handle RegExp objects
  if (obj instanceof RegExp)
    return new RegExp(obj.source, obj.flags) as T

  // Handle Arrays
  if (Array.isArray(obj))
    return obj.map(deepClone) as T

  // Handle plain objects
  const cloned = {} as T
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

/**
 * Omits specified keys from an object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj }
  keys.forEach(key => delete result[key])
  return result
}

/**
 * Picks specified keys from an object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

/**
 * Checks if an object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj == null)
    return true
  if (Array.isArray(obj) || typeof obj === 'string')
    return obj.length === 0
  if (obj instanceof Date)
    return false
  return Object.keys(obj).length === 0
}
