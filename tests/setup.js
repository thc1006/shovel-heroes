/**
 * Vitest Global Setup
 * Runs before all test suites
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// ============================================================================
// Environment Variables
// ============================================================================

// Set default test environment variables
process.env.NODE_ENV = 'test'
process.env.VITE_USE_REST = 'true'
process.env.VITE_API_BASE = 'http://localhost:8787'

// Mock sensitive environment variables
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/shovelheroes_test'

// ============================================================================
// Global Hooks
// ============================================================================

beforeAll(() => {
  // Global setup before all tests
  console.log('🧪 Starting test suite...')
})

afterAll(() => {
  // Global cleanup after all tests
  console.log('✅ Test suite completed')
})

beforeEach(() => {
  // Reset mocks before each test to ensure test isolation
  vi.clearAllMocks()

  // Clear all timers
  vi.clearAllTimers()

  // Reset modules to ensure fresh imports
  vi.resetModules()
})

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks()
})

// ============================================================================
// Global Mocks
// ============================================================================

// Mock window.matchMedia for responsive design tests
global.matchMedia = global.matchMedia || function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return [] }
  unobserve() {}
}

// Mock ResizeObserver for layout tests
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// ============================================================================
// Fetch Mock (for API tests)
// ============================================================================

// Create a basic fetch mock
global.fetch = vi.fn()

// Helper to mock successful API responses
export const mockFetchSuccess = (data, status = 200) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  })
}

// Helper to mock API errors
export const mockFetchError = (message, status = 500) => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  })
}

// Helper to reset fetch mock
export const resetFetchMock = () => {
  global.fetch.mockClear()
}

// ============================================================================
// LocalStorage Mock
// ============================================================================

const localStorageMock = (() => {
  let store = {}

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

global.localStorage = localStorageMock
global.sessionStorage = localStorageMock

// ============================================================================
// Console Suppression (Optional)
// ============================================================================

// Optionally suppress console output during tests
// Uncomment if you want to reduce noise in test output

// const originalConsoleError = console.error
// const originalConsoleWarn = console.warn

// beforeAll(() => {
//   console.error = vi.fn()
//   console.warn = vi.fn()
// })

// afterAll(() => {
//   console.error = originalConsoleError
//   console.warn = originalConsoleWarn
// })

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for async state updates in React components
 * @param {number} ms - Milliseconds to wait
 */
export const waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Create a mock JWT token for testing
 * @param {object} payload - JWT payload
 * @returns {string} Mock JWT token
 */
export const createMockJWT = (payload = { userId: 'test-user', role: 'volunteer' }) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = 'mock-signature'
  return `${header}.${body}.${signature}`
}

/**
 * Clean up function to reset all test state
 */
export const cleanupTestState = () => {
  vi.clearAllMocks()
  vi.clearAllTimers()
  localStorage.clear()
  sessionStorage.clear()
  resetFetchMock()
}

// ============================================================================
// Export for use in tests
// ============================================================================

export {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
}
