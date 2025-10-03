-- ============================================
-- RLS Policies: grids table
-- Public map data with admin-only modifications
-- ============================================

-- Enable RLS
ALTER TABLE grids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS grids_select_all ON grids;
DROP POLICY IF EXISTS grids_select_public ON grids;
DROP POLICY IF EXISTS grids_insert_admin ON grids;
DROP POLICY IF EXISTS grids_update_admin ON grids;
DROP POLICY IF EXISTS grids_delete_super_admin ON grids;

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

COMMENT ON TABLE grids IS 'Grid system for disaster area management. Public read, admin write.';
