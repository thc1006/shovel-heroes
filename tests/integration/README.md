# Integration Test Suite - Cascade Delete

## Overview

This test suite verifies the data integrity and cascade delete functionality for the Shovel Heroes application, specifically testing the `DELETE /grids/:id` endpoint behavior.

## Test Files

- **test-cascade-delete.sh** - Automated integration test script
- **test-results-cascade.json** - Latest test execution results

## What is Tested

### 1. Cascade Delete Functionality

The test verifies that deleting a grid correctly removes all related records:

- ✅ Volunteer registrations (`volunteer_registrations` table)
- ✅ Supply donations (`supply_donations` table)
- ✅ Grid discussions (`grid_discussions` table)
- ✅ The grid itself (`grids` table)

### 2. Foreign Key Constraint Protection

The test verifies that foreign key constraints prevent:

- ❌ Deleting a grid without first removing dependent records
- ✅ Proper error handling when constraints are violated

## Test Execution Flow

```
1. Create Test Data
   ├── Create test grid with unique code
   ├── Create 3 volunteer registrations (pending, confirmed, cancelled)
   ├── Create 2 supply donations
   └── Create 1 grid discussion

2. Record Pre-Delete State
   └── Count all related records

3. Execute Cascade Delete
   ├── Delete volunteer_registrations WHERE grid_id = test_grid_id
   ├── Delete supply_donations WHERE grid_id = test_grid_id
   ├── Delete grid_discussions WHERE grid_id = test_grid_id
   └── Delete grids WHERE id = test_grid_id

4. Verify Post-Delete State
   └── Confirm all counts are zero

5. Test Foreign Key Protection
   ├── Create temporary test data
   ├── Attempt to delete grid without removing dependencies
   ├── Verify constraint violation is raised
   └── Clean up test data

6. Generate Test Report
   └── Output JSON results to test-results-cascade.json
```

## Running the Tests

### Prerequisites

- Docker container `shovelheroes-postgres` must be running
- Database `shovelheroes` must exist with all required tables
- Test user and disaster area data must exist

### Execute the Test

```bash
# Make script executable (if not already)
chmod +x /home/thc1006/dev/shovel-heroes/tests/integration/test-cascade-delete.sh

# Run the test
/home/thc1006/dev/shovel-heroes/tests/integration/test-cascade-delete.sh
```

### Expected Output

```
========================================
Cascade Delete Integration Test
========================================

[Step 1/6] Creating test data...
✓ Test grid created: <uuid>
  - Volunteer registrations: 3
  - Supply donations: 2
  - Grid discussions: 1

[Step 2/6] Recording pre-delete state...
✓ Pre-delete state recorded
  - Volunteer registrations: 3
  - Supply donations: 2
  - Grid discussions: 1
  - Grid exists: 1

[Step 3/6] Executing cascade delete...
✓ Cascade delete executed
  - Deleted volunteer registrations: 3
  - Deleted supply donations: 2
  - Deleted grid discussions: 1
  - Deleted grid: 1

[Step 4/6] Verifying post-delete state...
✓ Post-delete state verified
  - Volunteer registrations: 0
  - Supply donations: 0
  - Grid discussions: 0
  - Grid exists: 0

[Step 5/6] Testing foreign key constraint protection...
✓ Foreign key constraint protection working correctly

[Step 6/6] Generating test report...
✓ Test report generated

========================================
Test Summary
========================================
✓ ALL TESTS PASSED
  - Cascade delete: PASS
  - Foreign key protection: PASS
```

## Test Results JSON Schema

```json
{
  "test_name": "string",
  "test_date": "ISO 8601 timestamp",
  "test_grid_id": "UUID",
  "before_delete": {
    "volunteer_registrations": "number",
    "supply_donations": "number",
    "grid_discussions": "number",
    "grid_exists": "number (0 or 1)"
  },
  "delete_operation": {
    "deleted_volunteer_registrations": "number",
    "deleted_supply_donations": "number",
    "deleted_grid_discussions": "number",
    "deleted_grid": "number (0 or 1)"
  },
  "after_delete": {
    "volunteer_registrations": "number (expected: 0)",
    "supply_donations": "number (expected: 0)",
    "grid_discussions": "number (expected: 0)",
    "grid_exists": "number (expected: 0)"
  },
  "test_results": {
    "cascade_delete_status": "PASS | FAIL",
    "foreign_key_protection": "PASS | FAIL"
  },
  "assertions": {
    "all_volunteers_deleted": "boolean",
    "all_donations_deleted": "boolean",
    "all_discussions_deleted": "boolean",
    "grid_deleted": "boolean",
    "fk_constraint_protected": "boolean"
  }
}
```

## Latest Test Results

**Last Run**: 2025-10-02T11:27:50Z

**Status**: ✅ ALL TESTS PASSED

**Grid ID**: 28529acd-2d40-4e86-a027-d7c213689454

| Metric | Before | Deleted | After | Status |
|--------|--------|---------|-------|--------|
| Volunteer Registrations | 3 | 3 | 0 | ✅ |
| Supply Donations | 2 | 2 | 0 | ✅ |
| Grid Discussions | 1 | 1 | 0 | ✅ |
| Grid Itself | 1 | 1 | 0 | ✅ |
| FK Protection | - | - | - | ✅ |

## Database Schema Constraints

### Tables Involved

1. **grids**
   - Primary table being deleted

2. **volunteer_registrations**
   - Foreign key: `grid_id` → `grids(id)`
   - Allowed statuses: 'pending', 'confirmed', 'cancelled'

3. **supply_donations**
   - Foreign key: `grid_id` → `grids(id)`
   - Required fields: `donor_name`, `item_type`

4. **grid_discussions**
   - Foreign key: `grid_id` → `grids(id)`
   - Self-referencing: `parent_id` → `grid_discussions(id)`

## Troubleshooting

### Test Fails at Step 1

**Issue**: Cannot create test data

**Possible Causes**:
- Database container not running
- Missing prerequisite data (users, disaster_areas)
- Schema mismatch

**Solution**:
```bash
# Check container status
docker ps | grep shovelheroes-postgres

# Verify tables exist
docker exec -i shovelheroes-postgres psql -U postgres -d shovelheroes -c "\dt"

# Check for required data
docker exec -i shovelheroes-postgres psql -U postgres -d shovelheroes -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM disaster_areas;"
```

### Test Fails at Step 3

**Issue**: Cascade delete fails

**Possible Causes**:
- Missing foreign key relationships
- Database permissions issue
- Data already deleted

**Solution**:
```bash
# Verify foreign key constraints
docker exec -i shovelheroes-postgres psql -U postgres -d shovelheroes -c "\d volunteer_registrations"
```

### Test Fails at Step 5

**Issue**: Foreign key protection test fails

**Possible Causes**:
- Foreign key constraints not properly configured
- ON DELETE CASCADE incorrectly set

**Solution**:
Review foreign key definitions and ensure they are set to default (RESTRICT/NO ACTION), not CASCADE.

## Integration with Backend API

This test simulates the logic that should be implemented in the `DELETE /grids/:id` endpoint:

```javascript
// Pseudocode for DELETE /grids/:id
async function deleteGrid(gridId) {
  // Start transaction
  await db.transaction(async (trx) => {
    // 1. Delete volunteer registrations
    await trx('volunteer_registrations')
      .where('grid_id', gridId)
      .delete();

    // 2. Delete supply donations
    await trx('supply_donations')
      .where('grid_id', gridId)
      .delete();

    // 3. Delete grid discussions
    await trx('grid_discussions')
      .where('grid_id', gridId)
      .delete();

    // 4. Delete the grid itself
    await trx('grids')
      .where('id', gridId)
      .delete();
  });
}
```

## Future Enhancements

- [ ] Add API endpoint testing (once authentication is implemented)
- [ ] Test with larger datasets (100+ records)
- [ ] Add performance benchmarking
- [ ] Test concurrent delete operations
- [ ] Add rollback scenario testing
- [ ] Integrate with CI/CD pipeline

## References

- OpenAPI Spec: `/home/thc1006/dev/shovel-heroes/api-spec/openapi.yaml`
- Database Migrations: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/`
- Backend Routes: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/`
