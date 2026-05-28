const { PAGE, SPACE } = require('../constants');
const { formatMoneyForInvoice } = require('../format');
const { drawLabel, setStyle } = require('../measure');

function renderHero(ctx) {
  const { doc, theme, layout, invoice } = ctx;
  const isReceipt = invoice.invoice_type === 'receipt';
  const cardH = 88;
  layout.ensure(cardH + SPACE.md);

  const y0 = layout.y;
  doc.roundedRect(PAGE.contentLeft, y0, PAGE.contentWidth, cardH, 12).fill(theme.surface);
  doc.roundedRect(PAGE.contentLeft, y0, PAGE.contentWidth, cardH, 12).lineWidth(0.75).strokeColor(theme.line).stroke();

  drawLabel(doc, theme, PAGE.contentLeft + SPACE.md, y0 + SPACE.md, isReceipt ? 'Amount paid' : 'Amount due');
  const amount = formatMoneyForInvoice(invoice.total_amount, invoice);
  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 26, color: 'accent' });
  doc.text(amount, PAGE.contentLeft + SPACE.md, y0 + 28, {
    width: PAGE.contentWidth - SPACE.md * 2,
    align: 'right',
    lineBreak: false
  });

  setStyle(doc, theme, { font: 'Helvetica', size: 9, color: 'muted' });
  doc.text(
    `${(invoice.currency || 'NGN').toUpperCase()} · ${isReceipt ? 'Payment confirmed' : 'Pay via bank transfer'}`,
    PAGE.contentLeft + SPACE.md,
    y0 + cardH - 22,
    { lineBreak: false }
  );

  layout.y = y0 + cardH + SPACE.lg;
}

module.exports = { renderHero };
