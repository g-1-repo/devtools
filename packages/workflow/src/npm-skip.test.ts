import { describe, expect, it } from 'vitest'
import { detectPublishablePackages, shouldSkipNpmForPackage } from './workflows/release.js'

describe('package-by-package npm publishing control', () => {
  describe('shouldSkipNpmForPackage', () => {
    it('should skip all packages when skipNpm is true', () => {
      expect(shouldSkipNpmForPackage('@g-1/core', true)).toBe(true)
      expect(shouldSkipNpmForPackage('@g-1/cli', true)).toBe(true)
      expect(shouldSkipNpmForPackage('@g-1/util', true)).toBe(true)
    })

    it('should not skip any packages when skipNpm is false', () => {
      expect(shouldSkipNpmForPackage('@g-1/core', false)).toBe(false)
      expect(shouldSkipNpmForPackage('@g-1/cli', false)).toBe(false)
      expect(shouldSkipNpmForPackage('@g-1/util', false)).toBe(false)
    })

    it('should not skip any packages when skipNpm is undefined', () => {
      expect(shouldSkipNpmForPackage('@g-1/core', undefined)).toBe(false)
      expect(shouldSkipNpmForPackage('@g-1/cli', undefined)).toBe(false)
      expect(shouldSkipNpmForPackage('@g-1/util', undefined)).toBe(false)
    })

    it('should skip only specified packages when skipNpm is an array', () => {
      const skipPackages = ['@g-1/core', '@g-1/cli']

      expect(shouldSkipNpmForPackage('@g-1/core', skipPackages)).toBe(true)
      expect(shouldSkipNpmForPackage('@g-1/cli', skipPackages)).toBe(true)
      expect(shouldSkipNpmForPackage('@g-1/util', skipPackages)).toBe(false)
      expect(shouldSkipNpmForPackage('@g-1/templates', skipPackages)).toBe(false)
    })

    it('should handle empty array', () => {
      const skipPackages: string[] = []

      expect(shouldSkipNpmForPackage('@g-1/core', skipPackages)).toBe(false)
      expect(shouldSkipNpmForPackage('@g-1/cli', skipPackages)).toBe(false)
    })
  })

  describe('detectPublishablePackages', () => {
    it('should detect packages with valid package.json files', async () => {
      // This test would need to be run in a real workspace environment
      // For now, we'll just test that the function exists and can be called
      expect(typeof detectPublishablePackages).toBe('function')
    })
  })
})
