const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const controller = require('./auth.controller');
const schemas = require('./auth.validation');

const router = express.Router();

router.post('/signup', validate(schemas.signupSchema), asyncHandler(controller.signup));
router.post('/login', validate(schemas.loginSchema), asyncHandler(controller.login));
router.post('/refresh', validate(schemas.refreshSchema), asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', authenticate(), asyncHandler(controller.me));
router.post('/password/request', validate(schemas.resetRequestSchema), asyncHandler(controller.requestPasswordReset));
router.post('/password/reset', validate(schemas.resetPasswordSchema), asyncHandler(controller.resetPassword));
router.get('/verify-email', asyncHandler(controller.verifyEmail));

module.exports = router;
