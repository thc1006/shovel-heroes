# 📑 Shovel Heroes 文件索引

## 📂 文件結構

```
docs/
├── INDEX.md (本文件)
├── README.md (文件中心首頁)
├── QUICK_REFERENCE.md (指令速查表)
│
├── 依賴管理更新 (2025-10-02)
│   ├── EXECUTION_SUMMARY.md (執行摘要)
│   ├── DEPENDENCY_UPDATE_SUMMARY.md (詳細變更清單)
│   ├── DEPENDENCY_UPDATE_FINAL.md (最終報告)
│   └── INSTALLATION_GUIDE.md (安裝與故障排除)
│
├── API 與設定
│   ├── API_CONFIG_UPDATE_SUMMARY.md
│   ├── environment-setup-guide.md
│   └── environment-variables.md
│
├── 常數與架構
│   ├── CONSTANTS_GUIDE.md
│   ├── CONSTANTS_IMPLEMENTATION_SUMMARY.md
│   └── CONSTANTS_QUICK_REFERENCE.md
│
├── 測試文件
│   ├── VITEST_SETUP.md
│   ├── VOLUNTEER_TESTS_QUICK_START.md
│   └── TEST_REPORT_VOLUNTEERS.md
│
└── 開發規劃
    ├── frontend-reorganization-plan.md
    └── feature-completeness-checklist.md

scripts/
└── install-deps.bat (Windows 安裝腳本)
```

---

## 🚀 快速導覽

### 新手必讀
1. 📘 [README](./README.md) - 文件中心首頁
2. 🚀 [安裝指南](./INSTALLATION_GUIDE.md) - 環境設定步驟
3. ⚡ [指令速查表](./QUICK_REFERENCE.md) - 常用指令

### 最近更新（2025-10-02）
- ✅ [執行摘要](./EXECUTION_SUMMARY.md) - 依賴更新完成狀態
- 📦 [更新摘要](./DEPENDENCY_UPDATE_SUMMARY.md) - 變更清單
- 🔧 [最終報告](./DEPENDENCY_UPDATE_FINAL.md) - 完整報告

---

## 📚 依賴管理更新（最新）

### 核心文件
| 文件 | 說明 | 適合對象 |
|------|------|----------|
| [EXECUTION_SUMMARY.md](./EXECUTION_SUMMARY.md) | 任務完成狀態與下一步 | 所有人 |
| [DEPENDENCY_UPDATE_SUMMARY.md](./DEPENDENCY_UPDATE_SUMMARY.md) | 詳細變更清單與統計 | 開發者 |
| [DEPENDENCY_UPDATE_FINAL.md](./DEPENDENCY_UPDATE_FINAL.md) | 完整更新報告 | 技術主管 |
| [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | 安裝步驟與故障排除 | 新手開發者 |

### 主要變更
- ❌ 移除 Base44 SDK
- ✅ 新增 Vitest + Supertest 測試工具
- ✅ 升級 Fastify 至 5.0
- ✅ 新增安全套件（Helmet, JWT, Rate Limit）
- 📝 建立完整文件與腳本

---

## 🧪 測試文件

| 文件 | 說明 |
|------|------|
| [VITEST_SETUP.md](./VITEST_SETUP.md) | Vitest 設定指南 |
| [VOLUNTEER_TESTS_QUICK_START.md](./VOLUNTEER_TESTS_QUICK_START.md) | 志工測試快速開始 |
| [TEST_REPORT_VOLUNTEERS.md](./TEST_REPORT_VOLUNTEERS.md) | 測試報告 |

---

## 🔧 API 與設定

| 文件 | 說明 |
|------|------|
| [API_CONFIG_UPDATE_SUMMARY.md](./API_CONFIG_UPDATE_SUMMARY.md) | API 設定更新摘要 |
| [environment-setup-guide.md](./environment-setup-guide.md) | 環境設定指南 |
| [environment-variables.md](./environment-variables.md) | 環境變數說明 |

---

## 📐 常數與架構

| 文件 | 說明 |
|------|------|
| [CONSTANTS_GUIDE.md](./CONSTANTS_GUIDE.md) | 常數使用指南 |
| [CONSTANTS_IMPLEMENTATION_SUMMARY.md](./CONSTANTS_IMPLEMENTATION_SUMMARY.md) | 實作摘要 |
| [CONSTANTS_QUICK_REFERENCE.md](./CONSTANTS_QUICK_REFERENCE.md) | 快速參考 |

---

## 📋 開發規劃

| 文件 | 說明 |
|------|------|
| [frontend-reorganization-plan.md](./frontend-reorganization-plan.md) | 前端重組計畫 |
| [feature-completeness-checklist.md](./feature-completeness-checklist.md) | 功能完整性清單 |

---

## 🛠️ 腳本工具

| 檔案 | 說明 | 平台 |
|------|------|------|
| [scripts/install-deps.bat](../scripts/install-deps.bat) | 依賴安裝腳本 | Windows |

---

## 📖 核心專案文件（根目錄）

| 文件 | 說明 | 位置 |
|------|------|------|
| README.md | 專案架構與技術棧 | [../README.md](../README.md) |
| CLAUDE.md | 安全修補計畫 | [../CLAUDE.md](../CLAUDE.md) |
| claude-prompts.md | TDD 工具指南 | [../claude-prompts.md](../claude-prompts.md) |
| openapi.yaml | API 3.2.0 規格 | [../api-spec/openapi.yaml](../api-spec/openapi.yaml) |

---

## ⚡ 快速指令

### 安裝
```bash
# Windows
.\scripts\install-deps.bat

# Linux/Mac
npm install --legacy-peer-deps
```

### 驗證
```bash
npm run test
npm run openapi:lint
```

### 開發
```bash
npm run dev          # 前端
npm run dev:api      # 後端
npm run test:watch   # 測試監視模式
```

---

## 🔍 尋找特定主題

### 安裝問題
→ [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)

### 測試設定
→ [VITEST_SETUP.md](./VITEST_SETUP.md)

### API 開發
→ [API_CONFIG_UPDATE_SUMMARY.md](./API_CONFIG_UPDATE_SUMMARY.md)

### 環境變數
→ [environment-variables.md](./environment-variables.md)

### 指令查詢
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

## 📊 文件統計

- **總文件數**: 17
- **腳本數**: 1
- **最近更新**: 2025-10-02
- **主要主題**: 依賴管理、測試、API、環境設定

---

## 🎯 建議閱讀順序

### 新加入開發者
1. [README](./README.md) - 了解文件結構
2. [INSTALLATION_GUIDE](./INSTALLATION_GUIDE.md) - 設定開發環境
3. [QUICK_REFERENCE](./QUICK_REFERENCE.md) - 學習常用指令
4. [VITEST_SETUP](./VITEST_SETUP.md) - 設定測試環境

### 進行依賴更新
1. [EXECUTION_SUMMARY](./EXECUTION_SUMMARY.md) - 了解最新狀態
2. [DEPENDENCY_UPDATE_SUMMARY](./DEPENDENCY_UPDATE_SUMMARY.md) - 查看變更清單
3. [INSTALLATION_GUIDE](./INSTALLATION_GUIDE.md) - 執行安裝

### API 開發
1. [../api-spec/openapi.yaml](../api-spec/openapi.yaml) - API 規格
2. [API_CONFIG_UPDATE_SUMMARY](./API_CONFIG_UPDATE_SUMMARY.md) - API 設定
3. [environment-variables](./environment-variables.md) - 環境設定

---

## 📝 維護資訊

### 最近更新
- **2025-10-02**: 依賴管理大更新
  - 移除 Base44
  - 新增測試工具鏈
  - 建立完整文件

### 文件維護者
- Claude (依賴管理專家)
- Shovel Heroes Team

### 回報問題
如發現文件錯誤或需要補充，請：
1. 建立 GitHub Issue
2. 標註 `documentation` 標籤
3. 說明問題與建議

---

**最後更新**: 2025-10-02
**版本**: 1.0.0
