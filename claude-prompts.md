# Claude Code Prompt Packs (Phased, TDD)

> 遵循 TDD、OpenAPI 驅動、**Base44 退為選配** 原則。每個子階段包含 **指令 → 產出 → 驗收**。

## Phase 0 — Repo 啟動與守門
### 0.1 初始化與守門文件
**指令（/edit or /task）**
```
請閱讀根目錄 README.md 與 CLAUDE.md，檢查腳手架完整性：
1) 確認 OpenAPI 3.2 語法正確（api-spec/openapi.yaml）。
2) 在 packages/backend 增加 ESLint/Prettier 設定（如缺）。
3) 補一個簡單的 CONTRIBUTING.md 與 CODEOWNERS（示例）。
限制：不可啟用 Base44，維持 REST 預設。
```
**期望產出**：PR with config files  
**驗收**：`pnpm openapi:lint` 綠、`pnpm test` 綠

### 0.2 CI 強化
**指令**
```
新增 CI job：
- Node 20 matrix
- Cache pnpm
- 上傳 api-spec/redoc-static.html 為 artifact
```

## Phase 1 — OpenAPI 驅動 + 型別生成
### 1.1 擴充 schemas
**指令**
```
根據 /grids 實際欄位，擴充 components.schemas.Grid（新增 coords/updated_at）。
同步更新 shared-types 生成腳本，改用 openapi-typescript。
```
**驗收**
- `pnpm types:openapi` 生成成功
- 後端編譯無誤

### 1.2 Redoc 預覽
**指令**
```
啟動 `redocly preview-docs api-spec/openapi.yaml`，檢查 /grids 參數/回應是否渲染正確；不正確則修。
```

## Phase 2 — 後端 TDD（Vitest + Supertest）
### 2.1 測試先行：/grids
**指令**
```
撰寫 /grids 測試（需 JWT）：
- 200 正常回傳
- 未帶 token → 401
- rate limit 行為（多次呼叫返回429）
```
**驗收**
- `vitest` 測試三條通過

### 2.2 RLS 行為測試（SQL seed）
**指令**
```
建立測試資料：不同 user_id 只可看到自己的 grids（或符合政策的資料）。
在測試中 `SET app.user_id`，驗證 RLS 生效。
```

## Phase 3 — 前端串接
### 3.1 React 查詢頁
**指令**
```
在 src/ 建立簡單列表頁：
- 讀取 `${VITE_API_BASE}/grids`
- 加入 area_id 查詢欄位
- 錯誤提示（401/429）
```
**驗收**
- Dev server 能渲染列表，401/429 有提示

## Phase 4 — 可觀測性 & 郵件
### 4.1 OTel 最小化
**指令**
```
新增 packages/backend/src/otel/init.ts：NodeSDK + auto-instrumentations。
在 index.ts 入口 import。
輸出到 console 或 OTEL_EXPORTER_OTLP_ENDPOINT。
```

### 4.2 MailHog 整合
**指令**
```
新增簡單的通知 service（SMTP 指向 127.0.0.1:1025），並提供一個 /debug/send-mail 測試端點（僅 dev）。
```

## Phase 5 — VM/Nginx 部署腳本
### 5.1 Nginx 反代
**指令**
```
檢視 infra/nginx/shovelheroes.conf，修正 upstream、headers（X-Forwarded-Proto）。
新增 Shell 腳本：一鍵部署前端靜態與 reload nginx。
```

---

## 針對 Claude Code 的常用提示模板
- **重構**：「請根據此 OpenAPI 端點的型別定義，重構路由驗證，改用 Zod 解析並回傳一致錯誤格式。」
- **測試先行**：「請先寫測試檔（Vitest/Supertest），涵蓋 200/401/429，再實作最少量程式碼讓測試通過。」
- **安全檢查**：「檢查 CORS/Helmet/RateLimit/JWT 配置是否符合最小權限與安全預設，列出修正 PR。」
