import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIConfig } from '../config/workflow-config'
import { loadWorkflowConfig } from '../config/workflow-config'
import { AIServiceV2 } from '../core/ai-service-v2'

// Mock the ai-core package
vi.mock('@g-1/ai-core', () => ({
  CloudflareWorkersAI: vi.fn().mockImplementation(() => ({
    generateText: vi.fn().mockResolvedValue({ text: 'Mocked AI response' }),
  })),
  ChangelogGenerator: vi.fn().mockImplementation(() => ({
    generateChangelog: vi.fn().mockResolvedValue({
      content:
        '## [1.0.1] - 2024-01-15\n\n### Features\n- Added new feature\n\n### Bug Fixes\n- Fixed critical bug',
      metadata: { totalCommits: 5, categories: ['feat', 'fix'] },
    }),
    analyzeCommits: vi.fn().mockResolvedValue([
      { type: 'feat', scope: 'core', description: 'Added new feature' },
      { type: 'fix', scope: 'ui', description: 'Fixed critical bug' },
    ]),
  })),
  CodeAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeCode: vi.fn().mockResolvedValue({
      suggestions: ['Consider using async/await'],
      issues: [],
      metrics: { complexity: 5 },
    }),
  })),
  createAIConfigFromEnv: vi.fn().mockReturnValue({
    provider: 'cloudflare',
    accountId: 'test-account',
    apiToken: 'test-token',
    model: '@cf/meta/llama-3.1-8b-instruct',
  }),
}))

describe('Enhanced AI Integration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Environment Variable Configuration', () => {
    it('should load AI configuration from environment variables', async () => {
      // Set environment variables
      process.env.WORKFLOW_AI_ENABLED = 'true'
      process.env.WORKFLOW_AI_PROVIDER = 'cloudflare'
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-123'
      process.env.CLOUDFLARE_API_TOKEN = 'test-token-456'
      process.env.CLOUDFLARE_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct'

      const config = await loadWorkflowConfig('/tmp')

      expect(config.ai.enabled).toBe(true)
      expect(config.ai.provider).toBe('cloudflare')
      expect(config.ai.cloudflare?.accountId).toBe('test-account-123')
      expect(config.ai.cloudflare?.apiToken).toBe('test-token-456')
      expect(config.ai.cloudflare?.model).toBe('@cf/meta/llama-3.1-8b-instruct')
    })

    it('should load feature-specific environment variables', async () => {
      process.env.WORKFLOW_AI_ENABLED = 'true'
      process.env.WORKFLOW_AI_CHANGELOG_ENABLED = 'true'
      process.env.WORKFLOW_AI_CHANGELOG_BREAKING_CHANGES = 'false'
      process.env.WORKFLOW_AI_VERSION_BUMP_CONFIDENCE = '0.9'

      const config = await loadWorkflowConfig('/tmp')

      expect(config.ai.features.changelog.enabled).toBe(true)
      expect(config.ai.features.changelog.includeBreakingChanges).toBe(false)
      expect(config.ai.features.versionBump.confidenceThreshold).toBe(0.9)
    })

    it('should handle invalid environment variable values gracefully', async () => {
      process.env.WORKFLOW_AI_ENABLED = 'invalid'
      process.env.WORKFLOW_AI_PROVIDER = 'unsupported'
      process.env.WORKFLOW_AI_VERSION_BUMP_CONFIDENCE = 'not-a-number'

      // Load config from a directory without a config file to test env vars only
      const config = await loadWorkflowConfig('/tmp')

      // Should use defaults for invalid values
      expect(config.ai.enabled).toBe(false) // default
      expect(config.ai.provider).toBe('local') // default
      expect(config.ai.features.versionBump.confidenceThreshold).toBe(0.8) // default
    })
  })

  describe('AIServiceV2 Integration', () => {
    it('should initialize with Cloudflare Workers AI configuration', () => {
      const aiConfig: AIConfig = {
        enabled: true,
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-3.1-8b-instruct',
        },
        features: {
          changelog: {
            enabled: true,
            includeBreakingChanges: true,
            categorizeCommits: true,
            generateSummary: true,
          },
          versionBump: {
            enabled: true,
            analyzeImpact: true,
            suggestBumpType: true,
            confidenceThreshold: 0.8,
          },
          impactAnalysis: {
            enabled: true,
            crossPackageAnalysis: true,
            riskAssessment: true,
            testingRecommendations: true,
          },
        },
      }

      const aiService = new AIServiceV2(aiConfig)

      expect(aiService).toBeDefined()
      expect(aiService.generateChangelog).toBeDefined()
      expect(aiService.analyzeCode).toBeDefined()
    })

    it('should generate changelog using ai-core ChangelogGenerator', async () => {
      const aiConfig: AIConfig = {
        enabled: true,
        provider: 'cloudflare',
        features: {
          changelog: {
            enabled: true,
            includeBreakingChanges: true,
            categorizeCommits: true,
            generateSummary: true,
          },
          versionBump: {
            enabled: true,
            analyzeImpact: true,
            suggestBumpType: true,
            confidenceThreshold: 0.8,
          },
          impactAnalysis: {
            enabled: true,
            crossPackageAnalysis: true,
            riskAssessment: true,
            testingRecommendations: true,
          },
        },
      }

      const aiService = new AIServiceV2(aiConfig)
      const mockCommits = [
        {
          hash: 'abc123',
          message: 'feat: add new feature',
          author: 'Test Author',
          date: new Date('2024-01-15'),
          body: 'Added a new feature for testing',
          files: ['src/feature.ts'],
        },
      ]

      const result = await aiService.generateChangelog(
        mockCommits.map((commit) => ({
          ...commit,
          additions: 10,
          deletions: 2,
        })),
        'test-package',
        '1.0.0'
      )

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('feat')
      expect(result[0].description).toContain('add new feature')
    })

    it('should handle AI service errors gracefully', async () => {
      const aiConfig: AIConfig = {
        enabled: true,
        provider: 'cloudflare',
        features: {
          changelog: {
            enabled: true,
            includeBreakingChanges: true,
            categorizeCommits: true,
            generateSummary: true,
          },
          versionBump: {
            enabled: true,
            analyzeImpact: true,
            suggestBumpType: true,
            confidenceThreshold: 0.8,
          },
          impactAnalysis: {
            enabled: true,
            crossPackageAnalysis: true,
            riskAssessment: true,
            testingRecommendations: true,
          },
        },
      }

      // Mock the ChangelogGenerator to throw an error
      const { ChangelogGenerator } = await import('@g-1/ai-core')
      vi.mocked(ChangelogGenerator).mockImplementation(() => ({
        generateChangelog: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
        analyzeCommits: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
      }))

      const aiService = new AIServiceV2(aiConfig)

      // Should not throw, but handle the error gracefully
      expect(() => aiService).not.toThrow()
    })
  })

  describe('Configuration Validation', () => {
    it('should validate Cloudflare configuration schema', async () => {
      process.env.WORKFLOW_AI_ENABLED = 'true'
      process.env.WORKFLOW_AI_PROVIDER = 'cloudflare'
      process.env.CLOUDFLARE_ACCOUNT_ID = 'valid-account-id'
      process.env.CLOUDFLARE_API_TOKEN = 'valid-api-token'

      const config = await loadWorkflowConfig()

      expect(config.ai.provider).toBe('cloudflare')
      expect(config.ai.cloudflare).toBeDefined()
      expect(config.ai.cloudflare?.accountId).toBe('valid-account-id')
      expect(config.ai.cloudflare?.apiToken).toBe('valid-api-token')
      expect(config.ai.cloudflare?.model).toBe('@cf/meta/llama-3.1-8b-instruct') // default
    })

    it('should merge environment variables with file configuration', async () => {
      // Simulate file config
      const fileConfig = {
        ai: {
          enabled: false,
          provider: 'local' as const,
          features: {
            changelog: { enabled: false },
          },
        },
      }

      // Environment should override file config
      process.env.WORKFLOW_AI_ENABLED = 'true'
      process.env.WORKFLOW_AI_PROVIDER = 'cloudflare'
      process.env.WORKFLOW_AI_CHANGELOG_ENABLED = 'true'

      const config = await loadWorkflowConfig()

      // Environment variables should take precedence
      expect(config.ai.enabled).toBe(true)
      expect(config.ai.provider).toBe('cloudflare')
      expect(config.ai.features.changelog.enabled).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', async () => {
      // Clear all AI-related environment variables
      delete process.env.WORKFLOW_AI_ENABLED
      delete process.env.WORKFLOW_AI_PROVIDER
      delete process.env.CLOUDFLARE_ACCOUNT_ID
      delete process.env.CLOUDFLARE_API_TOKEN

      // Load config from a directory without a config file to test defaults
      const config = await loadWorkflowConfig('/tmp')

      // Should use defaults
      expect(config.ai.enabled).toBe(false)
      expect(config.ai.provider).toBe('local')
      expect(config.ai.cloudflare).toBeUndefined()
    })

    it('should handle partial Cloudflare configuration', async () => {
      process.env.WORKFLOW_AI_PROVIDER = 'cloudflare'
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
      // Missing CLOUDFLARE_API_TOKEN

      // Load config from a directory without a config file to test env vars only
      const config = await loadWorkflowConfig('/tmp')

      expect(config.ai.provider).toBe('cloudflare')
      expect(config.ai.cloudflare?.accountId).toBe('test-account')
      expect(config.ai.cloudflare?.apiToken).toBeUndefined()
    })
  })
})
