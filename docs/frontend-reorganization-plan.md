# 前端重組計畫 - 移除 Base44 SDK

> 執行日期: 2025-10-02
> 目標: 完全移除 Base44 SDK 依賴，建立清晰的 REST API 整合架構

## 1. 重組目標

### 1.1 核心目標
- ✅ **完全移除** Base44 SDK 依賴
- ✅ **統一 API 層**：以 REST API 為唯一數據源
- ✅ **清晰的目錄結構**：按功能模組組織代碼
- ✅ **類型安全**：基於 OpenAPI 規格生成類型定義
- ✅ **環境配置**：標準化環境變數管理

### 1.2 非目標（本次不處理）
- ❌ 後端部署
- ❌ 資料庫遷移
- ❌ CI/CD 設定

## 2. 現有結構分析

### 2.1 當前 API 層結構
```
src/api/
├── base44Client.js          # [DEPRECATED] Base44 SDK client
├── entities.js               # [保留] 重新導出 REST entities
├── functions.js              # [檢查] 可能包含 Base44 調用
├── integrations.js           # [檢查] 可能包含 Base44 調用
└── rest/                     # [主要] REST API 實作
    ├── client.js             # HTTP client (fetch-based)
    ├── entities.js           # Entity CRUD operations
    ├── functions.js          # 特殊功能 API
    └── index.js              # [移除] Base44/REST 切換層
```

### 2.2 Base44 使用位置
- ✅ `src/api/base44Client.js` - 已標記 deprecated
- ⚠️ `src/api/rest/index.js` - 包含 Base44/REST 切換邏輯
- ⚠️ `package.json` - 包含 `@base44/sdk` 依賴

## 3. 新目錄結構設計

### 3.1 API 層重組
```
src/api/
├── config.js                 # [新增] API 配置（base URL, timeout 等）
├── client.js                 # [移動] HTTP client (from rest/client.js)
├── endpoints/                # [新增] 按功能分組的 API endpoints
│   ├── disaster-areas.js     # 災區 API
│   ├── grids.js              # 網格 API
│   ├── volunteers.js         # 志工 API
│   ├── supplies.js           # 物資 API
│   ├── announcements.js      # 公告 API
│   ├── users.js              # 用戶 API
│   └── functions.js          # 特殊功能 API
├── types/                    # [新增] TypeScript 類型定義
│   └── index.ts              # 從 OpenAPI 生成或手寫類型
└── index.js                  # [新增] 統一導出
```

### 3.2 Components 目錄優化
```
src/components/
├── common/                   # 通用 UI 組件
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Badge.jsx
│   └── ...（shadcn/ui 組件）
├── features/                 # 功能組件
│   ├── disaster-areas/
│   │   ├── AddAreaModal.jsx
│   │   └── AreaList.jsx
│   ├── grids/
│   │   ├── AddGridModal.jsx
│   │   ├── EditGridModal.jsx
│   │   ├── GridList.jsx
│   │   └── GridImportExport.jsx
│   ├── volunteers/
│   │   └── VolunteerList.jsx
│   ├── supplies/
│   │   └── SupplyRequestModal.jsx
│   └── map/
│       ├── AnnouncementModal.jsx
│       ├── AnnouncementPanel.jsx
│       └── GridDetailModal.jsx
└── layout/                   # 佈局組件
    ├── Header.jsx
    ├── Footer.jsx
    └── Navigation.jsx
```

### 3.3 完整前端結構
```
src/
├── api/                      # API 層（見 3.1）
├── components/               # 組件層（見 3.2）
├── pages/                    # 頁面組件
│   ├── Map.jsx
│   ├── Volunteers.jsx
│   ├── Supplies.jsx
│   ├── Admin.jsx
│   ├── About.jsx
│   ├── Layout.jsx
│   └── index.jsx
├── hooks/                    # 自定義 Hooks
│   └── use-mobile.jsx
├── lib/                      # 工具函數庫
│   └── utils.js
├── utils/                    # 通用工具
│   └── index.ts
├── constants/                # [新增] 常量定義
│   ├── api.js                # API 相關常量
│   └── grid-types.js         # 網格類型等
├── styles/                   # [可選] 樣式文件
│   └── globals.css
├── App.jsx
├── main.jsx
└── index.css
```

## 4. 重組步驟

### Phase 1: API 層重組 ⏳

#### Step 1.1: 創建新的 API 結構
- [x] 創建 `src/api/config.js`
- [x] 移動 `src/api/rest/client.js` → `src/api/client.js`
- [ ] 創建 `src/api/endpoints/` 目錄
- [ ] 拆分 `entities.js` 到各個 endpoint 文件

#### Step 1.2: 移除 Base44 相關文件
- [ ] 刪除 `src/api/base44Client.js`
- [ ] 刪除 `src/api/rest/index.js` (切換層)
- [ ] 簡化 `src/api/entities.js`

#### Step 1.3: 更新 package.json
- [ ] 移除 `@base44/sdk` 依賴
- [ ] 驗證沒有其他 Base44 相關套件

### Phase 2: 組件重組 📦

#### Step 2.1: 移動 UI 組件
- [ ] 移動 `src/components/ui/*` → `src/components/common/`

#### Step 2.2: 創建 features 目錄
- [ ] 移動 `src/components/admin/*` → `src/components/features/disaster-areas/`, `grids/`
- [ ] 移動 `src/components/map/*` → `src/components/features/map/`
- [ ] 移動 `src/components/supplies/*` → `src/components/features/supplies/`

### Phase 3: 配置與環境變數 ⚙️

#### Step 3.1: 環境配置
- [ ] 創建 `.env.example`
- [ ] 更新 `.env.local` 格式
- [ ] 文檔化所有環境變數

#### Step 3.2: 常量定義
- [ ] 創建 `src/constants/` 目錄
- [ ] 提取硬編碼的常量

### Phase 4: 更新所有 Import 路徑 🔄

#### Step 4.1: 批量更新
- [ ] 更新所有頁面組件的 API imports
- [ ] 更新所有組件的相對路徑
- [ ] 驗證沒有斷掉的 imports

#### Step 4.2: 測試
- [ ] 運行 `npm run dev` 驗證
- [ ] 檢查控制台錯誤
- [ ] 測試所有頁面功能

### Phase 5: 文檔更新 📝

- [ ] 更新 README.md
- [ ] 更新 CLAUDE.md
- [ ] 創建 API 使用指南

## 5. 環境變數定義

### 5.1 必需變數
```bash
# API 配置
VITE_API_BASE=http://localhost:8787    # 後端 API 基礎 URL

# 功能開關（已移除）
# VITE_USE_REST=true                   # 不再需要，默認使用 REST
```

### 5.2 可選變數
```bash
# Google Analytics
VITE_GA_ID=G-DJE7FZLCHG

# 地圖配置
VITE_MAP_CENTER_LAT=23.8751
VITE_MAP_CENTER_LNG=121.5780
VITE_MAP_DEFAULT_ZOOM=11
```

## 6. API 使用範例

### 6.1 新的 API 調用方式
```javascript
// 舊方式（Base44/REST 切換）
import { Grid } from '@/api/entities';

// 新方式（純 REST）
import { gridAPI } from '@/api/endpoints/grids';

// 使用
const grids = await gridAPI.list();
const grid = await gridAPI.get(id);
await gridAPI.create(data);
await gridAPI.update(id, data);
await gridAPI.delete(id);
```

### 6.2 統一導出（向後兼容）
```javascript
// src/api/index.js
export * from './endpoints/disaster-areas';
export * from './endpoints/grids';
export * from './endpoints/volunteers';
// ...

// 舊代碼仍可使用（暫時）
import { Grid } from '@/api';
```

## 7. 遷移檢查清單

### 7.1 代碼層面
- [ ] 所有 `@base44/sdk` imports 已移除
- [ ] 所有 API 調用指向 REST endpoints
- [ ] 沒有殘留的 Base44 配置
- [ ] 環境變數已標準化

### 7.2 依賴層面
- [ ] package.json 不包含 `@base44/sdk`
- [ ] package-lock.json 已更新
- [ ] node_modules 已清理重裝

### 7.3 功能層面
- [ ] 所有頁面正常載入
- [ ] API 調用正常運作
- [ ] 錯誤處理正確顯示
- [ ] 本地開發環境運行正常

## 8. 回滾計畫

如果重組過程出現問題，可按以下步驟回滾：

1. 恢復 git commit: `git reset --hard <commit-before-reorganization>`
2. 或者保留 backup 分支: `git checkout backup-before-reorganization`
3. 重新安裝依賴: `npm install`

## 9. 時間估算

- Phase 1 (API 層): ~2-3 小時
- Phase 2 (組件): ~1-2 小時
- Phase 3 (配置): ~30 分鐘
- Phase 4 (Import 更新): ~1-2 小時
- Phase 5 (文檔): ~1 小時

**總計**: 約 5.5-8.5 小時

## 10. 後續優化建議

### 10.1 短期（1-2 週）
- 實作 TypeScript 類型定義
- 添加 API 請求攔截器（auth, logging）
- 實作錯誤處理標準化
- 添加 loading 狀態管理

### 10.2 中期（1-2 個月）
- 實作 React Query 或 SWR（數據快取）
- 添加單元測試（Vitest）
- 實作組件故事書（Storybook）
- API 文檔自動生成

### 10.3 長期（3-6 個月）
- 完整 TypeScript 遷移
- 實作端到端測試（Playwright）
- 性能優化（code splitting, lazy loading）
- PWA 支援

---

**備註**:
- 本計畫基於 OpenAPI 3.1.0 規格 (`api-spec/openapi.yaml`)
- 遵循 CLAUDE.md 的安全與 TDD 原則
- 參考 README.md 的技術棧選擇
