-- Migration 0013: 自動更新網格志工人數
-- Description: 當志工報名或取消時，自動增減 grids.volunteer_registered
-- Created: 2025-10-02

-- 建立觸發函數
CREATE OR REPLACE FUNCTION update_grid_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 新增報名：volunteer_registered +1
    UPDATE grids
    SET volunteer_registered = volunteer_registered + 1,
        updated_at = NOW()
    WHERE id = NEW.grid_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- 取消報名：volunteer_registered -1（不小於0）
    UPDATE grids
    SET volunteer_registered = GREATEST(0, volunteer_registered - 1),
        updated_at = NOW()
    WHERE id = OLD.grid_id;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 如果 grid_id 改變（罕見情況）
    IF OLD.grid_id != NEW.grid_id THEN
      -- 舊網格 -1
      UPDATE grids
      SET volunteer_registered = GREATEST(0, volunteer_registered - 1),
          updated_at = NOW()
      WHERE id = OLD.grid_id;

      -- 新網格 +1
      UPDATE grids
      SET volunteer_registered = volunteer_registered + 1,
          updated_at = NOW()
      WHERE id = NEW.grid_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trg_volunteer_registration_count ON volunteer_registrations;

CREATE TRIGGER trg_volunteer_registration_count
AFTER INSERT OR DELETE OR UPDATE OF grid_id ON volunteer_registrations
FOR EACH ROW
EXECUTE FUNCTION update_grid_volunteer_count();

-- 驗證現有資料的計數正確性（一次性修復）
UPDATE grids g
SET volunteer_registered = (
  SELECT COUNT(*)
  FROM volunteer_registrations vr
  WHERE vr.grid_id = g.id
);

-- 驗證觸發器安裝成功
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_volunteer_registration_count'
  ) THEN
    RAISE NOTICE 'Trigger trg_volunteer_registration_count created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger trg_volunteer_registration_count';
  END IF;
END $$;
