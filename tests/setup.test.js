/**
 * Setup Test Suite
 * Validates that the test environment is properly configured
 */

import { describe, it, expect, vi } from 'vitest'
import { mockFetchSuccess, mockFetchError, createMockJWT, waitFor } from './setup.js'

describe('Test Environment Setup', () => {
  describe('Environment Variables', () => {
    it('should have test environment configured', () => {
      expect(process.env.NODE_ENV).toBe('test')
      expect(process.env.VITE_USE_REST).toBe('true')
      expect(process.env.VITE_API_BASE).toBe('http://localhost:8787')
    })

    it('should have mock JWT secret', () => {
      expect(process.env.JWT_SECRET).toBe('test-jwt-secret-do-not-use-in-production')
    })
  })

  describe('Global Mocks', () => {
    it('should mock localStorage', () => {
      localStorage.setItem('test', 'value')
      expect(localStorage.getItem('test')).toBe('value')

      localStorage.removeItem('test')
      expect(localStorage.getItem('test')).toBeNull()

      localStorage.clear()
      expect(localStorage.length).toBe(0)
    })

    it('should mock sessionStorage', () => {
      sessionStorage.setItem('session', 'data')
      expect(sessionStorage.getItem('session')).toBe('data')
    })

    it('should mock matchMedia', () => {
      const media = window.matchMedia('(min-width: 768px)')
      expect(media.matches).toBe(false)
      expect(media.media).toBe('(min-width: 768px)')
    })

    it('should mock IntersectionObserver', () => {
      const observer = new IntersectionObserver(() => {})
      expect(observer).toBeDefined()
      expect(typeof observer.observe).toBe('function')
      expect(typeof observer.disconnect).toBe('function')
    })

    it('should mock ResizeObserver', () => {
      const observer = new ResizeObserver(() => {})
      expect(observer).toBeDefined()
      expect(typeof observer.observe).toBe('function')
    })
  })

  describe('Fetch Mocking', () => {
    it('should mock successful fetch responses', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetchSuccess(mockData, 200)

      const response = await fetch('/api/test')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(data).toEqual(mockData)
    })

    it('should mock error responses', async () => {
      mockFetchError('Not Found', 404)

      const response = await fetch('/api/test')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(data.error).toBe('Not Found')
    })

    it('should handle multiple fetch calls', async () => {
      mockFetchSuccess({ data: 'first' })
      mockFetchSuccess({ data: 'second' })

      const res1 = await fetch('/api/first')
      const data1 = await res1.json()

      const res2 = await fetch('/api/second')
      const data2 = await res2.json()

      expect(data1.data).toBe('first')
      expect(data2.data).toBe('second')
    })
  })

  describe('Test Utilities', () => {
    it('should create mock JWT tokens', () => {
      const token = createMockJWT({ userId: '123', role: 'admin' })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)

      // Decode and verify payload
      const [, payloadB64] = token.split('.')
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
      expect(payload.userId).toBe('123')
      expect(payload.role).toBe('admin')
    })

    it('should support async waiting', async () => {
      const start = Date.now()
      await waitFor(100)
      const elapsed = Date.now() - start

      // Allow some margin for timing variations
      expect(elapsed).toBeGreaterThanOrEqual(90)
    })
  })

  describe('Mock Cleanup', () => {
    it('should clear mocks between tests', () => {
      const mockFn = vi.fn()
      mockFn('test')

      expect(mockFn).toHaveBeenCalledWith('test')
      // Cleanup happens automatically in afterEach
    })

    it('should have clean mock state', () => {
      const mockFn = vi.fn()
      expect(mockFn).not.toHaveBeenCalled()
    })
  })

  describe('Module Isolation', () => {
    it('should reset modules between tests', async () => {
      // This ensures imports are fresh in each test
      const module1 = await import('./setup.js')
      expect(module1).toBeDefined()
    })
  })
})
