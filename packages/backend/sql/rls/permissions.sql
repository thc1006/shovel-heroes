-- ============================================
-- RLS Policies: Permissions System
-- permissions, role_permissions, user_permissions
-- ============================================

-- ============================================
-- 1. PERMISSIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS permissions_select_all ON permissions;
DROP POLICY IF EXISTS permissions_modify_super_admin ON permissions;

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

COMMENT ON TABLE permissions IS 'System permissions. Public read, super admin write.';

-- ============================================
-- 2. ROLE_PERMISSIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
DROP POLICY IF EXISTS role_permissions_modify_super_admin ON role_permissions;

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

COMMENT ON TABLE role_permissions IS 'Role-permission mappings. Public read, super admin write.';

-- ============================================
-- 3. USER_PERMISSIONS Table Policies
-- ============================================

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS user_permissions_select_self_or_admin ON user_permissions;
DROP POLICY IF EXISTS user_permissions_modify_super_admin ON user_permissions;

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

COMMENT ON TABLE user_permissions IS 'User-specific permissions. Self-view, super admin management.';
