# 🧪 Testing Guide - Post Deployment

## Deployment Status
**Commit:** 71539c3  
**Branch:** main  
**GitHub Actions:** Check at https://github.com/akmal-666/CRMS-Audy/actions

---

## Quick Test Scenarios

### ✅ Test 1: Submit New Request (Fix for 404 Error)

**Objective:** Verify users can submit requests without 404 errors

**Steps:**
1. Open **incognito/private browser window**
2. Navigate to: `https://it.audydental.com` (atau URL form public Anda)
3. Fill form dengan data lengkap:
   - ✍️ Requester Name: `Test User`
   - 📧 Email: `test@example.com`
   - 🏢 Department: Pilih salah satu
   - 👔 Manager Email: Email manager yang valid
   - 📝 Title: `Test CR - Bug Fix Verification`
   - 📄 Problem Description: Minimal 10 karakter
   - 💡 Expected Solution: Isi solusi yang diharapkan
   - ⚡ Priority: Pilih priority
   - 📅 Due Date: Pilih tanggal
   - 🏭 Vendor: Pilih vendor
4. Upload 1 attachment (opsional tapi recommended)
5. Click **Submit**

**Expected Results:**
- ✅ Success message muncul
- ✅ Ticket number ditampilkan (format: CR-2026-XXXX)
- ✅ **NO 404 ERROR**
- ✅ Redirect ke tracking page atau success page
- ✅ Email konfirmasi diterima di inbox

**If Failed:**
- ❌ Check browser console (F12 → Console)
- ❌ Check Network tab untuk response error
- ❌ Verify API deployed: `curl https://your-api-url/health`

---

### ✅ Test 2: Public Timeline Share Link (Fix for Login Redirect)

**Objective:** Verify public can access shared timeline without login

**Setup Steps (as logged-in user):**
1. Login ke CRMS sebagai Staff/Admin
2. Buka salah satu CR (contoh: CR-2026-0001)
3. Go to **Timeline** tab
4. Click tombol **Share** (icon share/link)
5. Wait for share link to generate
6. **Copy the share link**

**Test Steps (as public user):**
1. Open **NEW incognito/private browser window**
2. **Paste share link** ke address bar
3. Press Enter

**Expected Results:**
- ✅ Timeline page loads tanpa redirect ke login
- ✅ Project info visible (ticket number, title, dates)
- ✅ All tasks visible on Gantt chart
- ✅ Tooltips work on hover
- ✅ Read-only mode (no edit buttons)
- ✅ **NO LOGIN REQUIRED**

**Share Link Format:**
```
https://it.audydental.com/timeline/share/<random-token>
```

**If Failed:**
- ❌ Check if redirected to `/login` → Fix not applied
- ❌ Check browser console for API errors
- ❌ Verify token exists in KV store
- ❌ Check `NEXT_PUBLIC_API_URL` env var set

---

### ✅ Test 3: Timeline Detail Panel (Status/Priority Removed)

**Objective:** Verify Status and Priority fields removed from detail panel

**Steps:**
1. Login ke CRMS
2. Navigate to: `/timeline` (Timeline Module)
3. Click **any project** in left sidebar
4. Detail panel opens on right side
5. Click **Details** tab
6. Scroll through the Details section

**Expected Results:**
- ✅ **NO Status dropdown** visible
- ✅ **NO Priority dropdown** visible
- ✅ Summary field visible (read-only or editable)
- ✅ Description field visible
- ✅ Other metadata visible (dates, assignees, etc.)
- ✅ No console errors

**If Failed:**
- ❌ Status/Priority still visible → Clear browser cache
- ❌ Check deployment of web app completed
- ❌ Hard refresh (Ctrl+F5 or Cmd+Shift+R)

---

## Advanced Testing

### 🔍 Test 4: Ticket Counter Increment

**Objective:** Verify ticket numbers increment correctly

**Steps:**
1. Submit 3 requests dalam urutan
2. Note down ticket numbers

**Expected Results:**
- Request 1: `CR-2026-0001`
- Request 2: `CR-2026-0002`
- Request 3: `CR-2026-0003`
- Numbers increment sequentially
- No duplicates
- No gaps (unless previous submissions existed)

---

### 🔍 Test 5: CORS Public Endpoints

**Objective:** Verify CORS allows public form from any origin

**Test via curl:**
```bash
curl -X OPTIONS https://your-api-url/api/work-items/public/submit \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected Results:**
- Response includes: `Access-Control-Allow-Origin`
- No CORS errors in browser console

---

### 🔍 Test 6: Email Notifications

**Objective:** Verify confirmation emails sent correctly

**Expected Emails:**
1. **To Requester:**
   - Subject: `[CR-2026-XXXX] IT Request Submitted Successfully`
   - Contains: Ticket number, title, details, attachments list
   - Professional HTML formatting

2. **To Manager (if provided):**
   - Subject: `[CR-2026-XXXX] IT Request Submitted Successfully`
   - Contains: Same info as requester email
   - Marked as "(Manager FYI)"

**Check:**
- Inbox (might take 2-5 seconds)
- Spam folder
- Cloudflare Queue logs

---

## Verification Commands

### Check API Health
```bash
curl https://your-api-url/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Check Database
```bash
cd apps/api
pnpm exec wrangler d1 execute crms-db --remote \
  --command "SELECT ticketNumber, title, status FROM work_items ORDER BY createdAt DESC LIMIT 5"
```

### Check Recent Logs
```bash
cd apps/api
pnpm exec wrangler tail
# Watch for errors in real-time
```

### Verify KV Share Tokens
```bash
cd apps/api
pnpm exec wrangler kv:key list --binding=CACHE --prefix="timeline_share:"
```

---

## Troubleshooting Quick Reference

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Submit returns 404 | API not deployed | Check GitHub Actions, redeploy |
| Submit fails validation | Missing required fields | Check all fields filled |
| No email received | Queue not processing | Check Cloudflare Queue logs |
| Public timeline redirects | NEXT_PUBLIC_API_URL not set | Set in Cloudflare Pages env vars |
| Share link expired | Token TTL exceeded (7 days) | Generate new share link |
| Status/Priority still visible | Browser cache | Hard refresh (Ctrl+F5) |
| Ticket counter duplicates | Race condition | Check database for duplicate rows |

---

## Success Checklist

After deployment completes, verify:

- [ ] GitHub Actions workflow shows green ✅
- [ ] API deployed successfully (check Workers dashboard)
- [ ] Web deployed successfully (check Pages dashboard)
- [ ] Health endpoint returns OK
- [ ] Submit form works without 404
- [ ] Ticket numbers increment correctly
- [ ] Emails sent and received
- [ ] Public timeline accessible without login
- [ ] Share links work in incognito
- [ ] Detail panel shows correct fields
- [ ] No console errors
- [ ] No Worker errors in logs

---

## Rollback Instructions

If critical issues found:

### Rollback API (Workers)
```bash
cd apps/api
pnpm exec wrangler deployments list
pnpm exec wrangler rollback --message "Rollback due to issue"
```

### Rollback Web (Pages)
1. Go to Cloudflare Dashboard
2. Navigate to: Pages → crms-audy → Deployments
3. Find previous working deployment
4. Click "..." → "Rollback to this deployment"

---

## Monitoring URLs

- **GitHub Actions:** https://github.com/akmal-666/CRMS-Audy/actions
- **Cloudflare Workers Dashboard:** https://dash.cloudflare.com → Workers & Pages
- **Cloudflare Pages Dashboard:** https://dash.cloudflare.com → Pages
- **API Health:** https://your-api-url/health
- **Production App:** https://it.audydental.com

---

## Contact

**Issues during testing?**
- Check browser console first
- Check Cloudflare logs
- Review DEPLOYMENT_CHECKLIST.md
- Review FIXES_SUMMARY.md

**Deployment successful?** 🎉
- Mark all test scenarios as passed
- Monitor production for 24 hours
- Check email delivery rates
- Monitor error rates in dashboard

---

**Testing Date:** ___________  
**Tested By:** ___________  
**Status:** [ ] Pass [ ] Fail [ ] Partial  
**Notes:** ___________________________________________
