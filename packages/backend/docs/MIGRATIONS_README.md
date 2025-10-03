# Database Migrations - Shovel Heroes

## Overview

This directory contains all database migrations for the Shovel Heroes backend application. Migrations are managed using `node-pg-migrate` and should be run in sequential order.

**Last Verified:** 2025-10-03
**Total Migrations:** 14
**Database Version:** PostgreSQL 16.10

---

## Migration Sequence

All migrations have been verified to run successfully in sequence from a fresh database. The following table lists all migrations in execution order:

| # | Migration | Timestamp | Purpose | Dependencies |
|---|-----------|-----------|---------|--------------|
| 1 | `1696233600000_init.sql` | 1696233600000 | Initial schema setup | None |
| 2 | `1696237200000_rls.sql` | 1696237200000 | Enable RLS on grids | Migration 1 |
| 3 | `1696240800000_audit.sql` | 1696240800000 | Add audit logging | Migration 1 |
| 4 | `1696244400000_create_all_tables.sql` | 1696244400000 | Create core tables | Migration 1-3 |
| 5 | `1696248000000_expand_grids_table.sql` | 1696248000000 | Expand grids schema | Migration 4 |
| 6 | `1696251600000_add_announcement_fields.sql` | 1696251600000 | Add announcement fields | Migration 4 |
| 7 | `1696255200000_add_volunteer_registration_statuses.sql` | 1696255200000 | Add registration statuses | Migration 4 |
| 8 | `1696258800000_add_grid_manager_column.sql` | 1696258800000 | Add grid manager support | Migration 5 |
| 9 | `1696262400000_create_auth_system.sql` | 1696262400000 | Complete auth system | Migration 1 |
| 10 | `1696266000000_add_grid_code_unique_constraint.sql` | 1696266000000 | Add unique constraint | Migration 5 |
| 11 | `1696269600000_auto_update_volunteer_count.sql` | 1696269600000 | Auto-update volunteer counts | Migration 5,7 |
| 12 | `1696273200000_complete_rls_policies.sql` | 1696273200000 | Comprehensive RLS policies | Migration 9 |
| 13 | `1696276800000_add_missing_columns.sql` | 1696276800000 | Add missing columns | Migration 5,7 |
| 14 | `1696280400000_modular_rls.sql` | 1696280400000 | Modular RLS reorganization | Migration 12 |

---

## Migration Details

### 1. Initial Setup (`1696233600000_init.sql`)
**Purpose:** Create minimal initial schema

**Creates:**
- `users` table (id, phone, display_name)
- `grids` table (id, name, area_id)
- `app` schema with helper functions
- `app.current_user_id()` function for RLS

**Dependencies:** None

---

### 2. Row Level Security (`1696237200000_rls.sql`)
**Purpose:** Enable basic RLS on grids table

**Changes:**
- Enable RLS on `grids` table
- Add `grids_select_all` policy (public read)

**Dependencies:** Migration 1 (requires `grids` table)

---

### 3. Audit Logging (`1696240800000_audit.sql`)
**Purpose:** Add comprehensive audit logging

**Creates:**
- `audit_log` table
- `app.audit_trigger()` function
- Audit trigger on `grids` table

**Dependencies:** Migration 1 (requires `app` schema)

---

### 4. Core Tables (`1696244400000_create_all_tables.sql`)
**Purpose:** Create all core application tables

**Creates:**
- `disaster_areas` - Disaster area definitions
- `announcements` - Public announcements
- `volunteers` - Volunteer profiles
- `volunteer_registrations` - Grid registrations
- `supply_donations` - Donation tracking
- `grid_discussions` - Discussion forum
- Indexes for performance
- Basic RLS policies
- Audit triggers
- Sample data

**Dependencies:** Migration 1-3 (requires users, grids, audit system)

---

### 5. Expand Grids Table (`1696248000000_expand_grids_table.sql`)
**Purpose:** Add map functionality to grids

**Adds to `grids`:**
- `code` - Unique grid identifier
- `grid_type` - Type of grid (manpower, supply, etc.)
- `status` - Grid status (open, closed, etc.)
- `center_lat`, `center_lng` - GPS coordinates
- `bounds` - Geographic boundaries (JSONB)
- `volunteer_needed`, `volunteer_registered` - Capacity tracking
- `supplies_needed` - Supply requirements (JSONB)
- `meeting_point` - Meeting location
- `description` - Grid description
- Timestamps

**Creates:**
- Sample grid data (13 grids in 光復鄉)
- Performance indexes

**Dependencies:** Migration 4 (requires `grids` table)

---

### 6. Announcement Fields (`1696251600000_add_announcement_fields.sql`)
**Purpose:** Add missing announcement fields for frontend

**Adds to `announcements`:**
- `category` - Announcement category
- `is_pinned` - Pin to top
- `order` - Display order
- `contact_phone` - Contact information
- `external_links` - External links (JSONB)
- Indexes for filtering

**Dependencies:** Migration 4 (requires `announcements` table)

---

### 7. Volunteer Registration Statuses (`1696255200000_add_volunteer_registration_statuses.sql`)
**Purpose:** Expand registration workflow

**Changes:**
- Add `arrived` and `completed` statuses
- Add `updated_at` column
- Create auto-update trigger
- Add RLS policy for updates

**Status Flow:** `pending` → `confirmed` → `arrived` → `completed` (or `cancelled`)

**Dependencies:** Migration 4 (requires `volunteer_registrations` table)

---

### 8. Grid Manager Column (`1696258800000_add_grid_manager_column.sql`)
**Purpose:** Support RBAC for grid managers

**Adds to `grids`:**
- `grid_manager_id` - Foreign key to users
- Index for performance
- Documentation comment

**Dependencies:** Migration 5 (requires expanded `grids` table)

---

### 9. Authentication System (`1696262400000_create_auth_system.sql`)
**Purpose:** Complete authentication and authorization system

**Expands `users` table:**
- Authentication fields (email, password_hash, phone_number)
- Role system (volunteer, victim, ngo_coordinator, regional_admin, data_analyst, super_admin)
- Status tracking
- Encrypted PII fields
- Verification status
- 2FA support (TOTP, backup codes)
- Login security (failed attempts, lockout)
- Timestamps

**Creates:**
- `volunteer_profiles` - Volunteer details
- `victim_profiles` - Victim/disaster victim details
- `otp_codes` - One-time password management
- `sessions` - Session management
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings
- `user_permissions` - User-specific permissions
- `audit_logs` - Enhanced audit logging
- `login_history` - Login tracking
- Helper functions (encrypt_pii, decrypt_pii, user_has_permission)
- RLS policies
- Default permissions and role mappings

**Dependencies:** Migration 1 (requires `users` table)

---

### 10. Grid Code Unique Constraint (`1696266000000_add_grid_code_unique_constraint.sql`)
**Purpose:** Ensure grid codes are unique

**Changes:**
- Add UNIQUE constraint on `grids.code`
- Enables proper 409 Conflict responses

**Dependencies:** Migration 5 (requires `code` column)

---

### 11. Auto Update Volunteer Count (`1696269600000_auto_update_volunteer_count.sql`)
**Purpose:** Automatically maintain volunteer counts

**Creates:**
- `update_grid_volunteer_count()` function
- Trigger on `volunteer_registrations` (INSERT, DELETE, UPDATE)
- Corrects existing data

**Maintains:** `grids.volunteer_registered` based on registration count

**Dependencies:** Migration 5 and 7 (requires grids expansion and registration system)

---

### 12. Complete RLS Policies (`1696273200000_complete_rls_policies.sql`)
**Purpose:** Comprehensive RLS across all tables

**Creates Helper Functions:**
- `user_has_role(TEXT[])` - Check if user has any of specified roles
- `get_current_user_id()` - Safely get current user ID
- `is_admin()` - Check if user is admin

**Applies Policies to:**
- `grids` - Public read, admin write
- `announcements` - Published public, author/admin control
- `volunteers` - Self or admin access
- `volunteer_registrations` - Self-service with admin approval
- `disaster_areas` - Public read, admin write
- `supply_donations` - Public transparency, admin management
- `grid_discussions` - Public forum, author control
- `otp_codes` - No direct access
- `login_history` - Self-view, admin access
- `permissions`, `role_permissions` - Public read, admin write
- `user_permissions` - Self-view, admin management

**Dependencies:** Migration 9 (requires auth system and roles)

---

### 13. Add Missing Columns (`1696276800000_add_missing_columns.sql`)
**Purpose:** Add columns required by API integration guide

**Adds to `grids`:**
- `contact_info` - Grid coordinator contact (SENSITIVE)
- `risks_notes` - Safety information

**Adds to `volunteer_registrations`:**
- `volunteer_name` - Volunteer name
- `volunteer_phone` - Phone number (SENSITIVE)
- `available_time` - Availability schedule
- `skills` - Skills array
- `equipment` - Equipment array

**Creates:**
- Sample data for testing
- Documentation comments

**Dependencies:** Migration 5 and 7 (requires table expansions)

---

### 14. Modular RLS (`1696280400000_modular_rls.sql`)
**Purpose:** Reorganize RLS policies for maintainability

**Changes:**
- Drops all policies from Migration 12
- Recreates policies in modular structure
- Adds `is_grid_manager(UUID)` function
- Adds table comments
- Verifies all tables have RLS enabled

**Supersedes:** Migration 12 (functionally equivalent but better organized)

**Structure:**
- Helper functions module
- Per-table policy modules
- Verification checks

**Dependencies:** Migration 12 (functionally replaces it)

---

## Database Schema Summary

### Tables Created (19 total)

**Core Application Tables:**
1. `users` - User accounts and authentication
2. `grids` - Grid system for disaster areas
3. `disaster_areas` - Disaster area definitions
4. `announcements` - Public announcements
5. `volunteers` - Volunteer profiles
6. `volunteer_registrations` - Grid registration system
7. `supply_donations` - Donation tracking
8. `grid_discussions` - Discussion forum

**Authentication Tables:**
9. `volunteer_profiles` - Extended volunteer data
10. `victim_profiles` - Victim/disaster victim data
11. `otp_codes` - One-time passwords
12. `sessions` - Active sessions
13. `permissions` - Permission definitions
14. `role_permissions` - Role-permission mappings
15. `user_permissions` - User-specific permissions

**Audit Tables:**
16. `audit_log` - Original audit table
17. `audit_logs` - Enhanced audit logging
18. `login_history` - Login attempts

**System Tables:**
19. `pgmigrations` - Migration tracking (created by node-pg-migrate)

### Row Level Security (RLS)

**Enabled on 18 tables** (all except `pgmigrations` and `audit_log`)

**Key Policies:**
- Public read for safety data (grids, disaster_areas, announcements)
- Self-access for personal data (users, volunteers, registrations)
- Admin override for management tasks
- No direct access for sensitive auth data (otp_codes)
- Grid manager access for volunteer phone numbers

### Helper Functions

**In `app` schema:**
- `current_user_id()` - Get current user from session context
- `audit_trigger()` - Generic audit logging trigger

**In `public` schema:**
- `user_has_role(TEXT[])` - Role checking for RLS
- `get_current_user_id()` - Safe user ID retrieval
- `is_admin()` - Admin role check
- `is_grid_manager(UUID)` - Grid manager check
- `update_updated_at_column()` - Auto-update timestamps
- `update_volunteer_registrations_updated_at()` - Registration timestamps
- `update_grid_volunteer_count()` - Auto-update volunteer counts
- `encrypt_pii(TEXT, TEXT)` - PII encryption
- `decrypt_pii(BYTEA, TEXT)` - PII decryption
- `user_has_permission(UUID, VARCHAR)` - Permission checking

---

## Running Migrations

### Fresh Database Setup

```bash
# Create database and run all migrations
npm run test:db:setup
npm run migrate:up
```

### Apply New Migrations

```bash
# Run pending migrations
npm run migrate:up
```

### Rollback Migrations

```bash
# Rollback last migration
npm run migrate:down

# Rollback and reapply
npm run migrate:redo
```

### Create New Migration

```bash
npm run migrate:create <migration-name>
```

---

## Migration Verification

**Verification Date:** 2025-10-03
**Status:** ✅ All migrations verified working

### Verification Tests

1. ✅ **Fresh Database Test** - All 14 migrations run successfully from scratch
2. ✅ **Schema Verification** - All tables and columns created correctly
3. ✅ **RLS Verification** - All tables have RLS enabled (except audit_log, pgmigrations)
4. ✅ **Sample Data** - 13 sample grids created
5. ✅ **Indexes** - All performance indexes created
6. ✅ **Functions** - All helper functions created
7. ✅ **Triggers** - All triggers active

### Known Issues

**Duplicate RLS Policies:**
- Some tables have duplicate UPDATE policies (e.g., `volunteer_registrations_update_own` and `volunteer_registrations_update_own_or_admin`)
- This is harmless but could be cleaned up in a future migration
- Both policies are active but the more permissive one takes precedence

**Superseded Migrations:**
- Migration 12 (`complete_rls_policies`) is functionally superseded by Migration 14 (`modular_rls`)
- Both apply the same policies but Migration 14 is better organized
- Migration 12 policies are dropped and recreated by Migration 14

---

## Rollback Support

**Note:** Currently, down migrations are not implemented for most migrations. This is standard practice for production databases where rollbacks can cause data loss.

**Recommended Approach:**
- For development: Drop and recreate database
- For production: Create forward-fixing migrations

**Future Enhancement:** Add down migrations for all reversible schema changes

---

## Best Practices

### Creating New Migrations

1. **Name clearly:** Use descriptive names like `add_column_to_table` or `create_feature_table`
2. **One purpose:** Each migration should do one logical thing
3. **Idempotent:** Use `IF NOT EXISTS` and `IF EXISTS` clauses
4. **Test thoroughly:** Test on fresh database and with existing data
5. **Document:** Add comments explaining purpose and dependencies

### Migration Dependencies

1. **Check dependencies:** Ensure required tables/columns exist
2. **Order matters:** Migrations run in timestamp order
3. **Foreign keys:** Create referenced tables first
4. **Indexes:** Create after data insertion for better performance

### RLS Policies

1. **Security first:** Default to restrictive, open as needed
2. **Use helpers:** Leverage `user_has_role()` and `is_admin()` functions
3. **Test policies:** Verify policies work with different user roles
4. **Document access:** Comment on sensitive columns

---

## Schema Documentation

For detailed API integration documentation, see:
- `/docs/BACKEND_API_INTEGRATION_GUIDE.md` - Complete API and schema reference
- `/api-spec/openapi.yaml` - OpenAPI specification

---

## Support

If you encounter migration issues:
1. Check migration order and dependencies
2. Verify PostgreSQL version compatibility (requires PostgreSQL 12+)
3. Review error messages for constraint violations
4. Check for conflicting data in existing databases

For migration errors, create an issue with:
- Migration name and timestamp
- PostgreSQL version
- Error message
- Steps to reproduce
