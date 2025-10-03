-- Migration 0010: Add grid_manager_id to grids table
-- Purpose: Support RBAC for grid managers to view volunteer phone numbers
-- Created: 2025-10-03

-- Add grid_manager_id column to grids table
ALTER TABLE grids
  ADD COLUMN IF NOT EXISTS grid_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_grids_manager ON grids(grid_manager_id);

-- Add comment for documentation
COMMENT ON COLUMN grids.grid_manager_id IS 'User ID of the grid manager (ngo_coordinator role) who can view volunteer phone numbers for this grid';
