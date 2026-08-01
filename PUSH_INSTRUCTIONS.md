# 🚀 Push Instructions - Executive Overview Module

## Issue
GitHub secret scanning blocks push when files contain Personal Access Tokens.

## Solution
Use the bypass URL provided by GitHub or use environment variable.

---

## Option 1: Allow Secret via GitHub URL

GitHub provided this URL to allow the secret:
```
https://github.com/akmal-666/CRMS-Audy/security/secret-scanning/unblock-secret/3HJgZMqIDzEt06iGWWbU9CKPYBd
```

1. Open that URL in browser
2. Click "Allow secret" 
3. Then push again

---

## Option 2: Use Environment Variable (Recommended)

### Step 1: Set token as environment variable
```powershell
$env:GITHUB_TOKEN = "YOUR_TOKEN_HERE"
```

### Step 2: Reset & Push
```powershell
Set-Location "c:\Users\akmal jirr\Desktop\IT Workflow\CRMS-Audy"
git reset --soft HEAD~1
git add .
git commit -m "feat: Add Executive Overview Report Module"
git push "https://akmal-666:$env:GITHUB_TOKEN@github.com/akmal-666/CRMS-Audy.git" main --force
```

---

## Option 3: Use Git Credential Manager

Configure git to use Windows Credential Manager:
```bash
git config --global credential.helper manager-core
```

Then just push normally:
```bash
git push origin main --force
```

---

## Clean Push Commands (After fixing token issue)

### PowerShell:
```powershell
Set-Location "c:\Users\akmal jirr\Desktop\IT Workflow\CRMS-Audy"
git reset --soft HEAD~1
git add .
git commit -m "feat: Add Executive Overview Report Module"
git push origin main --force
```

### CMD:
```cmd
cd /d "c:\Users\akmal jirr\Desktop\IT Workflow\CRMS-Audy"
git reset --soft HEAD~1
git add .
git commit -m "feat: Add Executive Overview Report Module"
git push origin main --force
```

---

## What's Being Pushed

### Executive Overview Module includes:
- ✅ 1 API endpoint (`/api/reports/executive-overview`)
- ✅ 12 React components (charts, cards, tables)
- ✅ Export utilities (Excel, CSV, PDF)
- ✅ Responsive design & dark mode
- ✅ Comprehensive filters
- ✅ Documentation

### Files:
- Backend: `apps/api/src/routes/reports.ts`
- Frontend: 14 files in `apps/web/src/features/reports/executive-overview/`
- Utils: `apps/web/src/lib/export-utils.ts`
- Docs: `EXECUTIVE_OVERVIEW_*.md`
