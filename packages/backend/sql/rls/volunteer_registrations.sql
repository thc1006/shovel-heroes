-- ============================================
-- RLS Policies: volunteer_registrations table
-- Volunteers manage own registrations, admins approve
-- ============================================

-- Enable RLS
ALTER TABLE volunteer_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS volunteer_registrations_select_own ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_select_own_or_admin ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_insert_own ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_update_own_or_admin ON volunteer_registrations;
DROP POLICY IF EXISTS volunteer_registrations_delete_own_or_super_admin ON volunteer_registrations;

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

COMMENT ON TABLE volunteer_registrations IS 'Volunteer grid registrations. Self-service with admin approval workflow.';
