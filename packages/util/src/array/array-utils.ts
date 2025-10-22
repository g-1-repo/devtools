/**
 * Removes duplicate values from an array, preserving the first occurrence of each value.
 * Uses strict equality (===) for comparison.
 *
 * @param array - The input array to deduplicate
 * @returns A new array with unique values in order of first appearance
 *
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 1]) // [1, 2, 3]
 * unique(['a', 'b', 'a', 'c']) // ['a', 'b', 'c']
 * unique([{id: 1}, {id: 2}, {id: 1}]) // [{id: 1}, {id: 2}, {id: 1}] (objects compared by reference)
 * ```
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

/**
 * Groups array items by a key function, creating an object with keys as group identifiers
 * and values as arrays of items belonging to each group.
 *
 * @param array - The input array to group
 * @param keyFn - Function that returns the grouping key for each item
 * @returns An object with grouped items
 *
 * @example
 * ```typescript
 * const users = [{name: 'Alice', role: 'admin'}, {name: 'Bob', role: 'user'}, {name: 'Charlie', role: 'admin'}]
 * groupBy(users, u => u.role)
 * // { admin: [{name: 'Alice', role: 'admin'}, {name: 'Charlie', role: 'admin'}], user: [{name: 'Bob', role: 'user'}] }
 *
 * groupBy([1, 2, 3, 4, 5], n => n % 2 === 0 ? 'even' : 'odd')
 * // { odd: [1, 3, 5], even: [2, 4] }
 * ```
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item)
    if (!groups[key])
      groups[key] = []
    groups[key]!.push(item)
    return groups
  }, {} as Record<K, T[]>)
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0)
    return []
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Shuffles an array randomly using the Fisher-Yates shuffle algorithm.
 * Returns a new array without modifying the original.
 *
 * @param array - The input array to shuffle
 * @returns A new array with elements in random order
 *
 * @example
 * ```typescript
 * shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4] (random order)
 * shuffle(['a', 'b', 'c']) // ['c', 'a', 'b'] (random order)
 * ```
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
