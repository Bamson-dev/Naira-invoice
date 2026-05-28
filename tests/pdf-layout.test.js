const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TABLE_COLS, TOTALS, PAGE } = require('../src/pdf/constants');

test('table columns have non-overlapping bounds', () => {
  const cols = [
    TABLE_COLS.description,
    TABLE_COLS.qty,
    TABLE_COLS.unitPrice,
    TABLE_COLS.lineTotal
  ];
  for (let i = 1; i < cols.length; i += 1) {
    assert.ok(
      cols[i].left >= cols[i - 1].right,
      `column ${i} overlaps previous column`
    );
  }
  assert.ok(TABLE_COLS.lineTotal.right <= PAGE.contentRight + 0.5);
});

test('totals block sits inside content area', () => {
  assert.ok(TOTALS.left >= PAGE.contentLeft);
  assert.equal(TOTALS.right, PAGE.contentRight);
});
