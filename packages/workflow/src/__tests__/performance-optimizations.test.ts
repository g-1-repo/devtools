import { describe, expect, it, vi } from 'vitest'
import { CacheManager } from '../core/cache-manager'
import { MemoryManager } from '../core/memory-manager'
import { OptimizedErrorRecoveryService } from '../core/optimized-error-recovery'
import { ParallelExecutor } from '../core/parallel-executor'

describe('performance Optimizations', () => {
  describe('cacheManager', () => {
    it('should cache and retrieve values correctly', () => {
      const cache = new CacheManager<string, number>()
      cache.set('test', 123)
      expect(cache.get('test')).toBe(123)
    })

    it('should respect TTL settings', async () => {
      const cache = new CacheManager<string, number>({ ttl: 100 }) // 100ms TTL
      cache.set('test', 123)
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(cache.get('test')).toBeUndefined()
    })

    it('should respect max size settings', () => {
      const cache = new CacheManager<string, number>({ maxSize: 2 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3) // Should evict 'a'
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
    })
  })

  describe('memoryManager', () => {
    it('should track memory usage', () => {
      const manager = MemoryManager.getInstance()
      const stats = manager.getMemoryStats()
      expect(stats.heapUsed).toBeGreaterThan(0)
      expect(stats.heapTotal).toBeGreaterThan(0)
      expect(stats.memoryLimit).toBeGreaterThan(0)
    })

    it('should check memory availability', () => {
      const manager = MemoryManager.getInstance()
      expect(manager.isMemoryAvailable(1024)).toBe(true)
      expect(manager.isMemoryAvailable(Number.MAX_SAFE_INTEGER)).toBe(false)
    })

    it('should allow memory limit adjustment', () => {
      const manager = MemoryManager.getInstance()
      const newLimit = 1024 * 1024 * 100 // 100MB
      manager.setMemoryLimit(newLimit)
      expect(manager.getMemoryStats().memoryLimit).toBe(newLimit)
    })
  })

  describe('parallelExecutor', () => {
    it('should execute tasks in parallel', async () => {
      const executor = new ParallelExecutor({ maxConcurrent: 2 })
      const start = Date.now()

      const tasks = [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return 1
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return 2
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return 3
        },
      ]

      const results = await executor.executeAll(tasks)
      const duration = Date.now() - start

      expect(results).toEqual([1, 2, 3])
      expect(duration).toBeLessThan(300) // Should take ~200ms with 2 concurrent tasks
    })

    it('should handle task failures gracefully', async () => {
      const executor = new ParallelExecutor()
      const tasks = [
        async () => 1,
        async () => { throw new Error('Task failed') },
        async () => 3,
      ]

      await expect(executor.executeAll(tasks)).rejects.toThrow('Task failed')
    })
  })

  describe('optimizedErrorRecoveryService', () => {
    it('should cache error analysis results', async () => {
      const service = OptimizedErrorRecoveryService.getInstance()
      const error = new Error('ESLint: some linting error')

      // First analysis
      const analysis1 = await service.analyzeError(error)
      expect(analysis1.type).toBe('linting')

      // Second analysis should use cache
      const analysis2 = await service.analyzeError(error)
      expect(analysis2).toBe(analysis1) // Should be the same object reference
    })

    it('should create parallel recovery steps', async () => {
      const service = OptimizedErrorRecoveryService.getInstance()
      const error = new Error('ESLint: some linting error')

      const analysis = await service.analyzeError(error)
      const steps = await service.createRecoveryWorkflow(analysis, error)

      // Check step structure
      expect(steps.length).toBeGreaterThan(0)
      expect(steps.some(step => step.id === 'analysis')).toBe(true)
      expect(steps.some(step => step.dependencies?.length)).toBe(true)
    })

    it('should handle recovery failures gracefully', async () => {
      const service = OptimizedErrorRecoveryService.getInstance()
      const error = new Error('Unknown error type')

      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
      await service.executeRecovery(error)

      expect(mockConsoleError).toHaveBeenCalled()
      mockConsoleError.mockRestore()
    })
  })
})
