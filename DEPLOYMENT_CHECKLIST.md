# 🚀 Deployment Checklist - Bug Fixes

## Issues Fixed

### ✅ 1. Submit Request 404 Error
**Root Cause:** Ticket counter generation failing when counter row doesn't exist
**Fix Applied:**
- Added `INSERT OR IGNORE INTO` for idempotency in ticket counter logic
- Added timestamp-based fallback counter if D1 raw query fails
- Updated CORS to allow any origin for public endpoints

**Files Modified:**
- `apps/api/src/routes/work-items.ts`
- `apps/api/src/index.ts`

### ✅ 2. Public Timeline Share Link Access
**Root Cause:** Public timeline falling back to localhost in production
**Fix Applied:**
- Created `getApiUrl()` helper that uses `window.location.origin` as fallback
- Added `credentials: 'omit'` to public fetch calls to prevent auth cookies
- Public endpoint `/api/timeline/public/:token` properly works without auth

**Files Modified:**
- `apps/web/src/features/timeline/timeline-page.tsx`
- `apps/api/src/routes/timeline.ts` (already had public endpoint)

### ✅ 3. Status/Priority Removed from Detail Panel
**Status:** Already removed based on user screenshot feedback

**Files Modified:**
- `apps/web/src/features/timeline/timeline-module.tsx`

---

## 📋 Pre-Deployment Checklist

### Database Verification
- [ ] Verify `ticket_counters` table exists in production D1
  ```bash
  pnpm --filter @crms/api exec wrangler d1 execute crms-db --remote --command "SELECT * FROM ticket_counters"
  ```

- [ ] Check if year 2026 counter row exists
  ```bash
  pnpm --filter @crms/api exec wrangler d1 execute crms-db --remote --command "SELECT * FROM ticket_counters WHERE year = 2026"
  ```

- [ ] If missing, insert it:
  ```bash
  pnpm --filter @crms/api exec wrangler d1 execute crms-db --remote --command "INSERT OR IGNORE INTO ticket_counters (year, counter) VALUES (2026, 0)"
  ```

### Environment Variables
- [ ] Verify `NEXT_PUBLIC_API_URL` is set in Cloudflare Pages settings
  - Should be: `https://crms-api.<your-subdomain>.workers.dev` or custom API domain
  - Go to: Cloudflare Pages → crms-audy → Settings → Environment variables

- [ ] Verify Cloudflare Workers secrets are set:
  ```bash
  pnpm --filter @crms/api exec wrangler secret list
  ```
  - Required secrets: `RESEND_API_KEY`, `JWT_SECRET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`

### KV Namespace Verification
- [ ] Verify KV namespace binding exists
  ```bash
  pnpm --filter @crms/api exec wrangler kv:namespace list
  ```

### Code Review
- [x] Ticket counter has fallback mechanism
- [x] CORS allows public endpoints
- [x] Public timeline uses window.location.origin fallback
- [x] Public timeline omits credentials
- [x] Timeline color schema includes 'gray'

---

## 🚢 Deployment Steps

### 1. Run Database Migrations
```bash
pnpm --filter @crms/api exec wrangler d1 migrations apply crms-db --remote
```

### 2. Deploy API (Cloudflare Workers)
```bash
pnpm --filter @crms/api exec wrangler deploy
```

### 3. Deploy Web (Cloudflare Pages)
```bash
# Build with API URL
NEXT_PUBLIC_API_URL=<your-api-url> pnpm --filter @crms/web build:cf

# Deploy to Pages
pnpm --filter @crms/api exec wrangler pages deploy ../../apps/web/.vercel/output/static --project-name=crms-audy --commit-dirty=true
```

---

## 🧪 Post-Deployment Testing

### Test 1: Submit New Request (404 Fix)
1. Open incognito browser
2. Go to: `https://it.audydental.com` (or your public form URL)
3. Fill out the request form completely:
   - Requester Name
   - Email
   - Department
   - Manager Email
   - Title
   - Problem Description
   - Expected Solution
   - Priority
   - Due Date
   - Vendor
4. Upload at least one attachment
5. Click Submit
6. **Expected:** Success response with ticket number (e.g., `CR-2026-0001`)
7. **Expected:** No 404 error
8. **Expected:** Confirmation email received

**Verification Command:**
```bash
# Check if ticket was created
pnpm --filter @crms/api exec wrangler d1 execute crms-db --remote --command "SELECT ticketNumber, title, status FROM work_items ORDER BY createdAt DESC LIMIT 5"
```

### Test 2: Public Timeline Share Link (Access Fix)
1. Login to CRMS as staff/admin
2. Open any CR (e.g., CR-2026-0001)
3. Go to Timeline tab
4. Click "Share" button
5. Copy the generated share link
6. **Open in incognito browser (logged out)**
7. Paste the share link
8. **Expected:** Timeline loads without login redirect
9. **Expected:** All tasks visible
10. **Expected:** Read-only mode (no edit buttons)

**Share Link Format:**
```
https://it.audydental.com/timeline/share/<token>
```

### Test 3: Detail Panel (Status/Priority Removed)
1. Login to CRMS
2. Go to Timeline module: `/timeline`
3. Click on any project in the sidebar
4. Detail panel opens on the right
5. Go to "Details" tab
6. **Expected:** No Status dropdown visible
7. **Expected:** No Priority dropdown visible
8. **Expected:** Only Summary and Description shown

---

## 🐛 Troubleshooting

### Issue: Submit still returns 404
**Check:**
1. API deployed successfully?
   ```bash
   curl https://<your-api-url>/health
   ```
2. CORS configured correctly?
3. Ticket counters table exists?
4. Check Cloudflare Workers logs:
   ```bash
   pnpm --filter @crms/api exec wrangler tail
   ```

### Issue: Public timeline redirects to login
**Check:**
1. `NEXT_PUBLIC_API_URL` environment variable set in Cloudflare Pages?
2. Public endpoint returns data without auth?
   ```bash
   curl https://<your-api-url>/api/timeline/public/<token>
   ```
3. Share token exists in KV?
4. Browser console for errors (F12)

### Issue: Timeline colors not working
**Check:**
1. Database migration 0007 applied?
2. API accepts 'gray' color in schema?
3. Frontend component uses updated color map?

---

## 📊 Monitoring

### Cloudflare Workers Logs
```bash
pnpm --filter @crms/api exec wrangler tail
```

### Check Recent Errors
```bash
# In Cloudflare Dashboard
Workers & Pages → crms-api → Logs
```

### Check D1 Database Size
```bash
pnpm --filter @crms/api exec wrangler d1 info crms-db
```

---

## ✅ Success Criteria

- [ ] New requests submit successfully without 404 errors
- [ ] Ticket numbers generate correctly (CR-2026-XXXX format)
- [ ] Confirmation emails sent to requester and manager
- [ ] Public timeline share links accessible without login
- [ ] Public timeline displays all tasks correctly
- [ ] Detail panel in timeline module shows only allowed fields
- [ ] No console errors in browser
- [ ] No Worker errors in Cloudflare logs

---

## 🔄 Rollback Plan (If Needed)

### Rollback API
```bash
# List deployments
pnpm --filter @crms/api exec wrangler deployments list

# Rollback to previous version
pnpm --filter @crms/api exec wrangler rollback --message "Rollback due to issues"
```

### Rollback Web
```bash
# In Cloudflare Dashboard
Pages → crms-audy → Deployments → View details → Rollback to this deployment
```

---

## 📝 Notes

- All fixes are backward compatible
- No breaking changes to API responses
- No database schema changes required (ticket_counters already exists)
- Public endpoints maintain same signature
- Ticket counter fallback ensures submit never fails completely

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Production URL:** https://it.audydental.com
**API URL:** _____________
**Verified By:** _____________
