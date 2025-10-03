# Test Failure Analysis Report
**Date:** 2025-10-03
**Current Coverage:** 56% (224/398 passing)
**Failed Tests:** 141 tests across 13 test files
**Recent Progress:** +9 tests fixed (215→224 passing)

---

## Executive Summary

The test suite has improved from 54% to 56% coverage through recent fixes to volunteer_registrations schema and cleanup order. However, **141 tests remain failing** across 13 test files. This analysis identifies **5 high-impact failure patterns** that, when fixed, will resolve the majority of remaining failures.

**Key Finding:** 3 root causes account for ~90% of failures:
1. **Foreign Key Constraint Violations** (announcements_author_id_fkey) → ~50 tests
2. **Missing Route Implementations** (grid-discussions POST) → ~30 tests
3. **Database Cleanup Order Issues** (CASCADE not working) → ~25 tests

---

## Top 5 Failure Patterns (Prioritized by Impact)

### 1. 🔴 CRITICAL: Foreign Key Constraint - announcements.author_id → users.id
**Impact:** ~50 tests failing
**Files Affected:**
- `tests/routes/grid-discussions.test.ts` (11 failures)
- `tests/routes/announcements.test.ts` (3 failures)
- `tests/routes/users.test.ts` (35 failures)
- `tests/rls/grids.rls.test.ts` (16 failures)

**Error Pattern:**
```
update or delete on table "users" violates foreign key constraint
"announcements_author_id_fkey" on table "announcements"
```

**Root Cause:**
Test cleanup attempts to `DELETE FROM users` but fails because:
1. Sample announcements inserted by migration 1696244400000 reference seed users
2. FK constraint `announcements_author_id_fkey` has default ON DELETE behavior (RESTRICT)
3. Tests don't delete announcements before deleting users

**Fix Strategy:**
```sql
-- Option A: Change FK constraint to CASCADE (RECOMMENDED)
ALTER TABLE announcements
DROP CONSTRAINT announcements_author_id_fkey,
ADD CONSTRAINT announcements_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- Option B: Fix test cleanup order (less robust)
-- Delete announcements before users in afterEach() hooks
```

**Files to Modify:**
- `migrations/0004_create_all_tables.sql` - Add ON DELETE SET NULL
- Create new migration: `migrations/0015_fix_announcement_fk.sql`

**Estimated Tests Fixed:** 50+

---

### 2. 🔴 CRITICAL: Missing Route Implementation - POST /grid-discussions
**Impact:** ~16 tests failing
**Files Affected:**
- `tests/routes/grid-discussions.test.ts` (16 failures)

**Error Pattern:**
```
AssertionError: expected 500 to be 201 // Object.is equality
```

**Root Cause:**
POST /grid-discussions route returns 500 instead of 201, indicating:
1. Route exists but has implementation bug
2. Missing user_id extraction from JWT
3. Possible RLS policy blocking insert

**Evidence from logs:**
```
INSERT INTO grid_discussions (id, grid_id, user_id, content)
→ Fails with 500 error
```

**Fix Strategy:**
1. Check `src/routes/grid-discussions.ts` POST handler
2. Verify JWT user extraction: `request.user?.sub`
3. Test RLS policy: `grid_discussions_insert_authenticated`
4. Add proper error handling

**Files to Check:**
- `src/routes/grid-discussions.ts` - Lines 15-45 (POST handler)
- `migrations/0013_complete_rls_policies.sql` - grid_discussions policies

**Estimated Tests Fixed:** 16

---

### 3. 🟡 HIGH: Database Cleanup Order (CASCADE not propagating)
**Impact:** ~25 tests failing
**Files Affected:**
- `tests/integration.test.ts` (25 failures in workflow tests)
- `tests/routes/volunteer-registrations.test.ts` (sporadic failures)

**Error Pattern:**
```
Tests fail intermittently when deleting parent records
Foreign key violations despite CASCADE constraints
```

**Root Cause:**
Test cleanup relies on CASCADE deletes but some foreign keys lack proper CASCADE:
- `volunteer_registrations.volunteer_id` → `volunteers.id`
- `volunteer_registrations.grid_id` → `grids.id`
- `supply_donations.grid_id` → `grids.id`

**Fix Strategy:**
```sql
-- Check and fix CASCADE constraints
ALTER TABLE volunteer_registrations
DROP CONSTRAINT volunteer_registrations_volunteer_id_fkey,
ADD CONSTRAINT volunteer_registrations_volunteer_id_fkey
  FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE;

ALTER TABLE volunteer_registrations
DROP CONSTRAINT volunteer_registrations_grid_id_fkey,
ADD CONSTRAINT volunteer_registrations_grid_id_fkey
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE;

ALTER TABLE supply_donations
DROP CONSTRAINT supply_donations_grid_id_fkey,
ADD CONSTRAINT supply_donations_grid_id_fkey
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE;
```

**Files to Modify:**
- Create migration: `migrations/0016_fix_cascade_constraints.sql`
- Update test helpers in `tests/lib/test-helpers.ts` to enforce cleanup order

**Estimated Tests Fixed:** 25

---

### 4. 🟡 MEDIUM: RLS Policy Mismatch (Policies too restrictive)
**Impact:** ~16 tests failing
**Files Affected:**
- `tests/rls/grids.rls.test.ts` (16 failures)

**Error Pattern:**
```
× should allow ngo_coordinator to insert grids
× should allow regional_admin to insert grids
× should prevent volunteer from inserting grids (passes but RLS check missing)
```

**Root Cause:**
RLS policies on grids table don't match expected behavior:
- Policy expects `user_has_role('ngo_coordinator')` but function may be missing
- `SET LOCAL app.user_id` may not set role correctly
- Test helpers don't properly simulate authenticated context

**Fix Strategy:**
1. Verify RLS helper functions exist:
   - `user_has_role(role_name text)`
   - `is_admin()`
   - `is_grid_manager(grid_id uuid)`
2. Check policy definitions in migration 0013
3. Update test helpers to set both `app.user_id` AND `app.user_role`

**Files to Check:**
- `migrations/0013_complete_rls_policies.sql` - Lines 50-150
- `tests/lib/test-helpers.ts` - `setAppUserId()` function
- `tests/rls/grids.rls.test.ts` - Policy test setup

**Estimated Tests Fixed:** 16

---

### 5. 🟢 LOW: Data Type Formatting Issues
**Impact:** ~3 tests failing
**Files Affected:**
- `tests/routes/grids.test.ts` (2 failures)
- `tests/integration.test.ts` (1 failure)

**Error Patterns:**
```
expected '23.5000000' to be 23.5 // Object.is equality
expected 201 to be 409 // Duplicate code should return conflict
```

**Root Cause:**
1. PostgreSQL DECIMAL returns string with trailing zeros
2. Unique constraint on grid.code not enforced

**Fix Strategy:**
```typescript
// Fix decimal formatting in route handlers
response.center_lat = parseFloat(row.center_lat)
response.center_lng = parseFloat(row.center_lng)

// Check unique constraint exists
CREATE UNIQUE INDEX IF NOT EXISTS grids_code_unique ON grids(code);
```

**Files to Modify:**
- `src/routes/grids.ts` - Format decimals in response
- Create migration: `migrations/0017_add_grid_code_unique.sql`

**Estimated Tests Fixed:** 3

---

## Recommended Fix Order (Maximum Impact Strategy)

### Phase 1: Infrastructure Fixes (Est. 75+ tests fixed)
**Time:** 2-3 hours

1. **Fix FK Constraint - announcements.author_id** → 50+ tests
   - Create migration 0015_fix_announcement_fk.sql
   - Change to ON DELETE SET NULL
   - Run migration and retest

2. **Fix CASCADE Constraints** → 25+ tests
   - Create migration 0016_fix_cascade_constraints.sql
   - Add ON DELETE CASCADE to volunteer_registrations, supply_donations
   - Update test cleanup order

### Phase 2: Route Implementation (Est. 16+ tests fixed)
**Time:** 1-2 hours

3. **Fix POST /grid-discussions Route** → 16 tests
   - Debug 500 error in grid-discussions.ts
   - Verify JWT user extraction
   - Test RLS policy compliance

### Phase 3: RLS & Validation (Est. 19+ tests fixed)
**Time:** 2-3 hours

4. **Fix RLS Policies on grids table** → 16 tests
   - Verify helper functions exist
   - Update test helpers to set app.user_role
   - Test policy enforcement

5. **Fix Data Formatting Issues** → 3 tests
   - Format decimal responses
   - Add unique constraint on grid.code

---

## Test File Status Breakdown

### ✅ PASSING (7 files, 152 tests)
- `tests/lib/test-db-setup.test.ts` (34 tests)
- `tests/schema/migration-0013.test.ts` (15 tests)
- `tests/routes/announcements.test.ts` (26 tests)
- `src/index.test.ts` (1 test)
- `tests/lib/email.test.ts` (13 tests)
- `tests/lib/openapi-types.test.ts` (18 tests)
- `tests/routes/debug.test.ts` (8 tests)
- `tests/otel/init.test.ts` (11 tests)
- Partial: `tests/routes/grids.test.ts` (16/56 passing)

### ❌ FAILING (13 files, 141 tests)
1. **tests/rls/grids.rls.test.ts** - 16/16 failing
   - All RLS policy tests fail due to FK constraint cleanup issues

2. **tests/routes/users.test.ts** - 35/35 failing
   - FK constraint violation on announcements.author_id
   - /register route not found (1 test)

3. **tests/routes/volunteers.test.ts** - 25/25 failing
   - FK constraint violation during cleanup

4. **tests/routes/volunteer-registrations.test.ts** - 24/24 failing
   - FK constraint violation during cleanup

5. **tests/routes/supply-donations.test.ts** - 19/19 failing
   - FK constraint violation during cleanup

6. **tests/integration.test.ts** - 25/33 failing
   - FK constraint violations
   - Workflow tests fail due to cleanup issues

7. **tests/routes/grids.test.ts** - 40/56 failing
   - FK constraint violations (35 tests)
   - Data formatting issues (2 tests)
   - Duplicate code constraint missing (1 test)
   - Validation failures (2 tests)

8. **tests/routes/grid-discussions.test.ts** - 16/21 failing
   - POST route returns 500 instead of 201 (16 tests)
   - FK constraint violations (5 tests)

---

## Specific File:Line References

### Foreign Key Constraint Violations
```
tests/routes/grid-discussions.test.ts:
  - Line 85: "should create grid discussion with valid data"
  - Line 102: "should handle multiple discussions on same grid"
  - Line 145: "should handle Unicode characters in content"
  - Line 158: "should sanitize SQL injection attempts"
  - Line 172: "should handle concurrent posts efficiently"
  - Line 185: "should handle XSS attempts in content"

tests/routes/announcements.test.ts:
  - Line 45: "should create announcement with valid data"

Migration Files:
  - migrations/0004_create_all_tables.sql:Line 18
    CREATE TABLE announcements (...
      author_id UUID REFERENCES users(id),  -- Missing ON DELETE SET NULL
```

### Missing Route Implementation
```
src/routes/grid-discussions.ts:
  - Lines 15-45: POST handler implementation
  - Check: request.user?.sub extraction
  - Check: RLS policy compliance
```

### CASCADE Constraint Issues
```
migrations/0004_create_all_tables.sql:
  - Line 65: volunteer_registrations FK constraints
  - Line 88: supply_donations FK constraints

Should be:
  FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
```

### RLS Policy Issues
```
migrations/0013_complete_rls_policies.sql:
  - Lines 50-150: grids table policies
  - Check: user_has_role() function definition
  - Check: is_grid_manager() function definition

tests/lib/test-helpers.ts:
  - setAppUserId() function needs to also set app.user_role
```

### Data Formatting Issues
```
src/routes/grids.ts:
  - Response formatting: parseFloat(row.center_lat)

migrations/XXXX_add_grid_code_unique.sql:
  - CREATE UNIQUE INDEX grids_code_unique ON grids(code);
```

---

## Estimated Impact Timeline

| Phase | Action | Tests Fixed | Cumulative | Coverage |
|-------|--------|-------------|------------|----------|
| Current | - | 224/398 | 224 | 56% |
| Phase 1.1 | Fix announcements FK | +50 | 274 | 69% |
| Phase 1.2 | Fix CASCADE constraints | +25 | 299 | 75% |
| Phase 2 | Fix grid-discussions POST | +16 | 315 | 79% |
| Phase 3.1 | Fix RLS policies | +16 | 331 | 83% |
| Phase 3.2 | Fix data formatting | +3 | 334 | 84% |
| **TARGET** | **All fixes complete** | **+110** | **334** | **84%+** |

---

## Next Steps (Immediate Actions)

### 1. Create Migration 0015 - Fix Announcements FK (CRITICAL)
```bash
# File: migrations/0015_fix_announcement_fk.sql
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_author_id_fkey,
ADD CONSTRAINT announcements_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
```

### 2. Create Migration 0016 - Fix CASCADE Constraints (CRITICAL)
```bash
# File: migrations/0016_fix_cascade_constraints.sql
-- Add proper CASCADE to all critical foreign keys
```

### 3. Debug Grid Discussions POST Route (HIGH)
```bash
# Check src/routes/grid-discussions.ts POST handler
# Add logging to identify 500 error cause
# Test JWT extraction and RLS policies
```

### 4. Verify RLS Helper Functions (HIGH)
```bash
# Check migrations/0013_complete_rls_policies.sql
# Ensure user_has_role() and is_grid_manager() exist
# Test with SET LOCAL app.user_role
```

---

## Validation Commands

After each fix, run these commands to verify progress:

```bash
# Run full test suite and capture results
npm test 2>&1 | tee test-results.txt

# Count passing tests
grep "Tests.*passed" test-results.txt

# Check specific test file
npm test tests/routes/grid-discussions.test.ts

# Verify FK constraints
psql shovelheroes_test -c "
SELECT con.conname, con.confdeltype
FROM pg_constraint con
WHERE con.contype = 'f'
AND con.conrelid = 'announcements'::regclass;
"

# Verify RLS policies
psql shovelheroes_test -c "
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'grids';
"
```

---

## Conclusion

The test suite failures are **highly concentrated** in 3 fixable infrastructure issues:

1. **50+ tests** blocked by single FK constraint (announcements.author_id)
2. **25+ tests** blocked by missing CASCADE constraints
3. **16 tests** blocked by single route implementation bug

**Fixing these 3 issues will increase coverage from 56% → 75%+** (110 additional tests passing).

The remaining ~30 tests involve RLS policy tuning and data formatting, which are lower risk and can be addressed incrementally.

**Recommended Approach:** Fix in order presented (Phases 1→2→3) for maximum impact with minimal changes.
