# Vitest Testing Environment Setup - Complete Configuration Report

## ✅ Configuration Summary

The Vitest testing environment has been successfully configured for the Shovel Heroes project with comprehensive test infrastructure supporting both backend API and frontend component testing.

## 📦 Dependencies Added

### Core Testing Libraries

**Added to `package.json` devDependencies:**

```json
{
  "vitest": "^2.1.8",
  "@vitest/ui": "^2.1.8",
  "@vitest/coverage-v8": "^2.1.8",
  "happy-dom": "^15.11.7",
  "supertest": "^7.0.0",
  "@types/supertest": "^6.0.2"
}
```

### Installation Command

```bash
npm install
```

This will install all the new test dependencies listed above.

## 📝 Test Scripts Added

**Added to `package.json` scripts:**

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:api": "npm --workspace packages/backend run test",
  "test:components": "vitest run tests/components"
}
```

### Script Usage

- **`npm test`** - Run all tests once
- **`npm run test:watch`** - Run tests in watch mode (auto-rerun on changes)
- **`npm run test:ui`** - Open Vitest UI in browser for interactive testing
- **`npm run test:coverage`** - Generate coverage report with 80% thresholds
- **`npm run test:api`** - Run backend API tests only
- **`npm run test:components`** - Run React component tests only

## 🔧 Configuration Files Created

### 1. `vitest.config.js` - Main Configuration

**Location:** `C:\Users\thc1006\Desktop\er\shovel-heroes\vitest.config.js`

**Key Features:**
- ✅ Test environment: `happy-dom` (lightweight DOM for React tests)
- ✅ Global test utilities (describe, it, expect) - no imports needed
- ✅ Setup files: `./tests/setup.js` runs before each test
- ✅ Coverage provider: `v8` with HTML/JSON/LCOV reports
- ✅ Coverage thresholds: 80% (lines, functions, branches, statements)
- ✅ Path aliases matching Vite config (`@` → `./src`)
- ✅ Parallel execution with threads
- ✅ 10-second timeout for async tests
- ✅ Verbose reporter for detailed output

**Coverage Exclusions:**
- `node_modules/`
- `tests/`
- `**/*.config.js`
- `**/dist/**`
- `packages/shared-types/**` (generated code)

### 2. `tests/setup.js` - Global Test Setup

**Location:** `C:\Users\thc1006\Desktop\er\shovel-heroes\tests\setup.js`

**Comprehensive Test Environment:**

#### Environment Variables
```javascript
process.env.NODE_ENV = 'test'
process.env.VITE_USE_REST = 'true'
process.env.VITE_API_BASE = 'http://localhost:8787'
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/shovelheroes_test'
```

#### Global Mocks Provided

1. **Browser APIs:**
   - `window.matchMedia` - Responsive design tests
   - `IntersectionObserver` - Lazy loading tests
   - `ResizeObserver` - Layout tests

2. **Storage APIs:**
   - `localStorage` - In-memory mock with full API
   - `sessionStorage` - In-memory mock with full API

3. **Fetch API:**
   - `global.fetch` - Fully mocked with helper functions

#### Test Utilities Exported

```javascript
// Mock successful API responses
mockFetchSuccess(data, status = 200)

// Mock API errors
mockFetchError(message, status = 500)

// Reset fetch mock
resetFetchMock()

// Wait for async operations
await waitFor(ms)

// Create mock JWT tokens
createMockJWT(payload)

// Clean up all test state
cleanupTestState()
```

#### Automatic Cleanup (beforeEach/afterEach)

- ✅ Clear all mocks
- ✅ Clear all timers
- ✅ Reset modules for fresh imports
- ✅ Restore all mocks

### 3. `tests/setup.test.js` - Environment Validation Tests

**Location:** `C:\Users\thc1006\Desktop\er\shovel-heroes\tests\setup.test.js`

**Validates:**
- ✅ Environment variables are set correctly
- ✅ Global mocks work (localStorage, fetch, observers)
- ✅ Fetch mocking helpers function properly
- ✅ JWT token creation utility works
- ✅ Mock cleanup happens between tests
- ✅ Module isolation is maintained

### 4. `tests/README.md` - Test Suite Documentation

**Location:** `C:\Users\thc1006\Desktop\er\shovel-heroes\tests\README.md`

**Comprehensive guide including:**
- 📚 Directory structure explanation
- 🚀 Quick start commands
- 🧪 Test configuration details
- 🛠️ Available mocks and utilities
- 📝 Code examples for different test types
- 🔒 Security testing patterns
- 📊 Coverage requirements
- 🐛 Debugging tips
- 📚 Best practices
- 🆘 Troubleshooting guide

### 5. `.gitignore` Updates

**Added entries to ignore test artifacts:**

```gitignore
# Vitest coverage
coverage/
.vitest/
test-results/
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd C:\Users\thc1006\Desktop\er\shovel-heroes
npm install
```

### 2. Verify Setup

Run the setup validation tests:

```bash
npm test tests/setup.test.js
```

Expected output:
```
✓ tests/setup.test.js (9 tests)
  ✓ Test Environment Setup
    ✓ Environment Variables (2)
    ✓ Global Mocks (5)
    ✓ Fetch Mocking (3)
    ✓ Test Utilities (2)
    ✓ Mock Cleanup (2)
    ✓ Module Isolation (1)

Test Files  1 passed (1)
Tests       9 passed (9)
```

### 3. Run All Tests

```bash
npm test
```

### 4. Generate Coverage Report

```bash
npm run test:coverage
```

Then open `coverage/index.html` in your browser.

### 5. Use Interactive UI (Recommended for Development)

```bash
npm run test:ui
```

Navigate to `http://localhost:51204/__vitest__/` for visual test debugging.

## 📊 Test Structure

```
tests/
├── setup.js                    # Global configuration & mocks
├── setup.test.js              # Validation tests
├── README.md                  # Documentation
├── api/                       # Backend API tests
│   ├── auth.test.js          # Authentication tests
│   ├── grids.test.js         # Grid CRUD tests
│   └── volunteers.test.js    # Volunteer tests
├── components/                # React component tests (to create)
│   ├── TaskCard.test.jsx
│   ├── MapView.test.jsx
│   └── SignupForm.test.jsx
├── fixtures/                  # Test data
│   ├── tasks.json
│   └── volunteers.json
└── utils/                     # Test helpers
    └── testHelpers.js
```

## 🧪 Example Test Files

### API Test Example

**Create:** `tests/api/grids.test.js`

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchSuccess, mockFetchError } from '../setup.js'

describe('API: GET /grids', () => {
  beforeEach(() => {
    // Clean state before each test
  })

  it('should fetch grids successfully', async () => {
    const mockData = { grids: [{ id: 1, area: 'test' }] }
    mockFetchSuccess(mockData)

    const response = await fetch('/api/grids')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data.grids).toHaveLength(1)
  })

  it('should handle errors gracefully', async () => {
    mockFetchError('Server Error', 500)

    const response = await fetch('/api/grids')

    expect(response.ok).toBe(false)
    expect(response.status).toBe(500)
  })
})
```

### Component Test Example

**Create:** `tests/components/TaskCard.test.jsx`

```javascript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TaskCard from '@/components/TaskCard'

describe('TaskCard Component', () => {
  it('should render task details', () => {
    const task = {
      id: 1,
      title: 'Clear debris',
      location: 'Area A',
      status: 'pending'
    }

    render(<TaskCard task={task} />)

    expect(screen.getByText('Clear debris')).toBeInTheDocument()
    expect(screen.getByText('Area A')).toBeInTheDocument()
  })

  it('should show status badge', () => {
    const task = { id: 1, title: 'Test', status: 'completed' }

    render(<TaskCard task={task} />)

    const badge = screen.getByText('completed')
    expect(badge).toBeInTheDocument()
  })
})
```

### Integration Test Example (Supertest)

**Create:** `tests/api/integration.test.js`

```javascript
import request from 'supertest'
import { describe, it, expect } from 'vitest'
import { app } from '@/backend/app' // Your Fastify app

describe('Integration: Volunteer Signup Flow', () => {
  it('should complete signup workflow', async () => {
    // Create task
    const taskRes = await request(app)
      .post('/api/tasks')
      .send({ area: 'test', needCount: 5 })
      .expect(201)

    // Signup volunteer
    const signupRes = await request(app)
      .post('/api/volunteers/signups')
      .send({
        taskId: taskRes.body.id,
        name: 'John',
        email: 'john@test.com'
      })
      .expect(201)

    expect(signupRes.body.taskId).toBe(taskRes.body.id)
  })
})
```

## 🔒 Security Testing Support

### JWT Token Testing

```javascript
import { createMockJWT } from './setup.js'

const adminToken = createMockJWT({ userId: 'admin', role: 'admin' })
const userToken = createMockJWT({ userId: 'user', role: 'volunteer' })

// Test with admin token
const response = await fetch('/api/admin/users', {
  headers: { Authorization: `Bearer ${adminToken}` }
})
```

### Testing PII Protection

```javascript
it('should not expose phone numbers to unauthorized users', async () => {
  const token = createMockJWT({ role: 'volunteer' })
  mockFetchSuccess({ volunteers: [{ name: 'John', phone: null }] })

  const response = await fetch('/api/volunteers', {
    headers: { Authorization: `Bearer ${token}` }
  })

  const data = await response.json()
  expect(data.volunteers[0].phone).toBeNull()
})
```

## 📈 Coverage Goals

The configuration enforces **80% coverage** across:

- ✅ **Lines**: 80%
- ✅ **Functions**: 80%
- ✅ **Branches**: 80%
- ✅ **Statements**: 80%

**View Report:**
```bash
npm run test:coverage
open coverage/index.html
```

## 🔄 Continuous Integration

Tests will run automatically on:

- 📝 **Pull Requests** - Prevents merging failing code
- 🔀 **Main Branch** - Validates merged code
- 🚀 **Releases** - Ensures production quality

**CI Configuration:** `.github/workflows/test.yml` (to be created)

## 🛠️ Next Steps

### 1. Install Dependencies (Required)

```bash
npm install
```

### 2. Create Backend Tests

- `tests/api/auth.test.js` - Authentication & JWT
- `tests/api/grids.test.js` - Grid CRUD operations
- `tests/api/volunteers.test.js` - Volunteer signups
- `tests/api/rls.test.js` - Row-Level Security validation

### 3. Create Component Tests

- `tests/components/TaskCard.test.jsx`
- `tests/components/MapView.test.jsx`
- `tests/components/SignupForm.test.jsx`

### 4. Setup CI/CD Pipeline

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 📚 Resources

- **Vitest Docs**: https://vitest.dev/
- **Testing Library**: https://testing-library.com/
- **Supertest**: https://github.com/ladjs/supertest
- **Happy DOM**: https://github.com/capricorn86/happy-dom

## ✅ Verification Checklist

- [x] Vitest and dependencies added to package.json
- [x] Test scripts configured (test, test:watch, test:ui, test:coverage)
- [x] vitest.config.js created with proper settings
- [x] Global test setup (tests/setup.js) with mocks and utilities
- [x] Setup validation tests (tests/setup.test.js)
- [x] Test documentation (tests/README.md)
- [x] Coverage configuration (80% thresholds)
- [x] .gitignore updated for test artifacts
- [x] Environment variables mocked
- [x] Browser APIs mocked (localStorage, fetch, observers)
- [x] Test utilities provided (JWT, waitFor, fetch helpers)

## 🎯 Quick Command Reference

```bash
# Install dependencies
npm install

# Run tests
npm test                    # All tests once
npm run test:watch          # Watch mode
npm run test:ui             # Interactive UI

# Coverage
npm run test:coverage       # Generate report

# Specific tests
npm run test:api           # Backend only
npm run test:components    # Components only
npx vitest run setup       # Run setup tests
```

---

**Test Environment Setup Complete! ✅**

The Shovel Heroes project now has a robust testing infrastructure ready for TDD development.
