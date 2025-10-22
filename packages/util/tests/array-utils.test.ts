import { describe, expect, it } from 'vitest'
import { chunk, groupBy, shuffle, unique } from '../src/array'

describe('array utilities', () => {
  describe('unique', () => {
    it('removes duplicate primitive values', () => {
      expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3])
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
      expect(unique([true, false, true])).toEqual([true, false])
    })

    it('preserves order of first occurrence', () => {
      expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
    })

    it('handles empty arrays', () => {
      expect(unique([])).toEqual([])
    })

    it('handles arrays with no duplicates', () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3])
    })

    it('compares objects by reference', () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      const obj3 = { id: 1 } // different reference than obj1
      
      expect(unique([obj1, obj2, obj1, obj3])).toEqual([obj1, obj2, obj3])
    })
  })

  describe('groupBy', () => {
    it('groups objects by property', () => {
      const users = [
        { name: 'Alice', role: 'admin' },
        { name: 'Bob', role: 'user' },
        { name: 'Charlie', role: 'admin' }
      ]
      
      const result = groupBy(users, u => u.role)
      
      expect(result).toEqual({
        admin: [
          { name: 'Alice', role: 'admin' },
          { name: 'Charlie', role: 'admin' }
        ],
        user: [
          { name: 'Bob', role: 'user' }
        ]
      })
    })

    it('groups primitives by function result', () => {
      const numbers = [1, 2, 3, 4, 5, 6]
      const result = groupBy(numbers, n => n % 2 === 0 ? 'even' : 'odd')
      
      expect(result).toEqual({
        odd: [1, 3, 5],
        even: [2, 4, 6]
      })
    })

    it('handles empty arrays', () => {
      expect(groupBy([], (x: any) => x)).toEqual({})
    })

    it('handles single item', () => {
      expect(groupBy([5], n => n > 3 ? 'big' : 'small')).toEqual({
        big: [5]
      })
    })
  })

  describe('chunk', () => {
    it('splits array into chunks of specified size', () => {
      expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]])
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })

    it('handles chunk size larger than array', () => {
      expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]])
    })

    it('handles empty arrays', () => {
      expect(chunk([], 3)).toEqual([])
    })

    it('handles chunk size of 1', () => {
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
    })

    it('returns empty array for non-positive chunk size', () => {
      expect(chunk([1, 2, 3], 0)).toEqual([])
      expect(chunk([1, 2, 3], -1)).toEqual([])
    })
  })

  describe('shuffle', () => {
    it('returns array with same length', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffle(original)
      
      expect(shuffled).toHaveLength(original.length)
    })

    it('contains all original elements', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffle(original)
      
      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('does not modify original array', () => {
      const original = [1, 2, 3, 4, 5]
      const originalCopy = [...original]
      shuffle(original)
      
      expect(original).toEqual(originalCopy)
    })

    it('handles empty arrays', () => {
      expect(shuffle([])).toEqual([])
    })

    it('handles single-item arrays', () => {
      expect(shuffle([42])).toEqual([42])
    })

    it('produces different results (probabilistic test)', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const shuffled1 = shuffle(original)
      const shuffled2 = shuffle(original)
      
      // Very unlikely to be identical for a 10-element array
      // (probability is 1/10! ≈ 2.75e-7)
      expect(shuffled1).not.toEqual(shuffled2)
    })
  })
})