const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../../config/database');
const { AppError } = require('../../utils/AppError');

const SALT_ROUNDS = 12;

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + parseRefreshMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt }
  });
  return raw;
}

function parseRefreshMs(exp) {
  const m = String(exp).match(/^(\d+)([dhms])$/);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[m[2]];
  return n * unit;
}

async function signup({ email, password }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      emailVerifyToken
    }
  });

  await prisma.onboardingProgress.create({ data: { userId: user.id } });

  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: { id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified },
    accessToken,
    refreshToken
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.deletedAt) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: { id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified },
    accessToken,
    refreshToken
  };
}

async function refresh(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true }
  });
  if (!record?.user || record.user.deletedAt) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() }
  });

  const accessToken = signAccessToken(record.user);
  const newRefresh = await createRefreshToken(record.user.id);
  return { accessToken, refreshToken: newRefresh };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

async function me(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, role: true, emailVerified: true, createdAt: true }
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
}

async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { ok: true };
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 3600000)
    }
  });
  // TODO: send email via SMTP when configured
  return { ok: true, resetToken: process.env.NODE_ENV === 'development' ? token : undefined };
}

async function resetPassword({ token, password }) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() }
    }
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  });
  return { ok: true };
}

async function verifyEmail(token) {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw new AppError('Invalid verification token', 400, 'INVALID_TOKEN');
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null }
  });
  return { ok: true };
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
