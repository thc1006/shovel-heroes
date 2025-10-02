# 鏟子英雄（Shovel Heroes）登入系統設計規劃

## 一、專案背景與使用受眾分析

### 1.1 事件背景
- **時間**：2025年9月
- **地點**：花蓮縣光復鄉
- **事件**：馬太鞍溪堰塞湖潰堤，造成嚴重土石流災害
- **志工動員**：超過30,000人次「鏟子超人/鏟子英雄」投入救災

### 1.2 核心問題
根據實際救災經驗，主要挑戰包括：
1. **缺乏統籌**：志工抵達現場不知道去哪裡
2. **資源浪費**：未經分配的志工等待時間長
3. **技能錯配**：未依專長分配工作
4. **安全風險**：未經登記的志工難以追蹤
5. **重複登記**：多個組織各自管理造成混亂

### 1.3 使用受眾分析

#### 主要使用者群體

| 角色 | 特徵 | 技術能力 | 使用場景 | 人數規模 |
|------|------|----------|----------|----------|
| **一般志工** | 18-65歲，學生、上班族 | 中等（會用手機App） | 現場報到、接收任務 | 每日1,500+ |
| **受災戶** | 各年齡層，可能年長者多 | 低-中等 | 提交需求、查看進度 | 數百戶 |
| **NGO協調者** | 慈濟、紅十字會等組織 | 中-高 | 分配志工、管理任務 | 10-50人 |
| **政府管理員** | 災害應變中心人員 | 高 | 總體調度、數據分析 | 5-20人 |
| **專業救援隊** | 搜救員、醫護人員 | 中-高 | 執行專業任務 | 50-200人 |

#### 使用情境特性
- **環境**：災區現場，可能網路不穩定
- **設備**：主要使用手機（70%），部分使用平板/電腦
- **時間壓力**：緊急狀況，需要快速登入和操作
- **使用頻率**：災害期間高頻使用（每天多次）
- **年齡分布**：18-35歲為主（60%），36-50歲（30%），50歲以上（10%）

---

## 二、資訊安全等級架構

### 2.1 安全等級分級

根據災害救援特性，採用**三層安全等級**：

#### Level 1：公開資訊（無需登入）
- **內容**：災區地圖、物資需求清單、交通資訊
- **存取控制**：無
- **資料敏感度**：低
- **範例**：查看災區位置、了解需要什麼物資

#### Level 2：志工級（手機號碼 + OTP）
- **內容**：報名任務、查看個人任務、上傳工作照片
- **存取控制**：手機驗證 + 簡易實名認證
- **資料敏感度**：中
- **範例**：志工報名、接收任務通知、回報工作進度

#### Level 3：管理級（雙因素認證 + 帳號審核）
- **內容**：分配志工、查看志工資料、修改需求
- **存取控制**：Email/手機 + 密碼 + OTP + 組織認證
- **資料敏感度**：高
- **範例**：NGO協調者、政府管理員、受災戶（查看隱私資訊）

### 2.2 資料保護措施

| 資料類型 | 加密方式 | 存取限制 | 保存期限 |
|---------|---------|---------|---------|
| 個人身份資訊（姓名、身分證） | AES-256加密 | Level 3限定 | 災後6個月 |
| 聯絡方式（手機、Email） | Hash + Salt | Level 2以上 | 災後1年 |
| 工作紀錄、照片 | HTTPS傳輸 | Level 2以上 | 災後1年 |
| 地理位置（災區座標） | 無加密 | 公開 | 永久 |
| 任務分配紀錄 | 資料庫加密 | Level 3限定 | 災後2年 |

### 2.3 GDPR/個資法遵循
- **資料最小化**：只收集必要資訊
- **用途限定**：僅用於救災協調
- **同意機制**：明確告知資料用途並取得同意
- **刪除權**：災後允許使用者要求刪除個資
- **稽核日誌**：記錄所有資料存取行為

---

## 三、登入系統設計

### 3.1 多角色登入架構

#### 架構圖
```
                    ┌─────────────────┐
                    │  鏟子英雄平台    │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
          ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
          │ 志工入口  │ │ 受災戶 │ │ 管理入口 │
          │ (快速)    │ │ 入口   │ │ (嚴格)   │
          └───────────┘ └────────┘ └──────────┘
                │            │            │
          ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
          │手機號碼OTP│ │簡訊OTP │ │Email+密碼│
          │           │ │+審核   │ │+2FA      │
          └───────────┘ └────────┘ └──────────┘
```

### 3.2 志工登入流程（Level 2）

#### 設計理念
- **快速**：災區現場需要立即行動，減少註冊步驟
- **安全**：手機號碼作為唯一識別，防止冒用
- **簡單**：適合各年齡層，無需記憶密碼

#### 登入步驟
```
┌──────────────────────────────────────────┐
│ Step 1: 輸入手機號碼                      │
│ ┌────────────────────────────────────┐   │
│ │ 📱 請輸入您的手機號碼                │   │
│ │ ┌──────────────────────────────┐   │   │
│ │ │ +886 _ _ _ - _ _ _ - _ _ _   │   │   │
│ │ └──────────────────────────────┘   │   │
│ │ [✓] 我已閱讀並同意個資使用條款      │   │
│ │                                     │   │
│ │          [ 發送驗證碼 ]             │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Step 2: 輸入6位數OTP驗證碼                │
│ ┌────────────────────────────────────┐   │
│ │ 📬 驗證碼已發送至 0912-345-678      │   │
│ │                                     │   │
│ │    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐  │   │
│ │    │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │  │   │
│ │    └───┘ └───┘ └───┘ └───┘ └───┘  │   │
│ │                                     │   │
│ │    60秒後可重新發送                 │   │
│ │          [ 重新發送 ]               │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Step 3: 首次登入 - 基本資料              │
│ ┌────────────────────────────────────┐   │
│ │ 👤 請完成基本資料                   │   │
│ │                                     │   │
│ │ 姓名: ┌──────────────────────┐      │   │
│ │      │ 王小明                │      │   │
│ │      └──────────────────────┘      │   │
│ │                                     │   │
│ │ 緊急聯絡人: ┌─────────────────┐     │   │
│ │            │ 0912-345-679    │     │   │
│ │            └─────────────────┘     │   │
│ │                                     │   │
│ │ 技能 (可多選):                      │   │
│ │ ☑ 體力勞動  ☐ 煮飯  ☐ 醫護         │   │
│ │ ☐ 心理輔導  ☐ 駕駛  ☐ 翻譯         │   │
│ │                                     │   │
│ │          [ 完成註冊 ]               │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

#### 技術實現
```typescript
// 志工快速登入 API 流程
POST /api/auth/volunteer/request-otp
{
  "phoneNumber": "+886912345678",
  "agreedToTerms": true
}

Response:
{
  "success": true,
  "otpSentAt": "2025-09-27T10:30:00Z",
  "expiresIn": 300  // 5分鐘
}

POST /api/auth/volunteer/verify-otp
{
  "phoneNumber": "+886912345678",
  "otp": "123456"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "vol_12345",
    "phoneNumber": "+886912345678",
    "role": "volunteer",
    "isFirstLogin": true
  }
}
```

### 3.3 受災戶登入流程（Level 2+）

#### 設計理念
- **驗證身份**：確保真實受災戶，防止假冒
- **審核機制**：政府或NGO協助驗證
- **保護隱私**：需求資訊只有授權人員可見

#### 登入步驟
```
1. 手機號碼 + OTP驗證（同志工）
2. 填寫受災地址 + 上傳受災照片
3. 等待NGO/政府審核（24小時內）
4. 審核通過後可提交需求
```

### 3.4 管理員登入流程（Level 3）

#### 設計理念
- **最高安全**：雙因素認證 + 組織驗證
- **權限管理**：細緻的角色權限控制
- **稽核追蹤**：所有操作均記錄日誌

#### 登入步驟
```
┌──────────────────────────────────────────┐
│ Step 1: Email + 密碼                      │
│ ┌────────────────────────────────────┐   │
│ │ 📧 管理員登入                        │   │
│ │                                     │   │
│ │ Email: ┌───────────────────────┐   │   │
│ │       │ admin@tzuchi.org.tw   │   │   │
│ │       └───────────────────────┘   │   │
│ │                                     │   │
│ │ 密碼:  ┌───────────────────────┐   │   │
│ │       │ ●●●●●●●●●●            │   │   │
│ │       └───────────────────────┘   │   │
│ │                                     │   │
│ │ [✓] 信任此裝置（30天）              │   │
│ │                                     │   │
│ │          [ 登入 ]                   │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Step 2: 雙因素認證                        │
│ ┌────────────────────────────────────┐   │
│ │ 🔐 請選擇驗證方式                   │   │
│ │                                     │   │
│ │ ┌─────────────────────────────┐    │   │
│ │ │ 📱 簡訊驗證碼                │    │   │
│ │ │ 發送至 0912-***-678          │    │   │
│ │ └─────────────────────────────┘    │   │
│ │                                     │   │
│ │ ┌─────────────────────────────┐    │   │
│ │ │ 🔑 Google Authenticator     │    │   │
│ │ │ 使用驗證器App                │    │   │
│ │ └─────────────────────────────┘    │   │
│ │                                     │   │
│ │ ┌─────────────────────────────┐    │   │
│ │ │ 📧 Email 驗證碼              │    │   │
│ │ │ 發送至 admin@*****.tw        │    │   │
│ │ └─────────────────────────────┘    │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

#### 角色與權限

| 角色 | 權限 | 審核方式 |
|------|------|----------|
| **超級管理員** | 系統所有功能 | 政府災害應變中心指派 |
| **NGO協調者** | 分配志工、查看需求、修改任務 | 組織認證（慈濟、紅十字會等） |
| **區域管理員** | 管理特定區域的志工和需求 | 由NGO協調者授權 |
| **資料分析師** | 查看統計資料（只讀） | 政府單位申請 |

---

## 四、使用者介面設計

### 4.1 響應式設計原則
- **行動優先**：70%使用者使用手機
- **大按鈕**：適合戶外使用，手套也能操作
- **高對比**：陽光下也能清楚閱讀
- **離線優先**：支援離線快取，網路恢復後同步

### 4.2 志工儀表板（手機版）

```
┌─────────────────────────────────┐
│  ☰  鏟子英雄  👤 王小明    🔔(3) │
├─────────────────────────────────┤
│                                 │
│  📍 您目前在：光復國小集合點    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🔥 緊急任務                │  │
│  │ 砂婆噹路123號急需清理      │  │
│  │ 距離 500m | 需要3人        │  │
│  │                            │  │
│  │     [ 立即接受任務 ]       │  │
│  └───────────────────────────┘  │
│                                 │
│  ✅ 今日已完成任務               │
│  ┌───────────────────────────┐  │
│  │ 09:00-12:00                │  │
│  │ 富田路45號 - 清理完成       │  │
│  │ 評價：⭐⭐⭐⭐⭐             │  │
│  └───────────────────────────┘  │
│                                 │
│  📊 我的統計                    │
│  ┌─────┬─────┬─────┐           │
│  │  5  │  3  │ 15  │           │
│  │ 任務│ 天  │ 時數│           │
│  └─────┴─────┴─────┘           │
│                                 │
│  [ 🗺️ 查看地圖 ] [ ⚙️ 設定 ]   │
│                                 │
└─────────────────────────────────┘
```

### 4.3 管理員儀表板（桌面版）

```
┌──────────────────────────────────────────────────────────────┐
│ 鏟子英雄 管理後台                        慈濟基金會 - 林小華 │
├──────────────────────────────────────────────────────────────┤
│ 📊 即時概況                                          2025/09/27 10:30 │
│                                                                      │
│  ┌─────────┬─────────┬─────────┬─────────┐                        │
│  │ 👥 1,247 │ ✅ 856  │ 📋 234  │ 🆘 15   │                        │
│  │ 志工總數 │ 工作中  │ 待命中  │ 緊急任務│                        │
│  └─────────┴─────────┴─────────┴─────────┘                        │
│                                                                      │
│  ┌────────────────────────┬───────────────────────────────┐        │
│  │ 🗺️ 志工分布地圖         │  📋 待分配任務 (34)            │        │
│  │                        │                               │        │
│  │   [互動式地圖]          │  1. 砂婆噹路123號 (清理)       │        │
│  │   • 紅點：緊急任務      │     需要：3人 | 緊急           │        │
│  │   • 藍點：進行中        │     [ 分配志工 ]              │        │
│  │   • 綠點：已完成        │                               │        │
│  │                        │  2. 富田路88號 (物資搬運)      │        │
│  │                        │     需要：5人 | 一般           │        │
│  │                        │     [ 分配志工 ]              │        │
│  └────────────────────────┴───────────────────────────────┘        │
│                                                                      │
│  [ + 新增任務 ]  [ 📱 發送廣播通知 ]  [ 📊 匯出報表 ]             │
└──────────────────────────────────────────────────────────────┘
```

---

## 五、技術實現規格

### 5.1 認證技術堆疊

```typescript
// 技術選擇
{
  "前端": {
    "框架": "React + TypeScript",
    "UI庫": "Tailwind CSS + Headless UI",
    "狀態管理": "Zustand",
    "表單驗證": "React Hook Form + Zod"
  },
  "後端": {
    "框架": "Fastify + TypeScript",
    "ORM": "Prisma",
    "驗證": "JWT (jsonwebtoken)",
    "加密": "bcrypt (密碼) + crypto (AES-256)",
    "OTP": "speakeasy + twilio (簡訊)"
  },
  "資料庫": {
    "主資料庫": "PostgreSQL 16",
    "快取": "Redis (Session + OTP)",
    "全文搜尋": "PostgreSQL GIN index"
  },
  "基礎建設": {
    "部署": "Docker + Docker Compose",
    "HTTPS": "Let's Encrypt + Cloudflare",
    "監控": "Prometheus + Grafana",
    "日誌": "Pino (structured logging)"
  }
}
```

### 5.2 資料庫 Schema（認證相關）

```sql
-- 使用者表（統一認證）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE,  -- 手機號碼（志工、受災戶）
  email VARCHAR(255) UNIQUE,         -- Email（管理員）
  password_hash VARCHAR(255),        -- 僅管理員使用
  role VARCHAR(20) NOT NULL,         -- volunteer, victim, ngo_coordinator, admin
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, pending_verification

  -- 個資欄位（加密存儲）
  full_name_encrypted BYTEA,
  emergency_contact_encrypted BYTEA,

  -- 驗證狀態
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,  -- 受災戶需要人工審核
  verified_by UUID REFERENCES users(id),    -- 審核者
  verified_at TIMESTAMP,

  -- 雙因素認證
  totp_secret VARCHAR(255),          -- Google Authenticator
  backup_codes TEXT[],               -- 備用碼

  -- 登入紀錄
  last_login_at TIMESTAMP,
  last_login_ip INET,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 志工基本資料
CREATE TABLE volunteer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skills TEXT[],                     -- 技能標籤
  organization VARCHAR(255),          -- 所屬組織（可選）
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_tasks INT DEFAULT 0,
  rating DECIMAL(3,2),               -- 平均評價

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 受災戶資料
CREATE TABLE victim_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address_encrypted BYTEA,           -- 受災地址（加密）
  damage_description TEXT,
  damage_photos TEXT[],              -- S3 URLs
  verification_status VARCHAR(20),   -- pending, approved, rejected
  verification_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP 驗證碼（Redis + PostgreSQL 備份）
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,  -- 手機或Email
  code_hash VARCHAR(255) NOT NULL,   -- Hash後的OTP
  purpose VARCHAR(50) NOT NULL,      -- login, reset_password, 2fa
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  attempts INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier ON otp_codes(identifier, expires_at);

-- Session 管理
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_trusted BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);

-- 稽核日誌
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,      -- login, logout, view_data, assign_task, etc.
  resource_type VARCHAR(50),         -- user, task, announcement, etc.
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_data JSONB,                -- 請求參數
  response_status INT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);
```

### 5.3 API 端點設計

```typescript
// ============================================
// 志工認證 API
// ============================================

/**
 * 發送 OTP 到手機
 */
POST /api/auth/volunteer/send-otp
Request:
{
  "phoneNumber": "+886912345678",
  "agreedToTerms": true
}
Response:
{
  "success": true,
  "expiresIn": 300,  // 秒
  "message": "驗證碼已發送"
}

/**
 * 驗證 OTP 並登入
 */
POST /api/auth/volunteer/verify-otp
Request:
{
  "phoneNumber": "+886912345678",
  "otp": "123456"
}
Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "role": "volunteer",
    "isFirstLogin": false
  }
}

/**
 * 完成首次註冊資料
 */
POST /api/auth/volunteer/complete-profile
Headers: Authorization: Bearer {token}
Request:
{
  "fullName": "王小明",
  "emergencyContact": "+886912345679",
  "skills": ["physical_labor", "cooking"]
}
Response:
{
  "success": true,
  "user": { ... }
}

// ============================================
// 管理員認證 API
// ============================================

/**
 * 管理員登入（第一步：Email + 密碼）
 */
POST /api/auth/admin/login
Request:
{
  "email": "admin@tzuchi.org.tw",
  "password": "SecurePassword123!",
  "trustDevice": true
}
Response:
{
  "success": true,
  "requiresTwoFactor": true,
  "availableMethods": ["sms", "totp", "email"],
  "tempToken": "temp_xyz..."
}

/**
 * 管理員登入（第二步：2FA）
 */
POST /api/auth/admin/verify-2fa
Request:
{
  "tempToken": "temp_xyz...",
  "method": "totp",
  "code": "123456"
}
Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "role": "ngo_coordinator",
    "organization": "慈濟基金會",
    "permissions": ["view_volunteers", "assign_tasks", "view_victims"]
  }
}

// ============================================
// 通用 API
// ============================================

/**
 * 登出
 */
POST /api/auth/logout
Headers: Authorization: Bearer {token}
Response:
{
  "success": true
}

/**
 * 刷新 Token
 */
POST /api/auth/refresh
Headers: Authorization: Bearer {token}
Response:
{
  "success": true,
  "token": "new_token..."
}

/**
 * 取得當前使用者資訊
 */
GET /api/auth/me
Headers: Authorization: Bearer {token}
Response:
{
  "user": {
    "id": "uuid",
    "role": "volunteer",
    "phoneNumber": "+886912345678",
    "fullName": "王小明",
    "profile": { ... }
  }
}
```

### 5.4 安全機制實現

```typescript
// 密碼策略（僅管理員）
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  maxAge: 90,  // 天
};

// OTP 配置
const OTP_CONFIG = {
  length: 6,
  expiryTime: 5 * 60,  // 5分鐘
  maxAttempts: 5,
  cooldownTime: 15 * 60,  // 15分鐘冷卻
};

// JWT 配置
const JWT_CONFIG = {
  algorithm: 'HS256',
  expiresIn: '7d',  // 志工 Token 7天
  adminExpiresIn: '1h',  // 管理員 Token 1小時
  refreshTokenExpiresIn: '30d',
};

// Rate Limiting
const RATE_LIMITS = {
  otpRequest: {
    windowMs: 15 * 60 * 1000,  // 15分鐘
    max: 3,  // 最多3次
  },
  login: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  api: {
    windowMs: 1 * 60 * 1000,
    max: 100,
  },
};

// 登入失敗鎖定
const LOCKOUT_POLICY = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60,  // 15分鐘
  resetAttemptsAfter: 24 * 60 * 60,  // 24小時後重置計數
};
```

---

## 六、實施計畫

### 6.1 開發階段

| 階段 | 任務 | 時程 | 負責人 |
|------|------|------|--------|
| **Phase 1** | 資料庫 Schema 設計與建立 | 3天 | Backend Dev |
| | 志工登入 API 實作 | 5天 | Backend Dev |
| | 志工登入 UI | 5天 | Frontend Dev |
| **Phase 2** | 管理員登入 + 2FA | 5天 | Backend Dev |
| | 管理員後台 UI | 7天 | Frontend Dev |
| | 權限管理系統 | 3天 | Backend Dev |
| **Phase 3** | 受災戶註冊與審核 | 5天 | Full Stack |
| | 稽核日誌系統 | 3天 | Backend Dev |
| **Phase 4** | 安全測試與滲透測試 | 5天 | Security Team |
| | 性能測試（1000+ 並發） | 3天 | DevOps |
| | 使用者測試與優化 | 5天 | UX Team |

**總計：約 6-8 週**

### 6.2 測試計畫

#### 單元測試
- 所有 API 端點 100% 覆蓋率
- 認證邏輯測試（成功/失敗情境）
- 加密/解密功能測試

#### 整合測試
- 完整登入流程測試
- 角色權限測試
- Session 管理測試

#### 安全測試
- OWASP Top 10 檢測
- SQL Injection 測試
- XSS 測試
- CSRF 測試
- Rate Limiting 測試

#### 性能測試
- 1000 併發登入請求
- OTP 發送壓力測試
- 資料庫查詢性能

### 6.3 監控與維運

```typescript
// 需監控的指標
const MONITORING_METRICS = {
  // 認證相關
  "auth.login.success": "登入成功次數",
  "auth.login.failure": "登入失敗次數",
  "auth.otp.sent": "OTP 發送次數",
  "auth.otp.verified": "OTP 驗證成功次數",
  "auth.2fa.enabled": "2FA 啟用數",

  // 安全相關
  "security.lockout": "帳號鎖定次數",
  "security.suspicious_login": "可疑登入次數",
  "security.data_access": "敏感資料存取次數",

  // 性能相關
  "performance.login_time": "登入耗時",
  "performance.otp_delivery_time": "OTP 送達時間",
  "performance.api_response_time": "API 回應時間",
};

// 告警規則
const ALERT_RULES = {
  "登入失敗率 > 20%": "critical",
  "OTP 發送失敗率 > 5%": "warning",
  "API 回應時間 > 2s": "warning",
  "同一 IP 短時間內登入失敗 > 10次": "critical",
  "資料庫連線數 > 80%": "critical",
};
```

---

## 七、成本估算

### 7.1 基礎建設成本（月）

| 項目 | 規格 | 費用 | 說明 |
|------|------|------|------|
| **AWS EC2** | t3.medium x 2 | $60 | 應用伺服器 |
| **AWS RDS PostgreSQL** | db.t3.medium | $50 | 資料庫 |
| **AWS ElastiCache Redis** | cache.t3.micro | $15 | Session + Cache |
| **Cloudflare Pro** | 1 domain | $20 | CDN + DDoS 防護 |
| **Twilio SMS** | ~5000 則/月 | $350 | OTP 簡訊 |
| **AWS S3** | 100GB | $2 | 照片儲存 |
| **監控工具** | Grafana Cloud | $0 | 免費方案 |
| **總計** | - | **$497/月** | 約 NT$ 15,750 |

### 7.2 開發人力成本

| 角色 | 人數 | 時程 | 薪資（月） | 總成本 |
|------|------|------|-----------|--------|
| **全端工程師** | 2人 | 2個月 | NT$ 80,000 | NT$ 320,000 |
| **UI/UX 設計師** | 1人 | 1個月 | NT$ 70,000 | NT$ 70,000 |
| **資安顧問** | 1人 | 0.5個月 | NT$ 100,000 | NT$ 50,000 |
| **專案經理** | 1人 | 2個月 | NT$ 90,000 | NT$ 180,000 |
| **總計** | - | - | - | **NT$ 620,000** |

---

## 八、風險評估與對策

| 風險 | 機率 | 影響 | 對策 |
|------|------|------|------|
| **簡訊服務中斷** | 中 | 高 | 備援：Email OTP + 緊急人工驗證 |
| **大量假冒志工** | 中 | 中 | 首次登入需上傳照片 + 現場簽到確認 |
| **個資外洩** | 低 | 極高 | 加密存儲 + 定期安全稽核 + 保險 |
| **DDoS 攻擊** | 低 | 高 | Cloudflare DDoS 防護 + Rate Limiting |
| **資料庫損壞** | 低 | 極高 | 每日自動備份 + 異地備援 |
| **使用者不會操作** | 高 | 中 | 現場志工協助 + 簡化流程 + 教學影片 |

---

## 九、總結與建議

### 9.1 核心設計原則

1. **快速便捷**：志工使用手機號碼 + OTP，30秒內完成登入
2. **分級安全**：根據角色調整驗證強度，平衡安全與便利
3. **災區友善**：大按鈕、高對比、支援離線操作
4. **隱私保護**：個資加密、最小權限、定期刪除

### 9.2 關鍵成功因素

- ✅ **簡訊服務穩定性**：選擇可靠的 SMS 服務商（Twilio）
- ✅ **現場推廣**：印製 QR Code 海報，掃描即可註冊
- ✅ **使用者教育**：製作 30 秒教學影片
- ✅ **快速響應**：24 小時客服支援

### 9.3 後續擴展方向

1. **社群登入**：Google/Facebook/LINE 登入（降低註冊門檻）
2. **生物識別**：FaceID/指紋辨識（提升體驗）
3. **區塊鏈認證**：不可篡改的志工服務紀錄
4. **AI 異常偵測**：自動偵測可疑登入行為

---

## 附錄

### A. 參考資料

1. 花蓮光復志工救災報導 - 中央社
2. OWASP Authentication Cheat Sheet
3. GDPR 個資保護法規
4. Taiwan Personal Data Protection Act

### B. 相關文件

- `SECURITY_POLICY.md` - 資訊安全政策
- `API_DOCUMENTATION.md` - API 完整文件
- `DATABASE_SCHEMA.sql` - 資料庫 Schema
- `DEPLOYMENT_GUIDE.md` - 部署指南

### C. 聯絡資訊

- 技術負責人：[TBD]
- 資安負責人：[TBD]
- 專案經理：[TBD]

---

**文件版本**：1.0.0
**最後更新**：2025-10-02
**下次審查**：2025-10-09
