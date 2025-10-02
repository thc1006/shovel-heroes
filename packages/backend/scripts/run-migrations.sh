#!/bin/bash
# Migration runner script for Shovel Heroes database
# This script runs all migrations in order and verifies the schema

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_NAME="${DB_NAME:-shovel_heroes}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
INCLUDE_SEED="${INCLUDE_SEED:-false}"

echo -e "${GREEN}=== Shovel Heroes Database Migration ===${NC}"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo "Include seed data: $INCLUDE_SEED"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    exit 1
fi

# Check database connection
echo -e "${YELLOW}Checking database connection...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo "Please check your database credentials and ensure PostgreSQL is running"
    exit 1
fi
echo -e "${GREEN}✓ Database connection OK${NC}"
echo ""

# Create database if it doesn't exist
echo -e "${YELLOW}Checking if database exists...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}Creating database $DB_NAME...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database exists${NC}"
fi
echo ""

# Run migrations
MIGRATIONS_DIR="$(dirname "$0")/../migrations"
cd "$MIGRATIONS_DIR"

echo -e "${YELLOW}Running migrations...${NC}"

# Migration files in order
MIGRATIONS=(
    "0001_init.sql"
    "0002_rls.sql"
    "0003_audit.sql"
    "0004_complete_schema.sql"
    "0005_rls_policies.sql"
)

# Add seed data if requested
if [ "$INCLUDE_SEED" = "true" ]; then
    MIGRATIONS+=("0006_test_seed.sql")
fi

# Add audit triggers last
MIGRATIONS+=("0007_audit_triggers.sql")

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    echo -e "${YELLOW}Running $migration...${NC}"
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $migration completed${NC}"
    else
        echo -e "${RED}✗ $migration failed${NC}"
        echo "Check the error messages above for details"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}=== All migrations completed successfully ===${NC}"
echo ""

# Run verification script
echo -e "${YELLOW}Running schema verification...${NC}"
VERIFY_SCRIPT="$(dirname "$0")/verify-schema.sql"
if [ -f "$VERIFY_SCRIPT" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$VERIFY_SCRIPT"
else
    echo -e "${YELLOW}Warning: Verification script not found at $VERIFY_SCRIPT${NC}"
fi

echo ""
echo -e "${GREEN}=== Database setup complete ===${NC}"
echo ""
echo "You can now:"
echo "  - Connect to database: psql -U $DB_USER -d $DB_NAME"
echo "  - Start backend server: npm run dev"
echo "  - Run tests: npm test"
echo ""
