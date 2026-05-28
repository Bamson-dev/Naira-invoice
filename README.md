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
- Node.js
- Express
- Supabase (Postgres + Auth + Storage)
- PDFKit (document generation)
- QRCode (payment info QR rendering)

### Frontend
- HTML/CSS/Vanilla JavaScript
- Supabase JS client
- Responsive mobile-first UI patterns

---

## Project Structure

```text
.
├── controllers/         # API controller logic
├── routes/              # Express routes
├── utils/               # Supabase + PDF utilities
├── public/              # Frontend pages, JS, CSS
├── DATABASE-SETUP.sql   # Supabase schema + policies
├── server.js            # App entrypoint
└── package.json
```

---

## Local Development

### Prerequisites
- Node.js 18+ (or newer)
- Supabase project

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env`:

```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
```

### 3) Run database setup
- Open Supabase SQL editor
- Run `DATABASE-SETUP.sql`

### 4) Start app

```bash
npm start
```

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
3. Build command: `npm install && npm run build`  
4. Start command: `npm start`  
5. Plan: **Free**

### 3) Environment variables

In the service → **Environment**:

```env
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
APP_BASE_URL=https://naira-invoice.onrender.com
```

Set `APP_BASE_URL` to your actual Render URL (e.g. `https://<service-name>.onrender.com`) after the first deploy. Render sets `PORT` automatically — do not override it.

### 4) Run SQL migration in Supabase
- Ensure latest schema exists before production use

### 5) Verify production smoke tests
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
- Row Level Security policies for user-scoped access
- service-role enabled paths for backend operations

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