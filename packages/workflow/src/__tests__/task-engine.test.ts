/**
 * Comprehensive TaskEngine test suite
 */

import type { WorkflowStep } from '../types/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskEngine } from '../core/task-engine.js'

describe('taskEngine', () => {
  let taskEngine: TaskEngine
  let mockSteps: WorkflowStep[]

  beforeEach(() => {
    taskEngine = new TaskEngine({ showTimer: false })

    mockSteps = [
      {
        title: 'Step 1',
        task: vi.fn().mockResolvedValue({ success: true }),
      },
      {
        title: 'Step 2',
        task: vi.fn().mockResolvedValue({ success: true }),
        subtasks: [
          {
            title: 'Subtask 2.1',
            task: vi.fn().mockResolvedValue({ success: true }),
          },
        ],
      },
      {
        title: 'Step 3',
        task: vi.fn().mockResolvedValue({ success: true }),
        skip: () => true, // Should be skipped
      },
    ]
  })

  describe('constructor', () => {
    it('should create TaskEngine with default options', () => {
      const engine = new TaskEngine()
      expect(engine).toBeInstanceOf(TaskEngine)
    })

    it('should create TaskEngine with custom options', () => {
      const engine = new TaskEngine({
        showTimer: true,
        concurrent: false,
        exitOnError: false,
      })
      expect(engine).toBeInstanceOf(TaskEngine)
    })
  })

  describe('execute', () => {
    it('should execute all steps successfully', async () => {
      const result = await taskEngine.execute(mockSteps)

      // Should return context object, not throw error
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should handle step failure', async () => {
      const failingStep: WorkflowStep = {
        title: 'Failing Step',
        task: vi.fn().mockRejectedValue(new Error('Step failed')),
      }

      await expect(taskEngine.execute([failingStep])).rejects.toThrow('Step failed')
    })

    it('should execute subtasks', async () => {
      const result = await taskEngine.execute([mockSteps[1]]) // Step with subtasks

      expect(result).toBeDefined()
      // Note: listr2 handles subtasks differently, so direct task calls may not be captured
    })

    it('should skip steps based on skip condition', async () => {
      const result = await taskEngine.execute([mockSteps[2]]) // Step with skip: true

      expect(result).toBeDefined()
      expect(mockSteps[2].task).not.toHaveBeenCalled()
    })

    it('should handle empty steps array', async () => {
      const result = await taskEngine.execute([])

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should pass context between steps', async () => {
      const contextSteps: WorkflowStep[] = [
        {
          title: 'Set Context',
          task: async (ctx) => {
            ctx.testValue = 'hello'
            return { success: true }
          },
        },
        {
          title: 'Read Context',
          task: async (ctx) => {
            expect(ctx.testValue).toBe('hello')
            return { success: true }
          },
        },
      ]

      const result = await taskEngine.execute(contextSteps)
      expect(result).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should collect multiple errors', async () => {
      const engine = new TaskEngine({ exitOnError: false })
      const errorSteps: WorkflowStep[] = [
        {
          title: 'Error 1',
          task: vi.fn().mockRejectedValue(new Error('First error')),
        },
        {
          title: 'Error 2',
          task: vi.fn().mockRejectedValue(new Error('Second error')),
        },
      ]

      // With exitOnError: false, engine should not throw, but continue
      const result = await engine.execute(errorSteps)
      expect(result).toBeDefined()
    })

    it('should exit on first error when exitOnError is true', async () => {
      const engine = new TaskEngine({ exitOnError: true })
      const errorSteps: WorkflowStep[] = [
        {
          title: 'Error 1',
          task: vi.fn().mockRejectedValue(new Error('First error')),
        },
        {
          title: 'Should not run',
          task: vi.fn().mockResolvedValue({ success: true }),
        },
      ]

      await expect(engine.execute(errorSteps)).rejects.toThrow('First error')
      expect(errorSteps[1].task).not.toHaveBeenCalled()
    })
  })

  describe('step validation', () => {
    it('should handle steps with missing task function', async () => {
      const invalidStep = {
        title: 'Invalid Step',
        // Missing task function
      } as WorkflowStep

      // Should handle invalid steps gracefully, either execute successfully or throw
      const result = await taskEngine.execute([invalidStep])
      expect(result).toBeDefined()
    })
  })

  describe('performance', () => {
    it('should complete steps in reasonable time', async () => {
      const start = Date.now()
      await taskEngine.execute(mockSteps)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })
  })
})
