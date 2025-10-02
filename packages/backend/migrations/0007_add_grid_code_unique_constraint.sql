-- Migration 0007: Add UNIQUE constraint to grids.code
-- Generated: 2025-10-02
-- Purpose: Ensure grid codes are unique for conflict detection

-- Add UNIQUE constraint to code field
-- This will enable proper 409 Conflict responses when duplicate codes are submitted
ALTER TABLE grids
  ADD CONSTRAINT grids_code_key UNIQUE (code);

-- Create index for code lookups (automatically created by UNIQUE constraint, but explicit for clarity)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_grids_code ON grids(code);
