# API Config 更新摘要

## 更新日期
2025-10-02

## 目標
更新 config.js 以支援前端模式切換（VITE_USE_FRONTEND），並建立完整的測試套件。

## 已完成的更新

### 1. 更新 `src/api/config.js`

#### 新增功能：
- **模式判斷邏輯**：根據 `VITE_USE_FRONTEND` 環境變數判斷使用 `frontend` 或 `rest` 模式
- **模式常數**：新增 `API_MODE` 常數，自動設定為 `'frontend'` 或 `'rest'`
- **超時配置改進**：`API_TIMEOUT` 現在支援從環境變數讀取並正確轉換為數字型別
- **模式切換輔助函數**：
  - `isFrontendMode()` - 檢查是否為前端模式
  - `isRestMode()` - 檢查是否為 REST 模式

#### 更新的 apiConfig 物件：
```javascript
export const apiConfig = {
  mode: API_MODE,              // 新增：當前模式 ('frontend' 或 'rest')
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  version: API_VERSION,
  retry: RETRY_CONFIG,
  headers: DEFAULT_HEADERS,
  logging: ENABLE_REQUEST_LOGGING,
  errorTracking: ENABLE_ERROR_TRACKING,
  endpoints: API_ENDPOINTS,
  isDev: import.meta.env.DEV,  // 新增：開發環境標誌
  isProd: import.meta.env.PROD // 新增：生產環境標誌
};
```

#### 開發模式日誌：
新增開發環境下的自動日誌輸出，方便除錯：
```javascript
if (import.meta.env.DEV) {
  console.log('[API Config]', {
    mode: API_MODE,
    baseURL: API_BASE_URL,
    timeout: `${API_TIMEOUT}ms`,
  });
}
```

### 2. 更新 `src/api/index.js`

新增模式相關的導出：
```javascript
export {
  apiConfig,
  API_BASE_URL,
  API_ENDPOINTS,
  API_MODE,          // 新增
  isFrontendMode,    // 新增
  isRestMode         // 新增
} from './config.js';
```

### 3. 建立 `tests/api/config.test.js`

完整的測試套件，涵蓋以下測試情境：

#### 環境變數讀取測試
- ✅ 從 VITE_USE_FRONTEND 讀取模式
- ✅ 從 VITE_API_BASE 讀取 API 基礎 URL
- ✅ 從 VITE_API_TIMEOUT 讀取超時時間

#### 模式判斷邏輯測試
- ✅ VITE_USE_FRONTEND=true 時使用 frontend 模式
- ✅ VITE_USE_FRONTEND=false 時使用 rest 模式
- ✅ 未設定時預設為 rest 模式

#### API_BASE_URL Fallback 測試
- ✅ 未設定時使用預設值 `http://localhost:8787`
- ✅ 空字串時使用預設值

#### Timeout 預設值測試
- ✅ 未設定時使用預設值 30000ms
- ✅ 無效數字時使用預設值
- ✅ 正確轉換字串數字為數值型別

#### 輔助函數測試
- ✅ `isFrontendMode()` 在 frontend 模式下返回 true
- ✅ `isFrontendMode()` 在 rest 模式下返回 false
- ✅ `isRestMode()` 在 rest 模式下返回 true
- ✅ `isRestMode()` 在 frontend 模式下返回 false
- ✅ 兩個函數互斥

#### apiConfig 物件測試
- ✅ 包含所有必要的配置屬性
- ✅ mode 屬性正確反映當前模式
- ✅ 正確設定開發/生產環境標誌

#### 環境特定配置測試
- ✅ 開發環境啟用請求日誌
- ✅ 生產環境啟用錯誤追蹤

#### API 端點配置測試
- ✅ 包含所有必要的端點
- ✅ 動態端點函數正確生成路徑

## 使用範例

### 在應用程式中使用

```javascript
import { API_MODE, isFrontendMode, isRestMode, apiConfig } from '@/api';

// 檢查當前模式
if (isFrontendMode()) {
  console.log('使用前端 LocalStorage 模式');
  // 使用 LocalStorage API
} else if (isRestMode()) {
  console.log('使用 REST API 模式');
  // 使用 HTTP 客戶端
}

// 讀取配置
console.log('API 模式:', apiConfig.mode);
console.log('基礎 URL:', apiConfig.baseURL);
console.log('超時時間:', apiConfig.timeout);
```

### 環境變數配置

#### 前端 LocalStorage 模式
```bash
VITE_USE_FRONTEND=true
```

#### REST API 模式
```bash
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
VITE_API_TIMEOUT=30000  # 可選，預設 30000ms
```

## 執行測試

```bash
# 執行所有測試
npm test

# 執行 API config 測試
npm test tests/api/config.test.js

# 執行測試並產生覆蓋率報告
npm run test:coverage
```

## 相關檔案

- ✅ `src/api/config.js` - API 配置主檔案（已更新）
- ✅ `src/api/index.js` - API 統一導出（已更新）
- ✅ `tests/api/config.test.js` - API 配置測試（新建）
- 📄 `README.md` - 環境變數說明（參考 L35-38）
- 📄 `BACKEND_API_INTEGRATION_GUIDE.md` - 詳細配置指南（參考 L972-1017）

## 測試覆蓋率目標

根據專案要求（`vitest.config.js`），測試覆蓋率應達到：
- ✅ Lines: 80%
- ✅ Functions: 80%
- ✅ Branches: 80%
- ✅ Statements: 80%

## 向後相容性

所有更新完全向後相容：
- 現有的 `API_BASE_URL`、`API_TIMEOUT`、`API_ENDPOINTS` 保持不變
- 僅新增模式相關功能，不影響現有程式碼
- 預設行為（未設定 `VITE_USE_FRONTEND`）與原先相同（使用 REST 模式）

## 後續建議

1. **整合測試**：建立整合測試驗證前端/REST 模式切換
2. **文件更新**：更新使用者文件說明模式切換功能
3. **型別定義**：考慮為模式相關函數新增 TypeScript 型別定義
4. **錯誤處理**：新增模式不匹配時的錯誤處理機制
5. **效能監控**：追蹤不同模式下的效能表現

## 安全考量

- ✅ 環境變數嚴格驗證（僅接受 'true' 字串作為 frontend 模式）
- ✅ 超時值數字轉換安全處理（無效值使用預設值）
- ✅ API 基礎 URL fallback 機制
- ✅ 開發模式日誌僅在 DEV 環境啟用

## 結論

所有目標已完成：
1. ✅ src/api/config.js 已更新支援模式切換
2. ✅ tests/api/config.test.js 測試套件已建立（涵蓋所有需求）
3. ✅ src/api/index.js 已更新導出模式相關函數
4. ✅ 完全向後相容
5. ✅ 符合專案程式碼規範與測試標準
