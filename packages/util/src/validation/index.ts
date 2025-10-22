// Export core validation utilities (universal)
export * from './core.js'

// Re-export specific items from legacy validation-utils to avoid conflicts
export {
  isValidEmail as isValidEmailLegacy,
  isValidPhone as isValidPhoneLegacy,
  isValidUrl as isValidUrlLegacy,
  isValidUUID as isValidUUIDLegacy,
} from './validation-utils.js'

// Export enhanced web validation utilities
export * from './web-validation.js'

// Export web-specific validation utilities
export * from './web.js'
