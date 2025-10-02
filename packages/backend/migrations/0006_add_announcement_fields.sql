-- Migration 0006: Add missing fields to announcements table
-- This adds fields that the frontend expects but were missing from the schema

-- Add new columns
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'safety'
    CHECK (category IN ('safety', 'equipment', 'center', 'external', 'contact')),
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;

-- Set default category for existing announcements
UPDATE announcements
SET category = 'center'
WHERE category IS NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published);
