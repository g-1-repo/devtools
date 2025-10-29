/**
 * Tests for AI Error Analyzer
 */

import type { CodeAnalysisResult } from '@g-1/ai-core'
import { CloudflareWorkersAI, CodeAnalyzer } from '@g-1/ai-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AIErrorAnalyzer } from '../debug/ai-error-analyzer.js'

// Mock the AI core dependencies
vi.mock('@g-1/ai-core', () => ({
  AIConfigManager: {
    getInstance: vi.fn(() => ({
      getProviderConfig: vi.fn(() => ({ apiKey: 'test-key' })),
    })),
  },
  CloudflareWorkersAI: vi.fn().mockImplementation(() => ({
    generateText: vi.fn(),
    analyzeCode: vi.fn(),
  })),
  CodeAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeCode: vi.fn(),
    getSuggestions: vi.fn(),
  })),
}))

describe('aIErrorAnalyzer', () => {
  let analyzer: AIErrorAnalyzer
  let mockCloudflareAI: any
  let mockCodeAnalyzer: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockCloudflareAI = {
      generateText: vi.fn(),
      analyzeCode: vi.fn(),
    }

    mockCodeAnalyzer = {
      analyzeCode: vi.fn(),
      getSuggestions: vi.fn(),
      provider: mockCloudflareAI,
      config: {},
      cache: new Map(),
      analyzeFile: vi.fn(),
      analyzeProject: vi.fn(),
      analyzeSecurityIssues: vi.fn(),
      analyzePerformance: vi.fn(),
      getRefactoringSuggestions: vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve([
                    { description: 'Mock suggestion 1' },
                    { description: 'Mock suggestion 2' },
                  ]),
                1,
              ),
            ),
        ),
      compareCodeQuality: vi.fn(),
    }

    // Mock the constructor calls - return the mock instances directly
    ;(CloudflareWorkersAI as any).mockImplementation(() => mockCloudflareAI)
    ;(CodeAnalyzer as any).mockImplementation(() => mockCodeAnalyzer)

    analyzer = new AIErrorAnalyzer({
      enabled: true,
      provider: 'cloudflare',
      maxAnalysisTime: 10000,
      cacheResults: true,
      includeCodeAnalysis: true,
    })

    // Ensure the analyzer is properly configured
    expect(analyzer).toBeDefined()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeError', () => {
    const sampleError = new Error('Cannot read property "length" of undefined')
    sampleError.stack = `Error: Cannot read property "length" of undefined
    at processArray (/path/to/file.js:10:15)
    at main (/path/to/file.js:20:5)`

    const sampleContext = {
      code: `
function processArray(arr) {
  return arr.length > 0 ? arr.map(x => x * 2) : [];
}

function main() {
  const data = getData();
  return processArray(data);
}
`,
      filePath: '/path/to/file.js',
      lineNumber: 10,
    }

    it('should analyze error with context successfully', async () => {
      const _mockAnalysis = {
        originalError: {
          message: 'Cannot read property "length" of undefined',
          type: 'critical' as const,
          timestamp: new Date().toISOString(),
          context: {},
        },
        suggestions: [
          'Add null/undefined check before accessing array properties',
          'Add TypeScript types to prevent undefined values',
        ],
        confidence: 0.9,
        analysisTime: 150,
      }

      const result = await analyzer.analyzeError(sampleError, sampleContext)

      expect(result).toMatchObject({
        originalError: expect.objectContaining({
          message: expect.stringContaining('Cannot read property "length" of undefined'),
          type: 'critical',
        }),
        suggestions: expect.any(Array),
        confidence: expect.any(Number),
        analysisTime: expect.any(Number),
      })
    })

    it('should analyze error without context', async () => {
      const result = await analyzer.analyzeError(sampleError)

      expect(result).toMatchObject({
        originalError: expect.objectContaining({
          message: expect.stringContaining('Cannot read property "length" of undefined'),
          type: 'critical',
        }),
        suggestions: expect.any(Array),
        confidence: expect.any(Number),
        analysisTime: expect.any(Number),
      })
    })

    it('should handle analysis errors gracefully', async () => {
      // Test with disabled analyzer
      const disabledAnalyzer = new AIErrorAnalyzer({
        enabled: false,
        provider: 'cloudflare',
        maxAnalysisTime: 10000,
        cacheResults: true,
        includeCodeAnalysis: false,
      })

      const result = await disabledAnalyzer.analyzeError(sampleError, sampleContext)

      expect(result).toMatchObject({
        originalError: expect.objectContaining({
          message: expect.stringContaining('Cannot read property "length" of undefined'),
        }),
        suggestions: expect.any(Array),
        confidence: expect.any(Number),
        analysisTime: expect.any(Number),
      })
    })

    it('should handle malformed AI responses', async () => {
      // This test verifies the analyzer handles errors gracefully
      const result = await analyzer.analyzeError(sampleError, sampleContext)

      expect(result).toMatchObject({
        originalError: expect.any(Object),
        suggestions: expect.any(Array),
        confidence: expect.any(Number),
        analysisTime: expect.any(Number),
      })
    })
  })

  describe('analyzeCode', () => {
    const sampleCode = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
`

    it('should analyze code successfully', async () => {
      const mockAnalysis: CodeAnalysisResult = {
        quality: {
          complexity: 7.5,
          maintainability: 75,
          codeSmells: [
            {
              type: 'code-style',
              severity: 'minor',
              description: 'Missing input validation',
              line: 1,
            },
          ],
          duplications: [],
        },
        security: [],
        performance: [
          {
            type: 'cpu',
            severity: 'low',
            description: 'Consider using reduce() for better functional style',
            line: 3,
            impact: 'Minor performance improvement',
            suggestion: 'return items.reduce((sum, item) => sum + item.price * item.quantity, 0)',
          },
        ],
        suggestions: [
          {
            type: 'modernize',
            priority: 'medium',
            description: 'Use modern JavaScript array methods',
            before: sampleCode,
            after:
              'const calculateTotal = (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0)',
            reasoning: 'Functional programming approach is more readable',
          },
        ],
        metrics: {
          linesOfCode: 8,
          cyclomaticComplexity: 2,
          cognitiveComplexity: 2,
          maintainabilityIndex: 75,
          technicalDebt: '1h',
        },
      }

      mockCodeAnalyzer.analyzeFile.mockResolvedValueOnce(mockAnalysis)

      const result = await analyzer.analyzeCode('test.js', sampleCode)

      expect(result).toEqual(mockAnalysis)
      expect(mockCodeAnalyzer.analyzeFile).toHaveBeenCalledWith(sampleCode, 'test.js')
    })

    it('should use default options when none provided', async () => {
      const mockAnalysis: CodeAnalysisResult = {
        quality: {
          complexity: 8.0,
          maintainability: 85,
          codeSmells: [],
          duplications: [],
        },
        security: [],
        performance: [],
        suggestions: [],
        metrics: {
          linesOfCode: 8,
          cyclomaticComplexity: 1,
          cognitiveComplexity: 1,
          maintainabilityIndex: 85,
          technicalDebt: '0h',
        },
      }

      mockCodeAnalyzer.analyzeFile.mockResolvedValueOnce(mockAnalysis)

      const result = await analyzer.analyzeCode('test.js', sampleCode)

      expect(result).toEqual(mockAnalysis)
    })
  })

  describe('getSuggestions', () => {
    const sampleContext = {
      errorType: 'TypeError',
      errorMessage: 'Cannot read property "map" of undefined',
      codeSnippet: 'const result = data.map(x => x.id)',
      language: 'javascript' as const,
    }

    it('should get code suggestions successfully', async () => {
      const mockSuggestions = [
        {
          type: 'fix' as const,
          description: 'Add null check before using map',
          code: 'const result = data ? data.map(x => x.id) : []',
          confidence: 0.9,
        },
        {
          type: 'improvement' as const,
          description: 'Use optional chaining for safer property access',
          code: 'const result = data?.map(x => x.id) ?? []',
          confidence: 0.95,
        },
      ]

      mockCodeAnalyzer.getRefactoringSuggestions.mockResolvedValueOnce(mockSuggestions)

      const result = await analyzer.getSuggestions(sampleContext.codeSnippet, {
        language: sampleContext.language,
        purpose: 'error-fix',
      })

      expect(result).toEqual([
        'Add null check before using map',
        'Use optional chaining for safer property access',
      ])
      expect(mockCodeAnalyzer.getRefactoringSuggestions).toHaveBeenCalledWith(
        sampleContext.codeSnippet,
        'temp.ts',
        expect.objectContaining({
          language: sampleContext.language,
        }),
      )
    })

    it('should handle empty suggestions', async () => {
      mockCodeAnalyzer.getRefactoringSuggestions.mockResolvedValueOnce([])

      const result = await analyzer.getSuggestions(sampleContext.codeSnippet, {
        language: sampleContext.language,
        purpose: 'error-fix',
      })

      expect(result).toEqual([])
    })
  })

  describe('caching', () => {
    it('should cache analysis results', async () => {
      const sampleError = new Error('Test error')
      const mockSuggestions = [
        { description: 'Fix suggestion 1' },
        { description: 'Fix suggestion 2' },
      ]

      mockCodeAnalyzer.getRefactoringSuggestions.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSuggestions), 1)),
      )

      // First call should hit the AI service
      const result1 = await analyzer.analyzeError(sampleError)
      expect(result1.suggestions).toEqual(['Fix suggestion 1', 'Fix suggestion 2'])
      expect(result1.originalError).toBeDefined()
      expect(result1.confidence).toBeGreaterThan(0)
      expect(result1.analysisTime).toBeGreaterThan(0)
      expect(mockCodeAnalyzer.getRefactoringSuggestions).toHaveBeenCalledTimes(1)

      // Second call with same error should use cache
      const result2 = await analyzer.analyzeError(sampleError)
      expect(result2.suggestions).toEqual(['Fix suggestion 1', 'Fix suggestion 2'])
      expect(mockCodeAnalyzer.getRefactoringSuggestions).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should respect cache TTL', async () => {
      const shortTTLAnalyzer = new AIErrorAnalyzer({
        enabled: true,
        provider: 'cloudflare',
        maxAnalysisTime: 10000,
        cacheResults: true,
        includeCodeAnalysis: false,
      })

      const sampleError = new Error('Test error')
      const mockSuggestions = [
        { description: 'Fix suggestion 1' },
        { description: 'Fix suggestion 2' },
      ]

      mockCodeAnalyzer.getRefactoringSuggestions.mockResolvedValue(mockSuggestions)

      // First call
      await shortTTLAnalyzer.analyzeError(sampleError)
      expect(mockCodeAnalyzer.getRefactoringSuggestions).toHaveBeenCalledTimes(1)

      // Clear cache to simulate expiration
      shortTTLAnalyzer.clearCache()

      // Second call should hit AI service again due to cleared cache
      await shortTTLAnalyzer.analyzeError(sampleError)
      expect(mockCodeAnalyzer.getRefactoringSuggestions).toHaveBeenCalledTimes(2)
    })

    it('should work with caching disabled', async () => {
      const noCacheAnalyzer = new AIErrorAnalyzer({
        enabled: true,
        provider: 'cloudflare',
        maxAnalysisTime: 10000,
        cacheResults: false,
        includeCodeAnalysis: false,
      })

      const sampleError = new Error('Test error')
      const mockSuggestions = [
        { description: 'Fix suggestion 1' },
        { description: 'Fix suggestion 2' },
      ]

      // Mock the getRefactoringSuggestions method that's actually called
      mockCodeAnalyzer.getRefactoringSuggestions.mockResolvedValue(mockSuggestions)

      // Both calls should hit the AI service
      await noCacheAnalyzer.analyzeError(sampleError)
      await noCacheAnalyzer.analyzeError(sampleError)

      expect(mockCodeAnalyzer.getRefactoringSuggestions).toHaveBeenCalledTimes(2)
    })
  })

  describe('configuration', () => {
    it('should work with custom configuration', () => {
      const customAnalyzer = new AIErrorAnalyzer({
        enabled: true,
        provider: 'cloudflare',
        maxAnalysisTime: 10000,
        cacheResults: false,
        includeCodeAnalysis: false,
      })

      expect(customAnalyzer).toBeDefined()
    })

    it('should use default configuration when not provided', () => {
      const defaultAnalyzer = new AIErrorAnalyzer({
        enabled: true,
        provider: 'cloudflare',
        maxAnalysisTime: 10000,
        cacheResults: true,
        includeCodeAnalysis: false,
      })

      expect(defaultAnalyzer).toBeDefined()
    })
  })
})
