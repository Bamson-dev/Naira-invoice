# Render setup (manual web service)

If you see:

```text
DATABASE_URL: expected string, received undefined
JWT_ACCESS_SECRET: expected string, received undefined
JWT_REFRESH_SECRET: expected string, received undefined
```

your web service is missing env vars and/or PostgreSQL.

## Step 1 — Create PostgreSQL (if you don't have one)

1. Render Dashboard → **New** → **PostgreSQL**
2. Name: `naira-invoice-db` (any name is fine)
3. Plan: **Free**
4. Create database

## Step 2 — Link database to your web service

1. Open your **PostgreSQL** service → **Connect**
2. Choose your **web service** (`naira-invoice` or similar)
3. This adds **`DATABASE_URL`** automatically

**Or manually:** copy **Internal Database URL** and paste into web service → **Environment** → `DATABASE_URL`.

## Step 3 — Add JWT secrets

Web service → **Environment** → **Add Environment Variable**:

| Key | Value |
|-----|--------|
| `JWT_ACCESS_SECRET` | Run locally: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Run again: `openssl rand -hex 32` (different value) |

## Step 4 — Add app URLs

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `APP_BASE_URL` | `https://YOUR-SERVICE.onrender.com` |
| `CORS_ORIGINS` | `https://YOUR-SERVICE.onrender.com` |

(`REDIS_URL` is optional — leave empty if you don't use Redis.)

## Step 5 — Fix build & start commands

Web service → **Settings**:

| Field | Value |
|-------|--------|
| **Build Command** | `npm install && npm run build && npx prisma migrate deploy` |
| **Start Command** | `npm start` |

## Step 6 — Redeploy

**Manual Deploy** → Deploy latest commit.

## Step 7 — Verify

Open: `https://YOUR-SERVICE.onrender.com/api/health`

Expected: `{"ok":true,"service":"naira-invoice",...}`

Then sign up at `/signup.html`.

## Alternative: Blueprint (auto env + DB)

**New** → **Blueprint** → connect repo `Bamson-dev/Naira-invoice`.

Render reads `render.yaml` and creates web + Postgres + JWT secrets for you.
