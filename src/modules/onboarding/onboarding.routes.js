const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const { authenticate, assertUserScope } = require('../../middleware/auth');
const controller = require('./onboarding.controller');

const router = express.Router();
router.use(authenticate(), assertUserScope);
router.get('/', asyncHandler(controller.get));
router.put('/', asyncHandler(controller.update));

module.exports = router;
