# 🔍 Shovel Heroes Backend - 環境狀態報告

**生成時間**: 2025-10-02
**專案路徑**: `/home/thc1006/dev/shovel-heroes`

---

## ✅ 環境配置狀態總覽

| 項目 | 狀態 | 說明 |
|------|------|------|
| Node.js | ✅ | v18+ (已驗證) |
| Docker | ✅ | v28.4.0 (已安裝) |
| Docker Compose | ✅ | v2.39.4 (已安裝) |
| TypeScript | ✅ | 編譯成功 |
| .env 配置 | ✅ | 已正確設定 |
| PostgreSQL 容器 | ⚠️ | **未運行**（需啟動） |
| npm 依賴 | ⚠️ | 大部分已安裝（缺少測試套件） |
| 資料庫遷移 | ⏳ | 待 PostgreSQL 啟動後執行 |

---

## 📦 已完成的配置

### 1. 環境變數 (.env)

✅ **檔案路徑**: `/home/thc1006/dev/shovel-heroes/packages/backend/.env`

```env
NODE_ENV=development
PORT=8787
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes
JWT_SECRET=dev_secret_change_me_in_production_minimum_32_chars
CORS_ALLOWLIST=http://localhost:5173,http://localhost:3000
LOG_LEVEL=info
SMTP_HOST=localhost
SMTP_PORT=1025
RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW=1m
```

**安全檢查**:
- ✅ DATABASE_URL 配置正確
- ✅ JWT_SECRET 已設定（開發用）
- ✅ CORS 限制在開發埠
- ⚠️ **生產環境部署前必須更改 JWT_SECRET**

### 2. TypeScript 編譯

✅ **編譯狀態**: 成功
✅ **輸出目錄**: `/home/thc1006/dev/shovel-heroes/packages/backend/dist/`

**編譯輸出**:
```
dist/
├── index.js              ✅ (主程式)
├── index.test.js         ✅ (測試)
├── lib/                  ✅ (核心函式庫)
│   ├── db.js
│   ├── env.js
│   └── logger.js
├── modules/              ✅ (業務模組)
└── routes/               ✅ (11 個路由文件)
```

### 3. 後端架構

✅ **主程式**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/index.ts`

**已實作功能**:
- ✅ Fastify 伺服器框架
- ✅ Helmet 安全標頭
- ✅ CORS 跨域保護（允許清單機制）
- ✅ Rate Limiting（300 請求/分鐘）
- ✅ JWT 認證中介層
- ✅ 全域錯誤處理
- ✅ 優雅關閉機制
- ✅ 請求 ID 追蹤
- ✅ 安全事件日誌

**路由模組** (11 個):
1. `/healthz` - 健康檢查
2. `/grids` - 網格管理
3. `/disaster-areas` - 災區管理
4. `/volunteers` - 志願者管理
5. `/volunteer-registrations` - 志願者註冊
6. `/users` - 使用者管理
7. `/announcements` - 公告系統
8. `/supply-donations` - 物資捐贈
9. `/grid-discussions` - 網格討論
10. `/` - 根端點
11. 其他內部路由

### 4. 核心函式庫

✅ **lib/env.ts** - 環境變數驗證
- 使用 Zod 進行型別安全驗證
- 自動載入 .env 檔案
- 提供 `validateEnv()` 確保啟動安全

✅ **lib/db.ts** - 資料庫連線池
- PostgreSQL 連線池管理
- RLS (Row Level Security) 支援
- 優雅的連線關閉

✅ **lib/logger.ts** - 結構化日誌
- Pino 高效能日誌
- 安全事件追蹤
- 開發/生產模式切換

### 5. Docker 配置

✅ **docker-compose.yml** 已配置兩個服務:

**PostgreSQL**:
- Image: `postgres:16-alpine`
- Container: `shovelheroes-postgres`
- Port: `5432`
- Database: `shovelheroes`
- Health Check: 已啟用

**MailHog** (開發用):
- SMTP Port: `1025`
- Web UI: `http://localhost:8025`

---

## ⚠️ 待處理項目

### 1. 啟動 PostgreSQL 容器

**狀態**: ❌ 未運行
**優先級**: 🔴 高

**執行指令**:
```bash
cd /home/thc1006/dev/shovel-heroes
docker compose up -d db
```

**驗證**:
```bash
docker ps | grep shovelheroes-postgres
docker exec shovelheroes-postgres pg_isready -U postgres
```

### 2. 安裝缺失的 npm 依賴

**狀態**: ⚠️ 部分缺失
**優先級**: 🟡 中

**缺失套件**:
- `@vitest/coverage-v8` (測試覆蓋率)
- `@vitest/ui` (測試 UI)
- `pino-pretty` (日誌美化)

**執行指令**:
```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
npm install
```

### 3. 執行資料庫遷移

**狀態**: ⏳ 待執行
**優先級**: 🟡 中

**前置條件**: PostgreSQL 容器必須運行

**執行指令**:
```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
npm run migrate:up
```

---

## 🚀 本地測試工具（已建立）

### 測試腳本

我已為你建立了三個測試工具：

#### 1. **完整環境驗證腳本**
📄 **路徑**: `/home/thc1006/dev/shovel-heroes/packages/backend/scripts/local-test.sh`

**功能**:
- ✅ 檢查 Node.js 版本
- ✅ 驗證 npm 依賴完整性
- ✅ 檢查 .env 配置
- ✅ 測試 PostgreSQL 連線
- ✅ 驗證 TypeScript 編譯
- ✅ 檢查路由文件

**使用方式**:
```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
./scripts/local-test.sh
```

#### 2. **快速啟動腳本**
📄 **路徑**: `/home/thc1006/dev/shovel-heroes/packages/backend/scripts/quick-start.sh`

**功能**:
- 🚀 自動啟動 Docker 服務
- 📦 檢查並安裝依賴
- 🔧 驗證環境配置
- 🗄️ 執行資料庫遷移
- 🔨 編譯 TypeScript

**使用方式**:
```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
./scripts/quick-start.sh
npm run dev  # 啟動開發伺服器
```

#### 3. **資料庫連線測試**
📄 **路徑**: `/home/thc1006/dev/shovel-heroes/packages/backend/scripts/test-db-connection.js`

**功能**:
- 🔍 詳細的資料庫連線診斷
- 📊 PostgreSQL 版本資訊
- 📋 列出現有資料表
- 🔌 連線池狀態監控
- 💡 錯誤診斷建議

**使用方式**:
```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
node scripts/test-db-connection.js
```

---

## 📝 本地測試指令速查表

### 🚀 快速啟動（推薦）

```bash
# 方法 1: 使用快速啟動腳本
cd /home/thc1006/dev/shovel-heroes/packages/backend
./scripts/quick-start.sh
npm run dev

# 方法 2: 手動步驟
docker compose up -d db                    # 啟動 PostgreSQL
npm install                                 # 安裝依賴
npm run migrate:up                         # 資料庫遷移
npm run build                              # 編譯
npm run dev                                # 開發伺服器
```

### 🧪 測試與驗證

```bash
# 環境驗證
./scripts/local-test.sh

# 資料庫連線測試
node scripts/test-db-connection.js

# 健康檢查 (需先啟動伺服器)
curl http://localhost:8787/healthz
curl http://localhost:8787/
```

### 🛠️ 開發指令

```bash
# 開發模式（熱重載）
npm run dev

# 編譯 TypeScript
npm run build

# 執行測試
npm run test
npm run test:watch
npm run test:coverage

# 型別檢查
npm run lint

# 資料庫遷移
npm run migrate:up
npm run migrate:down
npm run migrate:create <name>
```

### 🐳 Docker 管理

```bash
# 啟動所有服務
docker compose up -d

# 僅啟動 PostgreSQL
docker compose up -d db

# 查看日誌
docker logs shovelheroes-postgres
docker logs -f shovelheroes-postgres  # 即時日誌

# 停止服務
docker compose down

# 完全清理（包含資料）
docker compose down -v
```

---

## 🔍 預期的 API 回應

### 健康檢查端點

```bash
$ curl http://localhost:8787/healthz
```

**預期回應**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-02T14:30:00.000Z",
  "database": "healthy",
  "uptime": 123.456
}
```

### 根端點

```bash
$ curl http://localhost:8787/
```

**預期回應**:
```json
{
  "ok": true
}
```

---

## ⚡ 效能指標（預期）

| 指標 | 目標值 |
|------|--------|
| 啟動時間 | < 3 秒 |
| 健康檢查回應 | < 100ms |
| 資料庫查詢 | < 50ms (簡單查詢) |
| JWT 驗證 | < 10ms |
| 記憶體使用 | < 200MB (開發模式) |

---

## 🐛 常見問題解決

### 問題 1: PostgreSQL 連線拒絕

**症狀**: `ECONNREFUSED` 錯誤

**解決方案**:
```bash
# 1. 檢查容器狀態
docker ps | grep postgres

# 2. 如未運行，啟動容器
docker compose up -d db

# 3. 等待健康檢查通過（約 5-10 秒）
docker exec shovelheroes-postgres pg_isready -U postgres

# 4. 查看日誌排查問題
docker logs shovelheroes-postgres
```

### 問題 2: 連接埠衝突

**症狀**: `EADDRINUSE: address already in use :::8787`

**解決方案**:
```bash
# 方法 1: 找出並終止佔用的程序
lsof -i :8787
kill -9 <PID>

# 方法 2: 更改 .env 中的 PORT
# 編輯 .env，設定 PORT=8788
```

### 問題 3: TypeScript 編譯錯誤

**解決方案**:
```bash
# 清理並重新安裝
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

---

## 📋 部署前檢查清單

在部署到生產環境前，確保完成以下項目：

- [ ] 更改 `JWT_SECRET` 為強隨機字串（至少 32 字元）
- [ ] 設定正確的 `CORS_ALLOWLIST`（生產網域）
- [ ] 配置真實的 SMTP 伺服器
- [ ] 調整 `RATE_LIMIT_MAX` 參數
- [ ] 啟用 PostgreSQL SSL 連線
- [ ] 檢查所有 RLS 政策
- [ ] 設定環境變數為 `NODE_ENV=production`
- [ ] 移除開發用依賴
- [ ] 執行完整的測試套件
- [ ] 進行安全掃描

---

## 📊 檔案結構

```
packages/backend/
├── .env                         ✅ 環境變數
├── package.json                 ✅ 專案配置
├── tsconfig.json                ✅ TypeScript 配置
├── src/
│   ├── index.ts                 ✅ 主程式
│   ├── lib/                     ✅ 核心函式庫
│   │   ├── db.ts
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── routes/                  ✅ 路由模組 (11 個)
│   └── modules/                 ✅ 業務模組
├── dist/                        ✅ 編譯輸出
├── scripts/                     ✅ 測試腳本
│   ├── local-test.sh            🆕 環境驗證
│   ├── quick-start.sh           🆕 快速啟動
│   └── test-db-connection.js    🆕 資料庫測試
└── docs/                        ✅ 文件
    ├── LOCAL_TESTING.md         🆕 測試指南
    └── ENVIRONMENT_STATUS.md    🆕 本報告
```

---

## ✅ 總結與建議

### 當前狀態

✅ **可以立即開始測試**
✅ **TypeScript 編譯正常**
✅ **環境配置完整**
⚠️ **需要啟動 PostgreSQL 容器**

### 立即行動

執行以下三個指令即可開始測試：

```bash
# 1. 啟動資料庫
docker compose up -d db

# 2. 執行遷移
cd packages/backend && npm run migrate:up

# 3. 啟動開發伺服器
npm run dev
```

### 建議的測試流程

1. ✅ **執行環境驗證**: `./scripts/local-test.sh`
2. ✅ **測試資料庫連線**: `node scripts/test-db-connection.js`
3. ✅ **啟動開發伺服器**: `npm run dev`
4. ✅ **測試健康檢查**: `curl http://localhost:8787/healthz`
5. ✅ **執行單元測試**: `npm run test`

---

**報告生成**: 2025-10-02
**下次檢查建議**: 啟動 PostgreSQL 後重新執行 `./scripts/local-test.sh`
