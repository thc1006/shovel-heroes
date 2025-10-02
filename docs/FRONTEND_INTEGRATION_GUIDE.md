# 前端整合指南 | Frontend Integration Guide
**Shovel Heroes Backend API Integration**

> 本文件提供完整的後端 API 整合指南，讓前端開發者能快速理解如何與後端完美整合。

---

## 📋 目錄 | Table of Contents

1. [快速開始](#快速開始)
2. [環境配置](#環境配置)
3. [API 端點總覽](#api-端點總覽)
4. [驗證與授權](#驗證與授權)
5. [資料格式與類型](#資料格式與類型)
6. [錯誤處理](#錯誤處理)
7. [實戰範例](#實戰範例)
8. [測試策略](#測試策略)
9. [常見問題](#常見問題)

---

## 🚀 快速開始

### 後端服務狀態檢查

```bash
# 檢查後端是否運行
curl http://localhost:8787/healthz
# 預期回應: {"status":"ok","timestamp":"2025-10-02T..."}
```

### 前端環境變數設定

在前端專案根目錄創建 `.env.local`:

```bash
# 開發環境
VITE_USE_REST=true
VITE_API_BASE=http://localhost:8787

# 生產環境（部署後）
# VITE_API_BASE=/api
```

### 基本 API 測試

```javascript
// 測試連線
const response = await fetch('http://localhost:8787/healthz');
const data = await response.json();
console.log(data); // { status: 'ok', timestamp: '...' }
```

---

## ⚙️ 環境配置

### 後端服務啟動

```bash
# 1. 啟動 Docker 服務 (PostgreSQL + MailHog)
docker compose up -d db mailhog

# 2. 運行資料庫 migrations
cd packages/backend
npm run migrate:up

# 3. 啟動後端開發服務器
npm run dev:api
# 後端將在 http://localhost:8787 運行
```

### 前端配置

```typescript
// src/api/config.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8787';
export const USE_REST = import.meta.env.VITE_USE_REST === 'true';
```

---

## 📡 API 端點總覽

### 基礎資訊

- **Base URL**: `http://localhost:8787` (開發) / `/api` (生產)
- **協議**: HTTP/HTTPS
- **數據格式**: JSON
- **編碼**: UTF-8
- **日期格式**: ISO 8601 (`2025-10-02T08:12:30Z`)

### 公開端點 (不需驗證)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/healthz` | 健康檢查 |
| GET | `/` | 根路徑（返回 `{ok: true}`） |
| GET | `/disaster-areas` | 取得災區列表 |
| GET | `/disaster-areas/{id}` | 取得特定災區 |

### 受保護端點 (需要 JWT)

#### 災區管理 (Disaster Areas)

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/disaster-areas` | 創建災區 | JWT Required |
| PUT | `/disaster-areas/{id}` | 更新災區 | JWT Required |
| DELETE | `/disaster-areas/{id}` | 刪除災區 | JWT Required |

#### 網格管理 (Grids)

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/grids` | 取得網格列表 | JWT Required |
| GET | `/grids/{id}` | 取得特定網格 | JWT Required |
| POST | `/grids` | 創建網格 | JWT Required |
| PUT | `/grids/{id}` | 更新網格 | JWT Required |
| DELETE | `/grids/{id}` | 刪除網格 | JWT Required |

#### 志工報名 (Volunteer Registrations)

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/volunteer-registrations` | 取得報名列表 | JWT Required |
| POST | `/volunteer-registrations` | 志工報名 | JWT Required |
| DELETE | `/volunteer-registrations/{id}` | 取消報名 | JWT Required (僅自己) |

#### 志工列表 (Volunteers)

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/volunteers` | 取得志工清單 | JWT Required |
| GET | `/volunteers?grid_id={id}` | 篩選特定網格 | JWT Required |
| GET | `/volunteers?status=pending` | 篩選特定狀態 | JWT Required |

#### 其他功能

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/announcements` | 取得公告列表 | Public |
| POST | `/announcements` | 創建公告 | JWT Required |
| GET | `/supply-donations` | 取得物資捐贈 | Public |
| POST | `/supply-donations` | 記錄捐贈 | JWT Required |
| POST | `/grid-discussions` | 網格留言 | JWT Required |
| GET | `/users` | 取得使用者列表 | JWT Required |
| GET | `/me` | 取得當前使用者 | JWT Required |

---

## 🔐 驗證與授權

### JWT Token 格式

後端使用 JWT (JSON Web Token) 進行身份驗證。

#### Token 結構

```json
{
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "iat": 1696234567,
  "exp": 1696320967
}
```

#### 如何獲取 Token

**方案 1: 開發環境生成測試 Token**

```javascript
// packages/backend/src/lib/test-utils.ts
import jwt from 'jsonwebtoken';

export function generateTestToken(userId: string, email: string) {
  return jwt.sign(
    { sub: userId, email },
    process.env.JWT_SECRET || 'dev_secret_change_me_in_production_minimum_32_chars',
    { expiresIn: '24h' }
  );
}

// 使用方式
const token = generateTestToken('550e8400-e29b-41d4-a716-446655440000', 'test@example.com');
```

**方案 2: 生產環境（需實作登入端點）**

```typescript
// 前端登入請求
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token } = await response.json();
localStorage.setItem('authToken', token);
```

#### 使用 Token 發送請求

```typescript
// src/api/client.ts
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

---

## 📊 資料格式與類型

### TypeScript 類型定義

後端 API 完全遵循 OpenAPI 3.1.0 規範。使用 `openapi-typescript` 自動生成類型：

```bash
# 生成類型定義
npm run types:openapi
# 生成位置: packages/shared-types/src/openapi.ts
```

#### 使用自動生成的類型

```typescript
import type { components } from '@/shared-types/openapi';

// 災區類型
type DisasterArea = components['schemas']['DisasterArea'];

// 網格類型
type Grid = components['schemas']['Grid'];

// 志工報名類型
type VolunteerRegistration = components['schemas']['VolunteerRegistration'];

// 錯誤類型
type ApiError = components['schemas']['Error'];
```

### 主要資料結構

#### Disaster Area (災區)

```typescript
interface DisasterArea {
  id: string;                 // UUID
  name: string;               // 災區名稱
  center_lat: number;         // 緯度 (-90 to 90)
  center_lng: number;         // 經度 (-180 to 180)
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

#### Grid (網格)

```typescript
interface Grid {
  id: string;
  code: string;               // 網格代碼 (如 "A-3")
  grid_type: 'mud_disposal' | 'manpower' | 'supply_storage' | 'accommodation' | 'food_area';
  disaster_area_id: string;
  volunteer_needed: number;
  volunteer_registered: number;
  meeting_point?: string;
  risks_notes?: string;
  contact_info?: string;
  center_lat: number;
  center_lng: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  status: 'open' | 'closed' | 'completed' | 'pending';
  supplies_needed: Array<{
    name: string;
    quantity: number;
    unit: string;
    received: number;
  }>;
  grid_manager_id?: string;
  created_at: string;
  updated_at: string;
}
```

#### Volunteer List Response (志工清單)

```typescript
interface VolunteersListResponse {
  data: Array<{
    id: string;
    grid_id: string;
    user_id: string;
    volunteer_name: string;
    volunteer_phone?: string;  // 根據 can_view_phone 決定是否遮罩
    status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled';
    available_time?: string;
    skills: string[];
    equipment: string[];
    notes?: string;
    created_date: string;      // 注意：這裡是 created_date 而非 created_at
  }>;
  can_view_phone: boolean;     // 前端根據此欄位決定是否顯示完整電話
  total: number;
  status_counts?: {
    pending: number;
    confirmed: number;
    arrived: number;
    completed: number;
    cancelled: number;
  };
  page?: number;
  limit?: number;
}
```

---

## ⚠️ 錯誤處理

### HTTP 狀態碼

| 狀態碼 | 說明 | 處理方式 |
|--------|------|----------|
| 200 | 成功 | 正常處理 |
| 201 | 已創建 | POST 成功 |
| 204 | 無內容 | DELETE 成功 |
| 400 | 請求錯誤 | 檢查請求參數 |
| 401 | 未授權 | 重新登入 |
| 403 | 禁止訪問 | 檢查權限 |
| 404 | 未找到 | 資源不存在 |
| 429 | 請求過多 | 速率限制，稍後重試 |
| 500 | 伺服器錯誤 | 稍後重試或聯繫管理員 |

### 錯誤回應格式

```typescript
interface ApiError {
  statusCode: number;
  error: string;              // 錯誤類型
  message: string;            // 錯誤訊息
  details?: any;              // 詳細錯誤資訊（僅開發環境）
}
```

### 錯誤處理範例

```typescript
// src/api/error-handler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json();

    // 401 未授權 → 導向登入頁
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    // 429 速率限制 → 顯示提示
    if (response.status === 429) {
      throw new ApiError(429, 'RateLimitError', '請求過於頻繁，請稍後再試');
    }

    throw new ApiError(
      response.status,
      error.error || 'UnknownError',
      error.message || '發生未知錯誤',
      error.details
    );
  }

  return response.json();
}
```

---

## 💡 實戰範例

### 1. 取得災區列表

```typescript
// src/features/disaster-areas/api.ts
import { apiRequest } from '@/api/client';
import type { components } from '@/shared-types/openapi';

type DisasterArea = components['schemas']['DisasterArea'];

export async function getDisasterAreas(): Promise<DisasterArea[]> {
  return apiRequest('/disaster-areas');
}

// React 使用範例
import { useQuery } from '@tanstack/react-query';

function DisasterAreasPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['disaster-areas'],
    queryFn: getDisasterAreas
  });

  if (isLoading) return <div>載入中...</div>;
  if (error) return <div>錯誤: {error.message}</div>;

  return (
    <ul>
      {data?.map(area => (
        <li key={area.id}>{area.name}</li>
      ))}
    </ul>
  );
}
```

### 2. 創建網格（需驗證）

```typescript
// src/features/grids/api.ts
import { apiRequest } from '@/api/client';
import type { components } from '@/shared-types/openapi';

type Grid = components['schemas']['Grid'];

interface CreateGridData {
  code: string;
  grid_type: 'mud_disposal' | 'manpower' | 'supply_storage' | 'accommodation' | 'food_area';
  disaster_area_id: string;
  center_lat: number;
  center_lng: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  volunteer_needed?: number;
  meeting_point?: string;
  risks_notes?: string;
}

export async function createGrid(data: CreateGridData): Promise<Grid> {
  return apiRequest('/grids', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// React 使用範例
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateGridForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createGrid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids'] });
      alert('網格創建成功！');
    },
    onError: (error: ApiError) => {
      alert(`創建失敗: ${error.message}`);
    }
  });

  const handleSubmit = (formData: CreateGridData) => {
    mutation.mutate(formData);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. 志工報名

```typescript
// src/features/volunteers/api.ts
export async function registerVolunteer(gridId: string): Promise<VolunteerRegistration> {
  return apiRequest('/volunteer-registrations', {
    method: 'POST',
    body: JSON.stringify({ grid_id: gridId })
  });
}

export async function cancelRegistration(registrationId: string): Promise<void> {
  await apiRequest(`/volunteer-registrations/${registrationId}`, {
    method: 'DELETE'
  });
}

// React 使用範例
function VolunteerButton({ gridId }: { gridId: string }) {
  const mutation = useMutation({
    mutationFn: () => registerVolunteer(gridId),
    onSuccess: () => alert('報名成功！'),
    onError: (error: ApiError) => {
      if (error.statusCode === 401) {
        alert('請先登入');
      } else {
        alert(`報名失敗: ${error.message}`);
      }
    }
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? '報名中...' : '我要報名'}
    </button>
  );
}
```

### 4. 取得志工清單（含電話遮罩）

```typescript
// src/features/volunteers/api.ts
interface GetVolunteersParams {
  grid_id?: string;
  status?: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled';
  include_counts?: boolean;
  limit?: number;
  offset?: number;
}

export async function getVolunteers(params: GetVolunteersParams): Promise<VolunteersListResponse> {
  const queryString = new URLSearchParams(params as any).toString();
  return apiRequest(`/volunteers?${queryString}`);
}

// React 使用範例
function VolunteersList({ gridId }: { gridId: string }) {
  const { data } = useQuery({
    queryKey: ['volunteers', gridId],
    queryFn: () => getVolunteers({ grid_id: gridId })
  });

  return (
    <div>
      <h2>志工清單（共 {data?.total} 人）</h2>

      {data?.status_counts && (
        <div>
          <span>待確認: {data.status_counts.pending}</span>
          <span>已確認: {data.status_counts.confirmed}</span>
        </div>
      )}

      <ul>
        {data?.data.map(volunteer => (
          <li key={volunteer.id}>
            <strong>{volunteer.volunteer_name}</strong>
            {/* 根據 can_view_phone 決定是否顯示電話 */}
            {data.can_view_phone && volunteer.volunteer_phone && (
              <span> - {volunteer.volunteer_phone}</span>
            )}
            <span> ({volunteer.status})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🧪 測試策略

### API 測試工具

#### 1. cURL 測試

```bash
# 測試健康檢查
curl http://localhost:8787/healthz

# 測試取得災區列表
curl http://localhost:8787/disaster-areas

# 測試需要驗證的端點
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8787/grids

# 測試 POST
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"name":"測試災區","center_lat":23.8,"center_lng":121.5}' \
     http://localhost:8787/disaster-areas
```

#### 2. Postman / Insomnia

**匯入 OpenAPI 規格**:
1. 開啟 Postman
2. Import → File → 選擇 `api-spec/openapi.yaml`
3. 自動生成所有 API 端點
4. 在 Authorization tab 設定 Bearer Token

#### 3. 前端單元測試

```typescript
// src/api/__tests__/disaster-areas.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getDisasterAreas, createDisasterArea } from '../disaster-areas';

describe('Disaster Areas API', () => {
  beforeAll(() => {
    // 設定測試環境
    localStorage.setItem('authToken', 'test-token');
  });

  it('should fetch disaster areas', async () => {
    const areas = await getDisasterAreas();
    expect(Array.isArray(areas)).toBe(true);
  });

  it('should create disaster area', async () => {
    const newArea = await createDisasterArea({
      name: '測試災區',
      center_lat: 23.8,
      center_lng: 121.5
    });
    expect(newArea.id).toBeDefined();
  });
});
```

---

## ❓ 常見問題

### Q1: 如何處理 CORS 錯誤？

**A**: 開發環境已配置 CORS 允許本地前端訪問。如遇錯誤：

```bash
# 檢查後端 .env 檔案
CORS_ALLOWLIST=http://localhost:5173,http://localhost:3000
```

### Q2: JWT Token 過期怎麼辦？

**A**: Token 預設 24 小時過期。前端應：

1. 偵測 401 錯誤
2. 清除舊 Token
3. 導向登入頁

```typescript
if (response.status === 401) {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}
```

### Q3: 如何限制速率限制 (429)?

**A**: 預設每分鐘 300 次請求。前端應：

1. 避免循環呼叫 API
2. 使用 debounce/throttle
3. 實作重試機制

```typescript
import { useQuery } from '@tanstack/react-query';

useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: (failureCount, error) => {
    // 429 錯誤不重試
    if (error.statusCode === 429) return false;
    return failureCount < 3;
  }
});
```

### Q4: 為什麼志工電話號碼被遮罩？

**A**: 基於隱私保護，後端實作了 Row-Level Security (RLS)。只有網格管理員或特定角色才能看到完整電話號碼。

前端應根據 `can_view_phone` 欄位決定顯示方式：

```typescript
{data.can_view_phone ? volunteer.volunteer_phone : '0912-****-678'}
```

### Q5: 如何除錯 API 呼叫？

**A**: 使用瀏覽器開發者工具：

1. 開啟 Network tab
2. 篩選 Fetch/XHR
3. 檢查 Request Headers, Response

或使用 Pino logger 查看後端日誌：

```bash
# 後端日誌會顯示所有 API 請求
npm run dev:api
```

---

## 📚 額外資源

- **OpenAPI 規格**: `/api-spec/openapi.yaml`
- **後端 README**: `packages/backend/README.md`
- **資料庫 Schema**: `packages/backend/docs/database-schema.md`
- **API 文件預覽**: `npm run openapi:preview`

---

## 🎯 下一步

1. **實作登入功能**: 創建 `/auth/login` 端點產生 JWT
2. **實作分頁**: 使用 `limit` 和 `offset` 參數
3. **WebSocket 支援**: 實時更新志工報名狀態
4. **檔案上傳**: 支援網格照片上傳

---

**最後更新**: 2025-10-02
**版本**: 1.0.0
**維護者**: Shovel Heroes Team
