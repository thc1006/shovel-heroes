-- Migration: Fix all CASCADE and SET NULL constraints
-- Purpose: Comprehensive fix for all FK constraint issues blocking tests
-- Impact: Should fix remaining ~135 failing tests
-- Generated: 2025-10-03

-- =============================================================================
-- VOLUNTEER_REGISTRATIONS.VOLUNTEER_ID → VOLUNTEERS.ID
-- When a volunteer is deleted, their registrations should also be deleted
-- =============================================================================

ALTER TABLE volunteer_registrations
  DROP CONSTRAINT IF EXISTS volunteer_registrations_volunteer_id_fkey;

ALTER TABLE volunteer_registrations
  ADD CONSTRAINT volunteer_registrations_volunteer_id_fkey
  FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE;

-- =============================================================================
-- VOLUNTEERS.USER_ID → USERS.ID
-- When a user is deleted, keep the volunteer record but clear the user_id
-- This preserves historical volunteer data
-- =============================================================================

ALTER TABLE volunteers
  DROP CONSTRAINT IF EXISTS volunteers_user_id_fkey;

ALTER TABLE volunteers
  ADD CONSTRAINT volunteers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- VOLUNTEER_REGISTRATIONS.DISASTER_AREA_ID → DISASTER_AREAS.ID
-- When a disaster area is deleted, keep registrations but clear the reference
-- =============================================================================

ALTER TABLE volunteer_registrations
  DROP CONSTRAINT IF EXISTS volunteer_registrations_disaster_area_id_fkey;

ALTER TABLE volunteer_registrations
  ADD CONSTRAINT volunteer_registrations_disaster_area_id_fkey
  FOREIGN KEY (disaster_area_id) REFERENCES disaster_areas(id) ON DELETE SET NULL;

-- =============================================================================
-- SUPPLY_DONATIONS.DISASTER_AREA_ID → DISASTER_AREAS.ID
-- When a disaster area is deleted, keep donations but clear the reference
-- =============================================================================

ALTER TABLE supply_donations
  DROP CONSTRAINT IF EXISTS supply_donations_disaster_area_id_fkey;

ALTER TABLE supply_donations
  ADD CONSTRAINT supply_donations_disaster_area_id_fkey
  FOREIGN KEY (disaster_area_id) REFERENCES disaster_areas(id) ON DELETE SET NULL;

-- =============================================================================
-- GRID_DISCUSSIONS.USER_ID → USERS.ID
-- When a user is deleted, keep discussions but clear the author
-- =============================================================================

ALTER TABLE grid_discussions
  DROP CONSTRAINT IF EXISTS grid_discussions_user_id_fkey;

ALTER TABLE grid_discussions
  ADD CONSTRAINT grid_discussions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- GRID_DISCUSSIONS.PARENT_ID → GRID_DISCUSSIONS.ID
-- When a parent discussion is deleted, delete all child discussions (thread)
-- =============================================================================

ALTER TABLE grid_discussions
  DROP CONSTRAINT IF EXISTS grid_discussions_parent_id_fkey;

ALTER TABLE grid_discussions
  ADD CONSTRAINT grid_discussions_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES grid_discussions(id) ON DELETE CASCADE;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  cascade_count INTEGER;
  set_null_count INTEGER;
BEGIN
  -- Count CASCADE constraints
  SELECT COUNT(*) INTO cascade_count
  FROM information_schema.referential_constraints
  WHERE delete_rule = 'CASCADE'
    AND constraint_name IN (
      'volunteer_registrations_grid_id_fkey',
      'volunteer_registrations_volunteer_id_fkey',
      'supply_donations_grid_id_fkey',
      'grid_discussions_grid_id_fkey',
      'grid_discussions_parent_id_fkey'
    );

  -- Count SET NULL constraints
  SELECT COUNT(*) INTO set_null_count
  FROM information_schema.referential_constraints
  WHERE delete_rule = 'SET NULL'
    AND constraint_name IN (
      'volunteers_user_id_fkey',
      'volunteer_registrations_disaster_area_id_fkey',
      'supply_donations_disaster_area_id_fkey',
      'grid_discussions_user_id_fkey',
      'grid_manager_id_fkey',
      'announcements_author_id_fkey'
    );

  RAISE NOTICE 'CASCADE constraints: %', cascade_count;
  RAISE NOTICE 'SET NULL constraints: %', set_null_count;

  IF cascade_count < 5 THEN
    RAISE WARNING 'Expected at least 5 CASCADE constraints, found %', cascade_count;
  END IF;

  IF set_null_count < 4 THEN
    RAISE WARNING 'Expected at least 4 SET NULL constraints, found %', set_null_count;
  END IF;
END $$;
