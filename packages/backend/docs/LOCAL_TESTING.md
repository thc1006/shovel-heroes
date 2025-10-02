# Shovel Heroes Backend - 本地測試環境指南

## 📋 環境狀態報告

### ✅ 已完成配置

1. **環境變數檔案** (`packages/backend/.env`)
   - ✓ DATABASE_URL: `postgres://postgres:postgres@localhost:5432/shovelheroes`
   - ✓ JWT_SECRET: 已設定（開發環境用）
   - ✓ PORT: 8787
   - ✓ CORS_ALLOWLIST: 開發埠已配置
   - ✓ RATE_LIMIT: 300 請求/分鐘

2. **TypeScript 配置** (`tsconfig.json`)
   - ✓ 目標: ES2022
   - ✓ 模組系統: ES2022
   - ✓ 嚴格模式: 已啟用
   - ✓ 輸出目錄: dist/

3. **後端程式碼** (`src/index.ts`)
   - ✓ Fastify 伺服器設定
   - ✓ 安全中介層 (Helmet, CORS, Rate Limit)
   - ✓ JWT 認證
   - ✓ 全域錯誤處理
   - ✓ 優雅關閉機制
   - ✓ 路由註冊 (9 個路由模組)

4. **核心函式庫**
   - ✓ `src/lib/env.ts` - 環境變數驗證
   - ✓ `src/lib/db.ts` - 資料庫連線池
   - ✓ `src/lib/logger.ts` - 日誌記錄

### ⚠️ 待處理項目

1. **Docker 服務**
   - ❌ PostgreSQL 容器未運行
   - **需執行**: `docker compose up -d db`

2. **npm 依賴**
   - ⚠️ 部分開發依賴缺失 (vitest, pino-pretty)
   - **建議執行**: `npm install`

3. **資料庫遷移**
   - ⚠️ 狀態未知（需要啟動 PostgreSQL 後檢查）
   - **需執行**: `npm run migrate:up`

---

## 🚀 快速開始

### 方法 1: 使用快速啟動腳本（推薦）

```bash
cd packages/backend

# 一鍵啟動（包含所有設定）
./scripts/quick-start.sh

# 啟動開發伺服器
npm run dev
```

### 方法 2: 手動步驟

```bash
# 1. 啟動 PostgreSQL
docker compose up -d db

# 2. 等待資料庫就緒（約 5 秒）
docker exec shovelheroes-postgres pg_isready -U postgres

# 3. 安裝依賴
cd packages/backend
npm install

# 4. 執行資料庫遷移
npm run migrate:up

# 5. 編譯 TypeScript
npm run build

# 6. 啟動開發伺服器
npm run dev
```

---

## 🧪 測試工具

### 1. 環境驗證腳本

完整檢查環境配置：

```bash
cd packages/backend
./scripts/local-test.sh
```

**檢查項目**：
- ✓ Node.js 版本
- ✓ npm 依賴安裝
- ✓ .env 配置
- ✓ PostgreSQL 連線
- ✓ TypeScript 編譯
- ✓ 路由文件存在

### 2. 資料庫連線測試

詳細的資料庫連線診斷：

```bash
cd packages/backend
node scripts/test-db-connection.js
```

**提供資訊**：
- PostgreSQL 版本
- 資料庫名稱和大小
- 現有資料表列表
- 連線池狀態
- 錯誤診斷建議

### 3. API 健康檢查

啟動伺服器後測試：

```bash
# 健康檢查端點
curl http://localhost:8787/healthz

# 應返回類似:
# {
#   "status": "ok",
#   "timestamp": "2025-10-02T...",
#   "database": "healthy",
#   "uptime": 123.456
# }

# 根端點
curl http://localhost:8787/
# { "ok": true }
```

---

## 📝 可用的 npm 指令

### 開發

```bash
npm run dev          # 啟動開發伺服器（熱重載）
npm run build        # 編譯 TypeScript
npm run start        # 啟動生產伺服器
```

### 測試

```bash
npm run test         # 執行測試
npm run test:watch   # 監控模式執行測試
npm run test:coverage # 測試覆蓋率報告
npm run test:ui      # 測試 UI 介面
```

### 資料庫遷移

```bash
npm run migrate:up      # 執行遷移
npm run migrate:down    # 回滾上一次遷移
npm run migrate:create  # 建立新遷移
npm run migrate:redo    # 回滾並重新執行
```

### 程式碼品質

```bash
npm run lint            # TypeScript 型別檢查
npm run format          # 格式化程式碼
npm run format:check    # 檢查格式
```

---

## 🔍 故障排除

### 問題 1: PostgreSQL 連線失敗

**錯誤訊息**: `ECONNREFUSED`

**解決方法**:
```bash
# 檢查容器狀態
docker ps | grep postgres

# 如未運行，啟動容器
docker compose up -d db

# 檢查日誌
docker logs shovelheroes-postgres
```

### 問題 2: TypeScript 編譯錯誤

**錯誤訊息**: 模組解析錯誤

**解決方法**:
```bash
# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install

# 清理並重建
rm -rf dist
npm run build
```

### 問題 3: JWT_SECRET 警告

**錯誤訊息**: JWT_SECRET is set to default value

**解決方法**:
- 開發環境：可忽略（已在 .env 中設定）
- 生產環境：**必須**更改為隨機字串（至少 32 字元）

```bash
# 生成安全的 JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 問題 4: 連接埠被佔用

**錯誤訊息**: `EADDRINUSE: address already in use :::8787`

**解決方法**:
```bash
# 找出佔用連接埠的程序
lsof -i :8787

# 終止該程序
kill -9 <PID>

# 或更改 .env 中的 PORT
```

---

## 🔐 安全注意事項

### 開發環境

- ✓ 使用預設的開發用 JWT_SECRET
- ✓ CORS 允許 localhost
- ✓ 日誌級別設為 info

### 生產環境部署前檢查

- [ ] 更改 JWT_SECRET 為強隨機值
- [ ] 設定正確的 CORS_ALLOWLIST
- [ ] 啟用 HSTS（在 CloudFlare 層級）
- [ ] 調整 RATE_LIMIT 參數
- [ ] 檢查資料庫 RLS 政策
- [ ] 設定正確的 SMTP 配置

---

## 📊 效能監控

### 開發環境監控

```bash
# 查看伺服器日誌
npm run dev

# 監控資料庫查詢（在另一個終端）
docker exec -it shovelheroes-postgres psql -U postgres -d shovelheroes
# 啟用查詢日誌
SET log_statement = 'all';
```

### 記憶體使用

```bash
# Node.js 記憶體使用情況
node --max-old-space-size=512 dist/index.js
```

---

## 🐛 除錯技巧

### 啟用詳細日誌

修改 `.env`:
```env
LOG_LEVEL=debug
```

### 使用 VSCode 偵錯器

建立 `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/packages/backend/src/index.ts",
      "runtimeArgs": ["--loader", "tsx"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 📚 相關文件

- [README.md](../../../README.md) - 專案總覽
- [CLAUDE.md](../../../CLAUDE.md) - 開發規範
- [OpenAPI 規格](../../../api-spec/openapi.yaml) - API 文件
- [安全計畫](../../../docs/security-patch.md) - 安全修補

---

## 🆘 需要協助？

1. 檢查 [GitHub Issues](https://github.com/your-repo/shovel-heroes/issues)
2. 查看 Docker 日誌: `docker logs shovelheroes-postgres`
3. 執行診斷腳本: `./scripts/local-test.sh`
4. 檢查環境變數: `cat .env`

---

**最後更新**: 2025-10-02
