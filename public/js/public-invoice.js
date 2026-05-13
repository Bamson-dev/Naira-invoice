(async function () {
  const token = window.location.pathname.split('/').filter(Boolean).pop();
  const root = document.getElementById('public-invoice-root');
  if (!token) {
    root.innerHTML = '<p class="message error">Invalid invoice link.</p>';
    return;
  }

  try {
    await fetch(`/api/invoices/public/${token}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'viewed' })
    });

    const res = await fetch(`/api/invoices/public/${token}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      root.innerHTML = `<p class="message error">${body.error || 'Invoice not available.'}</p>`;
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

    root.innerHTML = `
      <section class="public-hero">
        <div>
          <p class="portal-badge">SECURE SHARED INVOICE</p>
          <h1>${inv.invoice_type === 'receipt' ? 'Receipt' : 'Invoice'} ${inv.invoice_number || ''}</h1>
          <p class="page-subtitle">${profile.business_name || 'Business'} · ${(inv.status || '').toUpperCase()} · Due ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div class="public-hero-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.open('/api/invoices/${inv.id}/pdf','_blank')">Download PDF</button>
          <button type="button" class="btn btn-primary btn-sm" disabled>Pay Now (soon)</button>
        </div>
      </section>

      <section class="public-card">
        <h3>Line Items</h3>
        <div class="public-items">
          ${items.map((it) => `<div class="public-item"><div><strong>${it.description || ''}</strong><small>${it.quantity} × ${money(it.unit_price)}</small></div><div>${money(it.line_total)}</div></div>`).join('')}
        </div>
      </section>

      <section class="public-grid">
        <div class="public-card">
          <h3>Invoice Totals</h3>
          <div class="public-total-row"><span>Subtotal</span><strong>${money(inv.subtotal)}</strong></div>
          <div class="public-total-row"><span>Tax</span><strong>${money(inv.tax_amount || 0)}</strong></div>
          <div class="public-total-row is-total"><span>Total</span><strong>${money(inv.total_amount)}</strong></div>
        </div>
        <div class="public-card">
          <h3>Payment Instructions</h3>
          <p class="page-subtitle">Bank: ${profile.bank_name || 'N/A'}</p>
          <p class="page-subtitle">Account Number: ${profile.account_number || 'N/A'}</p>
          <p class="page-subtitle">Account Name: ${profile.account_name || 'N/A'}</p>
          <p class="page-subtitle">Contact: ${profile.email || ''} ${profile.phone ? '· ' + profile.phone : ''}</p>
        </div>
      </section>
    `;
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p class="message error">Could not load invoice page.</p>';
  }
})();
