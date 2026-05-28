const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const { authenticate, assertUserScope } = require('../../middleware/auth');
const analyticsService = require('./analytics.service');

const router = express.Router();
router.use(authenticate(), assertUserScope);

router.get('/summary', asyncHandler(async (req, res) => {
  const summary = await analyticsService.dashboardSummary(req.userId);
  res.json({ summary });
}));

module.exports = router;
