import { describe, expect, it } from 'vitest'
import {
  COLORS,
  incrementVersion,
} from '../src/node/git-utils.js'

describe('git Utilities', () => {
  describe('incrementVersion', () => {
    it('should increment patch version', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4')
    })

    it('should increment minor version', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0')
    })

    it('should increment major version', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0')
    })

    it('should handle single digit versions', () => {
      expect(incrementVersion('0.0.1', 'patch')).toBe('0.0.2')
      expect(incrementVersion('0.1.0', 'minor')).toBe('0.2.0')
      expect(incrementVersion('1.0.0', 'major')).toBe('2.0.0')
    })
  })

  describe('cOLORS', () => {
    it('should have all required color constants', () => {
      expect(COLORS.reset).toBe('\x1B[0m')
      expect(COLORS.red).toBe('\x1B[31m')
      expect(COLORS.green).toBe('\x1B[32m')
      expect(COLORS.yellow).toBe('\x1B[33m')
    })
  })

  // Note: Most git utilities require a git repository and would need more complex mocking
  // These tests focus on the pure functions that don't require git commands
})
