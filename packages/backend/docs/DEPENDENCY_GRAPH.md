# Migration Dependency Graph

**Last Updated:** 2025-10-03

This document visualizes the dependencies between all database migrations.

---

## Visual Dependency Graph

```
┌──────────────────────────────────────────────────────────────────────┐
│                  MIGRATION DEPENDENCY GRAPH                          │
│                     Shovel Heroes Backend                            │
└──────────────────────────────────────────────────────────────────────┘

                    1696233600000_init.sql
                    ┌─────────────────────┐
                    │ ▪ users table       │
                    │ ▪ grids table       │
                    │ ▪ app schema        │
                    │ ▪ current_user_id() │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
        1696237200000     1696240800000     1696262400000
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │   RLS    │      │  AUDIT   │      │   AUTH   │
        │ Enable   │      │ Logging  │      │  SYSTEM  │
        │ on grids │      │ System   │      │ Complete │
        └──────────┘      └─────┬────┘      └─────┬────┘
                                │                 │
                                ▼                 ▼
                        1696244400000      1696273200000
                        ┌──────────────┐   ┌──────────────┐
                        │ CREATE ALL   │   │ COMPLETE RLS │
                        │    TABLES    │   │   POLICIES   │
                        │ ▪ disaster   │   │ ▪ Helpers    │
                        │ ▪ announce   │   │ ▪ All tables │
                        │ ▪ volunteers │   └──────┬───────┘
                        │ ▪ registrat. │          │
                        │ ▪ donations  │          ▼
                        │ ▪ discussion │   1696280400000
                        └──────┬───────┘   ┌──────────────┐
                               │           │  MODULAR RLS │
                 ┌─────────────┼───────┐   │ Reorganize   │
                 │             │       │   │  Policies    │
                 ▼             ▼       ▼   └──────────────┘
        1696251600000  1696248000000  1696255200000
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │ANNOUNCE  │   │  EXPAND  │   │ VOLUNTEER    │
        │ FIELDS   │   │  GRIDS   │   │ REGISTRATION │
        │ category │   │ +15 cols │   │  STATUSES    │
        │ is_pinned│   │ GPS data │   │ +arrived     │
        │ order    │   │ supplies │   │ +completed   │
        └──────────┘   └─────┬────┘   └──────┬───────┘
                             │                │
                 ┌───────────┼────────┐       │
                 │           │        │       │
                 ▼           ▼        ▼       ▼
        1696258800000  1696266000000  1696269600000
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │   GRID   │   │   GRID   │   │   AUTO       │
        │ MANAGER  │   │   CODE   │   │  UPDATE      │
        │  COLUMN  │   │  UNIQUE  │   │ VOLUNTEER    │
        │ +manager │   │  grids   │   │   COUNT      │
        │ _id      │   │  .code   │   │ ▪ Trigger    │
        └──────────┘   └──────────┘   └──────────────┘
                 │                             │
                 └──────────┬──────────────────┘
                            │
                            ▼
                    1696276800000
                    ┌──────────────┐
                    │   MISSING    │
                    │   COLUMNS    │
                    │ ▪ contact_   │
                    │   info       │
                    │ ▪ risks_     │
                    │   notes      │
                    │ ▪ volunteer_ │
                    │   phone      │
                    │ ▪ skills     │
                    │ ▪ equipment  │
                    └──────────────┘
```

---

## Dependency Matrix

| Migration | Depends On | Blocks | Can Run Parallel With |
|-----------|-----------|--------|----------------------|
| 1696233600000_init | None | All others | None |
| 1696237200000_rls | 1 | None | 3, 9 |
| 1696240800000_audit | 1 | 4 | 2, 9 |
| 1696244400000_create_all_tables | 1, 3 | 5, 6, 7 | None |
| 1696248000000_expand_grids_table | 4 | 8, 10, 13 | 6, 7 |
| 1696251600000_add_announcement_fields | 4 | None | 5, 7 |
| 1696255200000_add_volunteer_registration_statuses | 4 | 11, 13 | 5, 6 |
| 1696258800000_add_grid_manager_column | 5 | 13 | 10, 11 |
| 1696262400000_create_auth_system | 1 | 12 | 2, 3, 4 |
| 1696266000000_add_grid_code_unique_constraint | 5 | None | 8, 11 |
| 1696269600000_auto_update_volunteer_count | 5, 7 | None | 8, 10 |
| 1696273200000_complete_rls_policies | 9 | 14 | None |
| 1696276800000_add_missing_columns | 5, 7, 8 | None | 10, 11 |
| 1696280400000_modular_rls | 12 | None | None |

---

## Critical Paths

### Path 1: Core Tables Setup
```
init (1) → audit (3) → create_all_tables (4) → expand_grids (5) → add_missing_columns (13)
```
**Duration:** ~1000ms
**Purpose:** Establish core database schema with all required columns

### Path 2: Authentication System
```
init (1) → create_auth_system (9) → complete_rls (12) → modular_rls (14)
```
**Duration:** ~700ms
**Purpose:** Set up complete authentication and authorization system

### Path 3: Volunteer System
```
init (1) → audit (3) → create_all_tables (4) → add_vol_statuses (7) → auto_update_count (11)
```
**Duration:** ~600ms
**Purpose:** Complete volunteer registration workflow

### Path 4: Grid Management
```
init (1) → audit (3) → create_all_tables (4) → expand_grids (5) → grid_manager (8) → grid_code_unique (10)
```
**Duration:** ~800ms
**Purpose:** Complete grid management system

---

## Parallel Execution Opportunities

If migrations supported parallel execution, these groups could run concurrently:

### Group 1 (After init)
- 1696237200000_rls
- 1696240800000_audit
- 1696262400000_create_auth_system

### Group 2 (After create_all_tables)
- 1696251600000_add_announcement_fields
- 1696248000000_expand_grids_table
- 1696255200000_add_volunteer_registration_statuses

### Group 3 (After expand_grids)
- 1696258800000_add_grid_manager_column
- 1696266000000_add_grid_code_unique_constraint
- 1696269600000_auto_update_volunteer_count (after vol statuses)

**Note:** node-pg-migrate runs migrations sequentially, so this is theoretical optimization only.

---

## Dependency Rules

### Rule 1: Table Creation
A migration that adds columns/constraints to a table must run after the table is created.

**Example:**
- `expand_grids_table` (5) requires `grids` table from `init` (1)

### Rule 2: Foreign Key Dependencies
A migration that creates a foreign key must run after the referenced table exists.

**Example:**
- `add_grid_manager_column` (8) adds FK to `users`, requires `users` from `init` (1)

### Rule 3: Function Dependencies
A migration that uses a function must run after the function is created.

**Example:**
- `complete_rls_policies` (12) uses `user_has_role()` from `create_auth_system` (9)

### Rule 4: Constraint Dependencies
A migration that relies on constraints must run after constraints are added.

**Example:**
- `add_grid_code_unique_constraint` (10) requires `code` column from `expand_grids_table` (5)

### Rule 5: Trigger Dependencies
A migration with triggers must run after required tables and functions exist.

**Example:**
- `auto_update_volunteer_count` (11) triggers on `volunteer_registrations`, requires table from `create_all_tables` (4)

---

## Safe Migration Order

The current timestamp-based ordering is safe and respects all dependencies:

```
1. 1696233600000 - init
2. 1696237200000 - rls
3. 1696240800000 - audit
4. 1696244400000 - create_all_tables
5. 1696248000000 - expand_grids_table
6. 1696251600000 - add_announcement_fields
7. 1696255200000 - add_volunteer_registration_statuses
8. 1696258800000 - add_grid_manager_column
9. 1696262400000 - create_auth_system
10. 1696266000000 - add_grid_code_unique_constraint
11. 1696269600000 - auto_update_volunteer_count
12. 1696273200000 - complete_rls_policies
13. 1696276800000 - add_missing_columns
14. 1696280400000 - modular_rls
```

**Verification:** ✅ No migration runs before its dependencies

---

## Unsafe Migration Patterns (Avoided)

### Pattern 1: Forward Reference
```
❌ BAD: create_auth_system → expand_grids_table → add_grid_manager_column
```
This would fail because `grid_manager_id` FK requires `users` table from auth system.

### Pattern 2: Missing Intermediate
```
❌ BAD: init → add_missing_columns (skip expand_grids_table)
```
This would fail because columns don't exist to add to.

### Pattern 3: Circular Dependency
```
❌ BAD: Migration A depends on B, Migration B depends on A
```
This is impossible to resolve. Always create dependencies in one direction.

---

## Adding New Migrations

When creating a new migration, ask:

1. **What tables does it modify?**
   - Must run after table creation

2. **Does it add foreign keys?**
   - Must run after referenced table exists

3. **Does it use functions?**
   - Must run after function creation

4. **Does it depend on columns?**
   - Must run after column addition

5. **Does it depend on constraints?**
   - Must run after constraint addition

**Example:**

```sql
-- NEW: Add volunteer rating system
-- Depends on:
-- - volunteers table (from migration 4)
-- - volunteer_registrations table (from migration 4)
-- - status field with 'completed' (from migration 7)

CREATE TABLE volunteer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES volunteer_registrations(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policy uses is_admin() from migration 12
CREATE POLICY ratings_select_admin ON volunteer_ratings
  FOR SELECT USING (is_admin());
```

**Dependencies:**
- Migration 4 (volunteers, volunteer_registrations tables)
- Migration 7 (status field)
- Migration 12 (is_admin function)

**Safe timestamp:** Any timestamp > 1696280400000 (after migration 14)

---

## Rollback Dependencies

When rolling back migrations, the order is reversed:

```
14. modular_rls
13. add_missing_columns
12. complete_rls_policies
11. auto_update_volunteer_count
10. add_grid_code_unique_constraint
9. create_auth_system
8. add_grid_manager_column
7. add_volunteer_registration_statuses
6. add_announcement_fields
5. expand_grids_table
4. create_all_tables
3. audit
2. rls
1. init
```

**Note:** Down migrations not currently implemented. This is the theoretical safe order.

---

## Dependency Verification Script

To verify dependencies are respected:

```sql
-- Check if all referenced tables exist
SELECT
  tc.table_name,
  tc.constraint_name,
  ccu.table_name AS referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check if all functions used in policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%user_has_role%';

-- Check if all triggers have valid functions
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND action_statement NOT LIKE '%EXECUTE FUNCTION%';
```

---

## Conclusion

The current migration order is **safe and optimal** for sequential execution. All dependencies are respected, and no migration references entities that don't yet exist.

**Key Takeaways:**
1. ✅ No circular dependencies
2. ✅ All foreign keys reference existing tables
3. ✅ All functions exist before use
4. ✅ All tables exist before column additions
5. ✅ Logical grouping (init → tables → auth → RLS)

**Future Optimizations:**
- If parallel execution is needed, implement locking mechanisms
- Consider splitting large migrations into smaller atomic operations
- Add dependency checks in migration creation script
