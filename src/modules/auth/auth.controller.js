const authService = require('./auth.service');

async function signup(req, res) {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

async function refresh(req, res) {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
}

async function logout(req, res) {
  await authService.logout(req.body?.refreshToken);
  res.json({ success: true });
}

async function me(req, res) {
  const user = await authService.me(req.userId);
  res.json({ user });
}

async function requestPasswordReset(req, res) {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json({ success: true, message: 'If the email exists, a reset link was sent.' });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body);
  res.json({ success: true });
}

async function verifyEmail(req, res) {
  await authService.verifyEmail(req.query.token);
  res.json({ success: true });
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
  verifyEmail
};
