const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const { authenticate, assertUserScope } = require('../../middleware/auth');
const controller = require('./invoice.controller');

const router = express.Router();

router.get('/public/:token', asyncHandler(controller.getPublic));
router.post('/public/:token/events', asyncHandler(controller.publicEvent));

router.use(authenticate(), assertUserScope);

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.post('/:id/duplicate', asyncHandler(controller.duplicate));
router.patch('/:id/mark-paid', asyncHandler(controller.markPaid));
router.post('/:id/public-link', asyncHandler(controller.publicLink));
router.get('/:id/whatsapp-reminder', asyncHandler(controller.whatsappReminder));
router.get('/:id/pdf', asyncHandler(controller.pdf));
router.get('/:id', asyncHandler(controller.getOne));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
