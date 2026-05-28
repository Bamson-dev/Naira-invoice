try {
  const raw = localStorage.getItem('ni_import_invoice_snapshot');
  const rows = JSON.parse(raw || '[]');
  const el = document.getElementById('import-preview-root');
  if (!Array.isArray(rows) || rows.length === 0) {
    el.innerHTML = '<p class="message">No import data found.</p>';
  } else {
    el.innerHTML =
      '<div class="card">' +
      rows
        .map(
          (r) => `
          <div style="padding:12px;border-bottom:1px solid var(--border);">
            <strong>${r.invoice_number || '-'}</strong> — ${r.status || ''} — ${r.total_amount || ''} ${r.currency || 'NGN'}
          </div>`
        )
        .join('') +
      '</div>';
  }
} catch {
  document.getElementById('import-preview-root').innerHTML =
    '<p class="message error">Could not read import data.</p>';
}
