#!/bin/bash
# Shovel Heroes Backend 本地測試腳本
# 用於快速驗證後端環境配置

set -e

echo "🚀 Shovel Heroes Backend 本地測試環境驗證"
echo "==========================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數
PASSED=0
FAILED=0

# 測試函數
test_step() {
    local name=$1
    local command=$2

    echo -n "⏳ 測試: $name ... "
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# 1. 檢查 Node.js 版本
echo "📦 環境檢查"
echo "----------"
test_step "Node.js 已安裝 (>= 18)" "node --version | grep -E 'v(1[8-9]|[2-9][0-9])'"

# 2. 檢查 npm 依賴
test_step "npm 依賴完整安裝" "[ -d node_modules ]"

# 3. 檢查 .env 文件
test_step ".env 文件存在" "[ -f .env ]"

# 4. 檢查環境變數
if [ -f .env ]; then
    source .env
    test_step "DATABASE_URL 已設定" "[ -n \"$DATABASE_URL\" ]"
    test_step "JWT_SECRET 已設定" "[ -n \"$JWT_SECRET\" ]"
    test_step "PORT 已設定" "[ -n \"$PORT\" ]"
fi

# 5. 檢查 PostgreSQL 連線
echo ""
echo "🗄️  資料庫檢查"
echo "----------"
test_step "PostgreSQL 容器運行中" "docker ps | grep -q shovelheroes-postgres"

if docker ps | grep -q shovelheroes-postgres; then
    test_step "PostgreSQL 可連線" "docker exec shovelheroes-postgres pg_isready -U postgres"
    test_step "資料庫 'shovelheroes' 存在" "docker exec shovelheroes-postgres psql -U postgres -lqt | grep -qw shovelheroes"
else
    echo -e "${YELLOW}⚠️  PostgreSQL 容器未運行，執行: docker compose up -d db${NC}"
fi

# 6. TypeScript 編譯測試
echo ""
echo "🔨 TypeScript 編譯測試"
echo "--------------------"
test_step "TypeScript 編譯成功" "npm run build"

# 7. 檢查編譯輸出
if [ -d dist ]; then
    test_step "dist/index.js 已生成" "[ -f dist/index.js ]"
    test_step "dist/lib/db.js 已生成" "[ -f dist/lib/db.js ]"
    test_step "dist/lib/env.js 已生成" "[ -f dist/lib/env.js ]"
fi

# 8. 檢查路由文件
echo ""
echo "🛣️  路由文件檢查"
echo "-------------"
test_step "健康檢查路由存在" "[ -f src/routes/healthz.ts ]"
test_step "網格路由存在" "[ -f src/routes/grids.ts ]"
test_step "使用者路由存在" "[ -f src/routes/users.ts ]"

# 總結報告
echo ""
echo "📊 測試總結"
echo "=========="
echo -e "通過: ${GREEN}$PASSED${NC}"
echo -e "失敗: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有測試通過！環境配置正確。${NC}"
    echo ""
    echo "🎯 下一步操作："
    echo "  1. 啟動 PostgreSQL: docker compose up -d db"
    echo "  2. 運行資料庫遷移: npm run migrate:up"
    echo "  3. 啟動開發伺服器: npm run dev"
    echo "  4. 測試健康檢查: curl http://localhost:8787/healthz"
    exit 0
else
    echo -e "${RED}❌ 有 $FAILED 個測試失敗，請檢查上方錯誤。${NC}"
    exit 1
fi
