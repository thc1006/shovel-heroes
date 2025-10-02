# 前端頁面與 API 整合測試報告

**測試日期**: 2025-10-02
**測試環境**: http://31.41.34.19/
**測試類型**: 前端頁面可訪問性、API 端點整合、CORS 配置

---

## 📊 測試摘要

| 指標 | 結果 |
|------|------|
| **前端可訪問性** | ✅ 正常 |
| **API 端點總數** | 8 個 |
| **正常運作端點** | 5 個 (62.5%) |
| **異常端點** | 3 個 (37.5%) |
| **CORS 配置** | ✅ 正常 |
| **關鍵問題** | 3 個 |

---

## ✅ 正常運作的端點

### 1. Health Check
- **端點**: `GET /api/healthz`
- **狀態**: ✅ 200 OK
- **響應時間**: 0.003s
- **響應內容**: `{"status":"ok","db":"ok"}`

### 2. Disaster Areas (災區)
- **端點**: `GET /api/disaster-areas`
- **狀態**: ✅ 200 OK
- **資料筆數**: 4 筆
- **前端調用位置**:
  - `src/pages/Map.jsx:312`
  - `src/pages/Admin.jsx:64`
  - `src/pages/Layout.jsx:23`
  - 等 7 處

### 3. Grids (網格)
- **端點**: `GET /api/grids`
- **狀態**: ✅ 200 OK
- **資料筆數**: 13 筆
- **前端調用位置**:
  - `src/pages/Map.jsx:313`
  - `src/pages/Admin.jsx:65`
  - `src/pages/Volunteers.jsx:38`
  - 等 16 處

### 4. Announcements (公告)
- **端點**: `GET /api/announcements`
- **狀態**: ✅ 200 OK
- **資料筆數**: 2 筆
- **前端調用位置**:
  - `src/components/map/AnnouncementPanel.jsx:30`
  - `src/components/map/AnnouncementModal.jsx`

### 5. 前端首頁
- **URL**: `http://31.41.34.19/`
- **狀態**: ✅ 200 OK
- **響應時間**: 0.001s
- **頁面標題**: 鏟子英雄
- **React Root**: ✅ 存在

---

## ❌ 異常端點（關鍵問題）

### 🔴 問題 1: Volunteer Registrations (志工報名)

**端點**: `GET /api/volunteer-registrations`
**HTTP 狀態**: 500 Internal Server Error
**錯誤訊息**: `column "user_id" does not exist`

#### 問題分析
- **原因**: 後端程式碼使用 `user_id`，但資料庫 schema 使用 `volunteer_id`
- **影響範圍**:
  - GET /volunteer-registrations
  - POST /volunteer-registrations
  - PUT /volunteer-registrations/:id
  - GET /volunteers (聚合查詢)

#### 資料庫實際欄位
```sql
Table "public.volunteer_registrations"
- id (uuid)
- volunteer_id (uuid)    ← 實際欄位
- grid_id (uuid)
- disaster_area_id (uuid)
- registration_date (timestamp)
- status (text)
- notes (text)
- created_at (timestamp)
```

#### 後端程式碼錯誤
**位置**: `packages/backend/src/routes/volunteer-registrations.ts:20`

```typescript
// ❌ 錯誤寫法
const { rows } = await c.query(
  'SELECT id, grid_id, user_id, created_at FROM volunteer_registrations ...'
  //                    ^^^^^^^ 不存在的欄位
);
```

#### 修復方案
```typescript
// ✅ 正確寫法
const { rows } = await c.query(
  'SELECT id, grid_id, volunteer_id, status, created_at FROM volunteer_registrations ...'
  //                    ^^^^^^^^^^^^ 使用正確欄位名
);
```

**受影響的前端頁面**:
- `/admin` - 無法列出志工報名資料
- `/volunteers` - 無法更新志工狀態
- `/map` - 無法創建新的志工報名

---

### 🔴 問題 2: Supply Donations (物資捐贈)

**端點**: `GET /api/supply-donations`
**HTTP 狀態**: 500 Internal Server Error
**錯誤訊息**: `column "name" does not exist`

#### 問題分析
- **原因**: 後端程式碼使用 `name`，但資料庫 schema 使用 `donor_name` 和 `item_type`
- **影響範圍**:
  - GET /supply-donations
  - POST /supply-donations
  - PUT /supply-donations/:id

#### 資料庫實際欄位
```sql
Table "public.supply_donations"
- id (uuid)
- donor_name (text)      ← 實際欄位
- donor_contact (text)
- item_type (text)       ← 實際欄位
- quantity (integer)
- unit (text)
- disaster_area_id (uuid)
- grid_id (uuid)
- status (text)
- delivery_date (timestamp)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### 後端程式碼錯誤
**位置**: `packages/backend/src/routes/supply-donations.ts:25`

```typescript
// ❌ 錯誤寫法
const { rows } = await c.query(
  'SELECT id, grid_id, name, quantity, unit, donor_contact, created_at FROM supply_donations ...'
  //                    ^^^^ 不存在的欄位
);
```

#### 修復方案
```typescript
// ✅ 正確寫法
const { rows } = await c.query(
  'SELECT id, grid_id, donor_name, item_type, quantity, unit, donor_contact, status, created_at FROM supply_donations ...'
  //                    ^^^^^^^^^^  ^^^^^^^^^  加入正確欄位
);
```

**受影響的前端頁面**:
- `/supplies` - 無法列出物資捐贈資料（但目前前端似乎未直接調用此 API）

---

### 🔴 問題 3: Volunteers Aggregate (志工聚合查詢)

**端點**: `GET /api/volunteers`
**HTTP 狀態**: 500 Internal Server Error
**錯誤訊息**: `column vr.user_id does not exist`

#### 問題分析
- **原因**: JOIN 查詢中使用 `user_id`，但應使用 `volunteer_id`
- **位置**: `packages/backend/src/routes/volunteers.ts`

---

## 🔍 前端 API 調用分析

### DisasterArea API 調用 (✅ 正常)
| 方法 | 調用位置 | 後端端點 | 狀態 |
|------|----------|----------|------|
| `list()` | Map.jsx:312 | GET /disaster-areas | ✅ |
| `create()` | AddAreaModal.jsx:131 | POST /disaster-areas | ✅ |
| `delete()` | Admin.jsx:132 | DELETE /disaster-areas/:id | ✅ |

### Grid API 調用 (✅ 正常)
| 方法 | 調用位置 | 後端端點 | 狀態 |
|------|----------|----------|------|
| `list()` | Map.jsx:313 | GET /grids | ✅ |
| `get(id)` | GridDetailModal.jsx:176 | GET /grids/:id | ✅ |
| `create()` | AddGridModal.jsx:247 | POST /grids | ✅ |
| `update(id, data)` | Map.jsx:399 | PUT /grids/:id | ✅ |
| `delete(id)` | Admin.jsx:184 | DELETE /grids/:id | ✅ |

### VolunteerRegistration API 調用 (❌ 異常)
| 方法 | 調用位置 | 後端端點 | 狀態 |
|------|----------|----------|------|
| `list()` | Admin.jsx:66 | GET /volunteer-registrations | ❌ 500 |
| `create()` | GridDetailModal.jsx:121 | POST /volunteer-registrations | ❌ 需要認證 |
| `update(id, data)` | Volunteers.jsx:66 | PUT /volunteer-registrations/:id | ❌ 500 |
| `delete(id)` | Admin.jsx:174 | DELETE /volunteer-registrations/:id | ❌ 需要認證 |

### Announcement API 調用 (✅ 正常)
| 方法 | 調用位置 | 後端端點 | 狀態 |
|------|----------|----------|------|
| `list()` | AnnouncementPanel.jsx:30 | GET /announcements | ✅ |
| `create()` | AnnouncementModal.jsx:90 | POST /announcements | ✅ |
| `update(id, data)` | AnnouncementModal.jsx:88 | PUT /announcements/:id | ✅ |
| `delete(id)` | AnnouncementModal.jsx:104 | DELETE /announcements/:id | ✅ |

---

## 🌐 CORS 配置檢查

### Preflight Request Test (OPTIONS)
```
OPTIONS /api/grids HTTP/1.1
Origin: http://31.41.34.19

HTTP/1.1 204 No Content
access-control-allow-origin: http://31.41.34.19
access-control-allow-credentials: true
access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
access-control-allow-headers: Content-Type, Authorization
```

**結論**: ✅ CORS 配置正確，允許來自 `http://31.41.34.19` 的請求

---

## 🐳 Docker 容器狀態

| 容器 | 映像 | 狀態 | 健康檢查 | 端口 |
|------|------|------|----------|------|
| shovelheroes-backend | shovel-heroes-backend | Up 10 min | ✅ healthy | 8787 |
| shovelheroes-frontend | shovel-heroes-frontend | Up 41 min | ⚠️ unhealthy | 80, 443 |
| shovelheroes-postgres | postgres:16-alpine | Up 1 hour | ✅ healthy | 5432 |

**注意**: Frontend 容器標記為 unhealthy，需調查健康檢查配置。

---

## 📋 待修復清單

### 🔥 關鍵優先級 (Critical)

#### 1. 修復 volunteer_registrations schema 不匹配
- **檔案**: `packages/backend/src/routes/volunteer-registrations.ts`
- **修改內容**: 將所有 `user_id` 改為 `volunteer_id`
- **預計時間**: 15 分鐘
- **影響**: 修復後志工報名功能恢復正常

#### 2. 修復 supply_donations schema 不匹配
- **檔案**: `packages/backend/src/routes/supply-donations.ts`
- **修改內容**: 將 `name` 改為 `donor_name` 和 `item_type`
- **預計時間**: 15 分鐘
- **影響**: 修復後物資捐贈功能恢復正常

#### 3. 修復 volunteers 聚合查詢
- **檔案**: `packages/backend/src/routes/volunteers.ts`
- **修改內容**: JOIN 條件使用 `volunteer_id`
- **預計時間**: 10 分鐘

### ⚠️ 高優先級 (High)

#### 4. 新增整合測試
- **檔案**: `tests/integration/api-endpoints.test.js`
- **內容**: 測試所有 API 端點，防止 schema 不匹配
- **預計時間**: 2 小時

#### 5. 調查前端容器健康檢查失敗
- **位置**: Docker Compose / Nginx 配置
- **預計時間**: 30 分鐘

### 📌 中優先級 (Medium)

#### 6. 添加 CI/CD schema 驗證
- **檔案**: `.github/workflows/test.yml`
- **內容**: 確保後端程式碼與資料庫 schema 一致
- **預計時間**: 1 小時

---

## 🧪 後續測試建議

### 自動化測試
```bash
# 執行整合測試
npm run test:integration

# 檢查 API schema 一致性
npm run test:schema
```

### 手動瀏覽器測試
修復上述問題後，建議進行以下手動測試：

1. **訪問**: http://31.41.34.19/
2. **開啟**: 瀏覽器開發者工具 (F12)
3. **檢查**: Console 標籤（無錯誤訊息）
4. **檢查**: Network 標籤（所有 API 回應 200）
5. **測試頁面**:
   - `/map` - 地圖頁面，測試網格顯示
   - `/volunteers` - 志工管理，測試報名功能
   - `/supplies` - 物資管理，測試捐贈功能
   - `/admin` - 管理後台，測試所有 CRUD 操作

### 預期測試結果
- ✅ 無 CORS 錯誤
- ✅ 無 404 Not Found
- ✅ 無 500 Internal Server Error
- ✅ API 回應時間 < 1 秒
- ✅ 志工報名功能正常運作
- ✅ 物資捐贈功能正常運作

---

## 📞 聯絡資訊

測試完成後如有問題，請聯繫後端開發團隊進行修復。

**生成時間**: 2025-10-02 11:22:00 UTC
