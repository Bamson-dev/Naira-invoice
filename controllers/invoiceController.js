const supabase = require('../utils/supabase');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

exports.listInvoices = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          client_name,
          client_email
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ invoices: data });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { invoice, items } = req.body;

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('next_invoice_number, invoice_prefix')
      .eq('user_id', invoice.user_id)
      .single();

    if (profileError) throw profileError;

    const invoiceNumber = `${profile.invoice_prefix}${String(profile.next_invoice_number).padStart(4, '0')}`;

    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{ ...invoice, invoice_number: invoiceNumber }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    const itemsWithInvoiceId = items.map((item, index) => ({
      ...item,
      invoice_id: newInvoice.id,
      sort_order: index
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);

    if (itemsError) throw itemsError;

    await supabase
      .from('business_profiles')
      .update({ next_invoice_number: profile.next_invoice_number + 1 })
      .eq('user_id', invoice.user_id);

    res.json({ invoice: newInvoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (*),
        invoice_items (*)
      `)
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', invoice.user_id)
      .single();

    if (profileError) throw profileError;

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

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update(invoice)
      .eq('id', id);

    if (invoiceError) throw invoiceError;

    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    const itemsWithInvoiceId = items.map((item, index) => ({
      ...item,
      invoice_id: id,
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

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (*),
        invoice_items (*)
      `)
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', invoice.user_id)
      .single();

    if (profileError) throw profileError;

    const pdfBuffer = await generateInvoicePDF(invoice, profile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: error.message });
  }
};
