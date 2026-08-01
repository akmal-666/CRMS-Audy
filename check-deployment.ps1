# Check Deployment Status Script
Write-Host "================================" -ForegroundColor Cyan
Write-Host " CRMS Deployment Status" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Latest Commit:" -ForegroundColor Yellow
git log --oneline -1
Write-Host ""

Write-Host "Remote Status:" -ForegroundColor Yellow
git status -sb
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host " Important URLs" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "GitHub Actions: https://github.com/akmal-666/CRMS-Audy/actions"
Write-Host "Production App: https://it.audydental.com"
Write-Host "Cloudflare:     https://dash.cloudflare.com"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check GitHub Actions status (3-5 min)"
Write-Host "2. Run tests from TESTING_GUIDE.md"
Write-Host "3. Monitor Cloudflare logs"
Write-Host ""
