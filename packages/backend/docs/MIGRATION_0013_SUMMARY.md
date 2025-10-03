# Migration 0013: Add Missing Columns

## Overview

Migration 0013 adds missing database columns to align the schema with the **BACKEND_API_INTEGRATION_GUIDE.md** specification (lines 850-878).

## Files Created

1. **Migration SQL**: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0013_add_missing_columns.sql`
2. **Test Suite**: `/home/thc1006/dev/shovel-heroes/packages/backend/tests/schema/migration-0013.test.ts`
3. **Migration Script**: `/home/thc1006/dev/shovel-heroes/packages/backend/scripts/apply-migration-0013.js`

## Changes Summary

### 1. Grids Table

Added columns:
- `contact_info VARCHAR(255)` - Contact information for grid coordinators (SENSITIVE DATA)
- `risks_notes TEXT` - Risk notes and safety information for the grid location

Existing column verified:
- `meeting_point TEXT` - Already existed from migration 0005
- `grid_manager_id UUID` - Added by migration 0008

### 2. Volunteer Registrations Table

Added columns:
- `volunteer_name VARCHAR(255)` - Name of the volunteer (may differ from user display_name)
- `volunteer_phone VARCHAR(50)` - Volunteer phone number (SENSITIVE DATA, only visible to grid managers)
- `available_time TEXT` - Time availability for volunteer work (e.g., "週末全天", "平日晚上")
- `skills TEXT[]` - Array of volunteer skills (e.g., ["重機械操作", "醫療", "烹飪"])
- `equipment TEXT[]` - Array of equipment volunteer can bring (e.g., ["鏟子", "手套", "水桶"])

Existing columns verified:
- `notes TEXT` - Already existed from migration 0004
- `status` enum with values: 'pending', 'confirmed', 'arrived', 'completed', 'cancelled'

## Migration Execution

### Automatic (via node-pg-migrate)
```bash
npm run migrate:up
```

### Manual (if needed)
```bash
node packages/backend/scripts/apply-migration-0013.js
```

## Verification

### Run Tests
```bash
npm test tests/schema/migration-0013.test.ts
```

All 15 tests pass:
- ✓ grids table schema (4 tests)
- ✓ volunteer_registrations table schema (7 tests)
- ✓ data integrity tests (3 tests)
- ✓ column comments documentation (1 test)

### Manual Verification
```sql
-- Check grids table columns
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'grids'
AND column_name IN ('contact_info', 'risks_notes', 'meeting_point', 'grid_manager_id')
ORDER BY column_name;

-- Check volunteer_registrations table columns
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'volunteer_registrations'
AND column_name IN ('volunteer_name', 'volunteer_phone', 'available_time', 'skills', 'equipment', 'notes')
ORDER BY column_name;
```

## Security Considerations

### Sensitive Data Columns

The following columns contain sensitive personal information and should be protected by RLS policies:

1. **grids.contact_info** - Grid coordinator contact information
   - Should only be visible to:
     - Grid managers (ngo_coordinator role) for their assigned grids
     - Regional admins and super admins

2. **volunteer_registrations.volunteer_phone** - Volunteer phone numbers
   - Should only be visible to:
     - Grid managers for their assigned grids
     - The volunteer themselves
     - Regional admins and super admins

### RLS Policy Updates Needed

Update RLS policies in `migrations/0012_complete_rls_policies.sql` to restrict access to sensitive columns:

```sql
-- Example policy for grid contact_info
CREATE POLICY grids_select_contact_info ON grids
  FOR SELECT
  USING (
    -- Grid managers can see their assigned grids' contact info
    grid_manager_id = get_current_user_id() OR
    -- Admins can see all
    user_has_role(ARRAY['super_admin', 'regional_admin'])
  );

-- Example policy for volunteer phone numbers
CREATE POLICY volunteer_registrations_select_phone ON volunteer_registrations
  FOR SELECT
  USING (
    -- Volunteer can see own phone
    volunteer_id IN (SELECT id FROM volunteers WHERE user_id = get_current_user_id()) OR
    -- Grid manager can see phones for their grids
    grid_id IN (SELECT id FROM grids WHERE grid_manager_id = get_current_user_id()) OR
    -- Admins can see all
    user_has_role(ARRAY['super_admin', 'regional_admin', 'ngo_coordinator'])
  );
```

## Sample Data

The migration includes sample data updates for testing:

```sql
-- Grid A1 with contact info and risks
contact_info: '聯絡人：陳組長 0912-345-678'
risks_notes: '注意：路面濕滑，請穿防滑鞋。有倒塌風險建築物，請勿靠近。'

-- Volunteer registration example
volunteer_name: '張小明'
volunteer_phone: '0912-111-222'
available_time: '週末全天'
skills: ['重機械操作', '急救']
equipment: ['鏟子', '手套', '水桶']
notes: '有清淤經驗'
status: 'confirmed'
```

## Database Diagram Changes

### Grids Table (Updated)
```
grids
├── id (UUID, PK)
├── name (TEXT)
├── area_id (TEXT)
├── code (TEXT)
├── grid_type (TEXT)
├── status (TEXT)
├── center_lat (DECIMAL)
├── center_lng (DECIMAL)
├── bounds (JSONB)
├── volunteer_needed (INTEGER)
├── volunteer_registered (INTEGER)
├── supplies_needed (JSONB)
├── meeting_point (TEXT) ✓ existing
├── description (TEXT)
├── grid_manager_id (UUID, FK -> users.id) ✓ migration 0008
├── contact_info (VARCHAR(255)) ⭐ NEW - SENSITIVE
├── risks_notes (TEXT) ⭐ NEW
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Volunteer Registrations Table (Updated)
```
volunteer_registrations
├── id (UUID, PK)
├── volunteer_id (UUID, FK -> volunteers.id)
├── grid_id (UUID, FK -> grids.id)
├── disaster_area_id (UUID, FK -> disaster_areas.id)
├── registration_date (TIMESTAMPTZ)
├── status (TEXT) ✓ updated enum
├── notes (TEXT) ✓ existing
├── volunteer_name (VARCHAR(255)) ⭐ NEW
├── volunteer_phone (VARCHAR(50)) ⭐ NEW - SENSITIVE
├── available_time (TEXT) ⭐ NEW
├── skills (TEXT[]) ⭐ NEW
├── equipment (TEXT[]) ⭐ NEW
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ) ✓ migration 0007
```

## Rollback

To rollback this migration:

```sql
-- Remove columns from grids table
ALTER TABLE grids
  DROP COLUMN IF EXISTS contact_info,
  DROP COLUMN IF EXISTS risks_notes;

-- Remove columns from volunteer_registrations table
ALTER TABLE volunteer_registrations
  DROP COLUMN IF EXISTS volunteer_name,
  DROP COLUMN IF EXISTS volunteer_phone,
  DROP COLUMN IF EXISTS available_time,
  DROP COLUMN IF EXISTS skills,
  DROP COLUMN IF EXISTS equipment;
```

## References

- **Integration Guide**: `/home/thc1006/dev/shovel-heroes/BACKEND_API_INTEGRATION_GUIDE.md` (lines 850-878)
- **Migration 0004**: Created base tables
- **Migration 0005**: Expanded grids table with map fields
- **Migration 0007**: Added volunteer registration status values
- **Migration 0008**: Added grid_manager_id column
- **Migration 0012**: Complete RLS policies

## Status

✅ **Migration Applied Successfully**
✅ **All Tests Passing (15/15)**
✅ **Schema Aligned with Integration Guide**

---

*Generated: 2025-10-03*
*Migration Number: 0013*
*Database: shovelheroes (production)*
