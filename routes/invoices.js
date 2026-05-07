const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/', invoiceController.listInvoices);
router.post('/', invoiceController.createInvoice);
router.post('/:id/duplicate', invoiceController.duplicateInvoice);
router.patch('/:id/mark-paid', invoiceController.markInvoicePaid);
router.post('/:id/public-link', invoiceController.createPublicLink);
router.get('/public/:token', invoiceController.getPublicInvoice);
router.post('/public/:token/events', invoiceController.logPublicEvent);
router.get('/:id/pdf', invoiceController.generatePDF);
router.get('/:id', invoiceController.getInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
