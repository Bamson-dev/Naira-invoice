/**
 * Download invoice PDFs with JWT (window.open cannot send Authorization headers).
 */
async function downloadInvoicePdf(invoiceId, filename) {
  if (!invoiceId) {
    throw new Error('Invoice id is required');
  }
  const res = await window.apiClient.apiFetch(`/api/invoices/${invoiceId}/pdf`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not download PDF');
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, filename || `invoice-${invoiceId}.pdf`);
}

async function downloadPublicInvoicePdf(publicToken, filename) {
  if (!publicToken) {
    throw new Error('Invalid invoice link');
  }
  const res = await fetch(`/api/invoices/public/${encodeURIComponent(publicToken)}/pdf`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not download PDF');
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, filename || `invoice-${publicToken}.pdf`);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^\w.\-]+/g, '_') || 'invoice.pdf';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadInvoicePdfWithToast(invoiceId, filename) {
  try {
    if (typeof showToast === 'function') showToast('Preparing PDF…', 'info');
    await downloadInvoicePdf(invoiceId, filename);
    if (typeof showToast === 'function') showToast('PDF downloaded', 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast(err.message || 'PDF download failed', 'error');
    else alert(err.message || 'PDF download failed');
  }
}

window.downloadInvoicePdf = downloadInvoicePdf;
window.downloadPublicInvoicePdf = downloadPublicInvoicePdf;
window.downloadInvoicePdfWithToast = downloadInvoicePdfWithToast;
