# 📚 Shovel Heroes 文件中心

## 🚀 快速開始

### 新手入門
1. **安裝依賴**: 閱讀 [安裝指南](./INSTALLATION_GUIDE.md)
2. **執行腳本**: `.\scripts\install-deps.bat` (Windows)
3. **驗證環境**: `npm run test` 和 `npm run openapi:lint`

---

## 📋 文件索引

### 核心專案文件
| 文件 | 說明 | 位置 |
|------|------|------|
| 📘 README.md | 專案架構與技術棧 | [../README.md](../README.md) |
| 🔒 CLAUDE.md | 安全修補計畫 | [../CLAUDE.md](../CLAUDE.md) |
| 🧪 claude-prompts.md | TDD 工具指南 | [../claude-prompts.md](../claude-prompts.md) |

### 依賴管理文件（2025-10-02 更新）
| 文件 | 說明 | 連結 |
|------|------|------|
| ✅ 執行摘要 | 任務完成狀態與下一步 | [EXECUTION_SUMMARY.md](./EXECUTION_SUMMARY.md) |
| 📦 更新摘要 | 詳細變更清單 | [DEPENDENCY_UPDATE_SUMMARY.md](./DEPENDENCY_UPDATE_SUMMARY.md) |
| 🔧 安裝指南 | 安裝步驟與故障排除 | [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) |
| 📊 最終報告 | 完整更新報告 | [DEPENDENCY_UPDATE_FINAL.md](./DEPENDENCY_UPDATE_FINAL.md) |

### API 文件
| 文件 | 說明 | 位置 |
|------|------|------|
| 📄 OpenAPI 規格 | API 3.2.0 定義 | [../api-spec/openapi.yaml](../api-spec/openapi.yaml) |

---

## 🔧 常用指令

### 安裝與設定
```bash
# Windows 安裝
.\scripts\install-deps.bat

# Linux/Mac 安裝
npm install --legacy-peer-deps
```

### 測試
```bash
npm run test              # 執行所有測試
npm run test:watch        # 監視模式
npm run test:ui          # UI 介面
npm run test:coverage    # 覆蓋率報告
npm run test:api         # 後端測試
```

### OpenAPI
```bash
npm run openapi:lint     # 驗證規格
npm run openapi:preview  # 預覽文件
npm run types:openapi    # 產生型別
```

### 開發
```bash
npm run dev              # 前端開發
npm run dev:api          # 後端 API
npm run build            # 建置前端
npm run build:api        # 建置後端
```

---

## 📈 最近更新

### 2025-10-02: 依賴管理大更新
- ❌ 移除 Base44 SDK
- ✅ 新增完整測試工具鏈（Vitest + Supertest）
- ✅ 升級 Fastify 至 5.0
- ✅ 新增安全套件（Helmet, JWT, Rate Limit）
- ✅ 優化 OpenAPI 工具指令
- 📝 建立完整文件與安裝腳本

詳見: [執行摘要](./EXECUTION_SUMMARY.md)

---

## 🆘 需要幫助？

### 安裝問題
→ 查看 [安裝指南](./INSTALLATION_GUIDE.md)

### 依賴衝突
→ 查看 [更新摘要](./DEPENDENCY_UPDATE_SUMMARY.md)

### TDD 開發
→ 查看 [claude-prompts.md](../claude-prompts.md)

### 安全問題
→ 查看 [CLAUDE.md](../CLAUDE.md)

---

## 📊 專案狀態

### 技術棧
- **前端**: Vite + React 18 + Tailwind
- **後端**: Fastify 5.0 + PostgreSQL + RLS
- **測試**: Vitest 2.1 + Supertest 7.0
- **API**: OpenAPI 3.2.0
- **安全**: Helmet + CORS + Rate Limit + JWT

### 開發需求
- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- PostgreSQL (Docker)
- MailHog (Docker, 開發用)

---

## 🎯 下一步

1. ✅ 依賴已更新（本次完成）
2. ⏭️ 建立測試案例
3. ⏭️ 實作 API 授權
4. ⏭️ 設定 CI/CD

---

**最後更新**: 2025-10-02
**維護者**: Shovel Heroes Team
