#!/bin/sh
# AEIMS Web - Docker Entrypoint
# Runs database migrations before starting the application

set -e

echo "=== AEIMS Web Starting ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until nc -z postgres 5432 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  echo "PostgreSQL is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "ERROR: PostgreSQL failed to become ready after $MAX_RETRIES attempts"
  exit 1
fi
echo "PostgreSQL is ready!"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply database schema
echo "Applying database schema..."
if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations)" ]; then
  echo "Migrations found, using migrate deploy..."
  npx prisma migrate deploy
else
  echo "No migrations found, using db push (first-time setup)..."
  npx prisma db push --skip-generate --accept-data-loss
fi

echo "=== Database schema applied successfully ==="
echo "=== Starting Next.js application ==="
exec node server.js
