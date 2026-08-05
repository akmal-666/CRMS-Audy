# Troubleshooting Guide: Multi-Department & Mandays Negotiation Features

## Issue: Features Not Showing Up

### Step 1: Check Database Migrations

Run this command to check if tables exist:
```bash
wrangler d1 execute it-workflow-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

You should see these tables:
- `work_item_departments`
- `mandays_negotiations`

If tables are missing, apply migrations:

**Windows:**
```powershell
.\apply-migrations.ps1
```

**Linux/Mac:**
```bash
chmod +x apply-migrations.sh
./apply-migrations.sh
```

**Manual (if scripts don't work):**
```bash
# Apply migration 0009
wrangler d1 execute it-workflow-db --remote --file=./packages/db/migrations/0009_work_item_departments.sql

# Apply migration 0010
wrangler d1 execute it-workflow-db --remote --file=./packages/db/migrations/0010_mandays_negotiations.sql
```

### Step 2: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click on reload button → "Empty Cache and Hard Reload"
3. Or use Ctrl+Shift+Delete → Clear cache

### Step 3: Check API Deployment

Verify API is deployed:
```bash
curl https://api.audydental.com/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Step 4: Check API Routes

Test if new endpoints are accessible:

**Test Departments Endpoint:**
```bash
curl -X GET "https://api.audydental.com/api/work-items/{workItemId}/departments" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Negotiations Endpoint:**
```bash
curl -X GET "https://api.audydental.com/api/negotiations/{workItemId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Check Console Errors

1. Open CR detail page
2. Open DevTools (F12) → Console tab
3. Look for errors related to:
   - `work-item-departments`
   - `mandays-negotiation`
   - API calls failing

### Step 6: Verify User Role

**Business Analyst should be able to edit if:**
- User role is `BUSINESS_ANALYST`
- Logged in successfully
- Has access to the CR

Check user object in console:
```javascript
// In browser console
localStorage.getItem('user')
```

Should show role as `business_analyst`

---

## Issue: Business Analyst Cannot Edit

### Check 1: Verify Role in Database

```sql
SELECT id, email, name, role FROM users WHERE email = 'ba-email@company.com';
```

Role should be `business_analyst`

### Check 2: Check Frontend Permissions

In ticket-detail-page.tsx, these should include BUSINESS_ANALYST:
```typescript
const canManageDepartments = user && [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST].includes(user.role as UserRole)
const canProposeNegotiation = user && [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST].includes(user.role as UserRole)
```

### Check 3: Check API Permissions

In work-item-departments.ts and mandays-negotiations.ts:
```typescript
requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST)
```

### Check 4: Test API Permission

Try calling API directly:
```bash
curl -X POST "https://api.audydental.com/api/work-items/{id}/departments" \
  -H "Authorization: Bearer BA_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"departmentId":"dept-123"}'
```

Should return success, not 403 Forbidden.

---

## Issue: Components Not Showing

### Check 1: Verify Components Imported

In ticket-detail-page.tsx:
```typescript
import { CollaboratingDepartments } from './collaborating-departments'
import { MandaysNegotiation } from './mandays-negotiation'
```

### Check 2: Verify Components Rendered

Search for these in ticket-detail-page.tsx:
```tsx
<CollaboratingDepartments 
  workItemId={id} 
  primaryDepartmentId={item.departmentId}
  canEdit={!!canManageDepartments}
/>

<MandaysNegotiation
  workItemId={id}
  currentMandays={item.mandays}
  canPropose={!!canProposeNegotiation}
  isRequester={!!isRequester}
/>
```

### Check 3: Check Build Errors

In GitHub Actions, check if build succeeded:
1. Go to GitHub repository
2. Click "Actions" tab
3. Check latest workflow run
4. Ensure "Build and deploy web" step passed

---

## Quick Verification Checklist

- [ ] Migrations applied to production database
- [ ] Browser cache cleared
- [ ] Latest code deployed (check GitHub Actions)
- [ ] API health check returns OK
- [ ] User logged in with correct role
- [ ] No console errors in DevTools
- [ ] API endpoints respond (not 404)
- [ ] Components visible in page source

---

## Common Errors

### Error: "Module not found: @tanstack/react-query"
**Fix:** Already fixed in commit `12d760f`

### Error: 404 on /api/work-items/{id}/departments
**Cause:** API not deployed or route not registered
**Fix:** Check apps/api/src/index.ts line 63-64:
```typescript
app.route('/api/work-items', workItemDepartmentsRoutes)
app.route('/api/negotiations', mandaysNegotiationsRoutes)
```

### Error: 403 Forbidden when Business Analyst tries to edit
**Cause:** requireRole missing BUSINESS_ANALYST
**Fix:** Already fixed in commit `eee0f46`

### Error: Tables don't exist
**Cause:** Migrations not applied
**Fix:** Run apply-migrations script

---

## Contact

If issue persists after following all steps:
1. Check GitHub Actions logs
2. Check Cloudflare Workers logs
3. Check browser Network tab for failed requests
4. Provide error messages from console
