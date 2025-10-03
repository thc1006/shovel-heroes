-- ============================================
-- RLS Policies: users table
-- Self-access and admin management
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
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

-- INSERT: Only through authentication system (no direct user inserts)
-- Registration happens through SECURITY DEFINER functions
CREATE POLICY users_insert_system ON users
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update own profile fields (except role/status)
-- Admins can update any user
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (
    id = get_current_user_id() OR
    user_has_role(ARRAY['regional_admin', 'super_admin'])
  );

-- DELETE: Only super admins can delete users
CREATE POLICY users_delete_super_admin ON users
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

COMMENT ON TABLE users IS 'User accounts. Self-access for own data, admin access for management.';
