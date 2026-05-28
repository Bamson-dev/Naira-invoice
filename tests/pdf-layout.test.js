const { test } = require('node:test');
const assert = require('node:assert/strict');
const PDFDocument = require('pdfkit');
const { TABLE_COLS, TOTALS, PAGE } = require('../src/pdf/constants');
const { drawMoneyInColumn } = require('../src/pdf/measure');
const { formatMoney } = require('../src/pdf/format');

const theme = {
  text: '#0F172A',
  accent: '#635BFF'
};

test('table columns have non-overlapping bounds', () => {
  const cols = [
    TABLE_COLS.description,
    TABLE_COLS.qty,
    TABLE_COLS.unitPrice,
    TABLE_COLS.lineTotal
  ];
  for (let i = 1; i < cols.length; i += 1) {
    assert.ok(cols[i].left >= cols[i - 1].right, `column ${i} overlaps previous column`);
  }
  assert.ok(TABLE_COLS.lineTotal.right <= PAGE.contentRight + 0.5);
});

test('totals block sits inside content area', () => {
  assert.ok(TOTALS.left >= PAGE.contentLeft);
  assert.equal(TOTALS.right, PAGE.contentRight);
});

test('drawMoneyInColumn renders full amount without ellipsis', () => {
  const doc = new PDFDocument({ margin: 0 });
  const amount = formatMoney(20021000, 'NGN');
  assert.ok(!amount.includes('…'));
  drawMoneyInColumn(doc, theme, TABLE_COLS.lineTotal, 0, amount, { size: 10, bold: true, minSize: 7 });
  drawMoneyInColumn(doc, theme, TABLE_COLS.unitPrice, 0, formatMoney(20000000, 'NGN'), { size: 10 });
});
