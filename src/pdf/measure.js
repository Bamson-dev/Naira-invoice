const { PAGE } = require('./constants');

function colWidth(col) {
  return col.right - col.left;
}

function setStyle(doc, theme, { font = 'Helvetica', size = 10, color = 'text' } = {}) {
  doc.font(font).fontSize(size).fillColor(theme[color] || color);
}

function fitSingleLine(doc, text, maxWidth) {
  let value = String(text ?? '');
  if (doc.widthOfString(value) <= maxWidth) return value;
  while (value.length > 1 && doc.widthOfString(`${value}…`) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

/**
 * Financial amounts must never truncate or wrap — scale font down until the full string fits.
 */
function drawMoneyInColumn(doc, theme, col, y, text, opts = {}) {
  const bold = opts.bold || false;
  const fontName = bold ? 'Helvetica-Bold' : 'Helvetica';
  const color = opts.color || 'text';
  const maxSize = opts.size || 10;
  const minSize = opts.minSize || 7;
  const maxW = colWidth(col);
  const content = String(text ?? '');

  let size = maxSize;
  doc.font(fontName).fillColor(theme[color] || color);
  while (size >= minSize) {
    doc.fontSize(size);
    if (doc.widthOfString(content) <= maxW) break;
    size -= 0.5;
  }

  const w = doc.widthOfString(content);
  const x = Math.max(col.left, col.right - w);
  doc.text(content, x, y, { lineBreak: false });
  return Math.max(size + 6, 14);
}

/** Draw text inside a column; descriptions may ellipsis, money must use drawMoneyInColumn. */
function drawColumn(doc, theme, col, y, text, opts = {}) {
  if (opts.money) {
    return drawMoneyInColumn(doc, theme, col, y, text, opts);
  }

  const {
    align = 'left',
    font = 'Helvetica',
    size = 10,
    color = 'text',
    bold = false,
    maxLines = 1
  } = opts;
  const fontName = bold ? 'Helvetica-Bold' : font;
  setStyle(doc, theme, { font: fontName, size, color });
  const width = colWidth(col);
  const content = maxLines === 1 ? fitSingleLine(doc, text, width) : String(text ?? '');

  if (align === 'right') {
    const w = doc.widthOfString(content);
    const x = Math.max(col.left, col.right - w);
    doc.text(content, x, y, { lineBreak: false });
    return size + 4;
  }

  const height = doc.heightOfString(content, { width, lineGap: 2 });
  doc.text(content, col.left, y, { width, lineGap: 2 });
  return Math.max(size + 4, height);
}

function drawLabel(doc, theme, x, y, text) {
  setStyle(doc, theme, { font: 'Helvetica', size: 8, color: 'muted' });
  doc.text(String(text).toUpperCase(), x, y, { lineBreak: false });
}

function drawWrapped(doc, theme, x, y, width, text, opts = {}) {
  setStyle(doc, theme, {
    font: opts.bold ? 'Helvetica-Bold' : 'Helvetica',
    size: opts.size || 10,
    color: opts.color || 'text'
  });
  const h = doc.heightOfString(String(text ?? ''), { width, lineGap: 3 });
  doc.text(String(text ?? ''), x, y, { width, lineGap: 3 });
  return h;
}

function drawDivider(doc, theme, y, x1 = PAGE.contentLeft, x2 = PAGE.contentRight) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(0.75).strokeColor(theme.line).stroke();
}

function createLayout(doc) {
  let y = PAGE.margin;

  function ensure(minHeight) {
    if (y + minHeight <= PAGE.footerY - 24) return;
    doc.addPage();
    if (doc.page && themeBackground) {
      doc.rect(0, 0, PAGE.width, PAGE.height).fill(themeBackground);
    }
    y = PAGE.margin;
  }

  let themeBackground = null;
  return {
    get y() {
      return y;
    },
    set y(v) {
      y = v;
    },
    setBackground(color) {
      themeBackground = color;
    },
    advance(delta) {
      y += delta;
    },
    ensure,
    addPage() {
      doc.addPage();
      if (themeBackground) doc.rect(0, 0, PAGE.width, PAGE.height).fill(themeBackground);
      y = PAGE.margin;
    }
  };
}

module.exports = {
  colWidth,
  setStyle,
  fitSingleLine,
  drawMoneyInColumn,
  drawColumn,
  drawLabel,
  drawWrapped,
  drawDivider,
  createLayout
};
