const { PAGE, SPACE, TOTALS, ROW } = require('../constants');
const { formatMoneyForInvoice, formatTaxLabel } = require('../format');
const { drawColumn, drawDivider, setStyle } = require('../measure');

function renderTotals(ctx) {
  const { doc, theme, layout, invoice } = ctx;
  const rows = [{ label: 'Subtotal', amount: formatMoneyForInvoice(invoice.subtotal, invoice) }];
  if (Number(invoice.tax_amount || 0) > 0) {
    rows.push({ label: formatTaxLabel(invoice), amount: formatMoneyForInvoice(invoice.tax_amount, invoice) });
  }
  if (Number(invoice.discount_amount || 0) > 0) {
    rows.push({
      label: 'Discount',
      amount: `-${formatMoneyForInvoice(invoice.discount_amount, invoice)}`
    });
  }

  const blockH = rows.length * ROW.summary + ROW.summaryTotal + SPACE.lg + 16;
  layout.ensure(blockH);

  const y0 = layout.y;
  doc.roundedRect(TOTALS.left, y0, TOTALS.width, blockH, 10).fill(theme.surface);
  doc.roundedRect(TOTALS.left, y0, TOTALS.width, blockH, 10).lineWidth(0.75).strokeColor(theme.line).stroke();

  let y = y0 + SPACE.md;
  const labelCol = { left: TOTALS.left + SPACE.md, right: TOTALS.left + TOTALS.width * 0.52 };
  const valueCol = { left: TOTALS.left + TOTALS.width * 0.52, right: TOTALS.right - SPACE.md };

  rows.forEach((row) => {
    setStyle(doc, theme, { font: 'Helvetica', size: 10, color: 'muted' });
    doc.text(row.label, labelCol.left, y, { lineBreak: false });
    drawColumn(doc, theme, valueCol, y, row.amount, { align: 'right', size: 10, color: 'text' });
    y += ROW.summary;
  });

  y += SPACE.xs;
  drawDivider(doc, theme, y, TOTALS.left + SPACE.sm, TOTALS.right - SPACE.sm);
  y += SPACE.sm;

  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 11, color: 'text' });
  doc.text('Total', labelCol.left, y, { lineBreak: false });
  drawColumn(doc, theme, valueCol, y, formatMoneyForInvoice(invoice.total_amount, invoice), {
    align: 'right',
    size: 16,
    bold: true,
    color: 'accent'
  });

  layout.y = y0 + blockH + SPACE.lg;
}

module.exports = { renderTotals };
