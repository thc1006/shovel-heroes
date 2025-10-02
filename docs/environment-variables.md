# 環境變數配置指南

本文件詳細說明 Shovel Heroes 專案的所有環境變數及其用途，並提供不同部署情境的範例配置。

## 📋 目錄

- [快速開始](#快速開始)
- [前端環境變數](#前端環境變數)
- [後端環境變數](#後端環境變數)
- [部署情境配置](#部署情境配置)
- [安全注意事項](#安全注意事項)

---

## 快速開始

### 1. 本地開發設定

```bash
# 複製範例檔案
cp .env.example.local .env.local

# 設定為 REST API 模式（需要後端）
echo "VITE_USE_FRONTEND=false" >> .env.local
echo "VITE_API_BASE=http://localhost:8787" >> .env.local

# 後端環境變數
cd packages/backend
cp .env.example .env
```

### 2. 前端獨立開發（無需後端）

```bash
# LocalStorage 模式
echo "VITE_USE_FRONTEND=true" > .env.local
npm run dev
```

---

## 前端環境變數

### 核心配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `VITE_USE_FRONTEND` | `false` | 模式切換：`true`=LocalStorage，`false`=REST API |
| `VITE_API_BASE` | `http://localhost:8787` | REST API 基礎 URL |
| `VITE_API_TIMEOUT` | `30000` | API 請求超時（毫秒） |

### 部署配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `GITHUB_PAGES` | `false` | 是否部署到 GitHub Pages |
| `VITE_PORT` | `5173` | Vite 開發伺服器 Port |
| `VITE_SOURCEMAP` | `true` | 啟用 source maps（生產環境建議關閉） |

### 開發工具

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `VITE_ENABLE_DEV_TOOLS` | - | 啟用開發者工具（僅開發模式） |
| `VITE_ENABLE_API_LOGGING` | - | 啟用 API 請求日誌 |

### 第三方服務（未來擴充）

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `VITE_GOOGLE_MAPS_KEY` | - | Google Maps API Key |
| `VITE_SENTRY_DSN` | - | Sentry 錯誤追蹤 DSN |

### 範例配置檔案

#### `.env.local` (開發環境)

```bash
# REST API 模式
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
VITE_API_TIMEOUT=30000
VITE_ENABLE_API_LOGGING=true
```

#### `.env.production` (生產環境)

```bash
VITE_USE_FRONTEND=false
VITE_API_BASE=https://api.shovel-heroes.com
VITE_API_TIMEOUT=30000
VITE_SOURCEMAP=false
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## 後端環境變數

### 資料庫配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/shovelheroes` | PostgreSQL 連線字串 |
| `DB_POOL_MIN` | `2` | 連線池最小連線數 |
| `DB_POOL_MAX` | `10` | 連線池最大連線數 |

### 伺服器配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `PORT` | `8787` | API 伺服器 Port（⚠️ 生產環境固定 8787） |
| `NODE_ENV` | `development` | Node 執行環境 |

### JWT 驗證

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `JWT_SECRET` | - | **⚠️ 必須設定**：32+ 字元隨機字串 |
| `JWT_EXPIRES_IN` | `24h` | JWT Token 過期時間 |

### CORS 配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `CORS_ORIGIN` | `http://localhost:5173` | 允許的來源（逗號分隔） |

### 日誌配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `LOG_LEVEL` | `info` | 日誌級別：`trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `LOG_PRETTY` | `true` | 格式：`true`=pretty（開發），`false`=JSON（生產） |

### OpenTelemetry

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `OTEL_ENABLED` | `false` | 啟用 OpenTelemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP Exporter 端點 |
| `OTEL_SERVICE_NAME` | `shovel-heroes-api` | Service 名稱 |

### Email 配置

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `SMTP_HOST` | `127.0.0.1` | SMTP 主機（開發用 MailHog） |
| `SMTP_PORT` | `1025` | SMTP Port |
| `SMTP_SECURE` | `false` | 使用 TLS/SSL |
| `SMTP_USER` | - | SMTP 使用者名稱 |
| `SMTP_PASS` | - | SMTP 密碼 |
| `EMAIL_FROM` | `noreply@shovel-heroes.com` | 寄件者 Email |

### Rate Limiting

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `RATE_LIMIT_MAX` | `100` | 最大請求數（每時間窗口） |
| `RATE_LIMIT_WINDOW` | `60000` | 時間窗口（毫秒） |

### 安全設定

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `HELMET_ENABLED` | `true` | 啟用 Helmet 安全標頭 |
| `CSRF_ENABLED` | `true` | 啟用 CSRF 保護 |

### 功能開關

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `DEBUG_ENDPOINTS` | `true` | 啟用 Debug 端點（`/debug/*`） |
| `SWAGGER_ENABLED` | `true` | 啟用 Swagger UI |

### 範例配置檔案

#### `packages/backend/.env` (開發環境)

```bash
# 資料庫
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes

# 伺服器
PORT=8787
NODE_ENV=development

# JWT
JWT_SECRET=dev-secret-key-please-change-in-production
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

# 日誌
LOG_LEVEL=debug
LOG_PRETTY=true

# Email (MailHog)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=dev@shovel-heroes.local

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# 功能開關
DEBUG_ENDPOINTS=true
SWAGGER_ENABLED=true
```

#### `packages/backend/.env.production` (生產環境)

```bash
# 資料庫
DATABASE_URL=postgres://prod_user:STRONG_PASSWORD@db.example.com:5432/shovelheroes
DB_POOL_MIN=5
DB_POOL_MAX=20

# 伺服器
PORT=8787
NODE_ENV=production

# JWT
JWT_SECRET=<使用 openssl rand -base64 32 生成>
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=https://shovel-heroes.com,https://www.shovel-heroes.com

# 日誌
LOG_LEVEL=info
LOG_PRETTY=false

# OpenTelemetry
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4318
OTEL_SERVICE_NAME=shovel-heroes-api

# Email (真實 SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=<SendGrid API Key>
EMAIL_FROM=noreply@shovel-heroes.com

# Rate Limiting（更嚴格）
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW=60000

# 安全設定
HELMET_ENABLED=true
CSRF_ENABLED=true

# 功能開關（生產關閉）
DEBUG_ENDPOINTS=false
SWAGGER_ENABLED=false
```

---

## 部署情境配置

### 1. 本地開發（前端 + 後端）

**前端 `.env.local`**:
```bash
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
VITE_ENABLE_API_LOGGING=true
```

**後端 `packages/backend/.env`**:
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes
PORT=8787
NODE_ENV=development
JWT_SECRET=dev-secret-key
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
LOG_PRETTY=true
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
```

### 2. 前端獨立開發（無後端）

**前端 `.env.local`**:
```bash
VITE_USE_FRONTEND=true
```

### 3. GitHub Pages 部署

**前端 `.env.production`**:
```bash
VITE_USE_FRONTEND=false
VITE_API_BASE=https://api.shovel-heroes.com
GITHUB_PAGES=true
```

**建置指令**:
```bash
npm run build:github
```

### 4. VM 部署（Nginx 反向代理）

**前端 `.env.production`**:
```bash
VITE_USE_FRONTEND=false
VITE_API_BASE=/api
```

**後端 `packages/backend/.env`**:
```bash
DATABASE_URL=postgres://prod_user:PASSWORD@localhost:5432/shovelheroes
PORT=8787
NODE_ENV=production
JWT_SECRET=<強隨機字串>
CORS_ORIGIN=https://shovel-heroes.com
LOG_LEVEL=info
LOG_PRETTY=false
```

**Nginx 配置** (`/etc/nginx/sites-available/shovel-heroes`):
```nginx
server {
    listen 80;
    server_name shovel-heroes.com www.shovel-heroes.com;

    # 前端靜態檔案
    location / {
        root /var/www/shovel-heroes;
        try_files $uri $uri/ /index.html;
    }

    # 後端 API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Docker Compose 部署

**前端 `.env`**:
```bash
VITE_USE_FRONTEND=false
VITE_API_BASE=http://api:8787
```

**後端 `.env`**:
```bash
DATABASE_URL=postgres://postgres:postgres@db:5432/shovelheroes
PORT=8787
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=http://localhost:3000
```

**`docker-compose.yml`**:
```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: shovelheroes
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./packages/backend
    ports:
      - "8787:8787"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/shovelheroes
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db

  web:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE=http://localhost:8787
    depends_on:
      - api

volumes:
  pgdata:
```

---

## 安全注意事項

### 🔒 必須遵守的安全規範

#### 1. **JWT Secret 管理**

**❌ 錯誤做法**:
```bash
# 弱密碼
JWT_SECRET=secret

# 提交到 Git
git add .env
```

**✅ 正確做法**:
```bash
# 生成強隨機密鑰（32+ 字元）
openssl rand -base64 32

# 使用環境變數或密鑰管理工具
export JWT_SECRET=$(openssl rand -base64 32)

# 確保 .env 在 .gitignore 中
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

#### 2. **資料庫密碼**

**❌ 錯誤做法**:
```bash
DATABASE_URL=postgres://postgres:postgres@prod-db:5432/shovelheroes
```

**✅ 正確做法**:
```bash
# 使用強密碼
DATABASE_URL=postgres://app_user:$(openssl rand -base64 24)@prod-db:5432/shovelheroes

# 或使用密鑰管理服務
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id prod/db/url --query SecretString --output text)
```

#### 3. **CORS 配置**

**❌ 錯誤做法**:
```bash
# 允許所有來源
CORS_ORIGIN=*
```

**✅ 正確做法**:
```bash
# 明確指定允許的來源
CORS_ORIGIN=https://shovel-heroes.com,https://www.shovel-heroes.com
```

#### 4. **日誌與 Debug**

**❌ 錯誤做法**:
```bash
# 生產環境啟用 debug
NODE_ENV=production
LOG_LEVEL=debug
DEBUG_ENDPOINTS=true
```

**✅ 正確做法**:
```bash
# 生產環境使用安全配置
NODE_ENV=production
LOG_LEVEL=info
LOG_PRETTY=false
DEBUG_ENDPOINTS=false
SWAGGER_ENABLED=false
```

### 📝 .gitignore 檢查清單

確保以下檔案已加入 `.gitignore`:

```gitignore
# 環境變數檔案
.env
.env.local
.env.*.local
.env.production
.env.development

# 後端環境變數
packages/backend/.env
packages/backend/.env.local
packages/backend/.env.*.local

# 敏感資料
*.key
*.pem
*.p12
secrets/
credentials/
```

### 🔍 環境變數驗證

**開發階段檢查**:
```bash
# 檢查是否有敏感資訊外洩
git diff --cached | grep -E "(PASSWORD|SECRET|KEY|TOKEN)"

# 檢查 .env 是否被 Git 追蹤
git ls-files | grep "\.env"
```

**生產部署前檢查**:
```bash
# 驗證必要環境變數
node -e "
const required = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error('Missing required env vars:', missing);
  process.exit(1);
}
"

# 驗證 JWT_SECRET 強度（至少 32 字元）
node -e "
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET too short (min 32 chars)');
  process.exit(1);
}
"
```

---

## 🛠️ 故障排除

### 問題 1: CORS 錯誤

**錯誤訊息**:
```
Access to fetch at 'http://localhost:8787/api/grids' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**解決方案**:
```bash
# 後端 .env
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

### 問題 2: 資料庫連線失敗

**錯誤訊息**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方案**:
```bash
# 檢查 PostgreSQL 是否啟動
docker-compose ps

# 驗證連線字串
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes
```

### 問題 3: JWT 驗證失敗

**錯誤訊息**:
```
JsonWebTokenError: invalid signature
```

**解決方案**:
```bash
# 確保前後端使用相同的 JWT_SECRET
# 後端
JWT_SECRET=same-secret-key

# 檢查是否正確載入
node -e "console.log(process.env.JWT_SECRET)"
```

### 問題 4: API 請求超時

**錯誤訊息**:
```
Error: timeout of 30000ms exceeded
```

**解決方案**:
```bash
# 前端 .env.local
VITE_API_TIMEOUT=60000  # 增加到 60 秒

# 或檢查後端回應時間
curl -w "@curl-format.txt" http://localhost:8787/api/grids
```

---

## 📚 參考資源

- [Vite 環境變數文件](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js dotenv 套件](https://www.npmjs.com/package/dotenv)
- [OpenTelemetry 配置](https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/)
- [PostgreSQL 連線字串格式](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [JWT 最佳實踐](https://tools.ietf.org/html/rfc8725)

---

## 🔄 更新日誌

| 日期 | 版本 | 變更內容 |
|------|------|---------|
| 2025-10-02 | 1.0.0 | 初始版本，涵蓋前後端所有環境變數 |

---

**維護者**: Shovel Heroes 開發團隊
**最後更新**: 2025-10-02
