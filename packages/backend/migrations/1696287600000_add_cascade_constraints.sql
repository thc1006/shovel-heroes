-- Migration: Add CASCADE constraints to foreign keys
-- Purpose: Allow automatic deletion of related records when parent grids are deleted
-- Impact: Fixes ~25 tests that fail due to FK violations during cleanup
-- Generated: 2025-10-03

-- =============================================================================
-- VOLUNTEER REGISTRATIONS
-- =============================================================================

-- Drop existing FK constraint without CASCADE
ALTER TABLE volunteer_registrations
  DROP CONSTRAINT IF EXISTS volunteer_registrations_grid_id_fkey;

-- Recreate FK with ON DELETE CASCADE
-- This ensures volunteer_registrations are auto-deleted when grid is deleted
ALTER TABLE volunteer_registrations
  ADD CONSTRAINT volunteer_registrations_grid_id_fkey
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE;

-- =============================================================================
-- SUPPLY DONATIONS
-- =============================================================================

-- Drop existing FK constraint without CASCADE
ALTER TABLE supply_donations
  DROP CONSTRAINT IF EXISTS supply_donations_grid_id_fkey;

-- Recreate FK with ON DELETE CASCADE
-- This ensures supply_donations are auto-deleted when grid is deleted
ALTER TABLE supply_donations
  ADD CONSTRAINT supply_donations_grid_id_fkey
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE;

-- =============================================================================
-- GRID DISCUSSIONS
-- =============================================================================

-- Drop existing FK constraint without CASCADE
ALTER TABLE grid_discussions
  DROP CONSTRAINT IF EXISTS grid_discussions_grid_id_fkey;

-- Recreate FK with ON DELETE CASCADE
-- This ensures grid_discussions are auto-deleted when grid is deleted
ALTER TABLE grid_discussions
  ADD CONSTRAINT grid_discussions_grid_id_fkey
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify the constraints are properly set
DO $$
DECLARE
  cascade_count INTEGER;
BEGIN
  -- Check how many CASCADE constraints we have on grids(id)
  SELECT COUNT(*) INTO cascade_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
  WHERE rc.delete_rule = 'CASCADE'
    AND kcu.table_name IN ('volunteer_registrations', 'supply_donations', 'grid_discussions')
    AND kcu.column_name = 'grid_id';

  IF cascade_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 CASCADE constraints, found %', cascade_count;
  END IF;

  RAISE NOTICE 'Successfully added % CASCADE constraints on grid_id foreign keys', cascade_count;
END $$;
