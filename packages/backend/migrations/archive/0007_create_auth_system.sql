-- ============================================
-- 鏟子英雄 - 認證系統資料庫 Schema
-- Migration: 0007_create_auth_system
-- Created: 2025-10-02
-- Description: 建立完整的多角色認證系統
-- ============================================

-- 啟用必要的擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. 使用者主表（統一認證）
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 認證資訊
  phone_number VARCHAR(20) UNIQUE,              -- 志工、受災戶使用
  email VARCHAR(255) UNIQUE,                     -- 管理員使用
  password_hash VARCHAR(255),                    -- 僅管理員需要密碼

  -- 角色與狀態
  role VARCHAR(20) NOT NULL CHECK (role IN ('volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'data_analyst', 'super_admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification', 'inactive')),

  -- 個資欄位（加密存儲）
  full_name_encrypted BYTEA,                     -- 使用 pgcrypto 加密
  emergency_contact_encrypted BYTEA,

  -- 驗證狀態
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,       -- 受災戶需要人工審核
  verified_by UUID REFERENCES users(id),         -- 審核者
  verified_at TIMESTAMP WITH TIME ZONE,

  -- 雙因素認證（管理員）
  totp_secret VARCHAR(255),                      -- Google Authenticator
  totp_enabled BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[],                           -- 備用驗證碼（已Hash）

  -- 登入安全
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip INET,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 約束條件
  CONSTRAINT user_identifier_check CHECK (
    (phone_number IS NOT NULL) OR (email IS NOT NULL)
  ),
  CONSTRAINT admin_password_check CHECK (
    (role NOT IN ('ngo_coordinator', 'regional_admin', 'super_admin')) OR (password_hash IS NOT NULL)
  )
);

-- 索引優化
CREATE INDEX idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. 志工個人檔案
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- 技能與專長
  skills TEXT[] DEFAULT '{}',                    -- ['physical_labor', 'cooking', 'medical', 'counseling', 'driving', 'translation']
  organization VARCHAR(255),                     -- 所屬組織（選填）

  -- 統計資料
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_tasks INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  rating DECIMAL(3,2),                           -- 平均評價 (0-5)
  review_count INT DEFAULT 0,

  -- 偏好設定
  preferred_areas TEXT[],                        -- 偏好工作地區
  availability JSONB,                            -- 可用時段 {"monday": ["09:00-12:00", "14:00-17:00"]}

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volunteer_skills ON volunteer_profiles USING GIN(skills);
CREATE INDEX idx_volunteer_organization ON volunteer_profiles(organization);

CREATE TRIGGER update_volunteer_profiles_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 受災戶個人檔案
-- ============================================

CREATE TABLE IF NOT EXISTS victim_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- 受災資訊
  address_encrypted BYTEA,                       -- 受災地址（加密）
  latitude DECIMAL(10,8),                        -- 座標（用於地圖顯示）
  longitude DECIMAL(11,8),
  damage_description TEXT,
  damage_level VARCHAR(20) CHECK (damage_level IN ('minor', 'moderate', 'severe', 'critical')),
  damage_photos TEXT[],                          -- S3/Cloudinary URLs

  -- 審核狀態
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'need_more_info')),
  verification_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- 需求追蹤
  needs_met BOOLEAN DEFAULT FALSE,
  priority_level INT DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),  -- 1=最緊急

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_victim_status ON victim_profiles(verification_status);
CREATE INDEX idx_victim_priority ON victim_profiles(priority_level);
CREATE INDEX idx_victim_location ON victim_profiles(latitude, longitude);

CREATE TRIGGER update_victim_profiles_updated_at
  BEFORE UPDATE ON victim_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. OTP 驗證碼管理
-- ============================================

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 識別資訊
  identifier VARCHAR(255) NOT NULL,              -- 手機號碼或Email
  code_hash VARCHAR(255) NOT NULL,               -- Hash後的OTP（不存明碼）

  -- 用途與狀態
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'reset_password', '2fa', 'phone_verification', 'email_verification')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,

  -- 安全控制
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  ip_address INET,

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier ON otp_codes(identifier, purpose, expires_at);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- 自動清理過期 OTP（每天執行）
-- 注意：需要設置 pg_cron 或在應用層實作
COMMENT ON TABLE otp_codes IS '自動清理過期 OTP: DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL ''7 days''';

-- ============================================
-- 5. Session 管理
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 使用者關聯
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token 資訊
  token_hash VARCHAR(255) NOT NULL UNIQUE,       -- Hash後的JWT（用於撤銷）
  refresh_token_hash VARCHAR(255) UNIQUE,

  -- 裝置資訊
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  device_trusted BOOLEAN DEFAULT FALSE,

  -- 有效期限
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE,

  -- 最後活動
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- 6. 權限管理
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 權限資訊
  name VARCHAR(100) NOT NULL UNIQUE,             -- e.g., 'view_volunteers', 'assign_tasks'
  description TEXT,
  resource_type VARCHAR(50),                     -- 'volunteer', 'task', 'announcement', etc.
  action VARCHAR(50),                            -- 'create', 'read', 'update', 'delete'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 角色權限關聯表
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  role VARCHAR(20) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);

-- 使用者特殊權限（覆蓋角色權限）
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE,                  -- TRUE=授予, FALSE=撤銷
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);

-- ============================================
-- 7. 稽核日誌
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 操作者
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(20),

  -- 操作內容
  action VARCHAR(100) NOT NULL,                  -- 'login', 'logout', 'view_data', 'assign_task', etc.
  resource_type VARCHAR(50),                     -- 'user', 'task', 'announcement', etc.
  resource_id UUID,

  -- 變更內容
  old_value JSONB,
  new_value JSONB,

  -- 請求資訊
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  request_data JSONB,
  response_status INT,

  -- 安全事件標記
  is_suspicious BOOLEAN DEFAULT FALSE,
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_suspicious ON audit_logs(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- 8. 登入歷史記錄
-- ============================================

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 登入資訊
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),                   -- 'invalid_credentials', 'account_locked', '2fa_failed', etc.

  -- 裝置與位置
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),                       -- 'mobile', 'desktop', 'tablet'
  browser VARCHAR(50),
  os VARCHAR(50),
  location_country VARCHAR(2),                   -- ISO country code
  location_city VARCHAR(100),

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON login_history(user_id, created_at DESC);
CREATE INDEX idx_login_history_ip ON login_history(ip_address);
CREATE INDEX idx_login_history_failed ON login_history(success) WHERE success = FALSE;

-- ============================================
-- 9. 預設權限資料
-- ============================================

INSERT INTO permissions (name, description, resource_type, action) VALUES
  -- 志工相關
  ('view_own_profile', '查看自己的個人資料', 'volunteer', 'read'),
  ('update_own_profile', '更新自己的個人資料', 'volunteer', 'update'),
  ('view_tasks', '查看任務列表', 'task', 'read'),
  ('accept_task', '接受任務', 'task', 'update'),
  ('upload_task_photo', '上傳任務照片', 'task', 'create'),

  -- 受災戶相關
  ('create_help_request', '建立救援請求', 'help_request', 'create'),
  ('view_own_requests', '查看自己的請求', 'help_request', 'read'),
  ('update_own_request', '更新自己的請求', 'help_request', 'update'),

  -- NGO 協調者
  ('view_all_volunteers', '查看所有志工', 'volunteer', 'read'),
  ('assign_tasks', '分配任務', 'task', 'create'),
  ('update_tasks', '更新任務狀態', 'task', 'update'),
  ('view_all_requests', '查看所有救援請求', 'help_request', 'read'),
  ('approve_victim', '審核受災戶', 'victim', 'update'),

  -- 管理員
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

-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE victim_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 使用者只能查看自己的資料
CREATE POLICY users_self_access ON users
  FOR SELECT
  USING (id = current_setting('app.user_id')::UUID);

-- 管理員可以查看所有使用者
CREATE POLICY users_admin_access ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_setting('app.user_id')::UUID
      AND u.role IN ('super_admin', 'ngo_coordinator')
    )
  );

-- 志工只能查看自己的 profile
CREATE POLICY volunteer_self_access ON volunteer_profiles
  FOR ALL
  USING (user_id = current_setting('app.user_id')::UUID);

-- NGO 協調者可以查看所有志工 profile
CREATE POLICY volunteer_ngo_access ON volunteer_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_setting('app.user_id')::UUID
      AND u.role IN ('ngo_coordinator', 'super_admin')
    )
  );

-- ============================================
-- 11. 輔助函數
-- ============================================

-- 加密個人資料
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, secret TEXT DEFAULT 'your-secret-key')
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(plaintext, secret);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 解密個人資料
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext BYTEA, secret TEXT DEFAULT 'your-secret-key')
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(ciphertext, secret);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 檢查使用者權限
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

-- ============================================
-- 12. 註解說明
-- ============================================

COMMENT ON TABLE users IS '統一使用者認證表，支援志工、受災戶、管理員等多種角色';
COMMENT ON TABLE volunteer_profiles IS '志工個人檔案，包含技能、評價等資訊';
COMMENT ON TABLE victim_profiles IS '受災戶個人檔案，需人工審核後才能提交需求';
COMMENT ON TABLE otp_codes IS 'OTP 驗證碼管理，支援登入、2FA、密碼重置等用途';
COMMENT ON TABLE sessions IS 'Session 管理，支援 Token 撤銷和裝置信任';
COMMENT ON TABLE permissions IS '系統權限定義';
COMMENT ON TABLE audit_logs IS '稽核日誌，記錄所有敏感操作';
COMMENT ON TABLE login_history IS '登入歷史記錄，用於安全分析';

-- ============================================
-- 完成！
-- ============================================

-- 顯示建立的表格
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'volunteer_profiles', 'victim_profiles', 'otp_codes', 'sessions', 'permissions', 'role_permissions', 'user_permissions', 'audit_logs', 'login_history')
ORDER BY tablename;
