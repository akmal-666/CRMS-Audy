# CRMS – Change Request Management System

Enterprise-grade IT Change Request Management System built on the Cloudflare platform.

## Architecture

```
crms/
├── apps/
│   ├── api/          # Cloudflare Workers + Hono backend
│   └── web/          # Next.js 15 frontend (Cloudflare Pages)
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations
│   └── types/        # Shared TypeScript types
└── .github/
    └── workflows/    # GitHub Actions CI/CD
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui |
| State | TanStack Query, TanStack Table |
| DnD | dnd-kit |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend | Cloudflare Workers, Hono |
| ORM | Drizzle ORM |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Cache | Cloudflare KV |
| Queue | Cloudflare Queues |
| Auth | JWT (jose) + bcryptjs |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Cloudflare account

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
cp apps/api/.dev.vars.example apps/api/.dev.vars
# Edit .dev.vars with your values
```

### 3. Create Cloudflare resources
```bash
# Create D1 database
wrangler d1 create crms-db

# Create R2 bucket
wrangler r2 bucket create crms-attachments

# Create KV namespace
wrangler kv:namespace create CACHE

# Create queue
wrangler queues create crms-email-queue
```

### 4. Update wrangler.toml
Edit `apps/api/wrangler.toml` with the IDs from step 3.

### 5. Run migrations
```bash
wrangler d1 migrations apply crms-db --local
```

### 6. Set API secrets
```bash
cd apps/api
echo "your-jwt-secret-here" | wrangler secret put JWT_SECRET
```

### 7. Start development
```bash
# Terminal 1: API
pnpm --filter @crms/api dev

# Terminal 2: Web
pnpm --filter @crms/web dev
```

### URLs
- Web app: http://localhost:3000
- API: http://localhost:8787
- Public portal: http://localhost:3000/submit

## Default Credentials
```
Admin:    admin@crms.local / Admin@1234
Manager:  manager@crms.local / Admin@1234
```
> Note: Seed data uses placeholder password hashes. Run the proper seed script after generating real bcrypt hashes.

## User Roles

| Role | Description |
|------|-------------|
| Administrator | Full system access |
| Manager | Can assign and manage requests |
| Business Analyst | Assessment and analysis |
| Developer | Development tasks |
| QA | Quality assurance |
| UAT User | User acceptance testing |
| Vendor | External vendor access |
| Requester | Submit requests only |

## Workflow

```
In Pipeline → Assessment → Development → UAT → Deployment → Go Live
                                  ↑______________↓ (Return)
                                  ↑____________________________↓ (Rollback)
Any status → Drop
```

## Deployment

Push to `main` branch triggers automatic deployment via GitHub Actions:
- API → Cloudflare Workers
- Web → Cloudflare Pages

### Required GitHub Secrets
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_API_URL`

## API Documentation

Base URL: `https://crms-api.your-subdomain.workers.dev`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |
| GET | /api/work-items | List requests |
| POST | /api/work-items/public/submit | Submit request (no auth) |
| GET | /api/work-items/:id | Get request detail |
| PATCH | /api/work-items/:id/status | Update status |
| PATCH | /api/work-items/:id/assign | Assign team |
| PUT | /api/work-items/:id/assessment | Update assessment |
| GET | /api/dashboard/stats | Dashboard stats |
| GET | /api/notifications | Get notifications |
| GET | /api/master/departments | List departments |
| GET | /api/master/branches | List branches |
| GET | /api/master/vendors | List vendors |
