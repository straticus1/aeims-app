#!/bin/bash
# Initialize Prisma migrations for AEIMS
# Run this once on first deployment to create the migration structure

set -e

echo "=== Initializing Prisma Migrations ==="

# Check if migrations directory exists
if [ -d "/app/prisma/migrations" ]; then
  echo "Migrations directory already exists, using migrate deploy..."
  npx prisma migrate deploy
else
  echo "First-time setup: Creating initial migration..."
  npx prisma migrate dev --name init
fi

echo "=== Migration initialization complete ==="
