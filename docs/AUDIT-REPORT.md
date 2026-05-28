# NairaInvoice — Production Audit Report

**Date:** 2026-05-28  
**Stack:** Express + Prisma + PostgreSQL, vanilla JS frontend, Render deployment  
**Scope:** Full-stack stabilization (backend, frontend, DB, auth, PDF, public invoices, deployment)

---

## Executive summary

A systematic audit identified **security and data-integrity issues** (IDOR on `client_id`, trusted client totals, SSRF via `logo_url`, XSS on public invoice pages, auth/session UX bugs). Critical fixes were implemented in this pass; remaining items are documented as technical debt below.

---

## 1. Bug report by severity

### Critical (fixed in this pass)

| Issue | Root cause | Fix |
|--------|------------|-----|
| **IDOR on invoice `client_id`** | `createInvoice` / `updateInvoice` did not verify client ownership | `assertClientOwned()` wired via `prepareServerTotals()` |
| **Trusted invoice totals** | Server stored `subtotal` / `total_amount` from request body | `src/utils/invoiceTotals.js` recalculates all amounts server-side |
| **SSRF via profile logo URL** | `pdfGenerator` fetched arbitrary `https://` URLs | `safeUrl.isAllowedLogoUrl()` + disk read for `/uploads/logos/` only |
| **XSS on public invoice page** | Unescaped `innerHTML` with invoice/client text | `escapeHtml` on all dynamic fields in `public-invoice.js` |
| **Mark paid via PUT** | `status: paid` accepted on generic update | Removed `status` / payment fields from `updateInvoice`; use `markPaid` only |
| **PDF auth JSON in browser** | Opening `/api/.../pdf` without JWT | Blob download via `download-pdf.js` (prior fix, retained) |

### High (fixed or mitigated)

| Issue | Root cause | Fix |
|--------|------------|-----|
| **Dashboard login bounce** | `apiFetch` called patched `fetch` recursively | `nativeFetch` in `api-client.js` (prior fix) |
| **`requireAuth` on network error** | `catch` redirected to login on any failure | Returns `null` without redirect on network errors |
| **Stale analytics after mutations** | `invalidateUserCaches` unused | Called from invoice/profile/client mutations |
| **Public link events ignore expiry** | `logPublicEvent` skipped `expiresAt` check | Same 410 logic as `getPublicInvoice` |
| **Public links never expire** | `expiresAt` null on create | Default **1 year** expiry; backfill on existing links |
| **CSV export broken newlines** | Literal `'\\n'` in `join` | Correct `'\n'` |
| **Profile logo upload errors** | Multer route not in `asyncHandler` | Wrapped; MIME whitelist (PNG/JPEG/WebP/GIF) |
| **Unsafe PDF filenames** | Raw `invoice_number` in `Content-Disposition` | `safePdfFilename()` |
| **Auth brute force** | Global rate limit only | Stricter `/api/auth` limiter (30 / 15 min) |

### Medium (partially addressed / debt)

| Issue | Status |
|--------|--------|
| No Zod on invoice/client/profile bodies | Only auth validated; recommend `invoice.validation.js` |
| `onclick=` handlers vs CSP | `scriptSrcAttr: unsafe-inline` — migrate to `addEventListener` |
| Dashboard/invoices list XSS | `escape.js` added to pages; list rows still use mostly static IDs — escape user names in follow-up |
| Paid invoice edit | Now blocked server-side (`INVOICE_LOCKED`) |
| Integration tests against real DB | Unit tests only (`npm test`) |
| Render ephemeral disk for logos | Logos lost on redeploy — use R2/S3 or DB blob storage |

### Low

| Issue | Notes |
|--------|--------|
| Duplicate list queries (events N+1) | Acceptable at small scale; batch or view later |
| `vercel.env` untracked | Do not commit; remove from deploy docs |
| Mixed `fetch` vs `apiFetch` on clients page | Should use `apiFetch` for auth header consistency |

---

## 2. Root cause highlights

1. **Trust boundary at API** — Frontend calculated totals correctly for UX, but the API must recompute. Attackers could POST `total_amount: 0` with valid-looking line items.
2. **Multi-tenant isolation** — Any UUID field (`client_id`) must be scoped to `userId` before write.
3. **URL fetch in PDF pipeline** — User-controlled URLs in server-side `fetch` are SSRF vectors; restrict to same-origin upload paths.
4. **Session UX vs security** — Distinguish 401 (clear session) from network errors (keep session, show retry).

---

## 3. Files changed (this stabilization pass)

**Backend**

- `src/modules/invoices/invoice.service.js` — totals, IDOR, cache, public link expiry, paid lock
- `src/modules/invoices/invoice.controller.js` — safe PDF filenames
- `src/modules/profile/profile.service.js` — logo URL validation, MIME, cache
- `src/modules/profile/profile.controller.js` — async upload handler
- `src/modules/profile/profile.routes.js`
- `src/modules/clients/client.service.js` — cache invalidation
- `src/utils/invoiceTotals.js` *(new)*
- `src/utils/safeUrl.js` *(new)*
- `src/utils/sanitizeHtml.js` *(new)*
- `src/utils/pdfGenerator.js` — safe logo loading
- `src/app.js` — auth rate limit

**Frontend**

- `public/js/public-invoice.js` — XSS escape
- `public/js/toast.js`, `clients.js`, `invoice.js` — escape / duplicate submit guards
- `public/*.html` — `escape.js` script includes

**Tests & docs**

- `tests/invoice-totals.test.js`, `tests/safe-url.test.js`
- `package.json` — `"test": "node --test tests/*.test.js"`
- `docs/AUDIT-REPORT.md` *(this file)*

---

## 4. Architecture (current)

```
public/          Static UI + vanilla JS
src/
  app.js         Express app, helmet, CORS, rate limits
  modules/       auth | profile | clients | invoices | onboarding | analytics
  middleware/    auth, validate, errors
  utils/         PDF, serialize, totals, safeUrl, cache
prisma/          PostgreSQL schema + migrations
```

**Recommended next refactor:** `src/validators/` with Zod schemas shared by routes; `src/services/` naming already consistent per module.

---

## 5. Performance

- Analytics summary cached 120s — invalidated on invoice/client/profile writes.
- Invoice list loads view events in one query (not per row).
- PDF logo: local disk read when possible (no network).

**Future:** Pagination on `GET /api/invoices`, composite index on `(user_id, deleted_at, created_at)`.

---

## 6. Security improvements

- Server-side totals + client ownership checks
- Logo URL allowlist + upload MIME validation
- Auth endpoint rate limiting
- HTML escaping on public invoice surface
- Public link expiry enforced on view events and GET
- Helmet CSP (scripts self; attr inline for legacy onclick)

---

## 7. Deployment (Render)

**Required env:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `APP_BASE_URL`, `CORS_ORIGINS`  
**Optional:** `REDIS_URL`, `AUTH_RATE_LIMIT_MAX`, `UPLOAD_DIR`

**Build:** `npm install && npm run build && npx prisma migrate deploy`  
**Start:** `npm start`

**Note:** Free tier has ephemeral filesystem — logo uploads do not survive redeploys without external storage.

---

## 8. Verification checklist

Run locally or on Render after deploy:

```bash
npm test
curl -s https://YOUR_APP/api/health
```

Manual:

- [ ] Signup → dashboard (no login bounce)
- [ ] Save profile → create invoice → totals match line items
- [ ] Mark paid → edit blocked
- [ ] Public link `/i/:token` loads escaped content
- [ ] PDF download (authenticated + public)
- [ ] Dismiss onboarding; stays dismissed
- [ ] Mobile layout on dashboard + create invoice

---

## 9. Remaining technical debt

1. Zod validation for invoices, clients, profile, onboarding payloads
2. Replace inline `onclick` with delegated listeners (tighter CSP)
3. Escape user-controlled strings in `dashboard.js` and `invoices-list.js` row templates
4. Persist uploads to S3/R2 or Supabase Storage equivalent
5. Full integration test suite (supertest + test DB)
6. Password reset email delivery (if not configured)
7. Pagination + DB indexes for large tenants

---

## 10. Recommended next improvements

1. **Object storage** for logos (Cloudflare R2 free tier fits well)
2. **Email** (Resend/SendGrid) for invoice sent + payment reminders
3. **Webhook / pay stack** for “Pay Now” on public invoice page
4. **Observability** — structured errors to Sentry, request IDs
5. **CI** — GitHub Action running `npm test` + `prisma validate` on PRs

---

*Report generated as part of production stabilization. Re-run audit after major feature work.*
