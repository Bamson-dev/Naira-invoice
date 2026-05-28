const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeLineItems,
  computeTotals,
  assertClientTotalsMatch
} = require('../src/utils/invoiceTotals');

test('computeLineItems derives line totals from qty and unit price', () => {
  const rows = computeLineItems([
    { description: 'Design', quantity: 2, unit_price: 5000 },
    { description: '  ', quantity: 1, unit_price: 100 }
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].line_total, 10000);
});

test('computeTotals applies tax and discount', () => {
  const lines = computeLineItems([{ description: 'A', quantity: 1, unit_price: 1000 }]);
  const totals = computeTotals(lines, {
    tax_percentage: 7.5,
    discount_type: 'fixed',
    discount_value: 100
  });
  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.taxAmount, 75);
  assert.equal(totals.totalAmount, 975);
});

test('computeTotals caps tax percentage at 100%', () => {
  const lines = computeLineItems([{ description: 'A', quantity: 1, unit_price: 1000 }]);
  const totals = computeTotals(lines, { tax_percentage: 700 });
  assert.equal(totals.taxAmount, 1000);
  assert.equal(totals.totalAmount, 2000);
});

test('assertClientTotalsMatch tolerates small rounding drift', () => {
  const lines = computeLineItems([{ description: 'A', quantity: 3, unit_price: 33.33 }]);
  const totals = computeTotals(lines, {});
  assert.equal(assertClientTotalsMatch({ subtotal: totals.subtotal, total_amount: totals.totalAmount }, totals), true);
});
