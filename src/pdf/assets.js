const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const { isAllowedLogoUrl } = require('../utils/safeUrl');
const { formatMoneyForInvoice, displayInvoiceNumber } = require('./format');

async function loadLogoBuffer(logoUrl) {
  try {
    if (!logoUrl || !isAllowedLogoUrl(logoUrl)) return null;
    if (logoUrl.startsWith('/uploads/logos/')) {
      return fs.readFile(path.join(process.cwd(), logoUrl.replace(/^\//, '')));
    }
    const base = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!base) return null;
    const parsed = new URL(logoUrl);
    const baseUrl = new URL(base);
    if (parsed.origin !== baseUrl.origin || !parsed.pathname.startsWith('/uploads/logos/')) {
      return null;
    }
    const res = await fetch(logoUrl, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength > 2 * 1024 * 1024) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

async function buildPaymentQR(invoice, profile) {
  const fields = [
    profile.bank_name && `Bank:${profile.bank_name}`,
    profile.account_number && `Account:${profile.account_number}`,
    profile.account_name && `Name:${profile.account_name}`,
    `Invoice:${displayInvoiceNumber(invoice)}`,
    `Amount:${formatMoneyForInvoice(invoice.total_amount, invoice)}`
  ].filter(Boolean);
  if (fields.length < 3) return null;
  const dataUrl = await QRCode.toDataURL(fields.join('\n'), { margin: 1, width: 120 });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

module.exports = { loadLogoBuffer, buildPaymentQR };
