import { describe, expect, it } from 'vitest'
import { clamp, degToRad, percentage, radToDeg, randomBetween, roundTo } from '../src/math'

describe('math utilities', () => {
  describe('clamp', () => {
    it('clamps values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('handles edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
      expect(clamp(5, 5, 5)).toBe(5) // min equals max
    })

    it('works with negative ranges', () => {
      expect(clamp(-15, -10, -5)).toBe(-10)
      expect(clamp(-7, -10, -5)).toBe(-7)
      expect(clamp(-3, -10, -5)).toBe(-5)
    })

    it('works with decimal values', () => {
      expect(clamp(2.5, 0, 5)).toBe(2.5)
      expect(clamp(-0.5, 0, 5)).toBe(0)
      expect(clamp(5.5, 0, 5)).toBe(5)
    })
  })

  describe('randomBetween', () => {
    it('generates numbers within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomBetween(1, 10)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
      }
    })

    it('handles single value range', () => {
      expect(randomBetween(5, 5)).toBe(5)
    })

    it('works with negative ranges', () => {
      for (let i = 0; i < 50; i++) {
        const result = randomBetween(-10, -1)
        expect(result).toBeGreaterThanOrEqual(-10)
        expect(result).toBeLessThanOrEqual(-1)
      }
    })

    it('handles reversed min/max (should swap them)', () => {
      for (let i = 0; i < 50; i++) {
        const result = randomBetween(10, 1) // reversed
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('roundTo', () => {
    it('rounds to specified decimal places', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14)
      expect(roundTo(3.14159, 4)).toBe(3.1416)
      expect(roundTo(3.14159, 0)).toBe(3)
    })

    it('handles negative numbers', () => {
      expect(roundTo(-3.14159, 2)).toBe(-3.14)
      expect(roundTo(-3.16159, 2)).toBe(-3.16)
    })

    it('handles whole numbers', () => {
      expect(roundTo(5, 2)).toBe(5)
      expect(roundTo(5.0, 2)).toBe(5)
    })

    it('handles very small numbers', () => {
      expect(roundTo(0.123456789, 5)).toBe(0.12346)
      expect(roundTo(0.000001, 6)).toBe(0.000001)
    })
  })

  describe('percentage', () => {
    it('calculates percentage correctly', () => {
      expect(percentage(25, 100)).toBe(25)
      expect(percentage(50, 200)).toBe(25)
      expect(percentage(1, 3)).toBeCloseTo(33.33, 1)
    })

    it('handles zero values', () => {
      expect(percentage(0, 100)).toBe(0)
      expect(percentage(50, 0)).toBe(Infinity)
    })

    it('handles decimal values', () => {
      expect(percentage(2.5, 10)).toBe(25)
      expect(percentage(1.5, 6)).toBe(25)
    })

    it('can exceed 100%', () => {
      expect(percentage(150, 100)).toBe(150)
      expect(percentage(300, 200)).toBe(150)
    })
  })

  describe('degToRad', () => {
    it('converts degrees to radians', () => {
      expect(degToRad(0)).toBe(0)
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10)
      expect(degToRad(180)).toBeCloseTo(Math.PI, 10)
      expect(degToRad(360)).toBeCloseTo(2 * Math.PI, 10)
    })

    it('handles negative degrees', () => {
      expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2, 10)
      expect(degToRad(-180)).toBeCloseTo(-Math.PI, 10)
    })

    it('handles decimal degrees', () => {
      expect(degToRad(45)).toBeCloseTo(Math.PI / 4, 10)
      expect(degToRad(30)).toBeCloseTo(Math.PI / 6, 10)
    })
  })

  describe('radToDeg', () => {
    it('converts radians to degrees', () => {
      expect(radToDeg(0)).toBe(0)
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 10)
      expect(radToDeg(Math.PI)).toBeCloseTo(180, 10)
      expect(radToDeg(2 * Math.PI)).toBeCloseTo(360, 10)
    })

    it('handles negative radians', () => {
      expect(radToDeg(-Math.PI / 2)).toBeCloseTo(-90, 10)
      expect(radToDeg(-Math.PI)).toBeCloseTo(-180, 10)
    })

    it('handles decimal radians', () => {
      expect(radToDeg(Math.PI / 4)).toBeCloseTo(45, 10)
      expect(radToDeg(Math.PI / 6)).toBeCloseTo(30, 10)
    })
  })

  describe('deg/rad round-trip conversion', () => {
    it('maintains precision in round-trip conversions', () => {
      const testDegrees = [0, 30, 45, 90, 120, 180, 270, 360]
      
      testDegrees.forEach(deg => {
        const rad = degToRad(deg)
        const backToDeg = radToDeg(rad)
        expect(backToDeg).toBeCloseTo(deg, 10)
      })
    })
  })
})