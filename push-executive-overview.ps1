#!/usr/bin/env pwsh
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Push - Executive Overview Module" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/4] Checking git status..." -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "[2/4] Adding files..." -ForegroundColor Yellow
git add .
Write-Host ""

Write-Host "[3/4] Committing changes..." -ForegroundColor Yellow
git commit -m "feat: Add Executive Overview Report Module

- Add comprehensive Executive Overview dashboard with 12 visualization components
- Implement new API endpoint /api/reports/executive-overview with advanced analytics
- Add KPI cards: Total Requests, Active Projects, Completed, Delayed, Avg Cycle Time, SLA Achievement
- Create 12 visualization components (charts, tables, timeline)
- Add export functionality: Excel/CSV, CSV, and PDF formats
- Implement comprehensive filters: Year, Quarter, Month, Custom Range, Department, Vendor
- Add navigation cards in main reports page
- Support responsive design and dark mode
- Add role-based access control (Admin, Manager, BA)

Components:
- executive-overview-page.tsx
- overview-kpi-cards.tsx  
- status-chart.tsx
- trend-chart.tsx
- project-progress-list.tsx
- timeline-roadmap.tsx
- priority-chart.tsx
- sla-chart.tsx
- workload-chart.tsx
- cycle-time-chart.tsx
- recent-activity.tsx
- project-health-table.tsx
- export-utils.ts

First of 4 report sub-modules."
Write-Host ""

Write-Host "[4/4] Pushing to remote..." -ForegroundColor Yellow
git push
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Done! Executive Overview Module pushed." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Pull latest changes on server" -ForegroundColor White
Write-Host "2. Run: npm install (if needed)" -ForegroundColor White
Write-Host "3. Restart API and Web servers" -ForegroundColor White
Write-Host "4. Test at: /reports/executive-overview" -ForegroundColor White
Write-Host ""
