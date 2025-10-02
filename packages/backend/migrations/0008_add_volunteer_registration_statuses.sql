-- Migration 0008: Add 'arrived' and 'completed' statuses to volunteer_registrations
-- Generated: 2025-10-02

-- Drop the existing CHECK constraint
ALTER TABLE volunteer_registrations
DROP CONSTRAINT IF EXISTS volunteer_registrations_status_check;

-- Add new CHECK constraint with all status values
ALTER TABLE volunteer_registrations
ADD CONSTRAINT volunteer_registrations_status_check
CHECK (status IN ('pending', 'confirmed', 'arrived', 'completed', 'cancelled'));

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'volunteer_registrations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE volunteer_registrations
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_volunteer_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS volunteer_registrations_updated_at ON volunteer_registrations;
CREATE TRIGGER volunteer_registrations_updated_at
  BEFORE UPDATE ON volunteer_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_volunteer_registrations_updated_at();

-- Add RLS policy for UPDATE operations
-- Users can update their own registrations OR admins can update any
CREATE POLICY volunteer_registrations_update_own ON volunteer_registrations
  FOR UPDATE
  USING (
    volunteer_id IN (SELECT id FROM volunteers WHERE user_id = app.current_user_id())
    OR app.is_admin()
  )
  WITH CHECK (
    volunteer_id IN (SELECT id FROM volunteers WHERE user_id = app.current_user_id())
    OR app.is_admin()
  );

-- Add comment for documentation
COMMENT ON CONSTRAINT volunteer_registrations_status_check ON volunteer_registrations IS
'Valid status values: pending (initial), confirmed (admin approved), arrived (checked in), completed (task done), cancelled (user or admin cancelled)';
