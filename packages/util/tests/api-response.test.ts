import { describe, expect, it } from 'vitest'
import {
  createApiResponse,
  createErrorResponse,
  createPaginatedResponse,
  CommonErrors,
  HTTP_STATUS,
  ERROR_CODES,
  isErrorResponse,
  isPaginatedResponse
} from '../src/api'

describe('API response utilities', () => {
  describe('createApiResponse', () => {
    it('creates basic success response', () => {
      const response = createApiResponse({ id: 1, name: 'Test' })
      
      expect(response).toMatchObject({
        data: { id: 1, name: 'Test' },
        status: 200,
        timestamp: expect.any(String)
      })
      expect(response.message).toBeUndefined()
      expect(response.requestId).toBeUndefined()
    })

    it('creates response with custom status and message', () => {
      const response = createApiResponse(
        { created: true },
        201,
        'Resource created successfully',
        'req-123'
      )
      
      expect(response).toMatchObject({
        data: { created: true },
        status: 201,
        message: 'Resource created successfully',
        requestId: 'req-123',
        timestamp: expect.any(String)
      })
    })
  })

  describe('createErrorResponse', () => {
    it('creates basic error response', () => {
      const response = createErrorResponse('Something went wrong')
      
      expect(response).toMatchObject({
        error: 'Something went wrong',
        status: 400,
        timestamp: expect.any(String)
      })
    })

    it('creates error response with details', () => {
      const response = createErrorResponse(
        { field: 'email', message: 'Invalid email format' },
        422,
        ERROR_CODES.VALIDATION_ERROR,
        { suggestions: ['Check email format'] },
        'req-456'
      )
      
      expect(response).toMatchObject({
        error: { field: 'email', message: 'Invalid email format' },
        status: 422,
        code: ERROR_CODES.VALIDATION_ERROR,
        details: { suggestions: ['Check email format'] },
        requestId: 'req-456'
      })
    })
  })

  describe('createPaginatedResponse', () => {
    it('creates paginated response with correct metadata', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const response = createPaginatedResponse(items, 1, 10, 25)
      
      expect(response).toMatchObject({
        data: items,
        status: 200,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      })
    })

    it('calculates pagination metadata correctly for last page', () => {
      const items = [{ id: 21 }, { id: 22 }]
      const response = createPaginatedResponse(items, 3, 10, 22)
      
      expect(response.pagination).toMatchObject({
        page: 3,
        limit: 10,
        total: 22,
        totalPages: 3,
        hasNext: false,
        hasPrev: true
      })
    })
  })

  describe('CommonErrors', () => {
    it('creates standard error responses', () => {
      const badRequest = CommonErrors.badRequest('Invalid input')
      expect(badRequest).toMatchObject({
        status: HTTP_STATUS.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR
      })

      const unauthorized = CommonErrors.unauthorized()
      expect(unauthorized).toMatchObject({
        status: HTTP_STATUS.UNAUTHORIZED,
        code: ERROR_CODES.AUTHENTICATION_FAILED,
        error: 'Authentication required'
      })

      const notFound = CommonErrors.notFound('User')
      expect(notFound).toMatchObject({
        status: HTTP_STATUS.NOT_FOUND,
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        error: 'User not found'
      })
    })
  })

  describe('Type guards', () => {
    it('identifies error responses correctly', () => {
      const errorResponse = createErrorResponse('Error')
      const successResponse = createApiResponse({ data: 'success' })
      
      expect(isErrorResponse(errorResponse)).toBe(true)
      expect(isErrorResponse(successResponse)).toBe(false)
      expect(isErrorResponse(null)).toBe(false)
      expect(isErrorResponse({})).toBe(false)
    })

    it('identifies paginated responses correctly', () => {
      const paginatedResponse = createPaginatedResponse([], 1, 10, 0)
      const regularResponse = createApiResponse([])
      
      expect(isPaginatedResponse(paginatedResponse)).toBe(true)
      expect(isPaginatedResponse(regularResponse)).toBe(false)
      expect(isPaginatedResponse(null)).toBe(false)
    })
  })

  describe('Constants', () => {
    it('exports HTTP status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200)
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400)
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500)
    })

    it('exports error codes', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ERROR_CODES.AUTHENTICATION_FAILED).toBe('AUTHENTICATION_FAILED')
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    })
  })
})