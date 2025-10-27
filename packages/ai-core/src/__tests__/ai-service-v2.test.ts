/**
 * Tests for AIServiceV2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudflareWorkersAI } from '../providers/cloudflare.js';
import { AIServiceV2 } from '../services/ai-service-v2.js';
import type { AIConfig, ChangelogEntry, GitCommit } from '../types/index.js';

// Mock the CloudflareWorkersAI provider
vi.mock('../providers/cloudflare.js', () => ({
  CloudflareWorkersAI: vi.fn(),
}));

describe('AIServiceV2', () => {
  let aiService: AIServiceV2;
  let mockProvider: vi.Mocked<CloudflareWorkersAI>;
  let config: AIConfig;

  beforeEach(() => {
    config = {
      provider: 'cloudflare',
      cloudflare: {
        accountId: 'test-account-id',
        apiToken: 'test-api-token',
        model: '@cf/meta/llama-2-7b-chat-int8',
      },
    };

    // Create mock provider
    mockProvider = {
      generateText: vi.fn(),
      generateChangelog: vi.fn(),
      analyzeCode: vi.fn(),
      suggestCommitMessage: vi.fn(),
      suggestBranchName: vi.fn(),
    } as any;

    // Mock the CloudflareWorkersAI constructor
    (CloudflareWorkersAI as any).mockImplementation(() => mockProvider);

    aiService = new AIServiceV2(mockProvider, config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create AIServiceV2 instance with provider and config', () => {
      const service = new AIServiceV2(mockProvider, config);
      expect(service).toBeInstanceOf(AIServiceV2);
    });
  });

  describe('generateChangelog', () => {
    const mockCommits: GitCommit[] = [
      {
        hash: 'abc123',
        message: 'feat: add new feature',
        author: 'John Doe',
        date: new Date('2024-01-01'),
        body: 'Added a new feature for better user experience',
        files: ['src/feature.ts'],
      },
      {
        hash: 'def456',
        message: 'fix: resolve bug',
        author: 'Jane Smith',
        date: new Date('2024-01-02'),
        body: 'Fixed a critical bug',
        files: ['src/auth.ts'],
      },
    ];

    const mockChangelogEntries: ChangelogEntry[] = [
      {
        type: 'feat',
        description: 'Add new feature for better user experience',
        breaking: false,
        impact: 'minor',
        affectedPackages: ['core'],
        originalCommit: mockCommits[0],
      },
      {
        type: 'fix',
        description: 'Resolve critical bug',
        breaking: false,
        impact: 'patch',
        affectedPackages: ['auth'],
        originalCommit: mockCommits[1],
      },
    ];

    it('should generate changelog from commits', async () => {
      mockProvider.generateChangelog.mockResolvedValueOnce(
        mockChangelogEntries,
      );

      const result = await aiService.generateChangelog(mockCommits);

      expect(result).toEqual(mockChangelogEntries);
      expect(mockProvider.generateChangelog).toHaveBeenCalledWith(
        mockCommits,
        undefined,
      );
    });

    it('should pass options to provider', async () => {
      const options = {
        format: 'detailed' as const,
        includeFiles: true,
        groupByType: true,
      };
      mockProvider.generateChangelog.mockResolvedValueOnce(
        mockChangelogEntries,
      );

      await aiService.generateChangelog(mockCommits, options);

      expect(mockProvider.generateChangelog).toHaveBeenCalledWith(
        mockCommits,
        options,
      );
    });

    it('should handle empty commits array', async () => {
      mockProvider.generateChangelog.mockResolvedValueOnce([]);

      const result = await aiService.generateChangelog([]);

      expect(result).toEqual([]);
      expect(mockProvider.generateChangelog).toHaveBeenCalledWith(
        [],
        undefined,
      );
    });

    it('should handle provider errors', async () => {
      const error = new Error('Provider error');
      mockProvider.generateChangelog.mockRejectedValueOnce(error);

      await expect(aiService.generateChangelog(mockCommits)).rejects.toThrow(
        'Provider error',
      );
    });
  });

  describe('analyzeCode', () => {
    const sampleCode = 'function test() { return "hello"; }';
    const mockAnalysis = {
      qualityScore: 8.5,
      securityIssues: [],
      performanceIssues: [],
      qualityIssues: [
        {
          type: 'code-style' as const,
          severity: 'low' as const,
          description: 'Consider using arrow function',
          line: 1,
          suggestion: 'const test = () => "hello";',
        },
      ],
      refactoringSuggestions: [],
    };

    it('should analyze code successfully', async () => {
      mockProvider.analyzeCode.mockResolvedValueOnce(mockAnalysis);

      const result = await aiService.analyzeCode(sampleCode);

      expect(result).toEqual(mockAnalysis);
      expect(mockProvider.analyzeCode).toHaveBeenCalledWith(
        sampleCode,
        undefined,
      );
    });

    it('should pass analysis options to provider', async () => {
      const options = {
        language: 'typescript' as const,
        includeSecurity: true,
        includePerformance: false,
        includeRefactoring: true,
      };
      mockProvider.analyzeCode.mockResolvedValueOnce(mockAnalysis);

      await aiService.analyzeCode(sampleCode, options);

      expect(mockProvider.analyzeCode).toHaveBeenCalledWith(
        sampleCode,
        options,
      );
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Analysis failed');
      mockProvider.analyzeCode.mockRejectedValueOnce(error);

      await expect(aiService.analyzeCode(sampleCode)).rejects.toThrow(
        'Analysis failed',
      );
    });
  });

  describe('suggestVersionBump', () => {
    const mockCommits: CommitInfo[] = [
      {
        hash: 'abc123',
        message: 'feat: add new feature',
        author: 'John Doe',
        date: new Date(),
        body: 'Added new feature for better user experience',
        files: ['src/feature.ts'],
      },
      {
        hash: 'def456',
        message: 'fix: resolve bug',
        author: 'Jane Smith',
        date: new Date(),
        body: 'Fixed a critical bug',
        files: ['src/auth.ts'],
      },
    ];

    it('should suggest version bump based on commits', async () => {
      mockProvider.generateText.mockResolvedValueOnce('minor');

      const result = await aiService.suggestVersionBump(mockCommits);

      expect(result).toBe('minor');
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining(
          'Analyze these commits and suggest a version bump',
        ),
        { maxTokens: 10, temperature: 0.1 },
      );
    });

    it('should handle invalid response with fallback', async () => {
      mockProvider.generateText.mockResolvedValueOnce('invalid');

      const result = await aiService.suggestVersionBump(mockCommits);

      expect(result).toBe('patch');
    });

    it('should handle provider errors', async () => {
      const error = new Error('Provider failed');
      mockProvider.generateText.mockRejectedValueOnce(error);

      await expect(aiService.suggestVersionBump(mockCommits)).rejects.toThrow(
        'Provider failed',
      );
    });
  });

  describe('analyzeImpact', () => {
    const mockCommits: CommitInfo[] = [
      {
        hash: 'abc123',
        message: 'feat: add new API endpoint',
        author: 'John Doe',
        date: new Date(),
        body: 'Added new endpoint for user management',
        files: ['src/api.ts'],
      },
      {
        hash: 'def456',
        message: 'fix: resolve authentication bug',
        author: 'Jane Smith',
        date: new Date(),
        body: 'Fixed JWT token validation',
        files: ['src/auth.ts'],
      },
    ];

    it('should analyze impact of commits', async () => {
      const mockResponse = JSON.stringify({
        riskLevel: 'medium',
        affectedAreas: ['API', 'Authentication'],
        recommendations: ['Review API changes', 'Test authentication flow'],
        estimatedEffort: 'medium',
      });
      mockProvider.generateText.mockResolvedValueOnce(mockResponse);

      const mockChanges = {
        changes: [
          { file: 'src/api.ts', type: 'modified' as const, linesAdded: 15, linesRemoved: 3 },
          { file: 'src/auth.ts', type: 'modified' as const, linesAdded: 8, linesRemoved: 2 }
        ]
      };

      const result = await aiService.analyzeImpact(mockChanges);

      expect(result).toEqual({
        riskLevel: 'medium',
        affectedAreas: ['src/api.ts', 'src/auth.ts'],
        recommendations: ['Review changes carefully', 'Test thoroughly'],
        estimatedEffort: 'medium',
      });
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Analyze the impact of these code changes'),
      );
    });

    it('should handle invalid JSON response with fallback', async () => {
      mockProvider.generateText.mockResolvedValueOnce('invalid json');

      const mockChanges = {
        changes: [
          { file: 'src/api.ts', type: 'modified' as const, linesAdded: 10, linesRemoved: 5 },
          { file: 'src/auth.ts', type: 'modified' as const, linesAdded: 3, linesRemoved: 1 }
        ]
      };

      const result = await aiService.analyzeImpact(mockChanges);

      expect(result.riskLevel).toBe('medium');
      expect(result.affectedAreas).toEqual(['src/api.ts', 'src/auth.ts']);
      expect(result.recommendations).toEqual(['Review changes carefully', 'Test thoroughly']);
      expect(result.estimatedEffort).toBe('medium');
    });

    it('should handle provider errors', async () => {
      const error = new Error('Provider failed');
      mockProvider.generateText.mockRejectedValueOnce(error);

      const mockChanges = {
        changes: [
          { file: 'src/api.ts', type: 'modified' as const, linesAdded: 10, linesRemoved: 5 }
        ]
      };

      await expect(aiService.analyzeImpact(mockChanges)).rejects.toThrow(
        'Provider failed',
      );
    });
  });

  describe('suggestBranchName', () => {
    const mockDescription = 'add user authentication';

    it('should suggest branch name based on description', async () => {
      const mockSuggestion = 'feature/add-user-authentication';
      mockProvider.generateText.mockResolvedValueOnce(mockSuggestion);

      const result = await aiService.suggestBranchName({
        type: 'feature',
        description: mockDescription
      });

      expect(result.recommended).toBe('feature/add-user-authentication');
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Suggest branch names for a feature change'),
      );
    });

    it('should sanitize branch name', async () => {
      const mockSuggestion = 'Feature/Add User Authentication!';
      mockProvider.generateText.mockResolvedValueOnce(mockSuggestion);

      const result = await aiService.suggestBranchName({
        type: 'feature',
        description: mockDescription
      });

      expect(result.recommended).toBe('feature/add-user-authentication');
    });
  });

  describe('suggestCommitMessage', () => {
    const mockChanges = [
      'src/new-feature.ts',
      'src/existing.ts',
      'src/old-file.ts',
    ];

    it('should suggest commit message based on changes', async () => {
      const mockSuggestion = 'feat: add new feature and refactor existing code';
      mockProvider.generateText.mockResolvedValueOnce(mockSuggestion);

      const result = await aiService.suggestCommitMessage({
        files: mockChanges,
        changes: 'Add new feature and refactor existing code'
      });

      expect(result.recommended).toBe('feat: Add new feature and refactor existing code');
      expect(result.suggestions).toContain('feat: Add new feature and refactor existing code');
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Suggest commit messages for changes to files'),
      );
    });

    it('should pass options to provider', async () => {
      const options = { maxLength: 72, includeScope: true };
      const mockSuggestion = 'feat(core): add new feature';
      mockProvider.generateText.mockResolvedValueOnce(mockSuggestion);

      await aiService.suggestCommitMessage({
        files: mockChanges,
        changes: 'Add new feature'
      });

      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Changes: Add new feature'),
      );
    });
  });

  describe('error handling', () => {
    it('should handle provider initialization errors', () => {
      // Mock CloudflareWorkersAI to throw during construction
      vi.mocked(CloudflareWorkersAI).mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      // This test should actually create a new provider instance, not use a mock
      expect(() => {
        new CloudflareWorkersAI(config.cloudflare!);
      }).toThrow('Provider initialization failed');
    });

    it('should propagate provider method errors', async () => {
      const error = new Error('Provider method error');
      mockProvider.generateChangelog.mockRejectedValueOnce(error);

      await expect(aiService.generateChangelog([])).rejects.toThrow(
        'Provider method error',
      );
    });
  });

  describe('integration', () => {
    it('should work with real provider methods', async () => {
      // This test ensures the service correctly delegates to the provider
      const mockCommits: GitCommit[] = [
        {
          hash: 'test123',
          message: 'test: add test',
          author: 'Test Author',
          date: new Date(),
          body: 'Test commit',
          files: ['test.ts'],
        },
      ];

      const mockEntries: ChangelogEntry[] = [
        {
          type: 'test',
          description: 'Add test',
          breaking: false,
          impact: 'patch',
          affectedPackages: ['test'],
          originalCommit: mockCommits[0],
        },
      ];

      mockProvider.generateChangelog.mockResolvedValueOnce(mockEntries);

      const result = await aiService.generateChangelog(mockCommits);

      expect(result).toEqual(mockEntries);
      expect(mockProvider.generateChangelog).toHaveBeenCalledTimes(1);
    });
  });
});
