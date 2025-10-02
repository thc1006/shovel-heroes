# Test Utilities Documentation

## File Structure

```
tests/
├── utils/
│   ├── mockFetch.js      # Fetch API mock utilities
│   ├── assertions.js     # Data structure validation
│   └── testHelpers.js    # Test helper functions
├── fixtures/
│   └── data.js          # Mock test data
└── README.md            # This file
```

## 1. mockFetch.js - Fetch Mock Tool

Chain-style API for mocking HTTP requests.

### Basic Usage

```javascript
import { createMockFetch } from './utils/mockFetch.js';

const mockFetch = createMockFetch()
  .mockGet('/disaster-areas', [{ id: '1', name: 'Test' }])
  .mockPost('/grids', { id: 'grid_1' }, 201)
  .build();

global.fetch = mockFetch;
```

### Features

- HTTP methods: GET, POST, PUT, DELETE, PATCH
- Custom status codes
- Delay simulation
- Dynamic path matching
- Error mocking

## 2. assertions.js - Data Validation

Validation functions for API data structures.

### Available Functions

- `expectValidDisasterArea(obj)`
- `expectValidGrid(obj)`
- `expectValidVolunteer(obj, canViewPhone)`
- `expectAPIError(error, expectedStatus)`

### Example

```javascript
import { expectValidGrid } from './utils/assertions.js';

const grid = { id: 'grid_1', code: 'A-1', ... };
expectValidGrid(grid); // Throws if invalid
```

## 3. testHelpers.js - Test Helpers

Utility functions for testing.

### Available Functions

- `waitFor(condition, timeout)` - Wait for condition
- `flushPromises()` - Flush promise queue
- `createMockUser(role)` - Create mock user
- `delay(ms)` - Delay execution
- `mockLocalStorage()` - Mock localStorage
- `randomData.*` - Generate random test data

## 4. data.js - Mock Test Data

Pre-built test data matching API specs.

### Available Data

- `mockDisasterAreas` - 2 disaster areas
- `mockGrids` - 6 grids (all types/statuses)
- `mockVolunteers` - 4 volunteers
- `mockSupplies` - 3 supply donations

## Complete Test Example

```javascript
import { createMockFetch } from './utils/mockFetch.js';
import { expectValidGrid } from './utils/assertions.js';
import { mockGrids } from './fixtures/data.js';

// Setup mock
global.fetch = createMockFetch()
  .mockGet('/grids', mockGrids)
  .build();

// Execute test
const response = await fetch('/grids');
const data = await response.json();

// Validate
data.forEach(grid => expectValidGrid(grid));
console.log('Test passed');
```

## Related Documentation

- [BACKEND_API_INTEGRATION_GUIDE.md](../BACKEND_API_INTEGRATION_GUIDE.md)
- [SECURITY.md](../SECURITY.md)

Last Updated: 2025-10-02
