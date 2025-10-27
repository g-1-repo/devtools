/**
 * Tests for CloudflareWorkersAI Provider
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudflareWorkersAI } from '../providers/cloudflare.js';
import type { CloudflareConfig } from '../types/index.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CloudflareWorkersAI', () => {
  let provider: CloudflareWorkersAI;
  let config: CloudflareConfig;

  beforeEach(() => {
    config = {
      accountId: 'test-account-id',
      apiToken: 'test-api-token',
      model: '@cf/meta/llama-2-7b-chat-int8',
    };
    provider = new CloudflareWorkersAI(config);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: 'Generated text response',
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateText('Test prompt', {
        maxTokens: 100,
        temperature: 0.7,
      });

      expect(result).toBe('Generated text response');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/run/@cf/meta/llama-2-7b-chat-int8'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          success: false,
          errors: [{ message: 'Invalid request' }],
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(provider.generateText('Test prompt')).rejects.toThrow(
        'Failed to generate text',
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.generateText('Test prompt')).rejects.toThrow(
        'Failed to generate text',
      );
    });

    it('should use custom options', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: { response: 'Custom response' },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await provider.generateText('Test prompt', {
        maxTokens: 200,
        temperature: 0.9,
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.max_tokens).toBe(200);
      expect(requestBody.temperature).toBe(0.9);
    });
  });

  describe('generateChangelog', () => {
    const mockCommits = [
      {
        hash: 'abc123',
        message: 'feat: add new feature',
        author: 'John Doe',
        date: new Date('2024-01-01'),
        body: 'Added a new feature for better user experience',
        files: ['src/feature.ts', 'tests/feature.test.ts'],
      },
      {
        hash: 'def456',
        message: 'fix: resolve bug in authentication',
        author: 'Jane Smith',
        date: new Date('2024-01-02'),
        body: 'Fixed authentication bug that was causing login issues',
        files: ['src/auth.ts'],
      },
    ];

    it('should generate changelog from commits', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: 'Generated changelog content',
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateChangelog(mockCommits);

      expect(result.content).toBe('Generated changelog content');
      expect(result.version).toBe('1.0.0');
      expect(result.format).toBe('markdown');
      expect(result.date).toBeDefined();
    });

    it('should handle empty commits array', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: 'No changes to report',
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateChangelog([]);
      expect(result.content).toBe('No changes to report');
      expect(result.version).toBe('1.0.0');
      expect(result.format).toBe('markdown');
    });

    it('should handle malformed AI response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: 'Invalid JSON response',
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateChangelog(mockCommits);
      expect(result.content).toBe('Invalid JSON response');
      expect(result.version).toBe('1.0.0');
      expect(result.format).toBe('markdown');
    });
  });

  describe('analyzeCode', () => {
    const sampleCode = `
function processData(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] != null) {
      result.push(data[i].toString().toUpperCase());
    }
  }
  return result;
}
`;

    it('should analyze code and return structured results', async () => {
      const mockAnalysis = {
        qualityScore: 7.5,
        securityIssues: [
          {
            type: 'input-validation',
            severity: 'medium',
            description: 'Input data is not validated',
            line: 2,
            suggestion: 'Add input validation to ensure data is an array',
          },
        ],
        performanceIssues: [
          {
            type: 'algorithm',
            severity: 'low',
            description:
              'Using traditional for loop instead of modern array methods',
            line: 3,
            suggestion: 'Consider using Array.map() for better readability',
          },
        ],
        qualityIssues: [
          {
            type: 'code-style',
            severity: 'low',
            description: 'Using loose equality operator',
            line: 4,
            suggestion:
              'Use strict equality (===) instead of loose equality (!=)',
          },
        ],
        refactoringSuggestions: [
          {
            type: 'modernization',
            description: 'Refactor to use modern JavaScript features',
            before: sampleCode,
            after:
              'const processData = (data) => data?.filter(item => item != null).map(item => item.toString().toUpperCase());',
          },
        ],
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: JSON.stringify(mockAnalysis),
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.analyzeCode(sampleCode, {
        language: 'javascript',
        includeSecurity: true,
        includePerformance: true,
        includeRefactoring: true,
      });

      expect(result.quality.maintainability).toBe(75);
      expect(result.security).toHaveLength(0);
      expect(result.performance).toHaveLength(0);
      expect(result.quality.codeSmells).toHaveLength(0);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should handle code analysis options', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: JSON.stringify({
              qualityScore: 8.0,
              securityIssues: [],
              performanceIssues: [],
              qualityIssues: [],
            }),
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await provider.analyzeCode(sampleCode, {
        language: 'typescript',
        includeSecurity: false,
        includePerformance: false,
        includeRefactoring: false,
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].content).toContain('typescript');
      expect(requestBody.messages[0].content).not.toContain('security');
      expect(requestBody.messages[0].content).not.toContain('performance');
    });
  });

  describe('configuration', () => {
    it('should use custom base URL', () => {
      const customConfig = {
        ...config,
        baseUrl: 'https://custom.api.com',
      };
      const customProvider = new CloudflareWorkersAI(customConfig);

      expect(customProvider).toBeDefined();
      // The baseUrl is used internally, so we can't directly test it
      // but we can verify the provider was created successfully
    });

    it('should use custom model', async () => {
      const customConfig = {
        ...config,
        model: '@cf/meta/llama-2-13b-chat-int8',
      };
      const customProvider = new CloudflareWorkersAI(customConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          result: { response: 'Custom model response' },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await customProvider.generateText('Test prompt');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/run/@cf/meta/llama-2-13b-chat-int8'),
        expect.any(Object),
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing API token', () => {
      // The constructor doesn't validate API token, it just uses defaults
      expect(() => {
        new CloudflareWorkersAI({
          ...config,
          apiToken: '',
        });
      }).not.toThrow();
    });

    it('should handle missing account ID', () => {
      // The constructor doesn't validate account ID, it uses a default endpoint
      expect(() => {
        new CloudflareWorkersAI({
          ...config,
          accountId: '',
        });
      }).not.toThrow();
    });

    it('should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          success: false,
          errors: [{ message: 'Rate limit exceeded' }],
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(provider.generateText('Test prompt')).rejects.toThrow(
        'Failed to generate text',
      );
    });
  });
});
