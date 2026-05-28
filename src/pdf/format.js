function moneySymbol(code) {
  const c = (code || 'NGN').toUpperCase();
  if (c === 'NGN') return 'NGN ';
  if (c === 'USD') return '$';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  if (c === 'GHS') return 'GH₵';
  if (c === 'KES') return 'KSh';
  return `${c} `;
}

function formatMoney(amount, currency = 'NGN') {
  const sym = moneySymbol(currency);
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMoneyForInvoice(amount, invoice) {
  return formatMoney(amount, invoice?.currency || 'NGN');
}

function displayInvoiceNumber(invoice) {
  const raw = String(invoice.invoice_number || 'INV-0001').toUpperCase();
  if (/^INV-\d{4}-\d{4}$/.test(raw)) return raw;
  const digits = (raw.match(/\d+/g) || []).join('');
  const seq = String(Number(digits || '1')).padStart(4, '0');
  const year = new Date(invoice.invoice_date || Date.now()).getFullYear();
  return `INV-${year}-${seq}`;
}

function formatShortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function statusMeta(invoice, theme) {
  const s = String(invoice.status || '').toLowerCase();
  const isReceipt = invoice.invoice_type === 'receipt';
  let label = 'PENDING';
  let color = theme.statusPending;
  if (isReceipt || s === 'paid') {
    label = isReceipt ? 'COMPLETED' : 'PAID';
    color = theme.statusPaid;
  } else if (s === 'overdue') {
    label = 'OVERDUE';
    color = theme.statusOverdue;
  } else if (s === 'sent') {
    label = 'SENT';
    color = theme.statusSent;
  } else if (s === 'draft') {
    label = 'DRAFT';
    color = theme.statusPending;
  }
  return { label, color };
}

function formatTaxLabel(invoice) {
  const pct = invoice.tax_percentage;
  if (pct == null || pct === '') return 'Tax';
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return 'Tax';
  const display = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `Tax (${display}%)`;
}

module.exports = {
  formatMoney,
  formatMoneyForInvoice,
  displayInvoiceNumber,
  formatShortDate,
  statusMeta,
  formatTaxLabel
};
