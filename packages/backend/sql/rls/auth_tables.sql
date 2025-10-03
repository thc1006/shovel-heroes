-- ============================================
-- RLS Policies: Authentication Tables
-- otp_codes and login_history
-- Strict access control for security
-- ============================================

-- ============================================
-- 1. OTP_CODES Table Policies
-- ============================================
-- OTP codes should have strict access control to prevent abuse

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS otp_codes_no_select ON otp_codes;
DROP POLICY IF EXISTS otp_codes_no_direct_insert ON otp_codes;
DROP POLICY IF EXISTS otp_codes_no_update ON otp_codes;
DROP POLICY IF EXISTS otp_codes_delete_super_admin ON otp_codes;

-- SELECT: No direct user access (only through SECURITY DEFINER functions)
CREATE POLICY otp_codes_no_select ON otp_codes
  FOR SELECT
  USING (false);

-- INSERT: Only through authentication system
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

COMMENT ON TABLE otp_codes IS 'One-time passwords. No direct access, managed through auth functions.';

-- ============================================
-- 2. LOGIN_HISTORY Table Policies
-- ============================================
-- Audit trail with self-access and admin oversight

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS login_history_select_self_or_admin ON login_history;
DROP POLICY IF EXISTS login_history_no_direct_insert ON login_history;
DROP POLICY IF EXISTS login_history_no_update ON login_history;
DROP POLICY IF EXISTS login_history_delete_super_admin ON login_history;

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

-- UPDATE: No updates allowed (audit trail)
CREATE POLICY login_history_no_update ON login_history
  FOR UPDATE
  USING (false);

-- DELETE: Only super admin for data retention
CREATE POLICY login_history_delete_super_admin ON login_history
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

COMMENT ON TABLE login_history IS 'Login audit trail. Immutable record, self-view + admin access.';
