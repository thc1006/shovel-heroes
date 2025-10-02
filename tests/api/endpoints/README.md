# API Endpoint Tests

Complete TDD test suite for all API endpoints following London School approach.

## 📁 Test Files

| File | Endpoint | Test Cases | Status |
|------|----------|-----------|--------|
| `disaster-areas.test.js` | DisasterArea | 19 | ✅ Complete |
| `grids.test.js` | Grid | 29 | ✅ Complete |
| `volunteers.test.js` | VolunteerRegistration | 15+ | ✅ Existing |
| `supplies.test.js` | SupplyDonation | 15+ | ✅ Existing |
| `grid-discussions.test.js` | GridDiscussion | 15+ | ✅ Existing |
| `announcements.test.js` | Announcement | 15+ | ✅ Existing |
| `functions-volunteers.test.js` | Functions/Volunteers | 20+ | ✅ Existing |

## 🎯 Test Coverage

### DisasterArea API (19 tests)
```javascript
import { DisasterArea } from '@/api/endpoints/disaster-areas';
```

**CRUD Operations:**
- ✅ `list()` - Fetch all disaster areas
- ✅ `get(id)` - Get single disaster area
- ✅ `create(data)` - Create new area (with validation)
- ✅ `update(id, data)` - Update existing area
- ✅ `delete(id)` - Delete area (cascade grids)

**Validation Tests:**
- Latitude range: -90 to 90
- Longitude range: -180 to 180
- Authorization required (401/403)
- Cascade deletion verification

### Grid API (29 tests)
```javascript
import { Grid } from '@/api/endpoints/grids';
```

**CRUD Operations:**
- ✅ `list(params)` - List with filters
- ✅ `get(id)` - Get single grid
- ✅ `create(data)` - Create with full validation
- ✅ `update(id, data)` - Update with permissions
- ✅ `delete(id)` - Delete with permissions
- ✅ `filter(filters)` - Alias method

**Filter Tests:**
- By disaster_area_id
- By grid_type
- By status
- Multiple combined filters

**Validation Tests:**
- Grid type enum: `mud_disposal`, `manpower`, `supply_storage`, `accommodation`, `food_area`
- Status enum: `open`, `closed`, `completed`, `pending`
- supplies_needed array handling
- volunteer_registered auto-calculation
- Permission-based operations

## 🚀 Running Tests

### Run all endpoint tests
```bash
npm test tests/api/endpoints/
```

### Run specific tests
```bash
# DisasterArea only
npm test tests/api/endpoints/disaster-areas.test.js

# Grid only
npm test tests/api/endpoints/grids.test.js

# Multiple files
npm test tests/api/endpoints/disaster-areas.test.js tests/api/endpoints/grids.test.js
```

### Run with coverage
```bash
npm run test:coverage -- tests/api/endpoints/
```

### Watch mode
```bash
npm run test:watch tests/api/endpoints/
```

### Quick runner script
```bash
bash tests/run-endpoint-tests.sh
```

## 📊 Test Statistics

- **Total Test Files:** 7
- **Total Test Cases:** 100+
- **Coverage Target:** 90%+
- **Test Framework:** Vitest
- **Mock Strategy:** Full HTTP client mocking

## 🧪 Test Patterns

### 1. AAA Pattern (Arrange-Act-Assert)
Every test follows clear AAA structure:

```javascript
it('should create disaster area successfully', async () => {
  // Arrange
  const newArea = { /* test data */ };
  http.post.mockResolvedValue(createdArea);

  // Act
  const result = await DisasterArea.create(newArea);

  // Assert
  expect(result).toEqual(createdArea);
});
```

### 2. Mock HTTP Client
All tests mock the HTTP client to avoid network calls:

```javascript
vi.mock('../../../src/api/client.js', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));
```

### 3. Error Scenarios
Comprehensive error testing for:
- 400 Bad Request (validation errors)
- 401 Unauthorized (missing auth)
- 403 Forbidden (permission denied)
- 404 Not Found (resource missing)
- 500 Internal Server Error

### 4. Integration Tests
End-to-end CRUD lifecycle tests:
```javascript
it('should complete full CRUD lifecycle', async () => {
  // CREATE → READ → UPDATE → DELETE → VERIFY
});
```

## 🔑 Key Validation Rules

### DisasterArea
- `center_lat`: -90 to 90
- `center_lng`: -180 to 180
- `name`: required, string
- `county`: required, string
- `township`: required, string
- `status`: enum (active, recovering, completed)

### Grid
- `grid_type`: enum (mud_disposal, manpower, supply_storage, accommodation, food_area)
- `status`: enum (open, closed, completed, pending)
- `center_lat`: -90 to 90
- `center_lng`: -180 to 180
- `volunteer_needed`: number >= 0
- `volunteer_registered`: auto-calculated (read-only)
- `supplies_needed`: array of strings
- `bounds`: object with north, south, east, west

## 📝 Important Notes

### Authorization
All write operations (POST/PUT/DELETE) require:
- Bearer token in Authorization header
- Appropriate user permissions
- Tests verify 401/403 responses

### Grid Permissions
- grid_manager can only update/delete own grids
- admin can modify all grids
- Tests verify permission enforcement

### Auto-Calculations
- `volunteer_registered` automatically calculated by backend
- Frontend should not manually set this field
- Tests verify this behavior

### Cascade Operations
- Deleting DisasterArea cascades to related Grids
- Tests verify cascade behavior
- Ensures referential integrity

## 🔗 Related Documentation

- **API Integration Guide:** `BACKEND_API_INTEGRATION_GUIDE.md`
- **OpenAPI Spec:** `api-spec/openapi.yaml`
- **Endpoint Implementations:**
  - `src/api/endpoints/disaster-areas.js`
  - `src/api/endpoints/grids.js`
- **HTTP Client:** `src/api/client.js`

## 📈 Coverage Report

To generate coverage report:
```bash
npm run test:coverage -- tests/api/endpoints/
```

View coverage in:
- Terminal output
- `coverage/index.html` (detailed HTML report)

## ✅ Checklist for New Tests

When adding new endpoint tests:
- [ ] Follow AAA pattern
- [ ] Mock HTTP client
- [ ] Test success cases (200/201)
- [ ] Test error cases (400/401/403/404/500)
- [ ] Test input validation
- [ ] Test query parameters (if applicable)
- [ ] Test authorization requirements
- [ ] Include integration scenario
- [ ] Add to this README
- [ ] Update TEST_SUMMARY.md

## 🐛 Known Issues

None currently. All tests passing.

## 🎯 Future Enhancements

- [ ] Add property-based testing (fast-check)
- [ ] Add contract testing (Pact)
- [ ] Add performance benchmarks
- [ ] Add mutation testing
- [ ] Add snapshot testing for responses

---

**Last Updated:** 2025-10-02
**Maintainer:** Backend Test Team
**Test Framework:** Vitest 2.1.9
