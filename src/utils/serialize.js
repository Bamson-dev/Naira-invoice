/** Convert Prisma Decimal fields to numbers for JSON API compatibility */
function decimalToNumber(value) {
  if (value == null) return value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

function serializeInvoice(inv) {
  if (!inv) return inv;
  const out = { ...inv };
  for (const key of [
    'subtotal',
    'taxPercentage',
    'taxAmount',
    'discountValue',
    'discountAmount',
    'totalAmount'
  ]) {
    if (out[key] != null) out[key] = decimalToNumber(out[key]);
  }
  if (out.invoiceDate) out.invoice_date = formatDate(out.invoiceDate);
  if (out.dueDate) out.due_date = formatDate(out.dueDate);
  if (out.paymentDate) out.payment_date = formatDate(out.paymentDate);
  mapSnakeCaseInvoice(out);
  if (out.items) {
    out.invoice_items = out.items.map(serializeItem);
    delete out.items;
  }
  if (out.client) {
    out.clients = serializeClient(out.client);
    delete out.client;
  }
  return out;
}

function serializeItem(item) {
  const row = { ...item };
  row.quantity = decimalToNumber(row.quantity);
  row.unit_price = decimalToNumber(row.unitPrice ?? row.unit_price);
  row.line_total = decimalToNumber(row.lineTotal ?? row.line_total);
  row.invoice_id = row.invoiceId ?? row.invoice_id;
  row.sort_order = row.sortOrder ?? row.sort_order;
  delete row.unitPrice;
  delete row.lineTotal;
  delete row.invoiceId;
  delete row.sortOrder;
  return row;
}

function serializeClient(c) {
  if (!c) return null;
  return {
    id: c.id,
    user_id: c.userId ?? c.user_id,
    client_name: c.clientName ?? c.client_name,
    client_email: c.clientEmail ?? c.client_email,
    client_phone: c.clientPhone ?? c.client_phone,
    client_address: c.clientAddress ?? c.client_address,
    notes: c.notes,
    created_at: c.createdAt ?? c.created_at,
    updated_at: c.updatedAt ?? c.updated_at
  };
}

function serializeProfile(p) {
  if (!p) return null;
  return {
    id: p.id,
    user_id: p.userId ?? p.user_id,
    business_name: p.businessName ?? p.business_name,
    business_address: p.businessAddress ?? p.business_address,
    phone: p.phone,
    email: p.email,
    logo_url: p.logoUrl ?? p.logo_url,
    bank_name: p.bankName ?? p.bank_name,
    account_number: p.accountNumber ?? p.account_number,
    account_name: p.accountName ?? p.account_name,
    tax_id: p.taxId ?? p.tax_id,
    invoice_prefix: p.invoicePrefix ?? p.invoice_prefix,
    next_invoice_number: p.nextInvoiceNumber ?? p.next_invoice_number,
    brand_accent_color: p.brandAccentColor ?? p.brand_accent_color,
    invoice_footer_text: p.invoiceFooterText ?? p.invoice_footer_text,
    invoice_signature: p.invoiceSignature ?? p.invoice_signature,
    invoice_watermark_text: p.invoiceWatermarkText ?? p.invoice_watermark_text,
    created_at: p.createdAt ?? p.created_at,
    updated_at: p.updatedAt ?? p.updated_at
  };
}

function mapSnakeCaseInvoice(out) {
  const map = {
    userId: 'user_id',
    clientId: 'client_id',
    invoiceNumber: 'invoice_number',
    invoiceType: 'invoice_type',
    invoiceDate: 'invoice_date',
    dueDate: 'due_date',
    taxPercentage: 'tax_percentage',
    taxAmount: 'tax_amount',
    discountType: 'discount_type',
    discountValue: 'discount_value',
    discountAmount: 'discount_amount',
    totalAmount: 'total_amount',
    paymentMethod: 'payment_method',
    paymentDate: 'payment_date',
    invoiceTemplate: 'invoice_template',
    tempClientName: 'temp_client_name',
    tempClientEmail: 'temp_client_email',
    tempClientPhone: 'temp_client_phone',
    tempClientAddress: 'temp_client_address',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (out[camel] !== undefined && out[snake] === undefined) {
      if (camel.includes('Date') && out[camel]) {
        out[snake] = formatDate(out[camel]);
      } else {
        out[snake] = out[camel];
      }
    }
    delete out[camel];
  }
}

function formatDate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
}

function tempClientFromInvoice(inv) {
  const name = String(inv.temp_client_name || inv.tempClientName || '').trim();
  if (!name) return null;
  return {
    id: null,
    client_name: name,
    client_email: inv.temp_client_email || inv.tempClientEmail || null,
    client_phone: inv.temp_client_phone || inv.tempClientPhone || null,
    client_address: inv.temp_client_address || inv.tempClientAddress || null,
    is_temporary: true
  };
}

module.exports = {
  decimalToNumber,
  serializeInvoice,
  serializeClient,
  serializeProfile,
  tempClientFromInvoice,
  formatDate
};
