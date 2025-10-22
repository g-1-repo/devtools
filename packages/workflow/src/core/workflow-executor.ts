import type { WorkflowContext } from '../types/index.js'
import { OptimizedErrorRecoveryService } from './optimized-error-recovery.js'
import { createTaskEngine } from './task-engine.js'

/**
 * Execute workflow with optimized error recovery
 */
export async function executeWorkflow(
  name: string,
  context?: WorkflowContext,
  options = { enableRecovery: true },
): Promise<WorkflowContext> {
  const taskEngine = createTaskEngine({
    concurrent: false,
    exitOnError: true,
    showTimer: true,
  })

  try {
    return await taskEngine.execute([], context || {})
  }
  catch (error) {
    if (options.enableRecovery) {
      const recovery = OptimizedErrorRecoveryService.getInstance()
      await recovery.executeRecovery(error instanceof Error ? error : new Error(String(error)), context)
    }
    throw error
  }
}
