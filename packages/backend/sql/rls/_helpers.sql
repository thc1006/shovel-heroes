-- ============================================
-- RLS Helper Functions
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
