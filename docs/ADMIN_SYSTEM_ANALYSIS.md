# 🔍 Shovel Heroes - 管理員系統深度分析報告

**專案**: Shovel Heroes - 災後救援志工媒合平台
**分析日期**: 2025-10-02
**分析範圍**: 管理員功能、認證系統、缺失項目
**基準文件**: README.md, CLAUDE.md, claude-prompts.md

---

## 📋 執行摘要

### 🎯 核心發現

1. **認證系統已設計但未部署** - Migration 0007_create_auth_system.sql 定義完整但未執行
2. **管理員功能架構存在但不完整** - 缺少實際的 RBAC 實作
3. **前端整合已完成但缺少認證 UI** - 所有 API 已對接，但無登入/註冊頁面
4. **RLS 安全政策過於簡陋** - 僅有基礎 SELECT policy，缺少完整權限控制

### 📊 完成度統計

| 類別 | 完成度 | 狀態 |
|------|--------|------|
| 後端 API 端點 | 100% (27/27) | ✅ 完成 |
| 前端 API 整合 | 100% | ✅ 完成 |
| Docker 部署 | 100% (4/4 容器) | ✅ 完成 |
| 認證系統設計 | 100% | ✅ 完成 |
| **認證系統部署** | **0%** | ❌ 未執行 |
| **管理員功能實作** | **30%** | ⚠️ 部分完成 |
| **RLS 安全政策** | **20%** | ⚠️ 不完整 |
| **前端認證 UI** | **0%** | ❌ 未實作 |
| OpenTelemetry | 0% | ❌ 未實作 |
| Email 通知 | 0% | ❌ 未實作 |

---

## 🔐 認證系統分析

### 1. 資料庫 Schema 設計 (Migration 0007)

**檔案**: `packages/backend/migrations/0007_create_auth_system.sql` (17.4 KB)

#### 1.1 Users 表格設計 ✅ 完整

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 認證資訊
  phone_number VARCHAR(20) UNIQUE,              -- 志工、受災戶使用
  email VARCHAR(255) UNIQUE,                     -- 管理員使用
  password_hash VARCHAR(255),                    -- 僅管理員需要密碼

  -- 角色與狀態
  role VARCHAR(20) NOT NULL CHECK (role IN (
    'volunteer',        -- 志工
    'victim',           -- 受災戶
    'ngo_coordinator',  -- NGO 協調員
    'regional_admin',   -- 區域管理員
    'data_analyst',     -- 數據分析師
    'super_admin'       -- 超級管理員
  )),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active',
    'suspended',
    'pending_verification',
    'inactive'
  )),

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特色功能**:
- ✅ 多角色系統（6 種角色）
- ✅ 加密個資（pgcrypto BYTEA）
- ✅ 雙因素認證（TOTP + Backup Codes）
- ✅ 登入安全（失敗次數、帳號鎖定）
- ✅ 多重驗證狀態（手機、Email、身份）
- ✅ 審核追蹤（verified_by, verified_at）

#### 1.2 Sessions 表格設計 ✅ 完整

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,              -- JWT token hash
  refresh_token_hash VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特色功能**:
- ✅ Refresh Token 支援
- ✅ IP 與 User-Agent 追蹤
- ✅ Session 過期管理
- ✅ 最後活動時間記錄

#### 1.3 Audit Logs 表格設計 ✅ 完整

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**用途**:
- ✅ 所有管理員操作追蹤
- ✅ 安全事件記錄
- ✅ 合規稽核
- ✅ 異常行為偵測

---

### 2. 實際資料庫狀態 ❌ 問題

**檢查結果** (Docker 容器內):

```sql
\d users

Table "public.users"
    Column    | Type | Collation | Nullable |      Default
--------------+------+-----------+----------+-------------------
 id           | uuid |           | not null | gen_random_uuid()
 phone        | text |           |          |
 display_name | text |           |          |
```

**⚠️ 嚴重問題**:
1. **Migration 0007 未執行** - 資料庫中的 users 表格只有 3 個欄位
2. **缺少所有認證相關欄位** - 無 email, password_hash, role 等
3. **sessions 表格不存在**
4. **audit_logs 表格不存在**

**原因分析**:
- node-pg-migrate 可能使用不同的 migration 追蹤表格名稱
- 查詢 `pgmigrations` 表格失敗 → 可能是 `migrations` 或其他名稱
- Migration 0007 (17.4 KB) 檔案存在但從未執行

---

### 3. 後端 API 端點狀態

#### 3.1 JWT 配置 ✅ 已完成

**檔案**: `packages/backend/src/index.ts` (Line 81-86)

```typescript
await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '24h', // Token expiry
  },
});
```

**安全檢查**:
```typescript
if (isProduction() && env.JWT_SECRET.includes('dev_secret')) {
  logger.fatal('SECURITY ERROR: JWT_SECRET is set to default value in production!');
  process.exit(1);
}
```

✅ **已正確配置**，JWT_SECRET 來自環境變數且有生產環境檢查。

#### 3.2 現有認證端點 ⚠️ 不完整

**檔案**: `packages/backend/src/routes/users.ts` (56 行)

```typescript
// ✅ 已實作
GET /users       - 列出所有使用者（應該需要管理員權限）
GET /me          - 取得當前認證使用者（需 JWT）

// ❌ 缺少
POST /auth/login          - 登入
POST /auth/register       - 註冊
POST /auth/logout         - 登出
POST /auth/refresh        - 刷新 Token
POST /auth/verify-email   - Email 驗證
POST /auth/reset-password - 重設密碼
POST /auth/change-password- 變更密碼
GET  /auth/me             - 取得個人資料
```

#### 3.3 管理員端點 ❌ 缺少

**應該要有的管理員功能**:

```typescript
// 使用者管理
GET    /admin/users                 - 列出所有使用者（分頁、篩選）
GET    /admin/users/:id             - 查看使用者詳情
PUT    /admin/users/:id             - 更新使用者資料
PATCH  /admin/users/:id/role        - 變更使用者角色
PATCH  /admin/users/:id/status      - 變更使用者狀態（封禁/啟用）
DELETE /admin/users/:id             - 刪除使用者

// 審核管理
GET    /admin/verifications         - 待審核清單
POST   /admin/verifications/:id/approve  - 核准
POST   /admin/verifications/:id/reject   - 拒絕

// 稽核日誌
GET    /admin/audit-logs            - 稽核日誌查詢
GET    /admin/audit-logs/:userId    - 特定使用者的操作記錄

// 系統監控
GET    /admin/stats                 - 系統統計資訊
GET    /admin/health/detailed       - 詳細健康檢查
```

---

## 👨‍💼 管理員功能分析

### 1. 目前管理員可以做什麼？

基於現有 27 個 API 端點和前端頁面：

#### ✅ 已實作的管理功能

| 功能 | 端點 | 頁面 | 權限控制 |
|------|------|------|---------|
| 網格管理 | POST/PUT/DELETE /grids | Admin.jsx | ❌ 無 RBAC |
| 公告管理 | POST/PUT/DELETE /announcements | Admin.jsx | ❌ 無 RBAC |
| 災區管理 | POST/PUT/DELETE /disaster-areas | Admin.jsx | ❌ 無 RBAC |
| 查看志工列表 | GET /volunteers | Volunteers.jsx | ❌ 無權限區分 |
| CSV 匯入匯出 | POST /functions/csv-* | Admin.jsx | ❌ 無 RBAC |

**問題**:
- ✅ 端點存在且功能正常
- ❌ **沒有角色權限檢查** (任何有 JWT 的人都可以操作)
- ❌ **沒有稽核日誌記錄**
- ❌ **沒有操作追蹤**

#### ❌ 缺少的核心管理功能

1. **使用者管理**
   - 查看所有使用者列表
   - 編輯使用者資料
   - 變更使用者角色（志工 → 管理員）
   - 封禁/解禁使用者
   - 查看使用者登入記錄

2. **審核管理**
   - 審核受災戶身份
   - 審核志工報名
   - 審核物資捐贈
   - 批次審核功能

3. **數據分析儀表板**
   - 志工統計（報名數、出席率）
   - 物資統計（捐贈數、分配數）
   - 網格狀態統計
   - 趨勢分析圖表

4. **系統監控**
   - API 請求統計
   - 錯誤率監控
   - 資料庫效能
   - 使用者活動熱力圖

5. **安全管理**
   - 查看稽核日誌
   - 異常登入偵測
   - 權限變更記錄
   - IP 黑名單管理

---

### 2. 管理員登入後應該能做什麼？

基於 Migration 0007 定義的 6 種角色，以下是建議的權限矩陣：

#### 2.1 Super Admin（超級管理員）

**最高權限**，可以執行所有操作：

```typescript
// 使用者管理
✅ 查看所有使用者
✅ 編輯任何使用者
✅ 變更任何使用者角色
✅ 封禁/刪除使用者
✅ 查看所有登入記錄

// 系統管理
✅ 系統設定變更
✅ 資料庫 Migration
✅ 查看所有稽核日誌
✅ 匯出所有資料

// 內容管理
✅ 管理所有網格
✅ 管理所有公告
✅ 管理所有災區
✅ 刪除任何內容
```

**登入後頁面**:
- `/admin/dashboard` - 完整儀表板
- `/admin/users` - 使用者管理
- `/admin/roles` - 角色權限管理
- `/admin/audit` - 稽核日誌
- `/admin/system` - 系統設定

#### 2.2 Regional Admin（區域管理員）

**區域範圍權限**：

```typescript
// 使用者管理（限本區域）
✅ 查看本區域使用者
✅ 審核志工報名
✅ 審核受災戶身份
❌ 變更使用者角色
❌ 刪除使用者

// 內容管理（限本區域）
✅ 管理本區域網格
✅ 管理本區域公告
✅ 管理本區域災區
✅ 查看本區域統計

// 審核管理
✅ 審核物資捐贈
✅ 審核志工報名
✅ 審核受災戶申請
```

**登入後頁面**:
- `/admin/dashboard` - 區域儀表板（限本區域資料）
- `/admin/grids` - 網格管理（限本區域）
- `/admin/volunteers` - 志工管理（限本區域）
- `/admin/verifications` - 審核管理

#### 2.3 NGO Coordinator（NGO 協調員）

**協調功能**：

```typescript
// 志工管理
✅ 查看志工列表
✅ 審核志工報名
✅ 分配志工任務
✅ 查看志工出席記錄

// 物資管理
✅ 查看物資捐贈
✅ 審核物資記錄
✅ 更新物資狀態
✅ 匯出物資報表

// 網格管理（限查看與更新狀態）
✅ 查看所有網格
✅ 更新網格狀態
❌ 新增/刪除網格
```

**登入後頁面**:
- `/coordinator/dashboard` - 協調員儀表板
- `/coordinator/volunteers` - 志工協調
- `/coordinator/supplies` - 物資協調
- `/coordinator/schedule` - 排程管理

#### 2.4 Data Analyst（數據分析師）

**唯讀分析權限**：

```typescript
// 數據查詢（唯讀）
✅ 查看所有統計資料
✅ 匯出數據報表
✅ 建立自訂查詢
✅ 查看歷史趨勢
❌ 修改任何資料

// 分析功能
✅ 建立儀表板
✅ 產生趨勢報告
✅ 匯出 CSV/Excel
✅ API 數據存取
```

**登入後頁面**:
- `/analytics/dashboard` - 分析儀表板
- `/analytics/reports` - 報表中心
- `/analytics/trends` - 趨勢分析
- `/analytics/export` - 數據匯出

#### 2.5 Volunteer（志工）

**基本使用者權限**：

```typescript
// 個人管理
✅ 查看個人資料
✅ 更新個人資料
✅ 查看報名記錄
✅ 取消報名

// 瀏覽功能
✅ 查看開放網格
✅ 查看公告
✅ 報名志工任務
❌ 查看其他志工資料
```

**登入後頁面**:
- `/profile` - 個人資料
- `/my-registrations` - 我的報名
- `/map` - 地圖（報名功能）

#### 2.6 Victim（受災戶）

**求助功能**：

```typescript
// 求助管理
✅ 提交求助申請
✅ 查看申請狀態
✅ 更新求助資訊
✅ 上傳證明文件

// 資源查詢
✅ 查看可用資源
✅ 查看志工資訊
❌ 查看其他受災戶
```

**登入後頁面**:
- `/victim/help-request` - 求助申請
- `/victim/status` - 申請狀態
- `/victim/resources` - 可用資源

---

### 3. 權限控制實作建議

#### 3.1 後端 RBAC 中介層

**檔案**: `packages/backend/src/lib/rbac.ts` (需新增)

```typescript
export const PERMISSIONS = {
  // 使用者管理
  'users:read': ['super_admin', 'regional_admin'],
  'users:write': ['super_admin'],
  'users:delete': ['super_admin'],
  'users:change_role': ['super_admin'],

  // 網格管理
  'grids:read': ['*'],  // 所有人可讀
  'grids:write': ['super_admin', 'regional_admin'],
  'grids:delete': ['super_admin'],

  // 審核管理
  'verifications:read': ['super_admin', 'regional_admin', 'ngo_coordinator'],
  'verifications:approve': ['super_admin', 'regional_admin'],

  // 數據分析
  'analytics:read': ['super_admin', 'data_analyst', 'regional_admin'],
  'analytics:export': ['super_admin', 'data_analyst'],
};

export function hasPermission(userRole: string, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles?.includes('*') || allowedRoles?.includes(userRole);
}

export function requirePermission(permission: string) {
  return async function(request, reply) {
    const userRole = request.user?.role;
    if (!hasPermission(userRole, permission)) {
      return reply.code(403).send({
        message: 'Forbidden: Insufficient permissions',
        required: permission
      });
    }
  };
}
```

**使用範例**:

```typescript
// 需要 super_admin 或 regional_admin 權限
app.post('/admin/users',
  { preHandler: [app.auth, requirePermission('users:write')] },
  async (req, reply) => {
    // 處理使用者新增...
  }
);
```

#### 3.2 前端權限控制

**檔案**: `src/hooks/usePermissions.js` (需新增)

```javascript
import { useAuth } from './useAuth';

const PERMISSIONS = {
  'users:read': ['super_admin', 'regional_admin'],
  'users:write': ['super_admin'],
  'grids:write': ['super_admin', 'regional_admin'],
  // ... 與後端同步
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles?.includes('*') || allowedRoles?.includes(user?.role);
  };

  const canRead = (resource) => hasPermission(`${resource}:read`);
  const canWrite = (resource) => hasPermission(`${resource}:write`);
  const canDelete = (resource) => hasPermission(`${resource}:delete`);

  return { hasPermission, canRead, canWrite, canDelete };
}
```

**使用範例**:

```jsx
function AdminPanel() {
  const { canWrite } = usePermissions();

  return (
    <div>
      {canWrite('grids') && (
        <button onClick={handleCreateGrid}>新增網格</button>
      )}
    </div>
  );
}
```

---

## 🔒 RLS (Row-Level Security) 分析

### 1. 目前 RLS 狀態 ⚠️ 嚴重不足

**檔案**: `packages/backend/migrations/0002_rls.sql` (僅 7 行)

```sql
-- Enable row level security and policies
alter table grids enable row level security;

-- Example: allow select to all, but updates only to owner via a join (placeholder)
-- For demo, we keep read-only public access; extend as needed.
create policy grids_select_all on grids for select using (true);
```

**問題分析**:
1. **只有 grids 表格啟用 RLS**
2. **只有 SELECT policy**（允許所有人讀取）
3. **沒有 INSERT/UPDATE/DELETE policy**
4. **沒有基於角色的權限控制**
5. **其他表格（announcements, volunteers, etc.）完全沒有 RLS**

### 2. 完整 RLS 政策建議

#### 2.1 Grids 表格 RLS

**檔案**: `packages/backend/sql/rls/grids_policies.sql` (需新增)

```sql
-- 啟用 RLS
ALTER TABLE grids ENABLE ROW LEVEL SECURITY;

-- Policy 1: 所有人可以讀取開放狀態的網格
CREATE POLICY grids_select_public ON grids
  FOR SELECT
  USING (
    status IN ('open', 'in_progress')
    OR
    current_setting('app.user_role', true)::text IN ('super_admin', 'regional_admin', 'ngo_coordinator')
  );

-- Policy 2: 只有管理員可以新增網格
CREATE POLICY grids_insert_admin ON grids
  FOR INSERT
  WITH CHECK (
    current_setting('app.user_role', true)::text IN ('super_admin', 'regional_admin')
  );

-- Policy 3: 只有管理員可以更新網格
CREATE POLICY grids_update_admin ON grids
  FOR UPDATE
  USING (
    current_setting('app.user_role', true)::text IN ('super_admin', 'regional_admin')
  )
  WITH CHECK (
    current_setting('app.user_role', true)::text IN ('super_admin', 'regional_admin')
  );

-- Policy 4: 只有 super_admin 可以刪除網格
CREATE POLICY grids_delete_super_admin ON grids
  FOR DELETE
  USING (
    current_setting('app.user_role', true)::text = 'super_admin'
  );
```

#### 2.2 Users 表格 RLS

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: 使用者可以查看自己的完整資料
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (
    id::text = current_setting('app.user_id', true)::text
    OR
    current_setting('app.user_role', true)::text IN ('super_admin', 'regional_admin')
  );

-- Policy 2: 使用者可以更新自己的資料（部分欄位）
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (id::text = current_setting('app.user_id', true)::text)
  WITH CHECK (
    id::text = current_setting('app.user_id', true)::text
    AND role = OLD.role  -- 不能自己變更角色
    AND status = OLD.status  -- 不能自己變更狀態
  );

-- Policy 3: 只有管理員可以變更角色和狀態
CREATE POLICY users_update_admin ON users
  FOR UPDATE
  USING (
    current_setting('app.user_role', true)::text IN ('super_admin', 'regional_admin')
  );
```

#### 2.3 Audit Logs 表格 RLS

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: 只允許插入（append-only）
CREATE POLICY audit_logs_insert_all ON audit_logs
  FOR INSERT
  WITH CHECK (true);  -- 所有認證使用者都可以寫入

-- Policy 2: 只有管理員可以讀取
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    current_setting('app.user_role', true)::text IN ('super_admin', 'data_analyst')
  );

-- Policy 3: 禁止更新和刪除（稽核日誌不可變）
-- 不建立 UPDATE/DELETE policy = 預設禁止
```

### 3. 後端 RLS 設定實作

**檔案**: `packages/backend/src/lib/db.ts` (需修改)

**目前實作** (Line 1-30):
```typescript
export async function withConn<T>(
  fn: (c: PoolClient) => Promise<T>,
  userId?: string
): Promise<T> {
  const client = await pool.connect();
  try {
    if (userId) {
      await client.query('SET LOCAL app.user_id = $1', [userId]);
    }
    return await fn(client);
  } finally {
    client.release();
  }
}
```

**需要擴充為**:
```typescript
export async function withConn<T>(
  fn: (c: PoolClient) => Promise<T>,
  userId?: string,
  userRole?: string  // 新增 role 參數
): Promise<T> {
  const client = await pool.connect();
  try {
    // 設定使用者 ID 和角色供 RLS 使用
    if (userId) {
      await client.query('SET LOCAL app.user_id = $1', [userId]);
    }
    if (userRole) {
      await client.query('SET LOCAL app.user_role = $1', [userRole]);
    }
    return await fn(client);
  } finally {
    client.release();
  }
}
```

**路由使用範例**:
```typescript
app.get('/grids', { preHandler: [app.auth] }, async (req: any, reply) => {
  const userId = req.user?.sub;
  const userRole = req.user?.role;  // 從 JWT 取得角色

  const grids = await withConn(async (c) => {
    const { rows } = await c.query('SELECT * FROM grids');
    return rows;
  }, userId, userRole);  // 傳入 role

  return grids;
});
```

---

## 📝 缺失項目完整清單

### 🔴 Priority 0 (緊急 - 系統無法正常運作)

#### 1. **執行 Migration 0007** ⚠️ 最高優先級

**問題**: 認證系統 schema 未部署到資料庫

**解決方案**:
```bash
# 檢查 migration 追蹤表格名稱
docker exec shovelheroes-postgres psql -U postgres -d shovelheroes -c "\dt" | grep migr

# 手動執行 migration
cd packages/backend
npm run migrate:up

# 驗證
docker exec shovelheroes-postgres psql -U postgres -d shovelheroes -c "\d users"
# 應該看到 role, email, password_hash 等欄位
```

**影響**:
- ❌ 無法登入/註冊
- ❌ 無法使用角色權限
- ❌ 無法追蹤稽核日誌

**預估時間**: 30 分鐘

---

#### 2. **實作登入/註冊 API** ⚠️ 緊急

**需要新增的端點**:

```typescript
// packages/backend/src/routes/auth.ts (新檔案)

POST   /auth/register          - 使用者註冊
POST   /auth/login             - 使用者登入
POST   /auth/logout            - 使用者登出
POST   /auth/refresh           - 刷新 Token
POST   /auth/verify-email      - Email 驗證
POST   /auth/forgot-password   - 忘記密碼
POST   /auth/reset-password    - 重設密碼
GET    /auth/me                - 取得當前使用者
```

**實作範例** (packages/backend/src/routes/auth.ts):

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { withConn } from '../lib/db.js';

const RegisterSchema = z.object({
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['volunteer', 'victim']),  // 只允許註冊這兩種角色
  full_name: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  password: z.string().optional(),
  otp_code: z.string().optional(),  // 手機 OTP
});

export function registerAuthRoutes(app: FastifyInstance) {
  // 註冊
  app.post('/auth/register', async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid payload',
        issues: parsed.error.issues
      });
    }

    const { email, phone_number, password, role, full_name } = parsed.data;

    // 驗證至少有 email 或 phone_number
    if (!email && !phone_number) {
      return reply.code(400).send({
        message: 'Either email or phone_number is required'
      });
    }

    try {
      const user = await withConn(async (c) => {
        // 檢查重複
        if (email) {
          const { rows } = await c.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
          );
          if (rows.length > 0) {
            throw new Error('Email already exists');
          }
        }

        if (phone_number) {
          const { rows } = await c.query(
            'SELECT id FROM users WHERE phone_number = $1',
            [phone_number]
          );
          if (rows.length > 0) {
            throw new Error('Phone number already exists');
          }
        }

        // Hash 密碼（如果有）
        const passwordHash = password
          ? await bcrypt.hash(password, 10)
          : null;

        // 加密個資
        const fullNameEncrypted = await c.query(
          "SELECT pgp_sym_encrypt($1, $2) as encrypted",
          [full_name, process.env.ENCRYPTION_KEY]
        );

        // 插入使用者
        const { rows } = await c.query(`
          INSERT INTO users (
            email, phone_number, password_hash, role,
            full_name_encrypted, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, email, phone_number, role, status, created_at
        `, [
          email, phone_number, passwordHash, role,
          fullNameEncrypted.rows[0].encrypted,
          'pending_verification'
        ]);

        return rows[0];
      });

      // 產生 JWT
      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
        email: user.email,
      }, { expiresIn: '24h' });

      // TODO: 發送驗證 Email/SMS

      return {
        user,
        token,
        message: 'Registration successful. Please verify your email/phone.'
      };
    } catch (err: any) {
      app.log.error(err);
      if (err.message.includes('already exists')) {
        return reply.code(409).send({ message: err.message });
      }
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // 登入
  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid payload',
        issues: parsed.error.issues
      });
    }

    const { email, phone_number, password, otp_code } = parsed.data;

    try {
      const user = await withConn(async (c) => {
        // 查詢使用者
        let query = 'SELECT * FROM users WHERE ';
        let params: any[] = [];

        if (email) {
          query += 'email = $1';
          params.push(email);
        } else if (phone_number) {
          query += 'phone_number = $1';
          params.push(phone_number);
        } else {
          throw new Error('Email or phone_number required');
        }

        const { rows } = await c.query(query, params);
        if (rows.length === 0) {
          throw new Error('Invalid credentials');
        }

        const user = rows[0];

        // 檢查帳號狀態
        if (user.status === 'suspended') {
          throw new Error('Account suspended');
        }

        // 檢查鎖定
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          throw new Error('Account locked. Try again later.');
        }

        // 驗證密碼
        if (password && user.password_hash) {
          const valid = await bcrypt.compare(password, user.password_hash);
          if (!valid) {
            // 增加失敗次數
            await c.query(`
              UPDATE users
              SET failed_login_attempts = failed_login_attempts + 1,
                  locked_until = CASE
                    WHEN failed_login_attempts + 1 >= 5
                    THEN NOW() + INTERVAL '30 minutes'
                    ELSE NULL
                  END
              WHERE id = $1
            `, [user.id]);

            throw new Error('Invalid credentials');
          }
        }

        // TODO: 驗證 OTP (如果使用手機登入)

        // 重置失敗次數並更新登入資訊
        await c.query(`
          UPDATE users
          SET failed_login_attempts = 0,
              locked_until = NULL,
              last_login_at = NOW(),
              last_login_ip = $1
          WHERE id = $2
        `, [req.ip, user.id]);

        return user;
      });

      // 產生 JWT
      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
        email: user.email,
        phone_number: user.phone_number,
      }, { expiresIn: '24h' });

      // 產生 Refresh Token
      const refreshToken = await reply.jwtSign({
        sub: user.id,
        type: 'refresh',
      }, { expiresIn: '7d' });

      // 儲存 Session
      await withConn(async (c) => {
        const tokenHash = await bcrypt.hash(token, 10);
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        await c.query(`
          INSERT INTO sessions (
            user_id, token_hash, refresh_token_hash,
            ip_address, user_agent, expires_at
          ) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')
        `, [
          user.id, tokenHash, refreshTokenHash,
          req.ip, req.headers['user-agent']
        ]);
      });

      // 記錄稽核日誌
      await withConn(async (c) => {
        await c.query(`
          INSERT INTO audit_logs (
            user_id, action, ip_address, user_agent, metadata
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          user.id, 'login', req.ip, req.headers['user-agent'],
          JSON.stringify({ method: password ? 'password' : 'otp' })
        ]);
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          status: user.status,
        },
        token,
        refreshToken,
      };
    } catch (err: any) {
      app.log.error(err);
      return reply.code(401).send({ message: 'Invalid credentials' });
    }
  });

  // 登出
  app.post('/auth/logout',
    { preHandler: [app.auth] },
    async (req: any, reply) => {
      const userId = req.user?.sub;
      const token = req.headers.authorization?.replace('Bearer ', '');

      await withConn(async (c) => {
        // 刪除 Session
        const tokenHash = await bcrypt.hash(token, 10);
        await c.query(
          'DELETE FROM sessions WHERE user_id = $1 AND token_hash = $2',
          [userId, tokenHash]
        );

        // 記錄稽核日誌
        await c.query(`
          INSERT INTO audit_logs (user_id, action, ip_address)
          VALUES ($1, $2, $3)
        `, [userId, 'logout', req.ip]);
      });

      return { message: 'Logged out successfully' };
    }
  );

  // 刷新 Token
  app.post('/auth/refresh', async (req, reply) => {
    const { refresh_token } = req.body;

    try {
      // 驗證 Refresh Token
      const payload = await app.jwt.verify(refresh_token);

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // 產生新的 Access Token
      const token = await reply.jwtSign({
        sub: payload.sub,
        role: payload.role,
        email: payload.email,
      }, { expiresIn: '24h' });

      return { token };
    } catch (err) {
      return reply.code(401).send({ message: 'Invalid refresh token' });
    }
  });
}
```

**預估時間**: 4-6 小時

---

#### 3. **實作前端登入/註冊頁面** ⚠️ 緊急

**需要新增的頁面**:

```
src/pages/
  ├── Login.jsx           - 登入頁面
  ├── Register.jsx        - 註冊頁面
  ├── ForgotPassword.jsx  - 忘記密碼
  └── ResetPassword.jsx   - 重設密碼
```

**實作範例** (src/pages/Login.jsx):

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { http } from '@/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await http.post('/auth/login', {
        email,
        password
      });

      // 儲存 Token
      localStorage.setItem('jwt_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      toast({
        title: '登入成功',
        description: `歡迎回來，${response.user.email}`,
      });

      // 根據角色導向不同頁面
      if (response.user.role === 'super_admin' ||
          response.user.role === 'regional_admin') {
        navigate('/admin/dashboard');
      } else if (response.user.role === 'ngo_coordinator') {
        navigate('/coordinator/dashboard');
      } else if (response.user.role === 'data_analyst') {
        navigate('/analytics/dashboard');
      } else {
        navigate('/map');
      }
    } catch (error) {
      toast({
        title: '登入失敗',
        description: error.response?.data?.message || '帳號或密碼錯誤',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">
            鏟子英雄 - 登入
          </h2>
          <p className="mt-2 text-center text-gray-600">
            災後救援志工媒合平台
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div>
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <a
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              忘記密碼？
            </a>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </Button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              還沒有帳號？
            </span>
            <a
              href="/register"
              className="text-sm text-blue-600 hover:underline ml-1"
            >
              立即註冊
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**API Client 更新** (src/api/client.js):

```javascript
// 自動附加 JWT Token
async function request(path, {
  method = 'GET',
  headers = {},
  body,
  timeout = API_TIMEOUT,
} = {}) {
  const url = `${API_BASE_URL}${path}`;

  // 從 localStorage 取得 Token
  const token = localStorage.getItem('jwt_token');

  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...headers,
    ...(token && { 'Authorization': `Bearer ${token}` })  // 自動附加
  };

  // ... 後續邏輯相同
}

// Token 刷新邏輯
export async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json();
  localStorage.setItem('jwt_token', data.token);
  return data.token;
}
```

**路由更新** (src/pages/index.jsx):

```jsx
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";

const PAGES = {
  Map: Map,
  Login: Login,           // 新增
  Register: Register,     // 新增
  ForgotPassword: ForgotPassword,  // 新增
  Volunteers: Volunteers,
  // ...
};

// 路由配置
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />

  {/* 受保護路由 */}
  <Route path="/admin/*" element={<ProtectedRoute roles={['super_admin', 'regional_admin']}><Admin /></ProtectedRoute>} />
  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

  {/* ... */}
</Routes>
```

**預估時間**: 3-4 小時

---

### 🟠 Priority 1 (高 - 核心功能缺失)

#### 4. **完善 RLS 政策**

**需要新增**:
- `packages/backend/sql/rls/grids_policies.sql`
- `packages/backend/sql/rls/users_policies.sql`
- `packages/backend/sql/rls/announcements_policies.sql`
- `packages/backend/sql/rls/volunteers_policies.sql`
- `packages/backend/sql/rls/supply_donations_policies.sql`
- `packages/backend/sql/rls/audit_logs_policies.sql`

**預估時間**: 4-6 小時

---

#### 5. **實作管理員後台 API**

**需要新增的端點**:

```typescript
// packages/backend/src/routes/admin.ts

// 使用者管理
GET    /admin/users
GET    /admin/users/:id
PUT    /admin/users/:id
PATCH  /admin/users/:id/role
PATCH  /admin/users/:id/status
DELETE /admin/users/:id

// 審核管理
GET    /admin/verifications
POST   /admin/verifications/:id/approve
POST   /admin/verifications/:id/reject

// 稽核日誌
GET    /admin/audit-logs
GET    /admin/audit-logs/:userId

// 系統監控
GET    /admin/stats
GET    /admin/health/detailed
```

**RBAC 中介層實作**:
```typescript
// packages/backend/src/lib/rbac.ts
```

**預估時間**: 6-8 小時

---

#### 6. **實作管理員前端頁面**

**需要新增的頁面**:

```
src/pages/admin/
  ├── Dashboard.jsx       - 管理員儀表板
  ├── Users.jsx           - 使用者管理
  ├── UserEdit.jsx        - 編輯使用者
  ├── Verifications.jsx   - 審核管理
  ├── AuditLogs.jsx       - 稽核日誌
  └── SystemStats.jsx     - 系統統計
```

**預估時間**: 8-10 小時

---

### 🟡 Priority 2 (中 - 改善項目)

#### 7. **OpenTelemetry 可觀測性**

**需要新增**:
- `packages/backend/src/otel/init.ts`
- OpenTelemetry SDK 配置
- Auto-instrumentations
- 匯出到 Console 或 OTEL Collector

**參考**: claude-prompts.md Phase 4.1

**預估時間**: 3-4 小時

---

#### 8. **Email 通知系統**

**需要新增**:
- `packages/backend/src/lib/email.ts`
- Email 模板
- 與 MailHog 整合測試
- `/debug/send-mail` 測試端點

**參考**: claude-prompts.md Phase 4.2

**預估時間**: 4-6 小時

---

#### 9. **Prettier 配置**

**需要新增**:
- `.prettierrc.json`
- `.prettierignore`
- 整合到 package.json scripts

**預估時間**: 30 分鐘

---

#### 10. **CODEOWNERS 檔案**

**需要新增**:
- `.github/CODEOWNERS`
- 定義程式碼負責人

**預估時間**: 15 分鐘

---

#### 11. **OpenAPI 文件完整性**

**需要檢查並更新**:
- `api-spec/openapi.yaml`
- 補充缺少的端點定義（/auth/*, /admin/*）
- 更新 components/schemas
- 執行 `npm run openapi:lint` 檢查

**預估時間**: 2-3 小時

---

#### 12. **測試覆蓋率提升**

**目前狀態**: 17 個測試文件

**需要新增測試**:
- Auth 端點測試（登入/註冊/登出）
- Admin 端點測試（RBAC 驗證）
- RLS 政策測試
- E2E 測試（Cypress/Playwright）

**執行 Coverage**:
```bash
npm run test:coverage
```

**目標**: 80% 以上覆蓋率

**預估時間**: 8-12 小時

---

#### 13. **CI/CD 強化**

**參考**: claude-prompts.md Phase 0.2

**需要新增**:
- Node 20 matrix testing
- Cache pnpm
- 上傳 Redoc static HTML 為 artifact
- 自動部署到 Staging

**預估時間**: 2-3 小時

---

### 🟢 Priority 3 (低 - 優化項目)

#### 14. **前端 Code Splitting**

**問題**: Bundle size 651 KB

**解決方案**:
```javascript
const Map = lazy(() => import('./pages/Map'));
const Admin = lazy(() => import('./pages/Admin'));
```

**預估時間**: 2-3 小時

---

#### 15. **PWA 支援**

**需要新增**:
- Service Worker
- manifest.json
- 離線支援

**預估時間**: 4-6 小時

---

#### 16. **監控儀表板**

**需要新增**:
- Prometheus metrics
- Grafana dashboard
- 告警規則

**預估時間**: 6-8 小時

---

## 📊 優先級時間規劃

### Phase 1: 緊急修復 (Priority 0) - 1-2 天

| 項目 | 時間 | 負責人建議 |
|------|------|----------|
| 執行 Migration 0007 | 0.5 小時 | DevOps |
| 登入/註冊 API | 6 小時 | Backend Dev |
| 登入/註冊前端 | 4 小時 | Frontend Dev |
| **總計** | **10.5 小時** | |

**里程碑**: 使用者可以註冊、登入、取得 JWT Token

---

### Phase 2: 核心功能 (Priority 1) - 3-5 天

| 項目 | 時間 | 負責人建議 |
|------|------|----------|
| 完善 RLS 政策 | 6 小時 | Backend Dev |
| 管理員後台 API | 8 小時 | Backend Dev |
| 管理員前端頁面 | 10 小時 | Frontend Dev |
| **總計** | **24 小時** | |

**里程碑**: 管理員可以管理使用者、審核申請、查看稽核日誌

---

### Phase 3: 改善項目 (Priority 2) - 5-7 天

| 項目 | 時間 | 負責人建議 |
|------|------|----------|
| OpenTelemetry | 4 小時 | DevOps |
| Email 通知 | 6 小時 | Backend Dev |
| Prettier + CODEOWNERS | 1 小時 | Any |
| OpenAPI 完整性 | 3 小時 | Backend Dev |
| 測試覆蓋率 | 12 小時 | QA Engineer |
| CI/CD 強化 | 3 小時 | DevOps |
| **總計** | **29 小時** | |

**里程碑**: 完整的可觀測性、測試覆蓋率達標、自動化 CI/CD

---

### Phase 4: 優化項目 (Priority 3) - 3-5 天

| 項目 | 時間 | 負責人建議 |
|------|------|----------|
| Code Splitting | 3 小時 | Frontend Dev |
| PWA 支援 | 6 小時 | Frontend Dev |
| 監控儀表板 | 8 小時 | DevOps |
| **總計** | **17 小時** | |

**里程碑**: 效能優化、離線支援、完整監控

---

## 🎯 總結與建議

### 核心問題

1. **認證系統已設計但未部署** - Migration 0007 (17.4 KB) 包含完整的多角色認證系統，但從未執行
2. **RLS 政策嚴重不足** - 只有一個簡單的 `grids_select_all` policy，完全無法保護資料
3. **管理員功能不完整** - 有架構但缺少實際的 RBAC 實作和管理 UI
4. **前端缺少認證流程** - 無登入/註冊頁面，使用者無法取得 JWT Token

### 立即行動建議

**第一步** (今天):
```bash
# 執行 Migration 0007
cd packages/backend
npm run migrate:up

# 驗證
docker exec shovelheroes-postgres psql -U postgres -d shovelheroes -c "\d users"
```

**第二步** (本週):
1. 實作 POST /auth/login, POST /auth/register
2. 實作前端 Login.jsx, Register.jsx
3. 測試完整登入流程

**第三步** (下週):
1. 實作完整 RLS 政策
2. 實作管理員後台 API (/admin/*)
3. 實作管理員前端頁面

### 管理員功能完整清單

登入後，根據不同角色可以執行的操作：

#### Super Admin
- ✅ 管理所有使用者（新增/編輯/刪除/變更角色）
- ✅ 管理所有網格/公告/災區
- ✅ 審核所有申請
- ✅ 查看所有稽核日誌
- ✅ 系統設定變更
- ✅ 匯出所有資料

#### Regional Admin
- ✅ 管理本區域使用者
- ✅ 管理本區域網格/公告
- ✅ 審核本區域申請
- ✅ 查看本區域統計

#### NGO Coordinator
- ✅ 協調志工任務
- ✅ 管理物資分配
- ✅ 更新網格狀態

#### Data Analyst
- ✅ 查看所有統計資料（唯讀）
- ✅ 匯出分析報表
- ✅ 建立自訂儀表板

### 預估完成時間

- **Phase 1 (緊急)**: 1-2 天（10.5 小時）
- **Phase 2 (核心)**: 3-5 天（24 小時）
- **Phase 3 (改善)**: 5-7 天（29 小時）
- **Phase 4 (優化)**: 3-5 天（17 小時）

**總計**: **12-19 天** (80.5 工時)

---

**報告生成時間**: 2025-10-02
**分析完成度**: 100%
**後續行動**: 請先執行 Migration 0007，然後逐步實作 Phase 1 項目
