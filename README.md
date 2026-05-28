# NairaInvoice

Premium, mobile-first invoicing and financial operations platform for Nigerian freelancers and small business owners.

**Author & Builder:** Bamidele Matthew

---

## Overview

NairaInvoice helps service businesses create, share, and track invoices quickly without complex accounting workflows.

The product is designed around one core goal:

> Send invoices fast, get paid faster.

It combines:
- quick invoice creation (including temporary clients),
- professional PDF invoices and receipts,
- public invoice links for easy sharing,
- WhatsApp-friendly payment follow-up workflows,
- operational dashboard visibility.

---

## Core Product Capabilities

### 1) Quick Invoice Flow
- Create invoice in seconds with only:
  - client name
  - description
  - amount
- No forced client creation before sending invoice
- Advanced options available under **More Options**
- Auto-save draft support

### 2) Saved Client Invoice Flow
- Use existing clients for repeat billing
- Add/edit line items with totals calculation
- Tax and discount support

### 3) Smart Client Handling
- Live existing-client detection while typing
- Supports temporary client data attached to invoice
- Prompt to save temporary client after invoice creation

### 4) Invoice Sharing + Collections
- One-click WhatsApp reminder
- Copy public invoice link
- Download PDF
- Mark invoice as paid

### 5) Dashboard (Financial Operations View)
- Outstanding revenue
- Collected this month
- Overdue amount
- Due this week
- Action-required follow-up queue
- Recent activity and recent invoices

### 6) Public Invoice Experience
- Hosted invoice page via secure tokenized link
- Invoice view tracking/events
- Client-readable mobile layout

### 7) Premium PDF System
- Distinct invoice + receipt rendering
- Structured financial hierarchy
- Status badges and amount emphasis
- Payment details card + optional QR info block
- Branding controls:
  - logo
  - accent color
  - signature
  - watermark text
  - footer text

### 8) Multi-Template PDF Styles
- Modern Fintech
- Executive Black
- Creative Studio
- Ivory Luxe
- Midnight Editorial

---

## Tech Stack

### Backend
- Node.js + Express (modular `src/modules/*`)
- PostgreSQL + Prisma ORM
- JWT authentication + bcrypt
- Redis (caching; optional at runtime)
- PDFKit + QRCode

### Frontend
- HTML/CSS/Vanilla JavaScript
- JWT via `public/js/api-client.js`
- Responsive mobile-first UI patterns

---

## Project Structure

```text
.
├── src/                 # API (modules, middleware, config)
├── prisma/              # Schema + migrations
├── public/              # Frontend pages, JS, CSS
├── web/                 # Vite marketing homepage
├── docker-compose.yml   # Local Postgres + Redis
├── render.yaml          # Render blueprint
└── ARCHITECTURE.md      # Backend design notes
```

---

## Local Development

### Prerequisites
- Node.js 18+ (or newer)
- Docker (for local Postgres + Redis)

### 1) Install dependencies

```bash
npm install
```

### 2) Start PostgreSQL + Redis (Docker)

```bash
cp .env.example .env
# Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (32+ chars each)
npm run docker:up
```

### 3) Migrate database & run API

```bash
npm install
npx prisma migrate deploy
npm run dev
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for backend design. Legacy `DATABASE-SETUP.sql` was for Supabase only.

Open:
- `http://localhost:3000`

---

## Deployment Guide (Render — free tier)

Render runs this app as a long-lived Node web service (same model as Railway). The free plan sleeps after ~15 minutes of no traffic; the first request after sleep may take 30–60 seconds (cold start).

### 1) Push to GitHub
- Repo should include `render.yaml` at the root

### 2) Create the service on Render

**Option A — Blueprint (recommended)**  
1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**  
2. Connect `Bamson-dev/Naira-invoice`  
3. Render reads `render.yaml` and creates the web service  
4. When prompted, enter secret env vars (see below)

**Option B — Manual web service**  
1. **New** → **Web Service** → connect the GitHub repo  
2. Runtime: **Node**  
3. Build command: `npm install && npm run build && npx prisma migrate deploy`  
4. Start command: `npm start`  
5. Plan: **Free**  
6. Add **PostgreSQL** (Render free DB or external) — link `DATABASE_URL`

### 3) Environment variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...          # Upstash free tier works
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
APP_BASE_URL=https://your-app.onrender.com
CORS_ORIGINS=https://your-app.onrender.com
```

Blueprint `render.yaml` provisions the web service + Postgres. Add Redis separately.

### 4) Verify production smoke tests
- login/signup
- create quick invoice
- PDF download
- public invoice link open
- WhatsApp reminder flow
- mark paid flow

---

## Database Highlights

Main entities:
- `business_profiles`
- `clients`
- `invoices`
- `invoice_items`
- `onboarding_progress`
- `invoice_public_links`
- `invoice_events`

Security:
- JWT auth on protected API routes
- Prisma ORM (parameterized queries)
- Per-user data scoped in services by `userId`

---

## Key API Endpoints

### Clients
- `GET /api/clients`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

### Invoices
- `GET /api/invoices`
- `POST /api/invoices`
- `PUT /api/invoices/:id`
- `DELETE /api/invoices/:id`
- `PATCH /api/invoices/:id/mark-paid`
- `POST /api/invoices/:id/duplicate`
- `POST /api/invoices/:id/public-link`
- `GET /api/invoices/:id/pdf`

### Public Invoice
- `GET /i/:token` (public page)
- `GET /api/invoices/public/:token`
- `POST /api/invoices/public/:token/events`

### Profile
- `GET /api/profile`
- `POST /api/profile`
- `POST /api/profile/upload-logo`

---

## Product UX Principles

- Mobile-first, thumb-friendly interactions
- Fast paths before complex setup
- Clear financial hierarchy and trust signals
- Minimal cognitive load for non-technical users
- Action-oriented follow-up workflows

---

## Branding Attribution

This product is authored and built by **Bamidele Matthew**.