/**
 * Simple performance timer
 */
export function createTimer(label: string = 'Timer') {
  const start = performance.now()

  return {
    stop(): number {
      const end = performance.now()
      const duration = end - start
      console.log(`${label}: ${duration.toFixed(2)}ms`)
      return duration
    },
  }
}

/**
 * Logs with timestamp
 */
export function logWithTime(message: string, ...args: any[]): void {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, ...args)
}

/**
 * Pretty prints an object
 */
export function prettyPrint(obj: any, indent: number = 2): void {
  console.log(JSON.stringify(obj, null, indent))
}

/**
 * Measure function execution time
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>,
  label: string = 'Function',
): Promise<{ result: T, duration: number }> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const duration = end - start

  console.log(`${label} took ${duration.toFixed(2)}ms`)

  return { result, duration }
}
