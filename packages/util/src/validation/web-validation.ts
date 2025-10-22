/**
 * Enhanced validation utilities for web applications
 *
 * Provides common validation patterns for web APIs, forms, and data processing.
 */

import { isValidEmail as baseEmailValidator } from './index.js'

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[],
): { isValid: boolean, missingFields: string[] } {
  const missing = requiredFields.filter(field =>
    data[field] === undefined || data[field] === null || data[field] === '',
  )

  return {
    isValid: missing.length === 0,
    missingFields: missing.map(String),
  }
}

/**
 * Validate and normalize email address
 */
export function validateAndNormalizeEmail(email: string): {
  isValid: boolean
  normalizedEmail: string
  error?: string
} {
  if (!email || typeof email !== 'string') {
    return { isValid: false, normalizedEmail: '', error: 'Email is required' }
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (!baseEmailValidator(normalizedEmail)) {
    return { isValid: false, normalizedEmail, error: 'Invalid email format' }
  }

  return { isValid: true, normalizedEmail }
}

/**
 * Normalize email address (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: number | string,
  limit: number | string,
  maxLimit: number = 100,
): { page: number, limit: number } {
  const validatedPage = Math.max(1, Math.floor(Number(page) || 1))
  const validatedLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 20)), maxLimit)

  return { page: validatedPage, limit: validatedLimit }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity,
): { isValid: boolean, error?: string } {
  if (typeof value !== 'string') {
    return { isValid: false, error: 'Value must be a string' }
  }

  if (value.length < minLength) {
    return { isValid: false, error: `Must be at least ${minLength} characters` }
  }

  if (value.length > maxLength) {
    return { isValid: false, error: `Must be no more than ${maxLength} characters` }
  }

  return { isValid: true }
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min: number = -Infinity,
  max: number = Infinity,
): { isValid: boolean, error?: string } {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { isValid: false, error: 'Value must be a number' }
  }

  if (value < min) {
    return { isValid: false, error: `Must be at least ${min}` }
  }

  if (value > max) {
    return { isValid: false, error: `Must be no more than ${max}` }
  }

  return { isValid: true }
}

/**
 * Validate that a value is one of the allowed options
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: T[],
): { isValid: boolean, error?: string } {
  if (!allowedValues.includes(value as T)) {
    return {
      isValid: false,
      error: `Value must be one of: ${allowedValues.join(', ')}`,
    }
  }

  return { isValid: true }
}

/**
 * Comprehensive data validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Validate multiple fields at once
 */
export function validateFields(validations: Record<string, () => { isValid: boolean, error?: string }>): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [field, validate] of Object.entries(validations)) {
    const result = validate()
    if (!result.isValid && result.error) {
      errors[field] = result.error
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Create a validation function for common patterns
 */
export function createValidator<T>(
  validators: Array<(value: T) => { isValid: boolean, error?: string }>,
) {
  return (value: T): { isValid: boolean, errors: string[] } => {
    const errors: string[] = []

    for (const validator of validators) {
      const result = validator(value)
      if (!result.isValid && result.error) {
        errors.push(result.error)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
