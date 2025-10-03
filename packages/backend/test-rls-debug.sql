-- Test RLS helper functions directly
-- This script should be run in the test database

-- 1. Create a test user with role
INSERT INTO users (id, display_name, email, role, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Coordinator', 'coord@test.com', 'ngo_coordinator', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Test the user_has_role function WITHOUT RLS context
SELECT user_has_role(ARRAY['ngo_coordinator']) AS should_be_false_no_context;

-- 3. Set app.user_id and test again
SET LOCAL app.user_id = '11111111-1111-1111-1111-111111111111';
SELECT user_has_role(ARRAY['ngo_coordinator']) AS should_be_true_with_context;
SELECT user_has_role(ARRAY['volunteer']) AS should_be_false_wrong_role;
SELECT get_current_user_id() AS current_user_should_match;

-- 4. Try to insert a grid
INSERT INTO grids (area_id, name, code, status)
VALUES ('test-area', 'RLS Test Grid', 'RLSTEST', 'open')
RETURNING id, name, code;

-- 5. Check policies on grids table
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'grids'
ORDER BY policyname;
