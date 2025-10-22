import { describe, expect, it } from 'vitest'
import { isValidEmail, isValidPhone, isValidUrl, isValidUUID } from '../src/validation'

describe('validation utilities', () => {
  describe('isValidEmail', () => {
    it('validates correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.email@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.org')).toBe(true)
      expect(isValidEmail('123@numbers.com')).toBe(true)
    })

    it('rejects invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@domain')).toBe(false)
      expect(isValidEmail('user name@example.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('user@.com')).toBe(false)
      expect(isValidEmail('user@domain.')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('https://sub.example.com/path?query=1')).toBe(true)
      expect(isValidUrl('ftp://files.example.com')).toBe(true)
      expect(isValidUrl('https://example.com:8080')).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('://missing-protocol')).toBe(false)
      expect(isValidUrl('https://')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('validates US phone number formats', () => {
      expect(isValidPhone('1234567890')).toBe(true)
      expect(isValidPhone('123-456-7890')).toBe(true)
      expect(isValidPhone('123.456.7890')).toBe(true)
      expect(isValidPhone('123 456 7890')).toBe(true)
      expect(isValidPhone('(123) 456-7890')).toBe(true)
      expect(isValidPhone('+1 123 456 7890')).toBe(true)
      expect(isValidPhone('1-123-456-7890')).toBe(true)
    })

    it('rejects invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false)
      expect(isValidPhone('12345678901234')).toBe(false)
      expect(isValidPhone('abc-def-ghij')).toBe(false)
      expect(isValidPhone('')).toBe(false)
      expect(isValidPhone('+44 20 1234 5678')).toBe(false) // UK format
    })
  })

  describe('isValidUUID', () => {
    it('validates correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
      expect(isValidUUID('6ba7b811-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
      expect(isValidUUID('AAAAAAAA-AAAA-5AAA-AAAA-AAAAAAAAAAAA')).toBe(true)
    })

    it('accepts both uppercase and lowercase', () => {
      const lowerUuid = '550e8400-e29b-41d4-a716-446655440000'
      const upperUuid = '550E8400-E29B-41D4-A716-446655440000'
      
      expect(isValidUUID(lowerUuid)).toBe(true)
      expect(isValidUUID(upperUuid)).toBe(true)
    })

    it('rejects invalid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false) // too short
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false) // too long
      expect(isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false) // no hyphens
      expect(isValidUUID('gggggggg-gggg-gggg-gggg-gggggggggggg')).toBe(false) // invalid hex
      expect(isValidUUID('')).toBe(false)
      expect(isValidUUID('123e4567-e89b-62d3-a456-426614174000')).toBe(false) // invalid version
      expect(isValidUUID('123e4567-e89b-12d3-f456-426614174000')).toBe(false) // invalid variant
    })
  })
})