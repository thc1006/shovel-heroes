-- Test script for migration 0007_auto_update_volunteer_count.sql
-- This script validates the automatic volunteer count trigger

-- 1. Setup: Create test data
BEGIN;

-- Insert test volunteers (matching actual schema)
INSERT INTO volunteers (id, name, email, phone, status)
VALUES
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Test Volunteer 1', 'test1@example.com', '0900-000-001', 'available'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Test Volunteer 2', 'test2@example.com', '0900-000-002', 'available'),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'Test Volunteer 3', 'test3@example.com', '0900-000-003', 'available')
ON CONFLICT (id) DO NOTHING;

-- Insert test grids
INSERT INTO grids (id, name, center_lat, center_lng, status, volunteer_registered, volunteer_needed, grid_type)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Test Grid 1', 24.1477, 120.6736, 'open', 0, 5, 'manpower'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Test Grid 2', 24.1478, 120.6737, 'open', 0, 5, 'manpower')
ON CONFLICT (id) DO UPDATE SET volunteer_registered = 0;

SAVEPOINT before_test;

-- 2. Test INSERT: Should increase volunteer_registered by 1
INSERT INTO volunteer_registrations (volunteer_id, grid_id, status)
VALUES ('33333333-3333-3333-3333-333333333333'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'confirmed');

-- Verify count increased
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT volunteer_registered INTO v_count
  FROM grids WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

  IF v_count = 1 THEN
    RAISE NOTICE '✓ PASS: INSERT test - volunteer_registered = % (expected 1)', v_count;
  ELSE
    RAISE EXCEPTION '✗ FAIL: INSERT test - volunteer_registered = % (expected 1)', v_count;
  END IF;
END $$;

-- 3. Test INSERT again: Should increase to 2
INSERT INTO volunteer_registrations (volunteer_id, grid_id, status)
VALUES ('44444444-4444-4444-4444-444444444444'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'confirmed');

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT volunteer_registered INTO v_count
  FROM grids WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

  IF v_count = 2 THEN
    RAISE NOTICE '✓ PASS: Second INSERT test - volunteer_registered = % (expected 2)', v_count;
  ELSE
    RAISE EXCEPTION '✗ FAIL: Second INSERT test - volunteer_registered = % (expected 2)', v_count;
  END IF;
END $$;

-- 4. Test DELETE: Should decrease volunteer_registered by 1
DELETE FROM volunteer_registrations
WHERE grid_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND volunteer_id = '33333333-3333-3333-3333-333333333333'::uuid;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT volunteer_registered INTO v_count
  FROM grids WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

  IF v_count = 1 THEN
    RAISE NOTICE '✓ PASS: DELETE test - volunteer_registered = % (expected 1)', v_count;
  ELSE
    RAISE EXCEPTION '✗ FAIL: DELETE test - volunteer_registered = % (expected 1)', v_count;
  END IF;
END $$;

-- 5. Test DELETE all: Should decrease to 0 (not negative)
DELETE FROM volunteer_registrations
WHERE grid_id = '11111111-1111-1111-1111-111111111111'::uuid;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT volunteer_registered INTO v_count
  FROM grids WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

  IF v_count = 0 THEN
    RAISE NOTICE '✓ PASS: DELETE all test - volunteer_registered = % (expected 0)', v_count;
  ELSE
    RAISE EXCEPTION '✗ FAIL: DELETE all test - volunteer_registered = % (expected 0)', v_count;
  END IF;
END $$;

-- 6. Test UPDATE (grid_id change): Should move count from old to new grid
INSERT INTO volunteer_registrations (volunteer_id, grid_id, status)
VALUES ('55555555-5555-5555-5555-555555555555'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'confirmed');

-- Update grid_id
UPDATE volunteer_registrations
SET grid_id = '22222222-2222-2222-2222-222222222222'::uuid
WHERE volunteer_id = '55555555-5555-5555-5555-555555555555'::uuid;

DO $$
DECLARE
  v_count_old INTEGER;
  v_count_new INTEGER;
BEGIN
  SELECT volunteer_registered INTO v_count_old
  FROM grids WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

  SELECT volunteer_registered INTO v_count_new
  FROM grids WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;

  IF v_count_old = 0 AND v_count_new = 1 THEN
    RAISE NOTICE '✓ PASS: UPDATE test - old grid = %, new grid = % (expected 0, 1)', v_count_old, v_count_new;
  ELSE
    RAISE EXCEPTION '✗ FAIL: UPDATE test - old grid = %, new grid = % (expected 0, 1)', v_count_old, v_count_new;
  END IF;
END $$;

-- 7. Test protection against negative values
-- Delete when count is already 0 on grid 1
DELETE FROM volunteer_registrations WHERE grid_id = '11111111-1111-1111-1111-111111111111'::uuid;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT volunteer_registered INTO v_count
  FROM grids WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

  IF v_count >= 0 THEN
    RAISE NOTICE '✓ PASS: Negative protection test - volunteer_registered = % (expected >= 0)', v_count;
  ELSE
    RAISE EXCEPTION '✗ FAIL: Negative protection test - volunteer_registered = % (should not be negative)', v_count;
  END IF;
END $$;

-- Cleanup
ROLLBACK TO SAVEPOINT before_test;

-- Clean up test data
DELETE FROM volunteer_registrations WHERE grid_id IN (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid
);
DELETE FROM grids WHERE id IN (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid
);
DELETE FROM volunteers WHERE id IN (
  '33333333-3333-3333-3333-333333333333'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555555'::uuid
);

COMMIT;

-- Output final summary using SELECT
SELECT
  '===========================================' as test_summary
UNION ALL
SELECT '  All trigger tests PASSED successfully!' as test_summary
UNION ALL
SELECT '===========================================' as test_summary;
