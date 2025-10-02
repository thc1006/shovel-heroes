# 志工 API 測試快速啟動指南

## 🚀 快速開始（5 分鐘）

### 1️⃣ 安裝依賴

由於專案有 peer dependency 衝突（react-leaflet 需要 React 19），使用 `--legacy-peer-deps`:

```bash
npm install --legacy-peer-deps
```

### 2️⃣ 執行所有志工測試

```bash
# 執行兩個志工測試檔案
npm test -- tests/api/endpoints/volunteers.test.js tests/api/endpoints/functions-volunteers.test.js
```

### 3️⃣ 執行單一測試檔案

```bash
# 只測試 CRUD 功能
npm test -- tests/api/endpoints/volunteers.test.js

# 只測試權限邏輯
npm test -- tests/api/endpoints/functions-volunteers.test.js
```

---

## 📝 測試內容概覽

### 檔案 1: `volunteers.test.js` (23 個測試)
- ✅ VolunteerRegistration.list() - 過濾與查詢
- ✅ VolunteerRegistration.get() - 取得單筆
- ✅ VolunteerRegistration.create() - 建立報名 + Grid 計數器
- ✅ VolunteerRegistration.update() - 更新狀態
- ✅ VolunteerRegistration.delete() - 取消報名

### 檔案 2: `functions-volunteers.test.js` (36 個測試)
- ✅ 未登入使用者 - can_view_phone = false
- ✅ 一般使用者 - can_view_phone = false
- ✅ Grid Manager (自己網格) - can_view_phone = **true** ⭐
- ✅ Grid Manager (其他網格) - can_view_phone = false
- ✅ Admin - can_view_phone = **true** (任何網格) ⭐
- ✅ 回應結構驗證
- ✅ 過濾與分頁

---

## 🔍 關鍵權限測試

### 權限邏輯（Line 309-324）

```typescript
function canViewPhone(currentUser: User, grid: Grid): boolean {
  if (!currentUser) return false;                    // ❌ 未登入
  if (currentUser.role === 'admin') return true;     // ✅ Admin
  if (currentUser.role === 'grid_manager' &&
      currentUser.id === grid.grid_manager_id)
    return true;                                     // ✅ 自己的網格
  return false;                                      // ❌ 其他
}
```

### 測試矩陣

| 使用者 | can_view_phone | volunteer_phone |
|-------|----------------|-----------------|
| 未登入 | ❌ false | 不顯示 |
| 一般使用者 | ❌ false | 不顯示 |
| Grid Manager (自己) | ✅ true | **完整顯示** |
| Grid Manager (他人) | ❌ false | 不顯示 |
| Admin | ✅ true | **完整顯示** |

---

## 🧪 測試模式

### Watch 模式（開發時使用）
```bash
npm run test:watch
```

### 產生覆蓋率報告
```bash
npm run test:coverage
```

覆蓋率報告會在 `coverage/` 目錄：
- `coverage/index.html` - HTML 報告
- `coverage/coverage-final.json` - JSON 報告

### UI 介面模式
```bash
npm run test:ui
```

在瀏覽器查看測試結果和覆蓋率。

---

## 🐛 除錯測試

### 查看測試詳細輸出
```bash
npm test -- --reporter=verbose tests/api/endpoints/volunteers.test.js
```

### 只執行特定測試
```bash
# 只執行 describe 區塊中的測試
npm test -- -t "VolunteerRegistration - create"

# 只執行特定 it 測試
npm test -- -t "should successfully create new volunteer registration"
```

### 跳過某些測試
```javascript
it.skip('暫時跳過此測試', async () => {
  // ...
});

describe.skip('跳過整個測試群組', () => {
  // ...
});
```

---

## ✅ 預期結果

執行成功時應看到：

```
✓ tests/api/endpoints/volunteers.test.js (23)
  ✓ VolunteerRegistration - list() (4)
  ✓ VolunteerRegistration - get() (2)
  ✓ VolunteerRegistration - create() (5)
  ✓ VolunteerRegistration - update() (5)
  ✓ VolunteerRegistration - delete() (5)
  ✓ VolunteerRegistration - filter() (2)

✓ tests/api/endpoints/functions-volunteers.test.js (36)
  ✓ Functions.getVolunteers() - Unauthenticated (3)
  ✓ Functions.getVolunteers() - Regular User (2)
  ✓ Functions.getVolunteers() - Grid Manager (Own) (2)
  ✓ Functions.getVolunteers() - Grid Manager (Other) (2)
  ✓ Functions.getVolunteers() - Admin (3)
  ✓ Functions.getVolunteers() - Response Structure (6)
  ✓ Functions.getVolunteers() - Filtering & Pagination (5)
  ✓ Functions.getVolunteers() - Permission Logic Summary (1)

Test Files  2 passed (2)
     Tests  59 passed (59)
  Start at  10:30:00
  Duration  1.23s
```

---

## ❌ 常見問題

### 問題 1: `Cannot find package 'happy-dom'`
**解決方案**:
```bash
npm install --legacy-peer-deps
```

### 問題 2: `vitest` 不是內部或外部命令
**解決方案**:
```bash
# 方法 1: 使用 npx
npx vitest run tests/api/endpoints/volunteers.test.js

# 方法 2: 安裝全域
npm install -g vitest

# 方法 3: 使用 npm test（推薦）
npm test -- tests/api/endpoints/volunteers.test.js
```

### 問題 3: Peer dependency 衝突
**解決方案**:
```bash
# 使用 legacy peer deps
npm install --legacy-peer-deps

# 或強制安裝
npm install --force
```

### 問題 4: 測試超時
**解決方案**:

在 `vite.config.js` 增加 timeout:
```javascript
test: {
  testTimeout: 10000, // 10 秒
}
```

---

## 📚 相關文件

- **詳細測試報告**: [TEST_REPORT_VOLUNTEERS.md](./TEST_REPORT_VOLUNTEERS.md)
- **API 整合指南**: [BACKEND_API_INTEGRATION_GUIDE.md](../BACKEND_API_INTEGRATION_GUIDE.md) (Line 264-334)
- **安全計畫**: [CLAUDE.md](../CLAUDE.md)

---

## 🔧 進階配置

### 自訂測試環境

編輯 `vite.config.js`:

```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // 或 'happy-dom' 用於 UI 測試
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/api/**/*.js'],
      exclude: ['**/*.test.js', '**/node_modules/**'],
    },
  },
});
```

### 平行執行測試

```bash
# 使用 4 個 worker 平行執行
npm test -- --threads --maxThreads=4
```

### CI/CD 整合

在 `.github/workflows/test.yml`:

```yaml
- name: Run Volunteer API Tests
  run: |
    npm install --legacy-peer-deps
    npm test -- tests/api/endpoints/volunteers.test.js tests/api/endpoints/functions-volunteers.test.js
```

---

## 🎯 下一步

1. ✅ 執行測試確認所有案例通過
2. ✅ 檢查覆蓋率報告（目標 80%+）
3. ✅ 實作後端權限邏輯
4. ✅ 實作 Grid 計數器更新
5. ✅ 實作重複報名檢查
6. ✅ 整合到 CI/CD pipeline

---

**最後更新**: 2025-10-02
**維護者**: Backend API Developer Team
