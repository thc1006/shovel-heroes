-- ============================================
-- Migration: Modular RLS Policies
-- Timestamp: 1696280400000
-- Created: 2025-10-03
-- Description: Apply modular RLS policies (inlined from sql/rls/ directory)
-- Supersedes: 0012_complete_rls_policies.sql
-- ============================================
--
-- This migration reorganizes RLS policies into modular sections for better
-- maintainability. All policies from migration 0012 are preserved but
-- now organized into logical, maintainable modules.
--
-- Original modular structure (for reference):
--   sql/rls/_helpers.sql          - Helper functions
--   sql/rls/users.sql             - Users table policies
--   sql/rls/grids.sql             - Grids table policies
--   sql/rls/disaster_areas.sql    - Disaster areas policies
--   sql/rls/announcements.sql     - Announcements policies
--   sql/rls/volunteers.sql        - Volunteers policies
--   sql/rls/volunteer_registrations.sql - Registration policies
--   sql/rls/supply_donations.sql  - Donations policies
--   sql/rls/grid_discussions.sql  - Discussions policies
--   sql/rls/auth_tables.sql       - OTP codes, login history
--   sql/rls/permissions.sql       - Permissions tables
-- ============================================

-- ============================================
-- Step 1: Drop all existing policies from 0012
-- ============================================

-- Helper functions (will be recreated)
DROP FUNCTION IF EXISTS user_has_role(TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_grid_manager(UUID) CASCADE;

-- Grids policies
DROP POLICY IF EXISTS grids_select_all ON grids;
DROP POLICY IF EXISTS grids_select_public ON grids;
DROP POLICY IF EXISTS grids_insert_admin ON grids;
DROP POLICY IF EXISTS grids_update_admin ON grids;
DROP POLICY IF EXISTS grids_delete_super_admin ON grids;

-- Announcements policies
DROP POLICY IF EXISTS announcements_select_published ON announcements;
DROP POLICY IF EXISTS announcements_select_public ON announcements;
DROP POLICY IF EXISTS announcements_insert_admin ON announcements;
DROP POLICY IF EXISTS announcements_update_author_or_admin ON announcements;
DROP POLICY IF EXISTS announcements_delete_author_or_super_admin ON announcements;

-- Volunteers policies
DROP POLICY IF EXISTS volunteers_select_all ON volunteers;
DROP POLICY IF EXISTS volunteers_select_self_or_admin ON volunteers;
DROP POLICY IF EXISTS volunteers_insert_self ON volunteers;
DROP POLICY IF EXISTS volunteers_update_self ON volunteers;
DROP POLICY IF EXISTS volunteers_delete_self_or_super_admin ON volunteers;

-- Volunteer registrations policies
DROP POLICY IF EXISTS volunteer_registrations_select_own ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_select_own_or_admin ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_insert_own ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_update_own_or_admin ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_delete_own_or_super_admin ON volunteer_registrations;

-- Disaster areas policies
DROP POLICY IF EXISTS disaster_areas_select_all ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_select_public ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_insert_admin ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_update_admin ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_delete_super_admin ON disaster_areas;

-- Supply donations policies
DROP POLICY IF EXISTS supply_donations_select_all ON supply_donations;
DROP POLICY IF EXISTS supply_donations_select_public ON supply_donations;
DROP POLICY IF EXISTS supply_donations_insert_authenticated ON supply_donations;
DROP POLICY IF EXISTS supply_donations_update_admin ON supply_donations;
DROP POLICY IF EXISTS supply_donations_delete_super_admin ON supply_donations;

-- Grid discussions policies
DROP POLICY IF EXISTS grid_discussions_select_all ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_select_public ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_insert_authenticated ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_update_author ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_delete_author_or_super_admin ON grid_discussions;

-- OTP codes policies
DROP POLICY IF EXISTS otp_codes_no_select ON otp_codes;
DROP POLICY IF EXISTS otp_codes_no_direct_insert ON otp_codes;
DROP POLICY IF EXISTS otp_codes_no_update ON otp_codes;
DROP POLICY IF EXISTS otp_codes_delete_super_admin ON otp_codes;

-- Login history policies
DROP POLICY IF EXISTS login_history_select_self_or_admin ON login_history;
DROP POLICY IF EXISTS login_history_no_direct_insert ON login_history;
DROP POLICY IF EXISTS login_history_no_update ON login_history;
DROP POLICY IF EXISTS login_history_delete_super_admin ON login_history;

-- Permissions policies
DROP POLICY IF EXISTS permissions_select_all ON permissions;
DROP POLICY IF EXISTS permissions_modify_super_admin ON permissions;

-- Role permissions policies
DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
DROP POLICY IF EXISTS role_permissions_modify_super_admin ON role_permissions;

-- User permissions policies
DROP POLICY IF EXISTS user_permissions_select_self_or_admin ON user_permissions;
DROP POLICY IF EXISTS user_permissions_modify_super_admin ON user_permissions;

-- Users policies
DROP POLICY IF EXISTS users_select_self_or_admin ON users;
DROP POLICY IF EXISTS users_insert_system ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS users_delete_super_admin ON users;

-- ============================================
-- Step 2: Apply modular RLS policies (inlined)
-- ============================================

-- ============================================
-- MODULE: RLS Helper Functions
-- Must be applied before any table policies
-- ============================================

-- Function to check if user has one of the required roles
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user ID from session context
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  -- Return false if no user context
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user role
  SELECT role INTO current_user_role
  FROM users
  WHERE id = current_user_id;

  -- Check if user role is in required roles
  RETURN current_user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user ID safely
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.user_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is admin (coordinator or above)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is grid manager for a specific grid
CREATE OR REPLACE FUNCTION is_grid_manager(grid_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  manager_id UUID;
BEGIN
  current_user_id := get_current_user_id();

  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT grid_manager_id INTO manager_id
  FROM grids
  WHERE id = grid_id_param;

  RETURN manager_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions to public
GRANT EXECUTE ON FUNCTION user_has_role(TEXT[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_grid_manager(UUID) TO PUBLIC;

-- Create indexes for faster role checks
CREATE INDEX IF NOT EXISTS idx_users_role_lookup ON users(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grids_manager_lookup ON grids(grid_manager_id) WHERE grid_manager_id IS NOT NULL;

-- Comments
COMMENT ON FUNCTION user_has_role IS 'Check if current user has one of the specified roles. Used in RLS policies.';
COMMENT ON FUNCTION get_current_user_id IS 'Safely get current user ID from app.user_id session variable.';
COMMENT ON FUNCTION is_admin IS 'Check if current user is an admin (coordinator or above).';
COMMENT ON FUNCTION is_grid_manager IS 'Check if current user is the manager of a specific grid.';

-- ============================================
-- MODULE: RLS Policies for users table
-- Self-access and admin management
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self_or_admin ON users;
DROP POLICY IF EXISTS users_insert_system ON users;
DROP POLICY IF EXISTS users_update_self ON users;
DROP POLICY IF EXISTS users_delete_super_admin ON users;

-- SELECT: Users can view own profile, admins can view all
CREATE POLICY users_select_self_or_admin ON users
  FOR SELECT
  USING (
    id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin', 'data_analyst'])
  );

-- INSERT: Only through authentication system
CREATE POLICY users_insert_system ON users
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update own profile, admins can update any user
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (
    id = get_current_user_id() OR
    user_has_role(ARRAY['regional_admin', 'super_admin'])
  );

-- DELETE: Only super admins
CREATE POLICY users_delete_super_admin ON users
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for grids table
-- Public map data with admin-only modifications
-- ============================================

ALTER TABLE grids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grids_select_all ON grids;
DROP POLICY IF EXISTS grids_select_public ON grids;
DROP POLICY IF EXISTS grids_insert_admin ON grids;
DROP POLICY IF EXISTS grids_update_admin ON grids;
DROP POLICY IF EXISTS grids_delete_super_admin ON grids;

-- SELECT: Everyone can view grids
CREATE POLICY grids_select_public ON grids
  FOR SELECT
  USING (true);

-- INSERT: Only coordinators and admins
CREATE POLICY grids_insert_admin ON grids
  FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- UPDATE: Only coordinators and admins
CREATE POLICY grids_update_admin ON grids
  FOR UPDATE
  USING (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Only super admins
CREATE POLICY grids_delete_super_admin ON grids
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for disaster_areas table
-- Public safety information with admin control
-- ============================================

ALTER TABLE disaster_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS disaster_areas_select_all ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_select_public ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_insert_admin ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_update_admin ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_delete_super_admin ON disaster_areas;

-- SELECT: Everyone can view disaster areas
CREATE POLICY disaster_areas_select_public ON disaster_areas
  FOR SELECT
  USING (true);

-- INSERT: Only coordinators and admins
CREATE POLICY disaster_areas_insert_admin ON disaster_areas
  FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- UPDATE: Only coordinators and admins
CREATE POLICY disaster_areas_update_admin ON disaster_areas
  FOR UPDATE
  USING (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Only super admins
CREATE POLICY disaster_areas_delete_super_admin ON disaster_areas
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for announcements table
-- Public announcements with author/admin control
-- ============================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_select_published ON announcements;
DROP POLICY IF EXISTS announcements_select_public ON announcements;
DROP POLICY IF EXISTS announcements_insert_admin ON announcements;
DROP POLICY IF EXISTS announcements_update_author_or_admin ON announcements;
DROP POLICY IF EXISTS announcements_delete_author_or_super_admin ON announcements;

-- SELECT: Published announcements visible to all, unpublished only to admins
CREATE POLICY announcements_select_public ON announcements
  FOR SELECT
  USING (published = true OR is_admin());

-- INSERT: Only coordinators and admins
CREATE POLICY announcements_insert_admin ON announcements
  FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- UPDATE: Author or admins
CREATE POLICY announcements_update_author_or_admin ON announcements
  FOR UPDATE
  USING (
    author_id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Author or super admin
CREATE POLICY announcements_delete_author_or_super_admin ON announcements
  FOR DELETE
  USING (
    author_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for volunteers table
-- Self-access and admin oversight
-- ============================================

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteers_select_all ON volunteers;
DROP POLICY IF EXISTS volunteers_select_self_or_admin ON volunteers;
DROP POLICY IF EXISTS volunteers_insert_self ON volunteers;
DROP POLICY IF EXISTS volunteers_update_self ON volunteers;
DROP POLICY IF EXISTS volunteers_delete_self_or_super_admin ON volunteers;

-- SELECT: Self or admins
CREATE POLICY volunteers_select_self_or_admin ON volunteers
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin', 'data_analyst'])
  );

-- INSERT: Only self
CREATE POLICY volunteers_insert_self ON volunteers
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()
  );

-- UPDATE: Only self
CREATE POLICY volunteers_update_self ON volunteers
  FOR UPDATE
  USING (
    user_id = get_current_user_id()
  );

-- DELETE: Self or super admin
CREATE POLICY volunteers_delete_self_or_super_admin ON volunteers
  FOR DELETE
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for volunteer_registrations table
-- Volunteers manage own registrations, admins approve
-- ============================================

ALTER TABLE volunteer_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_registrations_select_own ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_select_own_or_admin ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_insert_own ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_update_own_or_admin ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_delete_own_or_super_admin ON volunteer_registrations;

-- SELECT: Own registrations or admins
CREATE POLICY volunteer_registrations_select_own_or_admin ON volunteer_registrations
  FOR SELECT
  USING (
    volunteer_id IN (
      SELECT id FROM volunteers WHERE user_id = get_current_user_id()
    ) OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin', 'data_analyst'])
  );

-- INSERT: Own registrations only
CREATE POLICY volunteer_registrations_insert_own ON volunteer_registrations
  FOR INSERT
  WITH CHECK (
    volunteer_id IN (
      SELECT id FROM volunteers WHERE user_id = get_current_user_id()
    )
  );

-- UPDATE: Own pending registrations or admins
CREATE POLICY volunteer_registrations_update_own_or_admin ON volunteer_registrations
  FOR UPDATE
  USING (
    (
      volunteer_id IN (
        SELECT id FROM volunteers WHERE user_id = get_current_user_id()
      ) AND status = 'pending'
    ) OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Own pending registrations or super admin
CREATE POLICY volunteer_registrations_delete_own_or_super_admin ON volunteer_registrations
  FOR DELETE
  USING (
    (
      volunteer_id IN (
        SELECT id FROM volunteers WHERE user_id = get_current_user_id()
      ) AND status = 'pending'
    ) OR
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for supply_donations table
-- Public transparency with authenticated donations
-- ============================================

ALTER TABLE supply_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supply_donations_select_all ON supply_donations;
DROP POLICY IF EXISTS supply_donations_select_public ON supply_donations;
DROP POLICY IF EXISTS supply_donations_insert_authenticated ON supply_donations;
DROP POLICY IF EXISTS supply_donations_update_admin ON supply_donations;
DROP POLICY IF EXISTS supply_donations_delete_super_admin ON supply_donations;

-- SELECT: Everyone can view donations
CREATE POLICY supply_donations_select_public ON supply_donations
  FOR SELECT
  USING (true);

-- INSERT: Anyone authenticated
CREATE POLICY supply_donations_insert_authenticated ON supply_donations
  FOR INSERT
  WITH CHECK (
    get_current_user_id() IS NOT NULL
  );

-- UPDATE: Only coordinators
CREATE POLICY supply_donations_update_admin ON supply_donations
  FOR UPDATE
  USING (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Only super admins
CREATE POLICY supply_donations_delete_super_admin ON supply_donations
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for grid_discussions table
-- Public forum with author control
-- ============================================

ALTER TABLE grid_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grid_discussions_select_all ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_select_public ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_insert_authenticated ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_update_author ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_delete_author_or_super_admin ON grid_discussions;

-- SELECT: Everyone can view discussions
CREATE POLICY grid_discussions_select_public ON grid_discussions
  FOR SELECT
  USING (true);

-- INSERT: Authenticated users
CREATE POLICY grid_discussions_insert_authenticated ON grid_discussions
  FOR INSERT
  WITH CHECK (
    get_current_user_id() IS NOT NULL AND
    user_id = get_current_user_id()
  );

-- UPDATE: Only author
CREATE POLICY grid_discussions_update_author ON grid_discussions
  FOR UPDATE
  USING (
    user_id = get_current_user_id()
  );

-- DELETE: Author or super admin
CREATE POLICY grid_discussions_delete_author_or_super_admin ON grid_discussions
  FOR DELETE
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for Authentication Tables
-- otp_codes and login_history
-- ============================================

-- OTP_CODES Table
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS otp_codes_no_select ON otp_codes;
DROP POLICY IF EXISTS otp_codes_no_direct_insert ON otp_codes;
DROP POLICY IF EXISTS otp_codes_no_update ON otp_codes;
DROP POLICY IF EXISTS otp_codes_delete_super_admin ON otp_codes;

-- SELECT: No direct access
CREATE POLICY otp_codes_no_select ON otp_codes
  FOR SELECT
  USING (false);

-- INSERT: Only through auth functions
CREATE POLICY otp_codes_no_direct_insert ON otp_codes
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Only through auth functions
CREATE POLICY otp_codes_no_update ON otp_codes
  FOR UPDATE
  USING (false);

-- DELETE: Only super admin
CREATE POLICY otp_codes_delete_super_admin ON otp_codes
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- LOGIN_HISTORY Table
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS login_history_select_self_or_admin ON login_history;
DROP POLICY IF EXISTS login_history_no_direct_insert ON login_history;
DROP POLICY IF EXISTS login_history_no_update ON login_history;
DROP POLICY IF EXISTS login_history_delete_super_admin ON login_history;

-- SELECT: Self or admins
CREATE POLICY login_history_select_self_or_admin ON login_history
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin', 'regional_admin'])
  );

-- INSERT: Only through auth functions
CREATE POLICY login_history_no_direct_insert ON login_history
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: No updates (audit trail)
CREATE POLICY login_history_no_update ON login_history
  FOR UPDATE
  USING (false);

-- DELETE: Only super admin
CREATE POLICY login_history_delete_super_admin ON login_history
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- MODULE: RLS Policies for Permissions System
-- permissions, role_permissions, user_permissions
-- ============================================

-- PERMISSIONS Table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissions_select_all ON permissions;
DROP POLICY IF EXISTS permissions_modify_super_admin ON permissions;

-- SELECT: Everyone can view
CREATE POLICY permissions_select_all ON permissions
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Only super admin
CREATE POLICY permissions_modify_super_admin ON permissions
  FOR ALL
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ROLE_PERMISSIONS Table
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
DROP POLICY IF EXISTS role_permissions_modify_super_admin ON role_permissions;

-- SELECT: Everyone can view
CREATE POLICY role_permissions_select_all ON role_permissions
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Only super admin
CREATE POLICY role_permissions_modify_super_admin ON role_permissions
  FOR ALL
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- USER_PERMISSIONS Table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_permissions_select_self_or_admin ON user_permissions;
DROP POLICY IF EXISTS user_permissions_modify_super_admin ON user_permissions;

-- SELECT: Self or admins
CREATE POLICY user_permissions_select_self_or_admin ON user_permissions
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin', 'regional_admin'])
  );

-- INSERT/UPDATE/DELETE: Only super admin
CREATE POLICY user_permissions_modify_super_admin ON user_permissions
  FOR ALL
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- Step 3: Verify all tables have RLS enabled
-- ============================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users',
    'grids',
    'disaster_areas',
    'announcements',
    'volunteers',
    'volunteer_registrations',
    'supply_donations',
    'grid_discussions',
    'otp_codes',
    'login_history',
    'permissions',
    'role_permissions',
    'user_permissions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Enable RLS (idempotent)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    RAISE NOTICE 'RLS enabled for table: %', tbl;
  END LOOP;

  RAISE NOTICE 'Modular RLS policies applied successfully';
END $$;

-- ============================================
-- Step 4: Add table comments
-- ============================================

COMMENT ON TABLE users IS 'User accounts. Self-access for own data, admin access for management. RLS: modular_rls.sql';
COMMENT ON TABLE grids IS 'Grid system for disaster area management. Public read, admin write. RLS: modular_rls.sql';
COMMENT ON TABLE disaster_areas IS 'Disaster area definitions. Public read for safety, admin-only write. RLS: modular_rls.sql';
COMMENT ON TABLE announcements IS 'Public announcements. Published items visible to all, author + admin control. RLS: modular_rls.sql';
COMMENT ON TABLE volunteers IS 'Volunteer profiles. Users can manage own profile, admins can view all. RLS: modular_rls.sql';
COMMENT ON TABLE volunteer_registrations IS 'Volunteer grid registrations. Self-service with admin approval workflow. RLS: modular_rls.sql';
COMMENT ON TABLE supply_donations IS 'Supply donation tracking. Public transparency, authenticated donations. RLS: modular_rls.sql';
COMMENT ON TABLE grid_discussions IS 'Grid discussion forum. Public read, authenticated post, author edit/delete. RLS: modular_rls.sql';
COMMENT ON TABLE otp_codes IS 'One-time passwords. No direct access, managed through auth functions. RLS: modular_rls.sql';
COMMENT ON TABLE login_history IS 'Login audit trail. Immutable record, self-view + admin access. RLS: modular_rls.sql';
COMMENT ON TABLE permissions IS 'System permissions. Public read, super admin write. RLS: modular_rls.sql';
COMMENT ON TABLE role_permissions IS 'Role-permission mappings. Public read, super admin write. RLS: modular_rls.sql';
COMMENT ON TABLE user_permissions IS 'User-specific permissions. Self-view, super admin management. RLS: modular_rls.sql';

-- ============================================
-- End of Migration: Modular RLS
-- ============================================
