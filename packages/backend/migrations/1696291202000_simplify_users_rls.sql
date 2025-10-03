-- Migration: Simplify Users RLS Policy
-- Timestamp: 1696291202000
-- Created: 2025-10-03
-- Description: Make users table readable by helper functions to avoid circular dependency

-- The core issue: SECURITY DEFINER functions in PostgreSQL still respect RLS
-- unless the function is owned by a role with BYPASSRLS attribute.
--
-- Solution: Make the users SELECT policy allow reading by anyone who has
-- app.user_id set (authenticated), so helper functions can read user roles.

-- ============================================
-- Simplify Users SELECT Policy
-- ============================================

DROP POLICY IF EXISTS users_select_self_or_admin ON users;

-- SELECT: Allow all authenticated users to view basic user info
-- This is necessary so user_has_role() can query the users table
-- More restrictive policies can be added for sensitive columns using column-level RLS
CREATE POLICY users_select_authenticated ON users
  FOR SELECT
  USING (
    -- Anyone with app.user_id set can read users table
    -- This allows user_has_role() to work
    get_current_user_id() IS NOT NULL
  );

COMMENT ON POLICY users_select_authenticated ON users IS
  'Authenticated users can view user records. Required for user_has_role() to function. Consider column-level RLS for sensitive data.';

-- Note: If you need to restrict which users can see other users,
-- implement that at the application/route level, not RLS,
-- OR use column-level RLS to hide sensitive fields like password_hash, etc.
