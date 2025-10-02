# API Endpoint Diagnostic Report
## 失敗端點根因分析

**測試時間**: 2025-10-02T11:22:33Z
**失敗端點**: 3/19 (15.8%)

---

## ❌ 失敗端點詳情

### 1. GET /volunteer-registrations (500 Internal Server Error)

**錯誤**: `{"message": "Internal error"}`
**回應時間**: 19ms

#### 程式碼分析
```typescript
// packages/backend/src/routes/volunteer-registrations.ts:19-20
const { rows } = await c.query(
  'SELECT id, grid_id, user_id, created_at FROM volunteer_registrations ORDER BY created_at DESC LIMIT 200'
);
```

#### 可能原因
1. **資料表不存在**: `volunteer_registrations` 表可能未正確建立
2. **欄位缺失**: 表存在但缺少 `created_at` 或其他欄位
3. **RLS 阻擋**: Row-Level Security 政策阻止匿名查詢

#### 診斷指令
```sql
-- 檢查表是否存在
\dt volunteer_registrations

-- 檢查表結構
\d volunteer_registrations

-- 測試查詢
SELECT id, grid_id, user_id, created_at
FROM volunteer_registrations
LIMIT 1;
```

---

### 2. GET /volunteers (500 Internal Server Error)

**錯誤**: `{"message": "Internal error"}`
**回應時間**: 13ms

#### 可能原因
1. **路由未實作**: `/volunteers` 端點可能尚未完整實作
2. **視圖不存在**: 如果使用資料庫視圖，可能未建立
3. **隱私欄位錯誤**: 隱私保護邏輯(如隱藏手機號碼)有問題

#### 診斷指令
```bash
# 檢查路由檔案
ls -la packages/backend/src/routes/volunteers.ts

# 搜尋相關程式碼
grep -r "\/volunteers" packages/backend/src/
```

---

### 3. GET /supply-donations (500 Internal Server Error)

**錯誤**: `{"message": "Internal error"}`
**回應時間**: 14ms

#### 可能原因
1. **資料表不存在**: `supply_donations` 表可能未建立
2. **外鍵約束錯誤**: 相關聯的表(如 `grids`)有問題
3. **JSON 欄位錯誤**: 如果有 JSONB 欄位，可能有語法錯誤

#### 診斷指令
```sql
-- 檢查表
\dt supply_donations

-- 檢查外鍵
\d supply_donations

-- 測試查詢
SELECT * FROM supply_donations LIMIT 1;
```

---

## 🔍 遷移檔案分析

### 已確認的遷移檔案

```bash
0001_init.sql                              # 初始化
0002_rls.sql                               # RLS 政策
0003_audit.sql                             # 稽核表
0004_create_all_tables.sql                 # ⚠️ 主要表建立
0005_expand_grids_table.sql                # 擴充 grids 表
0006_add_announcement_fields.sql           # 公告欄位
0007_auto_update_volunteer_count.sql       # ✅ 志工計數
0007_add_grid_code_unique_constraint.sql   # Grid code 唯一性
0008_add_volunteer_registration_statuses.sql # ✅ 志工狀態
```

### 🚨 關鍵發現

**Migration 0004** (`create_all_tables.sql`) 應該包含:
- `volunteer_registrations` 表 ✅ (有後續 0007/0008 遷移)
- `supply_donations` 表 ❓ (需確認)
- `volunteers` 視圖/表 ❓ (需確認)

### 建議檢查步驟

```bash
# 1. 檢查 0004 遷移內容
cat packages/backend/migrations/0004_create_all_tables.sql | grep -A 20 "volunteer"

# 2. 檢查 0004 遷移內容
cat packages/backend/migrations/0004_create_all_tables.sql | grep -A 20 "supply"

# 3. 列出資料庫所有表
psql -U postgres -d shovel_heroes -c "\dt"

# 4. 檢查遷移歷史
psql -U postgres -d shovel_heroes -c "SELECT * FROM pgmigrations ORDER BY run_on DESC;"
```

---

## 🔧 修復建議

### 立即行動 (Critical)

1. **確認遷移狀態**
   ```bash
   cd /home/thc1006/dev/shovel-heroes/packages/backend
   npm run migrate status
   ```

2. **執行未完成的遷移**
   ```bash
   npm run migrate up
   ```

3. **手動建立缺失的表** (如果遷移未包含)
   ```sql
   -- 如果 supply_donations 不存在
   CREATE TABLE supply_donations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     grid_id UUID REFERENCES grids(id) ON DELETE CASCADE,
     donor_name VARCHAR(100),
     items JSONB NOT NULL,
     status VARCHAR(20) DEFAULT 'pending',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- 啟用 RLS
   ALTER TABLE supply_donations ENABLE ROW LEVEL SECURITY;

   -- 公開讀取政策
   CREATE POLICY "Public can read supply_donations"
     ON supply_donations FOR SELECT
     USING (true);
   ```

4. **檢查 RLS 政策**
   ```sql
   -- 確保匿名使用者可讀取
   SELECT schemaname, tablename, policyname, permissive, roles, cmd
   FROM pg_policies
   WHERE tablename IN ('volunteer_registrations', 'supply_donations', 'volunteers');
   ```

### 中期改進 (Important)

5. **新增錯誤日誌**
   - 在 Fastify 日誌中記錄詳細 SQL 錯誤
   - 使用環境變數控制錯誤詳細程度

6. **新增健康檢查**
   ```typescript
   // 擴充 /healthz 端點
   app.get('/healthz', async () => {
     const tables = await checkTables([
       'grids',
       'disaster_areas',
       'volunteer_registrations',
       'supply_donations',
       'announcements'
     ]);
     return {
       status: 'ok',
       db: 'connected',
       tables
     };
   });
   ```

---

## 📊 資料庫狀態檢查清單

- [ ] `volunteer_registrations` 表存在
- [ ] `supply_donations` 表存在
- [ ] `volunteers` 視圖/表存在
- [ ] RLS 政策允許公開讀取
- [ ] 所有遷移已執行完成
- [ ] 外鍵約束正確設定
- [ ] JSONB 欄位格式正確

---

## 🎯 測試腳本

**快速診斷**:
```bash
# 執行診斷腳本
cat > /tmp/db-diagnostic.sql <<'EOF'
-- 檢查所有表
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 檢查 volunteer_registrations
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'volunteer_registrations'
) AS volunteer_reg_exists;

-- 檢查 supply_donations
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'supply_donations'
) AS supply_donations_exists;

-- 檢查 volunteers
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'volunteers'
) AS volunteers_exists;

-- 檢查 RLS 政策
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('volunteer_registrations', 'supply_donations', 'volunteers')
GROUP BY tablename;
EOF

psql -U postgres -d shovel_heroes -f /tmp/db-diagnostic.sql
```

---

## 📝 後續步驟

1. ✅ 執行上述診斷腳本
2. ⏳ 根據結果修復缺失的表/政策
3. ⏳ 重新執行 API 整合測試
4. ⏳ 更新遷移檔案(如需要)
5. ⏳ 提交修復並通過 CI/CD

---

**報告產生時間**: 2025-10-02T11:24:00Z
**診斷工具**: Claude Code (QA Agent)
**建議優先級**: P0 (Critical - 阻擋生產部署)
