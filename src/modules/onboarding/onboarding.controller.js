const onboardingService = require('./onboarding.service');

async function get(req, res) {
  const progress = await onboardingService.get(req.query.user_id || req.userId);
  res.json({ progress });
}

async function update(req, res) {
  const { user_id, ...updates } = req.body;
  const progress = await onboardingService.update(req.userId, updates);
  res.json({ progress });
}

module.exports = { get, update };
