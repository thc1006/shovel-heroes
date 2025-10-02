# POST /grids 端點實作總結

## 完成狀態: ✅ 已完成

## 實作內容

### 1. Zod Schema 驗證 ✅
**位置**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/grids.ts` (line 9-33)

**必填欄位**:
- `code`: string (1-50 字元)
- `name`: string (min 1 字元)
- `grid_type`: enum
- `center_lat`: number (-90 to 90)
- `center_lng`: number (-180 to 180)

**選填欄位**:
- `area_id`: UUID string
- `volunteer_needed`: integer (min 0, default 0)
- `volunteer_registered`: integer (min 0, default 0)
- `bounds`: object with north, south, east, west
- `supplies_needed`: array of objects
- `meeting_point`: string
- `description`: string
- `status`: enum (default 'open')

### 2. SQL INSERT 語句 ✅
**位置**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/grids.ts` (line 86-111)

```sql
INSERT INTO grids (
  code, name, area_id, grid_type, center_lat, center_lng, bounds,
  volunteer_needed, volunteer_registered, supplies_needed,
  meeting_point, description, status
) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11, $12, $13)
RETURNING *
```

**特點**:
- 使用參數化查詢防止 SQL 注入
- JSONB 欄位正確處理 (`bounds`, `supplies_needed`)
- 使用預設值 (volunteer_needed, volunteer_registered, status)
- RETURNING * 返回完整的新建記錄

### 3. 錯誤處理 ✅
**位置**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/grids.ts` (line 114-123)

| HTTP 狀態碼 | 錯誤類型 | 實作 |
|------------|---------|------|
| 400 | Zod 驗證失敗 | ✅ line 64-66 |
| 401 | 未授權 | ✅ `{ preHandler: [app.auth] }` |
| 409 | code 重複 | ✅ line 118-120 |
| 500 | 資料庫錯誤 | ✅ line 122 |

**409 衝突處理**:
```typescript
if (err.code === '23505' && err.constraint?.includes('code')) {
  return reply.code(409).send({ message: 'Grid code already exists' });
}
```

### 4. 資料庫 Migration ✅
**檔案**: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0007_add_grid_code_unique_constraint.sql`

```sql
ALTER TABLE grids
  ADD CONSTRAINT grids_code_key UNIQUE (code);
```

此 migration 確保 `code` 欄位的唯一性，使 409 錯誤處理能夠正常工作。

### 5. 測試檔案 ✅
**檔案**: `/home/thc1006/dev/shovel-heroes/packages/backend/tests/grids-post.test.ts`

**測試覆蓋**:
- ✅ 成功創建 grid (201)
- ✅ 缺少必填欄位 (400)
- ✅ 無效的 grid_type (400)
- ✅ 無效的座標範圍 (400)
- ✅ 未授權存取 (401)
- ✅ 重複 code 衝突 (409)
- ✅ 預設值正確設定

## 驗證結果

### TypeScript 編譯 ✅
```bash
$ npm run build
> tsc -p tsconfig.json
# 成功，無錯誤
```

### 程式碼結構 ✅
- 遵循專案現有模式 (參考 `announcements.ts`, `disaster-areas.ts`)
- 使用 `withConn` 進行資料庫操作並支援 RLS
- 使用 `app.auth` preHandler 進行身份驗證
- 錯誤處理一致且安全

## 檔案清單

1. **主要實作**
   - `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/grids.ts`

2. **資料庫 Migration**
   - `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0007_add_grid_code_unique_constraint.sql`

3. **測試檔案**
   - `/home/thc1006/dev/shovel-heroes/packages/backend/tests/grids-post.test.ts`

4. **文檔**
   - `/home/thc1006/dev/shovel-heroes/packages/backend/docs/POST_GRIDS_IMPLEMENTATION.md`
   - `/home/thc1006/dev/shovel-heroes/packages/backend/docs/IMPLEMENTATION_SUMMARY.md`

## 使用範例

### cURL 請求
```bash
curl -X POST http://localhost:3000/grids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "A1",
    "name": "光復市區清淤區A1",
    "grid_type": "manpower",
    "center_lat": 23.8751,
    "center_lng": 121.5780,
    "volunteer_needed": 20,
    "meeting_point": "光復鄉公所前廣場",
    "status": "open"
  }'
```

### 成功回應 (201)
```json
{
  "id": "uuid-here",
  "code": "A1",
  "name": "光復市區清淤區A1",
  "grid_type": "manpower",
  "center_lat": 23.8751,
  "center_lng": 121.578,
  "volunteer_needed": 20,
  "volunteer_registered": 0,
  "status": "open",
  "meeting_point": "光復鄉公所前廣場",
  "created_at": "2025-10-02T10:00:00.000Z",
  "updated_at": "2025-10-02T10:00:00.000Z"
}
```

## 安全特性

1. **JWT 身份驗證**: 所有 POST 請求都需要有效的 JWT token
2. **輸入驗證**: Zod schema 嚴格驗證所有輸入數據
3. **SQL 注入防護**: 使用參數化查詢
4. **RLS 支援**: 通過 `withConn(fn, userId)` 自動設定 RLS context
5. **錯誤處理**: 不洩露內部實作細節

## 後續步驟

### 執行 Migration
```bash
npm run migrate:up
```

### 執行測試
```bash
npm test tests/grids-post.test.ts
```

### 啟動開發伺服器
```bash
npm run dev
```

## 注意事項

1. **name 欄位**: 雖然任務需求未明確提及，但因資料庫 `grids.name` 為 `NOT NULL`，所以保留為必填欄位
2. **code UNIQUE constraint**: 需要先執行 migration 0007 才能啟用 409 錯誤處理
3. **JSONB 欄位**: `bounds` 和 `supplies_needed` 正確處理為 JSONB 類型
4. **預設值**: Zod schema 中的預設值 (`volunteer_needed: 0`, `status: 'open'`) 會在 SQL INSERT 時使用

## 符合需求檢查表

- ✅ POST /grids 路由實作
- ✅ 需要授權 (JWT)
- ✅ Zod schema 驗證
- ✅ 必填欄位: code, grid_type, center_lat, center_lng (+ name for DB constraint)
- ✅ 選填欄位: area_id, volunteer_needed, bounds, meeting_point, supplies_needed, status
- ✅ SQL INSERT 語句正確
- ✅ 400 錯誤: Zod 驗證失敗
- ✅ 401 錯誤: 未授權
- ✅ 409 錯誤: code 重複
- ✅ 500 錯誤: 資料庫錯誤
- ✅ TypeScript 編譯通過
- ✅ 測試檔案已創建
