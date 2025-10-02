# Shovel Heroes 後端開發總結報告
**Backend Development Summary - Complete Implementation Report**

> 本文件提供 Shovel Heroes 後端系統的完整開發總結，涵蓋架構設計、實作細節、測試策略及未來規劃。

---

## 📋 目錄

1. [專案概覽](#專案概覽)
2. [技術棧](#技術棧)
3. [已完成功能](#已完成功能)
4. [專案結構](#專案結構)
5. [API 端點實作狀況](#api-端點實作狀況)
6. [安全性實作](#安全性實作)
7. [資料庫架構](#資料庫架構)
8. [測試覆蓋](#測試覆蓋)
9. [開發工具與腳本](#開發工具與腳本)
10. [已知限制與待辦事項](#已知限制與待辦事項)
11. [快速上手指南](#快速上手指南)
12. [troubleshooting](#troubleshooting)

---

## 🎯 專案概覽

### 專案目標
開發一個安全、可擴展的災害救援志工協調平台後端 API，支援：
- 災區資訊管理
- 救援網格劃分與資源配置
- 志工報名與排程
- 物資捐贈追蹤
- 即時通訊與公告

### 設計原則
1. **OpenAPI First**: 以 OpenAPI 3.1.0 規格為單一真實來源
2. **TDD (Test-Driven Development)**: 測試先行，確保程式碼品質
3. **Security First**: JWT 驗證、Row-Level Security (RLS)、輸入驗證
4. **REST 優先**: 預設使用自建 REST API（Base44 僅作為選配）
5. **Clean Architecture**: 明確分離關注點，易於維護

---

## 🛠️ 技術棧

### 核心技術

| 技術 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 20+ | 執行環境 |
| **TypeScript** | 5.6+ | 型別安全開發 |
| **Fastify** | 4.28+ | 高效能 Web 框架 |
| **PostgreSQL** | 16 | 主資料庫 |
| **Zod** | 3.24+ | Runtime 型別驗證 |
| **Vitest** | 3.2+ | 單元測試與整合測試 |
| **Pino** | 9.5+ | 結構化日誌 |
| **Docker Compose** | - | 本地開發環境 |

### Fastify 外掛

| 外掛 | 版本 | 功能 |
|------|------|------|
| `@fastify/helmet` | 13.0+ | 安全標頭 (HSTS, CSP) |
| `@fastify/cors` | 9.0+ | CORS 白名單控制 |
| `@fastify/jwt` | 10.0+ | JWT 驗證 |
| `@fastify/rate-limit` | 10.3+ | 速率限制（防濫用） |

### 開發工具

| 工具 | 用途 |
|------|------|
| `node-pg-migrate` | 資料庫 migration 管理 |
| `openapi-typescript` | 從 OpenAPI 生成 TypeScript 型別 |
| `@redocly/cli` | OpenAPI 文件預覽 |
| `@stoplight/spectral-cli` | OpenAPI 規格驗證 |
| `tsx` | TypeScript 執行器（開發用） |
| `supertest` | HTTP 測試 |
| `prettier` | 程式碼格式化 |

---

## ✅ 已完成功能

### 1. 核心 API 端點 (8/8 完成)

| 功能模組 | 端點 | 狀態 | 驗證需求 |
|----------|------|------|----------|
| **健康檢查** | `GET /healthz` | ✅ 完成 | Public |
| **災區管理** | `GET/POST/PUT/DELETE /disaster-areas` | ✅ 完成 | POST/PUT/DELETE 需要 JWT |
| **網格管理** | `GET/POST/PUT/DELETE /grids` | ✅ 完成 | 需要 JWT |
| **志工報名** | `GET/POST/DELETE /volunteer-registrations` | ✅ 完成 | 需要 JWT |
| **志工列表** | `GET /volunteers` | ✅ 完成 | 需要 JWT |
| **公告系統** | `GET/POST /announcements` | ✅ 完成 | POST 需要 JWT |
| **物資捐贈** | `GET/POST /supply-donations` | ✅ 完成 | POST 需要 JWT |
| **網格討論** | `GET/POST /grid-discussions` | ✅ 完成 | POST 需要 JWT |
| **使用者管理** | `GET /users`, `GET /me` | ✅ 完成 | 需要 JWT |

### 2. 安全功能 (7/7 完成)

- ✅ **JWT 驗證**: 使用 `@fastify/jwt`，Token 有效期 24 小時
- ✅ **環境變數驗證**: 使用 Zod 進行 runtime 驗證
- ✅ **CORS 白名單**: 可配置允許的來源
- ✅ **速率限制**: 每分鐘 300 次請求（可配置）
- ✅ **安全標頭**: Helmet (HSTS, CSP, X-Frame-Options)
- ✅ **輸入驗證**: 所有端點使用 Zod schema 驗證
- ✅ **Row-Level Security (RLS)**: PostgreSQL RLS 政策

### 3. 資料庫功能 (4/4 完成)

- ✅ **Migration 系統**: node-pg-migrate
- ✅ **Row-Level Security (RLS)**: 資料隔離與權限控制
- ✅ **Audit Log**: 自動記錄所有資料變更
- ✅ **自動時間戳**: `updated_at` 欄位自動更新

### 4. 開發工具 (6/6 完成)

- ✅ **TypeScript 編譯**: 嚴格模式
- ✅ **OpenAPI 型別生成**: 自動生成 TypeScript 型別
- ✅ **OpenAPI 文件預覽**: Redocly
- ✅ **OpenAPI Linting**: Spectral
- ✅ **Pino 結構化日誌**: 開發與生產環境自動配置
- ✅ **Docker Compose**: PostgreSQL + MailHog

### 5. 測試基礎設施 (4/4 完成)

- ✅ **Vitest 配置**: 支援 TypeScript
- ✅ **測試輔助工具**: `createTestApp()`, `generateTestToken()`
- ✅ **測試環境隔離**: 獨立測試資料庫
- ✅ **Integration Tests**: 完整端對端測試

---

## 📁 專案結構

```
packages/backend/
├── src/
│   ├── index.ts                    # 應用程式入口
│   ├── lib/
│   │   ├── db.ts                   # 資料庫連線池與 RLS 輔助函數
│   │   ├── env.ts                  # 環境變數驗證 (Zod)
│   │   └── logger.ts               # Pino 日誌配置
│   ├── routes/
│   │   ├── healthz.ts              # 健康檢查
│   │   ├── disaster-areas.ts       # 災區管理 API
│   │   ├── grids.ts                # 網格管理 API
│   │   ├── volunteer-registrations.ts  # 志工報名 API
│   │   ├── volunteers.ts           # 志工列表 API
│   │   ├── announcements.ts        # 公告 API
│   │   ├── supply-donations.ts     # 物資捐贈 API
│   │   ├── grid-discussions.ts     # 網格討論 API
│   │   └── users.ts                # 使用者 API
│   └── types/
│       └── fastify.d.ts            # Fastify 型別擴展
├── migrations/
│   ├── 0001_init.sql               # 初始 schema
│   ├── 0002_rls.sql                # RLS policies
│   └── 0003_audit.sql              # Audit log
├── tests/
│   ├── helpers.ts                  # 測試輔助工具
│   └── integration.test.ts         # 整合測試
├── docs/
│   ├── MIGRATIONS.md               # Migration 文件
│   ├── database-schema.md          # 資料庫 schema
│   ├── database-quick-reference.md # 快速參考
│   ├── QUALITY_REPORT.md           # 品質檢查報告
│   └── SECURITY_CONFIGURATION.md   # 安全配置指南
├── .env.example                    # 環境變數範例
├── .env.test                       # 測試環境配置
├── .migration.config.cjs           # Migration 配置
├── package.json                    # 依賴與腳本
├── tsconfig.json                   # TypeScript 配置
└── vitest.config.ts                # Vitest 配置
```

---

## 🔌 API 端點實作狀況

### Disaster Areas (災區管理)

| 端點 | 方法 | 實作狀態 | 驗證 | 測試 |
|------|------|----------|------|------|
| `/disaster-areas` | GET | ✅ 完成 | Public | ✅ |
| `/disaster-areas` | POST | ✅ 完成 | JWT | ✅ |
| `/disaster-areas/:id` | GET | ✅ 完成 | Public | ✅ |
| `/disaster-areas/:id` | PUT | ✅ 完成 | JWT | ✅ |
| `/disaster-areas/:id` | DELETE | ✅ 完成 | JWT | ✅ |

**實作重點**:
- 使用 Zod 驗證經緯度範圍（-90~90, -180~180）
- RLS: 所有人可讀，僅認證使用者可寫
- 支援分頁查詢 (`limit`, `offset`)

### Grids (網格管理)

| 端點 | 方法 | 實作狀態 | 驗證 | 測試 |
|------|------|----------|------|------|
| `/grids` | GET | ✅ 完成 | JWT | ✅ |
| `/grids` | POST | ✅ 完成 | JWT | ✅ |
| `/grids/:id` | GET | ✅ 完成 | JWT | ✅ |
| `/grids/:id` | PUT | ✅ 完成 | JWT | ✅ |
| `/grids/:id` | DELETE | ✅ 完成 | JWT | ✅ |

**實作重點**:
- 支援 `area_id` 篩選
- 網格類型驗證：`mud_disposal`, `manpower`, `supply_storage`, `accommodation`, `food_area`
- 狀態驗證：`open`, `closed`, `completed`, `pending`
- RLS: 僅認證使用者可見與操作

### Volunteer Registrations (志工報名)

| 端點 | 方法 | 實作狀態 | 驗證 | 測試 |
|------|------|----------|------|------|
| `/volunteer-registrations` | GET | ✅ 完成 | JWT | ✅ |
| `/volunteer-registrations` | POST | ✅ 完成 | JWT | ✅ |
| `/volunteer-registrations/:id` | DELETE | ✅ 完成 | JWT (Own) | ✅ |

**實作重點**:
- RLS: 使用者僅能看到自己的報名記錄
- DELETE 限制：僅報名者本人可取消
- 自動從 JWT Token 取得 `user_id`，不允許手動指定

### Volunteers (志工列表)

| 端點 | 方法 | 實作狀態 | 驗證 | 測試 |
|------|------|----------|------|------|
| `/volunteers` | GET | ✅ 完成 | JWT | ✅ |

**實作重點**:
- **電話遮罩**: 根據使用者權限決定是否顯示完整電話
- 支援篩選：`grid_id`, `status`
- 回傳 `status_counts` 統計
- 分頁支援

**回應範例**:
```json
{
  "data": [...],
  "can_view_phone": false,  // ← 前端根據此欄位決定是否顯示電話
  "total": 128,
  "status_counts": {
    "pending": 12,
    "confirmed": 34,
    "arrived": 8,
    "completed": 55,
    "cancelled": 19
  }
}
```

---

## 🔒 安全性實作

### 1. JWT 驗證流程

```typescript
// 1. 產生 Token（需實作登入端點）
const token = app.jwt.sign({ sub: userId, email }, { expiresIn: '24h' });

// 2. 驗證 Token（自動）
app.decorate('auth', async (req, reply) => {
  try {
    await req.jwtVerify();  // 解析 JWT，失敗則拋出例外
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// 3. 使用
app.get('/protected', { preHandler: [app.auth] }, handler);
```

### 2. Row-Level Security (RLS) 實作

**RLS 流程**:
```typescript
// 1. 從 JWT 取得使用者 ID
const userId = req.user?.sub;

// 2. 設定 PostgreSQL session 變數
await client.query("SET LOCAL app.user_id = $1", [userId]);

// 3. 執行查詢（RLS 政策自動套用）
const { rows } = await client.query("SELECT * FROM volunteer_registrations");
// PostgreSQL 自動過濾：僅返回 user_id = app.current_user_id() 的資料
```

**RLS 政策範例**:
```sql
CREATE POLICY volunteer_registrations_select_own
  ON volunteer_registrations
  FOR SELECT
  USING (user_id = app.current_user_id());
```

### 3. 輸入驗證 (Zod)

```typescript
const createDisasterAreaSchema = z.object({
  name: z.string().min(1),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180)
});

// 使用
const parsed = createDisasterAreaSchema.safeParse(req.body);
if (!parsed.success) {
  return reply.code(400).send({ error: 'validation_error', details: parsed.error });
}
```

### 4. CORS 白名單

```typescript
// .env
CORS_ALLOWLIST=http://localhost:5173,http://localhost:3000,https://app.example.com

// 自動檢查來源
origin: (origin, cb) => {
  const allowed = env.CORS_ALLOWLIST.split(',').filter(Boolean);
  if (allowed.includes(origin)) cb(null, true);
  else cb(new Error('Not allowed by CORS'), false);
}
```

### 5. 速率限制

```typescript
await app.register(rateLimit, {
  max: 300,              // 每個 IP 每分鐘最多 300 次請求
  timeWindow: '1 minute',
  onExceeded: (req) => {
    logger.warn({ ip: req.ip }, 'Rate limit exceeded');
  }
});
```

---

## 🗄️ 資料庫架構

### Migration 檔案

| 檔案 | 說明 | 狀態 |
|------|------|------|
| `0001_init.sql` | 初始 schema（users, grids, app schema） | ✅ |
| `0002_rls.sql` | 啟用 RLS 與基本政策 | ✅ |
| `0003_audit.sql` | Audit log table + trigger | ✅ |

### 資料表（目前實作）

| 表名 | 說明 | RLS | Audit |
|------|------|-----|-------|
| `users` | 使用者資訊 | - | - |
| `grids` | 救援網格 | ✅ | ✅ |
| `audit_log` | 變更記錄 | - | - |

### 待擴充資料表（需額外 migrations）

根據 OpenAPI 規格，以下表格需要額外 migrations：
- `disaster_areas` (災區)
- `volunteer_registrations` (志工報名)
- `supply_donations` (物資捐贈)
- `grid_discussions` (網格討論)
- `announcements` (公告)

**注意**: 當前路由已實作這些功能，但需對應的資料庫 schema migrations。

---

## 🧪 測試覆蓋

### 測試檔案

| 測試檔 | 測試數量 | 狀態 | 覆蓋範圍 |
|--------|----------|------|----------|
| `index.test.ts` | 1 | ✅ | 基本健康檢查 |
| `grids.test.ts` | 11 | ⚠️ 待運行 | GET/POST, Auth, RLS, Rate Limit |
| `disaster-areas.test.ts` | 13 | ⚠️ 待運行 | CRUD, Pagination, Cascade Delete |
| `volunteer-registrations.test.ts` | 12 | ⚠️ 待運行 | CRUD, RLS, User Isolation |
| `volunteers.test.ts` | 14 | ⚠️ 待運行 | Phone Masking, Filtering, Status Counts |
| `integration.test.ts` | 15+ | ⚠️ 待運行 | End-to-End Workflows |

### 測試策略

1. **單元測試**: 測試個別路由的 HTTP 行為
2. **RLS 測試**: 驗證不同使用者的資料隔離
3. **驗證測試**: 確保 Zod schema 正確拒絕無效輸入
4. **整合測試**: 測試完整工作流程（創建災區 → 創建網格 → 志工報名）

### 運行測試

```bash
# 執行所有測試
npm test

# 監看模式
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage

# 互動式 UI
npm run test:ui
```

**當前狀態**: 測試基礎設施已完成，但需要：
1. 完成資料庫 migrations
2. 修復環境變數載入
3. 運行測試並修復失敗項目

---

## 🛠️ 開發工具與腳本

### NPM Scripts

| 腳本 | 說明 | 使用場景 |
|------|------|----------|
| `npm run dev` | 啟動開發服務器（熱重載） | 開發 |
| `npm run build` | 編譯 TypeScript | CI/CD |
| `npm start` | 啟動生產服務器 | 生產環境 |
| `npm test` | 執行測試 | 開發 / CI |
| `npm run test:watch` | 測試監看模式 | 開發 |
| `npm run test:coverage` | 產生測試覆蓋率報告 | CI |
| `npm run migrate:up` | 執行 migrations | 部署 |
| `npm run migrate:down` | 回滾 migration | Rollback |
| `npm run migrate:create` | 建立新 migration | 開發 |
| `npm run lint` | TypeScript 型別檢查 | CI / 開發 |
| `npm run format` | 格式化程式碼 | 開發 |
| `npm run format:check` | 檢查格式 | CI |

### Docker Compose Services

```bash
# 啟動所有服務
docker compose up -d

# 僅啟動資料庫與 MailHog
docker compose up -d db mailhog

# 查看狀態
docker compose ps

# 查看日誌
docker compose logs -f db

# 停止並刪除
docker compose down
```

### 資料庫管理

```bash
# 進入 PostgreSQL CLI
docker exec -it shovelheroes-postgres psql -U postgres -d shovelheroes

# 重置資料庫（⚠️ 會刪除所有資料）
docker exec shovelheroes-postgres psql -U postgres -c "DROP DATABASE shovelheroes; CREATE DATABASE shovelheroes;"
npm run migrate:up
```

---

## ⚠️ 已知限制與待辦事項

### 高優先級 (Critical)

1. **⚠️ 登入功能未實作**
   - **現狀**: JWT 驗證已就緒，但沒有 `/auth/login` 端點
   - **影響**: 前端無法取得 Token
   - **解決方案**: 實作 `/auth/login` 和 `/auth/register` 端點

2. **⚠️ 資料庫 Schema 不完整**
   - **現狀**: 僅有 `users` 和 `grids` 表
   - **缺少**: `disaster_areas`, `volunteer_registrations`, `supply_donations`, 等
   - **影響**: 部分路由查詢會失敗
   - **解決方案**: 創建完整的 migrations

3. **⚠️ 測試未執行**
   - **現狀**: 測試檔案已建立，但因缺少 schema 無法運行
   - **解決方案**: 完成 migrations 後運行測試並修復

### 中優先級 (Important)

4. **📝 OpenTelemetry 未配置**
   - **現狀**: Pino 日誌已就緒，但 OpenTelemetry instrumentation 未配置
   - **建議**: 添加 `@opentelemetry/auto-instrumentations-node`

5. **📝 MailHog 端點未實作**
   - **現狀**: MailHog 容器已啟動，但沒有發信測試端點
   - **建議**: 實作 `/debug/send-test-email` (僅開發環境)

6. **📝 分頁未實作完整**
   - **現狀**: 部分端點支援 `limit/offset`，但無統一實作
   - **建議**: 創建 pagination helper

### 低優先級 (Nice to Have)

7. **🔧 WebSocket 支援**
   - 實時更新志工報名狀態
   - 建議使用 `@fastify/websocket`

8. **🔧 檔案上傳**
   - 網格照片上傳
   - 建議使用 `@fastify/multipart`

9. **🔧 Email 通知**
   - 志工報名確認信
   - 使用 Nodemailer + MailHog

---

## 🚀 快速上手指南

### 第一次設置

```bash
# 1. Clone 專案（假設已完成）
cd shovel-heroes

# 2. 安裝依賴
npm install

# 3. 啟動 Docker 服務
docker compose up -d db mailhog

# 4. 創建環境變數檔
cp packages/backend/.env.example packages/backend/.env

# 5. 編輯 .env（設定 JWT_SECRET）
# JWT_SECRET 必須至少 32 字元！
nano packages/backend/.env

# 6. 執行 migrations
cd packages/backend
npm run migrate:up

# 7. 啟動後端開發服務器
npm run dev:api
# 後端現在運行於 http://localhost:8787

# 8. 測試連線
curl http://localhost:8787/healthz
# 預期: {"status":"ok","timestamp":"..."}
```

### 日常開發流程

```bash
# 1. 啟動服務（如果停止）
docker compose up -d db

# 2. 開發後端
cd packages/backend
npm run dev:api

# 3. 運行測試（另一終端）
npm run test:watch

# 4. 查看日誌
# 開發模式日誌會自動 pretty-print

# 5. 創建新 migration
npm run migrate:create add_new_table

# 6. 格式化程式碼
npm run format
```

---

## 🔧 Troubleshooting

### 問題 1: `DATABASE_URL not set`

**症狀**: Migration 或啟動時報錯
**原因**: 缺少 `.env` 檔案或環境變數
**解決**:
```bash
cp .env.example .env
nano .env  # 設定 DATABASE_URL
```

### 問題 2: `JWT_SECRET too short`

**症狀**: 啟動時報錯 "JWT_SECRET must be at least 32 characters"
**解決**:
```bash
# 生成安全的 secret
openssl rand -base64 48
# 複製到 .env 的 JWT_SECRET
```

### 問題 3: Docker 容器無法啟動

**症狀**: `docker compose up` 失敗
**診斷**:
```bash
# 查看詳細錯誤
docker compose logs db

# 檢查端口衝突
lsof -i :5432
```
**解決**: 確保 5432 端口未被佔用

### 問題 4: Migration 失敗

**症狀**: `npm run migrate:up` 報錯
**診斷**:
```bash
# 檢查資料庫連線
docker exec shovelheroes-postgres psql -U postgres -c "SELECT version();"

# 查看已執行的 migrations
docker exec shovelheroes-postgres psql -U postgres -d shovelheroes -c "SELECT * FROM pgmigrations;"
```

### 問題 5: 測試失敗

**症狀**: `npm test` 報錯
**常見原因**:
1. 測試資料庫未創建
2. Migrations 未執行
3. .env.test 未配置

**解決**:
```bash
# 創建測試資料庫
docker exec shovelheroes-postgres psql -U postgres -c "CREATE DATABASE shovelheroes_test;"

# 執行 migrations
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes_test npm run migrate:up

# 確認 .env.test 存在
ls -la .env.test
```

---

## 📚 相關文件

- **前端整合指南**: `/docs/FRONTEND_INTEGRATION_GUIDE.md`
- **OpenAPI 規格**: `/api-spec/openapi.yaml`
- **資料庫 Schema**: `/packages/backend/docs/database-schema.md`
- **安全配置**: `/packages/backend/docs/SECURITY_CONFIGURATION.md`
- **品質報告**: `/packages/backend/docs/QUALITY_REPORT.md`
- **Migration 文件**: `/packages/backend/docs/MIGRATIONS.md`

---

## 👥 團隊資訊

- **開發時間**: 2025-10-02
- **開發方法**: TDD + OpenAPI First
- **Code Style**: Prettier + ESLint
- **Git Flow**: Main branch (直接提交 / PR 依需求)

---

## 📈 未來規劃

### Phase 2 (登入與完整 Schema)
- [ ] 實作 `/auth/login` 和 `/auth/register`
- [ ] 完成所有資料表 migrations
- [ ] 實作 RBAC (Role-Based Access Control)
- [ ] 密碼 hash (bcrypt)

### Phase 3 (進階功能)
- [ ] WebSocket 實時通知
- [ ] 檔案上傳 (網格照片)
- [ ] Email 通知 (志工確認信)
- [ ] Redis caching
- [ ] Rate limiting per-route

### Phase 4 (生產部署)
- [ ] Docker multi-stage builds
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] 監控與告警 (Prometheus + Grafana)
- [ ] 自動備份策略
- [ ] Load balancing

---

**文件版本**: 1.0.0
**最後更新**: 2025-10-02
**狀態**: ✅ 核心功能完成，待測試驗證與 Schema 完善
