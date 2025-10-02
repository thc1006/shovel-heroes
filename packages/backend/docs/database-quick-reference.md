# Database Quick Reference Guide

Quick reference for common database operations in Shovel Heroes.

## Setup

### Initial Setup
```bash
# Set environment variables
export DB_NAME=shovel_heroes
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=5432

# Run migrations
cd packages/backend
./scripts/run-migrations.sh

# With seed data (development only)
INCLUDE_SEED=true ./scripts/run-migrations.sh
```

### Verify Installation
```bash
# Run verification script
psql -U postgres -d shovel_heroes -f scripts/verify-schema.sql

# Or manually check
psql -U postgres -d shovel_heroes
\dt  -- List tables
\df app.*  -- List functions
```

## Common Queries

### Users

```sql
-- Create user
INSERT INTO users (name, email, phone)
VALUES ('林志工', 'lin@example.org', '0912-345-678')
RETURNING *;

-- Get user by email
SELECT * FROM users WHERE email = 'lin@example.org';

-- Update user profile
UPDATE users
SET name = '林大志工', phone = '0912-999-999'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Disaster Areas

```sql
-- List all disaster areas
SELECT * FROM disaster_areas ORDER BY created_at DESC;

-- Create disaster area
INSERT INTO disaster_areas (name, center_lat, center_lng)
VALUES ('花蓮市區', 23.9933, 121.6214)
RETURNING *;

-- Get grids in disaster area
SELECT g.* FROM grids g
WHERE g.disaster_area_id = '10000000-0000-0000-0000-000000000001';
```

### Grids

```sql
-- List open grids needing volunteers
SELECT
  code,
  grid_type,
  volunteer_needed,
  volunteer_registered,
  volunteer_needed - volunteer_registered as still_needed
FROM grids
WHERE status = 'open'
AND volunteer_registered < volunteer_needed
ORDER BY still_needed DESC;

-- Get grid with supplies needed
SELECT
  g.code,
  g.grid_type,
  g.supplies_needed
FROM grids g
WHERE g.id = '20000000-0000-0000-0000-000000000001';

-- Update grid status
UPDATE grids
SET status = 'completed'
WHERE id = '20000000-0000-0000-0000-000000000006';

-- Parse supplies_needed JSONB
SELECT
  g.code,
  supply.name,
  supply.quantity,
  supply.unit,
  supply.received
FROM grids g,
  jsonb_to_recordset(g.supplies_needed) AS supply(
    name text,
    quantity int,
    unit text,
    received int
  )
WHERE g.id = '20000000-0000-0000-0000-000000000001';
```

### Volunteer Registrations

```sql
-- Register volunteer (with JWT context)
SET app.user_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO volunteer_registrations (
  grid_id, user_id, volunteer_name, volunteer_phone,
  status, available_time, skills, equipment
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  app.current_user_id(),
  '林志工',
  '0912-345-678',
  'pending',
  '10/3 全天',
  ARRAY['挖土機'],
  ARRAY['鐵鏟', '手推車']
) RETURNING *;

-- List volunteers for a grid
SELECT * FROM volunteers_with_phone_mask
WHERE grid_id = '20000000-0000-0000-0000-000000000001'
ORDER BY created_date DESC;

-- Cancel registration
DELETE FROM volunteer_registrations
WHERE id = '30000000-0000-0000-0000-000000000009'
AND user_id = app.current_user_id();

-- Update registration status
UPDATE volunteer_registrations
SET status = 'confirmed'
WHERE id = '30000000-0000-0000-0000-000000000001';

-- Get registrations by status
SELECT
  status,
  COUNT(*) as count
FROM volunteer_registrations
GROUP BY status;
```

### Supply Donations

```sql
-- Record donation
INSERT INTO supply_donations (
  grid_id, name, quantity, unit, donor_contact
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '礦泉水',
  100,
  '箱',
  'water-company@example.com'
) RETURNING *;

-- List donations for grid
SELECT * FROM supply_donations
WHERE grid_id = '20000000-0000-0000-0000-000000000002'
ORDER BY created_at DESC;
```

### Discussions

```sql
-- Post discussion message
INSERT INTO grid_discussions (grid_id, user_id, content)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  app.current_user_id(),
  '今天下午 2 點集合'
) RETURNING *;

-- Get recent discussions for grid
SELECT
  d.content,
  d.created_at,
  u.name as author_name
FROM grid_discussions d
JOIN users u ON d.user_id = u.id
WHERE d.grid_id = '20000000-0000-0000-0000-000000000001'
ORDER BY d.created_at DESC
LIMIT 20;
```

### Announcements

```sql
-- Create announcement
INSERT INTO announcements (title, body)
VALUES (
  '重要通知',
  '明日集合時間改為 **08:30**'
) RETURNING *;

-- Get recent announcements
SELECT * FROM announcements
ORDER BY created_at DESC
LIMIT 10;
```

## Advanced Queries

### Statistics & Analytics

```sql
-- Grid statistics by type
SELECT
  grid_type,
  COUNT(*) as total_grids,
  SUM(volunteer_needed) as total_volunteers_needed,
  SUM(volunteer_registered) as total_registered,
  AVG(volunteer_registered::float / NULLIF(volunteer_needed, 0)) as fill_rate
FROM grids
GROUP BY grid_type;

-- Volunteer participation by user
SELECT
  u.name,
  COUNT(vr.id) as registrations,
  SUM(CASE WHEN vr.status = 'completed' THEN 1 ELSE 0 END) as completed
FROM users u
LEFT JOIN volunteer_registrations vr ON u.id = vr.user_id
GROUP BY u.id, u.name
ORDER BY registrations DESC;

-- Supply fulfillment rate
SELECT
  g.code,
  supply.name,
  supply.quantity as needed,
  supply.received as got,
  ROUND(100.0 * supply.received / supply.quantity, 2) as percent_filled
FROM grids g,
  jsonb_to_recordset(g.supplies_needed) AS supply(
    name text,
    quantity int,
    received int
  )
WHERE supply.quantity > 0
ORDER BY percent_filled ASC;
```

### Geospatial Queries

```sql
-- Grids near a point (simple distance calculation)
SELECT
  code,
  grid_type,
  SQRT(
    POW(center_lat - 23.8751, 2) +
    POW(center_lng - 121.578, 2)
  ) as distance_deg
FROM grids
ORDER BY distance_deg
LIMIT 10;

-- Grids in disaster area with bounds
SELECT
  g.code,
  g.grid_type,
  g.bounds->>'north' as north,
  g.bounds->>'south' as south,
  g.bounds->>'east' as east,
  g.bounds->>'west' as west
FROM grids g
WHERE g.disaster_area_id = '10000000-0000-0000-0000-000000000001';
```

### Audit Trail

```sql
-- Recent changes to grids
SELECT
  at,
  op,
  row_id,
  actor,
  diff
FROM audit_log
WHERE table_name = 'grids'
ORDER BY at DESC
LIMIT 20;

-- Changes by user
SELECT
  al.table_name,
  al.op,
  al.at,
  u.name as user_name
FROM audit_log al
LEFT JOIN users u ON al.actor = u.id
WHERE al.actor = '00000000-0000-0000-0000-000000000001'
ORDER BY al.at DESC;

-- Track specific record changes
SELECT
  at,
  op,
  diff
FROM audit_log
WHERE table_name = 'grids'
AND row_id = '20000000-0000-0000-0000-000000000001'
ORDER BY at DESC;
```

## RLS Testing

```sql
-- Test without authentication (should see public data only)
RESET app.user_id;
SELECT * FROM grids;  -- Should work (public read)
SELECT * FROM volunteer_registrations;  -- Should work (public read)

-- Test with authentication
SET app.user_id = '00000000-0000-0000-0000-000000000001';
SELECT * FROM volunteer_registrations
WHERE user_id = app.current_user_id();  -- Should only see own registrations

-- Test phone masking
SELECT volunteer_phone FROM volunteers_with_phone_mask
WHERE user_id != app.current_user_id();  -- Should see masked phones

-- Test write permissions (should fail without auth)
RESET app.user_id;
INSERT INTO volunteer_registrations (grid_id, user_id, volunteer_name)
VALUES ('grid-id', 'user-id', 'Name');  -- Should fail

-- Test write with auth (should succeed)
SET app.user_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO volunteer_registrations (grid_id, user_id, volunteer_name)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  app.current_user_id(),
  '測試志工'
);  -- Should succeed
```

## JSONB Operations

```sql
-- Query JSONB bounds
SELECT * FROM grids
WHERE (bounds->>'north')::numeric > 23.8;

-- Update JSONB field
UPDATE grids
SET bounds = jsonb_set(bounds, '{north}', '23.877')
WHERE id = '20000000-0000-0000-0000-000000000001';

-- Add item to supplies_needed array
UPDATE grids
SET supplies_needed = supplies_needed || '[{
  "name": "新物資",
  "quantity": 10,
  "unit": "個",
  "received": 0
}]'::jsonb
WHERE id = '20000000-0000-0000-0000-000000000001';

-- Update received quantity in supplies
UPDATE grids
SET supplies_needed = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'name' = '鋤頭'
      THEN jsonb_set(elem, '{received}', '10')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(supplies_needed) elem
)
WHERE id = '20000000-0000-0000-0000-000000000001';
```

## Performance Tips

```sql
-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE
SELECT * FROM grids
WHERE disaster_area_id = '10000000-0000-0000-0000-000000000001'
AND status = 'open';

-- Create index for common filters
CREATE INDEX idx_grids_area_status
ON grids(disaster_area_id, status)
WHERE status = 'open';

-- Vacuum and analyze regularly
VACUUM ANALYZE grids;
VACUUM ANALYZE volunteer_registrations;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Backup & Restore

```bash
# Backup database
pg_dump -U postgres -d shovel_heroes > backup_$(date +%Y%m%d).sql

# Backup with compression
pg_dump -U postgres -d shovel_heroes -Fc > backup_$(date +%Y%m%d).dump

# Restore from SQL
psql -U postgres -d shovel_heroes < backup.sql

# Restore from dump
pg_restore -U postgres -d shovel_heroes backup.dump

# Backup specific table
pg_dump -U postgres -d shovel_heroes -t grids > grids_backup.sql
```

## Troubleshooting

### Common Issues

1. **RLS blocking queries**
   ```sql
   -- Check if RLS is the issue
   SET SESSION AUTHORIZATION postgres;  -- Bypasses RLS
   SELECT * FROM table_name;
   RESET SESSION AUTHORIZATION;
   ```

2. **Trigger not firing**
   ```sql
   -- Check trigger exists
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE trigger_schema = 'public';
   ```

3. **JSONB schema validation failing**
   ```sql
   -- Test JSONB structure
   SELECT bounds FROM grids
   WHERE NOT (
     jsonb_typeof(bounds) = 'object' AND
     bounds ? 'north' AND bounds ? 'south'
   );
   ```

4. **Foreign key violations**
   ```sql
   -- Find orphaned records
   SELECT vr.* FROM volunteer_registrations vr
   LEFT JOIN grids g ON vr.grid_id = g.id
   WHERE g.id IS NULL;
   ```

### Reset Database

```bash
# Drop and recreate (development only!)
dropdb -U postgres shovel_heroes
createdb -U postgres shovel_heroes
./scripts/run-migrations.sh
```

## Quick Commands Cheat Sheet

```bash
# Connect to database
psql -U postgres -d shovel_heroes

# List tables
\dt

# Describe table
\d grids

# List functions
\df app.*

# List views
\dv

# List indexes
\di

# Show table sizes
\dt+

# Execute SQL file
\i filename.sql

# Toggle expanded display
\x

# Quit
\q
```

## Environment Variables

```bash
# Database connection
DB_NAME=shovel_heroes
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Application
NODE_ENV=development
JWT_SECRET=your_secret_key
```

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JSONB Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
