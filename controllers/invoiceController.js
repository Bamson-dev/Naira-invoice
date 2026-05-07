const crypto = require('crypto');
const supabase = require('../utils/supabase');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

function sanitizeInvoiceRow(body, invoiceNumber) {
  const allowed = [
    'user_id',
    'client_id',
    'invoice_type',
    'invoice_template',
    'currency',
    'status',
    'invoice_date',
    'due_date',
    'subtotal',
    'tax_percentage',
    'tax_amount',
    'discount_type',
    'discount_value',
    'discount_amount',
    'total_amount',
    'notes',
    'payment_method',
    'payment_date',
    'temp_client_name',
    'temp_client_email',
    'temp_client_phone',
    'temp_client_address'
  ];
  const row = {};
  for (const key of allowed) {
    const v = body[key];
    if (v === undefined || v === '') continue;
    if (
      [
        'subtotal',
        'tax_percentage',
        'tax_amount',
        'discount_value',
        'discount_amount',
        'total_amount'
      ].includes(key)
    ) {
      row[key] = typeof v === 'number' ? v : Number(v);
    } else {
      row[key] = v;
    }
  }
  row.invoice_number = invoiceNumber;
  return row;
}

function tempClientFromInvoice(inv) {
  if (!inv) return null;
  const name = String(inv.temp_client_name || '').trim();
  if (!name) return null;
  return {
    id: null,
    client_name: name,
    client_email: inv.temp_client_email || null,
    client_phone: inv.temp_client_phone || null,
    client_address: inv.temp_client_address || null,
    is_temporary: true
  };
}

async function fetchInvoiceWithRelations(invoiceId) {
  const { data: rows, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .limit(1);

  if (invErr) throw invErr;
  const invoice = rows?.[0];
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.code = 'PGRST116';
    throw err;
  }

  const [clientRes, itemsRes] = await Promise.all([
    invoice.client_id
      ? supabase.from('clients').select('*').eq('id', invoice.client_id).limit(1)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true })
  ]);

  if (clientRes.error) throw clientRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const clientRow = clientRes.data?.[0] || null;
  const items = itemsRes.data || [];

  return {
    ...invoice,
    clients: clientRow || tempClientFromInvoice(invoice),
    invoice_items: items
  };
}

exports.listInvoices = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const clientIds = [...new Set((invoices || []).map((inv) => inv.client_id).filter(Boolean))];
    let clientsById = {};

    if (clientIds.length > 0) {
      const { data: clientsRows, error: clientsError } = await supabase
        .from('clients')
        .select('id, client_name, client_email')
        .in('id', clientIds);

      if (clientsError) throw clientsError;
      clientsById = Object.fromEntries((clientsRows || []).map((c) => [c.id, c]));
    }

    const invoiceIds = (invoices || []).map((inv) => inv.id);
    let viewedByInvoiceId = new Map();
    if (invoiceIds.length > 0) {
      const { data: eventRows, error: eventErr } = await supabase
        .from('invoice_events')
        .select('invoice_id, event_type, timestamp')
        .in('invoice_id', invoiceIds)
        .eq('event_type', 'viewed')
        .order('timestamp', { ascending: false });
      if (!eventErr && Array.isArray(eventRows)) {
        for (const row of eventRows) {
          if (!viewedByInvoiceId.has(row.invoice_id)) {
            viewedByInvoiceId.set(row.invoice_id, row.timestamp);
          }
        }
      }
    }

    const enriched = (invoices || []).map((inv) => ({
      ...inv,
      clients: inv.client_id ? clientsById[inv.client_id] || null : tempClientFromInvoice(inv),
      viewed_at: viewedByInvoiceId.get(inv.id) || null
    }));

    res.json({ invoices: enriched });
  } catch (error) {
    console.error('List invoices error:', error);
    const msg = error.message || error.details || String(error);
    res.status(500).json({ error: msg });
  }
};

exports.markInvoicePaid = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.user_id;
    if (!id || !userId) {
      return res.status(400).json({ error: 'id and user_id are required' });
    }

    const { data: rows, error: findErr } = await supabase
      .from('invoices')
      .select('id, status, payment_date')
      .eq('id', id)
      .eq('user_id', userId)
      .limit(1);
    if (findErr) throw findErr;
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: 'Invoice not found' });

    const { data: updatedRows, error: updateErr } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        payment_date: row.payment_date || new Date().toISOString().slice(0, 10)
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .limit(1);
    if (updateErr) throw updateErr;

    return res.json({ invoice: updatedRows?.[0] || null });
  } catch (error) {
    console.error('markInvoicePaid error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { invoice, items } = req.body;

    if (!invoice?.user_id) {
      return res.status(400).json({ error: 'invoice.user_id is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const cleanItems = items.filter((item) => item.description && String(item.description).trim());
    if (cleanItems.length === 0) {
      return res.status(400).json({ error: 'At least one line item with a non-empty description is required.' });
    }

    const { data: profileRows, error: profileError } = await supabase
      .from('business_profiles')
      .select('next_invoice_number, invoice_prefix')
      .eq('user_id', invoice.user_id)
      .limit(1);

    if (profileError) throw profileError;

    const profile = profileRows?.[0];
    if (!profile) {
      return res.status(400).json({
        error:
          'No business profile found. Open Profile and save your business details (name, prefix) before creating invoices.'
      });
    }

    const prefix = profile.invoice_prefix != null ? String(profile.invoice_prefix) : 'INV';
    const seqRaw = Number(profile.next_invoice_number);
    const seq = Number.isFinite(seqRaw) && seqRaw >= 1 ? seqRaw : 1;
    const invoiceNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    const insertPayload = sanitizeInvoiceRow(invoice, invoiceNumber);
    if (!insertPayload.client_id) delete insertPayload.client_id;

    let { error: insertErr } = await supabase.from('invoices').insert([insertPayload]);
    if (
      insertErr &&
      String(insertErr.message || '').toLowerCase().includes('temp_client_')
    ) {
      delete insertPayload.temp_client_name;
      delete insertPayload.temp_client_email;
      delete insertPayload.temp_client_phone;
      delete insertPayload.temp_client_address;
      ({ error: insertErr } = await supabase.from('invoices').insert([insertPayload]));
    }
    if (insertErr) throw insertErr;

    const { data: readRows, error: readErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', insertPayload.user_id)
      .eq('invoice_number', invoiceNumber)
      .limit(1);

    if (readErr) throw readErr;

    const newInvoice = readRows?.[0];

    if (!newInvoice) {
      return res.status(500).json({
        error:
          'Invoice INSERT succeeded but SELECT returned no rows. Your server key likely cannot read invoices (use SUPABASE_SERVICE_KEY = service_role), or RLS/view settings block SELECT — check Supabase Table Editor and API logs.'
      });
    }

    const itemsWithInvoiceId = cleanItems.map((item, index) => ({
      invoice_id: newInvoice.id,
      description: String(item.description).trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      sort_order: index
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);

    if (itemsError) throw itemsError;

    await supabase
      .from('business_profiles')
      .update({ next_invoice_number: seq + 1 })
      .eq('user_id', invoice.user_id);

    res.json({ invoice: newInvoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    const msg =
      error?.message ||
      error?.details ||
      (typeof error === 'object' ? JSON.stringify(error) : String(error));
    res.status(500).json({ error: msg, code: error?.code });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await fetchInvoiceWithRelations(id);

    const { data: profRows, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', invoice.user_id)
      .limit(1);

    if (profileError) throw profileError;

    const profile = profRows?.[0] || null;

    res.json({ invoice, profile });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice, items } = req.body;

    const cleanItems = (items || []).filter((item) => item.description && String(item.description).trim());
    if (cleanItems.length === 0) {
      return res.status(400).json({ error: 'At least one line item with a non-empty description is required.' });
    }

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update(invoice)
      .eq('id', id);

    if (invoiceError) throw invoiceError;

    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    const itemsWithInvoiceId = cleanItems.map((item, index) => ({
      invoice_id: id,
      description: String(item.description).trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      sort_order: index
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);

    if (itemsError) throw itemsError;

    res.json({ success: true });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await fetchInvoiceWithRelations(id);

    const { data: profRows, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', invoice.user_id)
      .limit(1);

    if (profileError) throw profileError;

    const profile = profRows?.[0];
    if (!profile) {
      return res.status(400).json({ error: 'Business profile not found for PDF generation.' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice, profile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: error.message });
  }
};


function publicToken() {
  return crypto.randomBytes(9).toString('base64url');
}

async function getOrCreatePublicLink(invoiceId, userId) {
  const { data: existingRows, error: existingErr } = await supabase
    .from('invoice_public_links')
    .select('*')
    .eq('invoice_id', invoiceId)
    .limit(1);
  if (existingErr) throw existingErr;
  const existing = existingRows?.[0];
  if (existing) return existing;

  const token = publicToken();
  let createdRows = null;
  let createErr = null;

  // Support both schemas:
  // 1) with user_id column, and
  // 2) legacy schema without user_id (as in early PRD draft).
  ({ data: createdRows, error: createErr } = await supabase
    .from('invoice_public_links')
    .insert([{ invoice_id: invoiceId, user_id: userId, public_token: token }])
    .select('*')
    .limit(1));

  if (createErr && String(createErr.message || '').toLowerCase().includes('user_id')) {
    ({ data: createdRows, error: createErr } = await supabase
      .from('invoice_public_links')
      .insert([{ invoice_id: invoiceId, public_token: token }])
      .select('*')
      .limit(1));
  }

  if (createErr) throw createErr;
  return createdRows?.[0];
}

exports.createPublicLink = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const userId = req.body?.user_id;
    if (!invoiceId || !userId) {
      return res.status(400).json({ error: 'invoice id and user_id are required' });
    }

    const { data: invRows, error: invErr } = await supabase
      .from('invoices')
      .select('id, user_id')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .limit(1);
    if (invErr) throw invErr;
    if (!invRows?.[0]) return res.status(404).json({ error: 'Invoice not found' });

    const link = await getOrCreatePublicLink(invoiceId, userId);
    const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.json({
      token: link.public_token,
      public_url: `${base}/i/${link.public_token}`
    });
  } catch (error) {
    console.error('createPublicLink error:', error);
    const msg = String(error?.message || error || '');
    if (
      msg.includes('invoice_public_links') ||
      msg.includes('42P01') ||
      msg.toLowerCase().includes('does not exist')
    ) {
      return res.status(500).json({
        error:
          'Public link tables are missing in Supabase. Run the latest SQL migration block for invoice_public_links and invoice_events, then retry.'
      });
    }
    res.status(500).json({ error: msg });
  }
};

exports.getPublicInvoice = async (req, res) => {
  try {
    const token = req.params.token;
    const { data: linkRows, error: linkErr } = await supabase
      .from('invoice_public_links')
      .select('*')
      .eq('public_token', token)
      .limit(1);
    if (linkErr) throw linkErr;
    const link = linkRows?.[0];
    if (!link) return res.status(404).json({ error: 'Invoice link not found' });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invoice link has expired' });
    }

    const invoice = await fetchInvoiceWithRelations(link.invoice_id);
    const { data: profRows } = await supabase
      .from('business_profiles')
      .select('business_name, phone, email, bank_name, account_number, account_name')
      .eq('user_id', invoice.user_id)
      .limit(1);

    res.json({ invoice, profile: profRows?.[0] || null, link });
  } catch (error) {
    console.error('getPublicInvoice error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

exports.logPublicEvent = async (req, res) => {
  try {
    const token = req.params.token;
    const eventType = req.body?.event_type || 'viewed';

    const { data: linkRows, error: linkErr } = await supabase
      .from('invoice_public_links')
      .select('invoice_id')
      .eq('public_token', token)
      .limit(1);
    if (linkErr) throw linkErr;
    const link = linkRows?.[0];
    if (!link) return res.status(404).json({ error: 'Link not found' });

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);

    const { error } = await supabase.from('invoice_events').insert([{
      invoice_id: link.invoice_id,
      event_type: eventType,
      ip_hash: ipHash
    }]);
    // Never block customer invoice views if analytics table isn't ready yet.
    if (error) {
      const msg = String(error.message || error || '');
      if (
        msg.includes('invoice_events') ||
        msg.includes('42P01') ||
        msg.toLowerCase().includes('does not exist')
      ) {
        return res.json({ success: true, warning: 'invoice_events table missing' });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('logPublicEvent error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

exports.duplicateInvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.body?.user_id;
    if (!userId) return res.status(400).json({ error: 'user_id required' });

    const original = await fetchInvoiceWithRelations(id);
    if (original.user_id !== userId) return res.status(403).json({ error: 'Not allowed' });

    const invoicePayload = {
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
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: original.due_date,
      subtotal: Number(original.subtotal),
      tax_percentage: original.tax_percentage,
      tax_amount: Number(original.tax_amount || 0),
      discount_type: original.discount_type,
      discount_value: Number(original.discount_value || 0),
      discount_amount: Number(original.discount_amount || 0),
      total_amount: Number(original.total_amount || 0),
      notes: original.notes,
      payment_method: null,
      payment_date: null
    };

    req.body = { invoice: invoicePayload, items: original.invoice_items || [] };
    return exports.createInvoice(req, res);
  } catch (error) {
    console.error('duplicateInvoice error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
