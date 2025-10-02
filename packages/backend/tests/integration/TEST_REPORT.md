# API Integration Test Report

## Test Suite Overview

This document describes the comprehensive integration tests for all API endpoints in the Shovel Heroes backend.

## Test Coverage

### 1. Grids CRUD Operations

**Endpoints Tested:**
- `POST /grids` - Create new grid
- `GET /grids` - List all grids
- `GET /grids?area_id={id}` - Filter grids by disaster area
- `PUT /grids/:id` - Update grid (status, volunteer_needed, etc.)
- `DELETE /grids/:id` - Delete grid with cascading deletes

**Test Scenarios:**
- ✓ Create grid with all required fields
- ✓ Create grid with optional fields (bounds, meeting_point)
- ✓ List grids without authentication (public endpoint)
- ✓ Filter grids by area_id
- ✓ Update grid status and volunteer counts (requires auth)
- ✓ Delete grid with cascading deletes of related data (requires auth)
- ✓ Verify 404 for non-existent grid

**Expected Results:**
- POST: 201 Created with grid object
- GET: 200 OK with array of grids
- PUT: 200 OK with updated grid object
- DELETE: 204 No Content
- Invalid ID: 404 Not Found
- Missing auth: 401 Unauthorized

### 2. Volunteer Registrations

**Endpoints Tested:**
- `POST /volunteer-registrations` - Create registration
- `GET /volunteer-registrations` - List all registrations
- `PUT /volunteer-registrations/:id` - Update registration status
- `DELETE /volunteer-registrations/:id` - Cancel registration

**Test Scenarios:**
- ✓ Register volunteer for grid (requires auth)
- ✓ List all registrations (public)
- ✓ Update registration status to 'confirmed' (requires auth)
- ✓ Verify RLS: user can only register themselves
- ✓ Verify RLS: user can only delete their own registration
- ✓ Trigger validation: auto-increment volunteer_registered counter
- ✓ Trigger validation: auto-decrement on deletion

**Expected Results:**
- POST: 201 Created with registration object
- GET: 200 OK with array of registrations
- PUT: 200 OK with updated registration
- DELETE: 204 No Content
- Forbidden: 403 if trying to register another user

### 3. Supply Donations CRUD

**Endpoints Tested:**
- `POST /supply-donations` - Create donation
- `GET /supply-donations` - List all donations
- `PUT /supply-donations/:id` - Update donation status
- `DELETE /supply-donations/:id` - Delete donation

**Test Scenarios:**
- ✓ Create supply donation with all fields (requires auth)
- ✓ List all donations (public)
- ✓ Update donation status to 'delivered' (requires auth)
- ✓ Update donation quantity and notes (requires auth)
- ✓ Delete donation (requires auth)

**Expected Results:**
- POST: 201 Created with donation object
- GET: 200 OK with array of donations
- PUT: 200 OK with updated donation
- DELETE: 204 No Content

### 4. Announcements CRUD

**Endpoints Tested:**
- `POST /announcements` - Create announcement
- `GET /announcements` - List published announcements
- `PUT /announcements/:id` - Update announcement
- `DELETE /announcements/:id` - Delete announcement

**Test Scenarios:**
- ✓ Create announcement with priority (requires auth)
- ✓ List only published announcements (public)
- ✓ Update announcement title and priority (requires auth)
- ✓ Delete announcement (requires auth)
- ✓ Verify ordering: pinned first, then by order, then by created_at

**Expected Results:**
- POST: 201 Created with announcement object
- GET: 200 OK with array of published announcements
- PUT: 200 OK with updated announcement
- DELETE: 204 No Content

### 5. Database Triggers Validation

**Trigger Tested:**
- `update_grid_volunteer_count()` - Auto-update volunteer_registered

**Test Scenarios:**
- ✓ Create volunteer registration → grids.volunteer_registered increments by 1
- ✓ Delete volunteer registration → grids.volunteer_registered decrements by 1
- ✓ Verify count remains accurate across multiple operations

**Expected Results:**
- Counter accurately reflects number of volunteer_registrations
- No race conditions or incorrect counts

## Running the Tests

### Automated Test Suite (Vitest)

```bash
cd packages/backend

# Run all integration tests
npm run test -- tests/integration/api.test.ts

# Run with verbose output
npm run test -- tests/integration/api.test.ts --reporter=verbose

# Run with coverage
npm run test:coverage -- tests/integration/api.test.ts

# Use the test script
./tests/integration/run-tests.sh
```

### Manual cURL Tests

```bash
# Set your JWT token
export JWT_TOKEN="your_jwt_token_here"

# Run manual tests
./tests/integration/manual-curl-tests.sh
```

## Test Data Management

### Setup
- Creates test user and obtains JWT token
- Creates test disaster area for grid association
- Each test creates necessary related data

### Cleanup
- All test data is cleaned up in `afterAll` hook
- Cleanup follows proper foreign key constraint order:
  1. volunteer_registrations
  2. supply_donations
  3. grids
  4. announcements
  5. disaster_areas
  6. users

## Authentication Flow

All protected endpoints require JWT authentication:

1. Register user: `POST /register`
2. Login: `POST /login` → receive JWT token
3. Include token in Authorization header: `Bearer <token>`
4. Token expires after 24 hours

## RLS (Row Level Security) Verification

Tests verify that RLS policies are enforced:

- Users can only insert their own volunteer registrations
- Users can only delete their own registrations
- Admin users have elevated permissions

## Performance Metrics

Expected test execution times:

- Full test suite: ~10-15 seconds
- Individual test groups: ~2-3 seconds each
- Database cleanup: ~1 second

## Known Limitations

1. Tests require a running PostgreSQL database
2. Tests must run sequentially (not parallel) due to shared test data
3. JWT token needs to be valid for test duration

## Future Improvements

- [ ] Add concurrent user testing
- [ ] Add stress testing for volunteer registration race conditions
- [ ] Add pagination testing for large datasets
- [ ] Add file upload testing for announcements
- [ ] Add WebSocket testing for real-time updates

## Test Result Format

Successful test output:
```
✓ POST /grids - should create a new grid
✓ GET /grids - should list all grids
✓ PUT /grids/:id - should update grid
✓ DELETE /grids/:id - should delete grid
✓ Trigger validation - should increment volunteer_registered

Test Files  1 passed (1)
     Tests  25 passed (25)
  Start at  XX:XX:XX
  Duration  12.34s
```

## Error Scenarios Tested

- Invalid payload → 400 Bad Request
- Missing authentication → 401 Unauthorized
- Forbidden actions → 403 Forbidden
- Resource not found → 404 Not Found
- Duplicate resources → 409 Conflict
- Server errors → 500 Internal Server Error

## Security Testing

- ✓ JWT token validation
- ✓ RLS policy enforcement
- ✓ Input validation with Zod schemas
- ✓ SQL injection prevention (parameterized queries)
- ✓ CORS policy enforcement
- ✓ Rate limiting (not tested in integration suite)

## Conclusion

This comprehensive test suite ensures:
- All CRUD operations work correctly
- Authentication and authorization are properly enforced
- Database triggers function as expected
- Error handling is consistent
- Frontend integration will be seamless
