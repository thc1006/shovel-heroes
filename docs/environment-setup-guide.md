# 環境設定快速指南

本指南提供 Shovel Heroes 專案的環境設定步驟，讓開發者能快速上手。

## 📋 目錄

- [前置需求](#前置需求)
- [快速開始](#快速開始)
- [情境一：前端獨立開發](#情境一前端獨立開發無需後端)
- [情境二：完整開發環境](#情境二完整開發環境前端--後端)
- [情境三：生產部署](#情境三生產部署)
- [驗證工具](#驗證工具)
- [常見問題](#常見問題)

---

## 前置需求

### 必須安裝

- **Node.js** 20+ ([下載](https://nodejs.org/))
- **npm** 或 **pnpm** 套件管理器

### 選用（依開發需求）

- **Docker** & **Docker Compose** - 資料庫容器化 ([下載](https://www.docker.com/))
- **PostgreSQL** 16+ - 本地資料庫 ([下載](https://www.postgresql.org/))
- **Git** - 版本控制 ([下載](https://git-scm.com/))

---

## 快速開始

### 1️⃣ Clone 專案

```bash
git clone https://github.com/tanyakuo/shovel-heroes.git
cd shovel-heroes
```

### 2️⃣ 安裝依賴

```bash
npm install
```

### 3️⃣ 選擇開發模式

根據你的需求選擇以下其中一種：

- **模式 A**: 前端獨立開發（無需後端）→ [跳至情境一](#情境一前端獨立開發無需後端)
- **模式 B**: 完整開發環境（前端 + 後端）→ [跳至情境二](#情境二完整開發環境前端--後端)
- **模式 C**: 生產部署 → [跳至情境三](#情境三生產部署)

---

## 情境一：前端獨立開發（無需後端）

適合：
- 快速 UI/UX 原型開發
- 前端功能測試
- 無需資料庫的開發

### 步驟

#### 1. 設定環境變數

```bash
# 複製範例檔案
cp .env.example.local .env.local

# 設定為 LocalStorage 模式
echo "VITE_USE_FRONTEND=true" > .env.local
```

#### 2. 啟動前端

```bash
npm run dev
```

#### 3. 開啟瀏覽器

```
http://localhost:5173
```

✅ **完成！** 所有資料會儲存在瀏覽器的 LocalStorage

---

## 情境二：完整開發環境（前端 + 後端）

適合：
- 完整功能開發
- API 測試
- 資料庫整合測試

### 步驟

#### 1. 設定前端環境變數

```bash
# 複製範例檔案
cp .env.example.local .env.local

# 設定為 REST API 模式
cat > .env.local << EOF
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
VITE_ENABLE_API_LOGGING=true
EOF
```

#### 2. 設定後端環境變數

```bash
# 進入後端目錄
cd packages/backend

# 複製範例檔案
cp .env.example .env

# 生成強隨機 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# 設定後端環境變數
cat > .env << EOF
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes
PORT=8787
NODE_ENV=development
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
LOG_LEVEL=debug
LOG_PRETTY=true
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=dev@shovel-heroes.local
DEBUG_ENDPOINTS=true
EOF

# 回到專案根目錄
cd ../..
```

#### 3. 啟動資料庫（使用 Docker）

```bash
# 啟動 PostgreSQL 和 MailHog
docker-compose up -d db mailhog

# 等待資料庫啟動
sleep 5

# 執行資料庫遷移
npm run migrate:up
```

**或手動啟動 PostgreSQL**:

```bash
# 確保 PostgreSQL 正在運行
# Port: 5432
# Database: shovelheroes
# User: postgres
# Password: postgres

# 建立資料庫
createdb -U postgres shovelheroes

# 執行遷移
npm run migrate:up
```

#### 4. 啟動後端 API

```bash
# 終端機 1
npm run dev:api
```

**預期輸出**:
```
🚀 Server listening at http://localhost:8787
📊 Swagger UI: http://localhost:8787/documentation
```

#### 5. 啟動前端

```bash
# 終端機 2
npm run dev
```

**預期輸出**:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### 6. 驗證服務

```bash
# 檢查後端健康狀態
curl http://localhost:8787/api/health

# 預期回應
{"status":"ok","timestamp":"2025-10-02T..."}
```

✅ **完成！** 前後端整合開發環境已就緒

---

## 情境三：生產部署

適合：
- VM 部署
- Docker 部署
- Cloud 平台部署

### 方式 A：VM 部署（Nginx 反向代理）

#### 1. 設定前端環境變數

```bash
# .env.production
cat > .env.production << EOF
VITE_USE_FRONTEND=false
VITE_API_BASE=/api
VITE_SOURCEMAP=false
EOF
```

#### 2. 設定後端環境變數

```bash
# packages/backend/.env
cd packages/backend

cat > .env << EOF
DATABASE_URL=postgres://prod_user:STRONG_PASSWORD@localhost:5432/shovelheroes
PORT=8787
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://shovel-heroes.com,https://www.shovel-heroes.com
LOG_LEVEL=info
LOG_PRETTY=false
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
EMAIL_FROM=noreply@shovel-heroes.com
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW=60000
DEBUG_ENDPOINTS=false
SWAGGER_ENABLED=false
EOF

cd ../..
```

#### 3. 建置專案

```bash
# 建置前端
npm run build

# 建置後端
cd packages/backend
npm run build
cd ../..
```

#### 4. 部署到 VM

```bash
# 使用部署腳本（Ubuntu/Debian）
sudo ./scripts/deploy.sh

# 或手動部署
sudo mkdir -p /var/www/shovel-heroes
sudo cp -r dist/* /var/www/shovel-heroes/
sudo systemctl restart shovel-heroes-api
sudo systemctl reload nginx
```

#### 5. 設定 Nginx

```bash
# 複製 Nginx 配置
sudo cp infra/nginx/shovelheroes.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/shovelheroes.conf /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重新載入
sudo systemctl reload nginx
```

#### 6. 設定 HTTPS（Let's Encrypt）

```bash
# 安裝 certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 取得憑證
sudo certbot --nginx -d shovel-heroes.com -d www.shovel-heroes.com

# 自動續約
sudo certbot renew --dry-run
```

### 方式 B：Docker Compose 部署

#### 1. 設定環境變數

```bash
# .env (專案根目錄)
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgres://postgres:postgres@db:5432/shovelheroes
VITE_API_BASE=http://localhost:8787
EOF
```

#### 2. 啟動所有服務

```bash
# 建置並啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 查看服務狀態
docker-compose ps
```

#### 3. 執行資料庫遷移

```bash
# 在 API 容器中執行遷移
docker-compose exec api npm run migrate:up
```

✅ **完成！** 生產環境已部署

---

## 驗證工具

### 自動驗證腳本

專案提供自動化驗證腳本，檢查環境變數設定是否正確：

```bash
# 執行驗證
./scripts/verify-env.sh
```

**輸出範例**:
```
🔍 Shovel Heroes 環境變數驗證工具
==================================

📱 前端環境變數檢查
-------------------
載入: .env.local

✓ VITE_USE_FRONTEND: 已設定
✓ VITE_API_BASE: 已設定
○ VITE_API_TIMEOUT: 未設定（選用）

📡 後端環境變數檢查
-------------------
載入: packages/backend/.env

✓ DATABASE_URL: 已設定
✓ PORT: 已設定
✓ NODE_ENV: 已設定

🔐 JWT 配置檢查
✓ JWT_SECRET: 已設定

🔒 Git 安全檢查
---------------
✓ .env 未被 Git 追蹤
✓ packages/backend/.env 未被 Git 追蹤

==================================
📊 驗證結果
==================================
✓ 所有檢查通過！環境配置正確
```

### 手動驗證

#### 檢查前端

```bash
# 檢查環境變數是否載入
npm run dev 2>&1 | grep -i "vite"

# 測試 API 連線（REST 模式）
curl http://localhost:5173
```

#### 檢查後端

```bash
# 檢查後端啟動
curl http://localhost:8787/api/health

# 檢查 Swagger UI
open http://localhost:8787/documentation
```

#### 檢查資料庫

```bash
# 使用 psql
psql -h localhost -U postgres -d shovelheroes -c "\dt"

# 或使用 Docker
docker-compose exec db psql -U postgres -d shovelheroes -c "\dt"
```

---

## 常見問題

### ❓ Q1: CORS 錯誤

**問題**:
```
Access to fetch at 'http://localhost:8787/api/grids' has been blocked by CORS policy
```

**解決方案**:
```bash
# packages/backend/.env
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

重新啟動後端：
```bash
npm run dev:api
```

---

### ❓ Q2: 資料庫連線失敗

**問題**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方案**:

**檢查 Docker**:
```bash
# 確認容器運行
docker-compose ps

# 如果未運行，啟動它
docker-compose up -d db
```

**檢查本地 PostgreSQL**:
```bash
# Linux/macOS
sudo systemctl status postgresql

# macOS (Homebrew)
brew services list

# Windows
# 檢查服務管理員中的 PostgreSQL 服務
```

---

### ❓ Q3: JWT 驗證失敗

**問題**:
```
JsonWebTokenError: invalid signature
```

**解決方案**:

確保使用正確的 JWT_SECRET：

```bash
# 檢查當前 JWT_SECRET
node -e "require('dotenv').config({path: 'packages/backend/.env'}); console.log(process.env.JWT_SECRET)"

# 如果遺失，重新生成
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=${JWT_SECRET}" >> packages/backend/.env
```

重新啟動後端。

---

### ❓ Q4: API 請求超時

**問題**:
```
Error: timeout of 30000ms exceeded
```

**解決方案**:

增加超時時間：

```bash
# .env.local
VITE_API_TIMEOUT=60000  # 60 秒
```

或檢查後端回應時間：
```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8787/api/grids
```

---

### ❓ Q5: 前端無法連接後端

**問題**:
前端顯示 "Network Error" 或無法載入資料

**解決方案**:

**檢查後端是否運行**:
```bash
# 測試後端健康端點
curl http://localhost:8787/api/health

# 檢查後端日誌
npm run dev:api
```

**檢查環境變數**:
```bash
# .env.local
cat .env.local

# 應包含
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
```

**重新啟動前端**:
```bash
# 停止前端 (Ctrl+C)
# 重新啟動
npm run dev
```

---

### ❓ Q6: 找不到 .env 檔案

**問題**:
```
Error: Cannot find module 'dotenv'
或
找不到 .env.local
```

**解決方案**:

```bash
# 1. 確保已安裝依賴
npm install

# 2. 複製範例檔案
cp .env.example.local .env.local
cp packages/backend/.env.example packages/backend/.env

# 3. 驗證檔案存在
ls -la .env*
ls -la packages/backend/.env*
```

---

### ❓ Q7: Git 追蹤了 .env 檔案

**問題**:
```
warning: LF will be replaced by CRLF in .env
```

**解決方案**:

```bash
# 移除已追蹤的 .env 檔案
git rm --cached .env
git rm --cached packages/backend/.env
git rm --cached .env.local
git rm --cached packages/backend/.env.local

# 提交變更
git commit -m "chore: remove .env files from git tracking"

# 確認 .gitignore 包含
cat .gitignore | grep "\.env"
```

---

## 📚 相關文件

- [環境變數完整說明](./environment-variables.md) - 所有環境變數詳細說明
- [後端 API 整合指南](../BACKEND_API_INTEGRATION_GUIDE.md) - API 整合文件
- [README](../README.md) - 專案概述

---

## 🆘 需要協助？

如遇到其他問題：

1. 查看 [GitHub Issues](https://github.com/tanyakuo/shovel-heroes/issues)
2. 執行驗證腳本：`./scripts/verify-env.sh`
3. 檢查日誌：
   ```bash
   # 前端
   npm run dev

   # 後端
   npm run dev:api

   # Docker
   docker-compose logs -f
   ```

---

**維護者**: Shovel Heroes 開發團隊
**最後更新**: 2025-10-02
