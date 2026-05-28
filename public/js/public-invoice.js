(async function () {
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (v) => String(v ?? '');
  const token = window.location.pathname.split('/').filter(Boolean).pop();
  const root = document.getElementById('public-invoice-root');
  if (!token) {
    root.innerHTML = '<p class="message error">Invalid invoice link.</p>';
    return;
  }

  try {
    await fetch(`/api/invoices/public/${encodeURIComponent(token)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'viewed' })
    });

    const res = await fetch(`/api/invoices/public/${encodeURIComponent(token)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      root.innerHTML = `<p class="message error">${esc(body.error || 'Invoice not available.')}</p>`;
      return;
    }

    const inv = body.invoice || {};
    const profile = body.profile || {};
    const money = (n) => {
      const code = (inv.currency || 'NGN').toUpperCase();
      const map = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh' };
      const sym = map[code] || code + ' ';
      return sym + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const items = Array.isArray(inv.invoice_items) ? inv.invoice_items : [];
    const docLabel = inv.invoice_type === 'receipt' ? 'Receipt' : 'Invoice';
    const dueLabel = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A';

    root.innerHTML = `
      <section class="public-hero">
        <div>
          <p class="portal-badge">SECURE SHARED INVOICE</p>
          <h1>${esc(docLabel)} ${esc(inv.invoice_number || '')}</h1>
          <p class="page-subtitle">${esc(profile.business_name || 'Business')} · ${esc((inv.status || '').toUpperCase())} · Due ${esc(dueLabel)}</p>
        </div>
        <div class="public-hero-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="public-pdf-btn">Download PDF</button>
          <button type="button" class="btn btn-primary btn-sm" disabled>Pay Now (soon)</button>
        </div>
      </section>

      <section class="public-card">
        <h3>Line Items</h3>
        <div class="public-items">
          ${items
            .map(
              (it) =>
                `<div class="public-item"><div><strong>${esc(it.description || '')}</strong><small>${esc(it.quantity)} × ${esc(money(it.unit_price))}</small></div><div>${esc(money(it.line_total))}</div></div>`
            )
            .join('')}
        </div>
      </section>

      <section class="public-grid">
        <div class="public-card">
          <h3>Invoice Totals</h3>
          <div class="public-total-row"><span>Subtotal</span><strong>${esc(money(inv.subtotal))}</strong></div>
          <div class="public-total-row"><span>Tax</span><strong>${esc(money(inv.tax_amount || 0))}</strong></div>
          <div class="public-total-row is-total"><span>Total</span><strong>${esc(money(inv.total_amount))}</strong></div>
        </div>
        <div class="public-card">
          <h3>Payment Instructions</h3>
          <p class="page-subtitle">Bank: ${esc(profile.bank_name || 'N/A')}</p>
          <p class="page-subtitle">Account Number: ${esc(profile.account_number || 'N/A')}</p>
          <p class="page-subtitle">Account Name: ${esc(profile.account_name || 'N/A')}</p>
          <p class="page-subtitle">Contact: ${esc(profile.email || '')} ${profile.phone ? '· ' + esc(profile.phone) : ''}</p>
        </div>
      </section>
    `;

    document.getElementById('public-pdf-btn')?.addEventListener('click', () => {
      downloadPublicInvoicePdf(token, `${inv.invoice_number || 'invoice'}.pdf`).catch((err) => {
        alert(err.message || 'Could not download PDF');
      });
    });
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p class="message error">Could not load invoice page.</p>';
  }
})();
