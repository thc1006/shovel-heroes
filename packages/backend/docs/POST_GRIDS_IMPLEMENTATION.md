# POST /grids 端點實作文檔

## 概述
實作 POST /grids 端點，用於創建新的網格（grid）記錄。

## 實作位置
- **路由檔案**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/grids.ts`
- **測試檔案**: `/home/thc1006/dev/shovel-heroes/packages/backend/tests/grids-post.test.ts`
- **Migration**: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0007_add_grid_code_unique_constraint.sql`

## Zod Schema 驗證

```typescript
const CreateGridSchema = z.object({
  code: z.string().min(1).max(50),                    // 必填，1-50 字元
  name: z.string().min(1),                            // 必填
  grid_type: z.enum(['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area']), // 必填
  center_lat: z.number().min(-90).max(90),           // 必填，經度範圍
  center_lng: z.number().min(-180).max(180),         // 必填，緯度範圍
  area_id: z.string().uuid().optional(),              // 選填，UUID 格式
  bounds: z.object({                                  // 選填，邊界座標
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number()
  }).optional(),
  volunteer_needed: z.number().int().min(0).default(0),      // 選填，預設 0
  volunteer_registered: z.number().int().min(0).default(0),  // 選填，預設 0
  supplies_needed: z.array(z.object({                        // 選填，物資清單
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    received: z.number().default(0)
  })).optional(),
  meeting_point: z.string().optional(),               // 選填
  description: z.string().optional(),                 // 選填
  status: z.enum(['open', 'closed', 'completed', 'in_progress', 'preparing']).default('open') // 選填，預設 'open'
});
```

## SQL INSERT 語句

```sql
INSERT INTO grids (
  code, name, area_id, grid_type, center_lat, center_lng, bounds,
  volunteer_needed, volunteer_registered, supplies_needed,
  meeting_point, description, status
) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11, $12, $13)
RETURNING *
```

## HTTP 回應狀態碼

| 狀態碼 | 說明 | 條件 |
|--------|------|------|
| 201 Created | 成功創建 | 請求有效且創建成功 |
| 400 Bad Request | 驗證失敗 | Zod schema 驗證失敗 |
| 401 Unauthorized | 未授權 | 缺少或無效的 JWT token |
| 409 Conflict | 代碼重複 | code 欄位違反 UNIQUE constraint |
| 500 Internal Server Error | 伺服器錯誤 | 資料庫錯誤或其他內部錯誤 |

## 錯誤處理

### 400 Bad Request
```json
{
  "message": "Invalid payload",
  "issues": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["name"],
      "message": "Required"
    }
  ]
}
```

### 409 Conflict
```json
{
  "message": "Grid code already exists"
}
```

## 請求範例

### 成功請求
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
    "bounds": {
      "north": 23.8761,
      "south": 23.8741,
      "east": 121.5790,
      "west": 121.5770
    },
    "volunteer_needed": 20,
    "meeting_point": "光復鄉公所前廣場",
    "description": "市區主要道路清淤作業",
    "status": "open"
  }'
```

### 成功回應（201）
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "code": "A1",
  "name": "光復市區清淤區A1",
  "area_id": null,
  "grid_type": "manpower",
  "status": "open",
  "center_lat": 23.8751,
  "center_lng": 121.5780,
  "bounds": {
    "north": 23.8761,
    "south": 23.8741,
    "east": 121.5790,
    "west": 121.5770
  },
  "volunteer_needed": 20,
  "volunteer_registered": 0,
  "supplies_needed": [],
  "meeting_point": "光復鄉公所前廣場",
  "description": "市區主要道路清淤作業",
  "created_at": "2025-10-02T10:00:00.000Z",
  "updated_at": "2025-10-02T10:00:00.000Z"
}
```

## 資料庫變更

### Migration 0007
添加 UNIQUE constraint 到 `grids.code` 欄位：
```sql
ALTER TABLE grids
  ADD CONSTRAINT grids_code_key UNIQUE (code);
```

此 constraint 確保：
1. 每個 grid code 在資料庫中都是唯一的
2. 當嘗試插入重複的 code 時，PostgreSQL 會拋出 error code `23505`
3. 應用程式捕獲此錯誤並返回 409 Conflict 回應

## 測試

執行測試：
```bash
npm test tests/grids-post.test.ts
```

測試涵蓋：
- ✅ 成功創建 grid
- ✅ 缺少必填欄位的驗證
- ✅ 無效的 grid_type 驗證
- ✅ 無效的座標範圍驗證
- ✅ 未授權存取 (401)
- ✅ 重複 code 衝突 (409)
- ✅ 預設值正確設定

## 安全考量

1. **JWT 驗證**: 使用 `{ preHandler: [app.auth as any] }` 強制要求身份驗證
2. **輸入驗證**: Zod schema 嚴格驗證所有輸入
3. **SQL 注入防護**: 使用參數化查詢
4. **RLS (Row Level Security)**: `withConn` 自動設定 `app.user_id` 用於 RLS
5. **錯誤處理**: 不洩露內部錯誤細節，僅返回適當的錯誤訊息

## 相關檔案

- `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/grids.ts` - 主要實作
- `/home/thc1006/dev/shovel-heroes/packages/backend/src/lib/db.ts` - 資料庫連接與 RLS
- `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0005_expand_grids_table.sql` - grids 表擴展
- `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0007_add_grid_code_unique_constraint.sql` - UNIQUE constraint
