# NairaInvoice Backend Architecture

## Why Express (not NestJS)

The product already ships as an Express monolith serving static HTML and JSON APIs. Staying on Express keeps deployment and frontend contracts stable while we replace Supabase with Prisma + JWT. NestJS would add ceremony without immediate benefit; modules follow Nest-like boundaries (`routes` → `controller` → `service` → Prisma).

## Stack

| Layer | Choice |
|--------|--------|
| API | Express 4 |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT access + refresh tokens, bcrypt passwords |
| Cache | Redis (ioredis) — optional degrade if unavailable |
| Files | Local disk (`uploads/logos`) — S3-ready later |
| PDF | PDFKit (unchanged templates) |

## Folder layout

```
src/
  config/       env validation (zod), prisma, redis, logger
  middleware/   auth, errors, validation, rate limit
  modules/      auth, profile, clients, invoices, onboarding, analytics
  utils/        pdfGenerator, serialization, AppError
  jobs/         queue scaffold for future workers
prisma/         schema + migrations
public/         vanilla JS frontend (unchanged URLs)
```

## Security

- Helmet, CORS allowlist, express-rate-limit
- Prisma parameterized queries (SQL injection safe)
- JWT on all `/api/*` except auth login/signup/refresh and public invoice routes
- Refresh tokens stored hashed in DB, rotated on refresh
- Soft deletes on clients/invoices/users

## Render deployment

1. Blueprint creates **Web Service** + **PostgreSQL** (`render.yaml`).
2. Add **Redis** (Upstash free or Render Key Value) → set `REDIS_URL`.
3. Set `APP_BASE_URL` to your `.onrender.com` URL.
4. Build runs `prisma migrate deploy`.

## Local development

```bash
cp .env.example .env
npm run docker:up
npm install
npx prisma migrate deploy
npm run dev
```

## Frontend auth migration

- `public/js/api-client.js` stores JWT + patches `fetch` for `/api` calls.
- `public/js/auth.js` uses `/api/auth/login|signup|me|logout`.
- No Supabase SDK.

## Future (prepared)

- `src/jobs/queue.js` — BullMQ workers
- `User.role` — ADMIN for RBAC
- Email verification / password reset token fields on `User`
- Cookie-based refresh tokens (`httpOnly`) alongside localStorage
