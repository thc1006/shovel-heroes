# Quick Start - Cascade Delete Integration Test

## Run the Test (One Command)

```bash
/home/thc1006/dev/shovel-heroes/tests/integration/test-cascade-delete.sh
```

## Expected Output

```
========================================
Cascade Delete Integration Test
========================================

[Step 1/6] Creating test data...
✓ Test grid created: <uuid>

[Step 2/6] Recording pre-delete state...
✓ Pre-delete state recorded

[Step 3/6] Executing cascade delete...
✓ Cascade delete executed

[Step 4/6] Verifying post-delete state...
✓ Post-delete state verified

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

## View Test Results

```bash
cat /home/thc1006/dev/shovel-heroes/tests/integration/test-results-cascade.json | jq .
```

## What Gets Tested

✅ Deleting a grid removes all volunteer registrations
✅ Deleting a grid removes all supply donations
✅ Deleting a grid removes all grid discussions
✅ The grid itself is deleted
✅ Foreign key constraints prevent deletion without cascade

## Prerequisites

- Docker container `shovelheroes-postgres` running
- Database `shovelheroes` with all tables created
- At least one user and disaster area in the database

## Troubleshooting

**Problem**: Test script won't run
**Solution**: Make it executable
```bash
chmod +x /home/thc1006/dev/shovel-heroes/tests/integration/test-cascade-delete.sh
```

**Problem**: Database container not found
**Solution**: Check container name
```bash
docker ps | grep postgres
# Update DB_CONTAINER in script if needed
```

**Problem**: Missing tables
**Solution**: Run migrations
```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
npm run migrate up
```

## Files Created

- `test-results-cascade.json` - Test execution results (JSON)
- `README.md` - Complete test documentation
- `TEST_SUMMARY.md` - Detailed test summary report
- `QUICK_START.md` - This file

## Clean Up Test Data

The test automatically cleans up test data after execution. If you need to manually clean up:

```bash
docker exec -i shovelheroes-postgres psql -U postgres -d shovelheroes << 'EOF'
DELETE FROM volunteer_registrations WHERE grid_id IN (SELECT id FROM grids WHERE code LIKE 'CASCADE-TEST%');
DELETE FROM supply_donations WHERE grid_id IN (SELECT id FROM grids WHERE code LIKE 'CASCADE-TEST%');
DELETE FROM grid_discussions WHERE grid_id IN (SELECT id FROM grids WHERE code LIKE 'CASCADE-TEST%');
DELETE FROM grids WHERE code LIKE 'CASCADE-TEST%';
EOF
```

## Next Steps

1. ✅ Tests pass - cascade delete logic is correct
2. 🔲 Implement `DELETE /grids/:id` API endpoint
3. 🔲 Add authentication/authorization
4. 🔲 Add to CI/CD pipeline

---

**For detailed documentation, see**: `README.md`
**For implementation guidance, see**: `TEST_SUMMARY.md`
