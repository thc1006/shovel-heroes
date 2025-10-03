-- ============================================
-- RLS Policies: supply_donations table
-- Public transparency with authenticated donations
-- ============================================

-- Enable RLS
ALTER TABLE supply_donations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS supply_donations_select_all ON supply_donations;
DROP POLICY IF EXISTS supply_donations_select_public ON supply_donations;
DROP POLICY IF EXISTS supply_donations_insert_authenticated ON supply_donations;
DROP POLICY IF EXISTS supply_donations_update_admin ON supply_donations;
DROP POLICY IF EXISTS supply_donations_delete_super_admin ON supply_donations;

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

-- UPDATE: Only coordinators can update (for status management)
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

COMMENT ON TABLE supply_donations IS 'Supply donation tracking. Public transparency, authenticated donations.';
