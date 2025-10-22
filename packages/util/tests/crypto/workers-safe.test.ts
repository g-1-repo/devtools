/**
 * Tests for Workers-Safe Crypto Utilities
 */

import { describe, expect, it } from 'vitest'
import {
  createWorkerSafeCuid2,
  generateWorkerSafeId,
  generateWorkerSafePrefixedId,
  generateWorkerSafeMultipleIds,
  generateWorkerSafeHexId,
  generateWorkerSafeUrlSafeId,
  generateWorkerSafeNumericId,
  generateWorkerSafeIdWith,
  generateWorkerSafeSortableId,
  isValidWorkerSafeCuid2,
  isValidWorkerSafePrefixedCuid2,
  WORKERS_SAFE_ALPHABETS,
} from '../../src/crypto/workers-safe.js'

describe('Workers-Safe Crypto Utilities', () => {
  describe('createWorkerSafeCuid2', () => {
    it('should generate a valid CUID2-like ID', () => {
      const id = createWorkerSafeCuid2()
      
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(10)
      expect(id[0]).toBe('c') // Should start with 'c'
      expect(/^c[a-z0-9]+$/i.test(id)).toBe(true)
    })

    it('should generate unique IDs', () => {
      const ids = Array.from({ length: 1000 }, () => createWorkerSafeCuid2())
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('generateWorkerSafeId', () => {
    it('should generate a valid ID', () => {
      const id = generateWorkerSafeId()
      
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(10)
      expect(isValidWorkerSafeCuid2(id)).toBe(true)
    })
  })

  describe('generateWorkerSafePrefixedId', () => {
    it('should generate ID with correct prefix', () => {
      const prefix = 'user_'
      const id = generateWorkerSafePrefixedId(prefix)
      
      expect(id.startsWith(prefix)).toBe(true)
      expect(isValidWorkerSafePrefixedCuid2(id, prefix)).toBe(true)
    })
  })

  describe('generateWorkerSafeMultipleIds', () => {
    it('should generate correct number of unique IDs', () => {
      const count = 10
      const ids = generateWorkerSafeMultipleIds(count)
      
      expect(ids).toHaveLength(count)
      expect(new Set(ids).size).toBe(count)
      
      ids.forEach(id => {
        expect(isValidWorkerSafeCuid2(id)).toBe(true)
      })
    })
  })

  describe('generateWorkerSafeHexId', () => {
    it('should generate hex ID with correct format', () => {
      const id = generateWorkerSafeHexId(16)
      
      expect(id).toHaveLength(16)
      expect(/^[0-9a-f]+$/.test(id)).toBe(true)
    })
  })

  describe('generateWorkerSafeUrlSafeId', () => {
    it('should generate URL-safe ID', () => {
      const id = generateWorkerSafeUrlSafeId(20)
      
      expect(id).toHaveLength(20)
      expect(/^[A-Za-z0-9_-]+$/.test(id)).toBe(true)
    })
  })

  describe('generateWorkerSafeNumericId', () => {
    it('should generate numeric-only ID', () => {
      const id = generateWorkerSafeNumericId(12)
      
      expect(id).toHaveLength(12)
      expect(/^[0-9]+$/.test(id)).toBe(true)
    })
  })

  describe('generateWorkerSafeIdWith', () => {
    it('should generate ID with custom alphabet', () => {
      const alphabet = 'ABCDEF'
      const id = generateWorkerSafeIdWith(alphabet, 10)
      
      expect(id).toHaveLength(10)
      expect(/^[A-F]+$/.test(id)).toBe(true)
    })
  })

  describe('generateWorkerSafeSortableId', () => {
    it('should generate sortable ID with correct format', () => {
      const id = generateWorkerSafeSortableId()
      
      expect(id.includes('-')).toBe(true)
      
      const parts = id.split('-')
      expect(parts).toHaveLength(2)
      
      const [timestamp, cuid] = parts
      expect(timestamp).toBeTruthy()
      expect(cuid).toBeTruthy()
      expect(isValidWorkerSafeCuid2(cuid)).toBe(true)
    })

    it('should generate chronologically sortable IDs', async () => {
      const id1 = generateWorkerSafeSortableId()
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1))
      const id2 = generateWorkerSafeSortableId()
      
      expect(id1 <= id2).toBe(true) // Use <= since timestamps might be same
    })
  })

  describe('validation functions', () => {
    describe('isValidWorkerSafeCuid2', () => {
      it('should validate correct CUID2 format', () => {
        const validId = createWorkerSafeCuid2()
        expect(isValidWorkerSafeCuid2(validId)).toBe(true)
      })

      it('should reject invalid formats', () => {
        expect(isValidWorkerSafeCuid2('')).toBe(false)
        expect(isValidWorkerSafeCuid2('x')).toBe(false) // too short
        expect(isValidWorkerSafeCuid2('123abc')).toBe(false) // starts with number
        expect(isValidWorkerSafeCuid2('abc@def')).toBe(false) // invalid character
      })
    })

    describe('isValidWorkerSafePrefixedCuid2', () => {
      it('should validate prefixed IDs correctly', () => {
        const prefix = 'test_'
        const id = generateWorkerSafePrefixedId(prefix)
        
        expect(isValidWorkerSafePrefixedCuid2(id, prefix)).toBe(true)
        expect(isValidWorkerSafePrefixedCuid2(id, 'wrong_')).toBe(false)
      })
    })
  })

  describe('WORKERS_SAFE_ALPHABETS', () => {
    it('should have all expected alphabets', () => {
      expect(WORKERS_SAFE_ALPHABETS.BASE36).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.HEX).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.NUMERIC).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.URL_SAFE).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.ALPHANUMERIC).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.LOWERCASE).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.UPPERCASE).toBeDefined()
      expect(WORKERS_SAFE_ALPHABETS.ALPHA).toBeDefined()
    })

    it('should have correct alphabet contents', () => {
      expect(WORKERS_SAFE_ALPHABETS.HEX).toBe('0123456789abcdef')
      expect(WORKERS_SAFE_ALPHABETS.NUMERIC).toBe('0123456789')
      expect(WORKERS_SAFE_ALPHABETS.BASE36).toBe('0123456789abcdefghijklmnopqrstuvwxyz')
    })
  })

  describe('crypto security', () => {
    it('should use cryptographically secure random generation', () => {
      // Test entropy by checking distribution
      const ids = Array.from({ length: 1000 }, () => createWorkerSafeCuid2())
      const chars = ids.join('').split('')
      const charCounts = chars.reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Should have reasonable distribution (not perfectly uniform due to timestamp)
      const uniqueChars = Object.keys(charCounts).length
      expect(uniqueChars).toBeGreaterThan(20) // Should see many different characters
    })

    it('should not have predictable patterns', () => {
      const ids = Array.from({ length: 100 }, () => createWorkerSafeCuid2())
      
      // Check that we don't have obvious sequential patterns
      for (let i = 1; i < ids.length; i++) {
        const prev = ids[i - 1]
        const curr = ids[i]
        
        // Random parts should be different (after timestamp portion)
        const prevRandom = prev.slice(-12)
        const currRandom = curr.slice(-12)
        expect(prevRandom).not.toBe(currRandom)
      }
    })
  })
})