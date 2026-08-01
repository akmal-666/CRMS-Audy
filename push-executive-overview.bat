@echo off
echo ========================================
echo Git Push - Executive Overview Module
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking git status...
git status
echo.

echo [2/4] Adding files...
git add .
echo.

echo [3/4] Committing changes...
git commit -m "feat: Add Executive Overview Report Module - Add comprehensive Executive Overview dashboard with 12 visualization components - Implement new API endpoint /api/reports/executive-overview with advanced analytics - Add KPI cards: Total Requests, Active Projects, Completed, Delayed, Avg Cycle Time, SLA Achievement - Create 12 visualization components (charts, tables, timeline) - Add export functionality: Excel/CSV, CSV, and PDF formats - Implement comprehensive filters: Year, Quarter, Month, Custom Range, Department, Vendor - Add navigation cards in main reports page - Support responsive design and dark mode - Add role-based access control (Admin, Manager, BA)"
echo.

echo [4/4] Pushing to remote...
git push
echo.

echo ========================================
echo Done! Executive Overview Module pushed.
echo ========================================
echo.
echo Next steps:
echo 1. Pull latest changes on server
echo 2. Run: npm install (if needed)
echo 3. Restart API and Web servers
echo 4. Test at: /reports/executive-overview
echo.
pause
