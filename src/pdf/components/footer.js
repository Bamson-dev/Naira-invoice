const { PAGE, SPACE } = require('../constants');
const { formatShortDate } = require('../format');
const { drawWrapped, setStyle } = require('../measure');

function renderReceiptBanner(ctx) {
  const { doc, theme, layout, invoice, invoiceId } = ctx;
  if (invoice.invoice_type !== 'receipt') return;

  layout.ensure(72);
  const y0 = layout.y;
  doc.roundedRect(PAGE.contentLeft, y0, PAGE.contentWidth, 64, 10).fill(theme.surface);
  doc.roundedRect(PAGE.contentLeft, y0, PAGE.contentWidth, 64, 10).lineWidth(0.75).strokeColor(theme.line).stroke();

  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 11, color: 'statusPaid' });
  doc.text('Payment received', PAGE.contentLeft + SPACE.md, y0 + SPACE.md, { lineBreak: false });

  const lines = [
    `Method · ${invoice.payment_method || 'Bank transfer'}`,
    `Date · ${formatShortDate(invoice.payment_date)}`,
    `Reference · ${invoiceId}`
  ].join('   ·   ');
  drawWrapped(doc, theme, PAGE.contentLeft + SPACE.md, y0 + 28, PAGE.contentWidth - SPACE.md * 2, lines, {
    color: 'muted',
    size: 9
  });

  layout.y = y0 + 64 + SPACE.md;
}

function renderFooter(ctx) {
  const { doc, theme, layout, profile } = ctx;
  const footerText = profile.invoice_footer_text || 'Thank you for your business.';

  if (profile.invoice_signature) {
    layout.ensure(48);
    setStyle(doc, theme, { font: 'Helvetica', size: 8, color: 'muted' });
    doc.text('Authorized by', PAGE.contentLeft, layout.y, { lineBreak: false });
    setStyle(doc, theme, { font: 'Helvetica-Bold', size: 10, color: 'text' });
    doc.text(profile.invoice_signature, PAGE.contentLeft, layout.y + 12, { lineBreak: false });
    layout.y += 36;
  }

  setStyle(doc, theme, { font: 'Helvetica', size: 8, color: 'muted' });
  doc.text(footerText, PAGE.contentLeft, PAGE.footerY, {
    width: PAGE.contentWidth,
    align: 'center'
  });
}

module.exports = { renderReceiptBanner, renderFooter };
