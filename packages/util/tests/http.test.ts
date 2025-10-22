import type { HttpStatusCode, HttpStatusPhrase } from '../src/http/index'
import { describe, expect, it } from 'vitest'
import {
  BAD_REQUEST,
  CONFLICT,
  CREATED,
  FORBIDDEN,
  getStatusPhrase,
  HTTP_STATUS_CODES,
  HTTP_STATUS_PHRASES,

  INTERNAL_SERVER_ERROR,
  isClientError,
  isServerError,
  isSuccess,
  NO_CONTENT,
  NOT_FOUND,
  OK,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
  UNPROCESSABLE_ENTITY,
} from '../src/http/index'

describe('http-status utilities', () => {
  describe('hTTP_STATUS_CODES', () => {
    it('contains expected 2xx success codes', () => {
      expect(HTTP_STATUS_CODES.OK).toBe(200)
      expect(HTTP_STATUS_CODES.CREATED).toBe(201)
      expect(HTTP_STATUS_CODES.NO_CONTENT).toBe(204)
    })

    it('contains expected 4xx client error codes', () => {
      expect(HTTP_STATUS_CODES.BAD_REQUEST).toBe(400)
      expect(HTTP_STATUS_CODES.UNAUTHORIZED).toBe(401)
      expect(HTTP_STATUS_CODES.FORBIDDEN).toBe(403)
      expect(HTTP_STATUS_CODES.NOT_FOUND).toBe(404)
      expect(HTTP_STATUS_CODES.CONFLICT).toBe(409)
      expect(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).toBe(422)
      expect(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).toBe(429)
    })

    it('contains expected 5xx server error codes', () => {
      expect(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500)
    })
  })

  describe('hTTP_STATUS_PHRASES', () => {
    it('contains expected 2xx success phrases', () => {
      expect(HTTP_STATUS_PHRASES.OK).toBe('OK')
      expect(HTTP_STATUS_PHRASES.CREATED).toBe('Created')
      expect(HTTP_STATUS_PHRASES.NO_CONTENT).toBe('No Content')
    })

    it('contains expected 4xx client error phrases', () => {
      expect(HTTP_STATUS_PHRASES.BAD_REQUEST).toBe('Bad Request')
      expect(HTTP_STATUS_PHRASES.UNAUTHORIZED).toBe('Unauthorized')
      expect(HTTP_STATUS_PHRASES.FORBIDDEN).toBe('Forbidden')
      expect(HTTP_STATUS_PHRASES.NOT_FOUND).toBe('Not Found')
      expect(HTTP_STATUS_PHRASES.CONFLICT).toBe('Conflict')
      expect(HTTP_STATUS_PHRASES.UNPROCESSABLE_ENTITY).toBe('Unprocessable Entity')
      expect(HTTP_STATUS_PHRASES.TOO_MANY_REQUESTS).toBe('Too Many Requests')
    })

    it('contains expected 5xx server error phrases', () => {
      expect(HTTP_STATUS_PHRASES.INTERNAL_SERVER_ERROR).toBe('Internal Server Error')
    })
  })

  describe('individual exports', () => {
    it('exports individual status codes correctly', () => {
      expect(OK).toBe(200)
      expect(CREATED).toBe(201)
      expect(NO_CONTENT).toBe(204)
      expect(BAD_REQUEST).toBe(400)
      expect(UNAUTHORIZED).toBe(401)
      expect(FORBIDDEN).toBe(403)
      expect(NOT_FOUND).toBe(404)
      expect(CONFLICT).toBe(409)
      expect(UNPROCESSABLE_ENTITY).toBe(422)
      expect(TOO_MANY_REQUESTS).toBe(429)
      expect(INTERNAL_SERVER_ERROR).toBe(500)
    })
  })

  describe('type definitions', () => {
    it('httpStatusCode type includes expected values', () => {
      const codes: HttpStatusCode[] = [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500]
      codes.forEach((code) => {
        expect(typeof code).toBe('number')
      })
    })

    it('httpStatusPhrase type includes expected values', () => {
      const phrases: HttpStatusPhrase[] = [
        'OK',
        'Created',
        'No Content',
        'Bad Request',
        'Unauthorized',
        'Forbidden',
        'Not Found',
        'Conflict',
        'Unprocessable Entity',
        'Too Many Requests',
        'Internal Server Error',
      ]
      phrases.forEach((phrase) => {
        expect(typeof phrase).toBe('string')
      })
    })
  })

  describe('isSuccess', () => {
    it('returns true for 2xx status codes', () => {
      expect(isSuccess(200)).toBe(true)
      expect(isSuccess(201)).toBe(true)
      expect(isSuccess(204)).toBe(true)
      expect(isSuccess(299)).toBe(true)
    })

    it('returns false for non-2xx status codes', () => {
      expect(isSuccess(199)).toBe(false)
      expect(isSuccess(300)).toBe(false)
      expect(isSuccess(400)).toBe(false)
      expect(isSuccess(500)).toBe(false)
    })
  })

  describe('isClientError', () => {
    it('returns true for 4xx status codes', () => {
      expect(isClientError(400)).toBe(true)
      expect(isClientError(401)).toBe(true)
      expect(isClientError(404)).toBe(true)
      expect(isClientError(499)).toBe(true)
    })

    it('returns false for non-4xx status codes', () => {
      expect(isClientError(200)).toBe(false)
      expect(isClientError(300)).toBe(false)
      expect(isClientError(399)).toBe(false)
      expect(isClientError(500)).toBe(false)
    })
  })

  describe('isServerError', () => {
    it('returns true for 5xx status codes', () => {
      expect(isServerError(500)).toBe(true)
      expect(isServerError(502)).toBe(true)
      expect(isServerError(503)).toBe(true)
      expect(isServerError(599)).toBe(true)
    })

    it('returns false for non-5xx status codes', () => {
      expect(isServerError(200)).toBe(false)
      expect(isServerError(400)).toBe(false)
      expect(isServerError(499)).toBe(false)
      expect(isServerError(600)).toBe(false)
    })
  })

  describe('getStatusPhrase', () => {
    it('returns correct phrases for known status codes', () => {
      expect(getStatusPhrase(200)).toBe('OK')
      expect(getStatusPhrase(201)).toBe('Created')
      expect(getStatusPhrase(400)).toBe('Bad Request')
      expect(getStatusPhrase(404)).toBe('Not Found')
      expect(getStatusPhrase(500)).toBe('Internal Server Error')
    })

    it('returns undefined for unknown status codes', () => {
      // @ts-expect-error Testing with invalid status code
      expect(getStatusPhrase(999)).toBeUndefined()
      // @ts-expect-error Testing with invalid status code
      expect(getStatusPhrase(100)).toBeUndefined()
    })

    it('works with all defined status codes', () => {
      const allCodes = Object.values(HTTP_STATUS_CODES) as HttpStatusCode[]
      allCodes.forEach((code) => {
        const phrase = getStatusPhrase(code)
        expect(phrase).toBeDefined()
        expect(typeof phrase).toBe('string')
      })
    })
  })

  describe('consistency between codes and phrases', () => {
    it('all status codes have corresponding phrases', () => {
      const codeKeys = Object.keys(HTTP_STATUS_CODES)
      const phraseKeys = Object.keys(HTTP_STATUS_PHRASES)

      expect(codeKeys.sort()).toEqual(phraseKeys.sort())
    })

    it('getStatusPhrase works for all defined codes', () => {
      Object.entries(HTTP_STATUS_CODES).forEach(([key, code]) => {
        const expectedPhrase = HTTP_STATUS_PHRASES[key as keyof typeof HTTP_STATUS_PHRASES]
        expect(getStatusPhrase(code)).toBe(expectedPhrase)
      })
    })
  })
})
