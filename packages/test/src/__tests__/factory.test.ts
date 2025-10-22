/**
 * Test suite for TestDataFactory
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { createSeededFactory, factory, TestDataFactory } from '../factory.js'

describe('testDataFactory', () => {
  let dataFactory: TestDataFactory

  beforeEach(() => {
    dataFactory = new TestDataFactory()
  })

  describe('constructor', () => {
    it('should create TestDataFactory instance', () => {
      expect(dataFactory).toBeDefined()
      expect(dataFactory).toBeInstanceOf(TestDataFactory)
    })
  })

  describe('data generation', () => {
    it('should generate unique test data', () => {
      const data1 = dataFactory.user()
      const data2 = dataFactory.user()

      expect(data1).toBeDefined()
      expect(data2).toBeDefined()
      expect(data1.id).not.toBe(data2.id) // UUIDs should be different
    })

    it('should generate user data with expected structure', () => {
      const user = dataFactory.user()

      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.username).toBeDefined()
      expect(user.name).toBeDefined()
      expect(typeof user.isActive).toBe('boolean')
    })

    it('should generate organization data', () => {
      const org = dataFactory.organization()

      expect(org.id).toBeDefined()
      expect(org.name).toBeDefined()
      expect(org.slug).toBeDefined()
      expect(org.description).toBeDefined()
    })
  })

  describe('seeded generation', () => {
    it('should generate data with factory seed', () => {
      const factory1 = new TestDataFactory(12345)
      const user = factory1.user()

      // Should generate valid user data
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.name).toBeDefined()
    })

    it('should generate different data instances', () => {
      const factory1 = new TestDataFactory(11111)

      const user1 = factory1.user()
      const user2 = factory1.user()

      // Different instances should have different IDs
      expect(user1.id).not.toBe(user2.id)
    })
  })

  describe('batch creation', () => {
    it('should create multiple users', () => {
      const users = dataFactory.createMany(dataFactory.user, 3)

      expect(users).toHaveLength(3)
      expect(users[0]).toBeDefined()
      expect(users[1]).toBeDefined()
      expect(users[2]).toBeDefined()

      // Each user should have unique ID
      const ids = users.map(u => u.id)
      expect(new Set(ids).size).toBe(3)
    })

    it('should create multiple organizations', () => {
      const orgs = dataFactory.createMany(dataFactory.organization, 2)

      expect(orgs).toHaveLength(2)
      expect(orgs[0].name).toBeDefined()
      expect(orgs[1].name).toBeDefined()
      expect(orgs[0].id).not.toBe(orgs[1].id)
    })
  })
})

describe('factory function', () => {
  it('should provide global factory instance', () => {
    expect(factory).toBeDefined()
    expect(factory.user).toBeDefined()
    expect(factory.organization).toBeDefined()
    expect(typeof factory.user).toBe('function')
  })

  it('should generate data consistently', () => {
    const user = factory.user()

    expect(user.id).toBeDefined()
    expect(user.email).toBeDefined()
    expect(user.name).toBeDefined()
  })
})

describe('createSeededFactory', () => {
  it('should create factory with seed', () => {
    const factory1 = createSeededFactory(12345)

    const user = factory1.user()

    // Should create valid user data
    expect(user.id).toBeDefined()
    expect(user.email).toBeDefined()
    expect(user.name).toBeDefined()
  })

  it('should create different factory instances', () => {
    const factory1 = createSeededFactory(11111)
    const factory2 = createSeededFactory(22222)

    expect(factory1).toBeDefined()
    expect(factory2).toBeDefined()
    expect(factory1).not.toBe(factory2)
  })
})

describe('advanced factory features', () => {
  it('should support multiple data types', () => {
    const testFactory = new TestDataFactory()

    const user = testFactory.user()
    const organization = testFactory.organization()
    const post = testFactory.post()

    expect(user.id).toBeDefined()
    expect(organization.id).toBeDefined()
    expect(post.id).toBeDefined()

    expect(user.email).toBeDefined()
    expect(organization.name).toBeDefined()
    expect(post.title).toBeDefined()
  })

  it('should support configuration options', () => {
    const testFactory = new TestDataFactory()

    const user1 = testFactory.user({ seed: 12345 })
    const user2 = testFactory.user()

    // Should generate valid users regardless of config
    expect(user1.id).toBeDefined()
    expect(user2.id).toBeDefined()
  })
})
