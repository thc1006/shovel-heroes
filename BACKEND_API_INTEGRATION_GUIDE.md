# 📊 Shovel Heroes - 後端 API 整合完整指南

> **版本**: 1.0.0
> **更新日期**: 2025-10-02
> **適用對象**: 後端開發者、前端整合開發者、系統架構師

---

## 📋 目錄

- [執行摘要](#執行摘要)
- [Port 配置總覽](#port-配置總覽)
- [REST API 端點清單](#rest-api-端點清單)
- [認證與授權機制](#認證與授權機制)
- [資料結構定義](#資料結構定義)
- [資料庫 Schema](#資料庫-schema)
- [環境變數配置](#環境變數配置)
- [啟動指令](#啟動指令)
- [前端 API 呼叫統計](#前端-api-呼叫統計)
- [資料流向圖](#資料流向圖)
- [實作建議](#實作建議)
- [API 測試清單](#api-測試清單)

---

## 🎯 執行摘要

Shovel Heroes 是一個**災後救援志工媒合平台**，目前具備**雙模式**運行能力：

### 運行模式

1. **前端獨立模式** (當前預設)
   - 使用 LocalStorage 儲存所有資料
   - 不需要後端伺服器
   - 適合快速展示與開發

2. **前後端整合模式** (需實作)
   - 透過 REST API 與後端通訊
   - 資料持久化於 PostgreSQL
   - 支援多使用者協作

### 技術棧

**前端**:
- React 18.2.0
- Vite 6.1.0
- React Router DOM 7.2.0
- Leaflet (地圖)
- Tailwind CSS + shadcn/ui

**後端**:
- Fastify 4.28.1
- PostgreSQL (pg 8.13.1)
- Zod (資料驗證)
- TypeScript 5.6.3

---

## 🔌 Port 配置總覽

| 服務 | Port | 配置檔案 | 說明 |
|------|------|---------|------|
| **前端開發伺服器** | `5173` | `vite.config.js:17` | Vite Dev Server |
| **後端 API 伺服器** | `8787` | `packages/backend/src/index.ts:45` | Fastify (自動遞增 Port) |
| **PostgreSQL 資料庫** | `5432` | `docker-compose.yml:11` | Docker Container |

### 後端 Port 自動遞增機制

```typescript
// packages/backend/src/index.ts:45-66
const basePort = Number(process.env.PORT) || 8787;
let port = basePort;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    await app.listen({ port, host: '0.0.0.0' });
    if (port !== basePort) {
      app.log.warn(`Started on fallback port ${port}`);
    }
    return;
  } catch (err: any) {
    if (err && err.code === 'EADDRINUSE') {
      port++;
      continue;
    }
  }
}
```

**說明**: 如果 8787 被占用，會自動嘗試 8788, 8789... (最多 5 次)

---

## 📡 REST API 端點清單

> **總計**: 31 個端點
> **OpenAPI 規格**: `api-spec/openapi.yaml` (870 行)
> **後端實作**: `packages/backend/src/routes/`

### 1️⃣ 災區管理 (Disaster Areas)

**基礎路徑**: `/disaster-areas`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/disaster-areas` | 列出所有災區 | ❌ | `routes/disaster-areas.ts:9` |
| POST | `/disaster-areas` | 新增災區 | ✅ Bearer | `routes/disaster-areas.ts:13` |
| GET | `/disaster-areas/:id` | 取得單一災區 | ❌ | `routes/disaster-areas.ts:23` |
| PUT | `/disaster-areas/:id` | 更新災區 | ✅ Bearer | `routes/disaster-areas.ts:30` |
| DELETE | `/disaster-areas/:id` | 刪除災區 | ✅ Bearer | `routes/disaster-areas.ts:38` |

**請求/回應範例**:

```json
// POST /disaster-areas
{
  "name": "光復鄉重災區",
  "center_lat": 23.8751,
  "center_lng": 121.578
}

// Response 201 Created
{
  "id": "area_01HZYQ9W123ABCDEF",
  "name": "光復鄉重災區",
  "center_lat": 23.8751,
  "center_lng": 121.578,
  "created_at": "2025-10-02T08:12:30Z",
  "updated_at": "2025-10-02T08:12:30Z"
}
```

**前端呼叫點**:
- `src/pages/Map.jsx:312` - `DisasterArea.list()`
- `src/pages/Admin.jsx` - CRUD 操作

---

### 2️⃣ 救援網格 (Grids)

**基礎路徑**: `/grids`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/grids` | 列出所有網格 | ❌ | `routes/grids.ts:17` |
| POST | `/grids` | 新增網格 | ✅ Bearer | `routes/grids.ts:22` |
| GET | `/grids/:id` | 取得單一網格 | ❌ | `routes/grids.ts:38` |
| PUT | `/grids/:id` | 更新網格 | ✅ Bearer | 需實作 |
| DELETE | `/grids/:id` | 刪除網格 | ✅ Bearer | 需實作 |

**網格類型 (grid_type)**:
- `mud_disposal` - 污泥暫置場
- `manpower` - 人力任務
- `supply_storage` - 物資停放處
- `accommodation` - 住宿地點
- `food_area` - 領吃食區域

**網格狀態 (status)**:
- `open` - 開放中
- `closed` - 已關閉
- `completed` - 已完成
- `pending` - 準備中

**請求/回應範例**:

```json
// POST /grids
{
  "code": "A-3",
  "grid_type": "manpower",
  "disaster_area_id": "area_01HZYQ9W123ABCDEF",
  "volunteer_needed": 10,
  "volunteer_registered": 0,
  "center_lat": 23.87525,
  "center_lng": 121.57812,
  "bounds": {
    "north": 23.876,
    "south": 23.874,
    "east": 121.579,
    "west": 121.577
  },
  "status": "open",
  "meeting_point": "光復國小正門",
  "risks_notes": "地面濕滑，注意積水與電線",
  "contact_info": "0912-345-678",
  "supplies_needed": [
    {
      "name": "鋤頭",
      "quantity": 20,
      "unit": "支",
      "received": 5
    },
    {
      "name": "工作用手套",
      "quantity": 50,
      "unit": "副",
      "received": 10
    }
  ]
}

// Response 201 Created
{
  "id": "grid_01HZYQ9W456GHIJK",
  "code": "A-3",
  "grid_type": "manpower",
  // ... (same as request)
  "created_at": "2025-10-02T08:15:00Z",
  "updated_at": "2025-10-02T08:15:00Z"
}
```

**前端呼叫點**:
- `src/pages/Map.jsx:313` - `Grid.list()`
- `src/pages/Map.jsx:399` - `Grid.update(id, data)` (移動網格)
- `src/pages/Volunteers.jsx:38` - `Grid.list()` (選單)
- `src/pages/Supplies.jsx:40` - `Grid.list()` (物資需求)

**重要商業邏輯**:
1. 當志工報名時，`volunteer_registered` 需自動 +1
2. 當志工取消時，`volunteer_registered` 需自動 -1
3. 當 `volunteer_registered >= volunteer_needed` 時，前端顯示為「已滿額」

---

### 3️⃣ 志工報名 (Volunteer Registrations)

**基礎路徑**: `/volunteer-registrations`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/volunteer-registrations` | 列出所有報名 | ❌ | `routes/volunteer-registrations.ts:9` |
| POST | `/volunteer-registrations` | 志工報名 | ✅ Bearer | `routes/volunteer-registrations.ts:14` |
| DELETE | `/volunteer-registrations/:id` | 取消報名 | ✅ Bearer | `routes/volunteer-registrations.ts:22` |

**請求/回應範例**:

```json
// POST /volunteer-registrations
{
  "grid_id": "grid_01HZYQ9W456GHIJK",
  "user_id": "user_01HZYQ9W789LMNOP"
}

// Response 201 Created
{
  "id": "reg_01HZYQ9WABC123DEF",
  "grid_id": "grid_01HZYQ9W456GHIJK",
  "user_id": "user_01HZYQ9W789LMNOP",
  "created_at": "2025-10-02T09:00:00Z"
}
```

**前端呼叫點**:
- `src/pages/Volunteers.jsx:66` - `VolunteerRegistration.update(id, { status })`
- `src/components/map/GridDetailModal.jsx` - 報名功能

**⚠️ 重要**:
- POST 成功後需觸發對應 Grid 的 `volunteer_registered` +1
- DELETE 成功後需觸發對應 Grid 的 `volunteer_registered` -1

---

### 4️⃣ 志工清單 (擴展資訊) ⭐

**路徑**: `GET /volunteers`

**重要性**: ⭐⭐⭐⭐⭐ (含權限控制)

**查詢參數**:
- `grid_id` (string, optional) - 過濾指定網格
- `status` (string, optional) - 過濾狀態 (pending|confirmed|arrived|completed|cancelled)
- `include_counts` (boolean, default: true) - 是否回傳統計
- `limit` (number, default: 50, max: 200) - 分頁筆數
- `offset` (number, default: 0) - 分頁位移

**回應結構**:

```json
{
  "data": [
    {
      "id": "reg_01HZYQ9WABC123DEF",
      "grid_id": "grid_01HZYQ9W456GHIJK",
      "user_id": "user_01HZYQ9W789LMNOP",
      "volunteer_name": "張小強",
      "volunteer_phone": "0912-345-678",  // ⚠️ 依權限決定是否回傳
      "status": "confirmed",
      "available_time": "10/3 上午或 10/4 全天",
      "skills": ["挖土機", "醫療志工"],
      "equipment": ["鐵鏟", "手推車"],
      "notes": "需要協助調度交通",
      "created_date": "2025-10-02T09:00:00Z"
    }
  ],
  "can_view_phone": true,  // ⚠️ 後端判斷前端是否可顯示電話
  "total": 128,
  "status_counts": {
    "pending": 12,
    "confirmed": 34,
    "arrived": 8,
    "completed": 55,
    "cancelled": 19
  },
  "page": 1,
  "limit": 50
}
```

**權限控制邏輯** (關鍵):

```typescript
// 後端需實作
function canViewPhone(currentUser: User, grid: Grid): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  if (currentUser.role === 'grid_manager' && currentUser.id === grid.grid_manager_id) return true;
  return false;
}

// 如果 can_view_phone = false，回傳時應:
// 1. 移除 volunteer_phone 欄位，或
// 2. 將 volunteer_phone 設為 null，或
// 3. 遮蔽部分號碼: "0912-***-678"
```

**前端呼叫點**:
- `src/pages/Volunteers.jsx:36` - `getVolunteers()`
- `src/pages/Volunteers.jsx:44` - 根據 `can_view_phone` 決定是否顯示電話
- `src/pages/Volunteers.jsx:277-286` - UI 渲染邏輯

**實作檔案**:
- 需實作: `packages/backend/src/routes/volunteers.ts`
- OpenAPI: `api-spec/openapi.yaml:716-749`

---

### 5️⃣ 物資捐贈 (Supply Donations)

**基礎路徑**: `/supply-donations`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/supply-donations` | 列出所有捐贈 | ❌ | `routes/supply-donations.ts` |
| POST | `/supply-donations` | 新增捐贈 | ✅ Bearer | 需實作 |
| PUT | `/supply-donations/:id` | 更新捐贈狀態 | ✅ Bearer | 需實作 |

**捐贈狀態 (status)**:
- `pledged` - 已承諾
- `confirmed` - 已確認
- `in_transit` - 運送中
- `delivered` - 已送達
- `cancelled` - 已取消

**請求/回應範例**:

```json
// POST /supply-donations
{
  "grid_id": "grid_01HZYQ9W456GHIJK",
  "supply_name": "礦泉水",
  "quantity": 100,
  "unit": "箱",
  "donor_name": "愛心企業",
  "donor_phone": "0912-345-678",
  "donor_contact": "water-donor@example.com",
  "delivery_method": "direct",  // direct | pickup_point | volunteer_pickup
  "delivery_time": "2025-10-03 14:00",
  "delivery_address": "光復鄉中正路123號",
  "notes": "請於下午2點前收貨",
  "status": "pledged"
}

// Response 201 Created
{
  "id": "donation_01HZYQ9W123XYZ",
  // ... (same as request)
  "created_date": "2025-10-02T10:00:00Z"
}
```

**前端呼叫點**:
- `src/pages/Supplies.jsx:39` - `SupplyDonation.list('-created_date')` (按時間倒序)
- `src/pages/Supplies.jsx:86` - `SupplyDonation.update(id, { status })`

**⚠️ 重要**: 電話號碼權限控制 (同志工清單)
```typescript
// 前端: src/pages/Supplies.jsx:371-374
const canViewPhone = currentUser && (
  currentUser.role === 'admin' ||
  (currentUser.role === 'grid_manager' && currentUser.id === grid.grid_manager_id)
);
```

---

### 6️⃣ 網格討論 (Grid Discussions)

**基礎路徑**: `/grid-discussions`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/grid-discussions` | 列出所有留言 | ❌ | `routes/grid-discussions.ts` |
| POST | `/grid-discussions` | 新增留言 | ✅ Bearer | 需實作 |

**建議查詢參數**:
- `grid_id` (string) - 過濾指定網格的留言
- `limit` (number) - 分頁

**請求/回應範例**:

```json
// POST /grid-discussions
{
  "grid_id": "grid_01HZYQ9W456GHIJK",
  "user_id": "user_01HZYQ9W789LMNOP",
  "content": "今天下午 2 點再集中一次清運。"
}

// Response 201 Created
{
  "id": "discuss_01HZYQ9WABC",
  "grid_id": "grid_01HZYQ9W456GHIJK",
  "user_id": "user_01HZYQ9W789LMNOP",
  "content": "今天下午 2 點再集中一次清運。",
  "created_at": "2025-10-02T11:00:00Z"
}
```

**前端呼叫點**:
- `src/components/map/GridDetailModal.jsx` - 網格詳情 Modal 的討論區

---

### 7️⃣ 公告管理 (Announcements)

**基礎路徑**: `/announcements`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/announcements` | 列出所有公告 | ❌ | `routes/announcements.ts` |
| POST | `/announcements` | 新增公告 | ✅ Bearer (Admin) | 需實作 |

**請求/回應範例**:

```json
// POST /announcements
{
  "title": "10/3 志工集合時間調整",
  "body": "明日集合時間改為 **08:30**，請提早 10 分鐘報到。"
}

// Response 201 Created
{
  "id": "announce_01HZYQ9WXYZ",
  "title": "10/3 志工集合時間調整",
  "body": "明日集合時間改為 **08:30**，請提早 10 分鐘報到。",
  "created_at": "2025-10-02T12:00:00Z"
}
```

**注意**: `body` 欄位支援 Markdown 格式

**前端呼叫點**:
- `src/components/map/AnnouncementPanel.jsx` - 地圖頁面公告區塊
- `src/components/map/AnnouncementModal.jsx` - 管理員新增公告

---

### 8️⃣ 使用者管理 (Users)

**基礎路徑**: `/users`, `/me`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| GET | `/users` | 列出所有使用者 | ✅ Bearer (Admin) | `routes/users.ts` |
| GET | `/me` | 取得當前使用者 | ✅ Bearer | 需實作 |

**使用者角色 (role)**:
- `admin` - 管理員 (完整權限)
- `grid_manager` - 網格管理員 (管理指定網格)
- `user` - 一般使用者 (報名/捐贈)

**回應範例**:

```json
// GET /me
{
  "id": "user_01HZYQ9W789LMNOP",
  "name": "林志工",
  "email": "volunteer@example.org",
  "role": "user"
}
```

**前端呼叫點**:
- `src/pages/Volunteers.jsx:39` - `User.me()` (判斷權限)
- `src/pages/Supplies.jsx:41` - `User.me()` (判斷權限)

**⚠️ 重要**: 所有需要 Bearer Token 的端點都應驗證 `/me` 端點

---

### 9️⃣ 工具函數 (Functions)

**基礎路徑**: `/functions`

| 方法 | 路徑 | 功能 | 需要授權 | 實作檔案 |
|------|------|------|---------|---------|
| POST | `/functions/fix-grid-bounds` | 批次修正網格邊界 | ✅ Bearer (Admin) | `routes/functions.ts:6` |
| GET | `/functions/export-grids-csv` | 匯出網格 CSV | ❌ | `routes/functions.ts:10` |
| POST | `/functions/import-grids-csv` | 匯入網格 CSV | ✅ Bearer (Admin) | `routes/functions.ts:15` |
| GET | `/functions/grid-template` | 下載空白範本 | ❌ | 需實作 |
| POST | `/functions/external-grid-api` | 代理外部網格 API | ✅ Bearer | 需實作 |
| POST | `/functions/external-volunteer-api` | 代理外部志工 API | ✅ Bearer | 需實作 |

**CSV 格式範例**:

```csv
code,disaster_area_id,grid_type,status,center_lat,center_lng,volunteer_needed,volunteer_registered,meeting_point,contact_info,description
A1,area_01HZYQ9W123,manpower,open,23.8751,121.5780,10,0,光復火車站,0912-345-678,需要清淤志工
A2,area_01HZYQ9W123,supply_storage,open,23.8760,121.5790,0,0,光復國小,0912-345-679,物資集中點
```

**前端呼叫點**:
- `src/pages/Admin.jsx` - 管理介面的 CSV 匯入/匯出
- `src/components/admin/GridImportExportButtons.jsx` - CSV 功能按鈕

---

### 🔟 舊版相容端點 (Legacy)

**基礎路徑**: `/api/v2`

| 方法 | 路徑 | 功能 | 說明 | 實作檔案 |
|------|------|------|------|---------|
| POST | `/api/v2/sync` | 同步舊系統資料 | 非同步背景作業 | `routes/legacy.ts` |
| GET | `/api/v2/roster` | 取得舊系統 roster | 相容性端點 | 需實作 |

**說明**: 這些端點用於與舊系統相容，非核心功能

**前端呼叫點**:
- `src/api/frontend/functions.js:218-256` - LocalStorage 實作
- `src/api/rest/functions.js:16-17` - REST 對應

---

## 🔐 認證與授權機制

### JWT Bearer Token 驗證

**Header 格式**:
```http
Authorization: Bearer <JWT_TOKEN>
```

**JWT Payload 建議結構**:
```json
{
  "sub": "user_01HZYQ9W789LMNOP",  // User ID
  "name": "林志工",
  "email": "volunteer@example.org",
  "role": "user",
  "iat": 1696233600,  // Issued At
  "exp": 1696320000   // Expiration (24h)
}
```

**實作建議**:
```typescript
// packages/backend/src/middleware/auth.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function authenticateToken(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
  } catch (err) {
    return reply.status(403).send({ message: 'Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return async function(req: FastifyRequest, reply: FastifyReply) {
    if (!req.user || !roles.includes(req.user.role)) {
      return reply.status(403).send({ message: 'Forbidden' });
    }
  };
}
```

**使用範例**:
```typescript
// 需要登入
app.post('/grids', { preHandler: [authenticateToken] }, async (req, reply) => {
  // ...
});

// 需要 Admin 權限
app.post('/announcements', {
  preHandler: [authenticateToken, requireRole(['admin'])]
}, async (req, reply) => {
  // ...
});
```

### 權限矩陣

| 端點 | 公開 | User | Grid Manager | Admin |
|------|------|------|--------------|-------|
| GET /disaster-areas | ✅ | ✅ | ✅ | ✅ |
| POST /disaster-areas | ❌ | ❌ | ❌ | ✅ |
| GET /grids | ✅ | ✅ | ✅ | ✅ |
| POST /grids | ❌ | ❌ | ✅ | ✅ |
| PUT /grids/:id | ❌ | ❌ | ✅ (own) | ✅ |
| POST /volunteer-registrations | ❌ | ✅ | ✅ | ✅ |
| GET /volunteers | ✅ | ✅ | ✅ | ✅ |
| GET /volunteers (phone) | ❌ | ❌ | ✅ (own grid) | ✅ |
| POST /supply-donations | ❌ | ✅ | ✅ | ✅ |
| POST /announcements | ❌ | ❌ | ❌ | ✅ |
| GET /users | ❌ | ❌ | ❌ | ✅ |

**注意**:
- Grid Manager 只能管理 `grid.grid_manager_id === user.id` 的網格
- 電話號碼僅 Admin 和對應的 Grid Manager 可查看

---

## 📊 資料結構定義

### DisasterArea (災區)

```typescript
interface DisasterArea {
  id: string;                    // UUID
  name: string;                  // 災區名稱
  center_lat: number;            // 中心點緯度 (-90 ~ 90)
  center_lng: number;            // 中心點經度 (-180 ~ 180)
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Grid (救援網格)

```typescript
interface Grid {
  id: string;                    // UUID
  code: string;                  // 網格代碼 (如 A-3)
  grid_type: GridType;           // 網格類型
  disaster_area_id: string;      // 所屬災區 ID
  volunteer_needed: number;      // 需要志工數量
  volunteer_registered: number;  // 已報名志工數量
  center_lat: number;            // 中心點緯度
  center_lng: number;            // 中心點經度
  bounds: Bounds;                // 網格邊界
  status: GridStatus;            // 網格狀態
  supplies_needed?: SupplyNeed[]; // 需要的物資
  meeting_point?: string;        // 集合地點
  risks_notes?: string;          // 風險注意事項
  contact_info?: string;         // 聯絡資訊 (⚠️ 敏感資訊)
  grid_manager_id?: string;      // 網格管理員 ID
  created_at: string;
  updated_at: string;
}

type GridType =
  | 'mud_disposal'      // 污泥暫置場
  | 'manpower'          // 人力任務
  | 'supply_storage'    // 物資停放處
  | 'accommodation'     // 住宿地點
  | 'food_area';        // 領吃食區域

type GridStatus =
  | 'open'              // 開放中
  | 'closed'            // 已關閉
  | 'completed'         // 已完成
  | 'pending';          // 準備中

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface SupplyNeed {
  name: string;         // 物資名稱
  quantity: number;     // 需要數量
  unit: string;         // 單位
  received?: number;    // 已收到數量 (default: 0)
}
```

### VolunteerRegistration (志工報名)

```typescript
interface VolunteerRegistration {
  id: string;
  grid_id: string;
  user_id: string;
  created_at: string;
}
```

### VolunteerListItem (志工清單項目)

```typescript
interface VolunteerListItem {
  id: string;
  grid_id: string;
  user_id: string;
  volunteer_name: string;
  volunteer_phone?: string;      // ⚠️ 依權限決定是否回傳
  status: VolunteerStatus;
  available_time?: string;
  skills?: string[];
  equipment?: string[];
  notes?: string;
  created_date: string;          // 注意: 前端使用 created_date 而非 created_at
}

type VolunteerStatus =
  | 'pending'           // 待確認
  | 'confirmed'         // 已確認
  | 'arrived'           // 已到場
  | 'completed'         // 已完成
  | 'cancelled';        // 已取消
```

### SupplyDonation (物資捐贈)

```typescript
interface SupplyDonation {
  id: string;
  grid_id: string;
  supply_name: string;
  quantity: number;
  unit: string;
  donor_name: string;
  donor_phone: string;           // ⚠️ 敏感資訊
  donor_contact: string;
  delivery_method?: DeliveryMethod;
  delivery_time?: string;
  delivery_address?: string;
  notes?: string;
  status: DonationStatus;
  created_date: string;
}

type DeliveryMethod =
  | 'direct'            // 直接送達
  | 'pickup_point'      // 轉運點
  | 'volunteer_pickup'; // 志工取貨

type DonationStatus =
  | 'pledged'           // 已承諾
  | 'confirmed'         // 已確認
  | 'in_transit'        // 運送中
  | 'delivered'         // 已送達
  | 'cancelled';        // 已取消
```

### User (使用者)

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

type UserRole =
  | 'admin'             // 管理員
  | 'grid_manager'      // 網格管理員
  | 'user';             // 一般使用者
```

### GridDiscussion (網格討論)

```typescript
interface GridDiscussion {
  id: string;
  grid_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
```

### Announcement (公告)

```typescript
interface Announcement {
  id: string;
  title: string;
  body: string;          // 支援 Markdown
  created_at: string;
}
```

---

## 🗄️ 資料庫 Schema

### PostgreSQL 資料表結構

```sql
-- 災區表
CREATE TABLE disaster_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL CHECK (center_lat BETWEEN -90 AND 90),
  center_lng DOUBLE PRECISION NOT NULL CHECK (center_lng BETWEEN -180 AND 180),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用者表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- bcrypt hash
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'grid_manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 網格表
CREATE TABLE grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  grid_type VARCHAR(50) NOT NULL CHECK (grid_type IN ('mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area')),
  disaster_area_id UUID NOT NULL REFERENCES disaster_areas(id) ON DELETE CASCADE,
  volunteer_needed INTEGER DEFAULT 0 CHECK (volunteer_needed >= 0),
  volunteer_registered INTEGER DEFAULT 0 CHECK (volunteer_registered >= 0),
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bounds JSONB,  -- { north, south, east, west }
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed', 'pending')),
  supplies_needed JSONB,  -- [{ name, quantity, unit, received }]
  meeting_point TEXT,
  risks_notes TEXT,
  contact_info VARCHAR(255),  -- ⚠️ 敏感資訊
  grid_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(disaster_area_id, code)
);

-- 志工報名表
CREATE TABLE volunteer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  volunteer_name VARCHAR(255),
  volunteer_phone VARCHAR(50),  -- ⚠️ 敏感資訊
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'arrived', 'completed', 'cancelled')),
  available_time TEXT,
  skills TEXT[],  -- PostgreSQL array
  equipment TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(grid_id, user_id)
);

-- 物資捐贈表
CREATE TABLE supply_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  supply_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  donor_name VARCHAR(255),
  donor_phone VARCHAR(50),  -- ⚠️ 敏感資訊
  donor_contact VARCHAR(255),
  delivery_method VARCHAR(50) CHECK (delivery_method IN ('direct', 'pickup_point', 'volunteer_pickup')),
  delivery_time VARCHAR(255),
  delivery_address TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pledged' CHECK (status IN ('pledged', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 網格討論表
CREATE TABLE grid_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公告表
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,  -- 支援 Markdown
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引優化
CREATE INDEX idx_grids_disaster_area ON grids(disaster_area_id);
CREATE INDEX idx_grids_status ON grids(status);
CREATE INDEX idx_volunteer_registrations_grid ON volunteer_registrations(grid_id);
CREATE INDEX idx_volunteer_registrations_user ON volunteer_registrations(user_id);
CREATE INDEX idx_volunteer_registrations_status ON volunteer_registrations(status);
CREATE INDEX idx_supply_donations_grid ON supply_donations(grid_id);
CREATE INDEX idx_supply_donations_status ON supply_donations(status);
CREATE INDEX idx_grid_discussions_grid ON grid_discussions(grid_id);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

-- 自動更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_disaster_areas_updated_at BEFORE UPDATE ON disaster_areas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grids_updated_at BEFORE UPDATE ON grids
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteer_registrations_updated_at BEFORE UPDATE ON volunteer_registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supply_donations_updated_at BEFORE UPDATE ON supply_donations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 資料庫初始化

```sql
-- 插入測試資料
INSERT INTO disaster_areas (id, name, center_lat, center_lng) VALUES
('area_01HZYQ9W123ABCDEF', '光復鄉重災區', 23.8751, 121.578);

INSERT INTO users (id, name, email, role) VALUES
('user_admin', '系統管理員', 'admin@example.org', 'admin'),
('user_manager', '網格管理員', 'manager@example.org', 'grid_manager'),
('user_volunteer', '志工', 'volunteer@example.org', 'user');

INSERT INTO grids (id, code, grid_type, disaster_area_id, volunteer_needed, center_lat, center_lng, bounds, status, grid_manager_id) VALUES
('grid_01HZYQ9W456GHIJK', 'A-3', 'manpower', 'area_01HZYQ9W123ABCDEF', 10, 23.87525, 121.57812,
 '{"north": 23.876, "south": 23.874, "east": 121.579, "west": 121.577}', 'open', 'user_manager');
```

---

## 🌍 環境變數配置

### 前端 (.env.local)

```bash
# 模式切換
VITE_USE_FRONTEND=true          # true=LocalStorage, false=REST API

# REST API 模式配置 (當 VITE_USE_FRONTEND=false 時生效)
VITE_API_BASE=http://localhost:8787

# GitHub Pages 部署 (npm run build:github)
GITHUB_PAGES=true
```

**檔案位置**: `shovel-heroes/.env.local`

### 後端 (packages/backend/.env)

```bash
# 資料庫連線
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes

# 伺服器 Port
PORT=8787

# JWT Secret (⚠️ 務必更換為隨機字串)
JWT_SECRET=your-super-secret-jwt-key-please-change-me

# CORS 允許來源
CORS_ORIGIN=http://localhost:5173

# Node 環境
NODE_ENV=development

# 日誌級別
LOG_LEVEL=info
```

**檔案位置**: `shovel-heroes/packages/backend/.env`

**⚠️ 安全提醒**:
1. `.env` 檔案應加入 `.gitignore`
2. 正式環境的 `JWT_SECRET` 應使用 32+ 字元隨機字串
3. 資料庫密碼應使用強密碼

---

## 🚀 啟動指令

### 1. 前端獨立模式 (LocalStorage)

```bash
# 1. 設定環境變數
echo "VITE_USE_FRONTEND=true" > .env.local

# 2. 啟動前端
npm run dev

# 3. 開啟瀏覽器
# http://localhost:5173
```

**說明**: 所有資料存在瀏覽器 LocalStorage，無需後端

---

### 2. 前後端整合模式

#### 步驟 1: 啟動資料庫

```bash
# 使用 Docker Compose
docker-compose up -d

# 或手動啟動 PostgreSQL
# Port: 5432
# Database: shovelheroes
# User: postgres
# Password: postgres
```

#### 步驟 2: 初始化資料庫

```bash
# 連線資料庫
psql -h localhost -U postgres -d shovelheroes

# 執行 Schema SQL (複製上方資料庫 Schema 區塊)
\i schema.sql
```

#### 步驟 3: 啟動後端 API

```bash
# 終端機 1
cd packages/backend

# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 檔案

# 開發模式 (自動重啟)
npm run dev

# 或生產模式
npm run build
npm start
```

**確認後端啟動成功**:
```bash
curl http://localhost:8787/healthz
# 應回傳: {"status":"ok","db":"ready"}
```

#### 步驟 4: 設定前端環境變數

```bash
# 終端機 2 (回到專案根目錄)
cd ../..

# 設定環境變數
cat > .env.local << EOF
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
EOF
```

#### 步驟 5: 啟動前端

```bash
# 安裝依賴 (首次)
npm install

# 啟動開發伺服器
npm run dev

# 開啟瀏覽器
# http://localhost:5173
```

---

### 3. 驗證整合成功

```bash
# 1. 開啟瀏覽器開發者工具 (F12)
# 2. 切換到 Network 標籤
# 3. 重新整理頁面
# 4. 應該看到對 http://localhost:8787 的請求

# 或使用 curl 測試
curl http://localhost:8787/disaster-areas
curl http://localhost:8787/grids
```

---

## 📊 前端 API 呼叫統計

### 核心頁面使用情況

#### Map.jsx (地圖頁面)
**呼叫次數**: 3 個 API
```javascript
// 檔案: src/pages/Map.jsx
DisasterArea.list()              // Line 312 - 載入災區
Grid.list()                       // Line 313 - 載入網格
Grid.update(id, data)             // Line 399 - 移動網格
```

**觸發時機**:
- 頁面初次載入 (useEffect)
- 拖動網格後 (handleGridMove)

#### Volunteers.jsx (志工管理頁面)
**呼叫次數**: 4 個 API
```javascript
// 檔案: src/pages/Volunteers.jsx
getVolunteers()                   // Line 36 - 取得志工清單 (含 can_view_phone)
Grid.list()                       // Line 38 - 網格選單
User.me()                         // Line 39 - 當前使用者
VolunteerRegistration.update()    // Line 66 - 更新報名狀態
```

**觸發時機**:
- 頁面初次載入
- 更新志工狀態 (確認/取消/到場/完成)

#### Supplies.jsx (物資管理頁面)
**呼叫次數**: 4 個 API
```javascript
// 檔案: src/pages/Supplies.jsx
SupplyDonation.list('-created_date')  // Line 39 - 捐贈清單 (倒序)
Grid.list()                           // Line 40 - 網格與物資需求
User.me()                             // Line 41 - 當前使用者
SupplyDonation.update()               // Line 86 - 更新捐贈狀態
```

**觸發時機**:
- 頁面初次載入
- 更新捐贈狀態 (確認/運送中/送達/取消)

#### Admin.jsx (管理介面)
**呼叫次數**: 15+ 個 API
```javascript
// 檔案: src/pages/Admin.jsx
DisasterArea.list()               // 災區 CRUD
DisasterArea.create()
DisasterArea.update()
DisasterArea.delete()
Grid.list()                       // 網格 CRUD
Grid.create()
Grid.update()
Grid.delete()
fixGridBounds()                   // 工具函數
exportGridsCSV()
importGridsCSV()
downloadGridTemplate()
Announcement.list()               // 公告管理
Announcement.create()
User.me()                         // 權限驗證
```

**觸發時機**:
- 頁面初次載入
- CRUD 操作
- CSV 匯入/匯出

### API 呼叫統計表

| 頁面 | API 數量 | 主要功能 | 頻率 |
|------|---------|---------|------|
| Map.jsx | 3 | 地圖顯示 | 高 |
| Volunteers.jsx | 4 | 志工管理 | 中 |
| Supplies.jsx | 4 | 物資管理 | 中 |
| Admin.jsx | 15+ | 系統管理 | 低 (僅 Admin) |
| GridDetailModal.jsx | 5 | 網格詳情 | 高 (Modal) |

---

## 🔄 資料流向圖

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React)                        │
│                   Port: 5173 (Vite)                      │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐            │
│  │  Map.jsx  │  │Volunteers │  │Supplies  │            │
│  │   地圖    │  │  志工管理  │  │  物資    │            │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘            │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      │                                    │
│         ┌────────────▼────────────┐                     │
│         │  API Abstraction Layer  │                     │
│         │  src/api/entities.js    │                     │
│         └────────────┬────────────┘                     │
│                      │                                    │
│              環境變數切換 (VITE_USE_FRONTEND)             │
│                      │                                    │
│         ┌────────────┴────────────┐                     │
│         │                         │                      │
│         ▼                         ▼                      │
│  ┌──────────────┐        ┌──────────────┐              │
│  │ LocalStorage │        │  REST Client │              │
│  │  (前端模式)   │        │src/api/rest/ │              │
│  └──────────────┘        └──────┬───────┘              │
└─────────────────────────────────┼──────────────────────┘
                                   │
                      ┌────────────┴────────────┐
                      │    HTTP/JSON (REST)     │
                      │  Authorization: Bearer  │
                      └────────────┬────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────┐
│                  後端 API (Fastify)                      │
│                   Port: 8787                             │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │         Auth Middleware (JWT)                │      │
│  │    - Bearer Token 驗證                       │      │
│  │    - 角色權限檢查 (RBAC)                      │      │
│  └────────────────┬─────────────────────────────┘      │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────┐      │
│  │              Routes Layer                     │      │
│  │  /disaster-areas  /grids  /volunteers        │      │
│  │  /supply-donations  /announcements  /users   │      │
│  └────────────────┬─────────────────────────────┘      │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────┐      │
│  │         Business Logic Layer                  │      │
│  │  - 資料驗證 (Zod)                             │      │
│  │  - 權限控制 (can_view_phone)                  │      │
│  │  - 志工數量自動更新                            │      │
│  └────────────────┬─────────────────────────────┘      │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────┐      │
│  │         Repository Layer                      │      │
│  │  - SQL 查詢封裝                               │      │
│  │  - 交易處理                                   │      │
│  └────────────────┬─────────────────────────────┘      │
└───────────────────┼──────────────────────────────────┘
                    │
      ┌─────────────▼─────────────┐
      │    PostgreSQL 資料庫       │
      │      Port: 5432            │
      │                            │
      │  Tables:                   │
      │  - disaster_areas          │
      │  - grids                   │
      │  - volunteer_registrations │
      │  - supply_donations        │
      │  - grid_discussions        │
      │  - announcements           │
      │  - users                   │
      └────────────────────────────┘
```

---

## 💡 實作建議

### 1. 優先實作順序

#### Phase 1: 核心功能 (Week 1)
1. ✅ 建立資料庫 Schema
2. ✅ 實作 JWT 認證中介層
3. ✅ 實作 `/me` 端點
4. ✅ 實作 `/disaster-areas` 完整 CRUD
5. ✅ 實作 `/grids` 完整 CRUD
6. ✅ 測試前端地圖頁面

#### Phase 2: 志工功能 (Week 2)
1. ✅ 實作 `/volunteer-registrations` CRUD
2. ✅ 實作 `/volunteers` 端點 (含權限控制)
3. ✅ 實作志工報名時自動更新 `volunteer_registered`
4. ✅ 測試前端志工管理頁面

#### Phase 3: 物資功能 (Week 2)
1. ✅ 實作 `/supply-donations` CRUD
2. ✅ 實作物資需求進度計算
3. ✅ 測試前端物資管理頁面

#### Phase 4: 輔助功能 (Week 3)
1. ✅ 實作 `/announcements` CRUD
2. ✅ 實作 `/grid-discussions` CRUD
3. ✅ 實作 CSV 匯入/匯出功能
4. ✅ 實作工具函數端點

#### Phase 5: 優化與安全 (Week 4)
1. ✅ 加入 Rate Limiting
2. ✅ 加入輸入驗證與清理
3. ✅ 實作錯誤處理與日誌
4. ✅ 效能優化 (查詢優化、快取)
5. ✅ 安全掃描與測試

---

### 2. 關鍵實作要點

#### 2.1 志工報名數量自動更新

```typescript
// packages/backend/src/routes/volunteer-registrations.ts

// POST /volunteer-registrations
app.post('/volunteer-registrations', { preHandler: [authenticateToken] }, async (req, reply) => {
  const { grid_id, user_id } = req.body;

  // 開始交易
  await app.db.query('BEGIN');
  try {
    // 插入報名記錄
    const { rows } = await app.db.query(
      'INSERT INTO volunteer_registrations (id, grid_id, user_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [randomUUID(), grid_id, user_id, 'pending']
    );

    // 當狀態為 confirmed 時才更新 volunteer_registered
    // (初始報名為 pending，需管理員確認後才 +1)

    await app.db.query('COMMIT');
    return reply.status(201).send(rows[0]);
  } catch (err) {
    await app.db.query('ROLLBACK');
    throw err;
  }
});

// PUT /volunteer-registrations/:id (更新狀態)
app.put('/volunteer-registrations/:id', { preHandler: [authenticateToken] }, async (req, reply) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  await app.db.query('BEGIN');
  try {
    // 取得舊狀態
    const { rows: [oldReg] } = await app.db.query(
      'SELECT * FROM volunteer_registrations WHERE id = $1',
      [id]
    );

    if (!oldReg) {
      return reply.status(404).send({ message: 'Not found' });
    }

    const oldStatus = oldReg.status;

    // 更新報名狀態
    await app.db.query(
      'UPDATE volunteer_registrations SET status = $1 WHERE id = $2',
      [newStatus, id]
    );

    // 狀態變化時更新 Grid 的 volunteer_registered
    if (oldStatus === 'pending' && newStatus === 'confirmed') {
      // pending -> confirmed: +1
      await app.db.query(
        'UPDATE grids SET volunteer_registered = volunteer_registered + 1 WHERE id = $1',
        [oldReg.grid_id]
      );
    } else if (oldStatus === 'confirmed' && newStatus === 'cancelled') {
      // confirmed -> cancelled: -1
      await app.db.query(
        'UPDATE grids SET volunteer_registered = GREATEST(volunteer_registered - 1, 0) WHERE id = $1',
        [oldReg.grid_id]
      );
    }

    await app.db.query('COMMIT');
    return reply.send({ success: true });
  } catch (err) {
    await app.db.query('ROLLBACK');
    throw err;
  }
});
```

#### 2.2 權限控制 (can_view_phone)

```typescript
// packages/backend/src/routes/volunteers.ts

app.get('/volunteers', async (req, reply) => {
  const { grid_id, status, limit = 50, offset = 0 } = req.query;

  // 取得當前使用者 (從 JWT 或 Session)
  const currentUser = req.user;

  // 建立查詢
  let query = `
    SELECT vr.*, u.name as volunteer_name
    FROM volunteer_registrations vr
    JOIN users u ON vr.user_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (grid_id) {
    params.push(grid_id);
    query += ` AND vr.grid_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    query += ` AND vr.status = $${params.length}`;
  }

  query += ` ORDER BY vr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await app.db.query(query, params);

  // 判斷是否可查看電話
  let canViewPhone = false;
  if (currentUser) {
    if (currentUser.role === 'admin') {
      canViewPhone = true;
    } else if (currentUser.role === 'grid_manager' && grid_id) {
      // 檢查是否為該網格的管理員
      const { rows: [grid] } = await app.db.query(
        'SELECT grid_manager_id FROM grids WHERE id = $1',
        [grid_id]
      );
      if (grid && grid.grid_manager_id === currentUser.id) {
        canViewPhone = true;
      }
    }
  }

  // 如果不能查看電話，移除 volunteer_phone 欄位
  const data = rows.map(row => {
    if (!canViewPhone) {
      delete row.volunteer_phone;
    }
    return row;
  });

  // 計算統計
  const { rows: [counts] } = await app.db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
      COUNT(*) FILTER (WHERE status = 'arrived') as arrived,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) as total
    FROM volunteer_registrations
    WHERE grid_id = $1 OR $1 IS NULL
  `, [grid_id || null]);

  return {
    data,
    can_view_phone: canViewPhone,
    total: parseInt(counts.total),
    status_counts: {
      pending: parseInt(counts.pending),
      confirmed: parseInt(counts.confirmed),
      arrived: parseInt(counts.arrived),
      completed: parseInt(counts.completed),
      cancelled: parseInt(counts.cancelled)
    }
  };
});
```

#### 2.3 CORS 配置

```typescript
// packages/backend/src/index.ts

await app.register(cors, {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',           // 本地開發
      'http://127.0.0.1:5173',
      'https://your-domain.com',         // 正式環境
      process.env.CORS_ORIGIN            // 環境變數
    ].filter(Boolean);

    // 允許無 origin 的請求 (如 Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});
```

#### 2.4 錯誤處理

```typescript
// packages/backend/src/error-handler.ts

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    // 記錄錯誤
    req.log.error(error);

    // Zod 驗證錯誤
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        message: 'Validation error',
        errors: error.errors
      });
    }

    // 資料庫錯誤
    if (error.code?.startsWith('23')) {  // PostgreSQL constraint errors
      if (error.code === '23505') {  // Unique constraint
        return reply.status(409).send({
          message: 'Resource already exists',
          code: 'DUPLICATE_ENTRY'
        });
      }
    }

    // JWT 錯誤
    if (error.name === 'JsonWebTokenError') {
      return reply.status(401).send({
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // 未授權
    if (error.statusCode === 403) {
      return reply.status(403).send({
        message: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 預設 500 錯誤
    return reply.status(500).send({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  });
}
```

---

### 3. 效能優化建議

#### 3.1 資料庫查詢優化

```typescript
// ❌ 不好的做法: N+1 查詢
app.get('/grids', async () => {
  const { rows: grids } = await app.db.query('SELECT * FROM grids');
  for (const grid of grids) {
    const { rows: area } = await app.db.query('SELECT * FROM disaster_areas WHERE id = $1', [grid.disaster_area_id]);
    grid.disaster_area = area[0];
  }
  return grids;
});

// ✅ 好的做法: JOIN 查詢
app.get('/grids', async () => {
  const { rows } = await app.db.query(`
    SELECT
      g.*,
      json_build_object(
        'id', da.id,
        'name', da.name,
        'center_lat', da.center_lat,
        'center_lng', da.center_lng
      ) as disaster_area
    FROM grids g
    JOIN disaster_areas da ON g.disaster_area_id = da.id
    ORDER BY g.created_at DESC
  `);
  return rows;
});
```

#### 3.2 快取策略

```typescript
// packages/backend/src/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 分鐘

export function cacheMiddleware(key: string, ttl?: number) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const cached = cache.get(key);
    if (cached) {
      return reply.send(cached);
    }

    // 繼續執行，並在 onSend hook 中快取結果
    reply.addHook('onSend', async (req, reply, payload) => {
      if (reply.statusCode === 200) {
        cache.set(key, payload, ttl);
      }
      return payload;
    });
  };
}

// 使用範例
app.get('/disaster-areas', { preHandler: [cacheMiddleware('disaster-areas', 600)] }, async () => {
  // ...
});
```

#### 3.3 Rate Limiting

```typescript
// packages/backend/src/index.ts
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  global: true,
  max: 100,           // 最多 100 次請求
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],  // 白名單
  redis: process.env.REDIS_URL,  // 使用 Redis (可選)
  errorResponseBuilder: (req, context) => {
    return {
      message: 'Rate limit exceeded',
      retryAfter: context.after,
      limit: context.max
    };
  }
});
```

---

### 4. 安全建議

#### 4.1 敏感資訊遮蔽

```typescript
// packages/backend/src/utils/sanitize.ts

export function maskPhone(phone: string): string {
  // 0912-345-678 -> 0912-***-678
  return phone.replace(/(\d{4})-(\d{3})-(\d{3})/, '$1-***-$3');
}

export function sanitizeUser(user: any, canViewSensitive: boolean) {
  const sanitized = { ...user };

  if (!canViewSensitive) {
    delete sanitized.email;
    delete sanitized.phone;
    if (sanitized.volunteer_phone) {
      sanitized.volunteer_phone = maskPhone(sanitized.volunteer_phone);
    }
  }

  // 永遠不回傳密碼
  delete sanitized.password_hash;

  return sanitized;
}
```

#### 4.2 SQL Injection 防護

```typescript
// ✅ 好的做法: 使用參數化查詢
const { rows } = await app.db.query(
  'SELECT * FROM grids WHERE code = $1',
  [code]
);

// ❌ 不好的做法: 字串拼接
const { rows } = await app.db.query(
  `SELECT * FROM grids WHERE code = '${code}'`  // 危險!!!
);
```

#### 4.3 XSS 防護

```typescript
// packages/backend/src/utils/sanitize.ts
import createDOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return createDOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
}
```

---

## 📝 API 測試清單

### Postman/Insomnia Collection

```json
{
  "name": "Shovel Heroes API",
  "requests": [
    {
      "name": "Health Check",
      "method": "GET",
      "url": "{{baseUrl}}/healthz",
      "tests": [
        "status === 200",
        "body.status === 'ok'",
        "body.db === 'ready'"
      ]
    },
    {
      "name": "Get Disaster Areas",
      "method": "GET",
      "url": "{{baseUrl}}/disaster-areas",
      "tests": [
        "status === 200",
        "Array.isArray(body)"
      ]
    },
    {
      "name": "Create Disaster Area (Admin)",
      "method": "POST",
      "url": "{{baseUrl}}/disaster-areas",
      "headers": {
        "Authorization": "Bearer {{adminToken}}"
      },
      "body": {
        "name": "測試災區",
        "center_lat": 23.8751,
        "center_lng": 121.578
      },
      "tests": [
        "status === 201",
        "body.id !== undefined"
      ]
    },
    {
      "name": "Get Volunteers (No Phone)",
      "method": "GET",
      "url": "{{baseUrl}}/volunteers",
      "tests": [
        "status === 200",
        "body.can_view_phone === false",
        "body.data[0].volunteer_phone === undefined"
      ]
    },
    {
      "name": "Get Volunteers (With Phone - Admin)",
      "method": "GET",
      "url": "{{baseUrl}}/volunteers",
      "headers": {
        "Authorization": "Bearer {{adminToken}}"
      },
      "tests": [
        "status === 200",
        "body.can_view_phone === true",
        "body.data[0].volunteer_phone !== undefined"
      ]
    }
  ]
}
```

### 測試腳本

```bash
#!/bin/bash
# test-api.sh

BASE_URL="http://localhost:8787"

echo "Testing Health Check..."
curl -s "$BASE_URL/healthz" | jq .

echo "\nTesting GET /disaster-areas..."
curl -s "$BASE_URL/disaster-areas" | jq 'length'

echo "\nTesting GET /grids..."
curl -s "$BASE_URL/grids" | jq 'length'

echo "\nTesting GET /volunteers (no auth)..."
curl -s "$BASE_URL/volunteers" | jq '.can_view_phone'

echo "\nTesting POST /disaster-areas (should fail without auth)..."
curl -s -X POST "$BASE_URL/disaster-areas" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","center_lat":23.8751,"center_lng":121.578}' \
  | jq .

echo "\nAll tests completed!"
```

---

## 📚 參考資源

### 官方文件
- [Fastify 官方文件](https://www.fastify.io/)
- [PostgreSQL 官方文件](https://www.postgresql.org/docs/)
- [Zod 驗證庫](https://zod.dev/)
- [JWT.io](https://jwt.io/)

### 專案相關
- **OpenAPI 規格**: `api-spec/openapi.yaml`
- **前端 API 呼叫**: `src/api/`
- **後端路由實作**: `packages/backend/src/routes/`
- **前端模式說明**: `FRONTEND_MODE_README.md`

### 工具
- [Postman](https://www.postman.com/) - API 測試
- [DBeaver](https://dbeaver.io/) - 資料庫管理
- [Swagger Editor](https://editor.swagger.io/) - OpenAPI 編輯

---

## 🤝 聯絡與支援

如有任何問題或建議，請透過以下方式聯繫：

- **GitHub Issues**: (專案 GitHub 連結)
- **Email**: dev@shovel-heroes.com
- **文件更新**: 請發 PR 至 `docs/BACKEND_API_INTEGRATION_GUIDE.md`

---

**文件版本**: 1.0.0
**最後更新**: 2025-10-02
**維護者**: Shovel Heroes 開發團隊

---

**附註**: 本文件基於專案當前狀態 (2025-10-02) 生成，後續可能需要根據實際開發進度更新。
