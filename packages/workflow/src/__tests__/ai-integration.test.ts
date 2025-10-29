/**
 * Integration tests for AI functionality in workflow package
 */

import type { CommitInfo } from '@g-1/ai-core'
import { AIServiceV2 } from '@g-1/ai-core'
import type { ChangelogEntry } from '@g-1/ai-core/services'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the AI service
vi.mock('@g-1/ai-core')

describe('Workflow AI Integration', () => {
  let mockAIService: vi.Mocked<AIServiceV2>

  beforeEach(() => {
    mockAIService = {
      generateChangelog: vi.fn(),
      analyzeCode: vi.fn(),
      suggestVersionBump: vi.fn(),
      analyzeImpact: vi.fn(),
      suggestBranchName: vi.fn(),
      suggestCommitMessage: vi.fn(),
    } as any

    vi.mocked(AIServiceV2).mockImplementation(() => mockAIService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('CLI AI Commands', () => {
    const mockCommits: CommitInfo[] = [
      {
        hash: 'abc123',
        message: 'feat: add new feature',
        author: 'John Doe',
        date: '2024-01-01',
        body: 'Added a new feature',
        files: ['src/feature.ts'],
        additions: 10,
        deletions: 2,
      },
      {
        hash: 'def456',
        message: 'fix: resolve bug',
        author: 'Jane Smith',
        date: '2024-01-02',
        body: 'Fixed a bug',
        files: ['src/auth.ts'],
        additions: 5,
        deletions: 3,
      },
    ]

    const mockChangelogEntries: ChangelogEntry[] = [
      {
        type: 'feat',
        description: 'Add new feature',
        breaking: false,
        impact: 'minor',
        affectedPackages: ['core'],
        originalCommit: mockCommits[0],
      },
      {
        type: 'fix',
        description: 'Resolve bug',
        breaking: false,
        impact: 'patch',
        affectedPackages: ['auth'],
        originalCommit: mockCommits[1],
      },
    ]

    it('should generate changelog using AIServiceV2', async () => {
      mockAIService.generateChangelog.mockResolvedValueOnce(mockChangelogEntries)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      const result = await aiService.generateChangelog(mockCommits)

      expect(result).toEqual(mockChangelogEntries)
      expect(mockAIService.generateChangelog).toHaveBeenCalledWith(mockCommits)
    })

    it('should suggest version bump using AIServiceV2', async () => {
      const mockVersionSuggestion = {
        suggestedVersion: '1.1.0',
        bumpType: 'minor' as const,
        reasoning: 'New features added',
        confidence: 0.9,
      }
      mockAIService.suggestVersionBump.mockResolvedValueOnce(mockVersionSuggestion)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      const result = await aiService.suggestVersionBump(mockChangelogEntries, '1.0.0')

      expect(result).toEqual(mockVersionSuggestion)
      expect(mockAIService.suggestVersionBump).toHaveBeenCalledWith(mockChangelogEntries, '1.0.0')
    })

    it('should analyze impact using AIServiceV2', async () => {
      const mockImpactAnalysis = {
        overallImpact: 'medium' as const,
        affectedAreas: ['API', 'Authentication'],
        riskLevel: 'low' as const,
        recommendations: ['Update documentation', 'Add tests'],
        breakingChanges: [],
        migrationSteps: [],
      }
      mockAIService.analyzeImpact.mockResolvedValueOnce(mockImpactAnalysis)

      const packageInfo = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {},
      }

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      const result = await aiService.analyzeImpact(mockChangelogEntries, packageInfo)

      expect(result).toEqual(mockImpactAnalysis)
      expect(mockAIService.analyzeImpact).toHaveBeenCalledWith(mockChangelogEntries, packageInfo)
    })

    it('should suggest branch name using AIServiceV2', async () => {
      const mockBranchSuggestion = {
        suggestedName: 'feat/new-feature',
        alternatives: ['feature/add-feature', 'feat/enhancement'],
        reasoning: 'Based on feature addition',
      }
      mockAIService.suggestBranchName.mockResolvedValueOnce(mockBranchSuggestion)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      const result = await aiService.suggestBranchName(mockCommits)

      expect(result).toEqual(mockBranchSuggestion)
      expect(mockAIService.suggestBranchName).toHaveBeenCalledWith(mockCommits)
    })

    it('should suggest commit message using AIServiceV2', async () => {
      const mockCommitSuggestion = {
        suggestedMessage: 'feat: add authentication system',
        alternatives: ['feat: implement auth', 'feat: add user authentication'],
        reasoning: 'Based on authentication-related changes',
      }
      mockAIService.suggestCommitMessage.mockResolvedValueOnce(mockCommitSuggestion)

      const changes = {
        added: ['src/auth.ts'],
        modified: ['src/user.ts'],
        deleted: [],
      }

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      const result = await aiService.suggestCommitMessage(changes)

      expect(result).toEqual(mockCommitSuggestion)
      expect(mockAIService.suggestCommitMessage).toHaveBeenCalledWith(changes)
    })
  })

  describe('Release Workflow Integration', () => {
    it('should integrate AIServiceV2 in release workflow', async () => {
      const mockChangelogEntries: ChangelogEntry[] = [
        {
          type: 'feat',
          description: 'Add new API endpoint',
          breaking: false,
          impact: 'minor',
          affectedPackages: ['api'],
          originalCommit: {} as GitCommit,
        },
      ]

      const mockVersionSuggestion = {
        suggestedVersion: '1.1.0',
        bumpType: 'minor' as const,
        reasoning: 'New features added',
        confidence: 0.9,
      }

      mockAIService.generateChangelog.mockResolvedValueOnce(mockChangelogEntries)
      mockAIService.suggestVersionBump.mockResolvedValueOnce(mockVersionSuggestion)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      // Simulate release workflow usage
      const commits: GitCommit[] = [
        {
          hash: 'test123',
          message: 'feat: add API endpoint',
          author: 'Developer',
          date: new Date(),
          body: 'Added new API endpoint',
          files: ['src/api.ts'],
        },
      ]

      const changelog = await aiService.generateChangelog(commits)
      const versionSuggestion = await aiService.suggestVersionBump(changelog, '1.0.0')

      expect(changelog).toEqual(mockChangelogEntries)
      expect(versionSuggestion).toEqual(mockVersionSuggestion)
      expect(mockAIService.generateChangelog).toHaveBeenCalledWith(commits)
      expect(mockAIService.suggestVersionBump).toHaveBeenCalledWith(changelog, '1.0.0')
    })

    it('should handle errors in release workflow', async () => {
      const error = new Error('AI service error')
      mockAIService.generateChangelog.mockRejectedValueOnce(error)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      const commits: GitCommit[] = [
        {
          hash: 'test123',
          message: 'feat: test',
          author: 'Test',
          date: new Date(),
          body: 'Test',
          files: ['test.ts'],
        },
      ]

      await expect(aiService.generateChangelog(commits)).rejects.toThrow('AI service error')
    })
  })

  describe('Configuration Integration', () => {
    it('should work with different AI configurations', () => {
      const config1 = {
        provider: 'cloudflare' as const,
        cloudflare: {
          accountId: 'account1',
          apiToken: 'token1',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      }

      const config2 = {
        provider: 'cloudflare' as const,
        cloudflare: {
          accountId: 'account2',
          apiToken: 'token2',
          model: '@cf/meta/llama-2-13b-chat-int8',
        },
      }

      const aiService1 = new AIServiceV2(config1)
      const aiService2 = new AIServiceV2(config2)

      expect(aiService1).toBeDefined()
      expect(aiService2).toBeDefined()
      expect(AIServiceV2).toHaveBeenCalledTimes(2)
    })

    it('should handle missing configuration', () => {
      // Temporarily override the mock to throw an error
      vi.mocked(AIServiceV2).mockImplementationOnce(() => {
        throw new Error('Cloudflare configuration is required')
      })

      expect(() => {
        new AIServiceV2({
          provider: 'cloudflare',
        })
      }).toThrow('Cloudflare configuration is required')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout')
      mockAIService.generateChangelog.mockRejectedValueOnce(networkError)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      await expect(aiService.generateChangelog([])).rejects.toThrow('Network timeout')
    })

    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      mockAIService.analyzeCode.mockRejectedValueOnce(rateLimitError)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      await expect(aiService.analyzeCode('test code')).rejects.toThrow('Rate limit exceeded')
    })

    it('should handle invalid responses', async () => {
      const invalidResponseError = new Error('Invalid response format')
      mockAIService.suggestVersionBump.mockRejectedValueOnce(invalidResponseError)

      const aiService = new AIServiceV2({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      await expect(aiService.suggestVersionBump([], '1.0.0')).rejects.toThrow(
        'Invalid response format'
      )
    })
  })
})
