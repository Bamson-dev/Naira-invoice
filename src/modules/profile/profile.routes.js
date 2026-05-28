const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const { authenticate, assertUserScope } = require('../../middleware/auth');
const controller = require('./profile.controller');

const router = express.Router();
router.use(authenticate(), assertUserScope);
router.get('/', asyncHandler(controller.get));
router.post('/', asyncHandler(controller.upsert));
router.post('/upload-logo', controller.uploadLogo);

module.exports = router;
