import { describe, expect, it } from 'vitest'
import {
  capitalize,
  slugify,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  truncate,
} from '../src/string/string-utils.js'

describe('string Utilities', () => {
  describe('toCamelCase', () => {
    it('should convert to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld')
      expect(toCamelCase('hello-world')).toBe('helloWorld')
      expect(toCamelCase('HELLO_WORLD')).toBe('helloWorld')
    })
  })

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world')
      expect(toKebabCase('HelloWorld')).toBe('hello-world')
      expect(toKebabCase('hello_world')).toBe('hello-world')
    })
  })

  describe('toSnakeCase', () => {
    it('should convert to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world')
      expect(toSnakeCase('HelloWorld')).toBe('hello_world')
      expect(toSnakeCase('hello-world')).toBe('hello_world')
    })
  })

  describe('toPascalCase', () => {
    it('should convert to PascalCase', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld')
      expect(toPascalCase('hello-world')).toBe('HelloWorld')
      expect(toPascalCase('hello_world')).toBe('HelloWorld')
    })
  })

  describe('truncate', () => {
    it('should truncate string', () => {
      expect(truncate('Hello World', 5)).toBe('He...')
      expect(truncate('Hello World', 20)).toBe('Hello World')
      expect(truncate('Hello World', 5, '***')).toBe('He***')
    })
  })

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('HELLO')).toBe('HELLO')
      expect(capitalize('')).toBe('')
    })
  })

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
      expect(slugify('  Hello   World  ')).toBe('hello-world')
      expect(slugify('Hello@World#Test')).toBe('hello-world-test')
    })
  })
})
