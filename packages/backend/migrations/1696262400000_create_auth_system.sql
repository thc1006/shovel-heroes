-- ============================================
-- 鏟子英雄 - 認證系統資料庫 Schema
-- Migration: 0011_create_auth_system
-- Created: 2025-10-02
-- Description: ALTER existing users table + create auth tables
-- ============================================

-- 啟用必要的擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. 更新現有 users 表
-- ============================================

-- 新增認證欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 新增角色與狀態
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) CHECK (role IN ('volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'data_analyst', 'super_admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification', 'inactive'));

-- 個資欄位（加密存儲）
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_encrypted BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_encrypted BYTEA;

-- 驗證狀態
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- 雙因素認證
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- 登入安全
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- 時間戳記
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. 志工個人檔案
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}',
  organization VARCHAR(255),
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_tasks INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  rating DECIMAL(3,2),
  review_count INT DEFAULT 0,
  preferred_areas TEXT[],
  availability JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_skills ON volunteer_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_volunteer_organization ON volunteer_profiles(organization);

DROP TRIGGER IF EXISTS update_volunteer_profiles_updated_at ON volunteer_profiles;
CREATE TRIGGER update_volunteer_profiles_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 受災戶個人檔案
-- ============================================

CREATE TABLE IF NOT EXISTS victim_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address_encrypted BYTEA,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  damage_description TEXT,
  damage_level VARCHAR(20) CHECK (damage_level IN ('minor', 'moderate', 'severe', 'critical')),
  damage_photos TEXT[],
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'need_more_info')),
  verification_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  needs_met BOOLEAN DEFAULT FALSE,
  priority_level INT DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_victim_status ON victim_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_victim_priority ON victim_profiles(priority_level);
CREATE INDEX IF NOT EXISTS idx_victim_location ON victim_profiles(latitude, longitude);

DROP TRIGGER IF EXISTS update_victim_profiles_updated_at ON victim_profiles;
CREATE TRIGGER update_victim_profiles_updated_at
  BEFORE UPDATE ON victim_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. OTP 驗證碼管理
-- ============================================

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'reset_password', '2fa', 'phone_verification', 'email_verification')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_codes(identifier, purpose, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- ============================================
-- 5. Session 管理
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(255) UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  device_trusted BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- 6. 權限管理
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource_type VARCHAR(50),
  action VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- ============================================
-- 7. 稽核日誌
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  request_data JSONB,
  response_status INT,
  is_suspicious BOOLEAN DEFAULT FALSE,
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_suspicious ON audit_logs(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- 8. 登入歷史記錄
-- ============================================

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(50),
  os VARCHAR(50),
  location_country VARCHAR(2),
  location_city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_failed ON login_history(success) WHERE success = FALSE;

-- ============================================
-- 9. 預設權限資料
-- ============================================

INSERT INTO permissions (name, description, resource_type, action) VALUES
  ('view_own_profile', '查看自己的個人資料', 'volunteer', 'read'),
  ('update_own_profile', '更新自己的個人資料', 'volunteer', 'update'),
  ('view_tasks', '查看任務列表', 'task', 'read'),
  ('accept_task', '接受任務', 'task', 'update'),
  ('upload_task_photo', '上傳任務照片', 'task', 'create'),
  ('create_help_request', '建立救援請求', 'help_request', 'create'),
  ('view_own_requests', '查看自己的請求', 'help_request', 'read'),
  ('update_own_request', '更新自己的請求', 'help_request', 'update'),
  ('view_all_volunteers', '查看所有志工', 'volunteer', 'read'),
  ('assign_tasks', '分配任務', 'task', 'create'),
  ('update_tasks', '更新任務狀態', 'task', 'update'),
  ('view_all_requests', '查看所有救援請求', 'help_request', 'read'),
  ('approve_victim', '審核受災戶', 'victim', 'update'),
  ('manage_users', '管理使用者', 'user', '*'),
  ('view_audit_logs', '查看稽核日誌', 'audit', 'read'),
  ('manage_permissions', '管理權限', 'permission', '*'),
  ('export_data', '匯出資料', 'data', 'read')
ON CONFLICT (name) DO NOTHING;

-- 角色預設權限
INSERT INTO role_permissions (role, permission_id)
SELECT 'volunteer', id FROM permissions WHERE name IN (
  'view_own_profile', 'update_own_profile', 'view_tasks', 'accept_task', 'upload_task_photo'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'victim', id FROM permissions WHERE name IN (
  'view_own_profile', 'update_own_profile', 'create_help_request', 'view_own_requests', 'update_own_request'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'ngo_coordinator', id FROM permissions WHERE name IN (
  'view_own_profile', 'update_own_profile',
  'view_all_volunteers', 'assign_tasks', 'update_tasks',
  'view_all_requests', 'approve_victim'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. RLS (Row Level Security) 政策
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE victim_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 使用者只能查看自己的資料
DROP POLICY IF EXISTS users_self_access ON users;
CREATE POLICY users_self_access ON users
  FOR SELECT
  USING (id = current_setting('app.user_id', true)::UUID);

-- 管理員可以查看所有使用者
DROP POLICY IF EXISTS users_admin_access ON users;
CREATE POLICY users_admin_access ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_setting('app.user_id', true)::UUID
      AND u.role IN ('super_admin', 'ngo_coordinator')
    )
  );

-- 志工只能查看自己的 profile
DROP POLICY IF EXISTS volunteer_self_access ON volunteer_profiles;
CREATE POLICY volunteer_self_access ON volunteer_profiles
  FOR ALL
  USING (user_id = current_setting('app.user_id', true)::UUID);

-- NGO 協調者可以查看所有志工 profile
DROP POLICY IF EXISTS volunteer_ngo_access ON volunteer_profiles;
CREATE POLICY volunteer_ngo_access ON volunteer_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_setting('app.user_id', true)::UUID
      AND u.role IN ('ngo_coordinator', 'super_admin')
    )
  );

-- ============================================
-- 11. 輔助函數
-- ============================================

CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, secret TEXT DEFAULT 'your-secret-key')
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(plaintext, secret);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext BYTEA, secret TEXT DEFAULT 'your-secret-key')
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(ciphertext, secret);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    LEFT JOIN role_permissions rp ON rp.role = u.role
    LEFT JOIN permissions p ON p.id = rp.permission_id
    LEFT JOIN user_permissions up ON up.user_id = u.id AND up.permission_id = p.id
    WHERE u.id = p_user_id
    AND p.name = p_permission_name
    AND (up.granted IS NULL OR up.granted = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
