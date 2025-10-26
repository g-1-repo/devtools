/**
 * Test suite for enhanced error handler
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analyzeError,
  createWorkflowError,
  displayStructuredError,
  handleError,
  WorkflowError,
  withErrorHandling,
} from '../core/error-handler.js'

// Mock external dependencies
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn(),
}))
vi.mock('chalk', () => ({
  default: {
    red: vi.fn((text) => `red:${text}`),
    yellow: vi.fn((text) => `yellow:${text}`),
    green: vi.fn((text) => `green:${text}`),
    blue: vi.fn((text) => `blue:${text}`),
    gray: vi.fn((text) => `gray:${text}`),
    bold: vi.fn((text) => `bold:${text}`),
    dim: vi.fn((text) => `dim:${text}`),
  },
}))

describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('WorkflowError', () => {
    it('should create WorkflowError with all properties', () => {
      const error = new WorkflowError(
        'Test error',
        'git',
        'TEST_ERROR',
        ['Fix suggestion 1', 'Fix suggestion 2'],
        { context: 'test' }
      )

      expect(error.message).toBe('Test error')
      expect(error.category).toBe('git')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.suggestions).toEqual(['Fix suggestion 1', 'Fix suggestion 2'])
      expect(error.context).toEqual({ context: 'test' })
      expect(error.name).toBe('WorkflowError')
    })

    it('should create WorkflowError with minimal properties', () => {
      const error = new WorkflowError('Simple error')

      expect(error.message).toBe('Simple error')
      expect(error.category).toBe('unknown')
      expect(error.code).toBeUndefined()
      expect(error.suggestions).toEqual([])
      expect(error.context).toEqual({})
    })
  })

  describe('analyzeError', () => {
    it('should analyze Git-related errors', () => {
      const error = new Error('fatal: not a git repository')
      const analyzed = analyzeError(error)

      expect(analyzed.category).toBe('git')
      expect(analyzed.suggestions).toContain('Initialize a Git repository with `git init`')
    })

    it('should analyze NPM-related errors', () => {
      const error = new Error('npm ERR! 404 Not Found')
      const analyzed = analyzeError(error)

      expect(analyzed.category).toBe('npm')
      expect(analyzed.suggestions.length).toBeGreaterThan(0)
    })

    it('should analyze build errors', () => {
      const error = new Error('TypeScript error: Cannot find module')
      const analyzed = analyzeError(error)

      expect(analyzed.category).toBe('build')
      expect(analyzed.suggestions).toContain('Run `npm install` to install dependencies')
    })

    it('should analyze network errors', () => {
      const error = new Error('ENOTFOUND github.com')
      const analyzed = analyzeError(error)

      expect(analyzed.category).toBe('network')
      expect(analyzed.suggestions).toContain('Check your internet connection')
    })

    it('should analyze authentication errors', () => {
      const error = new Error('Permission denied (publickey)')
      const analyzed = analyzeError(error)

      expect(analyzed.category).toBe('auth')
      expect(analyzed.suggestions).toContain('Check your SSH key configuration')
    })

    it('should handle unknown errors', () => {
      const error = new Error('Some unknown error')
      const analyzed = analyzeError(error)

      expect(analyzed.category).toBe('unknown')
      expect(analyzed.suggestions).toContain('Check the error message for specific details')
    })

    it('should handle string errors', () => {
      const analyzed = analyzeError('String error message')

      expect(analyzed.category).toBe('unknown')
      expect(analyzed.message).toBe('String error message')
    })
  })

  describe('displayStructuredError', () => {
    it('should display error with all components', () => {
      const error = new WorkflowError(
        'Test error',
        'git',
        'TEST_ERROR',
        ['Suggestion 1', 'Suggestion 2'],
        { step: 'test-step' }
      )

      displayStructuredError(error)

      // Check that error details are displayed in structured format with ANSI codes
      expect(console.log).toHaveBeenCalledWith('\x1b[31m\x1b[1mError:\x1b[0m', 'Test error')
      expect(console.log).toHaveBeenCalledWith('\x1b[90mCode:\x1b[0m', '\x1b[33mTEST_ERROR\x1b[0m')
      expect(console.log).toHaveBeenCalledWith('\x1b[90mCategory:\x1b[0m', '\x1b[34mgit\x1b[0m')
    })

    it('should display error without suggestions', () => {
      const error = new WorkflowError('Simple error', 'unknown')

      displayStructuredError(error)

      expect(console.log).toHaveBeenCalledWith('\x1b[31m\x1b[1mError:\x1b[0m', 'Simple error')
      expect(console.log).toHaveBeenCalledWith('\x1b[90mCategory:\x1b[0m', '\x1b[34munknown\x1b[0m')
    })
  })

  describe('handleError', () => {
    it('should handle error with auto-fix enabled', async () => {
      const error = new Error('fatal: not a git repository')
      const mockAutoFix = vi.fn().mockResolvedValue({ success: true })

      await handleError(error, {
        autoFix: true,
        interactive: false,
        context: 'test',
        autoFixFunctions: {
          git: mockAutoFix,
        },
      })

      expect(mockAutoFix).toHaveBeenCalled()
    })

    it('should handle error without auto-fix', async () => {
      const error = new Error('Test error')

      await handleError(error, {
        autoFix: false,
        interactive: false,
        context: 'test',
      })

      expect(console.log).toHaveBeenCalledWith('\x1b[31m\x1b[1mError:\x1b[0m', 'Test error')
    })

    it('should handle WorkflowError instances', async () => {
      const error = new WorkflowError('Workflow error', 'git', 'GIT_ERROR')

      await handleError(error, {
        autoFix: false,
        interactive: false,
        context: 'test',
      })

      expect(console.log).toHaveBeenCalledWith('\x1b[31m\x1b[1mError:\x1b[0m', 'Workflow error')
    })
  })

  describe('createWorkflowError', () => {
    it('should create WorkflowError from regular Error', () => {
      const originalError = new Error('Original error')
      const workflowError = createWorkflowError(originalError, 'git', 'GIT_ERROR')

      expect(workflowError).toBeInstanceOf(WorkflowError)
      expect(workflowError.message).toBe('Original error')
      expect(workflowError.category).toBe('git')
      expect(workflowError.code).toBe('GIT_ERROR')
    })

    it('should preserve WorkflowError instances', () => {
      const originalError = new WorkflowError('Workflow error', 'npm')
      const result = createWorkflowError(originalError, 'git', 'GIT_ERROR')

      expect(result).toBe(originalError)
      expect(result.category).toBe('npm') // Should preserve original category
    })
  })

  describe('withErrorHandling', () => {
    it('should execute function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withErrorHandling(mockFn, {
        autoFix: false,
        interactive: false,
        context: 'test',
      })

      const result = await wrappedFn()
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalled()
    })

    it('should handle function errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'))
      const wrappedFn = withErrorHandling(mockFn, {
        autoFix: false,
        interactive: false,
        context: 'test',
      })

      await expect(wrappedFn()).rejects.toThrow('Function error')
      expect(mockFn).toHaveBeenCalled()
    })

    it('should handle synchronous function errors', async () => {
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error('Sync error')
      })
      const wrappedFn = withErrorHandling(mockFn, {
        autoFix: false,
        interactive: false,
        context: 'test',
      })

      await expect(wrappedFn()).rejects.toThrow('Sync error')
      expect(mockFn).toHaveBeenCalled()
    })
  })
})
