const path = require('path');

/** Only allow logos served from this app (blocks SSRF via profile.logo_url). */
function isAllowedLogoUrl(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  const trimmed = logoUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/uploads/logos/') && !trimmed.includes('..')) {
    return true;
  }

  const base = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return false;

  try {
    const parsed = new URL(trimmed);
    const baseUrl = new URL(base);
    if (parsed.origin !== baseUrl.origin) return false;
    return parsed.pathname.startsWith('/uploads/logos/') && !parsed.pathname.includes('..');
  } catch {
    return false;
  }
}

function safePdfFilename(invoiceNumber) {
  const safe = String(invoiceNumber || 'invoice')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 80);
  return `${safe || 'invoice'}.pdf`;
}

module.exports = { isAllowedLogoUrl, safePdfFilename };
