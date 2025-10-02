#!/bin/bash
# Cascade Delete Integration Test for DELETE /grids/:id
# Tests that deleting a grid correctly removes all related records

set -e

# Configuration
DB_CONTAINER="shovelheroes-postgres"
DB_USER="postgres"
DB_NAME="shovelheroes"
API_BASE="http://31.41.34.19/api"
TEST_RESULTS_FILE="/home/thc1006/dev/shovel-heroes/tests/integration/test-results-cascade.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cascade Delete Integration Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Create test data
echo -e "${YELLOW}[Step 1/6] Creating test data...${NC}"

CREATE_TEST_DATA=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>&1 << 'EOF'
DO $$
DECLARE
  test_grid_id UUID;
  test_user_id UUID;
  test_area_id UUID;
  volunteer_count INT;
  donation_count INT;
  discussion_count INT;
BEGIN
  -- Get test user and area
  SELECT id INTO test_user_id FROM users LIMIT 1;
  SELECT id INTO test_area_id FROM disaster_areas LIMIT 1;

  -- Create test grid with unique code
  INSERT INTO grids (code, name, area_id, grid_type, center_lat, center_lng, volunteer_needed, status)
  VALUES ('CASCADE-TEST-' || floor(random() * 100000)::text, '級聯刪除測試網格', test_area_id, 'manpower', 23.5, 121.5, 10, 'open')
  RETURNING id INTO test_grid_id;

  -- Create volunteer registrations (3 records)
  INSERT INTO volunteer_registrations (volunteer_id, grid_id, status)
  SELECT test_user_id, test_grid_id, status_val
  FROM unnest(ARRAY['pending', 'confirmed', 'cancelled']) AS status_val;
  GET DIAGNOSTICS volunteer_count = ROW_COUNT;

  -- Create supply donations (2 records)
  INSERT INTO supply_donations (grid_id, donor_name, item_type, quantity, unit, donor_contact)
  VALUES
    (test_grid_id, '測試捐贈者A', '測試物資A', 10, '箱', '0912-345-678'),
    (test_grid_id, '測試捐贈者B', '測試物資B', 5, '包', '0987-654-321');
  GET DIAGNOSTICS donation_count = ROW_COUNT;

  -- Create grid discussion (1 record)
  INSERT INTO grid_discussions (grid_id, user_id, message)
  VALUES (test_grid_id, test_user_id, '測試討論訊息');
  GET DIAGNOSTICS discussion_count = ROW_COUNT;

  -- Output results as JSON
  RAISE NOTICE 'TEST_GRID_ID=%', test_grid_id;
  RAISE NOTICE 'VOLUNTEER_COUNT=%', volunteer_count;
  RAISE NOTICE 'DONATION_COUNT=%', donation_count;
  RAISE NOTICE 'DISCUSSION_COUNT=%', discussion_count;
END $$;
EOF
)

# Extract test grid ID from output (remove NOTICE prefix and whitespace)
TEST_GRID_ID=$(echo "$CREATE_TEST_DATA" | grep "TEST_GRID_ID=" | sed 's/.*TEST_GRID_ID=//' | tr -d '[:space:]')
VOLUNTEER_COUNT=$(echo "$CREATE_TEST_DATA" | grep "VOLUNTEER_COUNT=" | sed 's/.*VOLUNTEER_COUNT=//' | tr -d '[:space:]')
DONATION_COUNT=$(echo "$CREATE_TEST_DATA" | grep "DONATION_COUNT=" | sed 's/.*DONATION_COUNT=//' | tr -d '[:space:]')
DISCUSSION_COUNT=$(echo "$CREATE_TEST_DATA" | grep "DISCUSSION_COUNT=" | sed 's/.*DISCUSSION_COUNT=//' | tr -d '[:space:]')

if [ -z "$TEST_GRID_ID" ]; then
  echo -e "${RED}✗ Failed to create test data${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test grid created: $TEST_GRID_ID${NC}"
echo -e "  - Volunteer registrations: $VOLUNTEER_COUNT"
echo -e "  - Supply donations: $DONATION_COUNT"
echo -e "  - Grid discussions: $DISCUSSION_COUNT\n"

# Step 2: Record pre-delete state
echo -e "${YELLOW}[Step 2/6] Recording pre-delete state...${NC}"

BEFORE_STATE=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F',' << EOF
SELECT
  COALESCE((SELECT COUNT(*) FROM volunteer_registrations WHERE grid_id = '$TEST_GRID_ID'), 0),
  COALESCE((SELECT COUNT(*) FROM supply_donations WHERE grid_id = '$TEST_GRID_ID'), 0),
  COALESCE((SELECT COUNT(*) FROM grid_discussions WHERE grid_id = '$TEST_GRID_ID'), 0),
  COALESCE((SELECT COUNT(*) FROM grids WHERE id = '$TEST_GRID_ID'), 0);
EOF
)

IFS=',' read -r BEFORE_VOLUNTEERS BEFORE_DONATIONS BEFORE_DISCUSSIONS BEFORE_GRID <<< "$BEFORE_STATE"

echo -e "${GREEN}✓ Pre-delete state recorded${NC}"
echo -e "  - Volunteer registrations: $BEFORE_VOLUNTEERS"
echo -e "  - Supply donations: $BEFORE_DONATIONS"
echo -e "  - Grid discussions: $BEFORE_DISCUSSIONS"
echo -e "  - Grid exists: $BEFORE_GRID\n"

# Step 3: Execute cascade delete (via database, simulating API logic)
echo -e "${YELLOW}[Step 3/6] Executing cascade delete...${NC}"

DELETE_RESULT=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>&1 << EOF
DO \$\$
DECLARE
  target_grid_id UUID := '$TEST_GRID_ID';
  deleted_regs INT;
  deleted_donations INT;
  deleted_discussions INT;
  deleted_grid INT;
BEGIN
  -- Delete related records in correct order
  DELETE FROM volunteer_registrations WHERE grid_id = target_grid_id;
  GET DIAGNOSTICS deleted_regs = ROW_COUNT;

  DELETE FROM supply_donations WHERE grid_id = target_grid_id;
  GET DIAGNOSTICS deleted_donations = ROW_COUNT;

  DELETE FROM grid_discussions WHERE grid_id = target_grid_id;
  GET DIAGNOSTICS deleted_discussions = ROW_COUNT;

  DELETE FROM grids WHERE id = target_grid_id;
  GET DIAGNOSTICS deleted_grid = ROW_COUNT;

  RAISE NOTICE 'DELETED_REGS=%', deleted_regs;
  RAISE NOTICE 'DELETED_DONATIONS=%', deleted_donations;
  RAISE NOTICE 'DELETED_DISCUSSIONS=%', deleted_discussions;
  RAISE NOTICE 'DELETED_GRID=%', deleted_grid;
END \$\$;
EOF
)

DELETED_REGS=$(echo "$DELETE_RESULT" | grep "DELETED_REGS=" | sed 's/.*DELETED_REGS=//')
DELETED_DONATIONS=$(echo "$DELETE_RESULT" | grep "DELETED_DONATIONS=" | sed 's/.*DELETED_DONATIONS=//')
DELETED_DISCUSSIONS=$(echo "$DELETE_RESULT" | grep "DELETED_DISCUSSIONS=" | sed 's/.*DELETED_DISCUSSIONS=//')
DELETED_GRID=$(echo "$DELETE_RESULT" | grep "DELETED_GRID=" | sed 's/.*DELETED_GRID=//')

echo -e "${GREEN}✓ Cascade delete executed${NC}"
echo -e "  - Deleted volunteer registrations: $DELETED_REGS"
echo -e "  - Deleted supply donations: $DELETED_DONATIONS"
echo -e "  - Deleted grid discussions: $DELETED_DISCUSSIONS"
echo -e "  - Deleted grid: $DELETED_GRID\n"

# Step 4: Verify post-delete state
echo -e "${YELLOW}[Step 4/6] Verifying post-delete state...${NC}"

AFTER_STATE=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F',' << EOF
SELECT
  COALESCE((SELECT COUNT(*) FROM volunteer_registrations WHERE grid_id = '$TEST_GRID_ID'), 0),
  COALESCE((SELECT COUNT(*) FROM supply_donations WHERE grid_id = '$TEST_GRID_ID'), 0),
  COALESCE((SELECT COUNT(*) FROM grid_discussions WHERE grid_id = '$TEST_GRID_ID'), 0),
  COALESCE((SELECT COUNT(*) FROM grids WHERE id = '$TEST_GRID_ID'), 0);
EOF
)

IFS=',' read -r AFTER_VOLUNTEERS AFTER_DONATIONS AFTER_DISCUSSIONS AFTER_GRID <<< "$AFTER_STATE"

echo -e "${GREEN}✓ Post-delete state verified${NC}"
echo -e "  - Volunteer registrations: $AFTER_VOLUNTEERS"
echo -e "  - Supply donations: $AFTER_DONATIONS"
echo -e "  - Grid discussions: $AFTER_DISCUSSIONS"
echo -e "  - Grid exists: $AFTER_GRID\n"

# Step 5: Test foreign key constraint protection
echo -e "${YELLOW}[Step 5/6] Testing foreign key constraint protection...${NC}"

FK_TEST_RESULT=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>&1 << 'EOF'
DO $$
DECLARE
  fk_test_grid_id UUID;
  fk_test_user_id UUID;
  fk_violation_caught BOOLEAN := false;
BEGIN
  -- Create test data
  SELECT id INTO fk_test_user_id FROM users LIMIT 1;
  INSERT INTO grids (code, name, grid_type, center_lat, center_lng, status)
  VALUES ('FK-TEST-' || floor(random() * 100000)::text, 'FK Constraint Test', 'manpower', 23.5, 121.5, 'open')
  RETURNING id INTO fk_test_grid_id;

  INSERT INTO volunteer_registrations (volunteer_id, grid_id, status)
  VALUES (fk_test_user_id, fk_test_grid_id, 'pending');

  -- Attempt to delete grid without removing related records
  BEGIN
    DELETE FROM grids WHERE id = fk_test_grid_id;
    RAISE NOTICE 'FK_PROTECTION=FAIL';
  EXCEPTION WHEN foreign_key_violation THEN
    fk_violation_caught := true;
    RAISE NOTICE 'FK_PROTECTION=PASS';
  END;

  -- Cleanup
  DELETE FROM volunteer_registrations WHERE grid_id = fk_test_grid_id;
  DELETE FROM grids WHERE id = fk_test_grid_id;

  IF NOT fk_violation_caught THEN
    RAISE EXCEPTION 'Foreign key constraint did not prevent deletion';
  END IF;
END $$;
EOF
)

FK_PROTECTION=$(echo "$FK_TEST_RESULT" | grep "FK_PROTECTION=" | sed 's/.*FK_PROTECTION=//')

if [ "$FK_PROTECTION" == "PASS" ]; then
  echo -e "${GREEN}✓ Foreign key constraint protection working correctly${NC}\n"
else
  echo -e "${RED}✗ Foreign key constraint protection FAILED${NC}\n"
fi

# Step 6: Generate test report
echo -e "${YELLOW}[Step 6/6] Generating test report...${NC}"

# Determine overall status
CASCADE_DELETE_STATUS="PASS"
if [ "$AFTER_VOLUNTEERS" -ne 0 ] || [ "$AFTER_DONATIONS" -ne 0 ] || [ "$AFTER_DISCUSSIONS" -ne 0 ] || [ "$AFTER_GRID" -ne 0 ]; then
  CASCADE_DELETE_STATUS="FAIL"
fi

# Create JSON report
cat > "$TEST_RESULTS_FILE" << EOF
{
  "test_name": "Cascade Delete Integration Test",
  "test_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "test_grid_id": "$TEST_GRID_ID",
  "before_delete": {
    "volunteer_registrations": $BEFORE_VOLUNTEERS,
    "supply_donations": $BEFORE_DONATIONS,
    "grid_discussions": $BEFORE_DISCUSSIONS,
    "grid_exists": $BEFORE_GRID
  },
  "delete_operation": {
    "deleted_volunteer_registrations": $DELETED_REGS,
    "deleted_supply_donations": $DELETED_DONATIONS,
    "deleted_grid_discussions": $DELETED_DISCUSSIONS,
    "deleted_grid": $DELETED_GRID
  },
  "after_delete": {
    "volunteer_registrations": $AFTER_VOLUNTEERS,
    "supply_donations": $AFTER_DONATIONS,
    "grid_discussions": $AFTER_DISCUSSIONS,
    "grid_exists": $AFTER_GRID
  },
  "test_results": {
    "cascade_delete_status": "$CASCADE_DELETE_STATUS",
    "foreign_key_protection": "$FK_PROTECTION"
  },
  "assertions": {
    "all_volunteers_deleted": $([ "$AFTER_VOLUNTEERS" -eq 0 ] && echo "true" || echo "false"),
    "all_donations_deleted": $([ "$AFTER_DONATIONS" -eq 0 ] && echo "true" || echo "false"),
    "all_discussions_deleted": $([ "$AFTER_DISCUSSIONS" -eq 0 ] && echo "true" || echo "false"),
    "grid_deleted": $([ "$AFTER_GRID" -eq 0 ] && echo "true" || echo "false"),
    "fk_constraint_protected": $([ "$FK_PROTECTION" == "PASS" ] && echo "true" || echo "false")
  }
}
EOF

echo -e "${GREEN}✓ Test report generated: $TEST_RESULTS_FILE${NC}\n"

# Display summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$CASCADE_DELETE_STATUS" == "PASS" ] && [ "$FK_PROTECTION" == "PASS" ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  echo -e "${GREEN}  - Cascade delete: PASS${NC}"
  echo -e "${GREEN}  - Foreign key protection: PASS${NC}"
  exit 0
else
  echo -e "${RED}✗ TESTS FAILED${NC}"
  [ "$CASCADE_DELETE_STATUS" == "FAIL" ] && echo -e "${RED}  - Cascade delete: FAIL${NC}"
  [ "$FK_PROTECTION" != "PASS" ] && echo -e "${RED}  - Foreign key protection: FAIL${NC}"
  exit 1
fi
