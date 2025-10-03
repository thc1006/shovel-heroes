-- Migration: Fix volunteers.user_id foreign key to CASCADE on DELETE
-- This resolves test failures where deleting users doesn't cascade to volunteers

-- Drop existing constraint
ALTER TABLE volunteers DROP CONSTRAINT IF EXISTS volunteers_user_id_fkey;

-- Add constraint with CASCADE
ALTER TABLE volunteers ADD CONSTRAINT volunteers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
