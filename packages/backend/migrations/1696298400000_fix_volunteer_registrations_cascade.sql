-- Migration: Fix volunteer_registrations.volunteer_id CASCADE constraint
-- Target: Fix 30 test failures related to volunteer deletion
-- Created: 2025-10-03

-- Drop existing foreign key constraint without CASCADE
ALTER TABLE volunteer_registrations
DROP CONSTRAINT IF EXISTS volunteer_registrations_volunteer_id_fkey;

-- Add foreign key constraint WITH CASCADE
ALTER TABLE volunteer_registrations
ADD CONSTRAINT volunteer_registrations_volunteer_id_fkey
  FOREIGN KEY (volunteer_id)
  REFERENCES volunteers(id)
  ON DELETE CASCADE;

-- Verify constraint was created correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'volunteer_registrations'
      AND tc.constraint_name = 'volunteer_registrations_volunteer_id_fkey'
      AND rc.delete_rule = 'CASCADE'
  ) THEN
    RAISE EXCEPTION 'CASCADE constraint not properly created on volunteer_registrations.volunteer_id';
  END IF;
END $$;
