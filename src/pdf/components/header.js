const { PAGE, SPACE } = require('../constants');
const { formatShortDate, statusMeta } = require('../format');
const { drawLabel, setStyle } = require('../measure');

function renderHeader(ctx) {
  const { doc, theme, layout, invoice, profile, logo, invoiceId } = ctx;
  const y0 = layout.y;
  const isReceipt = invoice.invoice_type === 'receipt';
  const docLabel = isReceipt ? 'Receipt' : 'Invoice';

  drawLabel(doc, theme, PAGE.contentLeft, y0, docLabel);
  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 20, color: 'text' });
  doc.text(invoiceId, PAGE.contentLeft, y0 + 12, { lineBreak: false });

  setStyle(doc, theme, { font: 'Helvetica', size: 9, color: 'muted' });
  const metaParts = [`Issued ${formatShortDate(invoice.invoice_date)}`];
  if (!isReceipt && invoice.due_date) metaParts.push(`Due ${formatShortDate(invoice.due_date)}`);
  if (isReceipt) metaParts.push(`Paid ${formatShortDate(invoice.payment_date)}`);
  doc.text(metaParts.join('  ·  '), PAGE.contentLeft, y0 + 36, { lineBreak: false });

  const brandRight = PAGE.contentRight;
  if (logo) {
    try {
      doc.image(logo, brandRight - 88, y0, { fit: [88, 44], align: 'right', valign: 'top' });
    } catch {
      setStyle(doc, theme, { font: 'Helvetica-Bold', size: 12, color: 'text' });
      doc.text(profile.business_name || 'Business', PAGE.contentLeft + 220, y0 + 8, {
        width: PAGE.contentWidth - 220,
        align: 'right'
      });
    }
  } else {
    setStyle(doc, theme, { font: 'Helvetica-Bold', size: 13, color: 'text' });
    doc.text(profile.business_name || 'Business', PAGE.contentLeft + 220, y0 + 8, {
      width: PAGE.contentWidth - 220,
      align: 'right'
    });
  }

  const { label, color } = statusMeta(invoice, theme);
  const badgeW = Math.max(72, doc.widthOfString(label) + 24);
  const badgeX = brandRight - badgeW;
  doc.roundedRect(badgeX, y0 + 52, badgeW, 22, 11).fill(color);
  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 8, color: '#FFFFFF' });
  doc.text(label, badgeX, y0 + 59, { width: badgeW, align: 'center' });

  layout.y = y0 + 88;
}

module.exports = { renderHeader };
