#!/bin/bash

# 環境變數驗證腳本
# 用途：檢查必要的環境變數是否正確設定

set -e

echo "🔍 Shovel Heroes 環境變數驗證工具"
echo "=================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 驗證結果
ERRORS=0
WARNINGS=0

# 檢查函數
check_required() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name: 未設定（必要）"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name: 已設定"
        return 0
    fi
}

check_optional() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}○${NC} $var_name: 未設定（選用）"
    else
        echo -e "${GREEN}✓${NC} $var_name: 已設定"
    fi
}

check_length() {
    local var_name=$1
    local min_length=$2
    local var_value="${!var_name}"

    if [ -n "$var_value" ] && [ ${#var_value} -lt $min_length ]; then
        echo -e "${YELLOW}⚠${NC} $var_name: 長度不足（建議至少 $min_length 字元）"
        ((WARNINGS++))
    fi
}

check_url_format() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -n "$var_value" ]; then
        if [[ ! "$var_value" =~ ^https?:// ]]; then
            echo -e "${YELLOW}⚠${NC} $var_name: URL 格式可能不正確"
            ((WARNINGS++))
        fi
    fi
}

# 檢查前端環境變數
echo "📱 前端環境變數檢查"
echo "-------------------"

# 載入前端 .env
if [ -f ".env.local" ]; then
    source .env.local
    echo "載入: .env.local"
elif [ -f ".env" ]; then
    source .env
    echo "載入: .env"
else
    echo -e "${RED}錯誤: 找不到 .env.local 或 .env 檔案${NC}"
    echo "請執行: cp .env.example.local .env.local"
    exit 1
fi

echo ""
check_required "VITE_USE_FRONTEND"

if [ "$VITE_USE_FRONTEND" = "false" ]; then
    check_required "VITE_API_BASE"
    check_url_format "VITE_API_BASE"
    check_optional "VITE_API_TIMEOUT"
fi

check_optional "GITHUB_PAGES"
check_optional "VITE_ENABLE_API_LOGGING"

echo ""
echo "📡 後端環境變數檢查"
echo "-------------------"

# 載入後端 .env
if [ -f "packages/backend/.env" ]; then
    source packages/backend/.env
    echo "載入: packages/backend/.env"
elif [ -f "packages/backend/.env.local" ]; then
    source packages/backend/.env.local
    echo "載入: packages/backend/.env.local"
else
    echo -e "${YELLOW}警告: 找不到後端 .env 檔案${NC}"
    echo "如需啟動後端，請執行: cp packages/backend/.env.example packages/backend/.env"
    echo ""
fi

if [ -f "packages/backend/.env" ] || [ -f "packages/backend/.env.local" ]; then
    echo ""
    check_required "DATABASE_URL"
    check_required "PORT"
    check_required "NODE_ENV"

    echo ""
    echo "🔐 JWT 配置檢查"
    check_required "JWT_SECRET"
    check_length "JWT_SECRET" 32

    if [ "$JWT_SECRET" = "your-super-secret-jwt-key-please-change-me-in-production" ]; then
        echo -e "${RED}⚠${NC} JWT_SECRET: 仍使用預設值，請務必更換！"
        ((WARNINGS++))
    fi

    echo ""
    echo "🌐 CORS 配置檢查"
    check_required "CORS_ORIGIN"

    echo ""
    echo "📝 日誌配置檢查"
    check_optional "LOG_LEVEL"
    check_optional "LOG_PRETTY"

    echo ""
    echo "📧 Email 配置檢查"
    check_optional "SMTP_HOST"
    check_optional "SMTP_PORT"
    check_optional "EMAIL_FROM"
fi

# 生產環境特殊檢查
if [ "$NODE_ENV" = "production" ]; then
    echo ""
    echo "🏭 生產環境安全檢查"
    echo "-------------------"

    if [ "$DEBUG_ENDPOINTS" = "true" ]; then
        echo -e "${RED}⚠${NC} DEBUG_ENDPOINTS: 生產環境應關閉"
        ((ERRORS++))
    fi

    if [ "$LOG_LEVEL" = "debug" ] || [ "$LOG_LEVEL" = "trace" ]; then
        echo -e "${YELLOW}⚠${NC} LOG_LEVEL: 生產環境建議使用 info 或更高級別"
        ((WARNINGS++))
    fi

    if [ "$LOG_PRETTY" = "true" ]; then
        echo -e "${YELLOW}⚠${NC} LOG_PRETTY: 生產環境建議使用 JSON 格式（設為 false）"
        ((WARNINGS++))
    fi
fi

# 檢查敏感檔案是否被 Git 追蹤
echo ""
echo "🔒 Git 安全檢查"
echo "---------------"

if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}✗ .env 檔案被 Git 追蹤！請立即移除${NC}"
    echo "  執行: git rm --cached .env"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} .env 未被 Git 追蹤"
fi

if git ls-files | grep -q "packages/backend/\.env$"; then
    echo -e "${RED}✗ packages/backend/.env 被 Git 追蹤！請立即移除${NC}"
    echo "  執行: git rm --cached packages/backend/.env"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} packages/backend/.env 未被 Git 追蹤"
fi

# 總結
echo ""
echo "=================================="
echo "📊 驗證結果"
echo "=================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有檢查通過！環境配置正確${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ 發現 $WARNINGS 個警告，建議修正${NC}"
    exit 0
else
    echo -e "${RED}✗ 發現 $ERRORS 個錯誤和 $WARNINGS 個警告${NC}"
    echo ""
    echo "請修正錯誤後再啟動服務"
    exit 1
fi
