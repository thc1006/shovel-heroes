# 安裝指南

## 快速開始

### Windows 用戶
```cmd
# 執行安裝腳本
.\scripts\install-deps.bat
```

### Linux/Mac 用戶
```bash
# 使用 legacy peer deps 解決 React 版本衝突
npm install --legacy-peer-deps
```

---

## 已知問題與解決方案

### 問題 1: React 版本衝突
**錯誤訊息**: `peer react@"^19.0.0" from react-leaflet@5.0.0`

**原因**: `react-leaflet` 需要 React 19，但專案使用 React 18

**解決方案**:
```bash
npm install --legacy-peer-deps
```

### 問題 2: Windows 文件鎖定
**錯誤訊息**: `EPERM: operation not permitted, rmdir`

**解決方案**:
1. 關閉所有 VS Code 視窗
2. 關閉所有終端
3. 執行安裝腳本: `.\scripts\install-deps.bat`

### 問題 3: 依賴衝突
**解決方案**:
```bash
# 清除快取
npm cache clean --force

# 刪除 node_modules (需要關閉所有編輯器)
rm -rf node_modules package-lock.json

# 重新安裝
npm install --legacy-peer-deps
```

---

## 驗證安裝

### 1. 檢查 Node.js 版本
```bash
node --version
# 預期輸出: v20.x.x 或更高
```

### 2. 檢查 npm 版本
```bash
npm --version
# 預期輸出: v10.x.x 或更高
```

### 3. 執行測試
```bash
# 確認測試框架已安裝
npm run test -- --version

# 執行測試（目前可能沒有測試檔案）
npm run test
```

### 4. 驗證 OpenAPI 工具
```bash
# 檢查 OpenAPI 規格
npm run openapi:lint
```

---

## 安裝後步驟

### 1. 啟動開發環境
```bash
# 啟動資料庫和郵件服務（需要 Docker）
docker compose up -d db mailhog

# 執行資料庫遷移
npm run migrate:up

# 啟動後端 API
npm run dev:api

# 啟動前端（另開終端）
npm run dev
```

### 2. 執行測試
```bash
# 運行所有測試
npm run test

# 監視模式（自動重新執行）
npm run test:watch

# 測試 UI 介面
npm run test:ui

# 產生覆蓋率報告
npm run test:coverage
```

### 3. API 開發
```bash
# 驗證 OpenAPI 規格
npm run openapi:lint

# 預覽 API 文件
npm run openapi:preview

# 產生 TypeScript 型別
npm run types:openapi
```

---

## 故障排除

### npm install 持續失敗

1. **清除所有快取**
   ```bash
   npm cache clean --force
   rm -rf ~/.npm
   ```

2. **使用 force 標記**
   ```bash
   npm install --legacy-peer-deps --force
   ```

3. **檢查網路連線**
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

### 測試無法執行

1. **確認 vitest 已安裝**
   ```bash
   npm list vitest
   ```

2. **檢查測試設定檔**
   - 確認有 `vitest.config.ts` 或 `vite.config.ts`
   - 參考 claude-prompts.md 的 TDD 設定

### OpenAPI 工具錯誤

1. **確認規格檔案存在**
   ```bash
   ls -la api-spec/openapi.yaml
   ```

2. **檢查工具安裝**
   ```bash
   npm list @stoplight/spectral-cli @redocly/cli
   ```

---

## 環境變數設定

### 前端 (.env)
```env
# REST API 模式（預設）
VITE_USE_REST=true
VITE_API_BASE=http://localhost:8787
```

### 後端 (packages/backend/.env)
```env
# 資料庫
DATABASE_URL=postgresql://shovel:shovel@localhost:5432/shovel_heroes

# JWT
JWT_SECRET=your-secret-key-change-in-production

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# 郵件（開發）
SMTP_HOST=localhost
SMTP_PORT=1025
```

---

## 相關文件

- [依賴更新摘要](./DEPENDENCY_UPDATE_SUMMARY.md)
- [專案架構](../README.md)
- [安全計畫](../CLAUDE.md)
- [TDD 指南](../claude-prompts.md)

---

**安裝腳本位置**: `C:\Users\thc1006\Desktop\er\shovel-heroes\scripts\install-deps.bat`
