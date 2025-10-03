# Row-Level Security (RLS) Policies

This directory contains modular RLS policies for all tables in the Shovel Heroes database.

## Structure

Each file contains RLS policies for a specific table or group of related tables:

- **`_helpers.sql`** - Shared helper functions (must be applied first)
- **`users.sql`** - Users table policies
- **`grids.sql`** - Grids table policies
- **`disaster_areas.sql`** - Disaster areas policies
- **`announcements.sql`** - Announcements policies
- **`volunteers.sql`** - Volunteers table policies
- **`volunteer_registrations.sql`** - Volunteer registrations policies
- **`supply_donations.sql`** - Supply donations policies
- **`grid_discussions.sql`** - Grid discussions policies
- **`auth_tables.sql`** - Authentication tables (OTP codes, login history)
- **`permissions.sql`** - Permissions and role permissions tables

## Application Order

1. **`_helpers.sql`** - Must be applied first (helper functions)
2. All other files can be applied in any order (no dependencies)

## Migration Integration

These policies are applied via migration `0014_modular_rls.sql` which sources all files in this directory.

## Role Hierarchy

```
super_admin         - Full system access
  └── regional_admin - Regional oversight
      └── ngo_coordinator - Manage volunteers and tasks
          ├── volunteer - Basic user with task access
          ├── victim - Request help
          └── data_analyst - Read-only analytics
```

## Helper Functions

### `user_has_role(required_roles TEXT[])`
Checks if the current user has one of the specified roles.

**Usage:**
```sql
WHERE user_has_role(ARRAY['super_admin', 'regional_admin'])
```

### `get_current_user_id()`
Safely retrieves the current user ID from `app.user_id` session variable.

**Usage:**
```sql
WHERE user_id = get_current_user_id()
```

### `is_admin()`
Checks if the current user is an admin (coordinator or above).

**Usage:**
```sql
WHERE is_admin()
```

### `is_grid_manager(grid_id UUID)`
Checks if the current user is the manager of a specific grid.

**Usage:**
```sql
WHERE is_grid_manager(grid.id)
```

## Policy Patterns

### Public Read, Admin Write
```sql
-- SELECT: Public
CREATE POLICY table_select_public ON table
  FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY table_modify_admin ON table
  FOR ALL USING (is_admin());
```

### Self-Access + Admin
```sql
-- SELECT: Self or admin
CREATE POLICY table_select_self_or_admin ON table
  FOR SELECT USING (
    user_id = get_current_user_id() OR is_admin()
  );
```

### No Direct Access (System Only)
```sql
-- All operations blocked (use SECURITY DEFINER functions)
CREATE POLICY table_no_access ON table
  FOR ALL USING (false);
```

## Testing RLS

See `packages/backend/tests/rls/` for RLS-specific tests using the RLS test framework.

**Example test:**
```typescript
import { withRLSContext, expectCanAccess, expectCannotAccess } from './rls-test-framework.js';

// Test that volunteer can access own data
await expectCanAccess(pool, volunteerId, 'SELECT * FROM volunteers WHERE user_id = $1', [volunteerId]);

// Test that volunteer cannot access other data
await expectCannotAccess(pool, volunteerId, 'SELECT * FROM volunteers WHERE user_id = $1', [otherUserId]);
```

## Security Notes

1. **Always set app.user_id**: All RLS policies depend on the `app.user_id` session variable being set correctly
2. **Use SECURITY DEFINER functions**: For operations that need to bypass RLS (like user registration, OTP validation)
3. **Test thoroughly**: Every policy should have corresponding tests
4. **Audit regularly**: Review RLS policies during security audits
5. **Monitor performance**: RLS policies can impact query performance - monitor and optimize as needed

## Maintenance

When adding new tables:

1. Create a new `.sql` file in this directory
2. Follow existing naming conventions
3. Add comprehensive comments
4. Update this README
5. Add the file to `0014_modular_rls.sql` migration
6. Write tests in `tests/rls/`

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Migration 0012](../../migrations/0012_complete_rls_policies.sql) - Original comprehensive policies
- [INFRASTRUCTURE_DESIGN.md](../../../../docs/INFRASTRUCTURE_DESIGN.md) - Overall architecture
