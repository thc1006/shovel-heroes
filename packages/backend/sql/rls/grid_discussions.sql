-- ============================================
-- RLS Policies: grid_discussions table
-- Public forum with author control
-- ============================================

-- Enable RLS
ALTER TABLE grid_discussions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS grid_discussions_select_all ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_select_public ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_insert_authenticated ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_update_author ON grid_discussions;
DROP POLICY IF EXISTS grid_discussions_delete_author_or_super_admin ON grid_discussions;

-- SELECT: Everyone can view discussions (public forum)
CREATE POLICY grid_discussions_select_public ON grid_discussions
  FOR SELECT
  USING (true);

-- INSERT: Anyone authenticated can post (must match their user_id)
CREATE POLICY grid_discussions_insert_authenticated ON grid_discussions
  FOR INSERT
  WITH CHECK (
    get_current_user_id() IS NOT NULL AND
    user_id = get_current_user_id()
  );

-- UPDATE: Only author can update own messages
CREATE POLICY grid_discussions_update_author ON grid_discussions
  FOR UPDATE
  USING (
    user_id = get_current_user_id()
  );

-- DELETE: Author or super admin
CREATE POLICY grid_discussions_delete_author_or_super_admin ON grid_discussions
  FOR DELETE
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

COMMENT ON TABLE grid_discussions IS 'Grid discussion forum. Public read, authenticated post, author edit/delete.';
