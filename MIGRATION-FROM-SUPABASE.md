# Migrating from paused Supabase to self-hosted PostgreSQL

Your Supabase project (`naira-invoice-prod`) is **paused**. The app no longer uses Supabase Auth or the Supabase API.

## Option A — Start fresh (fastest)

1. Deploy the new stack on Render using `render.yaml` (PostgreSQL + web service).
2. Sign up again at `/signup.html`.
3. Re-enter business profile and recreate clients/invoices.

## Option B — Export data from Supabase (before data expires)

1. In Supabase dashboard → **Resume project** (you have until the pause deadline).
2. Export tables as CSV from **Table Editor** or use `pg_dump` with the database connection string from **Settings → Database**.
3. Import into your Render PostgreSQL instance with scripts or manual SQL.
4. Map `auth.users.id` → new `users.id` in Prisma (UUIDs can be preserved if you insert users with matching IDs).

## New stack checklist

| Old (Supabase) | New (self-hosted) |
|----------------|-------------------|
| Supabase Auth | `POST /api/auth/signup`, `/login`, JWT in `localStorage` |
| Supabase Postgres + RLS | PostgreSQL + Prisma + JWT `userId` on every query |
| Supabase Storage (logos) | Local disk `uploads/logos` (or S3 later) |
| `SUPABASE_*` env vars | `DATABASE_URL`, `JWT_*`, optional `REDIS_URL` |

## Verify after deploy

- `GET /api/health` → `{ "ok": true }`
- Sign up → sign in → save profile → create invoice → PDF download
