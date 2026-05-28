const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function authenticate(required = true) {
  return (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      if (!required) return next();
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      req.userId = payload.sub;
      return next();
    } catch {
      return next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
    }
  };
}

/** Ensures route user_id matches JWT (legacy query param support) */
function assertUserScope(req, res, next) {
  const paramId = req.query.user_id || req.body?.user_id;
  if (paramId && req.userId && paramId !== req.userId) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }
  if (!req.query.user_id && !req.body?.user_id) {
    req.query = { ...req.query, user_id: req.userId };
    if (req.body && typeof req.body === 'object') {
      req.body.user_id = req.userId;
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { authenticate, assertUserScope, requireRole, getBearerToken };
