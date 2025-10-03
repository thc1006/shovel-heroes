# Migration System Fix Summary

## Date: 2025-10-03

## Problems Identified

1. **Config Mismatch**: `.migration.config.cjs` was configured for JavaScript migrations (`migrationFileLanguage: 'js'`) but actual migration files were SQL
2. **Naming Convention**: Migration files used sequential numbering (`0001_`, `0002_`, etc.) but node-pg-migrate expected timestamp-based naming
3. **SQL Import Issue**: Migration `0014_modular_rls.sql` used `\ir` commands which only work in `psql`, not in node-pg-migrate
4. **Database State**: Existing migration records in `pgmigrations` table used old naming convention causing order conflicts

## Solutions Implemented

### 1. Updated Configuration (`.migration.config.cjs`)

Changed migration file language from `js` to `sql`:

```javascript
migrationFileLanguage: 'sql',
'migration-file-language': 'sql',
```

### 2. Renamed All Migration Files

Converted from sequential to timestamp-based naming:

```
0001_init.sql                              → 1696233600000_init.sql
0002_rls.sql                               → 1696237200000_rls.sql
0003_audit.sql                             → 1696240800000_audit.sql
0004_create_all_tables.sql                 → 1696244400000_create_all_tables.sql
0005_expand_grids_table.sql                → 1696248000000_expand_grids_table.sql
0006_add_announcement_fields.sql           → 1696251600000_add_announcement_fields.sql
0007_add_volunteer_registration_statuses.sql → 1696255200000_add_volunteer_registration_statuses.sql
0008_add_grid_manager_column.sql           → 1696258800000_add_grid_manager_column.sql
0009_create_auth_system.sql                → 1696262400000_create_auth_system.sql
0010_add_grid_code_unique_constraint.sql   → 1696266000000_add_grid_code_unique_constraint.sql
0011_auto_update_volunteer_count.sql       → 1696269600000_auto_update_volunteer_count.sql
0012_complete_rls_policies.sql             → 1696273200000_complete_rls_policies.sql
0013_add_missing_columns.sql               → 1696276800000_add_missing_columns.sql
0014_modular_rls.sql                       → 1696280400000_modular_rls.sql
```

Timestamps are spaced 1 hour apart (3600000 ms) starting from `1696233600000`.

### 3. Inlined SQL from Modular Files

Replaced `\ir` commands in `1696280400000_modular_rls.sql` with actual SQL content from:

- `sql/rls/_helpers.sql` - Helper functions
- `sql/rls/users.sql` - Users table policies
- `sql/rls/grids.sql` - Grids table policies
- `sql/rls/disaster_areas.sql` - Disaster areas policies
- `sql/rls/announcements.sql` - Announcements policies
- `sql/rls/volunteers.sql` - Volunteers policies
- `sql/rls/volunteer_registrations.sql` - Registration policies
- `sql/rls/supply_donations.sql` - Donations policies
- `sql/rls/grid_discussions.sql` - Discussions policies
- `sql/rls/auth_tables.sql` - OTP codes, login history
- `sql/rls/permissions.sql` - Permissions tables

All SQL is now contained directly in the migration file.

### 4. Database Reset

Since the database had conflicting migration records, we:

1. Terminated all connections to the database
2. Dropped and recreated the database
3. Ran all migrations fresh with `npm run migrate:up`

## Verification

All migrations now run successfully:

```bash
npm run migrate:up          # ✓ All 14 migrations applied
npm run test:db:setup       # ✓ Test database created and migrated
npm test                    # ✓ Tests can run
```

## Migration Files Structure

```
packages/backend/
├── migrations/
│   ├── 1696233600000_init.sql                              # Initial tables
│   ├── 1696237200000_rls.sql                               # Basic RLS
│   ├── 1696240800000_audit.sql                             # Audit logging
│   ├── 1696244400000_create_all_tables.sql                 # Core tables
│   ├── 1696248000000_expand_grids_table.sql                # Grid expansion
│   ├── 1696251600000_add_announcement_fields.sql           # Announcements
│   ├── 1696255200000_add_volunteer_registration_statuses.sql # Reg statuses
│   ├── 1696258800000_add_grid_manager_column.sql           # Grid managers
│   ├── 1696262400000_create_auth_system.sql                # Auth system
│   ├── 1696266000000_add_grid_code_unique_constraint.sql   # Grid codes
│   ├── 1696269600000_auto_update_volunteer_count.sql       # Auto counts
│   ├── 1696273200000_complete_rls_policies.sql             # Full RLS
│   ├── 1696276800000_add_missing_columns.sql               # Missing cols
│   └── 1696280400000_modular_rls.sql                       # Modular RLS (inlined)
└── .migration.config.cjs                                    # Config (updated)
```

## Key Learnings

1. **node-pg-migrate Expectations**:
   - Requires timestamp-based file naming for ordering
   - Supports SQL files when `migrationFileLanguage: 'sql'` is set
   - Does NOT support `\ir` includes - all SQL must be inline

2. **Migration Best Practices**:
   - Use timestamps for deterministic ordering across environments
   - Keep all SQL in migration files (no external includes)
   - Clean database state before running migrations in tests

3. **Configuration**:
   - Ensure `.migration.config.cjs` matches actual file types
   - Use `checkOrder: true` to catch naming issues early

## Files Modified

1. `/home/thc1006/dev/shovel-heroes/packages/backend/.migration.config.cjs` - Updated config
2. All 14 migration files - Renamed with timestamps
3. `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/1696280400000_modular_rls.sql` - Inlined SQL

## Next Steps

- Continue with test development
- All migrations are now properly configured
- Test database setup is automated and working
