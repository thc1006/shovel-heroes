#!/bin/bash
# Quick test runner for API endpoint tests

echo "🧪 Running API Endpoint Tests..."
echo "================================"
echo ""

echo "📋 Test Summary:"
echo "  - DisasterArea: 19 test cases"
echo "  - Grid: 29 test cases"
echo "  - Total: 48 test cases"
echo ""

echo "🚀 Running tests..."
echo ""

# Run tests with vitest
npm test tests/api/endpoints/disaster-areas.test.js tests/api/endpoints/grids.test.js

echo ""
echo "✅ Test execution complete!"
