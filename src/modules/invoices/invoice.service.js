const crypto = require('crypto');
const { prisma } = require('../../config/database');
const { AppError } = require('../../utils/AppError');
const { cacheDel } = require('../../config/redis');
const { generateInvoicePDF } = require('../../utils/pdfGenerator');
const {
  serializeInvoice,
  serializeProfile,
  serializeClient,
  tempClientFromInvoice,
  formatDate
} = require('../../utils/serialize');

async function fetchInvoiceWithRelations(invoiceId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    include: {
      client: true,
      items: { orderBy: { sortOrder: 'asc' } }
    }
  });
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  const serialized = serializeInvoice(invoice);
  serialized.clients = invoice.client
    ? serializeClient(invoice.client)
    : tempClientFromInvoice(serialized);
  return serialized;
}

async function listInvoices(userId) {
  const invoices = await prisma.invoice.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { id: true, clientName: true, clientEmail: true } } }
  });

  const invoiceIds = invoices.map((i) => i.id);
  const events = invoiceIds.length
    ? await prisma.invoiceEvent.findMany({
        where: { invoiceId: { in: invoiceIds }, eventType: 'viewed' },
        orderBy: { timestamp: 'desc' }
      })
    : [];

  const viewedMap = new Map();
  for (const e of events) {
    if (!viewedMap.has(e.invoiceId)) viewedMap.set(e.invoiceId, e.timestamp);
  }

  return invoices.map((inv) => {
    const row = serializeInvoice(inv);
    row.clients = inv.client
      ? { id: inv.client.id, client_name: inv.client.clientName, client_email: inv.client.clientEmail }
      : tempClientFromInvoice(row);
    row.viewed_at = viewedMap.get(inv.id) || null;
    return row;
  });
}

async function markPaid(id, userId) {
  const row = await prisma.invoice.findFirst({ where: { id, userId, deletedAt: null } });
  if (!row) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'paid',
      paymentDate: row.paymentDate || new Date()
    }
  });
  await cacheDel(`invoices:${userId}:*`);
  return serializeInvoice(updated);
}

function buildInvoiceData(body, invoiceNumber) {
  const inv = body.invoice || body;
  return {
    userId: inv.user_id,
    clientId: inv.client_id || null,
    invoiceNumber,
    invoiceType: inv.invoice_type || 'invoice',
    status: inv.status || 'draft',
    invoiceDate: new Date(inv.invoice_date || Date.now()),
    dueDate: inv.due_date ? new Date(inv.due_date) : null,
    subtotal: inv.subtotal,
    taxPercentage: inv.tax_percentage ?? null,
    taxAmount: inv.tax_amount ?? null,
    discountType: inv.discount_type ?? null,
    discountValue: inv.discount_value ?? null,
    discountAmount: inv.discount_amount ?? null,
    totalAmount: inv.total_amount,
    notes: inv.notes ?? null,
    paymentMethod: inv.payment_method ?? null,
    paymentDate: inv.payment_date ? new Date(inv.payment_date) : null,
    invoiceTemplate: inv.invoice_template || 'modern_fintech',
    currency: inv.currency || 'NGN',
    tempClientName: inv.temp_client_name ?? null,
    tempClientEmail: inv.temp_client_email ?? null,
    tempClientPhone: inv.temp_client_phone ?? null,
    tempClientAddress: inv.temp_client_address ?? null
  };
}

async function createInvoice(userId, { invoice, items }) {
  if (!invoice?.user_id || invoice.user_id !== userId) {
    throw new AppError('invoice.user_id is required', 400, 'VALIDATION_ERROR');
  }
  const cleanItems = (items || []).filter((i) => i.description && String(i.description).trim());
  if (!cleanItems.length) {
    throw new AppError('At least one line item with description is required', 400, 'VALIDATION_ERROR');
  }

  const profile = await prisma.businessProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(
      'No business profile found. Save your business details in Profile before creating invoices.',
      400,
      'NO_PROFILE'
    );
  }

  const prefix = profile.invoicePrefix || 'INV';
  const seq = profile.nextInvoiceNumber >= 1 ? profile.nextInvoiceNumber : 1;
  const invoiceNumber = `${prefix}${String(seq).padStart(4, '0')}`;

  const created = await prisma.$transaction(async (tx) => {
    const invRow = await tx.invoice.create({
      data: buildInvoiceData({ invoice }, invoiceNumber)
    });
    await tx.invoiceItem.createMany({
      data: cleanItems.map((item, index) => ({
        invoiceId: invRow.id,
        description: String(item.description).trim(),
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
        sortOrder: index
      }))
    });
    await tx.businessProfile.update({
      where: { userId },
      data: { nextInvoiceNumber: seq + 1 }
    });
    return invRow;
  });

  await cacheDel(`invoices:${userId}:*`);
  return fetchInvoiceWithRelations(created.id);
}

async function getInvoice(id, userId) {
  const invoice = await fetchInvoiceWithRelations(id);
  if (userId && invoice.user_id !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  const profile = await prisma.businessProfile.findUnique({ where: { userId: invoice.user_id } });
  return { invoice, profile: serializeProfile(profile) };
}

async function updateInvoice(id, userId, { invoice, items }) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

  const cleanItems = (items || []).filter((i) => i.description && String(i.description).trim());
  if (!cleanItems.length) {
    throw new AppError('At least one line item with description is required', 400, 'VALIDATION_ERROR');
  }

  const fieldMap = {
    client_id: (v) => ({ clientId: v || null }),
    invoice_type: (v) => ({ invoiceType: v }),
    status: (v) => ({ status: v }),
    invoice_date: (v) => ({ invoiceDate: new Date(v) }),
    due_date: (v) => ({ dueDate: v ? new Date(v) : null }),
    payment_date: (v) => ({ paymentDate: v ? new Date(v) : null }),
    subtotal: (v) => ({ subtotal: v }),
    tax_percentage: (v) => ({ taxPercentage: v }),
    tax_amount: (v) => ({ taxAmount: v }),
    discount_type: (v) => ({ discountType: v }),
    discount_value: (v) => ({ discountValue: v }),
    discount_amount: (v) => ({ discountAmount: v }),
    total_amount: (v) => ({ totalAmount: v }),
    notes: (v) => ({ notes: v }),
    payment_method: (v) => ({ paymentMethod: v }),
    invoice_template: (v) => ({ invoiceTemplate: v }),
    currency: (v) => ({ currency: v }),
    temp_client_name: (v) => ({ tempClientName: v }),
    temp_client_email: (v) => ({ tempClientEmail: v }),
    temp_client_phone: (v) => ({ tempClientPhone: v }),
    temp_client_address: (v) => ({ tempClientAddress: v })
  };
  const updateData = {};
  for (const [key, map] of Object.entries(fieldMap)) {
    if (invoice[key] !== undefined) Object.assign(updateData, map(invoice[key]));
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id }, data: updateData });
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoiceItem.createMany({
      data: cleanItems.map((item, index) => ({
        invoiceId: id,
        description: String(item.description).trim(),
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
        sortOrder: index
      }))
    });
  });

  await cacheDel(`invoices:${userId}:*`);
  return { success: true };
}

async function deleteInvoice(id, userId) {
  const row = await prisma.invoice.findFirst({ where: { id, userId, deletedAt: null } });
  if (!row) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  await cacheDel(`invoices:${userId}:*`);
  return { success: true };
}

async function generatePdf(id, userId) {
  const { invoice, profile } = await getInvoice(id, userId);
  if (!profile) throw new AppError('Business profile not found for PDF generation.', 400, 'NO_PROFILE');
  const pdfBuffer = await generateInvoicePDF(invoice, profile);
  return { pdfBuffer, invoiceNumber: invoice.invoice_number };
}

async function generatePublicPdf(token) {
  const { invoice } = await getPublicInvoice(token);
  const profile = await prisma.businessProfile.findUnique({
    where: { userId: invoice.user_id }
  });
  const profileOut = serializeProfile(profile);
  if (!profileOut) {
    throw new AppError('Business profile not found for PDF generation.', 400, 'NO_PROFILE');
  }
  const pdfBuffer = await generateInvoicePDF(invoice, profileOut);
  return { pdfBuffer, invoiceNumber: invoice.invoice_number };
}

function publicToken() {
  return crypto.randomBytes(9).toString('base64url');
}

async function getOrCreatePublicLink(invoiceId, userId) {
  const existing = await prisma.invoicePublicLink.findFirst({ where: { invoiceId } });
  if (existing) return existing;
  return prisma.invoicePublicLink.create({
    data: { invoiceId, userId, publicToken: publicToken() }
  });
}

function resolveBaseUrl(req) {
  const configured = String(process.env.APP_BASE_URL || '').trim();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host');
  const proto = forwardedProto || req.protocol || 'http';
  const runtimeBase = host ? `${proto}://${host}` : `http://localhost:${process.env.PORT || 3000}`;
  return (configured || runtimeBase).replace(/\/+$/, '');
}

async function createPublicLink(id, userId, req) {
  const inv = await prisma.invoice.findFirst({ where: { id, userId, deletedAt: null } });
  if (!inv) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  const link = await getOrCreatePublicLink(id, userId);
  const base = resolveBaseUrl(req);
  return { token: link.publicToken, public_url: `${base}/i/${link.publicToken}` };
}

async function getPublicInvoice(token) {
  const link = await prisma.invoicePublicLink.findUnique({ where: { publicToken: token } });
  if (!link) throw new AppError('Invoice link not found', 404, 'NOT_FOUND');
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new AppError('Invoice link has expired', 410, 'EXPIRED');
  }
  const invoice = await fetchInvoiceWithRelations(link.invoiceId);
  const profile = await prisma.businessProfile.findUnique({
    where: { userId: invoice.user_id },
    select: {
      businessName: true,
      phone: true,
      email: true,
      bankName: true,
      accountNumber: true,
      accountName: true
    }
  });
  const profileOut = profile
    ? {
        business_name: profile.businessName,
        phone: profile.phone,
        email: profile.email,
        bank_name: profile.bankName,
        account_number: profile.accountNumber,
        account_name: profile.accountName
      }
    : null;
  return { invoice, profile: profileOut, link };
}

async function logPublicEvent(token, eventType, req) {
  const link = await prisma.invoicePublicLink.findUnique({
    where: { publicToken: token },
    select: { invoiceId: true }
  });
  if (!link) throw new AppError('Link not found', 404, 'NOT_FOUND');
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString();
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);
  await prisma.invoiceEvent.create({
    data: { invoiceId: link.invoiceId, eventType: eventType || 'viewed', ipHash }
  });
  return { success: true };
}

async function duplicateInvoice(id, userId) {
  const original = await fetchInvoiceWithRelations(id);
  if (original.user_id !== userId) throw new AppError('Not allowed', 403, 'FORBIDDEN');
  return createInvoice(userId, {
    invoice: {
      user_id: userId,
      client_id: original.client_id,
      temp_client_name: original.temp_client_name,
      temp_client_email: original.temp_client_email,
      temp_client_phone: original.temp_client_phone,
      temp_client_address: original.temp_client_address,
      invoice_type: original.invoice_type,
      invoice_template: original.invoice_template,
      currency: original.currency,
      status: 'draft',
      invoice_date: formatDate(new Date()),
      due_date: original.due_date,
      subtotal: original.subtotal,
      tax_percentage: original.tax_percentage,
      tax_amount: original.tax_amount,
      discount_type: original.discount_type,
      discount_value: original.discount_value,
      discount_amount: original.discount_amount,
      total_amount: original.total_amount,
      notes: original.notes
    },
    items: original.invoice_items || []
  });
}

function buildWhatsAppReminder(invoice, profile, publicUrl) {
  const clientName =
    invoice.clients?.client_name || invoice.temp_client_name || 'there';
  const amount = Number(invoice.total_amount || 0).toLocaleString();
  const currency = invoice.currency || 'NGN';
  const business = profile?.business_name || 'our team';
  return {
    text: `Hi ${clientName}, this is ${business}. Your invoice ${invoice.invoice_number} for ${currency} ${amount} is ready. View & pay: ${publicUrl}`,
    waUrl: `https://wa.me/?text=${encodeURIComponent(
      `Hi ${clientName}, invoice ${invoice.invoice_number} (${currency} ${amount}) from ${business}: ${publicUrl}`
    )}`
  };
}

module.exports = {
  listInvoices,
  markPaid,
  createInvoice,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  generatePdf,
  generatePublicPdf,
  createPublicLink,
  getPublicInvoice,
  logPublicEvent,
  duplicateInvoice,
  buildWhatsAppReminder,
  fetchInvoiceWithRelations
};
