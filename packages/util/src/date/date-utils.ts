/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date, format: 'short' | 'medium' | 'long' | 'iso' = 'medium'): string {
  const formats = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' } as const,
    medium: { year: 'numeric', month: 'short', day: 'numeric' } as const,
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' } as const,
    iso: 'iso' as const,
  }

  if (format === 'iso') {
    return date.toISOString().split('T')[0]!
  }

  return date.toLocaleDateString('en-US', formats[format])
}

/**
 * Gets the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

/**
 * Checks if a date is this week
 */
export function isThisWeek(date: Date): boolean {
  const today = new Date()
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()))

  return date >= startOfWeek && date <= endOfWeek
}

/**
 * Adds days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Adds months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Gets the start of the day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Gets the end of the day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Gets a relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const diffMs = baseDate.getTime() - date.getTime()
  const diffSecs = Math.round(diffMs / 1000)
  const diffMins = Math.round(diffSecs / 60)
  const diffHours = Math.round(diffMins / 60)
  const diffDays = Math.round(diffHours / 24)
  const diffMonths = Math.round(diffDays / 30)
  const diffYears = Math.round(diffDays / 365)

  if (Math.abs(diffSecs) < 60) {
    return 'just now'
  }
  else if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `${diffMins} minutes ago` : `in ${Math.abs(diffMins)} minutes`
  }
  else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours} hours ago` : `in ${Math.abs(diffHours)} hours`
  }
  else if (Math.abs(diffDays) < 30) {
    return diffDays > 0 ? `${diffDays} days ago` : `in ${Math.abs(diffDays)} days`
  }
  else if (Math.abs(diffMonths) < 12) {
    return diffMonths > 0 ? `${diffMonths} months ago` : `in ${Math.abs(diffMonths)} months`
  }
  else {
    return diffYears > 0 ? `${diffYears} years ago` : `in ${Math.abs(diffYears)} years`
  }
}
