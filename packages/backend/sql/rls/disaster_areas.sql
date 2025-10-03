-- ============================================
-- RLS Policies: disaster_areas table
-- Public safety information with admin control
-- ============================================

-- Enable RLS
ALTER TABLE disaster_areas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS disaster_areas_select_all ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_select_public ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_insert_admin ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_update_admin ON disaster_areas;
DROP POLICY IF EXISTS disaster_areas_delete_super_admin ON disaster_areas;

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

COMMENT ON TABLE disaster_areas IS 'Disaster area definitions. Public read for safety, admin-only write.';
