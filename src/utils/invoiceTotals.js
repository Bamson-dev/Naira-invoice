/** Server-side invoice line items and totals (never trust client amounts). */

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function computeLineItems(rawItems) {
  return rawItems
    .filter((i) => i?.description && String(i.description).trim())
    .map((item, index) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);
      const lineTotal = roundMoney(quantity * unitPrice);
      return {
        description: String(item.description).trim(),
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        sort_order: index
      };
    });
}

function computeTotals(lineItems, options = {}) {
  const subtotal = roundMoney(lineItems.reduce((sum, row) => sum + row.line_total, 0));

  let taxAmount = 0;
  let taxPct =
    options.tax_percentage != null && options.tax_percentage !== ''
      ? Number(options.tax_percentage)
      : null;
  if (taxPct != null && !Number.isNaN(taxPct)) {
    taxPct = Math.min(100, Math.max(0, taxPct));
  }
  if (taxPct != null && !Number.isNaN(taxPct) && taxPct > 0) {
    taxAmount = roundMoney(subtotal * (taxPct / 100));
  } else if (options.tax_amount != null && options.tax_amount !== '') {
    taxAmount = roundMoney(Number(options.tax_amount));
  }

  let discountAmount = 0;
  const discountType = options.discount_type || null;
  const discountValue =
    options.discount_value != null && options.discount_value !== ''
      ? Number(options.discount_value)
      : null;

  if (discountType === 'percentage' && discountValue != null && discountValue > 0) {
    discountAmount = roundMoney(subtotal * (discountValue / 100));
  } else if (discountType === 'fixed' && discountValue != null && discountValue > 0) {
    discountAmount = roundMoney(discountValue);
  } else if (options.discount_amount != null && options.discount_amount !== '') {
    discountAmount = roundMoney(Number(options.discount_amount));
  }

  const totalAmount = roundMoney(Math.max(0, subtotal + taxAmount - discountAmount));

  return {
    subtotal,
    taxAmount,
    taxPercentage: taxPct,
    discountAmount,
    discountType: discountType || null,
    discountValue: discountValue != null ? discountValue : null,
    totalAmount
  };
}

function assertClientTotalsMatch(clientPayload, computed, tolerance = 0.02) {
  const checks = [
    ['subtotal', clientPayload.subtotal, computed.subtotal],
    ['total_amount', clientPayload.total_amount, computed.totalAmount]
  ];
  for (const [, clientVal, serverVal] of checks) {
    if (clientVal == null || clientVal === '') continue;
    if (Math.abs(Number(clientVal) - serverVal) > tolerance) {
      return false;
    }
  }
  return true;
}

module.exports = {
  roundMoney,
  computeLineItems,
  computeTotals,
  assertClientTotalsMatch
};
