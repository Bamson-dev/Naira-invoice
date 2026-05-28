const { PAGE, SPACE, TABLE_COLS, ROW } = require('../constants');
const { formatMoneyForInvoice } = require('../format');
const { drawColumn, drawDivider, setStyle } = require('../measure');

function measureRow(doc, theme, item, invoice) {
  setStyle(doc, theme, { font: 'Helvetica', size: 10, color: 'text' });
  const descH = doc.heightOfString(String(item.description || '').trim(), {
    width: TABLE_COLS.description.right - TABLE_COLS.description.left,
    lineGap: 2
  });
  return Math.max(ROW.tableMin, descH + ROW.tablePad * 2);
}

function drawTableHeader(doc, theme, y) {
  doc.roundedRect(PAGE.contentLeft, y, PAGE.contentWidth, ROW.tableHeader, 6).fill(theme.surfaceAlt);
  const hy = y + 9;
  setStyle(doc, theme, { font: 'Helvetica-Bold', size: 8, color: 'muted' });
  doc.text('DESCRIPTION', TABLE_COLS.description.left + 4, hy, { lineBreak: false });
  drawColumn(doc, theme, TABLE_COLS.qty, hy, 'QTY', { align: 'right', font: 'Helvetica-Bold', size: 8, color: 'muted' });
  drawColumn(doc, theme, TABLE_COLS.unitPrice, hy, 'UNIT PRICE', {
    align: 'right',
    font: 'Helvetica-Bold',
    size: 8,
    color: 'muted'
  });
  drawColumn(doc, theme, TABLE_COLS.lineTotal, hy, 'AMOUNT', {
    align: 'right',
    font: 'Helvetica-Bold',
    size: 8,
    color: 'muted'
  });
}

function renderLineItems(ctx) {
  const { doc, theme, layout, invoice } = ctx;
  const items = (invoice.invoice_items || []).filter((it) => String(it.description || '').trim());
  if (!items.length) {
    layout.ensure(ROW.tableHeader + ROW.tableMin);
    drawTableHeader(doc, theme, layout.y);
    layout.y += ROW.tableHeader + ROW.tableMin;
    return;
  }

  drawTableHeader(doc, theme, layout.y);
  layout.y += ROW.tableHeader;

  items.forEach((item, idx) => {
    const rowH = measureRow(doc, theme, item, invoice);
    layout.ensure(rowH + 8);
    if (layout.y + rowH > PAGE.footerY - 160) {
      layout.addPage();
      drawTableHeader(doc, theme, layout.y);
      layout.y += ROW.tableHeader;
    }

    const y = layout.y;
    if (idx % 2 === 0) {
      doc.rect(PAGE.contentLeft, y, PAGE.contentWidth, rowH).fill(theme.surface);
    }

    const textY = y + ROW.tablePad;
    setStyle(doc, theme, { font: 'Helvetica', size: 10, color: 'text' });
    doc.text(String(item.description || '').trim(), TABLE_COLS.description.left + 4, textY, {
      width: TABLE_COLS.description.right - TABLE_COLS.description.left - 8,
      lineGap: 2
    });

    drawColumn(doc, theme, TABLE_COLS.qty, textY, String(item.quantity ?? 0), { align: 'right', size: 10 });
    drawColumn(doc, theme, TABLE_COLS.unitPrice, textY, formatMoneyForInvoice(item.unit_price, invoice), {
      align: 'right',
      size: 10,
      money: true
    });
    drawColumn(doc, theme, TABLE_COLS.lineTotal, textY, formatMoneyForInvoice(item.line_total, invoice), {
      align: 'right',
      size: 10,
      bold: true,
      money: true
    });

    layout.y += rowH;
    drawDivider(doc, theme, layout.y, PAGE.contentLeft, PAGE.contentRight);
    layout.y += 1;
  });

  layout.y += SPACE.md;
}

module.exports = { renderLineItems };
