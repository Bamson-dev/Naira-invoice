const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const { authenticate, assertUserScope } = require('../../middleware/auth');
const controller = require('./client.controller');

const router = express.Router();
router.use(authenticate(), assertUserScope);
router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
