#!/bin/bash

# Manual cURL Integration Test Script
# Use this for quick manual testing of API endpoints

API_BASE="http://31.41.34.19/api"
JWT_TOKEN="${JWT_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_header() {
  echo -e "\n${YELLOW}=========================================${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${YELLOW}=========================================${NC}\n"
}

function print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

function print_error() {
  echo -e "${RED}✗ $1${NC}"
}

function check_token() {
  if [ -z "$JWT_TOKEN" ]; then
    print_error "JWT_TOKEN environment variable is not set"
    echo "Please set it with: export JWT_TOKEN='your_token_here'"
    echo "Or login to get a token first"
    exit 1
  fi
}

# Test 1: Grids CRUD
print_header "Test 1: Grids - CREATE (POST /grids)"
check_token

GRID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/grids" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "code": "TEST-GRID-'"$(date +%s)"'",
    "name": "測試網格",
    "grid_type": "manpower",
    "center_lat": 23.5,
    "center_lng": 121.5,
    "volunteer_needed": 10,
    "bounds": {
      "north": 23.51,
      "south": 23.49,
      "east": 121.51,
      "west": 121.49
    },
    "meeting_point": "測試集合點",
    "status": "open"
  }')

HTTP_CODE=$(echo "$GRID_RESPONSE" | tail -n1)
GRID_BODY=$(echo "$GRID_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  print_success "Grid created successfully"
  GRID_ID=$(echo "$GRID_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "Grid ID: $GRID_ID"
  echo "$GRID_BODY" | jq '.' 2>/dev/null || echo "$GRID_BODY"
else
  print_error "Failed to create grid (HTTP $HTTP_CODE)"
  echo "$GRID_BODY"
  exit 1
fi

# Test 2: Grids - READ (GET /grids)
print_header "Test 2: Grids - LIST (GET /grids)"

LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/grids")
HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
LIST_BODY=$(echo "$LIST_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  print_success "Grid list retrieved successfully"
  echo "$LIST_BODY" | jq '.[0:2]' 2>/dev/null || echo "$LIST_BODY"
else
  print_error "Failed to list grids (HTTP $HTTP_CODE)"
  echo "$LIST_BODY"
fi

# Test 3: Grids - UPDATE (PUT /grids/:id)
print_header "Test 3: Grids - UPDATE (PUT /grids/$GRID_ID)"

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/grids/$GRID_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "status": "closed",
    "volunteer_needed": 15
  }')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  print_success "Grid updated successfully"
  echo "$UPDATE_BODY" | jq '.' 2>/dev/null || echo "$UPDATE_BODY"
else
  print_error "Failed to update grid (HTTP $HTTP_CODE)"
  echo "$UPDATE_BODY"
fi

# Test 4: Volunteer Registration - CREATE
print_header "Test 4: Volunteer Registration - CREATE (POST /volunteer-registrations)"

# Note: You need to replace USER_ID with an actual user ID
if [ -z "$TEST_USER_ID" ]; then
  print_error "TEST_USER_ID not set. Skipping volunteer registration tests."
else
  REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/volunteer-registrations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{
      "grid_id": "'"$GRID_ID"'",
      "user_id": "'"$TEST_USER_ID"'"
    }')

  HTTP_CODE=$(echo "$REG_RESPONSE" | tail -n1)
  REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -eq 201 ]; then
    print_success "Volunteer registration created successfully"
    REG_ID=$(echo "$REG_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "Registration ID: $REG_ID"
    echo "$REG_BODY" | jq '.' 2>/dev/null || echo "$REG_BODY"

    # Test 5: Volunteer Registration - UPDATE
    print_header "Test 5: Volunteer Registration - UPDATE (PUT /volunteer-registrations/$REG_ID)"

    REG_UPDATE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/volunteer-registrations/$REG_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -d '{"status": "confirmed"}')

    HTTP_CODE=$(echo "$REG_UPDATE" | tail -n1)
    UPDATE_BODY=$(echo "$REG_UPDATE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
      print_success "Volunteer registration updated successfully"
      echo "$UPDATE_BODY" | jq '.' 2>/dev/null || echo "$UPDATE_BODY"
    else
      print_error "Failed to update registration (HTTP $HTTP_CODE)"
      echo "$UPDATE_BODY"
    fi
  else
    print_error "Failed to create volunteer registration (HTTP $HTTP_CODE)"
    echo "$REG_BODY"
  fi
fi

# Test 6: Supply Donations - CREATE
print_header "Test 6: Supply Donations - CREATE (POST /supply-donations)"

SUPPLY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/supply-donations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "grid_id": "'"$GRID_ID"'",
    "name": "飲用水",
    "quantity": 100,
    "unit": "箱",
    "donor_contact": "test@example.com"
  }')

HTTP_CODE=$(echo "$SUPPLY_RESPONSE" | tail -n1)
SUPPLY_BODY=$(echo "$SUPPLY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  print_success "Supply donation created successfully"
  SUPPLY_ID=$(echo "$SUPPLY_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "Supply ID: $SUPPLY_ID"
  echo "$SUPPLY_BODY" | jq '.' 2>/dev/null || echo "$SUPPLY_BODY"

  # Test 7: Supply Donations - UPDATE
  print_header "Test 7: Supply Donations - UPDATE (PUT /supply-donations/$SUPPLY_ID)"

  SUPPLY_UPDATE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/supply-donations/$SUPPLY_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{"status": "delivered"}')

  HTTP_CODE=$(echo "$SUPPLY_UPDATE" | tail -n1)
  UPDATE_BODY=$(echo "$SUPPLY_UPDATE" | sed '$d')

  if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Supply donation updated successfully"
    echo "$UPDATE_BODY" | jq '.' 2>/dev/null || echo "$UPDATE_BODY"
  else
    print_error "Failed to update supply donation (HTTP $HTTP_CODE)"
    echo "$UPDATE_BODY"
  fi
else
  print_error "Failed to create supply donation (HTTP $HTTP_CODE)"
  echo "$SUPPLY_BODY"
fi

# Test 8: Announcements - CREATE
print_header "Test 8: Announcements - CREATE (POST /announcements)"

ANNOUNCEMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/announcements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "title": "測試公告",
    "content": "這是一個測試公告內容",
    "priority": "normal",
    "published": true
  }')

HTTP_CODE=$(echo "$ANNOUNCEMENT_RESPONSE" | tail -n1)
ANNOUNCEMENT_BODY=$(echo "$ANNOUNCEMENT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  print_success "Announcement created successfully"
  ANNOUNCEMENT_ID=$(echo "$ANNOUNCEMENT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "Announcement ID: $ANNOUNCEMENT_ID"
  echo "$ANNOUNCEMENT_BODY" | jq '.' 2>/dev/null || echo "$ANNOUNCEMENT_BODY"

  # Test 9: Announcements - UPDATE
  print_header "Test 9: Announcements - UPDATE (PUT /announcements/$ANNOUNCEMENT_ID)"

  ANN_UPDATE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/announcements/$ANNOUNCEMENT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{
      "title": "更新後的公告",
      "priority": "high"
    }')

  HTTP_CODE=$(echo "$ANN_UPDATE" | tail -n1)
  UPDATE_BODY=$(echo "$ANN_UPDATE" | sed '$d')

  if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Announcement updated successfully"
    echo "$UPDATE_BODY" | jq '.' 2>/dev/null || echo "$UPDATE_BODY"
  else
    print_error "Failed to update announcement (HTTP $HTTP_CODE)"
    echo "$UPDATE_BODY"
  fi
else
  print_error "Failed to create announcement (HTTP $HTTP_CODE)"
  echo "$ANNOUNCEMENT_BODY"
fi

# Summary
print_header "Test Summary"
echo "Grid ID: $GRID_ID"
echo "Supply Donation ID: ${SUPPLY_ID:-N/A}"
echo "Announcement ID: ${ANNOUNCEMENT_ID:-N/A}"
echo "Volunteer Registration ID: ${REG_ID:-N/A}"
echo ""
echo "Note: Remember to clean up test data manually if needed"
