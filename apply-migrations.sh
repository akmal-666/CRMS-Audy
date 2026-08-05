#!/bin/bash

# Script to apply database migrations for multi-department and mandays negotiation features

echo "Applying database migrations..."
echo ""

# Migration 0009: work_item_departments
echo "Applying migration 0009: work_item_departments..."
wrangler d1 execute it-workflow-db --remote --file=./packages/db/migrations/0009_work_item_departments.sql
echo "✓ Migration 0009 applied"
echo ""

# Migration 0010: mandays_negotiations
echo "Applying migration 0010: mandays_negotiations..."
wrangler d1 execute it-workflow-db --remote --file=./packages/db/migrations/0010_mandays_negotiations.sql
echo "✓ Migration 0010 applied"
echo ""

echo "All migrations applied successfully!"
echo ""
echo "Verify tables exist:"
echo "wrangler d1 execute it-workflow-db --remote --command='SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name;'"
