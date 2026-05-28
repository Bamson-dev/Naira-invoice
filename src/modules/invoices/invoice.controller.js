const invoiceService = require('./invoice.service');
const { safePdfFilename } = require('../../utils/safeUrl');

async function list(req, res) {
  const userId = req.query.user_id || req.userId;
  const invoices = await invoiceService.listInvoices(userId);
  res.json({ invoices });
}

async function markPaid(req, res) {
  const invoice = await invoiceService.markPaid(req.params.id, req.body.user_id || req.userId);
  res.json({ invoice });
}

async function create(req, res) {
  const invoice = await invoiceService.createInvoice(req.userId, req.body);
  res.json({ invoice });
}

async function getOne(req, res) {
  const data = await invoiceService.getInvoice(req.params.id, req.userId);
  res.json(data);
}

async function update(req, res) {
  await invoiceService.updateInvoice(req.params.id, req.userId, req.body);
  res.json({ success: true });
}

async function remove(req, res) {
  await invoiceService.deleteInvoice(req.params.id, req.userId);
  res.json({ success: true });
}

async function pdf(req, res) {
  const { pdfBuffer, invoiceNumber } = await invoiceService.generatePdf(req.params.id, req.userId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safePdfFilename(invoiceNumber)}"`);
  res.send(pdfBuffer);
}

async function publicLink(req, res) {
  const data = await invoiceService.createPublicLink(req.params.id, req.userId, req);
  res.json(data);
}

async function getPublic(req, res) {
  const data = await invoiceService.getPublicInvoice(req.params.token);
  res.json(data);
}

async function publicPdf(req, res) {
  const { pdfBuffer, invoiceNumber } = await invoiceService.generatePublicPdf(req.params.token);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safePdfFilename(invoiceNumber)}"`);
  res.send(pdfBuffer);
}

async function publicEvent(req, res) {
  const data = await invoiceService.logPublicEvent(
    req.params.token,
    req.body?.event_type,
    req
  );
  res.json(data);
}

async function duplicate(req, res) {
  const invoice = await invoiceService.duplicateInvoice(req.params.id, req.userId);
  res.json({ invoice });
}

async function whatsappReminder(req, res) {
  const { invoice, profile } = await invoiceService.getInvoice(req.params.id, req.userId);
  const link = await invoiceService.createPublicLink(req.params.id, req.userId, req);
  const payload = invoiceService.buildWhatsAppReminder(invoice, profile, link.public_url);
  res.json(payload);
}

module.exports = {
  list,
  markPaid,
  create,
  getOne,
  update,
  remove,
  pdf,
  publicLink,
  getPublic,
  publicPdf,
  publicEvent,
  duplicate,
  whatsappReminder
};
