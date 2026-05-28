const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { URL } = require('url');

function themeSpec(invoice, profile) {
  const t = String(invoice.invoice_template || 'modern_fintech').toLowerCase();
  const normalized = t === 'modern' ? 'modern_fintech' : t === 'classic' ? 'executive_black' : t === 'minimalist' ? 'creative_studio' : t;
  const customAccent = profile?.brand_accent_color;
  const fallback = {
    name: 'Modern Fintech',
    background: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    accent: customAccent || '#6D28D9',
    accentSoft: '#F5F3FF',
    line: '#E2E8F0',
    statusPaid: '#16A34A',
    statusOverdue: '#DC2626',
    statusSent: '#D97706',
    statusPending: '#2563EB'
  };
  if (normalized === 'executive_black') {
    return {
      ...fallback,
      name: 'Executive Black',
      background: '#0B0B0C',
      text: '#F8FAFC',
      muted: '#CBD5E1',
      accent: customAccent || '#D4AF37',
      accentSoft: '#111215',
      line: '#2A2D33'
    };
  }
  if (normalized === 'creative_studio') {
    return {
      ...fallback,
      name: 'Creative Studio',
      background: '#FFFFFF',
      text: '#111827',
      muted: '#6B7280',
      accent: customAccent || '#7C3AED',
      accentSoft: '#EEF2FF',
      line: '#E5E7EB',
      accent2: '#EC4899'
    };
  }
  if (normalized === 'ivory_luxe') {
    return {
      ...fallback,
      name: 'Ivory Luxe',
      background: '#FFFEFA',
      text: '#1F2937',
      muted: '#6B7280',
      accent: customAccent || '#9A6C2F',
      accentSoft: '#F7F0E8',
      line: '#E7DED2'
    };
  }
  if (normalized === 'midnight_editorial') {
    return {
      ...fallback,
      name: 'Midnight Editorial',
      background: '#111827',
      text: '#F9FAFB',
      muted: '#C7D2FE',
      accent: customAccent || '#22D3EE',
      accentSoft: '#1F2937',
      line: '#334155'
    };
  }
  return fallback;
}

function moneySymbol(code) {
  const c = (code || 'NGN').toUpperCase();
  // Some PDF viewers/fonts render the Naira glyph poorly.
  // Use NGN prefix for guaranteed cross-viewer correctness.
  if (c === 'NGN') return 'NGN ';
  if (c === 'USD') return '$';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  if (c === 'GHS') return 'GH₵';
  if (c === 'KES') return 'KSh';
  return c + ' ';
}

function formatAmount(amount, invoice) {
  const sym = moneySymbol(invoice.currency);
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayInvoiceNumber(invoice) {
  const raw = String(invoice.invoice_number || 'INV-0001').toUpperCase();
  if (/^INV-\d{4}-\d{4}$/.test(raw)) return raw;
  const digits = (raw.match(/\d+/g) || []).join('');
  const seq = String(Number(digits || '1')).padStart(4, '0');
  const year = new Date(invoice.invoice_date || Date.now()).getFullYear();
  return `INV-${year}-${seq}`;
}

function statusLabel(invoice) {
  const s = String(invoice.status || '').toLowerCase();
  const isReceipt = invoice.invoice_type === 'receipt';
  if (isReceipt) return s === 'paid' ? 'COMPLETED' : 'PAID';
  if (s === 'paid') return 'PAID';
  if (s === 'overdue') return 'OVERDUE';
  if (s === 'sent') return 'SENT';
  return 'PENDING';
}

function statusColor(invoice, theme) {
  const s = String(invoice.status || '').toLowerCase();
  if (invoice.invoice_type === 'receipt') return theme.statusPaid;
  if (s === 'paid') return theme.statusPaid;
  if (s === 'overdue') return theme.statusOverdue;
  if (s === 'sent') return theme.statusSent;
  return theme.statusPending;
}

const fs = require('fs/promises');
const path = require('path');
const { isAllowedLogoUrl } = require('./safeUrl');

async function loadLogoBuffer(logoUrl) {
  try {
    if (!logoUrl || !isAllowedLogoUrl(logoUrl)) return null;

    if (logoUrl.startsWith('/uploads/logos/')) {
      const diskPath = path.join(process.cwd(), logoUrl.replace(/^\//, ''));
      return await fs.readFile(diskPath);
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
    `Amount:${formatAmount(invoice.total_amount, invoice)}`
  ].filter(Boolean);
  if (fields.length < 3) return null;
  const dataUrl = await QRCode.toDataURL(fields.join('\n'), { margin: 1, width: 90 });
  const b64 = dataUrl.split(',')[1];
  return Buffer.from(b64, 'base64');
}

function drawAmountHero(doc, invoice, theme, isReceipt) {
  if (theme.name === 'Ivory Luxe') {
    doc.roundedRect(50, 136, 495, isReceipt ? 78 : 96, 2).fill(theme.accentSoft);
    doc.rect(50, 136, 6, isReceipt ? 78 : 96).fill(theme.accent);
  } else if (theme.name === 'Midnight Editorial') {
    const grad = doc.linearGradient(50, 136, 545, 136);
    grad.stop(0, '#1E293B').stop(1, '#0F172A');
    doc.roundedRect(50, 136, 495, isReceipt ? 78 : 96, 16).fill(grad);
  } else {
    doc.roundedRect(50, 136, 495, isReceipt ? 78 : 96, 14).fill(theme.accentSoft);
  }
  doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text(isReceipt ? 'Amount Paid' : 'Amount Due', 72, 158);
  doc
    .fillColor(theme.accent)
    .font('Helvetica-Bold')
    .fontSize(isReceipt ? 28 : 30)
    .text(formatAmount(invoice.total_amount, invoice), 72, 174, { width: 450, lineGap: 2 });
}

function drawPartyColumns(doc, invoice, profile, theme) {
  const leftX = 50;
  const rightX = 320;
  const top = 252;
  doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text('FROM', leftX, top);
  doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(12).text(profile.business_name || 'Business', leftX, top + 14);
  doc.font('Helvetica').fontSize(10).fillColor(theme.muted);
  if (profile.business_address) doc.text(profile.business_address, leftX, top + 32, { width: 230 });
  const fromContact = [profile.email, profile.phone].filter(Boolean).join(' · ');
  if (fromContact) doc.text(fromContact, leftX, top + 68, { width: 230 });

  doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text('BILL TO', rightX, top);
  const billToName =
    invoice.clients?.client_name || invoice.temp_client_name || 'Client';
  const billToAddress =
    invoice.clients?.client_address || invoice.temp_client_address || null;
  doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(12).text(billToName, rightX, top + 14);
  doc.font('Helvetica').fontSize(10).fillColor(theme.muted);
  if (billToAddress) doc.text(billToAddress, rightX, top + 32, { width: 225 });
  const toEmail = invoice.clients?.client_email || invoice.temp_client_email;
  const toPhone = invoice.clients?.client_phone || invoice.temp_client_phone;
  const toContact = [toEmail, toPhone].filter(Boolean).join(' · ');
  if (toContact) doc.text(toContact, rightX, top + 68, { width: 225 });
}

function drawLineItems(doc, invoice, theme) {
  const items = (invoice.invoice_items || []).filter((it) => String(it.description || '').trim());
  const startY = 360;
  const x = [50, 340, 395, 470];
  const widths = [280, 45, 70, 75];
  const headerRadius = theme.name === 'Ivory Luxe' ? 2 : 8;
  doc.roundedRect(50, startY, 495, 26, headerRadius).fill(theme.accentSoft);
  ['Description', 'Qty', 'Unit Price', 'Total'].forEach((h, i) => {
    doc.fillColor(theme.muted).font('Helvetica-Bold').fontSize(9).text(h, x[i], startY + 9, { width: widths[i], align: i === 0 ? 'left' : 'right' });
  });

  let y = startY + 34;
  items.forEach((item, idx) => {
    if (theme.name === 'Midnight Editorial') {
      doc.roundedRect(50, y - 4, 495, 24, 6).fill(idx % 2 === 0 ? '#1F2937' : '#111827');
    } else if (idx % 2 === 0) {
      doc.rect(50, y - 4, 495, 24).fill(theme.background === '#0B0B0C' ? '#0F1116' : '#FAFAFB');
    }
    doc.fillColor(theme.text).font('Helvetica').fontSize(10).text(item.description, x[0], y, { width: widths[0] });
    doc.text(String(item.quantity || 0), x[1], y, { width: widths[1], align: 'right' });
    doc.text(formatAmount(item.unit_price, invoice), x[2], y, { width: widths[2], align: 'right' });
    const lineTotal = formatAmount(item.line_total, invoice);
    doc.font('Helvetica-Bold').fontSize(10);
    const lineTotalW = doc.widthOfString(lineTotal);
    doc.text(lineTotal, x[3] + widths[3] - lineTotalW, y, { lineBreak: false });
    doc.font('Helvetica').fontSize(10);
    y += 26;
  });
  return y + 6;
}

const SUMMARY_LEFT = 320;
const SUMMARY_RIGHT = 545;

function formatTaxLabel(invoice) {
  const pct = invoice.tax_percentage;
  if (pct == null || pct === '') return 'Tax';
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return 'Tax';
  const display = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `Tax (${display}%)`;
}

/**
 * One summary line: label on the left, amount flush-right on a single baseline.
 * Uses widthOfString (no wrap box) so large NGN totals cannot stack on the next row.
 * Returns the Y for the next row.
 */
function drawSummaryRow(doc, theme, y, label, amount, { bold = false, size = 10 } = {}) {
  const valueFont = bold ? 'Helvetica-Bold' : 'Helvetica';
  const rowHeight = size + 10;

  doc.fillColor(theme.muted).font('Helvetica').fontSize(size);
  doc.text(label, SUMMARY_LEFT, y, { lineBreak: false });

  doc.fillColor(bold ? theme.accent : theme.text).font(valueFont).fontSize(size);
  const amountWidth = doc.widthOfString(amount);
  doc.text(amount, SUMMARY_RIGHT - amountWidth, y, { lineBreak: false });

  return y + rowHeight;
}

function drawSummaryAndPayment(doc, invoice, profile, theme, startY, qrBuffer) {
  // Keep summary below line-items table (prevents collision with the last row's amount column)
  let y = Math.max(startY + 16, 430);

  y = drawSummaryRow(doc, theme, y, 'Subtotal', formatAmount(invoice.subtotal, invoice));
  if (Number(invoice.tax_amount || 0) > 0) {
    y = drawSummaryRow(doc, theme, y, formatTaxLabel(invoice), formatAmount(invoice.tax_amount, invoice));
  }
  if (Number(invoice.discount_amount || 0) > 0) {
    y = drawSummaryRow(
      doc,
      theme,
      y,
      'Discount',
      `-${formatAmount(invoice.discount_amount, invoice)}`
    );
  }

  y += 6;
  doc.moveTo(SUMMARY_LEFT, y).lineTo(SUMMARY_RIGHT, y).strokeColor(theme.line).lineWidth(1).stroke();
  y += 12;

  y = drawSummaryRow(doc, theme, y, 'Total', formatAmount(invoice.total_amount, invoice), {
    bold: true,
    size: 16
  });

  const cardY = y + 28;
  const bankName = profile.bank_name || profile.bankName;
  const accountNo = profile.account_number || profile.accountNumber;
  const accountName = profile.account_name || profile.accountName;
  const bankLine = bankName ? `Bank: ${bankName}` : 'Bank: —';
  const acctLine = accountNo ? `Account No: ${accountNo}` : 'Account No: —';
  const nameLine = accountName ? `Account Name: ${accountName}` : 'Account Name: —';
  const cardH = !bankName && !accountNo ? 108 : 96;
  doc.roundedRect(50, cardY, 495, cardH, 12).fill(theme.accentSoft);
  doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(10).text('Payment Details', 70, cardY + 12);
  doc.font('Helvetica').fontSize(10).fillColor(theme.muted)
    .text(bankLine, 70, cardY + 31, { width: 220 })
    .text(acctLine, 70, cardY + 46, { width: 220 })
    .text(nameLine, 70, cardY + 61, { width: 220 });
  if (!bankName && !accountNo) {
    doc.fillColor(theme.muted).fontSize(8).text('Add bank details in Profile to show them here.', 70, cardY + 76, { width: 220 });
  }
  doc.fillColor(theme.muted).fontSize(10).text('Payment Instructions:', 300, cardY + 31);
  doc.fillColor(theme.text).text(
    invoice.notes || 'Please pay via bank transfer and share proof of payment.',
    300,
    cardY + 46,
    { width: 175, lineGap: 2 }
  );
  if (qrBuffer) {
    try { doc.image(qrBuffer, 486, cardY + 28, { fit: [46, 46] }); } catch {}
  }
  return cardY + cardH + 16;
}

async function generateInvoicePDF(invoice, profile) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const theme = themeSpec(invoice, profile);
      const logo = await loadLogoBuffer(profile.logo_url);
      const label = invoice.invoice_type === 'receipt' ? 'RECEIPT' : 'INVOICE';
      const invoiceId = displayInvoiceNumber(invoice);
      const qrBuffer = await buildPaymentQR(invoice, profile);

      if (theme.background !== '#FFFFFF') {
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(theme.background);
      }

      if (profile.invoice_watermark_text) {
        doc.save();
        doc.rotate(-28, { origin: [300, 420] });
        doc.fillColor(theme.muted).opacity(0.08).font('Helvetica-Bold').fontSize(72)
          .text(String(profile.invoice_watermark_text).slice(0, 22), 110, 360);
        doc.restore();
        doc.opacity(1);
      }

      if (theme.name === 'Creative Studio') {
        const grad = doc.linearGradient(0, 0, 595, 0);
        grad.stop(0, theme.accent).stop(1, theme.accent2 || theme.accent);
        doc.rect(0, 0, 595, 8).fill(grad);
      }

      doc.fillColor(theme.muted).font('Helvetica-Bold').fontSize(9).text(label, 50, 42);
      doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(17).text(invoiceId, 50, 56);

      if (logo) {
        try { doc.image(logo, 470, 38, { fit: [70, 40], align: 'right' }); } catch {}
      } else {
        doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(12).text(profile.business_name || 'Business', 360, 50, { width: 185, align: 'right' });
      }

      const badge = statusLabel(invoice);
      const badgeColor = statusColor(invoice, theme);
      const badgeRadius = theme.name === 'Ivory Luxe' ? 4 : 12;
      doc.roundedRect(430, 96, 115, 24, badgeRadius).fill(badgeColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text(badge, 430, 104, { width: 115, align: 'center' });
      doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text(`Issued ${new Date(invoice.invoice_date).toLocaleDateString()}`, 50, 100);
      if (invoice.invoice_type === 'invoice' && invoice.due_date) {
        doc.text(`Due ${new Date(invoice.due_date).toLocaleDateString()}`, 150, 100);
      }
      if (invoice.invoice_type === 'receipt') {
        const paidOn = invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : 'N/A';
        doc.text(`Paid ${paidOn}`, 150, 100);
      }

      drawAmountHero(doc, invoice, theme, invoice.invoice_type === 'receipt');
      drawPartyColumns(doc, invoice, profile, theme);
      const afterTable = drawLineItems(doc, invoice, theme);
      const afterPayment = drawSummaryAndPayment(doc, invoice, profile, theme, afterTable, qrBuffer);

      if (invoice.invoice_type === 'receipt') {
        doc.roundedRect(50, afterPayment + 4, 495, 66, 10).fill(theme.accentSoft);
        doc.fillColor(theme.statusPaid).font('Helvetica-Bold').fontSize(12).text('PAID CONFIRMATION', 70, afterPayment + 16);
        doc.fillColor(theme.text).font('Helvetica').fontSize(10)
          .text(`Payment Method: ${invoice.payment_method || 'Bank Transfer'}`, 230, afterPayment + 14)
          .text(`Payment Date: ${invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : 'N/A'}`, 230, afterPayment + 29)
          .text(`Transaction Ref: ${invoiceId}`, 230, afterPayment + 44);
        doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text('Completed timeline: Invoice issued -> Payment received -> Receipt generated', 70, afterPayment + 45);
      }

      if (profile.invoice_signature) {
        doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text('Authorized by', 50, 728);
        doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(10).text(profile.invoice_signature, 50, 740);
      }

      const footer = profile.invoice_footer_text || 'Generated with PDigitalHQ';
      doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text(footer, 50, 770, { width: 495, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoicePDF };
