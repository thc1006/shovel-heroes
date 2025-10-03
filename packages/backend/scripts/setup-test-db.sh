#!/bin/bash
set -e

# Database connection details
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"
TEST_DB_NAME="${TEST_DB_NAME:-shovelheroes_test}"

echo "Setting up test database..."

# Drop and recreate test database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" postgres 2>/dev/null || true
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $TEST_DB_NAME;" postgres

echo "Test database created. Running migrations..."

# Run migrations on test database
export DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$TEST_DB_NAME"
npm run migrate:up

echo "Test database setup complete!"
