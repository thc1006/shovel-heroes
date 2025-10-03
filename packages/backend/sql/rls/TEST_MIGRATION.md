# Testing the Modular RLS Migration

## Prerequisites

1. Ensure you have a test database set up
2. Ensure all migrations up to 0013 have been applied
3. Back up your data if testing on a non-test database

## Test Migration Application

### Step 1: Dry Run (Recommended)

```bash
# Set database connection
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/shovelheroes_test"

# Apply migration
npm run migrate:up

# Check if migration was applied
psql $DATABASE_URL -c "SELECT * FROM pgmigrations ORDER BY id DESC LIMIT 5;"
```

### Step 2: Verify RLS is Enabled

```bash
# Check all tables have RLS enabled
psql $DATABASE_URL << 'SQL'
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'grids', 'disaster_areas', 'announcements',
    'volunteers', 'volunteer_registrations', 'supply_donations',
    'grid_discussions', 'otp_codes', 'login_history',
    'permissions', 'role_permissions', 'user_permissions'
  )
ORDER BY tablename;
SQL
```

### Step 3: Verify Policies Exist

```bash
# Count policies per table
psql $DATABASE_URL << 'SQL'
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'users', 'grids', 'disaster_areas', 'announcements',
  'volunteers', 'volunteer_registrations', 'supply_donations',
  'grid_discussions', 'otp_codes', 'login_history',
  'permissions', 'role_permissions', 'user_permissions'
)
GROUP BY tablename
ORDER BY tablename;
SQL
```

Expected output:
- grids: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- volunteers: 4 policies
- announcements: 4 policies
- etc.

### Step 4: Verify Helper Functions

```bash
# Check helper functions exist
psql $DATABASE_URL << 'SQL'
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
  'user_has_role',
  'get_current_user_id',
  'is_admin',
  'is_grid_manager'
)
ORDER BY proname;
SQL
```

### Step 5: Run RLS Tests

```bash
# Run RLS-specific tests
npm test tests/rls/grids.rls.test.ts

# Run all RLS tests (when more are created)
npm test tests/rls/
```

## Expected Results

1. ✅ All 13 tables have RLS enabled
2. ✅ Each table has appropriate number of policies
3. ✅ All 4 helper functions exist
4. ✅ RLS tests pass
5. ✅ No errors in migration output

## Rollback (If Needed)

If you need to rollback the migration:

```bash
# Rollback one migration
npm run migrate:down

# This will remove the modular RLS policies
# Original policies from 0012 will need to be reapplied
```

## Common Issues

### Issue: "relation 'sql/rls/_helpers.sql' does not exist"

**Solution:** The migration uses `\ir` (include relative) to source files. Ensure:
- The sql/rls directory exists
- All .sql files are present
- You're running from the correct directory

### Issue: "function user_has_role already exists"

**Solution:** Migration 0012 may still be active. Check:
```bash
psql $DATABASE_URL -c "SELECT * FROM pgmigrations WHERE name LIKE '%rls%';"
```

### Issue: Tests fail with "RLS violation"

**Solution:** Check that:
- app.user_id is being set correctly in tests
- Helper functions are working: `SELECT user_has_role(ARRAY['super_admin']);`
- Policies are created: `SELECT * FROM pg_policies WHERE tablename = 'grids';`

## Verification Checklist

- [ ] Migration applies without errors
- [ ] All tables have RLS enabled
- [ ] Policy counts match expectations
- [ ] Helper functions exist and are callable
- [ ] Test suite passes
- [ ] No data loss occurred
- [ ] Application still works correctly

## Next Steps After Successful Migration

1. Add more RLS test suites for other tables
2. Update CI/CD to run RLS tests
3. Document any role-specific behaviors
4. Consider adding monitoring for RLS policy violations
