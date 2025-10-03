#!/bin/bash
set -e

export PGPASSWORD="postgres"
DB_NAME="shovelheroes_test"

echo "Applying migrations to $DB_NAME..."

for file in /home/thc1006/dev/shovel-heroes/packages/backend/migrations/[0-9]*.sql; do
  echo "  Applying: $(basename $file)"
  docker exec -i shovelheroes-postgres psql -U postgres -d "$DB_NAME" < "$file" 2>&1 | grep -v "NOTICE" | grep -v "^$" || true
done

echo "✓ Migrations complete"
