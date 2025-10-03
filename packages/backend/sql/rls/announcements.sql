-- ============================================
-- RLS Policies: announcements table
-- Public announcements with author/admin control
-- ============================================

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS announcements_select_published ON announcements;
DROP POLICY IF EXISTS announcements_select_public ON announcements;
DROP POLICY IF EXISTS announcements_insert_admin ON announcements;
DROP POLICY IF EXISTS announcements_update_author_or_admin ON announcements;
DROP POLICY IF EXISTS announcements_delete_author_or_super_admin ON announcements;

-- SELECT: Everyone can view published announcements, admins can view all
CREATE POLICY announcements_select_public ON announcements
  FOR SELECT
  USING (published = true OR is_admin());

-- INSERT: Only coordinators and admins can create
CREATE POLICY announcements_insert_admin ON announcements
  FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- UPDATE: Author or admins can update
CREATE POLICY announcements_update_author_or_admin ON announcements
  FOR UPDATE
  USING (
    author_id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Author or super admin can delete
CREATE POLICY announcements_delete_author_or_super_admin ON announcements
  FOR DELETE
  USING (
    author_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

COMMENT ON TABLE announcements IS 'Public announcements. Published items visible to all, author + admin control.';
