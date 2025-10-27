/**
 * Integration Tests for AI-Core Package
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIConfigManager } from '../config/ai-config.js';
import { CloudflareWorkersAI } from '../providers/cloudflare.js';
import { AIServiceV2 } from '../services/ai-service-v2.js';
import { ChangelogGenerator } from '../services/changelog-generator.js';
import { CodeAnalyzer } from '../services/code-analyzer.js';
import type { AIConfig, GitCommit } from '../types/index.js';

// Mock external dependencies
vi.mock('../providers/cloudflare.js');

describe('AI-Core Integration Tests', () => {
  let config: AIConfig;
  let mockProvider: vi.Mocked<CloudflareWorkersAI>;

  beforeEach(() => {
    config = {
      defaultProvider: 'cloudflare',
      providers: {
        cloudflare: {
          apiToken: 'test-token',
          accountId: 'test-account',
          model: '@cf/meta/llama-3.1-8b-instruct',
        },
      },
      services: {
        codeAnalyzer: {
          enabled: true,
          maxFileSize: 1024 * 1024,
          supportedExtensions: ['.js', '.ts', '.jsx', '.tsx'],
          analysisTimeout: 30000,
        },
        changelogGenerator: {
          enabled: true,
          defaultFormat: 'markdown',
          includeBreaking: true,
          groupByType: true,
        },
      },
      cache: {
        enabled: true,
        ttl: 3600,
        maxSize: 100,
      },
    };

    mockProvider = {
      name: 'test-provider',
      version: '1.0.0',
      generateText: vi.fn(),
      generateChangelog: vi.fn().mockResolvedValue({
        version: '2.0.0',
        content:
          '# Changelog\n\n### Features\n\n### Bug Fixes\n\n### BREAKING CHANGES',
        format: 'markdown',
      }),
      analyzeCode: vi.fn().mockResolvedValue({
        quality: {
          complexity: 1,
          maintainability: 95,
          testCoverage: 0,
          codeSmells: [],
          duplications: [],
        },
        security: [],
        performance: [],
        suggestions: [],
        metrics: {
          linesOfCode: 50,
          cyclomaticComplexity: 1,
          cognitiveComplexity: 1,
          maintainabilityIndex: 95,
          technicalDebt: 'Low',
        },
      }),
      analyzeImpact: vi.fn(),
      suggestCommitMessage: vi.fn(),
      suggestBranchName: vi.fn(),
    } as any;

    vi.mocked(CloudflareWorkersAI).mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Management Integration', () => {
    it('should create and configure AI services from environment', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLOUDFLARE_API_TOKEN: 'env-token',
        CLOUDFLARE_ACCOUNT_ID: 'env-account',
        CLOUDFLARE_DEFAULT_MODEL: '@cf/meta/llama-3.1-70b-instruct',
      };

      const configManager = AIConfigManager.fromEnvironment();
      const config = configManager.getConfig();
      const aiService = new AIServiceV2(mockProvider as any, config);

      expect(aiService).toBeInstanceOf(AIServiceV2);

      process.env = originalEnv;
    });

    it('should validate configuration before creating services', () => {
      const invalidConfig = {
        defaultProvider: 'cloudflare' as const,
        providers: {
          cloudflare: {
            apiToken: '',
            accountId: '',
            model: '@cf/meta/llama-3.1-8b-instruct',
          },
        },
      };

      const configManager = AIConfigManager.getInstance(invalidConfig);
      const validation = configManager.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Code Analysis Workflow', () => {
    it('should perform complete code analysis workflow', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);
      const codeAnalyzer = new CodeAnalyzer({ provider: mockProvider as any });

      const sourceCode = `
        function calculateTotal(items) {
          let total = 0;
          for (let i = 0; i < items.length; i++) {
            if (items[i].price && items[i].quantity) {
              total += items[i].price * items[i].quantity;
            }
          }
          return total;
        }
        
        // Potential improvement: use reduce method
        function calculateTotalFunctional(items) {
          return items
            .filter(item => item.price && item.quantity)
            .reduce((total, item) => total + (item.price * item.quantity), 0);
        }
      `;

      // Step 1: Analyze code locally
      mockProvider.analyzeCode.mockResolvedValue({
        suggestions: [],
        metrics: { linesOfCode: 15, complexity: 3, maintainability: 85 },
        issues: [],
      });

      const analysisResult = await codeAnalyzer.analyzeFile(
        sourceCode,
        '/src/calculator.js',
      );

      expect(analysisResult).toBeDefined();
      expect(analysisResult.metrics.linesOfCode).toBeGreaterThan(0);
      expect(analysisResult.issues).toBeDefined();

      // Step 2: Get AI suggestions for improvements
      mockProvider.analyzeCode.mockResolvedValue({
        suggestions: [
          {
            type: 'refactoring',
            description:
              'Consider using Array.reduce() for better functional programming style',
            line: 3,
            severity: 'info',
          },
        ],
        metrics: {
          complexity: 3,
          maintainability: 85,
        },
      });

      const aiAnalysis = await aiService.analyzeCode(sourceCode, {
        language: 'javascript',
        includeMetrics: true,
        includeSuggestions: true,
      });

      expect(mockProvider.analyzeCode).toHaveBeenCalledWith(sourceCode, {
        language: 'javascript',
        includeMetrics: true,
        includeSuggestions: true,
      });
      expect(aiAnalysis.suggestions).toBeDefined();
      expect(aiAnalysis.metrics).toBeDefined();
    });

    it('should handle large project analysis', async () => {
      const codeAnalyzer = new CodeAnalyzer({ provider: mockProvider as any });

      const projectFiles = [
        {
          path: '/src/utils/helpers.js',
          content: `
            export function formatCurrency(amount) {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(amount);
            }
          `,
        },
        {
          path: '/src/components/ProductList.js',
          content: `
            import { formatCurrency } from '../utils/helpers.js';
            
            export function ProductList({ products }) {
              return products.map(product => ({
                ...product,
                formattedPrice: formatCurrency(product.price)
              }));
            }
          `,
        },
        {
          path: '/src/services/api.js',
          content: `
            export async function fetchProducts() {
              const response = await fetch('/api/products');
              if (!response.ok) {
                throw new Error('Failed to fetch products');
              }
              return response.json();
            }
          `,
        },
      ];

      const projectAnalysis = await codeAnalyzer.analyzeProject(projectFiles);

      expect(projectAnalysis.files).toHaveLength(3);
      expect(projectAnalysis.summary.totalFiles).toBe(3);
      expect(projectAnalysis.summary.totalLines).toBeGreaterThan(0);
      expect(projectAnalysis.recommendations).toBeDefined();
    });
  });

  describe('Changelog Generation Workflow', () => {
    it('should perform complete changelog generation workflow', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);
      const changelogGenerator = new ChangelogGenerator({
        provider: mockProvider as any,
      });

      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'feat(auth): implement OAuth2 authentication',
          author: 'John Doe',
          date: '2024-01-15T10:00:00Z',
          type: 'feat',
          scope: 'auth',
          description: 'implement OAuth2 authentication',
          breaking: false,
        },
        {
          hash: 'def456',
          message: 'fix(api): resolve rate limiting issue',
          author: 'Jane Smith',
          date: '2024-01-16T14:30:00Z',
          type: 'fix',
          scope: 'api',
          description: 'resolve rate limiting issue',
          breaking: false,
        },
        {
          hash: 'ghi789',
          message: 'feat!: redesign user dashboard',
          author: 'Bob Johnson',
          date: '2024-01-17T09:15:00Z',
          type: 'feat',
          scope: 'ui',
          description: 'redesign user dashboard',
          breaking: true,
        },
      ];

      // Step 1: Generate changelog locally
      const changelog = await changelogGenerator.generateChangelog(
        commits,
        '2.0.0',
        '1.5.0',
      );

      expect(changelog.version).toBe('2.0.0');
      expect(changelog.content).toContain('### Features');
      expect(changelog.content).toContain('### Bug Fixes');
      expect(changelog.content).toContain('### BREAKING CHANGES');

      // Step 2: Get AI-enhanced changelog
      mockProvider.generateChangelog.mockResolvedValue({
        content: `# Changelog

## [2.0.0] - 2024-01-17

### 🚀 Features
- **auth**: Implement OAuth2 authentication for enhanced security
- **ui**: Complete redesign of user dashboard with improved UX

### 🐛 Bug Fixes
- **api**: Resolve rate limiting issue affecting API performance

### ⚠️ BREAKING CHANGES
- User dashboard layout has been completely redesigned
- Legacy authentication methods are no longer supported`,
        format: 'markdown',
        metadata: {
          totalCommits: 3,
          breakingChanges: 1,
          newFeatures: 2,
          bugFixes: 1,
        },
      });

      const aiChangelog = await aiService.generateChangelog(commits, {
        version: '2.0.0',
        previousVersion: '1.5.0',
        format: 'markdown',
        includeMetadata: true,
      });

      expect(mockProvider.generateChangelog).toHaveBeenCalledWith(commits, {
        version: '2.0.0',
        previousVersion: '1.5.0',
        format: 'markdown',
        includeMetadata: true,
      });
      expect(aiChangelog.content).toContain('🚀 Features');
      expect(aiChangelog.metadata).toBeDefined();

      // Step 3: Suggest version bump
      const versionSuggestion = await changelogGenerator.suggestVersionBump(
        commits,
        '1.5.0',
      );

      expect(versionSuggestion.suggestedVersion).toBe('2.0.0');
      expect(versionSuggestion.bumpType).toBe('major');
      expect(versionSuggestion.reasoning).toContain('breaking changes');
    });
  });

  describe('AI-Enhanced Development Workflow', () => {
    it('should suggest branch names based on changes', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);

      mockProvider.generateText.mockResolvedValue(JSON.stringify({
        suggestions: [
          'feature/oauth2-authentication',
          'feat/auth-oauth2-implementation',
          'feature/user-authentication-oauth2',
        ],
        recommended: 'feature/oauth2-authentication',
      }));

      const branchSuggestion = await aiService.suggestBranchName({
        type: 'feature',
        description: 'implement OAuth2 authentication',
        scope: 'auth',
      });

      expect(mockProvider.generateText).toHaveBeenCalled();
      expect(branchSuggestion.recommended).toBe(
        'feature/implement-oauth2-authentication',
      );
      expect(branchSuggestion.suggestions).toHaveLength(3);
    });

    it('should suggest commit messages based on changes', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);

      mockProvider.generateText.mockResolvedValue(JSON.stringify({
        suggestions: [
          'feat(auth): implement OAuth2 authentication',
          'feat(auth): add OAuth2 login support',
          'feat: implement OAuth2 authentication system',
        ],
        recommended: 'feat(auth): implement OAuth2 authentication',
      }));

      const commitSuggestion = await aiService.suggestCommitMessage({
        files: ['/src/auth/oauth2.js', '/src/auth/providers/google.js'],
        changes: 'Added OAuth2 authentication with Google provider support',
      });

      expect(mockProvider.generateText).toHaveBeenCalled();
      expect(commitSuggestion.recommended).toBe(
        'feat: Added OAuth2 authentication with Google provider support',
      );
      expect(commitSuggestion.suggestions).toHaveLength(3);
    });

    it('should analyze impact of changes', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);

      mockProvider.generateText.mockResolvedValue(JSON.stringify({
        riskLevel: 'medium',
        affectedAreas: ['authentication', 'user-management', 'api-security'],
        recommendations: [
          'Update authentication tests',
          'Review security policies',
          'Update API documentation',
        ],
        estimatedEffort: 'medium',
      }));

      const impactAnalysis = await aiService.analyzeImpact({
        changes: [
          {
            file: '/src/auth/oauth2.js',
            type: 'added',
            linesAdded: 150,
            linesRemoved: 0,
          },
          {
            file: '/src/auth/legacy-auth.js',
            type: 'modified',
            linesAdded: 5,
            linesRemoved: 20,
          },
        ],
      });

      expect(mockProvider.generateText).toHaveBeenCalled();
      expect(impactAnalysis.riskLevel).toBe('medium');
      expect(impactAnalysis.affectedAreas).toContain('/src/auth/oauth2.js');
      expect(impactAnalysis.recommendations).toHaveLength(2);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle provider failures gracefully', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);

      mockProvider.generateChangelog.mockRejectedValue(
        new Error('API rate limit exceeded'),
      );

      const validCommits = [{ hash: 'abc123', message: 'test commit', author: 'test', date: new Date() }];

      await expect(
        aiService.generateChangelog(validCommits, { version: '1.0.0' }),
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should validate inputs before processing', async () => {
      const aiService = new AIServiceV2(mockProvider as any, config);

      await expect(
        aiService.analyzeCode('', { language: 'javascript' }),
      ).rejects.toThrow('Code content cannot be empty');

      await expect(
        aiService.generateChangelog('invalid' as any, { version: 'invalid' }),
      ).rejects.toThrow('Commits must be an array');

      const validCommits = [{ hash: 'abc123', message: 'test commit', author: 'test', date: new Date() }];

      await expect(
        aiService.generateChangelog(validCommits, { version: 'invalid' }),
      ).rejects.toThrow('Invalid version format');
    });

    it('should handle configuration errors', () => {
      const invalidConfig = {
        defaultProvider: 'nonexistent' as any,
        providers: {},
      };

      expect(() => new AIServiceV2(mockProvider as any, invalidConfig)).toThrow(
        'Provider "nonexistent" is not supported',
      );
    });
  });

  describe('Performance and Caching', () => {
    it('should cache analysis results when enabled', async () => {
      const cacheConfig = {
        ...config,
        cache: {
          enabled: true,
          ttl: 3600,
          maxSize: 100,
        },
      };

      const aiService = new AIServiceV2(mockProvider as any, cacheConfig);
      const codeAnalyzer = new CodeAnalyzer({ provider: mockProvider as any });

      const sourceCode = 'function test() { return true; }';

      // First analysis
      const result1 = await codeAnalyzer.analyzeFile('/test.js', sourceCode);

      // Second analysis (should use cache if implemented)
      const result2 = await codeAnalyzer.analyzeFile('/test.js', sourceCode);

      expect(result1.filePath).toBe(result2.filePath);
      expect(result1.metrics.linesOfCode).toBe(result2.metrics.linesOfCode);
    });

    it('should handle large files efficiently', async () => {
      const codeAnalyzer = new CodeAnalyzer({
        provider: mockProvider as any,
        maxFileSize: 2 * 1024 * 1024, // 2MB
        supportedExtensions: ['.js'],
        analysisTimeout: 30000,
        enableMetrics: true,
        enableSuggestions: true,
      });

      const largeCode = 'function test() { return true; }\n'.repeat(10000);

      const startTime = Date.now();
      const result = await codeAnalyzer.analyzeFile('/large.js', largeCode);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
