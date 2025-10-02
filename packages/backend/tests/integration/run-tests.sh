#!/bin/bash

# Integration Test Runner Script
# This script runs comprehensive API integration tests

set -e

echo "========================================="
echo "Starting API Integration Tests"
echo "========================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
required_vars=("DATABASE_URL" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: Required environment variable $var is not set"
    exit 1
  fi
done

echo "Environment variables loaded successfully"
echo ""

# Run database migrations to ensure schema is up to date
echo "Running database migrations..."
npm run migrate:up || true
echo ""

# Run integration tests with coverage
echo "Running integration tests..."
npm run test -- tests/integration/api.test.ts --reporter=verbose

TEST_EXIT_CODE=$?

echo ""
echo "========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✓ All tests passed successfully!"
else
  echo "✗ Some tests failed. Please review the output above."
fi
echo "========================================="

exit $TEST_EXIT_CODE
