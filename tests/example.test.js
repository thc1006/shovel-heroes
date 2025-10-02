/**
 * Example Test - How to use test utilities
 */

import { createMockFetch } from './utils/mockFetch.js';
import { expectValidDisasterArea, expectValidGrid } from './utils/assertions.js';
import { mockDisasterAreas, mockGrids } from './fixtures/data.js';
import { createMockUser } from './utils/testHelpers.js';

// Example 1: Test disaster areas list
async function testDisasterAreasList() {
  console.log('Test 1: Disaster Areas List');
  
  global.fetch = createMockFetch()
    .mockGet('/disaster-areas', mockDisasterAreas)
    .build();
  
  const response = await fetch('/disaster-areas');
  const data = await response.json();
  
  data.forEach(area => {
    expectValidDisasterArea(area);
  });
  
  console.log('Loaded', data.length, 'disaster areas, all valid');
}

// Example 2: Test grid data structure
async function testGridDataStructure() {
  console.log('Test 2: Grid Data Structure');
  
  global.fetch = createMockFetch()
    .mockGet('/grids', mockGrids)
    .build();
  
  const response = await fetch('/grids');
  const grids = await response.json();
  
  grids.forEach(grid => {
    expectValidGrid(grid);
  });
  
  console.log('Found', grids.length, 'grids, all valid');
}

// Example 3: Test permissions
async function testPermissions() {
  console.log('Test 3: User Permissions');
  
  const admin = createMockUser('admin');
  const user = createMockUser('user');
  
  console.log('Admin role:', admin.role);
  console.log('User role:', user.role);
}

// Run all tests
async function runAllTests() {
  console.log('=== Test Utilities Examples ===');
  
  try {
    await testDisasterAreasList();
    await testGridDataStructure();
    await testPermissions();
    
    console.log('=== All tests passed ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runAllTests();
