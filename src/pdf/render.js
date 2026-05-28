const PDFDocument = require('pdfkit');
const { PAGE } = require('./constants');
const { resolveTheme } = require('./themes');
const { displayInvoiceNumber } = require('./format');
const { createLayout, setStyle } = require('./measure');
const { loadLogoBuffer, buildPaymentQR } = require('./assets');
const { renderHeader } = require('./components/header');
const { renderHero } = require('./components/hero');
const { renderParties } = require('./components/parties');
const { renderLineItems } = require('./components/lineItems');
const { renderTotals } = require('./components/totals');
const { renderPayment } = require('./components/payment');
const { renderReceiptBanner, renderFooter } = require('./components/footer');

function paintBackground(doc, theme) {
  if (theme.background === '#FFFFFF') return;
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(theme.background);
}

function paintWatermark(doc, theme, profile) {
  if (!profile?.invoice_watermark_text) return;
  doc.save();
  doc.rotate(-28, { origin: [PAGE.width / 2, PAGE.height / 2] });
  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 64, color: 'muted' });
  doc.opacity(0.06);
  doc.text(String(profile.invoice_watermark_text).slice(0, 24), 80, PAGE.height / 2 - 20, {
    lineBreak: false
  });
  doc.opacity(1);
  doc.restore();
}

function paintAccentBar(doc, theme) {
  if (theme.id !== 'creative_studio') return;
  const grad = doc.linearGradient(0, 0, PAGE.width, 0);
  grad.stop(0, theme.accent).stop(1, theme.accent2 || theme.accent);
  doc.rect(0, 0, PAGE.width, 4).fill(grad);
}

async function renderInvoiceDocument(invoice, profile) {
  const theme = resolveTheme(invoice, profile);
  const [logo, qrBuffer] = await Promise.all([
    loadLogoBuffer(profile?.logo_url),
    buildPaymentQR(invoice, profile)
  ]);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: `${displayInvoiceNumber(invoice)} — ${profile?.business_name || 'Invoice'}`,
      Author: profile?.business_name || 'NairaInvoice',
      Subject: invoice.invoice_type === 'receipt' ? 'Receipt' : 'Invoice'
    }
  });

  const layout = createLayout(doc);
  layout.setBackground(theme.background);

  paintBackground(doc, theme);
  paintAccentBar(doc, theme);
  paintWatermark(doc, theme, profile);

  const ctx = {
    doc,
    theme,
    layout,
    invoice,
    profile: profile || {},
    logo,
    qrBuffer,
    invoiceId: displayInvoiceNumber(invoice)
  };

  renderHeader(ctx);
  renderHero(ctx);
  renderParties(ctx);
  renderLineItems(ctx);
  renderTotals(ctx);
  renderPayment(ctx);
  renderReceiptBanner(ctx);
  renderFooter(ctx);

  return doc;
}

function generateInvoicePDF(invoice, profile) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = await renderInvoiceDocument(invoice, profile);
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF, renderInvoiceDocument };
