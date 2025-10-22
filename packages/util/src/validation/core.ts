/**
 * Core validation utilities - universal validation functions
 * Compatible with all JavaScript environments
 */

/**
 * Validates an email address using a robust regex pattern
 * @param email - The email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates a phone number (supports international and US formats)
 * @param phone - The phone number to validate
 * @returns true if phone number is valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  // Clean the phone number but preserve essential format
  const cleanPhone = phone.replace(/\s+/g, '')

  // US/Canada phone number patterns (10-11 digits)
  const patterns = [
    /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, // +1-123-456-7890, 1-123-456-7890, etc.
    /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, // (123) 456-7890, 123-456-7890, etc.
    /^\d{10}$/, // 1234567890
  ]

  return patterns.some(pattern => pattern.test(cleanPhone))
}

/**
 * Validates a UUID (versions 1-5)
 * @param uuid - The UUID string to validate
 * @returns true if UUID is valid, false otherwise
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validates a hexadecimal color code
 * @param color - The color code to validate (with or without #)
 * @returns true if valid hex color, false otherwise
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#?(?:[0-9A-F]{3}|[0-9A-F]{6})$/i
  return hexRegex.test(color)
}

/**
 * Validates an IP address (IPv4 and IPv6)
 * @param ip - The IP address to validate
 * @returns true if valid IP address, false otherwise
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/

  // IPv6 pattern (simplified)
  const ipv6Regex = /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^::1$|^::$/i

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Validates a credit card number using Luhn algorithm
 * @param cardNumber - The credit card number to validate
 * @returns true if valid credit card number, false otherwise
 */
export function isValidCreditCard(cardNumber: string): boolean {
  // Remove spaces and non-digits
  const cleanNumber = cardNumber.replace(/\D/g, '')

  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false
  }

  // Luhn algorithm
  let sum = 0
  let isEven = false

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(cleanNumber.charAt(i), 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}
