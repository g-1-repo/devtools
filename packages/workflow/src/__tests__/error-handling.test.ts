/**
 * Test suite for error handling components
 */

import { ErrorFormatter } from '@g-1/util/debug'
import { describe, expect, it } from 'vitest'
import { ErrorRecoveryService } from '../core/error-recovery'

describe('error Formatter', () => {
  describe('formatError', () => {
    it('should format basic Error objects', () => {
      const error = new Error('Test error message')
      const formatted = ErrorFormatter.formatError(error)

      expect(formatted.message).toContain('Test error message')
      expect(typeof formatted.message).toBe('string')
      expect(formatted.type).toBe('critical')
    })

    it('should handle errors with stack traces', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'

      const formatted = ErrorFormatter.formatError(error)
      expect(formatted.message).toContain('Test error')
      expect(formatted.context).toBeDefined()
    })

    it('should handle string errors', () => {
      const formatted = ErrorFormatter.formatError('Simple string error')
      expect(formatted.message).toContain('Simple string error')
    })

    it('should handle different error types', () => {
      const critical = ErrorFormatter.formatError('Critical error', 'critical')
      const warning = ErrorFormatter.formatError('Warning error', 'warning')
      const info = ErrorFormatter.formatError('Info error', 'info')

      expect(critical.type).toBe('critical')
      expect(warning.type).toBe('warning')
      expect(info.type).toBe('info')
    })

    it('should format workflow failures', () => {
      const formatted = ErrorFormatter.formatWorkflowFailure('Test Step', 'Step failed')
      expect(formatted).toContain('Test Step')
      expect(formatted).toContain('Step failed')
    })

    it('should create error boxes', () => {
      const box = ErrorFormatter.createErrorBox('Title', 'Message', ['Suggestion 1'])
      expect(box).toContain('Title')
      expect(box).toContain('Message')
      expect(box).toContain('Suggestion 1')
    })
  })
})

describe('error Recovery', () => {
  describe('errorRecoveryService', () => {
    it('should create error recovery service', () => {
      const recovery = ErrorRecoveryService.getInstance()
      expect(recovery).toBeDefined()
      expect(typeof recovery.analyzeError).toBe('function')
    })

    it('should be singleton', () => {
      const recovery1 = ErrorRecoveryService.getInstance()
      const recovery2 = ErrorRecoveryService.getInstance()
      expect(recovery1).toBe(recovery2)
    })

    it('should analyze linting errors', async () => {
      const recovery = ErrorRecoveryService.getInstance()

      const mockError = new Error('eslint: style issues found')
      const analysis = await recovery.analyzeError(mockError)

      expect(analysis.type).toBe('linting')
      expect(analysis.fixable).toBe(true)
    })

    it('should analyze TypeScript errors', async () => {
      const recovery = ErrorRecoveryService.getInstance()

      const mockError = new Error('TypeScript compilation failed')
      const analysis = await recovery.analyzeError(mockError)

      expect(analysis.type).toBe('typescript')
      expect(analysis.fixable).toBe(false)
    })

    it('should analyze authentication errors', async () => {
      const recovery = ErrorRecoveryService.getInstance()

      const mockError = new Error('401 Unauthorized')
      const analysis = await recovery.analyzeError(mockError)

      expect(analysis.type).toBe('authentication')
      expect(analysis.fixable).toBe(false)
    })
  })

  describe('recovery workflows', () => {
    it('should create recovery workflows', async () => {
      const recovery = ErrorRecoveryService.getInstance()

      const analysis = {
        type: 'linting' as const,
        severity: 'warning' as const,
        fixable: true,
        description: 'Linting errors',
        suggestedFixes: ['Run lint:fix'],
      }

      const mockError = new Error('Linting error')
      const workflow = await recovery.createRecoveryWorkflow(analysis, mockError)

      expect(workflow).toBeDefined()
      expect(Array.isArray(workflow)).toBe(true)
      expect(workflow.length).toBeGreaterThan(0)
    })
  })

  describe('error execution', () => {
    it('should execute recovery workflows', async () => {
      const recovery = ErrorRecoveryService.getInstance()

      const mockError = new Error('Test error for recovery')

      // This will run the actual recovery workflow
      // We expect it to complete without throwing
      await expect(
        recovery.executeRecovery(mockError),
      ).resolves.toBeUndefined()
    })
  })
})
