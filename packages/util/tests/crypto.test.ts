import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALPHABETS,
  clearCache,
  generateHexId,
  generateId,
  generateIdWith,
  generateNumericId,
  generateUrlSafeId,
  getCacheStats,
} from '../src/crypto/index'

describe('crypto utilities', () => {
  beforeEach(() => {
    clearCache()
  })

  describe('generateId', () => {
    it('generates default length ID with default alphabet', () => {
      const id = generateId()
      expect(id).toBeDefined()
      expect(id.length).toBe(16)
      expect(/^[0-9A-Z]+$/i.test(id)).toBe(true)
    })

    it('generates custom length ID', () => {
      const id = generateId(10)
      expect(id.length).toBe(10)
      expect(/^[0-9A-Z]+$/i.test(id)).toBe(true)
    })

    it('generates ID with custom alphabet', () => {
      const alphabet = 'abc123'
      const id = generateId(8, alphabet)
      expect(id.length).toBe(8)
      expect(new RegExp(`^[${alphabet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`).test(id)).toBe(true)
    })

    it('generates different IDs on multiple calls', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateIdWith', () => {
    it('generates ID with specified alphabet and length', () => {
      const alphabet = '0123456789'
      const length = 12
      const id = generateIdWith(alphabet, length)

      expect(id.length).toBe(length)
      expect(/^\d+$/.test(id)).toBe(true)
    })
  })

  describe('generateNumericId', () => {
    it('generates numeric-only ID with default length', () => {
      const id = generateNumericId()
      expect(id.length).toBe(16)
      expect(/^\d+$/.test(id)).toBe(true)
    })

    it('generates numeric-only ID with custom length', () => {
      const id = generateNumericId(8)
      expect(id.length).toBe(8)
      expect(/^\d+$/.test(id)).toBe(true)
    })
  })

  describe('generateHexId', () => {
    it('generates hex-only ID with default length', () => {
      const id = generateHexId()
      expect(id.length).toBe(16)
      expect(/^[0-9a-f]+$/.test(id)).toBe(true)
    })

    it('generates hex-only ID with custom length', () => {
      const id = generateHexId(12)
      expect(id.length).toBe(12)
      expect(/^[0-9a-f]+$/.test(id)).toBe(true)
    })
  })

  describe('generateUrlSafeId', () => {
    it('generates URL-safe ID with default length', () => {
      const id = generateUrlSafeId()
      expect(id.length).toBe(16)
      expect(/^[\w-]+$/.test(id)).toBe(true)
    })

    it('generates URL-safe ID with custom length', () => {
      const id = generateUrlSafeId(20)
      expect(id.length).toBe(20)
      expect(/^[\w-]+$/.test(id)).toBe(true)
    })
  })

  describe('aLPHABETS', () => {
    it('contains expected alphabet constants', () => {
      expect(ALPHABETS.ALPHANUMERIC).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
      expect(ALPHABETS.NUMERIC).toBe('0123456789')
      expect(ALPHABETS.UPPERCASE).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      expect(ALPHABETS.LOWERCASE).toBe('0123456789abcdefghijklmnopqrstuvwxyz')
      expect(ALPHABETS.URL_SAFE).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_')
      expect(ALPHABETS.HEX).toBe('0123456789abcdef')
    })
  })

  describe('cache functionality', () => {
    it('clearCache clears the internal cache', () => {
      // Generate some IDs to populate cache
      generateId(10, 'abc')
      generateId(8, 'xyz')

      const statsBefore = getCacheStats()
      expect(statsBefore.size).toBeGreaterThan(0)

      clearCache()

      const statsAfter = getCacheStats()
      expect(statsAfter.size).toBe(0)
      expect(statsAfter.keys).toEqual([])
    })

    it('getCacheStats returns cache information', () => {
      const stats = getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('keys')
      expect(typeof stats.size).toBe('number')
      expect(Array.isArray(stats.keys)).toBe(true)
    })

    it('cache is populated when using custom parameters', () => {
      const customAlphabet = 'abcdef'
      const customLength = 10

      generateId(customLength, customAlphabet)

      const stats = getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.keys).toContain(`${customAlphabet}:${customLength}`)
    })
  })
})
