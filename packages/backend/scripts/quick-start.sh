#!/bin/bash
# Shovel Heroes Backend 快速啟動腳本
# 一鍵啟動完整的本地開發環境

set -e

echo "🚀 Shovel Heroes Backend 快速啟動"
echo "================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 檢查並啟動 Docker 服務
echo "📦 步驟 1/5: 啟動 Docker 服務"
echo "----------------------------"
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker 未運行，請先啟動 Docker${NC}"
    exit 1
fi

cd /home/thc1006/dev/shovel-heroes

if ! docker ps | grep -q shovelheroes-postgres; then
    echo "啟動 PostgreSQL 容器..."
    docker compose up -d db
    echo "等待 PostgreSQL 啟動完成..."
    sleep 5

    # 等待健康檢查通過
    for i in {1..30}; do
        if docker exec shovelheroes-postgres pg_isready -U postgres &> /dev/null; then
            echo -e "${GREEN}✓ PostgreSQL 已就緒${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
else
    echo -e "${GREEN}✓ PostgreSQL 已經在運行${NC}"
fi
echo ""

# 2. 安裝依賴
echo "📦 步驟 2/5: 檢查 npm 依賴"
echo "------------------------"
cd packages/backend
if [ ! -d node_modules ]; then
    echo "安裝 npm 依賴..."
    npm install
else
    echo -e "${GREEN}✓ 依賴已安裝${NC}"
fi
echo ""

# 3. 檢查環境變數
echo "🔧 步驟 3/5: 驗證環境配置"
echo "----------------------"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，請創建${NC}"
    exit 1
fi
source .env
echo -e "${GREEN}✓ 環境變數已載入${NC}"
echo ""

# 4. 執行資料庫遷移
echo "🗄️  步驟 4/5: 資料庫遷移"
echo "--------------------"
if [ "$1" != "--skip-migrate" ]; then
    echo "執行資料庫遷移..."
    npm run migrate:up || echo "遷移可能已經執行過"
else
    echo "跳過資料庫遷移（使用 --skip-migrate）"
fi
echo ""

# 5. 編譯 TypeScript
echo "🔨 步驟 5/5: 編譯 TypeScript"
echo "-------------------------"
npm run build
echo -e "${GREEN}✓ 編譯完成${NC}"
echo ""

# 啟動提示
echo -e "${GREEN}✅ 環境準備完成！${NC}"
echo ""
echo "🎯 啟動開發伺服器："
echo "  npm run dev"
echo ""
echo "📝 其他可用命令："
echo "  npm run test          - 執行測試"
echo "  npm run migrate:up    - 資料庫遷移"
echo "  npm run migrate:down  - 回滾遷移"
echo "  npm run lint          - TypeScript 型別檢查"
echo ""
echo "🔍 測試 API："
echo "  curl http://localhost:${PORT:-8787}/healthz"
echo "  curl http://localhost:${PORT:-8787}/"
echo ""
