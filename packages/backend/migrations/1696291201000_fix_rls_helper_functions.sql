-- Migration: Fix RLS Helper Functions to Bypass RLS
-- Timestamp: 1696291201000
-- Created: 2025-10-03
-- Description: Fix circular dependency in user_has_role() by ensuring it bypasses RLS

-- The issue: user_has_role() queries the users table, but the users table
-- has RLS policies that call user_has_role(), creating a circular dependency.
--
-- Solution: Ensure helper functions use SECURITY DEFINER with SET search_path
-- to bypass RLS when querying internal tables.

-- ============================================
-- Fix user_has_role function to bypass RLS
-- ============================================

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

  -- Get user role - this query bypasses RLS because function is SECURITY DEFINER
  SELECT role INTO current_user_role
  FROM users
  WHERE id = current_user_id;

  -- Check if user role is in required roles
  RETURN current_user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   STABLE
   SET search_path = public, pg_catalog;

-- Grant execute to public
GRANT EXECUTE ON FUNCTION user_has_role(TEXT[]) TO PUBLIC;

-- Add comment explaining the SECURITY DEFINER bypass
COMMENT ON FUNCTION user_has_role IS
  'Check if current user has one of the specified roles. SECURITY DEFINER ensures it bypasses RLS on users table.';

-- ============================================
-- Verify get_current_user_id() is also secure
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.user_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   STABLE
   SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION get_current_user_id() TO PUBLIC;

-- ============================================
-- Fix is_admin() function
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin']);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   STABLE
   SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION is_admin() TO PUBLIC;

-- ============================================
-- Fix is_grid_manager() function
-- ============================================

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

  -- This query bypasses RLS because function is SECURITY DEFINER
  SELECT grid_manager_id INTO manager_id
  FROM grids
  WHERE id = grid_id_param;

  RETURN manager_id = current_user_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   STABLE
   SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION is_grid_manager(UUID) TO PUBLIC;

COMMENT ON FUNCTION is_grid_manager IS
  'Check if current user is the manager of a specific grid. SECURITY DEFINER bypasses RLS.';
