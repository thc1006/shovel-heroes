# Database Schema Documentation

## Overview

This document describes the complete PostgreSQL database schema for the Shovel Heroes platform, designed to match the OpenAPI 3.1.0 specification exactly.

## Architecture Principles

1. **OpenAPI-First**: Schema matches `api-spec/openapi.yaml` as single source of truth
2. **Security**: Row-Level Security (RLS) enabled on all tables
3. **Audit Trail**: All changes logged in `audit_log` table
4. **Data Integrity**: CHECK constraints, foreign keys, and triggers ensure data validity
5. **Performance**: Strategic indexes on frequently queried columns

## Entity Relationship Diagram

```
┌──────────────┐
│    users     │
└──────┬───────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌──────────────────────────┐
│disaster_areas│   │volunteer_registrations   │
└──────┬───────┘   └────────────┬─────────────┘
       │                        │
       │                        │
       ▼                        │
┌─────────────┐                 │
│   grids     │◄────────────────┘
└──────┬───────┘
       │
       ├────────┬──────────────┬─────────────┐
       ▼        ▼              ▼             ▼
┌──────────┐┌─────────────┐┌────────┐┌──────────────┐
│supply_   ││grid_        ││        ││announcements │
│donations ││discussions  ││        │└──────────────┘
└──────────┘└─────────────┘└────────┘
```

## Tables

### 1. users

**Purpose**: User accounts and authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| name | TEXT | | Display name |
| email | TEXT | UNIQUE | Email address for login |
| phone | TEXT | | Phone number (optional) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes**:
- Primary key on `id`
- Unique index on `email`

**RLS Policies**:
- `users_select_own`: Users can read their own data
- `users_update_own`: Users can update their own profile
- `users_insert_any`: Public registration allowed

---

### 2. disaster_areas

**Purpose**: Disaster-affected geographic regions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique area identifier |
| name | TEXT | NOT NULL | Area name (e.g., "光復鄉重災區") |
| center_lat | DOUBLE PRECISION | NOT NULL, CHECK (-90 to 90) | Center latitude |
| center_lng | DOUBLE PRECISION | NOT NULL, CHECK (-180 to 180) | Center longitude |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes**:
- Primary key on `id`
- Index on `(center_lat, center_lng)` for geo queries

**RLS Policies**:
- `disaster_areas_select_all`: Public read access
- `disaster_areas_insert_auth`: Authenticated users can create
- `disaster_areas_update_auth`: Authenticated users can update
- `disaster_areas_delete_auth`: Authenticated users can delete

---

### 3. grids

**Purpose**: Resource/rescue grids within disaster areas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique grid identifier |
| code | TEXT | NOT NULL, UNIQUE (with disaster_area_id) | Grid code (e.g., "A-3") |
| grid_type | TEXT | NOT NULL, CHECK (enum values) | Type: mud_disposal, manpower, supply_storage, accommodation, food_area |
| disaster_area_id | UUID | NOT NULL, FK to disaster_areas | Parent disaster area |
| volunteer_needed | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Required volunteers |
| volunteer_registered | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Current registrations (auto-updated) |
| meeting_point | TEXT | | Meeting location description |
| risks_notes | TEXT | | Safety notes and risks |
| contact_info | TEXT | | Contact information |
| center_lat | DOUBLE PRECISION | NOT NULL, CHECK (-90 to 90) | Grid center latitude |
| center_lng | DOUBLE PRECISION | NOT NULL, CHECK (-180 to 180) | Grid center longitude |
| bounds | JSONB | NOT NULL, CHECK (schema validation) | Boundary coordinates {north, south, east, west} |
| status | TEXT | NOT NULL, DEFAULT 'open', CHECK (enum) | Status: open, closed, completed, pending |
| supplies_needed | JSONB | NOT NULL, DEFAULT '[]' | Array of SupplyNeed objects |
| grid_manager_id | UUID | FK to users, ON DELETE SET NULL | Grid manager |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |

**JSONB Schemas**:

```typescript
// bounds schema
{
  north: number,  // latitude
  south: number,  // latitude
  east: number,   // longitude
  west: number    // longitude
}

// supplies_needed schema (array)
[{
  name: string,      // e.g., "鋤頭"
  quantity: number,  // e.g., 20
  unit: string,      // e.g., "支"
  received: number   // e.g., 5 (optional, default 0)
}]
```

**Indexes**:
- Primary key on `id`
- Index on `disaster_area_id`
- Index on `grid_type`
- Index on `status`
- Index on `(center_lat, center_lng)`
- Index on `grid_manager_id`

**RLS Policies**:
- `grids_select_all`: Public read access
- `grids_insert_auth`: Authenticated users can create
- `grids_update_auth`: Grid managers or authenticated users can update
- `grids_delete_auth`: Authenticated users can delete

**Triggers**:
- `update_grids_updated_at`: Auto-update `updated_at` on changes
- `audit_grids`: Log all changes to audit_log

---

### 4. volunteer_registrations

**Purpose**: Volunteer sign-ups for grid assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Registration ID |
| grid_id | UUID | NOT NULL, FK to grids, UNIQUE (with user_id) | Target grid |
| user_id | UUID | NOT NULL, FK to users | Volunteer user |
| volunteer_name | TEXT | NOT NULL | Display name |
| volunteer_phone | TEXT | | Phone (subject to RLS masking) |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK (enum) | Status: pending, confirmed, arrived, completed, cancelled |
| available_time | TEXT | | Availability description |
| skills | TEXT[] | DEFAULT '{}' | Skills array (e.g., ["挖土機", "醫療志工"]) |
| equipment | TEXT[] | DEFAULT '{}' | Equipment array (e.g., ["鐵鏟", "手推車"]) |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Registration time |

**Indexes**:
- Primary key on `id`
- Index on `grid_id`
- Index on `user_id`
- Index on `status`
- Index on `created_at DESC` for recent registrations

**RLS Policies**:
- `volunteer_registrations_select_all`: Public read access
- `volunteer_registrations_insert_own`: Users can only register themselves
- `volunteer_registrations_update_own`: Users can only update their own
- `volunteer_registrations_delete_own`: Users can cancel their own registrations

**Triggers**:
- `update_grid_volunteer_count`: Auto-update `grids.volunteer_registered` count
- `audit_volunteer_registrations`: Log changes

**Special View**: `volunteers_with_phone_mask`
- Masks phone numbers for non-owners
- Grid managers can see full phone numbers
- Format: `0912-****-678` for masked numbers

---

### 5. supply_donations

**Purpose**: Track supply donations to grids

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Donation ID |
| grid_id | UUID | NOT NULL, FK to grids | Target grid |
| name | TEXT | NOT NULL | Supply name (e.g., "礦泉水") |
| quantity | INTEGER | NOT NULL, CHECK > 0 | Quantity donated |
| unit | TEXT | NOT NULL | Unit (e.g., "箱") |
| donor_contact | TEXT | | Donor contact info |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Donation time |

**Indexes**:
- Primary key on `id`
- Index on `grid_id`
- Index on `created_at DESC`

**RLS Policies**:
- `supply_donations_select_all`: Public read access
- `supply_donations_insert_auth`: Authenticated users can create
- `supply_donations_update_auth`: Authenticated users can update
- `supply_donations_delete_auth`: Authenticated users can delete

---

### 6. grid_discussions

**Purpose**: Discussion messages for grids

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Message ID |
| grid_id | UUID | NOT NULL, FK to grids | Target grid |
| user_id | UUID | NOT NULL, FK to users | Author |
| content | TEXT | NOT NULL, CHECK (length > 0) | Message content |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Post time |

**Indexes**:
- Primary key on `id`
- Index on `grid_id`
- Index on `user_id`
- Index on `created_at DESC`

**RLS Policies**:
- `grid_discussions_select_all`: Public read access
- `grid_discussions_insert_own`: Users can only post as themselves
- `grid_discussions_update_own`: Users can update their own messages
- `grid_discussions_delete_own`: Users can delete their own messages

---

### 7. announcements

**Purpose**: System-wide announcements

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Announcement ID |
| title | TEXT | NOT NULL, CHECK (length > 0) | Title |
| body | TEXT | NOT NULL, CHECK (length > 0) | Body (Markdown supported) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Post time |

**Indexes**:
- Primary key on `id`
- Index on `created_at DESC`

**RLS Policies**:
- `announcements_select_all`: Public read access
- `announcements_insert_auth`: Authenticated users can create
- `announcements_update_auth`: Authenticated users can update
- `announcements_delete_auth`: Authenticated users can delete

---

### 8. audit_log

**Purpose**: Immutable audit trail for all data changes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Change timestamp |
| table_name | TEXT | NOT NULL | Table that changed |
| op | TEXT | NOT NULL | Operation: INSERT, UPDATE, DELETE |
| row_id | TEXT | | Changed row ID (as text) |
| actor | UUID | | User who made change (app.current_user_id()) |
| diff | JSONB | | Change data (full row for INSERT/DELETE, old+new for UPDATE) |

**Indexes**:
- Primary key on `id`

**RLS Policies**:
- `audit_log_select_auth`: Only authenticated users can read
- `audit_log_no_insert/update/delete`: Prevent manual modifications (triggers only)

**Triggers**: Automatically populated by `app.audit_trigger()` function

---

## Functions

### app.current_user_id()

**Purpose**: Get authenticated user ID from session context

**Returns**: UUID or NULL

**Usage**:
```sql
-- Set user context before operations
SET app.user_id = '00000000-0000-0000-0000-000000000001';

-- Function automatically uses this in RLS policies
SELECT * FROM volunteer_registrations WHERE user_id = app.current_user_id();
```

---

### app.audit_trigger()

**Purpose**: Trigger function to log all data changes

**Usage**: Automatically called by triggers on all tables

---

### app.update_updated_at_column()

**Purpose**: Automatically update `updated_at` timestamp

**Usage**: Trigger on tables with `updated_at` column

---

### app.update_grid_volunteer_count()

**Purpose**: Maintain accurate volunteer count in grids table

**Usage**: Trigger on volunteer_registrations INSERT/UPDATE/DELETE

---

## Enum Values

### grid_type
- `mud_disposal` - Mud/debris disposal areas
- `manpower` - Manpower coordination areas
- `supply_storage` - Supply storage and distribution
- `accommodation` - Temporary shelter
- `food_area` - Food service areas

### grid_status
- `open` - Accepting volunteers/supplies
- `closed` - No longer active
- `completed` - Work completed
- `pending` - Not yet ready

### volunteer_status
- `pending` - Registration submitted
- `confirmed` - Registration approved
- `arrived` - Volunteer arrived on-site
- `completed` - Service completed
- `cancelled` - Registration cancelled

---

## Security Model

### Row-Level Security (RLS)

All tables have RLS enabled. Policies enforce:

1. **Public Read**: Most tables allow anonymous SELECT
2. **Authenticated Write**: Mutations require `app.current_user_id()` to be set
3. **Ownership**: Users can only modify their own data
4. **Phone Masking**: Non-owners see masked phone numbers via view

### JWT Authentication Flow

```
1. Client sends JWT in Authorization header
2. Backend validates JWT and extracts user_id
3. Backend runs: SET app.user_id = <user_id>
4. All queries automatically filtered by RLS
5. Audit log records actor from app.current_user_id()
```

### Example Policy

```sql
-- Users can only update their own registrations
CREATE POLICY volunteer_registrations_update_own
  ON volunteer_registrations
  FOR UPDATE
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());
```

---

## Performance Considerations

### Indexes

Strategic indexes on:
- Foreign keys (for JOINs)
- Status columns (for filtering)
- Timestamp columns (for sorting)
- Geo coordinates (for spatial queries)

### Query Optimization

```sql
-- Good: Uses index on grid_id
SELECT * FROM volunteer_registrations WHERE grid_id = $1;

-- Good: Uses index on status and created_at
SELECT * FROM volunteer_registrations
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 50;

-- Consider: Add composite index for frequent combinations
CREATE INDEX idx_registrations_grid_status
  ON volunteer_registrations(grid_id, status);
```

---

## Migration Strategy

### Running Migrations

```bash
# Development
./scripts/run-migrations.sh

# With seed data
INCLUDE_SEED=true ./scripts/run-migrations.sh

# Production
INCLUDE_SEED=false ./scripts/run-migrations.sh
```

### Verification

```bash
# Run schema verification
psql -U postgres -d shovel_heroes -f scripts/verify-schema.sql
```

---

## Testing

### Sample Queries

```sql
-- Get all open grids with volunteer needs
SELECT id, code, grid_type, volunteer_needed, volunteer_registered
FROM grids
WHERE status = 'open'
AND volunteer_registered < volunteer_needed;

-- Get volunteer list with phone masking
SELECT volunteer_name, volunteer_phone, status
FROM volunteers_with_phone_mask
WHERE grid_id = '20000000-0000-0000-0000-000000000001';

-- Get supply needs vs donations
SELECT
  g.code,
  s.name,
  s.quantity as needed,
  s.received as got,
  s.quantity - s.received as remaining
FROM grids g,
  jsonb_to_recordset(g.supplies_needed) AS s(
    name text, quantity int, unit text, received int
  )
WHERE g.id = '20000000-0000-0000-0000-000000000001';
```

---

## Maintenance

### Regular Tasks

1. **Analyze tables** for query planner:
   ```sql
   ANALYZE;
   ```

2. **Vacuum** to reclaim space:
   ```sql
   VACUUM ANALYZE;
   ```

3. **Review audit log** for security:
   ```sql
   SELECT * FROM audit_log
   WHERE at > NOW() - INTERVAL '24 hours'
   ORDER BY at DESC;
   ```

4. **Check RLS policies** are working:
   ```sql
   SET app.user_id = 'test-user-id';
   SELECT * FROM volunteer_registrations;  -- Should only see own records
   ```

---

## References

- **OpenAPI Spec**: `/api-spec/openapi.yaml`
- **Migration Files**: `/packages/backend/migrations/`
- **CLAUDE.md**: Project development guidelines
- **README.md**: Project overview
