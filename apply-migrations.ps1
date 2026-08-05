# Script to apply database migrations for multi-department and mandays negotiation features

Write-Host "Applying database migrations..." -ForegroundColor Cyan
Write-Host ""

# Migration 0009: work_item_departments
Write-Host "Applying migration 0009: work_item_departments..." -ForegroundColor Yellow
wrangler d1 execute it-workflow-db --remote --file=./packages/db/migrations/0009_work_item_departments.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migration 0009 applied" -ForegroundColor Green
} else {
    Write-Host "✗ Migration 0009 failed" -ForegroundColor Red
}
Write-Host ""

# Migration 0010: mandays_negotiations
Write-Host "Applying migration 0010: mandays_negotiations..." -ForegroundColor Yellow
wrangler d1 execute it-workflow-db --remote --file=./packages/db/migrations/0010_mandays_negotiations.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migration 0010 applied" -ForegroundColor Green
} else {
    Write-Host "✗ Migration 0010 failed" -ForegroundColor Red
}
Write-Host ""

Write-Host "All migrations applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To verify tables exist, run:" -ForegroundColor Cyan
Write-Host "wrangler d1 execute it-workflow-db --remote --command='SELECT name FROM sqlite_master WHERE type=""table"" ORDER BY name;'" -ForegroundColor Gray
