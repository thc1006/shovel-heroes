/**
 * Test Utilities Index
 * Central export point for all test utilities
 */

// Mock Fetch utilities
export {
  createMockFetch,
  createQuickMock,
  createAuthErrorMock,
  createNetworkErrorMock
} from './utils/mockFetch.js';

// Assertions
export {
  expectValidDisasterArea,
  expectValidGrid,
  expectValidVolunteer,
  expectAPIError
} from './utils/assertions.js';

// Test helpers
export {
  waitFor,
  flushPromises,
  createMockUser,
  delay,
  mockLocalStorage,
  randomData
} from './utils/testHelpers.js';

// Mock data fixtures
export {
  mockDisasterAreas,
  mockGrids,
  mockVolunteers,
  mockSupplies
} from './fixtures/data.js';

// Default export for convenience
export default {
  // Mock utilities
  createMockFetch,
  createQuickMock,
  createAuthErrorMock,
  createNetworkErrorMock,
  
  // Assertions
  expectValidDisasterArea,
  expectValidGrid,
  expectValidVolunteer,
  expectAPIError,
  
  // Helpers
  waitFor,
  flushPromises,
  createMockUser,
  delay,
  mockLocalStorage,
  randomData,
  
  // Fixtures
  mockDisasterAreas,
  mockGrids,
  mockVolunteers,
  mockSupplies
};
