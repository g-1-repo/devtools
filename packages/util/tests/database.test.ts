import { describe, expect, it } from 'vitest'
import {
  DatabaseQueryError,
  hasMultiple,
  isEmptyArray,
  isExactlyOne,
  QueryNotFoundError,
  paginate,
  takeExactlyOne,
  takeFirst,
  takeFirstOrThrow,
  takeLast,
  takeLastOrThrow,
} from '../src/database/index'

describe('database utilities', () => {
  describe('databaseQueryError', () => {
    it('creates error with message', () => {
      const error = new DatabaseQueryError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('DatabaseQueryError')
      expect(error.code).toBeUndefined()
    })

    it('creates error with message and code', () => {
      const error = new DatabaseQueryError('Test error', 'TEST_CODE')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
    })
  })

  describe('queryNotFoundError', () => {
    it('creates error with default message', () => {
      const error = new QueryNotFoundError()
      expect(error.message).toBe('Record not found')
      expect(error.name).toBe('QueryNotFoundError')
      expect(error.code).toBe('NOT_FOUND')
    })

    it('creates error with custom message', () => {
      const error = new QueryNotFoundError('User not found')
      expect(error.message).toBe('User not found')
      expect(error.code).toBe('NOT_FOUND')
    })
  })

  describe('takeFirst', () => {
    it('returns first element from non-empty array', () => {
      const result = takeFirst([1, 2, 3])
      expect(result).toBe(1)
    })

    it('returns null from empty array', () => {
      const result = takeFirst([])
      expect(result).toBeNull()
    })

    it('works with different data types', () => {
      const result = takeFirst(['a', 'b', 'c'])
      expect(result).toBe('a')
    })
  })

  describe('takeFirstOrThrow', () => {
    it('returns first element from non-empty array', () => {
      const result = takeFirstOrThrow([1, 2, 3])
      expect(result).toBe(1)
    })

    it('throws QueryNotFoundError for empty array with default message', () => {
      expect(() => takeFirstOrThrow([])).toThrow(QueryNotFoundError)
      expect(() => takeFirstOrThrow([])).toThrow('Record not found')
    })

    it('throws QueryNotFoundError with custom message', () => {
      expect(() => takeFirstOrThrow([], 'Custom error')).toThrow('Custom error')
    })
  })

  describe('takeLast', () => {
    it('returns last element from non-empty array', () => {
      const result = takeLast([1, 2, 3])
      expect(result).toBe(3)
    })

    it('returns null from empty array', () => {
      const result = takeLast([])
      expect(result).toBeNull()
    })

    it('returns single element from single-item array', () => {
      const result = takeLast(['only'])
      expect(result).toBe('only')
    })
  })

  describe('takeLastOrThrow', () => {
    it('returns last element from non-empty array', () => {
      const result = takeLastOrThrow([1, 2, 3])
      expect(result).toBe(3)
    })

    it('throws QueryNotFoundError for empty array', () => {
      expect(() => takeLastOrThrow([])).toThrow(QueryNotFoundError)
      expect(() => takeLastOrThrow([])).toThrow('Record not found')
    })

    it('throws QueryNotFoundError with custom message', () => {
      expect(() => takeLastOrThrow([], 'Last record not found')).toThrow('Last record not found')
    })
  })

  describe('takeExactlyOne', () => {
    it('returns single element from single-item array', () => {
      const result = takeExactlyOne([42])
      expect(result).toBe(42)
    })

    it('throws QueryNotFoundError for empty array', () => {
      expect(() => takeExactlyOne([])).toThrow(QueryNotFoundError)
      expect(() => takeExactlyOne([])).toThrow('Record not found')
    })

    it('throws DatabaseQueryError for multiple elements', () => {
      expect(() => takeExactlyOne([1, 2])).toThrow(DatabaseQueryError)
      expect(() => takeExactlyOne([1, 2])).toThrow('Expected exactly one record, but found 2')
    })

    it('throws custom error message for empty array', () => {
      expect(() => takeExactlyOne([], 'User not found')).toThrow('User not found')
    })
  })

  describe('isEmpty', () => {
    it('returns true for empty array', () => {
      expect(isEmptyArray([])).toBe(true)
    })

    it('returns false for non-empty array', () => {
      expect(isEmptyArray([1])).toBe(false)
      expect(isEmptyArray([1, 2, 3])).toBe(false)
    })
  })

  describe('isExactlyOne', () => {
    it('returns true for single-item array', () => {
      expect(isExactlyOne([1])).toBe(true)
    })

    it('returns false for empty array', () => {
      expect(isExactlyOne([])).toBe(false)
    })

    it('returns false for multiple-item array', () => {
      expect(isExactlyOne([1, 2])).toBe(false)
    })
  })

  describe('hasMultiple', () => {
    it('returns true for multiple-item array', () => {
      expect(hasMultiple([1, 2])).toBe(true)
      expect(hasMultiple([1, 2, 3])).toBe(true)
    })

    it('returns false for empty array', () => {
      expect(hasMultiple([])).toBe(false)
    })

    it('returns false for single-item array', () => {
      expect(hasMultiple([1])).toBe(false)
    })
  })

  describe('paginate', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it('paginates with default parameters', () => {
      const result = paginate(data)
      expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('paginates first page', () => {
      const result = paginate(data, 1, 3)
      expect(result.data).toEqual([1, 2, 3])
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 3,
        total: 10,
        totalPages: 4,
        hasNext: true,
        hasPrev: false,
      })
    })

    it('paginates middle page', () => {
      const result = paginate(data, 2, 3)
      expect(result.data).toEqual([4, 5, 6])
      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 3,
        total: 10,
        totalPages: 4,
        hasNext: true,
        hasPrev: true,
      })
    })

    it('paginates last page', () => {
      const result = paginate(data, 4, 3)
      expect(result.data).toEqual([10])
      expect(result.pagination).toEqual({
        page: 4,
        pageSize: 3,
        total: 10,
        totalPages: 4,
        hasNext: false,
        hasPrev: true,
      })
    })

    it('handles empty array', () => {
      const result = paginate([], 1, 5)
      expect(result.data).toEqual([])
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('handles page beyond available data', () => {
      const result = paginate(data, 10, 3)
      expect(result.data).toEqual([])
      expect(result.pagination).toEqual({
        page: 10,
        pageSize: 3,
        total: 10,
        totalPages: 4,
        hasNext: false,
        hasPrev: true,
      })
    })
  })
})
