# Staging Environment - Quick Start

## 📋 Manual Setup Required (One-time only)

Sebelum staging bisa digunakan, Anda perlu setup manual beberapa resource di Cloudflare:

### 1. Create D1 Database Staging

```bash
cd apps/api
npx wrangler d1 create crms-db-staging
```

**Output:** Copy `database_id` yang muncul

### 2. Update wrangler.toml

Edit `apps/api/wrangler.toml`, cari bagian `[env.staging.d1_databases]` dan replace:
```toml
database_id = "PLACEHOLDER_STAGING_DB_ID"
```
dengan database ID yang baru dibuat.

### 3. Create KV Namespace Staging

```bash
npx wrangler kv:namespace create "CACHE" --env staging
```

**Output:** Copy `id` yang muncul

Update `apps/api/wrangler.toml`, cari `[[env.staging.kv_namespaces]]` dan replace:
```toml
id = "PLACEHOLDER_STAGING_KV_ID"
```

### 4. Create Queue Staging

```bash
npx wrangler queues create crms-email-queue-staging
```

### 5. Run Database Migrations

```bash
cd apps/api
npx wrangler d1 migrations apply crms-db-staging --remote
```

### 6. Add GitHub Secret

1. Go to: https://github.com/akmal-666/CRMS-Audy/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NEXT_PUBLIC_API_URL_STAGING`
4. Value: `https://crms-api-staging.YOUR_SUBDOMAIN.workers.dev` (akan muncul setelah first deploy)

### 7. Commit & Push ID Changes

```bash
git add apps/api/wrangler.toml
git commit -m "chore: update staging database and KV IDs"
git push origin staging
```

---

## 🚀 Daily Workflow (Setelah setup)

### Test Feature Baru di Staging

```bash
# 1. Checkout staging branch
git checkout staging
git pull origin staging

# 2. Cherry-pick commits yang mau di-test (misalnya dari branch fitur)
git cherry-pick <commit-hash>

# Atau merge dari feature branch
git merge feature/kanban-remake

# 3. Push ke staging - auto deploy
git push origin staging

# 4. Wait 3-5 minutes, then test at:
# https://staging.crms-audy.pages.dev
```

### Restore Kanban Remake ke Staging

```bash
# 1. Checkout staging
git checkout staging

# 2. Merge dari commit sebelum rollback (d752522)
git cherry-pick d752522

# 3. Push
git push origin staging

# Staging sekarang punya kanban remake, production masih versi lama
```

### Promote Staging → Production

```bash
# Setelah test OK di staging:
git checkout main
git merge staging
git push origin main
```

---

## 🔗 URLs

| Environment | Web URL | API URL |
|-------------|---------|---------|
| **Production** | https://it.audydental.com | https://crms-api.*.workers.dev |
| **Staging** | https://staging.crms-audy.pages.dev | https://crms-api-staging.*.workers.dev |

---

## 🛠️ Useful Commands

### Check Staging Database
```bash
npx wrangler d1 execute crms-db-staging --command="SELECT COUNT(*) FROM work_items" --remote
```

### View Staging Logs
```bash
npx wrangler tail crms-api-staging --env staging
```

### Manual Deploy Staging
```bash
# API
cd apps/api
npx wrangler deploy --env staging

# Web
cd apps/web  
NEXT_PUBLIC_API_URL=<staging-api-url> pnpm build:cf
npx wrangler pages deploy .vercel/output/static --project-name=crms-audy --branch=staging
```

### Copy Production Data to Staging (Optional)
```bash
# Export production
npx wrangler d1 export crms-db --output=prod-backup.sql --remote

# Import to staging
npx wrangler d1 execute crms-db-staging --file=prod-backup.sql --remote
```

---

## 📝 Best Practices

✅ **DO:**
- Test semua fitur baru di staging dulu
- Keep staging updated dengan production data (opsional)
- Use staging untuk demo ke stakeholder
- Merge feature → staging → main (flow bertahap)

❌ **DON'T:**
- Jangan langsung push fitur baru ke main
- Jangan test di production
- Jangan mix staging dan production credentials

---

## 🐛 Troubleshooting

### Error: Database not found
```bash
# Verify database exists
npx wrangler d1 list

# Recreate if needed
npx wrangler d1 create crms-db-staging
```

### Error: KV namespace not found
```bash
# Verify KV exists
npx wrangler kv:namespace list

# Recreate if needed
npx wrangler kv:namespace create "CACHE" --env staging
```

### Deployment fails on GitHub Actions
1. Check workflow run logs: https://github.com/akmal-666/CRMS-Audy/actions
2. Verify GitHub secrets are set
3. Ensure wrangler.toml has correct IDs

---

## 📚 Full Documentation

See [STAGING_SETUP.md](./STAGING_SETUP.md) for complete setup guide and architecture details.

---

## ✨ Next Steps

1. ✅ Complete manual setup (steps 1-7 above)
2. ✅ Test staging deployment
3. ✅ Restore kanban remake to staging
4. ✅ Test all features
5. ✅ Merge to production when ready

**Status:** Setup infrastructure committed to `staging` branch. Manual Cloudflare resource creation required before first deployment.
