import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  isDev,
  isProd,
  isTest,
  getEnv,
  requireEnv,
  getEnvNumber,
  getEnvBoolean,
  getEnvJson,
  validateEnv,
  loadEnvConfig,
  CommonEnvVars
} from '../src/env'

describe('Environment utilities', () => {
  const originalEnv = process.env
  
  beforeEach(() => {
    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv }
  })
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('Environment detection', () => {
    it('detects development environment', () => {
      process.env.NODE_ENV = 'development'
      expect(isDev()).toBe(true)
      expect(isProd()).toBe(false)
      expect(isTest()).toBe(false)
    })

    it('detects production environment', () => {
      process.env.NODE_ENV = 'production'
      expect(isDev()).toBe(false)
      expect(isProd()).toBe(true)
      expect(isTest()).toBe(false)
    })

    it('detects test environment', () => {
      process.env.NODE_ENV = 'test'
      expect(isDev()).toBe(false)
      expect(isProd()).toBe(false)
      expect(isTest()).toBe(true)
    })
  })

  describe('getEnv', () => {
    it('retrieves environment variables', () => {
      process.env.TEST_VAR = 'test-value'
      expect(getEnv('TEST_VAR')).toBe('test-value')
    })

    it('returns default value when variable is not set', () => {
      expect(getEnv('NON_EXISTENT_VAR', 'default')).toBe('default')
    })

    it('returns undefined when variable is not set and no default', () => {
      expect(getEnv('NON_EXISTENT_VAR')).toBeUndefined()
    })
  })

  describe('requireEnv', () => {
    it('returns environment variable when it exists', () => {
      process.env.REQUIRED_VAR = 'required-value'
      expect(requireEnv('REQUIRED_VAR')).toBe('required-value')
    })

    it('throws error when required variable is missing', () => {
      expect(() => requireEnv('MISSING_VAR')).toThrow(
        'Environment variable MISSING_VAR is required but not set'
      )
    })
  })

  describe('getEnvNumber', () => {
    it('converts string to number', () => {
      process.env.PORT = '3000'
      expect(getEnvNumber('PORT')).toBe(3000)
    })

    it('returns default value when variable is not set', () => {
      expect(getEnvNumber('MISSING_PORT', 8080)).toBe(8080)
    })

    it('throws error for invalid numbers', () => {
      process.env.INVALID_PORT = 'not-a-number'
      expect(() => getEnvNumber('INVALID_PORT')).toThrow(
        'Environment variable INVALID_PORT must be a number, got: not-a-number'
      )
    })
  })

  describe('getEnvBoolean', () => {
    it('converts true values correctly', () => {
      process.env.ENABLE_FEATURE = 'true'
      expect(getEnvBoolean('ENABLE_FEATURE')).toBe(true)

      process.env.ENABLE_FEATURE = '1'
      expect(getEnvBoolean('ENABLE_FEATURE')).toBe(true)

      process.env.ENABLE_FEATURE = 'yes'
      expect(getEnvBoolean('ENABLE_FEATURE')).toBe(true)
    })

    it('converts false values correctly', () => {
      process.env.DISABLE_FEATURE = 'false'
      expect(getEnvBoolean('DISABLE_FEATURE')).toBe(false)

      process.env.DISABLE_FEATURE = '0'
      expect(getEnvBoolean('DISABLE_FEATURE')).toBe(false)

      process.env.DISABLE_FEATURE = 'no'
      expect(getEnvBoolean('DISABLE_FEATURE')).toBe(false)
    })

    it('throws error for invalid boolean values', () => {
      process.env.INVALID_BOOL = 'maybe'
      expect(() => getEnvBoolean('INVALID_BOOL')).toThrow(
        'Environment variable INVALID_BOOL must be a boolean, got: maybe'
      )
    })
  })

  describe('getEnvJson', () => {
    it('parses valid JSON', () => {
      process.env.CONFIG = '{"key": "value", "number": 42}'
      const result = getEnvJson('CONFIG')
      expect(result).toEqual({ key: 'value', number: 42 })
    })

    it('returns default value when variable is not set', () => {
      const defaultObj = { default: true }
      expect(getEnvJson('MISSING_JSON', defaultObj)).toBe(defaultObj)
    })

    it('throws error for invalid JSON', () => {
      process.env.INVALID_JSON = 'not-json'
      expect(() => getEnvJson('INVALID_JSON')).toThrow(
        'Environment variable INVALID_JSON must be valid JSON, got: not-json'
      )
    })
  })

  describe('validateEnv', () => {
    it('returns empty array when all variables are present', () => {
      process.env.VAR1 = 'value1'
      process.env.VAR2 = 'value2'
      
      const result = validateEnv(['VAR1', 'VAR2'])
      expect(result.missing).toEqual([])
    })

    it('returns missing variables', () => {
      process.env.VAR1 = 'value1'
      // VAR2 is intentionally missing
      
      const result = validateEnv(['VAR1', 'VAR2', 'VAR3'])
      expect(result.missing).toEqual(['VAR2', 'VAR3'])
    })
  })

  describe('loadEnvConfig', () => {
    it('loads configuration with type validation', () => {
      process.env.APP_PORT = '3000'
      process.env.APP_DEBUG = 'true'
      process.env.APP_NAME = 'test-app'
      
      const config = loadEnvConfig({
        APP_PORT: { type: 'number', required: true },
        APP_DEBUG: { type: 'boolean', defaultValue: false },
        APP_NAME: { type: 'string', required: true },
        OPTIONAL_VAR: { defaultValue: 'default-value' }
      })
      
      expect(config).toEqual({
        APP_PORT: 3000,
        APP_DEBUG: true,
        APP_NAME: 'test-app',
        OPTIONAL_VAR: 'default-value'
      })
    })

    it('throws error for missing required variables', () => {
      expect(() => loadEnvConfig({
        REQUIRED_VAR: { required: true }
      })).toThrow('Environment validation failed')
    })
  })

  describe('CommonEnvVars', () => {
    it('provides common environment variable accessors', () => {
      process.env.NODE_ENV = 'production'
      process.env.PORT = '8080'
      
      expect(CommonEnvVars.NODE_ENV()).toBe('production')
      expect(CommonEnvVars.PORT()).toBe(8080)
      expect(CommonEnvVars.HOST()).toBe('0.0.0.0') // default value
    })

    it('handles ALLOWED_ORIGINS correctly', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com'
      const origins = CommonEnvVars.ALLOWED_ORIGINS()
      expect(origins).toEqual(['http://localhost:3000', 'https://example.com'])
    })
  })
})