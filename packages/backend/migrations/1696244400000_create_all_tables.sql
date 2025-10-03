-- Migration 0004: Create all missing tables for Shovel Heroes
-- Generated: 2025-10-02

-- Disaster Areas table
CREATE TABLE IF NOT EXISTS disaster_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT CHECK (status IN ('active', 'resolved', 'monitoring')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  published BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  skills TEXT[],
  availability TEXT,
  status TEXT CHECK (status IN ('available', 'assigned', 'unavailable')) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer Registrations table
CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES volunteers(id),
  grid_id UUID REFERENCES grids(id),
  disaster_area_id UUID REFERENCES disaster_areas(id),
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supply Donations table
CREATE TABLE IF NOT EXISTS supply_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  donor_contact TEXT,
  item_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  disaster_area_id UUID REFERENCES disaster_areas(id),
  grid_id UUID REFERENCES grids(id),
  status TEXT CHECK (status IN ('pledged', 'received', 'distributed')) DEFAULT 'pledged',
  delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grid Discussions table
CREATE TABLE IF NOT EXISTS grid_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID REFERENCES grids(id),
  user_id UUID REFERENCES users(id),
  parent_id UUID REFERENCES grid_discussions(id), -- for threaded discussions
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_disaster_areas_status ON disaster_areas(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_registrations_status ON volunteer_registrations(status);
CREATE INDEX IF NOT EXISTS idx_supply_donations_status ON supply_donations(status);
CREATE INDEX IF NOT EXISTS idx_grid_discussions_grid_id ON grid_discussions(grid_id);

-- Add RLS policies for new tables
ALTER TABLE disaster_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY disaster_areas_select_all ON disaster_areas FOR SELECT USING (true);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_select_published ON announcements FOR SELECT USING (published = true);

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY volunteers_select_all ON volunteers FOR SELECT USING (true);

ALTER TABLE volunteer_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY volunteer_registrations_select_own ON volunteer_registrations
  FOR SELECT USING (volunteer_id IN (SELECT id FROM volunteers WHERE user_id = app.current_user_id()));

ALTER TABLE supply_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY supply_donations_select_all ON supply_donations FOR SELECT USING (true);

ALTER TABLE grid_discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY grid_discussions_select_all ON grid_discussions FOR SELECT USING (true);

-- Add audit triggers for new tables
CREATE TRIGGER audit_disaster_areas AFTER INSERT OR UPDATE OR DELETE ON disaster_areas
FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

CREATE TRIGGER audit_announcements AFTER INSERT OR UPDATE OR DELETE ON announcements
FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

CREATE TRIGGER audit_volunteers AFTER INSERT OR UPDATE OR DELETE ON volunteers
FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

CREATE TRIGGER audit_volunteer_registrations AFTER INSERT OR UPDATE OR DELETE ON volunteer_registrations
FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

CREATE TRIGGER audit_supply_donations AFTER INSERT OR UPDATE OR DELETE ON supply_donations
FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

CREATE TRIGGER audit_grid_discussions AFTER INSERT OR UPDATE OR DELETE ON grid_discussions
FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- Insert some sample data for testing
INSERT INTO disaster_areas (name, description, location, severity, status) VALUES
  ('馬太鞍溪堰塞湖', '堰塞湖潰堤導致嚴重淹水', '花蓮縣光復鄉', 'critical', 'active'),
  ('光復市區淹水區', '市區低窪地帶淹水', '花蓮縣光復鄉市區', 'high', 'monitoring')
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, content, priority, published) VALUES
  ('志工招募中', '急需志工協助清淤工作，請有意願者報名', 'urgent', true),
  ('物資需求公告', '目前需要清潔用具、飲用水、即食食品', 'high', true)
ON CONFLICT DO NOTHING;
