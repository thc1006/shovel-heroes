# ⚡ 指令速查表

## 📦 安裝

### Windows
```cmd
.\scripts\install-deps.bat
```

### Linux/Mac
```bash
npm install --legacy-peer-deps
```

---

## 🧪 測試

| 指令 | 說明 |
|------|------|
| `npm run test` | 執行所有測試 |
| `npm run test:watch` | 監視模式（自動重新執行） |
| `npm run test:ui` | 開啟測試 UI 介面 |
| `npm run test:coverage` | 產生覆蓋率報告 |
| `npm run test:api` | 僅執行後端 API 測試 |
| `npm run test:components` | 僅執行前端元件測試 |

---

## 📄 OpenAPI

| 指令 | 說明 |
|------|------|
| `npm run openapi:lint` | 驗證 OpenAPI 規格 |
| `npm run openapi:preview` | 預覽 API 文件（瀏覽器） |
| `npm run openapi:bundle` | 打包 OpenAPI 規格 |
| `npm run types:openapi` | 產生 TypeScript 型別 |

---

## 🚀 開發

### 前端
| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動前端開發伺服器 (port 5173) |
| `npm run build` | 建置前端 (生產環境) |
| `npm run preview` | 預覽前端建置結果 |

### 後端
| 指令 | 說明 |
|------|------|
| `npm run dev:api` | 啟動後端 API (port 8787) |
| `npm run build:api` | 建置後端 (TypeScript → JavaScript) |
| `npm --workspace packages/backend run start` | 啟動後端（生產模式） |

---

## 🗄️ 資料庫

### 遷移
```bash
# 套用遷移
npm --workspace packages/backend run migrate:up

# 回退遷移
npm --workspace packages/backend run migrate:down
```

### Docker
```bash
# 啟動資料庫與郵件服務
docker compose up -d db mailhog

# 停止服務
docker compose down

# 檢視 logs
docker compose logs -f db
```

---

## 🔍 程式碼品質

| 指令 | 說明 |
|------|------|
| `npm run lint` | 執行 ESLint 檢查 |
| `npm run typecheck` | TypeScript 型別檢查（若有設定） |
| `npm run codegen` | 產生型別 + 建置 shared-types |

---

## 📊 檢查工具

### 版本檢查
```bash
node --version    # 應該 >= v20.0.0
npm --version     # 應該 >= v10.0.0
```

### 套件檢查
```bash
# 列出已安裝的測試工具
npm list vitest @vitest/ui supertest

# 列出已安裝的 OpenAPI 工具
npm list @stoplight/spectral-cli @redocly/cli openapi-typescript
```

### 檔案檢查
```bash
# 確認 OpenAPI 規格存在
ls -la api-spec/openapi.yaml

# 確認測試設定存在
ls -la vitest.config.js
```

---

## 🐛 故障排除

### 清除快取
```bash
npm cache clean --force
```

### 重新安裝（Windows）
```cmd
# 關閉所有 VS Code 視窗和終端
.\scripts\install-deps.bat
```

### 重新安裝（Linux/Mac）
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 修復權限錯誤（Linux/Mac）
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules
```

---

## 🔐 環境變數

### 前端 (.env)
```env
VITE_USE_REST=true
VITE_API_BASE=http://localhost:8787
```

### 後端 (packages/backend/.env)
```env
DATABASE_URL=postgresql://shovel:shovel@localhost:5432/shovel_heroes
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
SMTP_HOST=localhost
SMTP_PORT=1025
```

---

## 📚 文件連結

### 快速導覽
- 🚀 [安裝指南](./INSTALLATION_GUIDE.md)
- 📋 [執行摘要](./EXECUTION_SUMMARY.md)
- 📦 [更新摘要](./DEPENDENCY_UPDATE_SUMMARY.md)
- 📘 [專案架構](../README.md)
- 🔒 [安全計畫](../CLAUDE.md)
- 🧪 [TDD 指南](../claude-prompts.md)

---

## 🎯 完整開發流程

### 1. 初次設定
```bash
# 1. 安裝依賴
.\scripts\install-deps.bat

# 2. 啟動資料庫
docker compose up -d db mailhog

# 3. 執行遷移
npm --workspace packages/backend run migrate:up

# 4. 驗證環境
npm run test
npm run openapi:lint
```

### 2. 日常開發
```bash
# Terminal 1: 啟動後端
npm run dev:api

# Terminal 2: 啟動前端
npm run dev

# Terminal 3: 執行測試（監視模式）
npm run test:watch
```

### 3. API 開發
```bash
# 1. 修改 OpenAPI 規格
# 編輯 api-spec/openapi.yaml

# 2. 驗證規格
npm run openapi:lint

# 3. 產生型別
npm run types:openapi

# 4. 實作後端
# 編輯 packages/backend/src/

# 5. 撰寫測試
# 建立 tests/api/*.test.js

# 6. 執行測試
npm run test:api
```

### 4. 建置與部署
```bash
# 1. 執行所有測試
npm run test

# 2. 建置前端
npm run build

# 3. 建置後端
npm run build:api

# 4. 驗證建置
npm run preview  # 前端
npm --workspace packages/backend run start  # 後端
```

---

## 🔄 Git 工作流程

### 提交前檢查
```bash
# 1. Lint
npm run lint

# 2. 測試
npm run test

# 3. OpenAPI 驗證
npm run openapi:lint

# 4. 建置
npm run build
npm run build:api
```

### 提交格式（Conventional Commits）
```bash
git commit -m "feat: add user authentication API"
git commit -m "fix: resolve CORS issue in production"
git commit -m "test: add API endpoint tests"
git commit -m "docs: update installation guide"
```

---

## ⚡ 常用組合指令

### 完整驗證
```bash
npm run lint && npm run test && npm run openapi:lint && npm run build
```

### 重置環境
```bash
docker compose down && docker compose up -d && npm --workspace packages/backend run migrate:up
```

### 產生與建置型別
```bash
npm run types:openapi && npm run types:build
```

---

**提示**:
- 將本頁加入書籤以便快速查詢
- 使用 `Ctrl+F` 搜尋指令
- 建議搭配 [安裝指南](./INSTALLATION_GUIDE.md) 使用
