# 依賴管理更新摘要

## 更新日期
2025-10-02

## 任務完成狀態
✅ 所有任務已完成

---

## 1. 移除的依賴

### 根目錄 package.json
- ❌ `@base44/sdk` ^0.1.2 （已移除）

**移除原因**：
- Base44 已退場，改用自建 REST API + PostgreSQL
- 參考 CLAUDE.md 和 README.md 的說明，Base44 僅作為選配/過渡方案
- 預設採用 `VITE_USE_REST=true` 的自建後端架構

---

## 2. 新增的依賴

### 根目錄 package.json - devDependencies

#### 測試框架
- ✅ `vitest` ^2.1.8
- ✅ `@vitest/ui` ^2.1.8
- ✅ `@vitest/coverage-v8` ^2.1.8
- ✅ `happy-dom` ^15.11.7

#### API 測試
- ✅ `supertest` ^7.0.0
- ✅ `@types/supertest` ^6.0.2

### packages/backend/package.json

#### 安全與性能 (dependencies)
- ✅ `fastify` ^5.0.0 （從 ^4.28.1 升級）
- ✅ `@fastify/cors` ^9.0.0
- ✅ `@fastify/helmet` ^11.0.0
- ✅ `@fastify/jwt` ^8.0.0
- ✅ `@fastify/rate-limit` ^9.0.0
- ✅ `pino` ^9.0.0
- ✅ `pino-pretty` ^11.0.0

#### 測試 (devDependencies)
- ✅ `vitest` ^2.1.8
- ✅ `supertest` ^7.0.0
- ✅ `@types/supertest` ^6.0.2

---

## 3. 新增的指令

### 根目錄測試指令
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:api": "npm --workspace packages/backend run test",
  "test:components": "vitest run tests/components"
}
```

### 後端測試與遷移指令
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "migrate:up": "node-pg-migrate up",
  "migrate:down": "node-pg-migrate down"
}
```

### 既有 OpenAPI 指令（維持不變）
```json
{
  "openapi:lint": "spectral lint api-spec/openapi.yaml",
  "openapi:preview": "redocly preview-docs api-spec/openapi.yaml",
  "types:openapi": "openapi-typescript api-spec/openapi.yaml -o packages/shared-types/src/openapi.ts"
}
```

---

## 4. 專案設定更新

### Node.js 版本要求
```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### 模組類型（維持）
```json
{
  "type": "module"
}
```

---

## 5. 驗收測試

### 步驟 1: 安裝依賴
```bash
npm install
```

### 步驟 2: 執行測試指令
```bash
# 運行所有測試
npm run test

# 監視模式
npm run test:watch

# UI 介面
npm run test:ui

# 覆蓋率報告
npm run test:coverage

# API 測試
npm run test:api
```

### 步驟 3: OpenAPI 驗證
```bash
# 驗證 OpenAPI 規格
npm run openapi:lint

# 預覽 API 文件
npm run openapi:preview

# 產生 TypeScript 型別
npm run types:openapi
```

---

## 6. 架構說明

### 技術棧（來自 README.md）
- **前端**: Vite + React + Tailwind
- **後端**: Fastify v5 (Node 20+) + PostgreSQL (Row-Level Security)
- **API**: OpenAPI 3.2.0 (api-spec/openapi.yaml)
- **測試**: Vitest + Supertest
- **安全**: Helmet, CORS 白名單, Rate Limit, JWT
- **日誌**: Pino (JSON format)

### Base44 退場策略
- 預設使用 `VITE_USE_REST=true`
- 所有 PII 資料保存在私域 PostgreSQL
- 採用 Row-Level Security (RLS) 進行權限控制

---

## 7. 後續建議

### 立即執行
1. ✅ 執行 `npm install` 更新所有依賴
2. ✅ 執行 `npm run test` 驗證測試環境
3. ✅ 執行 `npm run openapi:lint` 確保 API 規格正確

### 短期規劃
1. 建立測試覆蓋率目標（建議 ≥80%）
2. 設定 CI/CD 流程自動執行測試
3. 實作 API 授權與 RLS 測試案例

### 長期規劃
1. 實作 OpenTelemetry 可觀測性
2. 建立完整的 E2E 測試套件
3. 實作自動化的資料庫遷移測試

---

## 8. 相關文件

- **CLAUDE.md**: 安全修補與可持續化開發計畫
- **README.md**: 專案架構與技術棧說明
- **claude-prompts.md**: TDD 工具與提示詞要求
- **api-spec/openapi.yaml**: OpenAPI 3.2.0 規格

---

## 9. 問題排除

### 如果 npm install 失敗
```bash
# 清除快取
npm cache clean --force

# 刪除 node_modules 和 lock 檔
rm -rf node_modules package-lock.json

# 重新安裝
npm install
```

### 如果測試執行失敗
```bash
# 確認 Node.js 版本
node --version  # 應該 >= 20.0.0

# 確認測試檔案存在
npm run test:watch
```

---

## 變更摘要

| 類別 | 移除 | 新增 | 升級 |
|------|------|------|------|
| Base44 | 1 | 0 | 0 |
| 測試工具 | 0 | 6 | 0 |
| 後端依賴 | 0 | 7 | 1 |
| 指令腳本 | 0 | 8 | 0 |
| **總計** | **1** | **21** | **1** |

---

**更新完成** ✅
