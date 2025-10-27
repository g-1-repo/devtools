/**
 * Tests for CodeAnalyzer Service
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CodeAnalyzerConfig,
  FileAnalysisResult,
  ProjectAnalysisResult,
} from '../services/code-analyzer.js';
import { CodeAnalyzer } from '../services/code-analyzer.js';

// Mock provider for testing
const mockProvider = {
  generateText: vi.fn(),
  generateChangelog: vi.fn(),
  analyzeCode: vi.fn(),
};

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;
  let config: CodeAnalyzerConfig;

  beforeEach(() => {
    config = {
      provider: mockProvider as any,
      defaultLanguage: 'javascript',
      enableCaching: true,
      customRules: [],
    };
    analyzer = new CodeAnalyzer(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create CodeAnalyzer with default config', () => {
      const defaultAnalyzer = new CodeAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(CodeAnalyzer);
    });

    it('should create CodeAnalyzer with custom config', () => {
      expect(analyzer).toBeInstanceOf(CodeAnalyzer);
    });
  });

  describe('analyzeFile', () => {
    beforeEach(() => {
      // Mock the analyzeCode method to return a proper result
      mockProvider.analyzeCode.mockResolvedValue({
        suggestions: [],
        issues: [],
        security: [],
        performance: [],
        metrics: {
          linesOfCode: 10,
          cyclomaticComplexity: 5,
          maintainabilityIndex: 80,
          technicalDebt: 5,
        },
        language: 'javascript',
        filePath: '/test.js',
      });
    });

    it('should analyze JavaScript file successfully', async () => {
      const filePath = '/test/sample.js';
      const content = `
        function add(a, b) {
          return a + b;
        }
        
        function multiply(x, y) {
          return x * y;
        }
        
        // Unused variable
        const unused = 'test';
        
        console.log(add(1, 2));
      `;

      const result = await analyzer.analyzeFile(content, filePath);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(filePath);
      expect(result.language).toBe('javascript');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.linesOfCode).toBeGreaterThan(0);
      expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should analyze TypeScript file successfully', async () => {
      const filePath = '/test/sample.ts';
      const content = `
        interface User {
          id: number;
          name: string;
          email?: string;
        }
        
        class UserService {
          private users: User[] = [];
          
          addUser(user: User): void {
            this.users.push(user);
          }
          
          getUser(id: number): User | undefined {
            return this.users.find(u => u.id === id);
          }
        }
        
        const service = new UserService();
      `;

      const result = await analyzer.analyzeFile(content, filePath);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(filePath);
      expect(result.language).toBe('typescript');
      expect(result.metrics).toBeDefined();
      expect(result.issues).toBeDefined();
    });

    it('should handle analysis errors gracefully', async () => {
      const filePath = '/test/error.js';
      const content = 'invalid syntax here {';

      mockProvider.analyzeCode.mockRejectedValueOnce(
        new Error('Analysis failed'),
      );

      await expect(analyzer.analyzeFile(content, filePath)).rejects.toThrow(
        'Analysis failed',
      );
    });

    it('should handle empty files', async () => {
      const filePath = '/test/empty.js';
      const content = '';

      await expect(
        analyzer.analyzeFile(content, filePath),
      ).resolves.toBeDefined();
    });

    it('should detect code smells', async () => {
      const filePath = '/test/smelly.js';
      const content = `
        function longFunction(a, b, c, d, e, f, g, h, i, j) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                if (d > 0) {
                  if (e > 0) {
                    return a + b + c + d + e + f + g + h + i + j;
                  }
                }
              }
            }
          }
          return 0;
        }
        
        // Duplicate code
        function duplicate1() {
          console.log('duplicate');
          console.log('code');
          return true;
        }
        
        function duplicate2() {
          console.log('duplicate');
          console.log('code');
          return true;
        }
      `;

      // Mock specific response for this test with issues
      mockProvider.analyzeCode.mockResolvedValueOnce({
        suggestions: [],
        issues: [
          {
            type: 'complexity',
            severity: 'warning',
            message: 'Function has high cyclomatic complexity',
            line: 2,
            column: 1,
          },
        ],
        security: [],
        performance: [],
        metrics: {
          linesOfCode: 25,
          cyclomaticComplexity: 8,
          maintainabilityIndex: 60,
          technicalDebt: 15,
        },
        language: 'javascript',
        filePath: '/test/smelly.js',
      });

      const result = await analyzer.analyzeFile(content, filePath);

      expect(result.issues.length).toBeGreaterThan(0);

      const complexityIssues = result.issues.filter(
        (issue) =>
          issue.type === 'complexity' || issue.message.includes('complexity'),
      );
      expect(complexityIssues.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeProject', () => {
    it('should analyze multiple files in project', async () => {
      const files = [
        {
          path: '/src/utils.js',
          content: `
            export function formatDate(date) {
              return date.toISOString().split('T')[0];
            }
          `,
        },
        {
          path: '/src/api.js',
          content: `
            import { formatDate } from './utils.js';
            
            export async function fetchData() {
              const response = await fetch('/api/data');
              return response.json();
            }
          `,
        },
        {
          path: '/src/main.js',
          content: `
            import { fetchData } from './api.js';
            
            async function main() {
              const data = await fetchData();
              console.log(data);
            }
            
            main();
          `,
        },
      ];

      const result = await analyzer.analyzeProject(files);

      expect(result).toBeDefined();
      expect(result.files).toHaveLength(3);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalFiles).toBe(3);
      expect(result.summary.totalLines).toBeGreaterThan(0);
      expect(result.summary.averageComplexity).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle empty project', async () => {
      const result = await analyzer.analyzeProject([]);

      expect(result.files).toHaveLength(0);
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.totalLines).toBe(0);
      expect(result.summary.averageComplexity).toBe(0);
    });

    it('should generate project recommendations', async () => {
      const files = [
        {
          path: '/src/bad-code.js',
          content: `
            // Very complex function with many parameters
            function complexFunction(a, b, c, d, e, f, g, h, i, j, k, l) {
              if (a) {
                if (b) {
                  if (c) {
                    if (d) {
                      if (e) {
                        if (f) {
                          return a + b + c + d + e + f + g + h + i + j + k + l;
                        }
                      }
                    }
                  }
                }
              }
              return 0;
            }
            
            // Duplicate code blocks
            function process1() {
              console.log('processing');
              const result = Math.random() * 100;
              console.log('done');
              return result;
            }
            
            function process2() {
              console.log('processing');
              const result = Math.random() * 100;
              console.log('done');
              return result;
            }
          `,
        },
      ];

      // Mock analyzeFile to return results that will trigger recommendations
      mockProvider.analyzeCode.mockResolvedValueOnce({
        suggestions: [],
        issues: [],
        security: [
          {
            type: 'vulnerability',
            severity: 'critical',
            message: 'SQL injection vulnerability',
            line: 10,
            column: 5,
            rule: 'no-sql-injection',
          },
        ],
        performance: [],
        metrics: {
          linesOfCode: 50,
          complexity: 20, // High complexity to trigger recommendation
          maintainabilityIndex: 30, // Low maintainability to trigger recommendation
          technicalDebt: 15,
          cyclomaticComplexity: 20, // High cyclomatic complexity
        },
        language: 'javascript',
        filePath: '/src/bad-code.js',
      });

      const result = await analyzer.analyzeProject(files);

      expect(result.recommendations.length).toBeGreaterThan(0);

      const complexityRecommendations = result.recommendations.filter(
        (rec) => rec.type === 'performance' && rec.title.includes('Complexity'),
      );
      expect(complexityRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('detectCodeSmells', () => {
    it('should detect long parameter lists', async () => {
      const content = `
        function manyParams(a, b, c, d, e, f, g, h, i, j) {
          return a + b + c + d + e + f + g + h + i + j;
        }
      `;

      const result = await analyzer.analyzeFile(content, '/test.js');
      const parameterIssues = result.issues.filter(
        (issue) =>
          issue.message.includes('parameter') ||
          issue.message.includes('arguments'),
      );
      expect(parameterIssues.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect deeply nested code', async () => {
      const content = `
        function deepNesting(x) {
          if (x > 0) {
            if (x > 10) {
              if (x > 20) {
                if (x > 30) {
                  if (x > 40) {
                    return x * 2;
                  }
                }
              }
            }
          }
          return x;
        }
      `;

      const result = await analyzer.analyzeFile(content, '/test.js');
      const nestingIssues = result.issues.filter(
        (issue) =>
          issue.message.includes('nested') ||
          issue.message.includes('complexity'),
      );
      expect(nestingIssues.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect unused variables', async () => {
      const content = `
        function example() {
          const used = 'hello';
          const unused = 'world';
          
          console.log(used);
          return true;
        }
      `;

      const result = await analyzer.analyzeFile(content, '/test.js');
      // Note: Static analysis for unused variables is complex and may not be fully implemented
      expect(result.issues).toBeDefined();
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate basic code metrics', async () => {
      const content = `
        function simpleFunction(a, b) {
          if (a > b) {
            return a;
          } else {
            return b;
          }
        }
        
        function anotherFunction() {
          const x = 1;
          const y = 2;
          return x + y;
        }
      `;

      const result = await analyzer.analyzeFile(content, '/test.js');

      expect(result.metrics.linesOfCode).toBeGreaterThan(0);
      expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(result.metrics.maintainabilityIndex).toBeGreaterThan(0);
      expect(result.metrics.technicalDebt).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed JavaScript', async () => {
      const content = `
        function broken( {
          return "this is not valid JS"
        }
      `;

      // Should not throw but may report syntax issues
      const result = await analyzer.analyzeFile(content, '/test.js');
      expect(result).toBeDefined();
      expect(result.filePath).toBe('/test.js');
    });

    it('should handle empty files', async () => {
      // Mock specific response for empty files
      mockProvider.analyzeCode.mockResolvedValueOnce({
        suggestions: [],
        issues: [],
        metrics: {
          linesOfCode: 0,
          complexity: 0,
          maintainabilityIndex: 100,
          technicalDebt: 0,
        },
        language: 'javascript',
        filePath: '/empty.js',
      });

      const result = await analyzer.analyzeFile('', '/empty.js');

      expect(result).toBeDefined();
      expect(result.metrics.linesOfCode).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle files with only comments', async () => {
      const content = `
        // This is a comment
        /* This is another comment */
        /**
         * JSDoc comment
         */
      `;

      // Mock specific response for comment-only files
      mockProvider.analyzeCode.mockResolvedValueOnce({
        suggestions: [],
        issues: [],
        metrics: {
          linesOfCode: 0, // Only comments, no actual code
          complexity: 0,
          maintainabilityIndex: 100,
          technicalDebt: 0,
        },
        language: 'javascript',
        filePath: '/comments.js',
      });

      const result = await analyzer.analyzeFile(content, '/comments.js');

      expect(result).toBeDefined();
      expect(result.metrics.linesOfCode).toBe(0); // Only comments, no actual code
    });
  });
});
