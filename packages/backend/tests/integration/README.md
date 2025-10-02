# Integration Tests

This directory contains comprehensive integration tests for the Shovel Heroes API.

## Quick Start

```bash
# Run automated tests
npm run test -- tests/integration/api.test.ts

# Or use the test script
./tests/integration/run-tests.sh

# For manual testing with cURL
export JWT_TOKEN="your_token"
./tests/integration/manual-curl-tests.sh
```

## Files

- `api.test.ts` - Main Vitest integration test suite
- `run-tests.sh` - Automated test runner script
- `manual-curl-tests.sh` - Manual cURL testing script
- `TEST_REPORT.md` - Detailed test documentation and results
- `README.md` - This file

## Prerequisites

1. PostgreSQL database running
2. Environment variables configured (`.env` file)
3. Database migrations applied
4. Valid JWT token for manual tests

## Test Coverage

- Grids CRUD (POST, GET, PUT, DELETE)
- Volunteer Registrations (POST, GET, PUT, DELETE)
- Supply Donations CRUD (POST, GET, PUT, DELETE)
- Announcements CRUD (POST, GET, PUT, DELETE)
- Database triggers (volunteer_registered counter)
- Authentication and authorization
- RLS policies

## Environment Setup

Required environment variables:
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your_secret_key
NODE_ENV=test
```

See `TEST_REPORT.md` for detailed test documentation.
