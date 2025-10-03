-- Migration 0005: Expand grids table for map functionality
-- Generated: 2025-10-02
-- Purpose: Add all necessary fields for map display and grid management

-- Add new columns to grids table
ALTER TABLE grids
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS grid_type TEXT CHECK (grid_type IN ('mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area')),
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('open', 'closed', 'completed', 'in_progress', 'preparing')) DEFAULT 'preparing',
  ADD COLUMN IF NOT EXISTS center_lat DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS center_lng DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS bounds JSONB,
  ADD COLUMN IF NOT EXISTS volunteer_needed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volunteer_registered INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplies_needed JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_grids_status ON grids(status);
CREATE INDEX IF NOT EXISTS idx_grids_grid_type ON grids(grid_type);
CREATE INDEX IF NOT EXISTS idx_grids_location ON grids(center_lat, center_lng);

-- Insert sample grid data for testing (光復地區)
-- Grid coordinates are around 光復鄉 (23.875, 121.578)

INSERT INTO grids (code, name, area_id, grid_type, status, center_lat, center_lng, bounds, volunteer_needed, volunteer_registered, meeting_point, description) VALUES
  -- Manpower grids (人力任務)
  ('A1', '光復市區清淤區A1', NULL, 'manpower', 'open', 23.8751, 121.5780,
   '{"north": 23.8761, "south": 23.8741, "east": 121.5790, "west": 121.5770}'::jsonb,
   20, 5, '光復鄉公所前廣場', '市區主要道路清淤作業'),

  ('A2', '光復市區清淤區A2', NULL, 'manpower', 'open', 23.8770, 121.5800,
   '{"north": 23.8780, "south": 23.8760, "east": 121.5810, "west": 121.5790}'::jsonb,
   15, 12, '光復國小', '住宅區清淤作業'),

  ('A3', '馬太鞍溪沿岸清理', NULL, 'manpower', 'open', 23.8800, 121.5820,
   '{"north": 23.8810, "south": 23.8790, "east": 121.5830, "west": 121.5810}'::jsonb,
   30, 8, '馬太鞍橋頭', '河岸清理與垃圾清運'),

  ('A4', '農田復原區', NULL, 'manpower', 'in_progress', 23.8730, 121.5760,
   '{"north": 23.8740, "south": 23.8720, "east": 121.5770, "west": 121.5750}'::jsonb,
   25, 20, '光復糖廠入口', '農田淤泥清理'),

  ('A5', '社區巷道清理', NULL, 'manpower', 'completed', 23.8720, 121.5790,
   '{"north": 23.8730, "south": 23.8710, "east": 121.5800, "west": 121.5780}'::jsonb,
   10, 10, '光復街45號', '已完成巷道清淤'),

  -- Mud disposal sites (污泥暫置場)
  ('B1', '光復暫置場1號', NULL, 'mud_disposal', 'open', 23.8820, 121.5850,
   '{"north": 23.8830, "south": 23.8810, "east": 121.5860, "west": 121.5840}'::jsonb,
   0, 0, '台9線旁空地', '可容納約500立方公尺'),

  ('B2', '光復暫置場2號', NULL, 'mud_disposal', 'open', 23.8700, 121.5730,
   '{"north": 23.8710, "south": 23.8690, "east": 121.5740, "west": 121.5720}'::jsonb,
   0, 0, '光復工業區', '大型污泥暫置區'),

  -- Supply storage (物資停放處)
  ('C1', '光復物資集散中心', NULL, 'supply_storage', 'open', 23.8760, 121.5795,
   '{"north": 23.8770, "south": 23.8750, "east": 121.5805, "west": 121.5785}'::jsonb,
   0, 0, '光復國中體育館', '物資接收與分發'),

  ('C2', '光復物資站2號', NULL, 'supply_storage', 'open', 23.8780, 121.5770,
   '{"north": 23.8790, "south": 23.8770, "east": 121.5780, "west": 121.5760}'::jsonb,
   0, 0, '光復社區活動中心', '備用物資站'),

  -- Accommodation (住宿地點)
  ('D1', '志工住宿點1', NULL, 'accommodation', 'open', 23.8740, 121.5785,
   '{"north": 23.8750, "south": 23.8730, "east": 121.5795, "west": 121.5775}'::jsonb,
   0, 0, '光復國小教室', '可容納50人'),

  ('D2', '志工住宿點2', NULL, 'accommodation', 'open', 23.8790, 121.5810,
   '{"north": 23.8800, "south": 23.8780, "east": 121.5820, "west": 121.5800}'::jsonb,
   0, 0, '光復活動中心', '可容納30人'),

  -- Food area (領吃食區域)
  ('E1', '志工用餐區', NULL, 'food_area', 'open', 23.8755, 121.5782,
   '{"north": 23.8765, "south": 23.8745, "east": 121.5792, "west": 121.5772}'::jsonb,
   0, 0, '光復鄉公所', '提供三餐與飲水'),

  ('E2', '備用用餐區', NULL, 'food_area', 'open', 23.8775, 121.5805,
   '{"north": 23.8785, "south": 23.8765, "east": 121.5815, "west": 121.5795}'::jsonb,
   0, 0, '光復教會', '備用餐點供應站')

ON CONFLICT (id) DO NOTHING;

-- Update supplies_needed for supply storage grids
UPDATE grids
SET supplies_needed = '[
  {"name": "清潔用具", "quantity": 100, "received": 45, "unit": "組"},
  {"name": "飲用水", "quantity": 500, "received": 320, "unit": "瓶"},
  {"name": "即食食品", "quantity": 200, "received": 150, "unit": "份"}
]'::jsonb
WHERE grid_type = 'supply_storage';
