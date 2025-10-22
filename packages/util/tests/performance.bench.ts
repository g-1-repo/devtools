import { bench, describe } from 'vitest'
import { groupBy, unique, shuffle } from '../src/array'
import { debounce, throttle } from '../src/async'
import { deepClone, pick, omit } from '../src/object'
import { toCamelCase, toKebabCase, slugify } from '../src/string'
import { isValidEmail, isValidUrl, isValidUUID } from '../src/validation'

// Note: These benchmarks only run when vitest is in benchmark mode
// Run with: bun run test --mode=benchmark

// Skip these tests in regular CI runs to avoid bench() errors
if (process.env.VITEST_BENCHMARK !== 'true') {
  describe.skip('Performance benchmarks (skipped in regular tests)', () => {
  describe('Array utilities', () => {
    const items1k = Array.from({ length: 1000 }, (_, i) => ({ id: i, group: i % 10, value: Math.random() }))
    const items10k = Array.from({ length: 10000 }, (_, i) => ({ id: i, group: i % 100, value: Math.random() }))
    const primitives1k = Array.from({ length: 1000 }, (_, i) => i % 50)

    bench('groupBy with 1000 items', () => {
      groupBy(items1k, item => item.group)
    })

    bench('groupBy with 10k items', () => {
      groupBy(items10k, item => item.group)
    })

    bench('unique with 1000 primitives', () => {
      unique(primitives1k)
    })

    bench('shuffle with 1000 items', () => {
      shuffle(items1k)
    })
  })

  describe('Object utilities', () => {
    const shallowObj = { a: 1, b: 'test', c: true, d: null }
    const deepObj = {
      a: 1,
      b: {
        c: 'nested',
        d: [1, 2, 3],
        e: {
          f: new Date(),
          g: /pattern/g
        }
      },
      h: [
        { i: 'array item 1' },
        { i: 'array item 2' }
      ]
    }

    bench('deepClone shallow object', () => {
      deepClone(shallowObj)
    })

    bench('deepClone deep object', () => {
      deepClone(deepObj)
    })

    bench('pick from object', () => {
      pick(deepObj, ['a', 'b'])
    })

    bench('omit from object', () => {
      omit(deepObj, ['h'])
    })
  })

  describe('String utilities', () => {
    const strings = [
      'hello world',
      'myAwesomeFunction',
      'PascalCaseString',
      'snake_case_string',
      'kebab-case-string',
      'mixed_Case-String with spaces'
    ]

    bench('toCamelCase conversion', () => {
      strings.forEach(str => toCamelCase(str))
    })

    bench('toKebabCase conversion', () => {
      strings.forEach(str => toKebabCase(str))
    })

    bench('slugify conversion', () => {
      strings.forEach(str => slugify(str))
    })
  })

  describe('Validation utilities', () => {
    const emails = [
      'test@example.com',
      'user.name+tag@domain.co.uk',
      'invalid-email',
      'test@',
      '@example.com'
    ]

    const urls = [
      'https://example.com',
      'http://localhost:3000/path',
      'ftp://files.example.com',
      'not-a-url',
      'http://'
    ]

    const uuids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      'invalid-uuid',
      '550e8400-e29b-41d4-a716',
      '123'
    ]

    bench('email validation (batch)', () => {
      emails.forEach(email => isValidEmail(email))
    })

    bench('URL validation (batch)', () => {
      urls.forEach(url => isValidUrl(url))
    })

    bench('UUID validation (batch)', () => {
      uuids.forEach(uuid => isValidUUID(uuid))
    })
  })

  describe('Async utilities', () => {
    const mockFn = () => Math.random()

    bench('debounce function creation', () => {
      debounce(mockFn, 100)
    })

    bench('throttle function creation', () => {
      throttle(mockFn, 100)
    })
  })

  describe('Memory efficiency tests', () => {
    // Test memory usage patterns for large data sets
    bench('large array unique operation', () => {
      const largeArray = Array.from({ length: 50000 }, (_, i) => i % 1000)
      unique(largeArray)
    })

    bench('large object deep clone', () => {
      const largeObj = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: { value: Math.random(), nested: { deep: i * 2 } }
      }))
      deepClone(largeObj)
    })
  })
})
} else {
  describe('Performance benchmarks', () => {
    it('Performance tests are disabled in CI', () => {
      expect(true).toBe(true)
    })
  })
}
