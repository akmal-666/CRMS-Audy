# 🚀 CRMS Deployment Guide
## GitHub + Cloudflare — Step by Step

---

## Prerequisites

Pastikan sudah terinstall:
- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) → `npm install -g pnpm`
- [Git](https://git-scm.com)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) → `npm install -g wrangler`

---

## BAGIAN 1 — Setup GitHub Repository

### 1.1 Buat Repository di GitHub

1. Buka https://github.com/new
2. Isi:
   - **Repository name**: `crms`
   - **Visibility**: Private ✅
   - **Jangan** centang "Add README" (project sudah punya)
3. Klik **Create repository**

### 1.2 Push Code ke GitHub

Buka terminal di folder project (`IT Workflow`):

```bash
git init
git add .
git commit -m "feat: initial CRMS project setup"
git branch -M main
git remote add origin https://github.com/USERNAME/crms.git
git push -u origin main
```

> Ganti `USERNAME` dengan GitHub username kamu.

---

## BAGIAN 2 — Setup Cloudflare Account

### 2.1 Buat Cloudflare Account

1. Daftar di https://dash.cloudflare.com/sign-up (gratis)
2. Verifikasi email

### 2.2 Login Wrangler ke Cloudflare

```bash
wrangler login
```

Browser akan terbuka → Klik **Allow** → Tunggu "Successfully logged in".

### 2.3 Cek Account ID

```bash
wrangler whoami
```

Catat **Account ID** yang muncul, akan dipakai nanti.

---

## BAGIAN 3 — Buat Cloudflare Resources

Jalankan semua perintah ini satu per satu:

### 3.1 Buat D1 Database

```bash
wrangler d1 create crms-db
```

Output akan seperti ini:
```
✅ Successfully created DB 'crms-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Catat `database_id` ini!**

### 3.2 Buat KV Namespace (Cache)

```bash
wrangler kv namespace create CACHE
```

Output:
```
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Catat `id` ini!**

### 3.3 Buat Queue (Email Notifications)

```bash
wrangler queues create crms-email-queue
```

> ℹ️ **R2 tidak dipakai** — File storage menggunakan **Supabase Storage** (lihat Bagian 3B).

---

## BAGIAN 3B — Setup Supabase Storage (Pengganti R2)

### 3B.1 Buat Supabase Account & Project

1. Daftar di https://supabase.com (gratis)
2. Klik **New project**
3. Isi:
   - **Name**: `crms`
   - **Database Password**: buat password kuat (simpan!)
   - **Region**: pilih yang terdekat (misal: Southeast Asia)
4. Tunggu project selesai dibuat (~2 menit)

### 3B.2 Buat Storage Bucket

1. Di Supabase Dashboard → **Storage** → **New bucket**
2. Isi:
   - **Name**: `crms-attachments`
   - **Public bucket**: ❌ OFF (private, pakai signed URL)
3. Klik **Create bucket**

### 3B.3 Storage Policy — SKIP, Tidak Diperlukan

> ✅ **Kamu tidak perlu buat policy apapun.**
>
> Aplikasi CRMS menggunakan **`service_role` key** di backend (Cloudflare Workers).
> Service role secara otomatis **bypass semua RLS (Row Level Security)** di Supabase,
> sehingga punya akses penuh ke bucket tanpa perlu policy tambahan.
>
> Policy hanya diperlukan jika akses storage dilakukan langsung dari frontend
> menggunakan `anon` key — yang tidak kita lakukan di sini.

### 3B.4 Ambil Credentials Supabase

1. **Settings** → **API**
2. Catat:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **service_role key** (bukan anon key!): `eyJhbGci...`

> ⚠️ `service_role` key bersifat rahasia, jangan expose ke frontend.

---

## BAGIAN 4 — Konfigurasi Project

### 4.1 Update `wrangler.toml`

Buka file `apps/api/wrangler.toml` dan update dengan ID yang sudah dicatat:

```toml
name = "crms-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "crms-db"
database_id = "PASTE_DATABASE_ID_DISINI"   # ← dari langkah 3.1

[[kv_namespaces]]
binding = "CACHE"
id = "PASTE_KV_ID_DISINI"                  # ← dari langkah 3.2

[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "crms-email-queue"

[[queues.consumers]]
queue = "crms-email-queue"
max_batch_size = 10
max_batch_timeout = 5

[vars]
ENVIRONMENT = "production"
APP_URL = "https://crms.pages.dev"
PUBLIC_URL = "https://crms.pages.dev/submit"
SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co"   # ← dari langkah 3B.4
SUPABASE_STORAGE_BUCKET = "crms-attachments"
```

### 4.2 Buat File `.dev.vars` untuk Local Dev

```bash
cd apps/api
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:
```
JWT_SECRET=ini-harus-panjang-minimal-32-karakter-ya
RESEND_API_KEY=re_xxxxxxxx   (opsional untuk email)
ENVIRONMENT=development
APP_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3000/submit

# Supabase Storage
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=crms-attachments
```

> **JWT_SECRET**: buat string acak panjang, minimal 32 karakter.
> Contoh generate: `openssl rand -base64 32`

---

## BAGIAN 5 — Setup Database (D1 Migration)

### 5.1 Jalankan Migration di Local

```bash
wrangler d1 migrations apply crms-db --local
```

### 5.2 Jalankan Migration di Production (Remote)

```bash
wrangler d1 migrations apply crms-db --remote
```

Ketik `y` untuk konfirmasi.

### 5.3 Verifikasi Database

```bash
wrangler d1 execute crms-db --remote --command "SELECT * FROM departments"
```

Harus muncul data departments dari seed.

---

## BAGIAN 6 — Set Secrets di Cloudflare Workers

Secrets **tidak** disimpan di file, tapi diset via CLI:

```bash
cd apps/api

# JWT Secret (WAJIB)
echo "your-super-secret-jwt-key-minimum-32-characters" | wrangler secret put JWT_SECRET

# Supabase Service Role Key (WAJIB untuk file upload)
echo "eyJhbGci..." | wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Resend API Key (untuk email, opsional)
echo "re_your_resend_key" | wrangler secret put RESEND_API_KEY
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` **harus** di-set sebagai secret, bukan di `[vars]` karena sifatnya rahasia.

---

## BAGIAN 7 — Deploy API ke Cloudflare Workers

### 7.1 Install Dependencies

```bash
# Di root folder project
pnpm install
```

### 7.2 Deploy Workers

```bash
pnpm --filter @crms/api exec wrangler deploy
```

Output sukses:
```
✅ Deployed crms-api
   https://crms-api.YOUR-SUBDOMAIN.workers.dev
```

**Catat URL Workers ini!**

---

## BAGIAN 8 — Deploy Frontend ke Cloudflare Pages

### 8.1 Buat Project Pages di Dashboard

1. Buka https://dash.cloudflare.com
2. Pilih **Workers & Pages** → **Create Application** → **Pages**
3. Klik **Connect to Git**
4. Authorize GitHub → Pilih repo `crms`
5. Klik **Begin Setup**

### 8.2 Konfigurasi Build

Isi form build settings:

| Setting | Value |
|---------|-------|
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `pnpm --filter @crms/web build` |
| **Build output directory** | `apps/web/.next` |
| **Root directory** | `/` |

### 8.3 Environment Variables di Pages

Klik **Environment variables** → **Add variable**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://crms-api.YOUR-SUBDOMAIN.workers.dev` |
| `NODE_VERSION` | `20` |
| `PNPM_VERSION` | `9.15.0` |

### 8.4 Klik Save and Deploy

Tunggu build selesai (3-5 menit).

URL hasil deploy: `https://crms.pages.dev` (atau nama project yang kamu pilih)

---

## BAGIAN 9 — Setup GitHub Actions (Auto-Deploy)

### 9.1 Buat API Token Cloudflare

1. Buka https://dash.cloudflare.com/profile/api-tokens
2. Klik **Create Token**
3. Pilih template **Edit Cloudflare Workers**
4. Tambahkan permissions:
   - `Account > D1 > Edit`
   - `Account > Cloudflare Pages > Edit`
5. Klik **Continue to summary** → **Create Token**
6. **Salin token** (hanya muncul sekali!)

### 9.2 Tambahkan Secrets ke GitHub Repository

1. Buka repo di GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Klik **New repository secret** untuk setiap:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Token dari 9.1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID dari langkah 2.3 |
| `NEXT_PUBLIC_API_URL` | `https://crms-api.YOUR-SUBDOMAIN.workers.dev` |

### 9.3 Test Auto-Deploy

```bash
git add .
git commit -m "chore: configure deployment"
git push
```

Buka tab **Actions** di GitHub → Lihat workflow berjalan otomatis.

---

## BAGIAN 10 — Update Password Seed Data

Password di seed data masih placeholder. Buat password hash yang benar:

### 10.1 Generate bcrypt hash

```bash
node -e "const b=require('bcryptjs'); b.hash('Admin@1234',12).then(h=>console.log(h))"
```

### 10.2 Update di Database

```bash
# Ganti hash admin
wrangler d1 execute crms-db --remote --command \
  "UPDATE users SET password_hash='HASH_DARI_STEP_10.1' WHERE email='admin@crms.local'"

# Ganti hash manager
wrangler d1 execute crms-db --remote --command \
  "UPDATE users SET password_hash='HASH_DARI_STEP_10.1' WHERE email='manager@crms.local'"
```

Lakukan untuk semua user seed.

---

## BAGIAN 11 — Custom Domain (Opsional)

### 11.1 Custom Domain untuk Pages

1. Cloudflare Dashboard → **Workers & Pages** → pilih project `crms`
2. **Custom domains** → **Set up a custom domain**
3. Masukkan domain, misal: `crms.company.com`
4. Update DNS sesuai instruksi

### 11.2 Custom Domain untuk Workers

Buka `wrangler.toml`, tambahkan:

```toml
[env.production]
routes = [
  { pattern = "api.company.com/*", custom_domain = true }
]
```

---

## BAGIAN 12 — Verifikasi Final

Checklist setelah deployment:

- [ ] Buka `https://crms.pages.dev/login` → Halaman login muncul
- [ ] Login dengan `admin@crms.local` / `Admin@1234`
- [ ] Dashboard menampilkan data
- [ ] Buka `https://crms.pages.dev/kanban` → Board kosong tapi tampil
- [ ] Buka `https://crms.pages.dev/submit` → Form publik tanpa login
- [ ] Submit form → Dapat ticket number CR-2026-000001
- [ ] Refresh kanban → Ticket muncul di kolom "In Pipeline"
- [ ] Drag card ke kolom lain → Status berubah
- [ ] Klik card → Detail drawer terbuka

---

## Troubleshooting

### ❌ "Cannot find module" saat deploy Workers

```bash
pnpm install --frozen-lockfile
pnpm --filter @crms/api exec wrangler deploy
```

### ❌ "D1_ERROR: no such table"

Migration belum jalan ke remote:
```bash
wrangler d1 migrations apply crms-db --remote
```

### ❌ "401 Unauthorized" di API

JWT_SECRET belum diset:
```bash
echo "your-secret" | wrangler secret put JWT_SECRET
```

### ❌ CORS Error di browser

Update `APP_URL` dan `PUBLIC_URL` di `wrangler.toml` dengan URL Pages yang benar, lalu redeploy.

### ❌ Build Pages gagal

Pastikan environment variable `NEXT_PUBLIC_API_URL` sudah diset di Pages settings.

### ❌ pnpm not found di Pages build

Tambahkan environment variable:
```
NPM_FLAGS=--legacy-peer-deps
```
Atau gunakan build command: `npm install -g pnpm && pnpm --filter @crms/web build`

---

## Quick Reference

| Resource | URL / Command |
|----------|--------------|
| Frontend | `https://crms.pages.dev` |
| Public Portal | `https://crms.pages.dev/submit` |
| API | `https://crms-api.YOUR.workers.dev` |
| D1 Studio | `wrangler d1 studio crms-db` |
| Workers Logs | `wrangler tail crms-api` |
| Pages Logs | Cloudflare Dashboard → Pages → Deployments |

---

*Guide ini diasumsikan menggunakan Cloudflare Free Plan yang sudah cukup untuk production CRMS.*

---

## BAGIAN 13 — Setup Resend Email dengan Domain audydental.com

### 13.1 Daftar & Login Resend

1. Buka https://resend.com/signup
2. Daftar pakai email → verifikasi email
3. Masuk ke Resend Dashboard

---

### 13.2 Tambah Domain di Resend

1. Di sidebar klik **Domains**
2. Klik **Add Domain**
3. Masukkan: `audydental.com`
4. Region: pilih **Southeast Asia** atau **US East** → klik **Add**

Resend akan tampilkan beberapa **DNS record** yang harus ditambahkan ke Cloudflare.

---

### 13.3 Tambah DNS Record di Cloudflare

1. Buka tab baru → https://dash.cloudflare.com
2. Pilih domain **audydental.com**
3. Klik **DNS** → **Records** → **Add record**

Tambahkan semua record yang ditampilkan Resend. Biasanya ada 3-4 record:

#### Record SPF (TXT)
| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `@` |
| Content | `v=spf1 include:amazonses.com ~all` |
| TTL | Auto |
| Proxy status | ❌ **DNS only** (abu-abu) |

#### Record DKIM (TXT)
| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `resend._domainkey` |
| Content | `p=MIGf...` (copy dari Resend) |
| TTL | Auto |
| Proxy status | ❌ **DNS only** (abu-abu) |

#### Record Bounce (CNAME)
| Field | Value |
|-------|-------|
| Type | `CNAME` |
| Name | `bounce` |
| Content | `feedback-smtp.us-east-1.amazonses.com` |
| TTL | Auto |
| Proxy status | ❌ **DNS only** (abu-abu) |

> ⚠️ **PENTING**: Semua record Resend **wajib DNS only** (ikon abu-abu), bukan Proxied (ikon oranye). Kalau Proxied, verifikasi akan gagal.

---

### 13.4 Verifikasi Domain di Resend

1. Kembali ke tab Resend
2. Klik tombol **Verify DNS Records**
3. Tunggu status berubah jadi ✅ **Verified**

Domain di Cloudflare propagasinya cepat, biasanya **langsung verified** atau maksimal 5 menit.

---

### 13.5 Buat API Key

1. Di Resend sidebar → **API Keys**
2. Klik **Create API Key**
3. Isi:
   - **Name**: `crms-production`
   - **Permission**: `Sending access`
   - **Domain**: pilih `audydental.com`
4. Klik **Add**
5. **Copy key** → formatnya: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

> ⚠️ API Key **hanya muncul sekali**. Langsung simpan di tempat aman (password manager).

---

### 13.6 Set API Key ke Cloudflare Workers

```bash
echo "re_xxxxxxxxxxxxxxxxxxxxxxxxxx" | wrangler secret put RESEND_API_KEY
```

Dan untuk local development, edit `apps/api/.dev.vars`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 13.7 Update Email Sender di Kode

Sekarang update bagian queue consumer di `apps/api/src/index.ts` agar email dikirim dari `audydental.com`.

Kode email sudah diupdate otomatis — email dikirim dari `noreply@audydental.com` dengan template HTML yang rapi.

---

### 13.8 Commit & Push

```bash
git add .
git commit -m "feat: integrate Resend email with audydental.com domain"
git push
```

---

### 13.9 Test Kirim Email

1. Buka `https://crms.pages.dev/submit`
2. Submit test request, isi email dengan email kamu sendiri
3. Cek inbox — harus dapat email dari `noreply@audydental.com`
4. Cek Resend Dashboard → **Emails** → status harus `Delivered` ✅

---

### Ringkasan Konfigurasi Email

| Setting | Value |
|---------|-------|
| Provider | Resend (free: 3,000 email/bulan) |
| From | `noreply@audydental.com` |
| Domain verified | `audydental.com` via Cloudflare DNS |
| Trigger | Submit request → Cloudflare Queue → Worker → Resend |
| Secret | `RESEND_API_KEY` via `wrangler secret put` |
