#!/bin/bash

# Quick API Integration Test
# Tests all endpoints and generates JSON report

API_BASE="http://31.41.34.19/api"
TEST_START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RESULTS_FILE="/home/thc1006/dev/shovel-heroes/test-results-api.json"

# Test counters
TOTAL=0
PASSED=0
FAILED=0

# Results array
RESULTS="["

test_api() {
    local method=$1
    local endpoint=$2
    local expect=$3
    local data=$4
    local desc=$5

    TOTAL=$((TOTAL + 1))

    local start=$(date +%s%3N)

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" --max-time 5 \
            "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" --max-time 5 \
            "$API_BASE$endpoint" 2>/dev/null || echo -e "\n000")
    fi

    local end=$(date +%s%3N)
    local time=$((end - start))

    local code=$(echo "$response" | tail -n 1)
    local status="FAIL"

    if [ "$code" = "$expect" ]; then
        status="PASS"
        PASSED=$((PASSED + 1))
    else
        FAILED=$((FAILED + 1))
    fi

    [ "$RESULTS" != "[" ] && RESULTS="$RESULTS,"
    RESULTS="$RESULTS{\"endpoint\":\"$method $endpoint\",\"status\":\"$status\",\"http_code\":$code,\"expected\":$expect,\"response_time_ms\":$time,\"description\":\"$desc\"}"

    echo "[$status] $method $endpoint ($code, ${time}ms) - $desc"
}

echo "Testing API endpoints at $API_BASE"
echo "================================================"

# Public endpoints
test_api "GET" "/healthz" "200" "" "Health check"
test_api "GET" "/disaster-areas" "200" "" "List disaster areas"
test_api "GET" "/grids" "200" "" "List grids"
test_api "GET" "/grids?grid_type=manpower" "200" "" "Filter grids by type"
test_api "GET" "/grids?status=open" "200" "" "Filter grids by status"
test_api "GET" "/volunteer-registrations" "200" "" "List volunteer registrations"
test_api "GET" "/volunteers" "200" "" "List volunteers (aggregated)"
test_api "GET" "/supply-donations" "200" "" "List supply donations"
test_api "GET" "/announcements" "200" "" "List announcements"

# Get sample IDs for detail tests
AREA_ID=$(curl -s --max-time 5 "$API_BASE/disaster-areas" 2>/dev/null | jq -r '.[0].id // "null"')
GRID_ID=$(curl -s --max-time 5 "$API_BASE/grids" 2>/dev/null | jq -r '.[0].id // "null"')
ANN_ID=$(curl -s --max-time 5 "$API_BASE/announcements" 2>/dev/null | jq -r '.[0].id // "null"')

if [ "$AREA_ID" != "null" ]; then
    test_api "GET" "/disaster-areas/$AREA_ID" "200" "" "Get single disaster area"
    test_api "GET" "/grids?area_id=$AREA_ID" "200" "" "Filter grids by area"
fi

# Protected endpoints (expect 401)
test_api "POST" "/grids" "401" '{"code":"TEST","name":"Test","grid_type":"manpower","center_lat":23.5,"center_lng":121.5}' "Create grid (no auth)"

if [ "$GRID_ID" != "null" ]; then
    test_api "PUT" "/grids/$GRID_ID" "401" '{"status":"closed"}' "Update grid (no auth)"
    test_api "DELETE" "/grids/$GRID_ID" "401" "" "Delete grid (no auth)"
fi

test_api "POST" "/announcements" "401" '{"title":"Test","content":"Test","priority":"normal"}' "Create announcement (no auth)"

if [ "$ANN_ID" != "null" ]; then
    test_api "PUT" "/announcements/$ANN_ID" "401" '{"priority":"urgent"}' "Update announcement (no auth)"
    test_api "DELETE" "/announcements/$ANN_ID" "401" "" "Delete announcement (no auth)"
fi

# Sample protected volunteer/donation endpoints
test_api "PUT" "/volunteer-registrations/00000000-0000-0000-0000-000000000000" "401" '{"status":"confirmed"}' "Update registration (no auth)"
test_api "PUT" "/supply-donations/00000000-0000-0000-0000-000000000000" "401" '{"status":"delivered"}' "Update donation (no auth)"

RESULTS="$RESULTS]"

# Calculate metrics
PUBLIC_TESTS=12
PROTECTED_TESTS=$((TOTAL - PUBLIC_TESTS))
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")

# Generate JSON report
cat > "$RESULTS_FILE" <<EOF
{
  "test_time": "$TEST_START",
  "api_base": "$API_BASE",
  "total_endpoints": 27,
  "tests_executed": $TOTAL,
  "passed": $PASSED,
  "failed": $FAILED,
  "pass_rate": "$PASS_RATE%",
  "public_endpoints": {
    "description": "Endpoints accessible without authentication",
    "tested": $PUBLIC_TESTS
  },
  "protected_endpoints": {
    "description": "Endpoints requiring JWT authentication",
    "tested": $PROTECTED_TESTS
  },
  "details": $RESULTS
}
EOF

echo ""
echo "================================================"
echo "SUMMARY"
echo "================================================"
echo "Total Tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Pass Rate: $PASS_RATE%"
echo ""
echo "Report saved to: $RESULTS_FILE"

[ $FAILED -eq 0 ] && exit 0 || exit 1
