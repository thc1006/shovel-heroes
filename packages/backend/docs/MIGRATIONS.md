# Database Migrations

This directory contains SQL migration files for the Shovel Heroes database schema.

## Migration Files

### Core Schema
- **0001_init.sql** - Initial database setup with basic tables and functions
- **0002_rls.sql** - Basic Row-Level Security policies
- **0003_audit.sql** - Audit logging system with triggers
- **0004_complete_schema.sql** - Complete schema matching OpenAPI 3.1.0 spec
- **0005_rls_policies.sql** - Comprehensive RLS policies for all tables
- **0006_test_seed.sql** - Test data for development (dev/test only)
- **0007_audit_triggers.sql** - Audit triggers for all tables

## Schema Overview

### Tables

1. **users** - User accounts and profiles
   - id (UUID, PK)
   - name, email, phone
   - created_at, updated_at

2. **disaster_areas** - Disaster affected regions
   - id (UUID, PK)
   - name, center_lat, center_lng
   - created_at, updated_at

3. **grids** - Resource/rescue grids within disaster areas
   - id (UUID, PK)
   - code, grid_type, disaster_area_id
   - volunteer_needed, volunteer_registered
   - center_lat, center_lng, bounds (JSONB)
   - supplies_needed (JSONB array)
   - status, grid_manager_id
   - created_at, updated_at

4. **volunteer_registrations** - Volunteer sign-ups for grids
   - id (UUID, PK)
   - grid_id, user_id
   - volunteer_name, volunteer_phone
   - status, available_time
   - skills, equipment (arrays)
   - notes, created_at

5. **supply_donations** - Supply donation records
   - id (UUID, PK)
   - grid_id, name, quantity, unit
   - donor_contact, created_at

6. **grid_discussions** - Discussion messages for grids
   - id (UUID, PK)
   - grid_id, user_id, content
   - created_at

7. **announcements** - System-wide announcements
   - id (UUID, PK)
   - title, body
   - created_at

8. **audit_log** - Change tracking for all tables
   - id (BIGSERIAL, PK)
   - at, table_name, op, row_id
   - actor (user_id), diff (JSONB)

### Enums (implemented as CHECK constraints)

- **grid_type**: `mud_disposal`, `manpower`, `supply_storage`, `accommodation`, `food_area`
- **grid_status**: `open`, `closed`, `completed`, `pending`
- **volunteer_status**: `pending`, `confirmed`, `arrived`, `completed`, `cancelled`

### Key Features

1. **Row-Level Security (RLS)**
   - All tables have RLS enabled
   - Public read access for most tables
   - Write operations require JWT authentication via `app.current_user_id()`
   - Users can only modify their own data

2. **Phone Number Masking**
   - View: `volunteers_with_phone_mask`
   - Non-owners see masked phone (e.g., 0912-****-678)
   - Grid managers can see full phone numbers

3. **Automatic Triggers**
   - `updated_at` auto-updated on changes
   - `volunteer_registered` count auto-updated when registrations change
   - Audit logging on all data changes

4. **Data Validation**
   - CHECK constraints for enums
   - Lat/lng range validation (-90 to 90, -180 to 180)
   - JSONB schema validation for bounds
   - Unique constraints (code within disaster_area, etc.)

## Running Migrations

### Using node-pg-migrate

```bash
# Install dependencies
npm install node-pg-migrate

# Run all migrations
npm run migrate up

# Run specific migration
npx node-pg-migrate up 0004

# Rollback last migration
npm run migrate down

# View migration status
npx node-pg-migrate status
```

### Manual Execution

```bash
# Connect to database
psql -U postgres -d shovel_heroes

# Run migrations in order
\i 0001_init.sql
\i 0002_rls.sql
\i 0003_audit.sql
\i 0004_complete_schema.sql
\i 0005_rls_policies.sql
\i 0006_test_seed.sql  # dev/test only
\i 0007_audit_triggers.sql
```

## Testing Migrations

### Verification Queries

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';

-- Check triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify seed data counts
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM disaster_areas) as disaster_areas,
  (SELECT COUNT(*) FROM grids) as grids,
  (SELECT COUNT(*) FROM volunteer_registrations) as registrations,
  (SELECT COUNT(*) FROM supply_donations) as donations,
  (SELECT COUNT(*) FROM grid_discussions) as discussions,
  (SELECT COUNT(*) FROM announcements) as announcements;
```

### Testing RLS

```sql
-- Test without auth (should work for SELECT)
SELECT * FROM grids;

-- Test with auth
SET app.user_id = '00000000-0000-0000-0000-000000000001';
SELECT * FROM volunteer_registrations WHERE user_id = app.current_user_id();

-- Test phone masking
SELECT volunteer_name, volunteer_phone
FROM volunteers_with_phone_mask
WHERE grid_id = '20000000-0000-0000-0000-000000000001';
```

## Security Considerations

1. **Never commit secrets** - Use `.env` files for credentials
2. **RLS is mandatory** - All tables must have RLS enabled
3. **JWT authentication** - Use `app.current_user_id()` for auth checks
4. **Input validation** - Use Zod schemas in application layer
5. **Audit logging** - All changes are tracked in `audit_log`

## OpenAPI Compliance

This schema is the single source of truth for the backend, matching:
- **api-spec/openapi.yaml** - OpenAPI 3.1.0 specification
- All schemas defined in `components.schemas`
- All field names, types, and constraints

## Development Workflow

1. **Modify OpenAPI spec** first (api-spec/openapi.yaml)
2. **Create migration** to match schema changes
3. **Write tests** for new functionality (TDD)
4. **Implement routes** in packages/backend/src/routes/
5. **Update documentation** as needed

## Rollback Strategy

Migrations should be reversible. If rolling back:

```bash
# Rollback last migration
npm run migrate down

# Rollback to specific version
npx node-pg-migrate down --to 0003
```

For emergency rollback, restore from backup:

```bash
pg_restore -U postgres -d shovel_heroes backup.dump
```

## Best Practices

1. **One migration per logical change**
2. **Include comments** explaining complex logic
3. **Test migrations** on dev database first
4. **Use transactions** for atomic changes
5. **Version control** all migration files
6. **Never modify** existing migrations (create new ones)
7. **Keep migrations idempotent** (use IF NOT EXISTS)

## Support

For issues or questions:
- Check OpenAPI spec: `/api-spec/openapi.yaml`
- Review CLAUDE.md for development guidelines
- Check README.md for project overview
