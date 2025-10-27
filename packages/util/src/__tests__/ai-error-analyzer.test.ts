/**
 * Tests for AI Error Analyzer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIErrorAnalyzer } from '../debug/ai-error-analyzer.js'
import { AIServiceV2 } from '@g-1/ai-core'
import type { CodeAnalysisResult } from '@g-1/ai-core'

// Mock the AI service
vi.mock('@g-1/ai-core')

describe('AIErrorAnalyzer', () => {
  let analyzer: AIErrorAnalyzer
  let mockAIService: vi.Mocked<AIServiceV2>

  beforeEach(() => {
    mockAIService = {
      analyzeCode: vi.fn(),
      generateText: vi.fn(),
    } as any

    vi.mocked(AIServiceV2).mockImplementation(() => mockAIService)

    analyzer = new AIErrorAnalyzer({
      provider: 'cloudflare',
      cloudflare: {
        accountId: 'test-account',
        apiToken: 'test-token',
        model: '@cf/meta/llama-2-7b-chat-int8',
      },
    })
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
      const mockAnalysis = {
        summary: 'Null/undefined reference error in array processing',
        rootCause: 'The function processArray receives undefined instead of an array',
        severity: 'high' as const,
        category: 'runtime' as const,
        suggestions: [
          {
            type: 'fix' as const,
            description: 'Add null/undefined check before accessing array properties',
            code: 'if (!arr || !Array.isArray(arr)) return [];',
            confidence: 0.9,
          },
          {
            type: 'prevention' as const,
            description: 'Add TypeScript types to prevent undefined values',
            code: 'function processArray(arr: number[]): number[]',
            confidence: 0.8,
          },
        ],
        relatedPatterns: ['null-check', 'defensive-programming'],
        estimatedFixTime: '5-10 minutes',
      }

      mockAIService.analyzeCode.mockResolvedValueOnce({
        qualityScore: 6.0,
        securityIssues: [],
        performanceIssues: [],
        qualityIssues: [],
        refactoringSuggestions: [],
      })

      // Mock the text generation for error analysis
      mockAIService.generateText = vi.fn().mockResolvedValueOnce({
        text: JSON.stringify(mockAnalysis),
        usage: { totalTokens: 150 },
      })

      const result = await analyzer.analyzeError(sampleError, sampleContext)

      expect(result).toEqual(mockAnalysis)
      expect(mockAIService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Cannot read property "length" of undefined'),
        expect.any(Object)
      )
    })

    it('should analyze error without context', async () => {
      const mockAnalysis = {
        summary: 'Generic null reference error',
        rootCause: 'Attempting to access property on null/undefined value',
        severity: 'medium' as const,
        category: 'runtime' as const,
        suggestions: [
          {
            type: 'fix' as const,
            description: 'Add null checks before property access',
            code: 'if (obj && obj.property) { ... }',
            confidence: 0.7,
          },
        ],
        relatedPatterns: ['null-check'],
        estimatedFixTime: '2-5 minutes',
      }

      mockAIService.generateText = vi.fn().mockResolvedValueOnce({
        text: JSON.stringify(mockAnalysis),
        usage: { totalTokens: 100 },
      })

      const result = await analyzer.analyzeError(sampleError)

      expect(result).toEqual(mockAnalysis)
      expect(mockAIService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Cannot read property "length" of undefined'),
        expect.any(Object)
      )
    })

    it('should handle analysis errors gracefully', async () => {
      mockAIService.generateText = vi.fn().mockRejectedValueOnce(new Error('AI service error'))

      await expect(analyzer.analyzeError(sampleError, sampleContext)).rejects.toThrow(
        'AI service error'
      )
    })

    it('should handle malformed AI responses', async () => {
      mockAIService.generateText = vi.fn().mockResolvedValueOnce({
        text: 'Invalid JSON response',
        usage: { totalTokens: 50 },
      })

      await expect(analyzer.analyzeError(sampleError, sampleContext)).rejects.toThrow()
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
        qualityScore: 7.5,
        securityIssues: [],
        performanceIssues: [
          {
            type: 'algorithm',
            severity: 'low',
            description: 'Consider using reduce() for better functional style',
            line: 3,
            suggestion: 'return items.reduce((sum, item) => sum + item.price * item.quantity, 0)',
          },
        ],
        qualityIssues: [
          {
            type: 'code-style',
            severity: 'low',
            description: 'Missing input validation',
            line: 1,
            suggestion: 'Add validation: if (!Array.isArray(items)) throw new Error("Invalid input")',
          },
        ],
        refactoringSuggestions: [
          {
            type: 'modernization',
            description: 'Use modern JavaScript array methods',
            before: sampleCode,
            after: 'const calculateTotal = (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0)',
          },
        ],
      }

      mockAIService.analyzeCode.mockResolvedValueOnce(mockAnalysis)

      const result = await analyzer.analyzeCode(sampleCode, {
        language: 'javascript',
        includeSecurity: true,
        includePerformance: true,
        includeRefactoring: true,
      })

      expect(result).toEqual(mockAnalysis)
      expect(mockAIService.analyzeCode).toHaveBeenCalledWith(sampleCode, {
        language: 'javascript',
        includeSecurity: true,
        includePerformance: true,
        includeRefactoring: true,
      })
    })

    it('should use default options when none provided', async () => {
      const mockAnalysis: CodeAnalysisResult = {
        qualityScore: 8.0,
        securityIssues: [],
        performanceIssues: [],
        qualityIssues: [],
        refactoringSuggestions: [],
      }

      mockAIService.analyzeCode.mockResolvedValueOnce(mockAnalysis)

      await analyzer.analyzeCode(sampleCode)

      expect(mockAIService.analyzeCode).toHaveBeenCalledWith(sampleCode, undefined)
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

      mockAIService.generateText = vi.fn().mockResolvedValueOnce({
        text: JSON.stringify(mockSuggestions),
        usage: { totalTokens: 120 },
      })

      const result = await analyzer.getSuggestions(sampleContext)

      expect(result).toEqual(mockSuggestions)
      expect(mockAIService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('TypeError'),
        expect.any(Object)
      )
    })

    it('should handle empty suggestions', async () => {
      mockAIService.generateText = vi.fn().mockResolvedValueOnce({
        text: JSON.stringify([]),
        usage: { totalTokens: 50 },
      })

      const result = await analyzer.getSuggestions(sampleContext)

      expect(result).toEqual([])
    })
  })

  describe('caching', () => {
    it('should cache analysis results', async () => {
      const sampleError = new Error('Test error')
      const mockAnalysis = {
        summary: 'Test analysis',
        rootCause: 'Test cause',
        severity: 'low' as const,
        category: 'runtime' as const,
        suggestions: [],
        relatedPatterns: [],
        estimatedFixTime: '1 minute',
      }

      mockAIService.generateText = vi.fn().mockResolvedValueOnce({
        text: JSON.stringify(mockAnalysis),
        usage: { totalTokens: 100 },
      })

      // First call should hit the AI service
      const result1 = await analyzer.analyzeError(sampleError)
      expect(result1).toEqual(mockAnalysis)
      expect(mockAIService.generateText).toHaveBeenCalledTimes(1)

      // Second call with same error should use cache
      const result2 = await analyzer.analyzeError(sampleError)
      expect(result2).toEqual(mockAnalysis)
      expect(mockAIService.generateText).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should respect cache TTL', async () => {
      const shortTTLAnalyzer = new AIErrorAnalyzer(
        {
          provider: 'cloudflare',
          cloudflare: {
            accountId: 'test-account',
            apiToken: 'test-token',
            model: '@cf/meta/llama-2-7b-chat-int8',
          },
        },
        {
          enableCaching: true,
          cacheTTL: 1, // 1ms TTL for testing
        }
      )

      const sampleError = new Error('Test error')
      const mockAnalysis = {
        summary: 'Test analysis',
        rootCause: 'Test cause',
        severity: 'low' as const,
        category: 'runtime' as const,
        suggestions: [],
        relatedPatterns: [],
        estimatedFixTime: '1 minute',
      }

      mockAIService.generateText = vi.fn().mockResolvedValue({
        text: JSON.stringify(mockAnalysis),
        usage: { totalTokens: 100 },
      })

      // First call
      await shortTTLAnalyzer.analyzeError(sampleError)
      expect(mockAIService.generateText).toHaveBeenCalledTimes(1)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      // Second call should hit AI service again due to expired cache
      await shortTTLAnalyzer.analyzeError(sampleError)
      expect(mockAIService.generateText).toHaveBeenCalledTimes(2)
    })

    it('should work with caching disabled', async () => {
      const noCacheAnalyzer = new AIErrorAnalyzer(
        {
          provider: 'cloudflare',
          cloudflare: {
            accountId: 'test-account',
            apiToken: 'test-token',
            model: '@cf/meta/llama-2-7b-chat-int8',
          },
        },
        {
          enableCaching: false,
        }
      )

      const sampleError = new Error('Test error')
      const mockAnalysis = {
        summary: 'Test analysis',
        rootCause: 'Test cause',
        severity: 'low' as const,
        category: 'runtime' as const,
        suggestions: [],
        relatedPatterns: [],
        estimatedFixTime: '1 minute',
      }

      mockAIService.generateText = vi.fn().mockResolvedValue({
        text: JSON.stringify(mockAnalysis),
        usage: { totalTokens: 100 },
      })

      // Both calls should hit the AI service
      await noCacheAnalyzer.analyzeError(sampleError)
      await noCacheAnalyzer.analyzeError(sampleError)

      expect(mockAIService.generateText).toHaveBeenCalledTimes(2)
    })
  })

  describe('configuration', () => {
    it('should work with custom configuration', () => {
      const customAnalyzer = new AIErrorAnalyzer(
        {
          provider: 'cloudflare',
          cloudflare: {
            accountId: 'custom-account',
            apiToken: 'custom-token',
            model: '@cf/meta/llama-2-13b-chat-int8',
          },
        },
        {
          enableCaching: false,
          maxSuggestions: 10,
          includeStackTrace: false,
        }
      )

      expect(customAnalyzer).toBeDefined()
    })

    it('should use default configuration when not provided', () => {
      const defaultAnalyzer = new AIErrorAnalyzer({
        provider: 'cloudflare',
        cloudflare: {
          accountId: 'test-account',
          apiToken: 'test-token',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
      })

      expect(defaultAnalyzer).toBeDefined()
    })
  })
})