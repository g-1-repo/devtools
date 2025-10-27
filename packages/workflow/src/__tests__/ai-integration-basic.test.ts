import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AIServiceV2 } from '../core/ai-service-v2.js'
import type { CommitInfo } from '../types/index.js'

describe('AI Integration - Basic Tests', () => {
  let aiService: AIServiceV2

  const mockCommits: CommitInfo[] = [
    {
      hash: 'abc123',
      message: 'feat: add new feature',
      author: 'Test Author',
      date: new Date('2024-01-01'),
      files: ['src/feature.ts'],
    },
    {
      hash: 'def456',
      message: 'fix: resolve bug in component',
      author: 'Test Author',
      date: new Date('2024-01-02'),
      files: ['src/component.ts'],
    },
  ]

  beforeEach(() => {
    // Reset environment variables
    delete process.env.AI_ENABLED
    delete process.env.AI_PROVIDER
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN

    aiService = new AIServiceV2({
      enabled: false,
      provider: 'local',
      suggestBranchNames: false,
      suggestCommitMessages: false,
      generateReleaseNotes: false,
    })
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.AI_ENABLED
    delete process.env.AI_PROVIDER
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN
  })

  describe('Service Initialization', () => {
    it('should initialize with disabled AI', () => {
      expect(aiService).toBeDefined()
    })

    it('should handle local provider configuration', () => {
      const localAI = new AIServiceV2({
        enabled: true,
        provider: 'local',
        suggestBranchNames: true,
        suggestCommitMessages: true,
        generateReleaseNotes: true,
      })

      expect(localAI).toBeDefined()
    })
  })

  describe('Fallback Functionality', () => {
    it('should generate changelog using fallback when AI is disabled', async () => {
      const changelog = await aiService.generateChangelog(mockCommits)

      expect(changelog).toBeDefined()
      expect(Array.isArray(changelog)).toBe(true)
      expect(changelog.length).toBeGreaterThan(0)

      // Check first entry structure
      const entry = changelog[0]
      expect(entry).toHaveProperty('type')
      expect(entry).toHaveProperty('description')
      expect(entry).toHaveProperty('breaking')
      expect(entry).toHaveProperty('impact')
      expect(entry).toHaveProperty('originalCommit')
    })

    it('should suggest branch names using fallback', async () => {
      const branchName = await aiService.suggestBranchName(['new feature'])

      expect(branchName).toBeDefined()
      expect(typeof branchName).toBe('string')
      expect(branchName.length).toBeGreaterThan(0)
    })

    it('should suggest commit messages using fallback', async () => {
      const commitMessage = await aiService.suggestCommitMessage(['src/test.ts'])

      expect(commitMessage).toBeDefined()
      expect(typeof commitMessage).toBe('string')
      expect(commitMessage.length).toBeGreaterThan(0)
    })
  })

  describe('Version Suggestions', () => {
    it('should provide version suggestions using fallback', async () => {
      const changelog = await aiService.generateChangelog(mockCommits)
      const packages = [{ name: 'test-package', version: '1.0.0', path: '/test' }]

      const suggestions = await aiService.suggestVersionBumps(changelog, packages)

      expect(suggestions).toBeDefined()
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)

      const suggestion = suggestions[0]
      expect(suggestion).toHaveProperty('package')
      expect(suggestion).toHaveProperty('currentVersion')
      expect(suggestion).toHaveProperty('suggestedVersion')
      expect(suggestion).toHaveProperty('bumpType')
    })
  })

  describe('Impact Analysis', () => {
    it('should analyze impact using fallback', async () => {
      const changelog = await aiService.generateChangelog(mockCommits)
      const packages = [{ name: 'test-package', dependencies: {} }]

      const analysis = await aiService.analyzeImpact(changelog, packages)

      expect(analysis).toBeDefined()
      expect(analysis).toHaveProperty('changedPackages')
      expect(analysis).toHaveProperty('affectedPackages')
      expect(analysis).toHaveProperty('riskLevel')
      expect(analysis).toHaveProperty('breakingChanges')
    })
  })
})
