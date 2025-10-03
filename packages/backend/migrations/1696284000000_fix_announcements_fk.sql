-- Migration: Fix announcements.author_id foreign key constraint
-- Purpose: Change ON DELETE RESTRICT to ON DELETE SET NULL to prevent test failures
-- Issue: When tests delete users, announcements with that author_id cause FK violations
-- Generated: 2025-10-03

-- UP MIGRATION
-- Drop the existing foreign key constraint
ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_author_id_fkey;

-- Ensure author_id column allows NULL (it should already, but make it explicit)
ALTER TABLE announcements
  ALTER COLUMN author_id DROP NOT NULL;

-- Recreate the foreign key constraint with ON DELETE SET NULL
-- This allows announcements to remain when their author is deleted
ALTER TABLE announcements
  ADD CONSTRAINT announcements_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Add a comment to document the behavior
COMMENT ON CONSTRAINT announcements_author_id_fkey ON announcements IS
  'FK to users table with ON DELETE SET NULL - announcements remain when author is deleted';

-- DOWN MIGRATION (commented out, uncomment to rollback)
-- ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_author_id_fkey;
-- ALTER TABLE announcements ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id);
