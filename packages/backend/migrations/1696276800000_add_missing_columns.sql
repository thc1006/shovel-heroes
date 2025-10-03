-- Migration 0013: Add missing columns to align with BACKEND_API_INTEGRATION_GUIDE.md
-- Purpose: Add contact_info, risks_notes to grids table and volunteer fields to volunteer_registrations
-- Created: 2025-10-03
-- Reference: BACKEND_API_INTEGRATION_GUIDE.md lines 850-878

-- ============================================================================
-- GRIDS TABLE: Add contact and risk information
-- ============================================================================

-- Add contact_info column (sensitive data for grid coordinators)
ALTER TABLE grids
  ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255);

-- Add risks_notes column for safety information
ALTER TABLE grids
  ADD COLUMN IF NOT EXISTS risks_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN grids.contact_info IS 'Contact information for grid coordinators - SENSITIVE DATA';
COMMENT ON COLUMN grids.risks_notes IS 'Risk notes and safety information for the grid location';

-- ============================================================================
-- VOLUNTEER_REGISTRATIONS TABLE: Add volunteer-specific fields
-- ============================================================================

-- Add volunteer_name column (if not exists)
ALTER TABLE volunteer_registrations
  ADD COLUMN IF NOT EXISTS volunteer_name VARCHAR(255);

-- Add volunteer_phone column (sensitive data)
ALTER TABLE volunteer_registrations
  ADD COLUMN IF NOT EXISTS volunteer_phone VARCHAR(50);

-- Add available_time column for volunteer availability
ALTER TABLE volunteer_registrations
  ADD COLUMN IF NOT EXISTS available_time TEXT;

-- Add skills array column
ALTER TABLE volunteer_registrations
  ADD COLUMN IF NOT EXISTS skills TEXT[];

-- Add equipment array column
ALTER TABLE volunteer_registrations
  ADD COLUMN IF NOT EXISTS equipment TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN volunteer_registrations.volunteer_name IS 'Name of the volunteer (may differ from user display_name)';
COMMENT ON COLUMN volunteer_registrations.volunteer_phone IS 'Volunteer phone number - SENSITIVE DATA, only visible to grid managers';
COMMENT ON COLUMN volunteer_registrations.available_time IS 'Time availability for volunteer work (e.g., "週末全天", "平日晚上")';
COMMENT ON COLUMN volunteer_registrations.skills IS 'Array of volunteer skills (e.g., ["重機械操作", "醫療", "烹飪"])';
COMMENT ON COLUMN volunteer_registrations.equipment IS 'Array of equipment volunteer can bring (e.g., ["鏟子", "手套", "水桶"])';

-- ============================================================================
-- INDEXES: Create indexes for better query performance
-- ============================================================================

-- No additional indexes needed for these text/array columns
-- Array columns support GIN indexes if needed in the future:
-- CREATE INDEX IF NOT EXISTS idx_volunteer_registrations_skills ON volunteer_registrations USING GIN (skills);
-- CREATE INDEX IF NOT EXISTS idx_volunteer_registrations_equipment ON volunteer_registrations USING GIN (equipment);

-- ============================================================================
-- RLS POLICIES: Update policies for sensitive data
-- ============================================================================

-- Note: RLS policies for grids.contact_info should be added in 0012_complete_rls_policies.sql
-- Grid managers (ngo_coordinator role) should be able to view contact_info for their assigned grids

-- Note: RLS policies for volunteer_registrations.volunteer_phone should be added in 0012_complete_rls_policies.sql
-- Only grid managers can view volunteer phone numbers for their assigned grids

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Verify grids table columns
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'grids'
-- AND column_name IN ('contact_info', 'risks_notes', 'meeting_point')
-- ORDER BY column_name;

-- Verify volunteer_registrations table columns
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'volunteer_registrations'
-- AND column_name IN ('volunteer_name', 'volunteer_phone', 'available_time', 'skills', 'equipment', 'notes')
-- ORDER BY column_name;

-- ============================================================================
-- SAMPLE DATA (for testing purposes)
-- ============================================================================

-- Update sample grids with contact info and risks
UPDATE grids
SET
  contact_info = '聯絡人：陳組長 0912-345-678',
  risks_notes = '注意：路面濕滑，請穿防滑鞋。有倒塌風險建築物，請勿靠近。'
WHERE code = 'A1' AND contact_info IS NULL;

UPDATE grids
SET
  contact_info = '聯絡人：林主任 0923-456-789',
  risks_notes = '注意：部分區域水深及膝，請穿雨鞋。電線可能裸露，注意安全。'
WHERE code = 'A2' AND contact_info IS NULL;

UPDATE grids
SET
  contact_info = '聯絡人：王隊長 0934-567-890',
  risks_notes = '注意：河岸泥濘，有滑倒風險。請攜帶口罩防止粉塵。'
WHERE code = 'A3' AND contact_info IS NULL;

-- Note: Sample volunteer_registrations data will be added in test files
-- Example structure:
-- INSERT INTO volunteer_registrations (
--   grid_id, user_id, volunteer_name, volunteer_phone,
--   status, available_time, skills, equipment, notes
-- ) VALUES (
--   (SELECT id FROM grids WHERE code = 'A1'),
--   (SELECT id FROM users WHERE phone = '0912000001'),
--   '張小明',
--   '0912-111-222',
--   'confirmed',
--   '週末全天',
--   ARRAY['重機械操作', '急救'],
--   ARRAY['鏟子', '手套', '水桶'],
--   '有清淤經驗'
-- );
