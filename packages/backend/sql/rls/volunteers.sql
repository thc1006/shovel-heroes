-- ============================================
-- RLS Policies: volunteers table
-- Self-access and admin oversight
-- ============================================

-- Enable RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS volunteers_select_all ON volunteers;
DROP POLICY IF EXISTS volunteers_select_self_or_admin ON volunteers;
DROP POLICY IF EXISTS volunteers_insert_self ON volunteers;
DROP POLICY IF EXISTS volunteers_update_self ON volunteers;
DROP POLICY IF EXISTS volunteers_delete_self_or_super_admin ON volunteers;

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

COMMENT ON TABLE volunteers IS 'Volunteer profiles. Users can manage own profile, admins can view all.';
