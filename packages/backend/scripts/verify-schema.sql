-- Schema Verification Script
-- This script verifies the database schema matches OpenAPI specification
-- Run this after migrations to ensure everything is correct

-- ============================================================================
-- TABLE EXISTENCE CHECK
-- ============================================================================
DO $$
DECLARE
  missing_tables TEXT[];
  required_tables TEXT[] := ARRAY[
    'users',
    'disaster_areas',
    'grids',
    'volunteer_registrations',
    'supply_donations',
    'grid_discussions',
    'announcements',
    'audit_log'
  ];
  tbl TEXT;
BEGIN
  RAISE NOTICE '=== Checking Table Existence ===';

  FOREACH tbl IN ARRAY required_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      missing_tables := array_append(missing_tables, tbl);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✓ All required tables exist';
  END IF;
END $$;

-- ============================================================================
-- RLS ENABLED CHECK
-- ============================================================================
DO $$
DECLARE
  tables_without_rls TEXT[];
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Row Level Security ===';

  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND rowsecurity = false
  LOOP
    tables_without_rls := array_append(tables_without_rls, rec.tablename);
  END LOOP;

  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE WARNING 'Tables without RLS: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE '✓ All tables have RLS enabled';
  END IF;
END $$;

-- ============================================================================
-- POLICY CHECK
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking RLS Policies ===';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No RLS policies found!';
  ELSE
    RAISE NOTICE '✓ Found % RLS policies', policy_count;
  END IF;
END $$;

-- ============================================================================
-- TRIGGER CHECK
-- ============================================================================
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Triggers ===';

  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public';

  IF trigger_count < 10 THEN
    RAISE WARNING 'Expected at least 10 triggers, found %', trigger_count;
  ELSE
    RAISE NOTICE '✓ Found % triggers', trigger_count;
  END IF;
END $$;

-- ============================================================================
-- COLUMN EXISTENCE CHECK
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Critical Columns ===';

  -- Users table
  PERFORM column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name IN ('id', 'name', 'email', 'phone');
  IF NOT FOUND THEN RAISE EXCEPTION 'users table missing required columns'; END IF;
  RAISE NOTICE '✓ users table columns OK';

  -- Grids table
  PERFORM column_name FROM information_schema.columns
  WHERE table_name = 'grids' AND column_name IN ('id', 'code', 'grid_type', 'bounds', 'supplies_needed');
  IF NOT FOUND THEN RAISE EXCEPTION 'grids table missing required columns'; END IF;
  RAISE NOTICE '✓ grids table columns OK';

  -- Volunteer registrations table
  PERFORM column_name FROM information_schema.columns
  WHERE table_name = 'volunteer_registrations'
  AND column_name IN ('id', 'volunteer_name', 'volunteer_phone', 'status', 'skills', 'equipment');
  IF NOT FOUND THEN RAISE EXCEPTION 'volunteer_registrations table missing required columns'; END IF;
  RAISE NOTICE '✓ volunteer_registrations table columns OK';

END $$;

-- ============================================================================
-- CONSTRAINT CHECK
-- ============================================================================
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Constraints ===';

  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
  AND constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE');

  IF constraint_count < 20 THEN
    RAISE WARNING 'Expected at least 20 constraints, found %', constraint_count;
  ELSE
    RAISE NOTICE '✓ Found % constraints', constraint_count;
  END IF;
END $$;

-- ============================================================================
-- INDEX CHECK
-- ============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Indexes ===';

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public';

  IF index_count < 15 THEN
    RAISE WARNING 'Expected at least 15 indexes, found %', index_count;
  ELSE
    RAISE NOTICE '✓ Found % indexes', index_count;
  END IF;
END $$;

-- ============================================================================
-- VIEW CHECK
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Views ===';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'volunteers_with_phone_mask'
  ) THEN
    RAISE WARNING 'View volunteers_with_phone_mask not found';
  ELSE
    RAISE NOTICE '✓ volunteers_with_phone_mask view exists';
  END IF;
END $$;

-- ============================================================================
-- FUNCTION CHECK
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Functions ===';

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'current_user_id' AND pronamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'app'
    )
  ) THEN
    RAISE EXCEPTION 'Function app.current_user_id() not found';
  ELSE
    RAISE NOTICE '✓ app.current_user_id() function exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'audit_trigger' AND pronamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'app'
    )
  ) THEN
    RAISE EXCEPTION 'Function app.audit_trigger() not found';
  ELSE
    RAISE NOTICE '✓ app.audit_trigger() function exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column' AND pronamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'app'
    )
  ) THEN
    RAISE EXCEPTION 'Function app.update_updated_at_column() not found';
  ELSE
    RAISE NOTICE '✓ app.update_updated_at_column() function exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_grid_volunteer_count' AND pronamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'app'
    )
  ) THEN
    RAISE EXCEPTION 'Function app.update_grid_volunteer_count() not found';
  ELSE
    RAISE NOTICE '✓ app.update_grid_volunteer_count() function exists';
  END IF;
END $$;

-- ============================================================================
-- DATA TYPE CHECK
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Data Types ===';

  -- Check JSONB columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grids' AND column_name = 'bounds' AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'grids.bounds should be JSONB type';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grids' AND column_name = 'supplies_needed' AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'grids.supplies_needed should be JSONB type';
  END IF;
  RAISE NOTICE '✓ JSONB columns OK';

  -- Check array columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'volunteer_registrations' AND column_name = 'skills' AND data_type = 'ARRAY'
  ) THEN
    RAISE EXCEPTION 'volunteer_registrations.skills should be ARRAY type';
  END IF;
  RAISE NOTICE '✓ Array columns OK';

  -- Check UUID columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION 'users.id should be UUID type';
  END IF;
  RAISE NOTICE '✓ UUID columns OK';

  -- Check timestamp columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'created_at'
    AND data_type = 'timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'users.created_at should be timestamptz';
  END IF;
  RAISE NOTICE '✓ Timestamp columns OK';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo ''
\echo '=== Schema Verification Summary ==='
SELECT
  'Tables' as component,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT
  'RLS Policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Triggers',
  COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT
  'Indexes',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Constraints',
  COUNT(*)
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE');

\echo ''
\echo '✓ Schema verification complete!'
\echo ''
