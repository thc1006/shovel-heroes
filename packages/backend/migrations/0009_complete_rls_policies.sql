-- ============================================
-- Migration 0009: Comprehensive RLS Policies
-- Created: 2025-10-02
-- Description: Complete Row-Level Security policies for all tables
-- ============================================
--
-- This migration establishes comprehensive RLS policies across all tables
-- following role-based access control principles:
--   - volunteer: Basic user with task access
--   - victim: Request help and view own data
--   - ngo_coordinator: Manage volunteers and tasks
--   - regional_admin: Regional oversight and management
--   - data_analyst: Read-only analytics access
--   - super_admin: Full system access
-- ============================================

-- ============================================
-- Helper Functions
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

-- ============================================
-- 1. GRIDS Table Policies
-- ============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS grids_select_all ON grids;

-- Enable RLS
ALTER TABLE grids ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can view grids (public map data)
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
-- 2. ANNOUNCEMENTS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS announcements_select_published ON announcements;

-- SELECT: Everyone can view published announcements
CREATE POLICY announcements_select_public ON announcements
  FOR SELECT
  USING (published = true OR is_admin());

-- INSERT: Only coordinators and admins can create
CREATE POLICY announcements_insert_admin ON announcements
  FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- UPDATE: Author or admins can update
CREATE POLICY announcements_update_author_or_admin ON announcements
  FOR UPDATE
  USING (
    author_id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Author or super admin can delete
CREATE POLICY announcements_delete_author_or_super_admin ON announcements
  FOR DELETE
  USING (
    author_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- 3. VOLUNTEERS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS volunteers_select_all ON volunteers;

-- SELECT: Self or coordinators/admins
CREATE POLICY volunteers_select_self_or_admin ON volunteers
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin', 'data_analyst'])
  );

-- INSERT: Only self (authenticated users can register as volunteers)
CREATE POLICY volunteers_insert_self ON volunteers
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()
  );

-- UPDATE: Only self can update own profile
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
-- 4. VOLUNTEER_REGISTRATIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE volunteer_registrations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS volunteer_registrations_select_own ON volunteer_registrations;

-- SELECT: Volunteer (own registrations) or coordinators
CREATE POLICY volunteer_registrations_select_own_or_admin ON volunteer_registrations
  FOR SELECT
  USING (
    volunteer_id IN (
      SELECT id FROM volunteers WHERE user_id = get_current_user_id()
    ) OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin', 'data_analyst'])
  );

-- INSERT: Volunteers can register themselves
CREATE POLICY volunteer_registrations_insert_own ON volunteer_registrations
  FOR INSERT
  WITH CHECK (
    volunteer_id IN (
      SELECT id FROM volunteers WHERE user_id = get_current_user_id()
    )
  );

-- UPDATE: Volunteer (own, if pending) or coordinators (to approve/reject)
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

-- DELETE: Volunteer (own pending registrations) or super admin
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
-- 5. DISASTER_AREAS Table Policies
-- ============================================

-- Enable RLS (already enabled in 0004, but ensure it)
ALTER TABLE disaster_areas ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS disaster_areas_select_all ON disaster_areas;

-- SELECT: Everyone can view disaster areas (public safety info)
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
-- 6. SUPPLY_DONATIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE supply_donations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS supply_donations_select_all ON supply_donations;

-- SELECT: Everyone can view donations (public transparency)
CREATE POLICY supply_donations_select_public ON supply_donations
  FOR SELECT
  USING (true);

-- INSERT: Anyone authenticated can donate
CREATE POLICY supply_donations_insert_authenticated ON supply_donations
  FOR INSERT
  WITH CHECK (
    get_current_user_id() IS NOT NULL
  );

-- UPDATE: Creator (via donor_contact matching user email) or coordinators
-- Note: This is a simplified check. In production, you'd track creator_id separately
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
-- 7. GRID_DISCUSSIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE grid_discussions ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS grid_discussions_select_all ON grid_discussions;

-- SELECT: Everyone can view discussions (public forum)
CREATE POLICY grid_discussions_select_public ON grid_discussions
  FOR SELECT
  USING (true);

-- INSERT: Anyone authenticated can post
CREATE POLICY grid_discussions_insert_authenticated ON grid_discussions
  FOR INSERT
  WITH CHECK (
    get_current_user_id() IS NOT NULL AND
    user_id = get_current_user_id()
  );

-- UPDATE: Only author can update own messages
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
-- 8. OTP_CODES Table Policies
-- ============================================
-- OTP codes should have strict access control

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- SELECT: Only system (no direct user access)
-- This prevents users from reading OTP codes directly
CREATE POLICY otp_codes_no_select ON otp_codes
  FOR SELECT
  USING (false);

-- INSERT: Only through authentication system
-- In practice, this will be handled by SECURITY DEFINER functions
CREATE POLICY otp_codes_no_direct_insert ON otp_codes
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Only through authentication system
CREATE POLICY otp_codes_no_update ON otp_codes
  FOR UPDATE
  USING (false);

-- DELETE: Only super admin for cleanup
CREATE POLICY otp_codes_delete_super_admin ON otp_codes
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- 9. LOGIN_HISTORY Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view own login history, admins can view all
CREATE POLICY login_history_select_self_or_admin ON login_history
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin', 'regional_admin'])
  );

-- INSERT: Only through authentication system (SECURITY DEFINER functions)
CREATE POLICY login_history_no_direct_insert ON login_history
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: No updates allowed
CREATE POLICY login_history_no_update ON login_history
  FOR UPDATE
  USING (false);

-- DELETE: Only super admin for data retention
CREATE POLICY login_history_delete_super_admin ON login_history
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- 10. PERMISSIONS and ROLE_PERMISSIONS Tables
-- ============================================

-- Enable RLS on permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can view available permissions
CREATE POLICY permissions_select_all ON permissions
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Only super admin
CREATE POLICY permissions_modify_super_admin ON permissions
  FOR ALL
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- Enable RLS on role_permissions table
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can view role permissions mapping
CREATE POLICY role_permissions_select_all ON role_permissions
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Only super admin
CREATE POLICY role_permissions_modify_super_admin ON role_permissions
  FOR ALL
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- 11. USER_PERMISSIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view own permissions, admins can view all
CREATE POLICY user_permissions_select_self_or_admin ON user_permissions
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin', 'regional_admin'])
  );

-- INSERT/UPDATE/DELETE: Only super admin can manage user permissions
CREATE POLICY user_permissions_modify_super_admin ON user_permissions
  FOR ALL
  USING (
    user_has_role(ARRAY['super_admin'])
  );

-- ============================================
-- End of Migration 0009
-- ============================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION user_has_role(TEXT[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO PUBLIC;

-- Create index on users.role for faster role checks
CREATE INDEX IF NOT EXISTS idx_users_role_lookup ON users(role) WHERE role IS NOT NULL;

-- Add comment documenting the RLS policy structure
COMMENT ON FUNCTION user_has_role IS 'Check if current user has one of the specified roles. Used in RLS policies.';
COMMENT ON FUNCTION get_current_user_id IS 'Safely get current user ID from app.user_id session variable.';
COMMENT ON FUNCTION is_admin IS 'Check if current user is an admin (coordinator or above).';
