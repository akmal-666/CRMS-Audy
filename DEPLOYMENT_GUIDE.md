# 🚀 CRMS Deployment Guide
## GitHub + Cloudflare Dashboard (Tanpa CLI)

> Guide ini **100% menggunakan UI/Dashboard** — tidak perlu install Wrangler CLI.
> Kamu hanya butuh browser dan akses ke GitHub + Cloudflare Dashboard.

---

## Urutan Langkah

```
1. GitHub → Push code (sudah selesai ✅)
2. Cloudflare → Buat D1 Database
3. Cloudflare → Buat KV Namespace
4. Cloudflare → Buat Queue
5. Supabase → Buat Storage bucket
6. Cloudflare → Deploy Workers (upload manual)
7. Cloudflare → Set Environment Variables & Secrets
8. Cloudflare → Jalankan SQL Migration
9. Cloudflare Pages → Deploy Frontend
10. Resend → Setup Email Domain
11. Verifikasi Final
```

---

## BAGIAN 1 — Buat D1 Database

1. Buka https://dash.cloudflare.com
2. Di sidebar kiri klik **Storage & Databases** → **D1 SQL Database**
3. Klik **Create database**
4. Isi:
   - **Database name**: `crms-db`
5. Klik **Create**
6. Setelah masuk ke halaman database, catat **Database ID** yang muncul di bagian atas

   Contoh: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

> 📋 **Simpan Database ID ini** — dibutuhkan di langkah berikutnya.

---

## BAGIAN 2 — Buat KV Namespace

1. Di sidebar Cloudflare → **Storage & Databases** → **KV**
2. Klik **Create a namespace**
3. Isi **Namespace Name**: `CRMS_CACHE`
4. Klik **Add**
5. Catat **ID** yang muncul di kolom sebelah kanan nama namespace

> 📋 **Simpan KV ID ini.**

---

## BAGIAN 3 — Buat Queue

1. Di sidebar → **Workers & Pages** → **Queues**
2. Klik **Create queue**
3. Isi **Queue name**: `crms-email-queue`
4. Klik **Create queue**

---

## BAGIAN 4 — Setup Supabase Storage

### 4.1 Buat Account & Project

1. Buka https://supabase.com → daftar / login
2. Klik **New project**
3. Isi:
   - **Name**: `crms`
   - **Database Password**: buat password kuat, simpan!
   - **Region**: Southeast Asia
4. Tunggu selesai (~2 menit)

### 4.2 Buat Storage Bucket

1. Di Supabase sidebar → **Storage**
2. Klik **New bucket**
3. Isi:
   - **Name**: `crms-attachments`
   - **Public bucket**: ❌ OFF
4. Klik **Save**

### 4.3 Ambil Credentials

1. Di Supabase → **Settings** → **API**
2. Catat dua hal:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **service_role** key (bukan anon!): `eyJhbGci...`

> ⚠️ Jangan bagikan `service_role` key ke siapapun.

---

## BAGIAN 5 — Update File Konfigurasi di GitHub

Sebelum deploy Workers, kamu perlu update file `wrangler.toml` dengan ID-ID yang sudah dicatat.

### 5.1 Edit wrangler.toml di GitHub

1. Buka https://github.com/akmal-666/CRMS-Audy
2. Navigasi ke: `apps/api/wrangler.toml`
3. Klik ikon **pensil** (Edit this file) di kanan atas
4. Update baris berikut dengan nilai yang sudah kamu catat:

```toml
name = "crms-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "crms-db"
database_id = "PASTE_DATABASE_ID_DARI_BAGIAN_1"

[[kv_namespaces]]
binding = "CACHE"
id = "PASTE_KV_ID_DARI_BAGIAN_2"

[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "crms-email-queue"

[[queues.consumers]]
queue = "crms-email-queue"
max_batch_size = 10
max_batch_timeout = 5

[vars]
ENVIRONMENT = "production"
APP_URL = "https://crms-audy.pages.dev"
PUBLIC_URL = "https://crms-audy.pages.dev/submit"
SUPABASE_URL = "https://PASTE_PROJECT_URL_DARI_BAGIAN_4"
SUPABASE_STORAGE_BUCKET = "crms-attachments"
```

5. Scroll ke bawah → klik **Commit changes** → **Commit directly to main**

---

## BAGIAN 6 — Deploy Cloudflare Workers

### 6.1 Buat Worker Baru

1. Di Cloudflare Dashboard → **Workers & Pages**
2. Klik **Create application** → **Workers** → **Create Worker**
3. Isi **Name**: `crms-api`
4. Klik **Deploy** (biarkan kode default dulu)

### 6.2 Connect ke GitHub (Auto-Deploy)

1. Masuk ke Worker `crms-api` yang baru dibuat
2. Klik tab **Settings** → **Build**
3. Klik **Connect to Git**
4. Authorize GitHub → pilih repo `CRMS-Audy`
5. Konfigurasi build:

   | Setting | Value |
   |---------|-------|
   | **Production branch** | `main` |
   | **Build command** | `pnpm install && pnpm --filter @crms/api exec wrangler deploy --dry-run` |
   | **Deploy command** | `pnpm --filter @crms/api exec wrangler deploy` |
   | **Root directory** | `/` |

6. Klik **Save**

> 💡 Alternatif lebih mudah: gunakan **GitHub Actions** yang sudah ada di repo (`.github/workflows/deploy.yml`). Lihat Bagian 9.

### 6.3 Bind D1, KV, Queue ke Worker

Di halaman Worker `crms-api`:

1. Klik tab **Settings** → **Bindings**
2. Tambahkan binding satu per satu:

   **D1 Database:**
   - Klik **Add** → pilih **D1 Database**
   - Variable name: `DB`
   - Database: pilih `crms-db`
   - Klik **Save**

   **KV Namespace:**
   - Klik **Add** → pilih **KV Namespace**
   - Variable name: `CACHE`
   - KV Namespace: pilih `CRMS_CACHE`
   - Klik **Save**

   **Queue:**
   - Klik **Add** → pilih **Queue**
   - Variable name: `EMAIL_QUEUE`
   - Queue: pilih `crms-email-queue`
   - Klik **Save**

---

## BAGIAN 7 — Set Environment Variables & Secrets di Workers

Di halaman Worker `crms-api` → **Settings** → **Variables and Secrets**

### 7.1 Tambah Variables (plain text, tidak rahasia)

Klik **Add variable** untuk setiap baris:

| Variable Name | Value | Type |
|---------------|-------|------|
| `ENVIRONMENT` | `production` | Text |
| `APP_URL` | `https://crms-audy.pages.dev` | Text |
| `PUBLIC_URL` | `https://crms-audy.pages.dev/submit` | Text |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Text |
| `SUPABASE_STORAGE_BUCKET` | `crms-attachments` | Text |

### 7.2 Tambah Secrets (terenkripsi, tidak bisa dilihat lagi)

Untuk setiap secret di bawah, pilih tipe **Secret** (bukan Text):

| Variable Name | Value | Keterangan |
|---------------|-------|------------|
| `JWT_SECRET` | string acak 32+ karakter | Buat di https://generate-secret.vercel.app/64 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` dari Supabase | Settings → API → service_role |
| `RESEND_API_KEY` | `re_xxxxxxx` dari Resend | Lihat Bagian 10 |

Cara tambah secret:
1. Klik **Add variable**
2. Isi **Variable name**
3. Isi **Value**
4. Ubah tipe dari **Text** ke **Secret** (klik dropdown)
5. Klik **Deploy** / **Save**

---

## BAGIAN 8 — Jalankan SQL Migration (via Cloudflare Dashboard)

### 8.1 Buka D1 Database Console

1. Di sidebar → **Storage & Databases** → **D1 SQL Database**
2. Klik database `crms-db`
3. Klik tab **Console**

### 8.2 Jalankan Migration Pertama

1. Buka file `packages/db/migrations/0001_initial.sql` di GitHub
2. Klik **Raw** → **Select All** → **Copy**
3. Kembali ke D1 Console
4. Paste semua SQL ke kolom input
5. Klik **Execute**
6. Tunggu sampai semua tabel terbuat ✅

### 8.3 Jalankan Seed Data

1. Buka file `packages/db/migrations/0002_seed.sql` di GitHub
2. **Raw** → **Copy**
3. Paste ke D1 Console
4. Klik **Execute**

### 8.4 Verifikasi

Ketik di D1 Console dan klik Execute:
```sql
SELECT * FROM departments;
```
Harus muncul 6 baris department. ✅

---

## BAGIAN 9 — Deploy Frontend ke Cloudflare Pages

### 9.1 Buat Project Pages

1. Di Cloudflare Dashboard → **Workers & Pages**
2. Klik **Create application** → **Pages**
3. Klik **Connect to Git**
4. Authorize GitHub → pilih repo `CRMS-Audy`
5. Klik **Begin Setup**

### 9.2 Konfigurasi Build

| Setting | Value |
|---------|-------|
| **Project name** | `crms-audy` |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `pnpm install && pnpm --filter @crms/web build` |
| **Build output directory** | `apps/web/.next` |
| **Root directory** | *(kosongkan)* |

### 9.3 Tambah Environment Variables

Sebelum klik Deploy, tambahkan environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://crms-api.YOUR-SUBDOMAIN.workers.dev` |
| `NODE_VERSION` | `20` |
| `PNPM_VERSION` | `9.15.0` |

> Ganti `YOUR-SUBDOMAIN` dengan subdomain Workers kamu yang terlihat di halaman Worker.

### 9.4 Klik Save and Deploy

Tunggu build selesai (3–5 menit).
URL hasil: `https://crms-audy.pages.dev`

---

## BAGIAN 10 — Setup Resend Email (audydental.com)

### 10.1 Daftar & Login Resend

1. Buka https://resend.com/signup → daftar
2. Masuk ke dashboard

### 10.2 Tambah Domain

1. Sidebar → **Domains** → **Add Domain**
2. Masukkan: `audydental.com`
3. Region: **Southeast Asia** → klik **Add**

Resend tampilkan DNS record yang perlu ditambahkan ke Cloudflare.

### 10.3 Tambah DNS Record di Cloudflare

1. Buka https://dash.cloudflare.com → pilih `audydental.com`
2. **DNS** → **Records** → **Add record**

Tambahkan semua record dari Resend:

**SPF (TXT):**
| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `@` |
| Content | `v=spf1 include:amazonses.com ~all` |
| Proxy | ❌ DNS only (abu-abu) |

**DKIM (TXT):**
| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `resend._domainkey` |
| Content | `p=MIGf...` (copy dari Resend) |
| Proxy | ❌ DNS only (abu-abu) |

**Bounce (CNAME):**
| Field | Value |
|-------|-------|
| Type | `CNAME` |
| Name | `bounce` |
| Content | `feedback-smtp.us-east-1.amazonses.com` |
| Proxy | ❌ DNS only (abu-abu) |

> ⚠️ Semua record Resend **wajib DNS only** (abu-abu), bukan Proxied (oranye).

### 10.4 Verify di Resend

Kembali ke Resend → klik **Verify DNS Records** → tunggu ✅ Verified (biasanya < 5 menit).

### 10.5 Buat API Key

1. Resend sidebar → **API Keys** → **Create API Key**
2. Isi:
   - **Name**: `crms-production`
   - **Permission**: `Sending access`
   - **Domain**: `audydental.com`
3. Klik **Add** → **copy key** `re_xxxxxxxxx`

> ⚠️ Hanya muncul sekali — simpan sekarang!

### 10.6 Set RESEND_API_KEY ke Workers

1. Cloudflare Dashboard → **Workers & Pages** → `crms-api`
2. **Settings** → **Variables and Secrets**
3. **Add variable**:
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxx`
   - Type: **Secret**
4. Klik **Deploy**

---

## BAGIAN 11 — Update Password User (via D1 Console)

Password seed data masih placeholder. Update via D1 Console:

### 11.1 Generate bcrypt hash

Buka: https://bcrypt-generator.com
- Masukkan password: `Admin@1234`
- Rounds: `12`
- Klik **Generate** → copy hasilnya

### 11.2 Update di D1 Console

Cloudflare → D1 → `crms-db` → **Console**, jalankan:

```sql
UPDATE users SET password_hash = 'PASTE_HASH_DISINI'
WHERE email IN (
  'admin@crms.local',
  'manager@crms.local',
  'analyst@crms.local',
  'developer@crms.local',
  'qa@crms.local'
);
```

---

## BAGIAN 12 — Custom Domain untuk CRMS (Opsional)

Kamu bisa pakai subdomain `audydental.com` untuk CRMS:

**Contoh:**
- Frontend: `crms.audydental.com`
- API: `api-crms.audydental.com`

### 12.1 Custom Domain untuk Pages

1. **Workers & Pages** → `crms-audy` → **Custom domains**
2. Klik **Set up a custom domain**
3. Masukkan: `crms.audydental.com`
4. Klik **Continue** → Cloudflare otomatis tambah DNS record
5. Tunggu **Active** ✅

### 12.2 Custom Domain untuk Workers

1. **Workers & Pages** → `crms-api` → **Settings** → **Triggers**
2. **Custom Domains** → **Add Custom Domain**
3. Masukkan: `api-crms.audydental.com`
4. Klik **Add Custom Domain**
5. Tunggu **Active** ✅

Setelah ini update `NEXT_PUBLIC_API_URL` di Pages menjadi `https://api-crms.audydental.com`.

---

## BAGIAN 13 — Verifikasi Final

Checklist setelah semua selesai:

- [ ] Buka `https://crms-audy.pages.dev/login` → halaman login muncul
- [ ] Login dengan `admin@crms.local` / `Admin@1234`
- [ ] Dashboard tampil dengan data statistik
- [ ] Buka `/kanban` → Kanban board tampil
- [ ] Buka `/submit` → Form publik tanpa login
- [ ] Submit form → dapat ticket `CR-2026-000001`
- [ ] Cek inbox email → dapat konfirmasi dari `noreply@audydental.com`
- [ ] Di kanban, drag card ke kolom lain → status berubah
- [ ] Klik card → detail drawer terbuka

---

## Troubleshooting

### ❌ Build Pages gagal — "pnpm not found"
Tambahkan environment variable di Pages:
```
NPM_FLAGS = --legacy-peer-deps
NODE_VERSION = 20
PNPM_VERSION = 9.15.0
```

### ❌ "D1_ERROR: no such table"
SQL migration belum dijalankan. Ulangi Bagian 8.

### ❌ "401 Unauthorized"
`JWT_SECRET` belum di-set di Workers. Ulangi Bagian 7.2.

### ❌ File upload gagal
`SUPABASE_SERVICE_ROLE_KEY` belum di-set, atau salah isi. Cek Bagian 7.2.

### ❌ Email tidak terkirim
- Cek `RESEND_API_KEY` sudah di-set sebagai Secret di Workers
- Cek domain `audydental.com` sudah **Verified** di Resend
- Cek Resend Dashboard → **Emails** untuk melihat error

### ❌ CORS Error
Pastikan `APP_URL` di Workers Variables sudah sesuai dengan URL Pages kamu.

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Frontend | `https://crms-audy.pages.dev` |
| Public Portal | `https://crms-audy.pages.dev/submit` |
| D1 Console | Dashboard → Storage & Databases → D1 → crms-db → Console |
| Workers Logs | Dashboard → Workers & Pages → crms-api → Logs |
| Supabase Storage | https://supabase.com/dashboard/project/xxx/storage |
| Resend Dashboard | https://resend.com/emails |

---

*Semua langkah menggunakan UI Dashboard — tidak perlu CLI.*
