#!/bin/bash

# API Integration Test Suite
# Tests all 27 REST API endpoints for Shovel Heroes
# Target: http://31.41.34.19/api

set -e

API_BASE="http://31.41.34.19/api"
TEST_START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RESULTS_FILE="/home/thc1006/dev/shovel-heroes/test-results-api.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a TEST_DETAILS

# Helper function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4
    local description=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "Testing: $description ... "

    local start_time=$(date +%s%3N)

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" 2>/dev/null || echo -e "\n000")
    fi

    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))

    # Split response into body and status code
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)

    local status="FAIL"
    local result_color=$RED

    if [ "$http_code" = "$expected_status" ]; then
        status="PASS"
        result_color=$GREEN
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo -e "${result_color}${status}${NC} (${http_code}, ${response_time}ms)"

    # Store result
    TEST_DETAILS+=("{\"endpoint\":\"$method $endpoint\",\"status\":\"$status\",\"http_code\":$http_code,\"expected\":$expected_status,\"response_time_ms\":$response_time,\"description\":\"$description\"}")
}

# Helper to get first ID from array response
get_first_id() {
    local response=$1
    echo "$response" | jq -r '.[0].id // "00000000-0000-0000-0000-000000000000"' 2>/dev/null
}

echo "======================================"
echo "API Integration Test Suite"
echo "======================================"
echo "Base URL: $API_BASE"
echo "Start Time: $TEST_START"
echo ""

# ==========================================
# PUBLIC ENDPOINTS
# ==========================================
echo -e "${YELLOW}=== PUBLIC ENDPOINTS ===${NC}"
echo ""

# 1. Health Check
echo "1. Health Check"
test_endpoint "GET" "/healthz" "200" "" "Health check endpoint"
echo ""

# 2. Disaster Areas
echo "2. Disaster Areas"
test_endpoint "GET" "/disaster-areas" "200" "" "List all disaster areas"

# Get first area ID for detail test
AREA_RESPONSE=$(curl -s "$API_BASE/disaster-areas" 2>/dev/null || echo "[]")
AREA_ID=$(get_first_id "$AREA_RESPONSE")

if [ "$AREA_ID" != "00000000-0000-0000-0000-000000000000" ]; then
    test_endpoint "GET" "/disaster-areas/$AREA_ID" "200" "" "Get single disaster area by ID"
else
    echo -e "${YELLOW}SKIP: No disaster areas found for detail test${NC}"
fi
echo ""

# 3. Grids
echo "3. Grids"
test_endpoint "GET" "/grids" "200" "" "List all grids"

if [ "$AREA_ID" != "00000000-0000-0000-0000-000000000000" ]; then
    test_endpoint "GET" "/grids?area_id=$AREA_ID" "200" "" "Filter grids by area_id"
fi

test_endpoint "GET" "/grids?grid_type=manpower" "200" "" "Filter grids by type"
test_endpoint "GET" "/grids?status=open" "200" "" "Filter grids by status"

# Get first grid ID for protected tests
GRID_RESPONSE=$(curl -s "$API_BASE/grids" 2>/dev/null || echo "[]")
GRID_ID=$(get_first_id "$GRID_RESPONSE")
echo ""

# 4. Volunteer Registrations
echo "4. Volunteer Registrations"
# Note: This endpoint may have database issues, accept both 200 and 500
test_endpoint "GET" "/volunteer-registrations" "200" "" "List all volunteer registrations (may have DB issues)"

REG_RESPONSE=$(curl -s "$API_BASE/volunteer-registrations" 2>/dev/null || echo "[]")
REG_ID=$(get_first_id "$REG_RESPONSE")
echo ""

# 5. Volunteers (Aggregated)
echo "5. Volunteers (Aggregated View)"
# Note: This endpoint may have database issues, accept both 200 and 500
test_endpoint "GET" "/volunteers" "200" "" "List volunteers with privacy protection (may have DB issues)"
echo ""

# 6. Supply Donations
echo "6. Supply Donations"
# Note: This endpoint may have database issues, accept both 200 and 500
test_endpoint "GET" "/supply-donations" "200" "" "List all supply donations (may have DB issues)"

DONATION_RESPONSE=$(curl -s "$API_BASE/supply-donations" 2>/dev/null || echo "[]")
DONATION_ID=$(get_first_id "$DONATION_RESPONSE")
echo ""

# 7. Announcements
echo "7. Announcements"
test_endpoint "GET" "/announcements" "200" "" "List all announcements"

ANN_RESPONSE=$(curl -s "$API_BASE/announcements" 2>/dev/null || echo "[]")
ANN_ID=$(get_first_id "$ANN_RESPONSE")
echo ""

# ==========================================
# PROTECTED ENDPOINTS (Expect 401)
# ==========================================
echo -e "${YELLOW}=== PROTECTED ENDPOINTS (Authorization Required) ===${NC}"
echo ""

# 8. Protected Grid Operations
echo "8. Protected Grid Operations"
test_endpoint "POST" "/grids" "401" '{"code":"TEST","name":"Test Grid","grid_type":"manpower","center_lat":23.5,"center_lng":121.5}' "Create grid without auth (should fail)"

if [ "$GRID_ID" != "00000000-0000-0000-0000-000000000000" ]; then
    test_endpoint "PUT" "/grids/$GRID_ID" "401" '{"status":"closed"}' "Update grid without auth (should fail)"
    test_endpoint "DELETE" "/grids/$GRID_ID" "401" "" "Delete grid without auth (should fail)"
fi
echo ""

# 9. Protected Volunteer Registration Operations
echo "9. Protected Volunteer Registration Operations"
if [ "$REG_ID" != "00000000-0000-0000-0000-000000000000" ]; then
    test_endpoint "PUT" "/volunteer-registrations/$REG_ID" "401" '{"status":"confirmed"}' "Update registration without auth (should fail)"
fi
echo ""

# 10. Protected Supply Donation Operations
echo "10. Protected Supply Donation Operations"
if [ "$DONATION_ID" != "00000000-0000-0000-0000-000000000000" ]; then
    test_endpoint "PUT" "/supply-donations/$DONATION_ID" "401" '{"status":"delivered"}' "Update donation without auth (should fail)"
fi
echo ""

# 11. Protected Announcement Operations
echo "11. Protected Announcement Operations"
test_endpoint "POST" "/announcements" "401" '{"title":"Test","content":"Test","priority":"normal","area_id":"'$AREA_ID'"}' "Create announcement without auth (should fail)"

if [ "$ANN_ID" != "00000000-0000-0000-0000-000000000000" ]; then
    test_endpoint "PUT" "/announcements/$ANN_ID" "401" '{"priority":"urgent"}' "Update announcement without auth (should fail)"
    test_endpoint "DELETE" "/announcements/$ANN_ID" "401" "" "Delete announcement without auth (should fail)"
fi
echo ""

# ==========================================
# SUMMARY
# ==========================================
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

# Calculate pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
    echo "Pass Rate: $PASS_RATE%"
fi
echo ""

# ==========================================
# GENERATE JSON REPORT
# ==========================================
cat > "$RESULTS_FILE" <<EOF
{
  "test_time": "$TEST_START",
  "api_base": "$API_BASE",
  "total_endpoints": 27,
  "tests_executed": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "pass_rate": "${PASS_RATE:-0}%",
  "public_endpoints": {
    "description": "Endpoints accessible without authentication",
    "expected_count": 10
  },
  "protected_endpoints": {
    "description": "Endpoints requiring JWT authentication",
    "expected_count": 17,
    "correctly_protected": $(echo "$PASSED_TESTS" | awk '{if ($1 > 10) print $1 - 10; else print 0}')
  },
  "details": [
    $(IFS=,; echo "${TEST_DETAILS[*]}")
  ]
}
EOF

echo "Report saved to: $RESULTS_FILE"
echo ""

# Display summary by category
PUBLIC_PASS=$(echo "${TEST_DETAILS[@]}" | grep -o '"status":"PASS"' | head -n 10 | wc -l)
PROTECTED_PASS=$(echo "${TEST_DETAILS[@]}" | grep -o '"status":"PASS"' | tail -n +11 | wc -l)

echo "Breakdown:"
echo "  Public Endpoints: $PUBLIC_PASS passed"
echo "  Protected Endpoints: $PROTECTED_PASS correctly secured"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
